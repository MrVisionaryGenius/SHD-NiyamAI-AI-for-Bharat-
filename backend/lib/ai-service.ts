import { logger } from './logger';

const AI_API_ENDPOINT = process.env.AI_API_ENDPOINT || 'https://api.openai.com/v1/chat/completions';
const AI_API_KEY = process.env.AI_API_KEY || '';
const AI_MODEL = process.env.AI_MODEL || 'gpt-4';
const AI_MAX_TOKENS = parseInt(process.env.AI_MAX_TOKENS || '2000', 10);
const AI_TEMPERATURE = parseFloat(process.env.AI_TEMPERATURE || '0.3');
const MAX_RETRIES = parseInt(process.env.AI_MAX_RETRIES || '3', 10);
const BASE_RETRY_DELAY_MS = parseInt(process.env.AI_BASE_RETRY_DELAY_MS || '1000', 10);

// Rate limiting configuration
const RATE_LIMIT_REQUESTS_PER_MINUTE = parseInt(process.env.AI_RATE_LIMIT_RPM || '60', 10);
const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute

/**
 * Rate limiter to manage API request quotas
 */
class RateLimiter {
  private requestTimestamps: number[] = [];

  /**
   * Wait until a request slot is available within rate limits
   */
  async waitForSlot(): Promise<void> {
    const now = Date.now();
    
    // Remove timestamps outside the current window
    this.requestTimestamps = this.requestTimestamps.filter(
      timestamp => now - timestamp < RATE_LIMIT_WINDOW_MS
    );
    
    // Check if we're at the rate limit
    if (this.requestTimestamps.length >= RATE_LIMIT_REQUESTS_PER_MINUTE) {
      const oldestTimestamp = this.requestTimestamps[0];
      const timeUntilSlotAvailable = RATE_LIMIT_WINDOW_MS - (now - oldestTimestamp);
      
      if (timeUntilSlotAvailable > 0) {
        logger.warn('Rate limit reached, waiting for slot', {
          waitTimeMs: timeUntilSlotAvailable,
          currentRequests: this.requestTimestamps.length,
          limit: RATE_LIMIT_REQUESTS_PER_MINUTE
        });
        
        await sleep(timeUntilSlotAvailable);
        
        // Recursively check again after waiting
        return this.waitForSlot();
      }
    }
    
    // Record this request
    this.requestTimestamps.push(now);
  }

  /**
   * Execute an operation with rate limiting
   */
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    await this.waitForSlot();
    return operation();
  }

  /**
   * Get current rate limit status
   */
  getStatus(): { currentRequests: number; limit: number; windowMs: number } {
    const now = Date.now();
    this.requestTimestamps = this.requestTimestamps.filter(
      timestamp => now - timestamp < RATE_LIMIT_WINDOW_MS
    );
    
    return {
      currentRequests: this.requestTimestamps.length,
      limit: RATE_LIMIT_REQUESTS_PER_MINUTE,
      windowMs: RATE_LIMIT_WINDOW_MS
    };
  }
}

// Global rate limiter instance
const rateLimiter = new RateLimiter();

export interface Risk {
  category: string;
  severity: 'low' | 'medium' | 'high';
  description: string;
  location?: string;
}

export interface Recommendation {
  issue: string;
  suggestion: string;
  priority: number;
}

export interface AIAnalysisResult {
  risks: Risk[];
  recommendations: Recommendation[];
  confidence: number;
}

/**
 * Sleep utility for retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry wrapper with exponential backoff
 * Retries operations up to maxRetries times with exponential delay
 * Delays: 1s, 2s, 4s for default configuration
 */
export async function callWithRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = MAX_RETRIES,
  baseDelay: number = BASE_RETRY_DELAY_MS
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;

      if (attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt);
        logger.warn(`Attempt ${attempt + 1} failed, retrying in ${delay}ms`, {
          error: (error as Error).message,
          attempt: attempt + 1,
          maxRetries: maxRetries + 1
        });
        await sleep(delay);
      }
    }
  }

  logger.error(`All ${maxRetries + 1} attempts failed`, {
    error: lastError?.message,
    stack: lastError?.stack
  });
  
  throw new Error(`Operation failed after ${maxRetries + 1} attempts: ${lastError?.message || 'Unknown error'}`);
}

/**
 * Contract analysis prompt template
 */
function getContractAnalysisPrompt(text: string): string {
  return `You are a legal risk analyzer for small businesses. Analyze the following contract and identify:
1. Risky clauses (unlimited liability, unfavorable termination, IP issues)
2. Missing protections (confidentiality, dispute resolution, payment terms)
3. One-sided terms that favor the other party

For each issue found, provide:
- Category (liability, termination, payment, IP, etc.)
- Severity (low, medium, high)
- Clear explanation in simple language
- Specific suggestion for improvement

Return your analysis in the following JSON format:
{
  "risks": [
    {
      "category": "string",
      "severity": "low|medium|high",
      "description": "string",
      "location": "string (optional)"
    }
  ],
  "recommendations": [
    {
      "issue": "string",
      "suggestion": "string",
      "priority": number (1-5, where 1 is highest)
    }
  ],
  "confidence": number (0-1)
}

Contract text:
${text}`;
}

/**
 * Invoice compliance analysis prompt template
 */
