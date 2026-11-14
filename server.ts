import 'dotenv/config';
import express from 'express';
import type { Request, Response } from 'express';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import { CALENDLY_URL } from './src/data/questions.ts';
import type { DiagnosticReport } from './src/types/diagnostic.ts';
import { buildDiagnosticPdfDocument } from './src/utils/pdfExport.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const LEADS_FILE = path.join(__dirname, 'data', 'leads.json');
const SENDER_EMAIL = 'zahidshah343@gmail.com';

interface DiagnosticAnswersInput {
  denialDiscoveryLag: string;
  afterHoursChartingHours: string;
  adminBillingStaffCount: string;
  aiComfortLevel: string;
  switchingFear: string;
  emrWorkModel: string;
}

interface StoredLead {
  id: string;
  email: string;
  role: string;
  answers: DiagnosticAnswersInput;
  recommendedCategory: string;
  topRiskTitles: string[];
  submittedAt: string;
  emailSent?: boolean;
  emailSentAt?: string;
  gmailMessageId?: string;
}

const ALLOWED_LEAD_ROLES = new Set([
  'Physician/Owner',
  'Practice Manager',
  'Billing/RCM Manager',
  'Other',
]);

const ALLOWED_OPTIONS: Record<keyof DiagnosticAnswersInput, readonly string[]> = {
  denialDiscoveryLag: [
    'Same day',
    'Within a week',
    '1–2 weeks',
    'A month or more',
    "I don't know",
  ],
  afterHoursChartingHours: ['0–2', '3–5', '6–10', '10+'],
  adminBillingStaffCount: ['0', '1–2', '3–5', '6+'],
  aiComfortLevel: ['Very comfortable', 'Somewhat', 'Not comfortable', "Haven't tried"],
  switchingFear: [
    'Cost',
    'Lost productivity during transition',
    'Losing independence to a bigger system',
    'Data migration',
    "Nothing — we're ready",
  ],
  emrWorkModel: ['Record only', 'Somewhat helps', 'Actively helps', 'Not sure'],
};

const HARDCODED_VENDORS = [
  {
    name: 'Cerbo',
    profile:
      'Lightweight, relationship-first EHR built for independent primary care, concierge/DPC, and lean clinics with minimal admin overhead.',
  },
  {
    name: 'athenahealth',
    profile:
      'Cloud EHR and integrated revenue cycle network known for automated claim scrubbing, denial tracking, and payer rule updates.',
  },
  {
    name: 'Veradigm',
    profile:
      'Flexible ambulatory EHR and practice management platform with open third-party workflow integrations for established independent groups.',
  },
  {
    name: 'eClinicalWorks',
    profile:
      'Cost-competitive all-in-one ambulatory EHR/PM suite offering native AI ambient documentation and scalable RCM options.',
  },
  {
    name: 'Tebra',
    profile:
      'Modern EHR, billing, and patient experience platform built for small-to-midsize independent practices seeking faster staff onboarding.',
  },
  {
    name: 'Azalea Health',
    profile:
      'Cloud EHR and RCM tailored for rural, community, and independent specialty practices prioritizing guided data migration and support.',
  },
  {
    name: 'Veradigm RCS',
    profile:
      'Dedicated revenue cycle services (RCM) and denial recovery team built to eliminate claim lag and unworked AR without forcing an immediate EMR rip-and-replace.',
  },
  {
    name: 'AdvancedMD',
    profile:
      'Integrated practice management and automated denial-management suite with real-time claim scrubbing and payer follow-up automation.',
  },
  {
    name: 'Waystar',
    profile:
      'Dedicated revenue cycle and automated denial-management platform that layers onto existing EMRs to surface claim rejections immediately.',
  },
];

const ALLOWED_VENDOR_NAMES = new Set(HARDCODED_VENDORS.map((v) => v.name));
const RCM_PRIORITY_VENDOR_NAMES = new Set(['Veradigm RCS', 'Waystar', 'AdvancedMD']);

const HIGH_DENIAL_LAG_ANSWERS = new Set([
  '1–2 weeks',
  '1-2 weeks',
  'A month or more',
  "I don't know",
]);

