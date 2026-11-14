import { jsPDF } from 'jspdf';
import type { DiagnosticAnswers, DiagnosticReport } from '../types/diagnostic';
import { CALENDLY_URL, VENDOR_PRICING_TABLE } from '../data/questions';

export function buildDiagnosticPdfDocument(
  report: DiagnosticReport,
  answers: DiagnosticAnswers,
  reportIdOverride?: string
): { doc: jsPDF; reportId: string; fileName: string } {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'letter',
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 612pt
  const pageHeight = doc.internal.pageSize.getHeight(); // 792pt
  const margin = 36;
  const contentWidth = pageWidth - margin * 2; // 540pt

  const randomFour = Math.floor(1000 + Math.random() * 9000);
  const reportId = reportIdOverride || `#EP-2026-${randomFour}`;
  const fileName = `EMR-Pulse-Report-${reportId.replace('#', '')}.pdf`;

  const dateLabel = new Date(report.generatedAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  const drawFooter = () => {
    const footerY = pageHeight - 28;
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, footerY - 12, pageWidth - margin, footerY - 12);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text(
      'Built by Syed Zahid Ali (Mr. Ali) — Healthcare IT & RCM Advisor | linkedin.com/in/zahidshahh',
      margin,
      footerY
    );
  };

  // =========================================================================
  // PAGE 1: NAVY HEADER, DIAGNOSTIC BRIEF, RCM RISK ALERT, TOP 2 RISKS + BARS,
  //         AND DECISION CATALYST BANNER AT BOTTOM OF PAGE 1
  // =========================================================================

  // 1. HEADER STYLING (Top of Page 1 — #0A192F dark navy banner)
  const headerHeight = 92;
  doc.setFillColor(10, 25, 47); // #0A192F
  doc.rect(0, 0, pageWidth, headerHeight, 'F');

  // Subtle dark-teal accent stripe along bottom edge of header (#0F766E)
  doc.setFillColor(15, 118, 110);
  doc.rect(0, headerHeight - 4, pageWidth, 4, 'F');

  // Left side: Large bold white title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(255, 255, 255);
  doc.text('EMR Pulse Diagnostic Report', margin, 42);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(203, 213, 225);
  doc.text(
    `Practice Workflow Analytics  |  Generated ${dateLabel}  |  Zero PHI Collected`,
    margin,
    60
  );

  // Right side: Report ID + Prepared by Mr. Ali | Healthcare IT & RCM Advisor
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(94, 234, 212);
  doc.text(`Report ID: ${reportId}`, pageWidth - margin, 38, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(255, 255, 255);
  doc.text(
    'Prepared by: Mr. Ali | Healthcare IT & RCM Advisor',
    pageWidth - margin,
    54,
    { align: 'right' }
  );

  let y = headerHeight + 22;

  // 2. DIAGNOSTIC BRIEF (Uppercase bold dark teal #0F766E, 1.6 line height)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(15, 118, 110); // #0F766E
  doc.text('DIAGNOSTIC BRIEF', margin, y);
  y += 16;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  const summaryLines = doc.splitTextToSize(report.executiveSummary, contentWidth);
  const summaryLineHeight = 9.5 * 1.6; // 15.2pt
  summaryLines.forEach((line: string) => {
    doc.text(line, margin, y);
    y += summaryLineHeight;
  });
  y += 4;

  // Compact Operational Profile Baseline Grid
  const profileItems: Array<[string, string]> = [
    ['Denial Discovery Lag', answers.denialDiscoveryLag],
    ['After-Hours Charting', `${answers.afterHoursChartingHours} hrs/wk`],
    ['Admin / Billing Staff', `${answers.adminBillingStaffCount} FTE`],
    ['AI Tool Comfort', answers.aiComfortLevel],
    ['Transition Concern', answers.switchingFear],
    ['EMR Operating Model', answers.emrWorkModel],
  ];

  const colW = contentWidth / 3;
  const gridH = 54;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, y, contentWidth, gridH, 5, 5, 'FD');

  profileItems.forEach(([label, value], idx) => {
    const col = idx % 3;
    const row = Math.floor(idx / 3);
    const ix = margin + 10 + col * colW;
    const iy = y + 16 + row * 24;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.2);
    doc.setTextColor(100, 116, 139);
    doc.text(label.toUpperCase(), ix, iy);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.2);
    doc.setTextColor(15, 23, 42);
    const clipped = value.length > 26 ? `${value.slice(0, 24)}...` : value;
    doc.text(clipped, ix, iy + 10);
  });

  y += gridH + 16;

  // Conditional RCM RISK ALERT
  if (report.rcmRiskAlert) {
    const alertLineHeight = 8.8 * 1.6;
    const alertLines = doc.splitTextToSize(report.rcmRiskAlert, contentWidth - 24);
    const alertBoxH = 26 + alertLines.length * alertLineHeight;

    doc.setFillColor(254, 242, 242);
    doc.setDrawColor(220, 38, 38);
    doc.roundedRect(margin, y, contentWidth, alertBoxH, 5, 5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(15, 118, 110); // #0F766E uppercase section header
    doc.text('RCM RISK ALERT', margin + 12, y + 16);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(185, 28, 28);
    doc.text('CRITICAL REVENUE RISK', margin + contentWidth - 12, y + 16, {
      align: 'right',
    });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.8);
    doc.setTextColor(127, 29, 29);
    let ay = y + 30;
    alertLines.forEach((line: string) => {
      doc.text(line, margin + 12, ay);
      ay += alertLineHeight;
    });

    y += alertBoxH + 16;
  }

  // 3. TOP 2 OPERATIONAL RISKS WITH VISUAL RISK BARS
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(15, 118, 110); // #0F766E
  doc.text('TOP 2 OPERATIONAL RISKS', margin, y);
  y += 14;

  const risksToRender = report.topRisks.slice(0, 2);
  risksToRender.forEach((risk, idx) => {
    const isFirstRisk = idx === 0;
    const fillPercent = isFirstRisk ? 0.85 : 0.6;
    const riskLevelLabel = isFirstRisk ? 'High Risk' : 'Medium Risk';
    const barRgb: [number, number, number] = isFirstRisk
      ? [234, 88, 12] // Red/Orange (#EA580C)
      : [217, 119, 6]; // Amber/Yellow (#D97706)

    const leftTextW = 340;
    const detailFontSize = 8.6;
    const detailLineHeight = detailFontSize * 1.6; // ~13.8pt
    const detailLines = doc.splitTextToSize(risk.detail, leftTextW);
    const cardH = Math.max(76, 38 + detailLines.length * detailLineHeight);

    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin, y, contentWidth, cardH, 6, 6, 'FD');

    // Left column: Risk title, mechanism & description
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.8);
    doc.setTextColor(10, 25, 47);
    doc.text(`${idx + 1}. ${risk.title}`, margin + 12, y + 17);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.8);
    doc.setTextColor(15, 118, 110);
    doc.text(risk.mechanism, margin + 12, y + 29);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(detailFontSize);
    doc.setTextColor(51, 65, 85);
    let dy = y + 43;
    detailLines.forEach((line: string) => {
      doc.text(line, margin + 12, dy);
      dy += detailLineHeight;
    });

    // Right column: Visual Risk Bar (85% High Risk / 60% Medium Risk)
    const barBoxX = margin + leftTextW + 24;
    const barBoxW = contentWidth - leftTextW - 36;
    const barY = y + 32;
    const barH = 16;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(barRgb[0], barRgb[1], barRgb[2]);
    doc.text(riskLevelLabel.toUpperCase(), barBoxX, y + 21);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text(`${Math.round(fillPercent * 100)}%`, barBoxX + barBoxW, y + 21, {
      align: 'right',
    });

    // Track
    doc.setFillColor(226, 232, 240);
    doc.roundedRect(barBoxX, barY, barBoxW, barH, 4, 4, 'F');

    // Filled bar (85% or 60%)
    doc.setFillColor(barRgb[0], barRgb[1], barRgb[2]);
    doc.roundedRect(barBoxX, barY, barBoxW * fillPercent, barH, 4, 4, 'F');

    // Text inside the bar for immediate visual clarity
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(255, 255, 255);
    doc.text(riskLevelLabel, barBoxX + 7, barY + 10.5);

    y += cardH + 10;
  });

  // 4. THE "DECISION CATALYST" BANNER (Centered & Clean, No Raw URL Text)
  const catalystSubtext =
    'You have the diagnostic data. Now you need the right partner. I have already vetted the top EMR and RCM vendors for US practices. Let me save you weeks of research.';
  const catalystLineHeight = 9 * 1.6;
  const catalystSubLines = doc.splitTextToSize(catalystSubtext, contentWidth - 56);
  const catalystBannerH = 82 + catalystSubLines.length * catalystLineHeight;

  // Place cleanly at bottom of Page 1 unless content pushed down, in which case keep it right below
  const targetBannerY = Math.max(y + 6, pageHeight - 46 - catalystBannerH);
  if (targetBannerY + catalystBannerH > pageHeight - 42) {
    drawFooter();
    doc.addPage();
    y = 44;
  } else {
    y = targetBannerY;
  }

  const centerX = margin + contentWidth / 2;

  doc.setFillColor(239, 246, 255); // Soft light blue (#EFF6FF)
  doc.setDrawColor(191, 219, 254); // #BFDBFE
  doc.roundedRect(margin, y, contentWidth, catalystBannerH, 7, 7, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12.5);
  doc.setTextColor(10, 25, 47);
  doc.text('Stop guessing. Make a decision today.', centerX, y + 24, {
    align: 'center',
  });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(51, 65, 85);
  let cy = y + 42;
  catalystSubLines.forEach((line: string) => {
    doc.text(line, centerX, cy, { align: 'center' });
    cy += catalystLineHeight;
  });

  // Large centered clickable Calendly button (no raw URL text)
  const btnW = 320;
  const btnH = 30;
  const btnX = centerX - btnW / 2;
  const btnY = cy + 6;
  doc.setFillColor(15, 118, 110); // #0F766E dark teal button
  doc.roundedRect(btnX, btnY, btnW, btnH, 5, 5, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(255, 255, 255);
  doc.text('Book a free 15-min diagnostic call with Mr. Ali', centerX, btnY + 18.5, {
    align: 'center',
  });
  doc.link(btnX, btnY, btnW, btnH, { url: CALENDLY_URL });

  drawFooter();

  // =========================================================================
  // PAGE 2: PREDICTED IMPACT, PRIORITY SOLUTION CATEGORY, VENDOR CARDS, FOOTER
  // =========================================================================
  doc.addPage();

  // Subtle Page 2 top bar
  doc.setFillColor(10, 25, 47);
  doc.rect(0, 0, pageWidth, 8, 'F');
  doc.setFillColor(15, 118, 110);
  doc.rect(0, 8, pageWidth, 3, 'F');

  y = 34;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`EMR PULSE ANALYTICS REPORT  |  REPORT ID: ${reportId}`, margin, y);
  doc.text('PAGE 2 OF 2', pageWidth - margin, y, { align: 'right' });
  y += 22;

  // PREDICTED ANNUAL IMPACT
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(15, 118, 110); // #0F766E
  doc.text('PREDICTED ANNUAL IMPACT (INDUSTRY ESTIMATE)', margin, y);
  y += 14;

  const impactLineHeight = 9.2 * 1.6;
  const impactLines = doc.splitTextToSize(report.impactDisclaimer, contentWidth - 28);
  const impactBoxH = 42 + impactLines.length * impactLineHeight;

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, y, contentWidth, impactBoxH, 6, 6, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(10, 25, 47);
  doc.text(report.impactRange, margin + 14, y + 22);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.2);
  doc.setTextColor(71, 85, 105);
  let iy = y + 38;
  impactLines.forEach((line: string) => {
    doc.text(line, margin + 14, iy);
    iy += impactLineHeight;
  });

  y += impactBoxH + 22;

  // PRIORITY SOLUTION CATEGORY
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(15, 118, 110); // #0F766E
  doc.text('PRIORITY SOLUTION CATEGORY', margin, y);
  y += 14;

  const catLineHeight = 9.2 * 1.6;
  const catLines = doc.splitTextToSize(report.categoryRationale, contentWidth - 28);
  const catBoxH = 42 + catLines.length * catLineHeight;

  doc.setFillColor(240, 253, 250);
  doc.setDrawColor(15, 118, 110);
  doc.roundedRect(margin, y, contentWidth, catBoxH, 6, 6, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 118, 110);
  doc.text(`Prioritize First: ${report.recommendedCategory}`, margin + 14, y + 22);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.2);
  doc.setTextColor(30, 41, 59);
  let rY = y + 38;
  catLines.forEach((line: string) => {
    doc.text(line, margin + 14, rY);
    rY += catLineHeight;
  });

  y += catBoxH + 24;

  // MARKET SNAPSHOT: ESTIMATED VENDOR PRICING (FOR REFERENCE)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(15, 118, 110); // #0F766E
  doc.text('MARKET SNAPSHOT: ESTIMATED VENDOR PRICING (FOR REFERENCE)', margin, y);
  y += 13;

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text(
    'Vendor-neutral reference — EMR Pulse is not affiliated with these vendors.',
    margin,
    y
  );
  y += 12;

  const cols = [
    { label: 'Vendor Name', width: 88 },
    { label: 'Solution Type', width: 88 },
    { label: 'Est. Starting Price', width: 134 },
    { label: 'Best For', width: 230 },
  ]; // Sum = 540pt = contentWidth

  const headerRowH = 26;
  doc.setFillColor(10, 25, 47); // #0A192F dark navy header matching top banner
  doc.rect(margin, y, contentWidth, headerRowH, 'F');

  let colX = margin;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.2);
  doc.setTextColor(255, 255, 255);
  cols.forEach((col) => {
    doc.text(col.label, colX + 8, y + 16);
    colX += col.width;
  });
  y += headerRowH;

  const cellLineHeight = 8.4 * 1.6;
  VENDOR_PRICING_TABLE.forEach((row, idx) => {
    const priceLines = doc.splitTextToSize(row.estStartingPrice, cols[2].width - 14);
    const bestForLines = doc.splitTextToSize(row.bestFor, cols[3].width - 14);
    const maxLines = Math.max(priceLines.length, bestForLines.length, 1);
    const rowH = Math.max(32, 16 + maxLines * cellLineHeight);

    // Alternating light grey / white rows
    if (idx % 2 === 0) {
      doc.setFillColor(255, 255, 255);
    } else {
      doc.setFillColor(241, 245, 249); // #F1F5F9
    }
    doc.setDrawColor(203, 213, 225); // #CBD5E1 clean border
    doc.rect(margin, y, contentWidth, rowH, 'FD');

    // Vertical column dividers
    let dividerX = margin;
    cols.slice(0, -1).forEach((col) => {
      dividerX += col.width;
      doc.line(dividerX, y, dividerX, y + rowH);
    });

    // Cell 1: Vendor Name
    let cellX = margin;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.8);
    doc.setTextColor(10, 25, 47);
    doc.text(row.vendorName, cellX + 8, y + 16);
    cellX += cols[0].width;

    // Cell 2: Solution Type
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.4);
    doc.setTextColor(15, 118, 110);
    doc.text(row.solutionType, cellX + 8, y + 16);
    cellX += cols[1].width;

    // Cell 3: Est. Starting Price
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.2);
    doc.setTextColor(15, 23, 42);
    let py = y + 16;
    priceLines.forEach((line: string) => {
      doc.text(line, cellX + 8, py);
      py += cellLineHeight;
    });
    cellX += cols[2].width;

    // Cell 4: Best For
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.4);
    doc.setTextColor(51, 65, 85);
    let by = y + 16;
    bestForLines.forEach((line: string) => {
      doc.text(line, cellX + 8, by);
      by += cellLineHeight;
    });

    y += rowH;
  });

  y += 20;

  // SECONDARY "STILL CONFUSED?" CTA BOX (Directly Below Table)
  const confusedBody =
    "Pricing changes fast, and hidden implementation fees are common. Let's talk to a specialist. I've vetted these vendors and can help you negotiate the best rate and avoid bad contracts.";
  const confusedLineHeight = 8.8 * 1.6;
  const confusedLines = doc.splitTextToSize(confusedBody, contentWidth - 56);
  const confusedBoxH = 78 + confusedLines.length * confusedLineHeight;

  if (y + confusedBoxH > pageHeight - 48) {
    drawFooter();
    doc.addPage();
    doc.setFillColor(10, 25, 47);
    doc.rect(0, 0, pageWidth, 8, 'F');
    doc.setFillColor(15, 118, 110);
    doc.rect(0, 8, pageWidth, 3, 'F');
    y = 36;
  }

  doc.setFillColor(10, 25, 47); // #0A192F dark navy box
  doc.setDrawColor(15, 118, 110); // #0F766E border
  doc.roundedRect(margin, y, contentWidth, confusedBoxH, 7, 7, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11.5);
  doc.setTextColor(255, 255, 255);
  doc.text('Still confused about which path fits your practice?', centerX, y + 23, {
    align: 'center',
  });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.8);
  doc.setTextColor(226, 232, 240);
  let scY = y + 40;
  confusedLines.forEach((line: string) => {
    doc.text(line, centerX, scY, { align: 'center' });
    scY += confusedLineHeight;
  });

  const talkBtnW = 300;
  const talkBtnH = 28;
  const talkBtnX = centerX - talkBtnW / 2;
  const talkBtnY = scY + 4;
  doc.setFillColor(15, 118, 110); // #0F766E dark teal button
  doc.roundedRect(talkBtnX, talkBtnY, talkBtnW, talkBtnH, 5, 5, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text('Talk to Mr. Ali (Healthcare IT & RCM Advisor)', centerX, talkBtnY + 17.5, {
    align: 'center',
  });
  doc.link(talkBtnX, talkBtnY, talkBtnW, talkBtnH, { url: CALENDLY_URL });

  drawFooter();

  return { doc, reportId, fileName };
}

export function getDiagnosticPdfBase64(
  report: DiagnosticReport,
  answers: DiagnosticAnswers,
  reportIdOverride?: string
): { base64: string; reportId: string; fileName: string } {
  const { doc, reportId, fileName } = buildDiagnosticPdfDocument(
    report,
    answers,
    reportIdOverride
  );
  const dataUri = doc.output('datauristring');
  const commaIdx = dataUri.indexOf(',');
  const base64 = commaIdx >= 0 ? dataUri.slice(commaIdx + 1) : dataUri;
  return { base64, reportId, fileName };
}

export function downloadDiagnosticPdf(
  report: DiagnosticReport,
  answers: DiagnosticAnswers,
  _vendorsUnlocked = true,
  reportIdOverride?: string
): void {
  const { doc, fileName } = buildDiagnosticPdfDocument(
    report,
    answers,
    reportIdOverride
  );
  doc.save(fileName);
}