function getInvoiceAnalysisPrompt(text: string): string {
  return `You are a GST compliance checker for Indian businesses. Analyze the following invoice and check for:
1. Required GST fields: GSTIN, Invoice Number, Date, HSN/SAC codes, Tax amounts (CGST, SGST, IGST)
2. Correct invoice structure and format
3. Calculation accuracy

For each issue found, provide:
- Field name or issue type
- Description of the problem
- Specific correction needed

Return your analysis in the following JSON format:
{
  "risks": [
    {
      "category": "string (field name or issue type)",
      "severity": "low|medium|high",
      "description": "string",
      "location": "string (optional)"
    }
  ],
  "recommendations": [
    {
      "issue": "string",
      "suggestion": "string",
      "priority": number (1-5, where 1 is highest)
    }
  ],
  "confidence": number (0-1)
}

Invoice text:
${text}`;
}

/**
 * Parse AI response and extract structured data
 */
function parseAIResponse(responseText: string): AIAnalysisResult {
  try {
    // Try to extract JSON from the response
    // The AI might wrap JSON in markdown code blocks
    let jsonText = responseText.trim();
    
    // Remove markdown code blocks if present
    const jsonMatch = jsonText.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
    if (jsonMatch) {
      jsonText = jsonMatch[1];
    }
    
    const parsed = JSON.parse(jsonText);
    
    // Validate structure
    if (!parsed.risks || !Array.isArray(parsed.risks)) {
      throw new Error('Invalid response: missing or invalid risks array');
    }
    
    if (!parsed.recommendations || !Array.isArray(parsed.recommendations)) {
      throw new Error('Invalid response: missing or invalid recommendations array');
    }
    
    // Validate and normalize risks
    const risks: Risk[] = parsed.risks.map((risk: any) => {
      if (!risk.category || !risk.severity || !risk.description) {
        throw new Error('Invalid risk object: missing required fields');
      }
      
      const severity = risk.severity.toLowerCase();
      if (!['low', 'medium', 'high'].includes(severity)) {
        throw new Error(`Invalid severity: ${risk.severity}`);
      }
      
      return {
        category: String(risk.category),
        severity: severity as 'low' | 'medium' | 'high',
        description: String(risk.description),
        location: risk.location ? String(risk.location) : undefined
      };
    });
    
    // Validate and normalize recommendations
    const recommendations: Recommendation[] = parsed.recommendations.map((rec: any) => {
      if (!rec.issue || !rec.suggestion || rec.priority === undefined) {
        throw new Error('Invalid recommendation object: missing required fields');
      }
      
      return {
        issue: String(rec.issue),
        suggestion: String(rec.suggestion),
        priority: Number(rec.priority)
      };
    });
    
    // Validate confidence
    const confidence = parsed.confidence !== undefined ? Number(parsed.confidence) : 0.8;
    if (confidence < 0 || confidence > 1) {
      throw new Error(`Invalid confidence value: ${confidence}`);
    }
    
    return {
      risks,
      recommendations,
      confidence
    };
    
  } catch (error) {
    logger.error('Failed to parse AI response', {
      error: (error as Error).message,
      responseText: responseText.substring(0, 500)
    });
    throw new Error(`Failed to parse AI response: ${(error as Error).message}`);
  }
}

/**
 * Call AI API with the given prompt
 * Includes rate limiting to stay within API quotas
 */
async function callAIAPI(prompt: string): Promise<string> {
  if (!AI_API_KEY) {
    throw new Error('AI_API_KEY environment variable is not set');
  }
  
  // Apply rate limiting
  return rateLimiter.execute(async () => {
    const requestBody = {
      model: AI_MODEL,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: AI_MAX_TOKENS,
      temperature: AI_TEMPERATURE
    };
    
    const rateLimitStatus = rateLimiter.getStatus();
    logger.info('Calling AI API', {
      model: AI_MODEL,
      promptLength: prompt.length,
      rateLimitStatus
    });
    
    const response = await fetch(AI_API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AI_API_KEY}`
      },
      body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      logger.error('AI API request failed', {
        status: response.status,
        statusText: response.statusText,
        error: errorText
      });
      throw new Error(`AI API request failed: ${response.status} ${response.statusText}`);
    }
    
    const data: any = await response.json();
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error('Invalid AI API response structure');
    }
    
    const content: string = data.choices[0].message.content;
    
    logger.info('AI API call successful', {
      responseLength: content.length,
      finishReason: data.choices[0].finish_reason
    });
    
    return content;
  });
}

/**
 * Analyze contract for legal risks
 */
export async function analyzeContractRisks(text: string): Promise<AIAnalysisResult> {
  if (!text || text.trim().length === 0) {
    throw new Error('Contract text cannot be empty');
  }
  
  logger.info('Analyzing contract risks', { textLength: text.length });
  
  return callWithRetry(async () => {
    const prompt = getContractAnalysisPrompt(text);
    const responseText = await callAIAPI(prompt);
    const result = parseAIResponse(responseText);
    
    logger.info('Contract analysis completed', {
      risksFound: result.risks.length,
      recommendationsGenerated: result.recommendations.length,
      confidence: result.confidence
    });
    
    return result;
  });
}

/**
 * Analyze invoice for GST compliance
 */
export async function analyzeInvoiceCompliance(text: string): Promise<AIAnalysisResult> {
  if (!text || text.trim().length === 0) {
    throw new Error('Invoice text cannot be empty');
  }
  
  logger.info('Analyzing invoice compliance', { textLength: text.length });
  
  return callWithRetry(async () => {
    const prompt = getInvoiceAnalysisPrompt(text);
    const responseText = await callAIAPI(prompt);
    const result = parseAIResponse(responseText);
    
    logger.info('Invoice analysis completed', {
      risksFound: result.risks.length,
      recommendationsGenerated: result.recommendations.length,
      confidence: result.confidence
    });
    
    return result;
  });
}

/**
 * Get current rate limiter status (for monitoring/testing)
 */
export function getRateLimiterStatus(): { currentRequests: number; limit: number; windowMs: number } {
  return rateLimiter.getStatus();
}
