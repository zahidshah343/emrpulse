export interface DiagnosticAnswers {
  denialDiscoveryLag: string;
  afterHoursChartingHours: string;
  adminBillingStaffCount: string;
  aiComfortLevel: string;
  switchingFear: string;
  emrWorkModel: string;
}

export interface DiagnosticQuestion {
  id: keyof DiagnosticAnswers;
  number: number;
  question: string;
  helperText: string;
  options: readonly string[];
}

export interface OperationalRisk {
  title: string;
  mechanism: string;
  detail: string;
}

export interface VendorMatch {
  name: string;
  oneLineReason: string;
}

export interface DiagnosticReport {
  executiveSummary: string;
  rcmRiskAlert?: string | null;
  topRisks: OperationalRisk[];
  impactRange: string;
  impactDisclaimer: string;
  recommendedCategory: string;
  categoryRationale: string;
  vendorMatches: VendorMatch[];
  generatedAt: string;
}

export interface VendorCatalogEntry {
  name: string;
  profile: string;
  bestFor: string;
}

export interface LeadSubmissionPayload {
  email: string;
  role: string;
  answers: DiagnosticAnswers;
  recommendedCategory: string;
  topRiskTitles: string[];
}
