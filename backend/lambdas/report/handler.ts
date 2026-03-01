import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { query } from '../../lib/db';
import { logger } from '../../lib/logger';
import PDFDocument from 'pdfkit';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import {
  withErrorHandling,
  ValidationError,
  AuthenticationError,
  NotFoundError
} from '../../lib/error-handler';

const s3Client = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });
const BUCKET_NAME = process.env.DOCUMENTS_BUCKET || 'niyamai-documents';

interface Assessment {
  id: string;
  userId: string;
  documentId?: string;
  assessmentType: 'contract' | 'invoice' | 'security';
  riskScore: number;
  severity: 'low' | 'medium' | 'high';
  status: string;
  createdAt: Date;
  risks: any[];
  recommendations: any[];
}

interface DashboardData {
  user: {
    id: string;
    email: string;
    businessName?: string;
  };
  recentAssessments: Assessment[];
  overallRiskScore: number;
  actionItems: any[];
  documentCount: number;
}

export const getDashboardData = async (userId: string): Promise<DashboardData> => {
  try {
    // Query user information
    const userResult = await query(
      'SELECT id, email, business_name FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      throw new NotFoundError('User not found');
    }

    const user = {
      id: userResult.rows[0].id,
      email: userResult.rows[0].email,
      businessName: userResult.rows[0].business_name,
    };

    // Query all user assessments with their risks and recommendations
    const assessmentsResult = await query(
      `SELECT 
        a.id, a.user_id, a.document_id, a.assessment_type, 
        a.risk_score, a.severity, a.status, a.created_at
      FROM assessments a
      WHERE a.user_id = $1 AND a.status = 'completed'
      ORDER BY a.created_at DESC`,
      [userId]
    );

    const assessments: Assessment[] = [];

    // For each assessment, fetch risks and recommendations
    for (const row of assessmentsResult.rows) {
      const risksResult = await query(
        `SELECT id, assessment_id, category, severity, description, location, created_at
         FROM risks WHERE assessment_id = $1`,
        [row.id]
      );

      const recommendationsResult = await query(
        `SELECT id, assessment_id, issue, suggestion, priority, created_at
         FROM recommendations WHERE assessment_id = $1
         ORDER BY priority ASC`,
        [row.id]
      );

      assessments.push({
        id: row.id,
        userId: row.user_id,
        documentId: row.document_id,
        assessmentType: row.assessment_type,
        riskScore: row.risk_score,
        severity: row.severity,
        status: row.status,
        createdAt: row.created_at,
        risks: risksResult.rows.map(r => ({
          id: r.id,
          assessmentId: r.assessment_id,
          category: r.category,
          severity: r.severity,
          description: r.description,
          location: r.location,
          createdAt: r.created_at,
        })),
        recommendations: recommendationsResult.rows.map(rec => ({
          id: rec.id,
          assessmentId: rec.assessment_id,
          issue: rec.issue,
          suggestion: rec.suggestion,
          priority: rec.priority,
          createdAt: rec.created_at,
        })),
      });
    }

    // Calculate overall risk score (weighted average of all assessments)
    let overallRiskScore = 0;
    if (assessments.length > 0) {
      const totalScore = assessments.reduce((sum, a) => sum + a.riskScore, 0);
      overallRiskScore = Math.round(totalScore / assessments.length);
    }

    // Organize action items by priority (collect all recommendations and sort)
    const allRecommendations = assessments.flatMap(a => a.recommendations);
    const actionItems = allRecommendations.sort((a, b) => a.priority - b.priority);

    // Count documents
    const documentCountResult = await query(
      'SELECT COUNT(*) as count FROM documents WHERE user_id = $1',
      [userId]
    );
    const documentCount = parseInt(documentCountResult.rows[0].count);

    return {
      user,
      recentAssessments: assessments,
      overallRiskScore,
      actionItems,
      documentCount,
    };
  } catch (error) {
    logger.error('Error fetching dashboard data', { error, userId });
    throw error;
  }
};

interface ReportData {
  user: {
    id: string;
    email: string;
    businessName?: string;
  };
  assessments: Assessment[];
  generatedAt: Date;
}

