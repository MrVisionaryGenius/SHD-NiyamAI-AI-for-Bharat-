// User types
export interface User {
  id: string;
  cognitoUserId: string;
  email: string;
  businessName?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Document types
export interface Document {
  id: string;
  userId: string;
  s3Key: string;
  filename: string;
  documentType: 'contract' | 'invoice';
  fileSize: number;
  uploadDate: Date;
  deletionDate: Date;
  extractedText?: string;
  ocrStatus: 'pending' | 'processing' | 'completed' | 'failed';
}

// Risk types
export interface Risk {
  id: string;
  assessmentId: string;
  category: string;
  severity: 'low' | 'medium' | 'high';
  description: string;
  location?: string;
  createdAt: Date;
}

// Recommendation types
export interface Recommendation {
  id: string;
  assessmentId: string;
  issue: string;
  suggestion: string;
  priority: number;
  createdAt: Date;
}

// Assessment types
export interface Assessment {
  id: string;
  userId: string;
  documentId?: string;
  assessmentType: 'contract' | 'invoice' | 'security';
  riskScore: number;
  severity: 'low' | 'medium' | 'high';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: Date;
  risks: Risk[];
  recommendations: Recommendation[];
}

// Security questionnaire types
export interface SecurityResponse {
  id: string;
  assessmentId: string;
  questionId: string;
  questionText: string;
  response: string;
  score?: number;
  createdAt: Date;
}

export interface SecurityOption {
  value: string;
  label: string;
  score: number;
}

export interface SecurityQuestion {
  id: string;
  category: 'passwords' | 'devices' | 'data' | 'access';
  text: string;
  options: SecurityOption[];
  weight: number;
}

// Dashboard types
export interface DashboardData {
  user: User;
  recentAssessments: Assessment[];
  overallRiskScore: number;
  actionItems: Recommendation[];
  documentCount: number;
}

// API response types
export interface AuthToken {
  token: string;
  expiresAt: Date;
}

export interface UploadResponse {
  documentId: string;
  s3Key: string;
  status: string;
}

export interface DocumentStatus {
  documentId: string;
  ocrStatus: string;
  analysisStatus?: string;
}

export interface AnalysisResult {
  assessmentId: string;
  riskScore: number;
  severity: string;
  risks: Risk[];
  recommendations: Recommendation[];
}

export interface SecurityAssessment {
  assessmentId: string;
  riskScore: number;
  severity: string;
  recommendations: Recommendation[];
}

export interface ReportURL {
  url: string;
  expiresAt: Date;
}

// AI Service types
export interface AIAnalysisResult {
  risks: Risk[];
  recommendations: Recommendation[];
  confidence: number;
}

// Textract types
export interface TextractResult {
  jobId: string;
  status: string;
  blocks?: any[];
}
