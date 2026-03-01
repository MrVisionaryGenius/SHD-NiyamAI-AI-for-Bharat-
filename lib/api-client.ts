import {
  AuthToken,
  User,
  UploadResponse,
  DocumentStatus,
  AnalysisResult,
  SecurityAssessment,
  DashboardData,
  ReportURL,
} from '@/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

export class APIClient {
  private token: string | null = null;

  setToken(token: string) {
    this.token = token;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Merge additional headers
    if (options.headers) {
      const additionalHeaders = options.headers as Record<string, string>;
      Object.assign(headers, additionalHeaders);
    }

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
      });

      if (!response.ok) {
        // Try to parse error response
        const errorData = await response.json().catch(() => null);
        const errorMessage = errorData?.error || `HTTP ${response.status}: ${response.statusText}`;
        
        // Create error with appropriate message
        const error = new Error(errorMessage);
        (error as any).status = response.status;
        (error as any).statusText = response.statusText;
        throw error;
      }

      return response.json();
    } catch (error) {
      // Handle network errors
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('Network error. Please check your connection and try again.');
      }
      
      // Re-throw other errors
      throw error;
    }
  }

  // Authentication
  async login(email: string, password: string): Promise<AuthToken> {
    const response = await this.request<any>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    
    return {
      token: response.token,
      expiresAt: new Date(response.expiresAt),
    };
  }

  async register(email: string, password: string, businessName?: string): Promise<User> {
    const response = await this.request<User>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, businessName }),
    });
    
    return response;
  }

  // Document operations
  async uploadDocument(
    file: File,
    type: 'contract' | 'invoice'
  ): Promise<UploadResponse> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);

    const headers: HeadersInit = {};
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/documents/upload`, {
        method: 'POST',
        headers,
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        const errorMessage = errorData?.error || 'Upload failed, please try again';
        throw new Error(errorMessage);
      }

      return response.json();
    } catch (error) {
      // Handle network errors
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('Network error. Please check your connection and try again.');
      }
      
      // Re-throw other errors
      throw error;
    }
  }

  async getDocumentStatus(documentId: string): Promise<DocumentStatus> {
    return this.request<DocumentStatus>(`/documents/${documentId}/status`);
  }

  // Analysis operations
  async getAnalysisResults(documentId: string): Promise<AnalysisResult> {
    return this.request<AnalysisResult>(`/analyze/results/${documentId}`);
  }

  async submitSecurityQuestionnaire(
    responses: any[]
  ): Promise<SecurityAssessment> {
    return this.request<SecurityAssessment>('/analyze/security', {
      method: 'POST',
      body: JSON.stringify({ responses }),
    });
  }

  // Dashboard and reports
  async getDashboardData(): Promise<DashboardData> {
    return this.request<DashboardData>('/dashboard');
  }

  async generateReport(assessmentIds: string[]): Promise<ReportURL> {
    return this.request<ReportURL>('/reports/generate', {
      method: 'POST',
      body: JSON.stringify({ assessmentIds }),
    });
  }
}

export const apiClient = new APIClient();
