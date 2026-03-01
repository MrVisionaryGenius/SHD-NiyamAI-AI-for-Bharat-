import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { analyzeContractRisks, analyzeInvoiceCompliance } from '../../lib/ai-service';
import { query } from '../../lib/db';
import { logger } from '../../lib/logger';
import { SECURITY_QUESTIONNAIRE } from '../../lib/security-questionnaire';
import { SecurityQuestion } from '../../../types';
import {
  withErrorHandling,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError
} from '../../lib/error-handler';

interface AnalyzeRequest {
  documentId: string;
}

interface SecurityQuestionnaireRequest {
  responses: Array<{
    questionId: string;
    response: string;
  }>;
}

interface SecurityAssessmentResponse {
  assessmentId: string;
  riskScore: number;
  severity: 'low' | 'medium' | 'high';
  recommendations: Array<{
    id: string;
    issue: string;
    suggestion: string;
    priority: number;
  }>;
}

interface ContractAnalysisResponse {
  assessmentId: string;
  riskScore: number;
  severity: 'low' | 'medium' | 'high';
  risks: Array<{
    id: string;
    category: string;
    severity: 'low' | 'medium' | 'high';
    description: string;
    location?: string;
  }>;
  recommendations: Array<{
    id: string;
    issue: string;
    suggestion: string;
    priority: number;
  }>;
}

interface InvoiceAnalysisResponse {
  assessmentId: string;
  riskScore: number;
  severity: 'low' | 'medium' | 'high';
  warnings: Array<{
    id: string;
    category: string;
    severity: 'low' | 'medium' | 'high';
    description: string;
    location?: string;
  }>;
  recommendations: Array<{
    id: string;
    issue: string;
    suggestion: string;
    priority: number;
  }>;
}

/**
 * Calculate risk score from identified issues
 * Uses severity weighting to compute composite score
 */
export function calculateRiskScore(risks: Array<{ severity: 'low' | 'medium' | 'high' }>): number {
  if (!risks || risks.length === 0) {
    return 0;
  }

  // Severity weights
  const severityWeights = {
    low: 20,
    medium: 50,
    high: 100
  };

  // Calculate weighted sum
  const totalWeight = risks.reduce((sum, risk) => {
    return sum + severityWeights[risk.severity];
  }, 0);

  // Calculate average and normalize to 0-100
  const averageWeight = totalWeight / risks.length;
  
  // Ensure score is within bounds
  return Math.min(100, Math.max(0, Math.round(averageWeight)));
}

/**
 * Map risk score to severity level
 * Low: 0-33, Medium: 34-66, High: 67-100
 */
export function getSeverity(score: number): 'low' | 'medium' | 'high' {
  if (score <= 33) {
    return 'low';
  } else if (score <= 66) {
    return 'medium';
  } else {
    return 'high';
  }
}

/**
 * Analyze contract document for legal risks
 */