const RCM_RISK_ALERT_TEXT =
  'Your denial discovery lag is a critical revenue risk. Industry benchmarks show practices with this profile lose a significant percentage of collectible revenue annually. Prioritizing automated denial management or an RCM audit is highly recommended.';

async function readLeadsTable(): Promise<StoredLead[]> {
  try {
    const raw = await fs.readFile(LEADS_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as StoredLead[]) : [];
  } catch {
    return [];
  }
}

async function appendLead(lead: StoredLead): Promise<void> {
  await fs.mkdir(path.dirname(LEADS_FILE), { recursive: true });
  const existing = await readLeadsTable();
  existing.push(lead);
  await fs.writeFile(LEADS_FILE, JSON.stringify(existing, null, 2), 'utf-8');
}

async function markLeadEmailSent(
  leadId: string,
  gmailMessageId: string
): Promise<void> {
  const existing = await readLeadsTable();
  const idx = existing.findIndex((item) => item.id === leadId);
  if (idx === -1) return;
  existing[idx] = {
    ...existing[idx],
    emailSent: true,
    emailSentAt: new Date().toISOString(),
    gmailMessageId,
  };
  await fs.writeFile(LEADS_FILE, JSON.stringify(existing, null, 2), 'utf-8');
}

function sanitizeHeaderValue(value: string): string {
  return value.replace(/[\r\n]+/g, ' ').trim();
}

function wrapBase64(base64: string): string {
  return base64.replace(/.{1,76}/g, '$&\r\n').trimEnd();
}