export const getReportData = async (userId: string, assessmentIds: string[]): Promise<ReportData> => {
  try {
    // Query user information
    const userResult = await query(
      'SELECT id, email, business_name FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      throw new NotFoundError('User not found');
    }

    const user = {
      id: userResult.rows[0].id,
      email: userResult.rows[0].email,
      businessName: userResult.rows[0].business_name,
    };

    // Query selected assessments
    const assessments: Assessment[] = [];

    for (const assessmentId of assessmentIds) {
      const assessmentResult = await query(
        `SELECT 
          a.id, a.user_id, a.document_id, a.assessment_type, 
          a.risk_score, a.severity, a.status, a.created_at
        FROM assessments a
        WHERE a.id = $1 AND a.user_id = $2 AND a.status = 'completed'`,
        [assessmentId, userId]
      );

      if (assessmentResult.rows.length === 0) {
        logger.warn('Assessment not found or not accessible', { assessmentId, userId });
        continue;
      }

      const row = assessmentResult.rows[0];

      // Fetch risks
      const risksResult = await query(
        `SELECT id, assessment_id, category, severity, description, location, created_at
         FROM risks WHERE assessment_id = $1`,
        [row.id]
      );

      // Fetch recommendations
      const recommendationsResult = await query(
        `SELECT id, assessment_id, issue, suggestion, priority, created_at
         FROM recommendations WHERE assessment_id = $1
         ORDER BY priority ASC`,
        [row.id]
      );

      assessments.push({
        id: row.id,
        userId: row.user_id,
        documentId: row.document_id,
        assessmentType: row.assessment_type,
        riskScore: row.risk_score,
        severity: row.severity,
        status: row.status,
        createdAt: row.created_at,
        risks: risksResult.rows.map(r => ({
          id: r.id,
          assessmentId: r.assessment_id,
          category: r.category,
          severity: r.severity,
          description: r.description,
          location: r.location,
          createdAt: r.created_at,
        })),
        recommendations: recommendationsResult.rows.map(rec => ({
          id: rec.id,
          assessmentId: rec.assessment_id,
          issue: rec.issue,
          suggestion: rec.suggestion,
          priority: rec.priority,
          createdAt: rec.created_at,
        })),
      });
    }

    return {
      user,
      assessments,
      generatedAt: new Date(),
    };
  } catch (error) {
    logger.error('Error fetching report data', { error, userId, assessmentIds });
    throw error;
  }
};

