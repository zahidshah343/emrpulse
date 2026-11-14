import type { DiagnosticAnswers } from '../types/diagnostic';

export interface RiskGaugeMetric {
  score: number; // 0 to 100
  label: string;
  severity: 'high' | 'moderate' | 'low';
  colorHex: string;
  bgTintHex: string;
  rgb: [number, number, number];
  bgRgb: [number, number, number];
  answerDisplay: string;
}

export function generateReportId(generatedAt: string): string {
  let hash = 0;
  for (let i = 0; i < generatedAt.length; i++) {
    hash = (hash * 31 + generatedAt.charCodeAt(i)) % 10000;
  }
  const code = String(Math.abs(hash)).padStart(4, '0');
  return `#EP-2026-${code}`;
}

export function computeRevenueRisk(denialDiscoveryLag: string): RiskGaugeMetric {
  if (denialDiscoveryLag === 'A month or more' || denialDiscoveryLag === "I don't know") {
    return {
      score: 90,
      label: 'High Revenue Leakage Risk',
      severity: 'high',
      colorHex: '#DC2626',
      bgTintHex: '#FEF2F2',
      rgb: [220, 38, 38],
      bgRgb: [254, 242, 242],
      answerDisplay: denialDiscoveryLag,
    };
  }

  if (denialDiscoveryLag === '1–2 weeks' || denialDiscoveryLag === '1-2 weeks') {
    return {
      score: 82,
      label: 'High Revenue Leakage Risk',
      severity: 'high',
      colorHex: '#EA580C',
      bgTintHex: '#FFF7ED',
      rgb: [234, 88, 12],
      bgRgb: [255, 247, 237],
      answerDisplay: denialDiscoveryLag,
    };
  }

  if (denialDiscoveryLag === 'Within a week') {
    return {
      score: 48,
      label: 'Moderate Revenue Visibility Risk',
      severity: 'moderate',
      colorHex: '#D97706',
      bgTintHex: '#FFFBEB',
      rgb: [217, 119, 6],
      bgRgb: [255, 251, 235],
      answerDisplay: denialDiscoveryLag,
    };
  }

  return {
    score: 18,
    label: 'Low Revenue Leakage Risk',
    severity: 'low',
    colorHex: '#0F5C5B',
    bgTintHex: '#EDF6F5',
    rgb: [15, 92, 91],
    bgRgb: [237, 246, 245],
    answerDisplay: denialDiscoveryLag,
  };
}

export function computeBurnoutRisk(afterHoursChartingHours: string): RiskGaugeMetric {
  if (afterHoursChartingHours === '10+') {
    return {
      score: 90,
      label: 'Clinician Burnout Risk',
      severity: 'high',
      colorHex: '#D97706',
      bgTintHex: '#FFFBEB',
      rgb: [217, 119, 6],
      bgRgb: [255, 251, 235],
      answerDisplay: `${afterHoursChartingHours} hrs/wk`,
    };
  }

  if (afterHoursChartingHours === '6–10' || afterHoursChartingHours === '6-10') {
    return {
      score: 76,
      label: 'Clinician Burnout Risk',
      severity: 'moderate',
      colorHex: '#D97706',
      bgTintHex: '#FFFBEB',
      rgb: [217, 119, 6],
      bgRgb: [255, 251, 235],
      answerDisplay: `${afterHoursChartingHours} hrs/wk`,
    };
  }

  if (afterHoursChartingHours === '3–5' || afterHoursChartingHours === '3-5') {
    return {
      score: 62,
      label: 'Clinician Burnout Risk',
      severity: 'moderate',
      colorHex: '#D97706',
      bgTintHex: '#FFFBEB',
      rgb: [217, 119, 6],
      bgRgb: [255, 251, 235],
      answerDisplay: `${afterHoursChartingHours} hrs/wk`,
    };
  }

  return {
    score: 22,
    label: 'Sustainable Charting Load',
    severity: 'low',
    colorHex: '#0F5C5B',
    bgTintHex: '#EDF6F5',
    rgb: [15, 92, 91],
    bgRgb: [237, 246, 245],
    answerDisplay: `${afterHoursChartingHours} hrs/wk`,
  };
}

export function getOperationalPostureRows(answers: DiagnosticAnswers) {
  return [
    { label: 'Admin / Billing Staff', value: `${answers.adminBillingStaffCount} FTE` },
    { label: 'Team AI Readiness', value: answers.aiComfortLevel },
    { label: 'Primary Transition Concern', value: answers.switchingFear },
    { label: 'Current EMR Model', value: answers.emrWorkModel },
  ];
}