async function analyzeContract(documentId: string, userId: string): Promise<ContractAnalysisResponse> {
  logger.info('Starting contract analysis', { documentId, userId });

  // Retrieve document and extracted text
  const documentResult = await query(
    'SELECT id, user_id, extracted_text, document_type FROM documents WHERE id = $1',
    [documentId]
  );

  if (documentResult.rows.length === 0) {
    throw new NotFoundError('Document not found');
  }

  const document = documentResult.rows[0];

  // Verify ownership
  if (document.user_id !== userId) {
    throw new AuthorizationError('Access denied: Document does not belong to user');
  }

  // Verify document type
  if (document.document_type !== 'contract') {
    throw new ValidationError('Invalid document type: Expected contract');
  }

  // Check if text has been extracted
  if (!document.extracted_text) {
    throw new ValidationError('Document text not yet extracted');
  }

  // Call AI service for risk analysis
  const aiResult = await analyzeContractRisks(document.extracted_text);

  // Calculate risk score
  const riskScore = calculateRiskScore(aiResult.risks);
  const severity = getSeverity(riskScore);

  logger.info('Risk analysis completed', {
    documentId,
    riskScore,
    severity,
    risksFound: aiResult.risks.length,
    recommendationsGenerated: aiResult.recommendations.length
  });

  // Store assessment in database
  const assessmentResult = await query(
    `INSERT INTO assessments (user_id, document_id, assessment_type, risk_score, severity, status)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id`,
    [userId, documentId, 'contract', riskScore, severity, 'completed']
  );

  const assessmentId = assessmentResult.rows[0].id;

  // Store risks
  const riskIds: string[] = [];
  for (const risk of aiResult.risks) {
    const riskResult = await query(
      `INSERT INTO risks (assessment_id, category, severity, description, location)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [assessmentId, risk.category, risk.severity, risk.description, risk.location || null]
    );
    riskIds.push(riskResult.rows[0].id);
  }

  // Store recommendations
  const recommendationIds: string[] = [];
  for (const recommendation of aiResult.recommendations) {
    const recResult = await query(
      `INSERT INTO recommendations (assessment_id, issue, suggestion, priority)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [assessmentId, recommendation.issue, recommendation.suggestion, recommendation.priority]
    );
    recommendationIds.push(recResult.rows[0].id);
  }

  logger.info('Assessment stored in database', {
    assessmentId,
    risksStored: riskIds.length,
    recommendationsStored: recommendationIds.length
  });

  // Return structured response
  return {
    assessmentId,
    riskScore,
    severity,
    risks: aiResult.risks.map((risk, index) => ({
      id: riskIds[index],
      category: risk.category,
      severity: risk.severity,
      description: risk.description,
      location: risk.location
    })),
    recommendations: aiResult.recommendations.map((rec, index) => ({
      id: recommendationIds[index],
      issue: rec.issue,
      suggestion: rec.suggestion,
      priority: rec.priority
    }))
  };
}

/**
 * Analyze invoice document for GST compliance
 */
async function analyzeInvoice(documentId: string, userId: string): Promise<InvoiceAnalysisResponse> {
  logger.info('Starting invoice analysis', { documentId, userId });

  // Retrieve document and extracted text
  const documentResult = await query(
    'SELECT id, user_id, extracted_text, document_type FROM documents WHERE id = $1',
    [documentId]
  );

  if (documentResult.rows.length === 0) {
    throw new NotFoundError('Document not found');
  }

  const document = documentResult.rows[0];

  // Verify ownership
  if (document.user_id !== userId) {
    throw new AuthorizationError('Access denied: Document does not belong to user');
  }

  // Verify document type
  if (document.document_type !== 'invoice') {
    throw new ValidationError('Invalid document type: Expected invoice');
  }

  // Check if text has been extracted
  if (!document.extracted_text) {
    throw new ValidationError('Document text not yet extracted');
  }

  // Call AI service for compliance analysis
  const aiResult = await analyzeInvoiceCompliance(document.extracted_text);

  // Calculate risk score (for invoices, this represents compliance issues)
  const riskScore = calculateRiskScore(aiResult.risks);
  const severity = getSeverity(riskScore);

  logger.info('Invoice compliance analysis completed', {
    documentId,
    riskScore,
    severity,
    warningsFound: aiResult.risks.length,
    recommendationsGenerated: aiResult.recommendations.length
  });

  // Store assessment in database
  const assessmentResult = await query(
    `INSERT INTO assessments (user_id, document_id, assessment_type, risk_score, severity, status)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id`,
    [userId, documentId, 'invoice', riskScore, severity, 'completed']
  );

  const assessmentId = assessmentResult.rows[0].id;

  // Store warnings (stored as risks in the database)
  const warningIds: string[] = [];
  for (const warning of aiResult.risks) {
    const warningResult = await query(
      `INSERT INTO risks (assessment_id, category, severity, description, location)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [assessmentId, warning.category, warning.severity, warning.description, warning.location || null]
    );
    warningIds.push(warningResult.rows[0].id);
  }

  // Store recommendations
  const recommendationIds: string[] = [];
  for (const recommendation of aiResult.recommendations) {
    const recResult = await query(
      `INSERT INTO recommendations (assessment_id, issue, suggestion, priority)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [assessmentId, recommendation.issue, recommendation.suggestion, recommendation.priority]
    );
    recommendationIds.push(recResult.rows[0].id);
  }

  logger.info('Invoice assessment stored in database', {
    assessmentId,
    warningsStored: warningIds.length,
    recommendationsStored: recommendationIds.length
  });

  // Return structured response
  return {
    assessmentId,
    riskScore,
    severity,
    warnings: aiResult.risks.map((warning, index) => ({
      id: warningIds[index],
      category: warning.category,
      severity: warning.severity,
      description: warning.description,
      location: warning.location
    })),
    recommendations: aiResult.recommendations.map((rec, index) => ({
      id: recommendationIds[index],
      issue: rec.issue,
      suggestion: rec.suggestion,
      priority: rec.priority
    }))
  };
}