export const generateReport = async (userId: string, assessmentIds: string[]): Promise<string> => {
  try {
    // Get report data
    const reportData = await getReportData(userId, assessmentIds);

    if (reportData.assessments.length === 0) {
      throw new ValidationError('No assessments found for report generation');
    }

    // Create PDF document
    const doc = new PDFDocument({ margin: 50 });
    const chunks: Buffer[] = [];

    // Collect PDF data
    doc.on('data', (chunk) => chunks.push(chunk));

    // Generate PDF content
    await new Promise<void>((resolve, reject) => {
      doc.on('end', resolve);
      doc.on('error', reject);

      // Header
      doc.fontSize(24).font('Helvetica-Bold').text('NiyamAI Risk Assessment Report', { align: 'center' });
      doc.moveDown();

      // Business information
      doc.fontSize(12).font('Helvetica');
      doc.text(`Business: ${reportData.user.businessName || reportData.user.email}`);
      doc.text(`Generated: ${reportData.generatedAt.toLocaleDateString()} ${reportData.generatedAt.toLocaleTimeString()}`);
      doc.moveDown(2);

      // Summary section
      doc.fontSize(16).font('Helvetica-Bold').text('Summary');
      doc.moveDown(0.5);
      doc.fontSize(12).font('Helvetica');
      doc.text(`Total Assessments: ${reportData.assessments.length}`);
      
      const avgScore = Math.round(
        reportData.assessments.reduce((sum, a) => sum + a.riskScore, 0) / reportData.assessments.length
      );
      doc.text(`Average Risk Score: ${avgScore}/100`);
      doc.moveDown(2);

      // Assessments details
      reportData.assessments.forEach((assessment, index) => {
        // Add page break if needed (except for first assessment)
        if (index > 0 && doc.y > 600) {
          doc.addPage();
        }

        // Assessment header
        doc.fontSize(14).font('Helvetica-Bold');
        doc.text(`${index + 1}. ${assessment.assessmentType.charAt(0).toUpperCase() + assessment.assessmentType.slice(1)} Assessment`);
        doc.moveDown(0.5);

        // Assessment details
        doc.fontSize(11).font('Helvetica');
        doc.text(`Date: ${new Date(assessment.createdAt).toLocaleDateString()}`);
        doc.text(`Risk Score: ${assessment.riskScore}/100`);
        doc.text(`Severity: ${assessment.severity.toUpperCase()}`);
        doc.moveDown(1);

        // Risks
        if (assessment.risks.length > 0) {
          doc.fontSize(12).font('Helvetica-Bold').text('Identified Risks:');
          doc.moveDown(0.5);
          doc.fontSize(10).font('Helvetica');

          assessment.risks.forEach((risk, riskIdx) => {
            doc.text(`${riskIdx + 1}. ${risk.category} (${risk.severity})`, { continued: false });
            doc.text(`   ${risk.description}`, { indent: 20 });
            if (risk.location) {
              doc.text(`   Location: ${risk.location}`, { indent: 20 });
            }
            doc.moveDown(0.5);
          });
          doc.moveDown(0.5);
        }

        // Recommendations
        if (assessment.recommendations.length > 0) {
          doc.fontSize(12).font('Helvetica-Bold').text('Recommendations:');
          doc.moveDown(0.5);
          doc.fontSize(10).font('Helvetica');

          assessment.recommendations.forEach((rec, recIdx) => {
            doc.text(`${recIdx + 1}. ${rec.issue} (Priority ${rec.priority})`, { continued: false });
            doc.text(`   ${rec.suggestion}`, { indent: 20 });
            doc.moveDown(0.5);
          });
        }

        doc.moveDown(1.5);
      });

      // Footer
      doc.fontSize(9).font('Helvetica').text(
        'This report is generated by NiyamAI Risk Checker. Please consult with legal and security professionals for comprehensive advice.',
        50,
        doc.page.height - 50,
        { align: 'center', width: doc.page.width - 100 }
      );

      doc.end();
    });

    // Combine chunks into single buffer
    const pdfBuffer = Buffer.concat(chunks);

    // Upload to S3
    const reportKey = `reports/${userId}/${Date.now()}-report.pdf`;
    await s3Client.send(
      new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: reportKey,
        Body: pdfBuffer,
        ContentType: 'application/pdf',
        ServerSideEncryption: 'AES256',
      })
    );

    // Generate pre-signed URL (valid for 1 hour)
    const downloadUrl = await getSignedUrl(
      s3Client,
      new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: reportKey,
      }),
      { expiresIn: 3600 }
    );

    logger.info('Report generated successfully', { userId, assessmentIds, reportKey });

    return downloadUrl;
  } catch (error) {
    logger.error('Error generating report', { error, userId, assessmentIds });
    throw error;
  }
};

const reportHandlerImpl = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  const userId = event.requestContext.authorizer?.claims?.sub;

  if (!userId) {
    throw new AuthenticationError('Unauthorized');
  }

  const path = event.path;

  // Handle dashboard data request
  if (path.includes('/dashboard') && event.httpMethod === 'GET') {
    const dashboardData = await getDashboardData(userId);
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify(dashboardData),
    };
  }

  // Handle report generation request
  if (path.includes('/reports/generate') && event.httpMethod === 'POST') {
    const body = JSON.parse(event.body || '{}');
    const assessmentIds = body.assessmentIds;

    if (!assessmentIds || !Array.isArray(assessmentIds) || assessmentIds.length === 0) {
      throw new ValidationError('Assessment IDs are required');
    }

    const downloadUrl = await generateReport(userId, assessmentIds);
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        url: downloadUrl,
        expiresAt: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
      }),
    };
  }

  throw new NotFoundError('Not found');
};

export const handler = withErrorHandling(reportHandlerImpl);
