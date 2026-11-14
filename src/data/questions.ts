import type { DiagnosticQuestion, VendorCatalogEntry } from '../types/diagnostic';

export const CALENDLY_URL = 'https://calendly.com/zahidshah343/30min';

export const LEAD_ROLES = [
  'Physician/Owner',
  'Practice Manager',
  'Billing/RCM Manager',
  'Other',
] as const;

export const DIAGNOSTIC_QUESTIONS: DiagnosticQuestion[] = [
  {
    id: 'denialDiscoveryLag',
    number: 1,
    question: 'How long does it take you to find out a claim was denied?',
    helperText: 'Operational billing visibility only — no patient or payer specifics needed.',
    options: [
      'Same day',
      'Within a week',
      '1–2 weeks',
      'A month or more',
      "I don't know",
    ],
  },
  {
    id: 'afterHoursChartingHours',
    number: 2,
    question: 'How many hours per week does charting take outside office hours?',
    helperText: 'Estimate average weekly evening or weekend documentation time per provider.',
    options: ['0–2', '3–5', '6–10', '10+'],
  },
  {
    id: 'adminBillingStaffCount',
    number: 3,
    question: 'How many admin/billing staff do you currently employ?',
    helperText: 'Full-time equivalent front-desk, prior authorization, and billing personnel.',
    options: ['0', '1–2', '3–5', '6+'],
  },
  {
    id: 'aiComfortLevel',
    number: 4,
    question: 'How comfortable is your team with AI-based tools?',
    helperText: 'Includes ambient scribes, automated intake, or smart coding assistance.',
    options: [
      'Very comfortable',
      'Somewhat',
      'Not comfortable',
      "Haven't tried",
    ],
  },
  {
    id: 'switchingFear',
    number: 5,
    question: "What's your biggest fear about switching EMR?",
    helperText: 'Helps calibrate whether to replace your core EMR or layer workflow tools on top.',
    options: [
      'Cost',
      'Lost productivity during transition',
      'Losing independence to a bigger system',
      'Data migration',
      "Nothing — we're ready",
    ],
  },
  {
    id: 'emrWorkModel',
    number: 6,
    question:
      'Is your current EMR a "system of record" (you enter data) or a "system of work" (it actively helps you)?',
    helperText: 'Measures whether your platform automates follow-ups or simply stores static charts.',
    options: [
      'Record only',
      'Somewhat helps',
      'Actively helps',
      'Not sure',
    ],
  },
];

export const VENDOR_CATALOG: VendorCatalogEntry[] = [
  {
    name: 'Cerbo',
    profile: 'Lightweight, relationship-first EHR built for independent primary care, DPC, and boutique clinics.',
    bestFor: 'Solo or lean practices with 0–2 admin staff prioritizing low overhead and clinical autonomy.',
  },
  {
    name: 'athenahealth',
    profile: 'Cloud EHR and integrated revenue cycle network with automated claim scrubbing and denial tracking.',
    bestFor: 'Practices struggling with claim denial lag, billing visibility, or high prior-auth volume.',
  },
  {
    name: 'Veradigm',
    profile: 'Flexible ambulatory EHR and practice management platform with an open partner ecosystem.',
    bestFor: 'Established multi-staff practices wanting structured workflows without losing independence.',
  },
  {
    name: 'eClinicalWorks',
    profile: 'All-in-one ambulatory EHR/PM suite offering native AI ambient scribe capabilities and scalable RCM.',
    bestFor: 'Cost-conscious independent practices seeking built-in AI charting and unified billing.',
  },
  {
    name: 'Tebra',
    profile: 'Modern practice growth, EHR, and billing platform tailored for independent outpatient practices.',
    bestFor: 'Small-to-midsize practices wanting faster staff onboarding and clear patient-to-claim workflows.',
  },
  {
    name: 'Azalea Health',
    profile: 'Cloud-based EHR and RCM designed for rural, community, and independent specialty practices.',
    bestFor: 'Practices concerned about transition support, guided data migration, and responsive RCM.',
  },
  {
    name: 'Veradigm RCS',
    profile: 'Dedicated revenue cycle services and denial recovery team built to eliminate claim lag and unworked AR.',
    bestFor: 'Practices experiencing 1+ week denial discovery delays or limited internal billing bandwidth.',
  },
  {
    name: 'AdvancedMD',
    profile: 'Integrated practice management and automated denial-management suite with real-time claim scrubbing.',
    bestFor: 'Independent groups prioritizing faster denial detection, payer follow-up, and clean-claim workflows.',
  },
  {
    name: 'Waystar',
    profile: 'Dedicated revenue cycle and automated denial-management platform that layers onto existing EMRs.',
    bestFor: 'Practices wanting immediate denial visibility and prior-auth automation without switching their core EMR.',
  },
];

export interface VendorPricingRow {
  vendorName: string;
  solutionType: string;
  estStartingPrice: string;
  bestFor: string;
}

export const VENDOR_PRICING_TABLE: VendorPricingRow[] = [
  {
    vendorName: 'Waystar',
    solutionType: 'RCM Overlay',
    estStartingPrice: '~$500/mo + % of collections',
    bestFor: 'Practices keeping their current EMR but needing denial management.',
  },
  {
    vendorName: 'Veradigm RCS',
    solutionType: 'Managed RCM',
    estStartingPrice: '4% - 7% of monthly collections',
    bestFor: 'Practices wanting to fully outsource billing and AR follow-up.',
  },
  {
    vendorName: 'AdvancedMD',
    solutionType: 'Full PM/EMR',
    estStartingPrice: '~$729/mo per provider',
    bestFor: 'Practices ready to replace their record-only EMR entirely.',
  },
];