function toBase64Url(input: string): string {
  return Buffer.from(input, 'utf-8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function validateReportPayload(candidate: unknown): DiagnosticReport | null {
  if (!candidate || typeof candidate !== 'object') return null;
  const obj = candidate as Record<string, unknown>;
  if (
    typeof obj.executiveSummary !== 'string' ||
    !Array.isArray(obj.topRisks) ||
    typeof obj.impactRange !== 'string' ||
    typeof obj.impactDisclaimer !== 'string' ||
    typeof obj.recommendedCategory !== 'string' ||
    typeof obj.categoryRationale !== 'string' ||
    !Array.isArray(obj.vendorMatches) ||
    typeof obj.generatedAt !== 'string'
  ) {
    return null;
  }

  return {
    executiveSummary: obj.executiveSummary,
    rcmRiskAlert: typeof obj.rcmRiskAlert === 'string' ? obj.rcmRiskAlert : null,
    topRisks: obj.topRisks.slice(0, 2),
    impactRange: obj.impactRange,
    impactDisclaimer: obj.impactDisclaimer,
    recommendedCategory: obj.recommendedCategory,
    categoryRationale: obj.categoryRationale,
    vendorMatches: obj.vendorMatches.slice(0, 3),
    generatedAt: obj.generatedAt,
  };
}

function validateAnswers(body: unknown): DiagnosticAnswersInput | null {
  if (!body || typeof body !== 'object') return null;
  const candidate = body as Record<string, unknown>;
  const keys = Object.keys(ALLOWED_OPTIONS) as Array<keyof DiagnosticAnswersInput>;
  const validated: Partial<DiagnosticAnswersInput> = {};

  for (const key of keys) {
    const val = candidate[key];
    if (typeof val !== 'string' || !ALLOWED_OPTIONS[key].includes(val)) {
      return null;
    }
    validated[key] = val;
  }

  return validated as DiagnosticAnswersInput;
}

function createGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '2mb' }));

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ ok: true });
  });

  app.post('/api/diagnostic', async (req: Request, res: Response) => {
    const answers = validateAnswers(req.body?.answers);
    if (!answers) {
      res.status(400).json({
        error: 'Please complete all 6 operational questions using the provided options.',
      });
      return;
    }

    const ai = createGeminiClient();
    if (!ai) {
      res.status(503).json({
        error:
          'Diagnostic service is not configured with a Gemini API key yet. Please check Settings > Secrets.',
      });
      return;
    }

    const isHighDenialLag = HIGH_DENIAL_LAG_ANSWERS.has(answers.denialDiscoveryLag);

    const vendorCatalogText = HARDCODED_VENDORS.map(
      (v) => `- ${v.name}: ${v.profile}`
    ).join('\n');

    const rcmPriorityDirective = isHighDenialLag
      ? `CRITICAL RCM DIRECTIVE (triggered by denial discovery lag "${answers.denialDiscoveryLag}"):
- You MUST include the "rcmRiskAlert" field set verbatim to: "${RCM_RISK_ALERT_TEXT}"
- In "vendorMatches", you MUST prioritize RCM services (such as Veradigm RCS) and denial management tools (such as AdvancedMD or Waystar) over general EMRs — select at least 2 from [Veradigm RCS, AdvancedMD, Waystar] and up to 1 optional fit from the rest of the catalog if relevant.`
      : `- Set "rcmRiskAlert" to an empty string "" since denial discovery lag is under 1 week.`;

    const prompt = `You are a seasoned, vendor-neutral healthcare operations consultant advising U.S. medical practices and designated users of EMR, Practice Management (PM), RCM, and full-suite EHR software.

Practice Operational Profile (Workflow only — zero PHI):
1. Claim denial discovery lag: ${answers.denialDiscoveryLag}
2. After-hours charting per week: ${answers.afterHoursChartingHours} hours
3. Admin / billing staff employed: ${answers.adminBillingStaffCount}
4. Team comfort with AI tools: ${answers.aiComfortLevel}
5. Biggest fear about switching EMR: ${answers.switchingFear}
6. Current EMR model: ${answers.emrWorkModel}

${rcmPriorityDirective}

Write a direct, consultative, zero-hype diagnostic brief totaling roughly 240–270 words across all narrative fields combined.
Requirements:
- Identify the practice's top 2 operational risks grounded directly in their answers (e.g., denial discovery lag -> unworked AR and revenue leakage; after-hours charting -> clinician burnout and visit capacity loss; lean admin staffing + record-only EMR -> manual bottleneck).
- Provide an approximate quantified annual impact range (in dollars and/or clinician hours per year for a healthcare practice or EHR/PM/RCM team matching these inputs) and explicitly state in impactDisclaimer that this is an industry estimate, not a financial guarantee.
- Recommend ONE priority solution category to tackle first from these exact four options:
  "AI Scribe"
  "Automated Prior Auth"
  "Integrated RCM"
  "Workflow Layer on Top of Existing EMR"
  (Note: if the user's fear is lost productivity/data migration/independence and their EMR is record-only, or if they aren't ready to rip-and-replace, explain pragmatically why starting with an overlay or targeted category makes sense, or when a full platform move is warranted.)
- Select 2 or 3 best-fit vendors strictly from the hardcoded list below and give one concise, plain-spoken sentence for why each fits this exact operational profile:
${vendorCatalogText}`;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: prompt,
        config: {
          systemInstruction:
            'You are a candid, vendor-neutral medical practice operations advisor. Avoid marketing clichés, exclamation marks, and SaaS hype. Keep the total prose across executiveSummary, topRisks details, impactDisclaimer, and categoryRationale around 250 words.',
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              executiveSummary: {
                type: Type.STRING,
                description:
                  '2–3 concise sentences summarizing the practice operational posture (~45 words).',
              },
              rcmRiskAlert: {
                type: Type.STRING,
                description:
                  'Verbatim RCM Risk Alert text when denial discovery lag is 1–2 weeks, a month or more, or unknown; otherwise empty string.',
              },
              topRisks: {
                type: Type.ARRAY,
                description: 'Exactly 2 primary operational risks based on the answers.',
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: {
                      type: Type.STRING,
                      description: 'Short risk title (e.g., "Delayed Denial Visibility").',
                    },
                    mechanism: {
                      type: Type.STRING,
                      description: 'Short causal chain (e.g., "Denial lag -> Revenue leakage").',
                    },
                    detail: {
                      type: Type.STRING,
                      description: 'Concise 2-sentence explanation (~45 words each).',
                    },
                  },
                  required: ['title', 'mechanism', 'detail'],
                },
              },
              impactRange: {
                type: Type.STRING,
                description:
                  'Approximate annual impact figure (e.g., "$28,000 – $55,000/yr & 300+ clinician hours").',
              },
              impactDisclaimer: {
                type: Type.STRING,
                description:
                  'Brief explanation of how the range is derived, explicitly stating it is an industry estimate, not a guarantee (~40 words).',
              },
              recommendedCategory: {
                type: Type.STRING,
                description:
                  'Must be one of: "AI Scribe", "Automated Prior Auth", "Integrated RCM", or "Workflow Layer on Top of Existing EMR".',
              },
              categoryRationale: {
                type: Type.STRING,
                description:
                  'Direct, consultative rationale for prioritizing this category first (~55 words).',
              },
              vendorMatches: {
                type: Type.ARRAY,
                description:
                  '2 to 3 matched vendors strictly from Cerbo, athenahealth, Veradigm, eClinicalWorks, Tebra, Azalea Health, Veradigm RCS, AdvancedMD, Waystar.',
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    oneLineReason: {
                      type: Type.STRING,
                      description: 'One crisp sentence explaining fit for this user profile.',
                    },
                  },
                  required: ['name', 'oneLineReason'],
                },
              },
            },
            required: [
              'executiveSummary',
              'rcmRiskAlert',
              'topRisks',
              'impactRange',
              'impactDisclaimer',
              'recommendedCategory',
              'categoryRationale',
              'vendorMatches',
            ],
          },
        },
      });

      const rawText = (response.text ?? '').trim();
      if (!rawText) {
        throw new Error('Empty response received from diagnostic engine.');
      }

      const parsed = JSON.parse(rawText);

      const sanitizedVendors = Array.isArray(parsed.vendorMatches)
        ? parsed.vendorMatches
            .filter(
              (v: { name?: unknown; oneLineReason?: unknown }) =>
                typeof v?.name === 'string' &&
                ALLOWED_VENDOR_NAMES.has(v.name) &&
                typeof v?.oneLineReason === 'string'
            )
            .slice(0, 3)
        : [];

      const defaultRcmVendors = [
        {
          name: 'Veradigm RCS',
          oneLineReason:
            'Dedicated revenue cycle services uncover and work denied claims quickly without forcing an immediate EMR replacement.',
        },
        {
          name: 'Waystar',
          oneLineReason:
            'Automated denial management and claim-scrubbing layer directly onto your existing EMR to surface rejections in real time.',
        },
        {
          name: 'AdvancedMD',
          oneLineReason:
            'Automated denial tracking and clean-claim workflows help eliminate weeks-long billing visibility gaps.',
        },
      ];

      let finalVendors: Array<{ name: string; oneLineReason: string }> =
        sanitizedVendors.length >= 2
          ? sanitizedVendors
          : [
              {
                name: 'athenahealth',
                oneLineReason:
                  'Strong claim-scrubbing and integrated RCM workflows reduce denial discovery lag for lean teams.',
              },
              {
                name: 'Tebra',
                oneLineReason:
                  'Streamlined practice management and intuitive UI help small independent teams adopt tools quickly.',
              },
            ];

      if (isHighDenialLag) {
        const rcmMatches = sanitizedVendors.filter((v: { name: string }) =>
          RCM_PRIORITY_VENDOR_NAMES.has(v.name)
        );
        const nonRcmMatches = sanitizedVendors.filter(
          (v: { name: string }) => !RCM_PRIORITY_VENDOR_NAMES.has(v.name)
        );
        const mergedRcm = [...rcmMatches];
        for (const fallback of defaultRcmVendors) {
          if (mergedRcm.length >= 2) break;
          if (!mergedRcm.some((v) => v.name === fallback.name)) {
            mergedRcm.push(fallback);
          }
        }
        finalVendors = [...mergedRcm, ...nonRcmMatches].slice(0, 3);
      }

      const topRisks = Array.isArray(parsed.topRisks)
        ? parsed.topRisks.slice(0, 2)
        : [];

      res.json({
        executiveSummary: String(parsed.executiveSummary || ''),
        rcmRiskAlert: isHighDenialLag ? RCM_RISK_ALERT_TEXT : null,
        topRisks,
        impactRange: String(parsed.impactRange || ''),
        impactDisclaimer: String(parsed.impactDisclaimer || ''),
        recommendedCategory: String(parsed.recommendedCategory || ''),
        categoryRationale: String(parsed.categoryRationale || ''),
        vendorMatches: finalVendors,
        generatedAt: new Date().toISOString(),
      });
    } catch (err: unknown) {
      console.error('Gemini diagnostic error:', err);
      const message =
        err instanceof Error ? err.message : 'Unable to generate diagnostic report.';
      const status =
        message.includes('403') || message.includes('PERMISSION_DENIED')
          ? 403
          : message.includes('429') || message.includes('RESOURCE_EXHAUSTED')
            ? 429
            : 500;
      res.status(status).json({
        error:
          status === 429
            ? 'Diagnostic quota reached temporarily. Please wait a moment and try again.'
            : status === 403
              ? 'Gemini API key permission error. Please verify your key in Settings > Secrets.'
              : 'Could not generate the diagnostic report right now. Please try again.',
      });
    }
  });

  app.post('/api/leads', async (req: Request, res: Response) => {
    const emailRaw = typeof req.body?.email === 'string' ? req.body.email.trim() : '';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailRaw)) {
      res.status(400).json({ error: 'Please enter a valid work or practice email address.' });
      return;
    }

    const roleRaw = typeof req.body?.role === 'string' ? req.body.role.trim() : '';
    if (!ALLOWED_LEAD_ROLES.has(roleRaw)) {
      res.status(400).json({ error: 'Please select your role in the practice.' });
      return;
    }

    const answers = validateAnswers(req.body?.answers);
    if (!answers) {
      res.status(400).json({ error: 'Missing valid diagnostic answers.' });
      return;
    }

    const recommendedCategory =
      typeof req.body?.recommendedCategory === 'string'
        ? req.body.recommendedCategory.slice(0, 100)
        : 'Unspecified';

    const topRiskTitles = Array.isArray(req.body?.topRiskTitles)
      ? req.body.topRiskTitles
          .filter((item: unknown): item is string => typeof item === 'string')
          .slice(0, 2)
      : [];

    const lead: StoredLead = {
      id: `lead_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      email: emailRaw.toLowerCase(),
      role: roleRaw,
      answers,
      recommendedCategory,
      topRiskTitles,
      submittedAt: new Date().toISOString(),
    };

    try {
      await appendLead(lead);
      res.status(201).json({
        success: true,
        id: lead.id,
        role: lead.role,
        submittedAt: lead.submittedAt,
      });
    } catch (err) {
      console.error('Failed to store lead submission:', err);
      res.status(500).json({ error: 'Unable to save your request right now. Please retry.' });
    }
  });

  app.get('/api/leads', async (_req: Request, res: Response) => {
    try {
      const submissions = await readLeadsTable();
      res.json({
        total: submissions.length,
        submissions,
      });
    } catch (err) {
      console.error('Failed to read lead submissions:', err);
      res.status(500).json({ error: 'Unable to read submissions.' });
    }
  });

  app.post('/api/send-report-email', async (req: Request, res: Response) => {
    const authHeader = req.headers.authorization;
    const accessToken =
      typeof authHeader === 'string' && authHeader.startsWith('Bearer ')
        ? authHeader.slice('Bearer '.length).trim()
        : '';

    if (!accessToken) {
      res.status(401).json({
        error: 'Gmail authorization is required. Please sign in with Google first.',
      });
      return;
    }

    const recipientEmailRaw =
      typeof req.body?.recipientEmail === 'string'
        ? req.body.recipientEmail.trim()
        : '';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(recipientEmailRaw)) {
      res.status(400).json({ error: 'Please provide a valid recipient email address.' });
      return;
    }

    const roleRaw = typeof req.body?.role === 'string' ? req.body.role.trim() : '';
    const greetingRole = ALLOWED_LEAD_ROLES.has(roleRaw) ? roleRaw : 'there';

    const answers = validateAnswers(req.body?.answers);
    const report = validateReportPayload(req.body?.report);
    const reportId =
      typeof req.body?.reportId === 'string' ? req.body.reportId.trim() : undefined;
    const leadId =
      typeof req.body?.leadId === 'string' ? req.body.leadId.trim() : undefined;

    let pdfBase64 =
      typeof req.body?.pdfBase64 === 'string' ? req.body.pdfBase64.trim() : '';
    let attachmentFileName =
      typeof req.body?.fileName === 'string' && req.body.fileName.trim()
        ? sanitizeHeaderValue(req.body.fileName.trim())
        : `EMR-Pulse-Report-${(reportId || 'EP-2026').replace('#', '')}.pdf`;

    if (report && answers) {
      const generated = buildDiagnosticPdfDocument(report, answers, reportId);
      attachmentFileName = generated.fileName;
      pdfBase64 = Buffer.from(generated.doc.output('arraybuffer')).toString('base64');
    } else if (!pdfBase64 || !/^[A-Za-z0-9+/=]+$/.test(pdfBase64)) {
      res.status(400).json({
        error: 'Valid diagnostic report data or PDF payload is required to send the email.',
      });
      return;
    }

    const safeRecipient = sanitizeHeaderValue(recipientEmailRaw.toLowerCase());
    const safeRole = sanitizeHeaderValue(greetingRole);
    const safeFileName = sanitizeHeaderValue(attachmentFileName).replace(/"/g, '');
    const subject = 'Your EMR Pulse Diagnostic Report & Next Steps';
    const bodyText = `Hi ${safeRole}, thank you for using EMR Pulse. Attached is your personalized diagnostic report. If you want to save weeks of vendor research and get priority pricing, book a free 15-min call with me here: ${CALENDLY_URL}`;

    const boundary = `emr_pulse_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
    const mimeLines = [
      `From: Syed Zahid Ali (Mr. Ali) <${SENDER_EMAIL}>`,
      `To: ${safeRecipient}`,
      `Bcc: ${SENDER_EMAIL}`,
      `Subject: ${subject}`,
      'MIME-Version: 1.0',
      `Content-Type: multipart/mixed; boundary="${boundary}"`,
      '',
      `--${boundary}`,
      'Content-Type: text/plain; charset="UTF-8"',
      'Content-Transfer-Encoding: 7bit',
      '',
      bodyText,
      '',
      `--${boundary}`,
      `Content-Type: application/pdf; name="${safeFileName}"`,
      `Content-Disposition: attachment; filename="${safeFileName}"`,
      'Content-Transfer-Encoding: base64',
      '',
      wrapBase64(pdfBase64),
      `--${boundary}--`,
      '',
    ];

    const rawMime = mimeLines.join('\r\n');
    const encodedMessage = toBase64Url(rawMime);

    try {
      const gmailResponse = await fetch(
        'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ raw: encodedMessage }),
        }
      );

      const gmailPayload = (await gmailResponse.json().catch(() => ({}))) as {
        id?: string;
        error?: { code?: number; message?: string };
      };

      if (!gmailResponse.ok) {
        const statusCode =
          gmailResponse.status === 401 || gmailResponse.status === 403
            ? gmailResponse.status
            : 502;
        const detail =
          gmailPayload?.error?.message ||
          'Gmail could not deliver the message. Please sign in again with zahidshah343@gmail.com.';
        res.status(statusCode).json({ error: detail });
        return;
      }

      const gmailMessageId = gmailPayload.id || '';
      if (leadId && gmailMessageId) {
        await markLeadEmailSent(leadId, gmailMessageId);
      }

      res.status(200).json({
        success: true,
        messageId: gmailMessageId,
        from: SENDER_EMAIL,
        recipientEmail: safeRecipient,
        bcc: SENDER_EMAIL,
        fileName: safeFileName,
      });
    } catch (err) {
      console.error('Failed to send Gmail diagnostic report:', err);
      res.status(500).json({
        error: 'Unable to reach Gmail right now. Please try sending again.',
      });
    }
  });

  app.use(
    (
      err: unknown,
      _req: Request,
      res: Response,
      _next: express.NextFunction
    ) => {
      if (err instanceof SyntaxError && 'status' in err && (err as { status?: number }).status === 400) {
        res.status(400).json({ error: 'Invalid JSON request payload.' });
        return;
      }
      console.error('Unhandled server error:', err);
      res.status(500).json({ error: 'Internal server error.' });
    }
  );

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`EMR Pulse server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