/**
 * Evaluate security questionnaire responses
 * Calculates weighted score and generates recommendations
 */
export async function evaluateSecurityQuestionnaire(
  userId: string,
  responses: Array<{ questionId: string; response: string }>
): Promise<SecurityAssessmentResponse> {
  logger.info('Starting security questionnaire evaluation', { userId, responseCount: responses.length });

  // Validate that all questions are answered
  if (responses.length !== SECURITY_QUESTIONNAIRE.length) {
    throw new ValidationError(`Expected ${SECURITY_QUESTIONNAIRE.length} responses, received ${responses.length}`);
  }

  // Calculate weighted score
  let totalWeightedScore = 0;
  let totalWeight = 0;
  const weakResponses: Array<{
    question: SecurityQuestion;
    response: string;
    score: number;
  }> = [];

  for (const response of responses) {
    const question = SECURITY_QUESTIONNAIRE.find(q => q.id === response.questionId);
    
    if (!question) {
      throw new ValidationError(`Invalid question ID: ${response.questionId}`);
    }

    const option = question.options.find(opt => opt.value === response.response);
    
    if (!option) {
      throw new ValidationError(`Invalid response for question ${response.questionId}: ${response.response}`);
    }

    // Calculate weighted score
    const weightedScore = option.score * question.weight;
    totalWeightedScore += weightedScore;
    totalWeight += question.weight;

    // Track weak responses (score < 100) for recommendations
    if (option.score < 100) {
      weakResponses.push({
        question,
        response: response.response,
        score: option.score
      });
    }
  }

  // Calculate final risk score (0-100)
  const riskScore = Math.round(totalWeightedScore / totalWeight);
  const severity = getSeverity(riskScore);

  logger.info('Security score calculated', {
    userId,
    riskScore,
    severity,
    weakResponsesCount: weakResponses.length
  });

  // Generate recommendations based on weak responses
  const recommendations = generateSecurityRecommendations(weakResponses);

  // Store assessment in database
  const assessmentResult = await query(
    `INSERT INTO assessments (user_id, assessment_type, risk_score, severity, status)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id`,
    [userId, 'security', riskScore, severity, 'completed']
  );

  const assessmentId = assessmentResult.rows[0].id;

  // Store individual responses
  for (const response of responses) {
    const question = SECURITY_QUESTIONNAIRE.find(q => q.id === response.questionId)!;
    const option = question.options.find(opt => opt.value === response.response)!;

    await query(
      `INSERT INTO security_responses (assessment_id, question_id, question_text, response, score)
       VALUES ($1, $2, $3, $4, $5)`,
      [assessmentId, response.questionId, question.text, response.response, option.score]
    );
  }

  // Store recommendations
  const recommendationIds: string[] = [];
  for (const recommendation of recommendations) {
    const recResult = await query(
      `INSERT INTO recommendations (assessment_id, issue, suggestion, priority)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [assessmentId, recommendation.issue, recommendation.suggestion, recommendation.priority]
    );
    recommendationIds.push(recResult.rows[0].id);
  }

  logger.info('Security assessment stored in database', {
    assessmentId,
    responsesStored: responses.length,
    recommendationsStored: recommendationIds.length
  });

  // Return structured response
  return {
    assessmentId,
    riskScore,
    severity,
    recommendations: recommendations.map((rec, index) => ({
      id: recommendationIds[index],
      issue: rec.issue,
      suggestion: rec.suggestion,
      priority: rec.priority
    }))
  };
}

/**
 * Generate security recommendations based on weak responses
 * Prioritizes recommendations by severity (lower scores = higher priority)
 */
export function generateSecurityRecommendations(
  weakResponses: Array<{
    question: SecurityQuestion;
    response: string;
    score: number;
  }>
): Array<{ issue: string; suggestion: string; priority: number }> {
  const recommendations: Array<{ issue: string; suggestion: string; priority: number; score: number }> = [];

  for (const weak of weakResponses) {
    const question = weak.question;
    const bestOption = question.options.reduce((best, opt) => 
      opt.score > best.score ? opt : best
    );

    // Generate recommendation based on question category
    let issue: string;
    let suggestion: string;

    switch (question.id) {
      case 'pwd_policy':
        issue = 'Weak password management practices';
        suggestion = 'Use a password manager like Bitwarden, 1Password, or LastPass to generate and store unique passwords for each account';
        break;
      case 'mfa_usage':
        issue = 'Missing two-factor authentication';
        suggestion = 'Enable 2FA/MFA on all business accounts, especially email, banking, and cloud services. Use authenticator apps like Google Authenticator or Authy';
        break;
      case 'device_security':
        issue = 'Unprotected work devices';
        suggestion = 'Set strong passwords or PINs on all devices used for business. Enable biometric authentication where available';
        break;
      case 'software_updates':
        issue = 'Outdated software and systems';
        suggestion = 'Enable automatic updates for operating systems and applications. Regularly check for and install security patches';
        break;
      case 'data_backup':
        issue = 'Inadequate data backup';
        suggestion = 'Set up automatic cloud backups using services like Google Drive, Dropbox, or dedicated backup solutions. Test restore procedures regularly';
        break;
      case 'data_sharing':
        issue = 'Insecure file sharing methods';
        suggestion = 'Use secure cloud storage with access controls (Google Drive, OneDrive, Dropbox Business) instead of email or messaging apps for sensitive files';
        break;
      case 'access_control':
        issue = 'Poor access management';
        suggestion = 'Create individual accounts for each team member. Review and revoke access regularly, especially when people leave the organization';
        break;
      case 'wifi_security':
        issue = 'Insecure network usage';
        suggestion = 'Use a secured WiFi network with WPA3 or WPA2 encryption. Avoid public WiFi for business work, or use a VPN if necessary';
        break;
      default:
        issue = `Improvement needed: ${question.text}`;
        suggestion = `Consider adopting best practice: ${bestOption.label}`;
    }

    recommendations.push({
      issue,
      suggestion,
      priority: 100 - weak.score, // Lower score = higher priority
      score: weak.score
    });
  }

  // Sort by priority (higher priority first) and assign sequential priority numbers
  recommendations.sort((a, b) => b.priority - a.priority);
  
  return recommendations.map((rec, index) => ({
    issue: rec.issue,
    suggestion: rec.suggestion,
    priority: index + 1
  }));
}

/**
 * Lambda handler for analysis operations
 */
const analysisHandlerImpl = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  // Extract user ID from authorizer context
  const userId = event.requestContext.authorizer?.claims?.sub;
  if (!userId) {
    throw new AuthenticationError('Authentication required');
  }

  // Parse request body
  if (!event.body) {
    throw new ValidationError('Request body is required');
  }

  const requestBody = JSON.parse(event.body);

  // Check if this is a security questionnaire request
  if (requestBody.responses && Array.isArray(requestBody.responses)) {
    const securityRequest: SecurityQuestionnaireRequest = requestBody;
    const result = await evaluateSecurityQuestionnaire(userId, securityRequest.responses);
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(result)
    };
  }

  // Otherwise, treat as document analysis request
  const request: AnalyzeRequest = requestBody;

  // Validate request
  if (!request.documentId) {
    throw new ValidationError('documentId is required');
  }

  // Determine document type to route to appropriate analysis function
  const documentResult = await query(
    'SELECT document_type FROM documents WHERE id = $1 AND user_id = $2',
    [request.documentId, userId]
  );

  if (documentResult.rows.length === 0) {
    throw new NotFoundError('Document not found');
  }

  const documentType = documentResult.rows[0].document_type;

  // Route to appropriate analysis function
  let result: ContractAnalysisResponse | InvoiceAnalysisResponse;
  
  if (documentType === 'contract') {
    result = await analyzeContract(request.documentId, userId);
  } else if (documentType === 'invoice') {
    result = await analyzeInvoice(request.documentId, userId);
  } else {
    throw new ValidationError(`Unsupported document type: ${documentType}`);
  }

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    },
    body: JSON.stringify(result)
  };
};

export const handler = withErrorHandling(analysisHandlerImpl);
