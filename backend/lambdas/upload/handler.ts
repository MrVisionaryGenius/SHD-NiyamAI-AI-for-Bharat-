import { APIGatewayProxyEvent, APIGatewayProxyResult, S3Event } from 'aws-lambda';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { query } from '../../lib/db';
import { extractTextFromS3Document } from '../../lib/textract';
import {
  withErrorHandling,
  ValidationError,
  PayloadTooLargeError,
  NotFoundError,
  callWithRetry
} from '../../lib/error-handler';
import { logger } from '../../lib/logger';

const s3Client = new S3Client({ region: process.env.REGION || 'us-east-1' });
const DOCUMENTS_BUCKET = process.env.DOCUMENTS_BUCKET!;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB in bytes

// Allowed file types
const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png'
];

const ALLOWED_EXTENSIONS = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png'];

interface UploadRequest {
  filename: string;
  fileSize: number;
  contentType: string;
  documentType: 'contract' | 'invoice';
}

/**
 * Validates file type based on content type and extension
 */
function validateFileType(filename: string, contentType: string): boolean {
  const extension = filename.toLowerCase().substring(filename.lastIndexOf('.'));
  return ALLOWED_FILE_TYPES.includes(contentType) && ALLOWED_EXTENSIONS.includes(extension);
}

/**
 * Validates file size
 */
function validateFileSize(fileSize: number): boolean {
  return fileSize > 0 && fileSize <= MAX_FILE_SIZE;
}

/**
 * Extracts user ID from Cognito authorizer context
 */
function getUserId(event: APIGatewayProxyEvent): string {
  const userId = event.requestContext.authorizer?.claims?.sub;
  if (!userId) {
    throw new ValidationError('User ID not found in authorization context');
  }
  return userId;
}

/**
 * Ensures user exists in database, creates if not
 */
async function ensureUserExists(cognitoUserId: string, email: string): Promise<string> {
  // Check if user exists
  const userResult = await query(
    'SELECT id FROM users WHERE cognito_user_id = $1',
    [cognitoUserId]
  );

  if (userResult.rows.length > 0) {
    return userResult.rows[0].id;
  }

  // Create user if doesn't exist
  const insertResult = await query(
    'INSERT INTO users (cognito_user_id, email) VALUES ($1, $2) RETURNING id',
    [cognitoUserId, email]
  );

  return insertResult.rows[0].id;
}

/**
 * Generates pre-signed URL for S3 upload
 */
async function generatePresignedUploadUrl(
  s3Key: string,
  contentType: string
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: DOCUMENTS_BUCKET,
    Key: s3Key,
    ContentType: contentType,
    ServerSideEncryption: 'AES256'
  });

  const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 }); // 5 minutes
  return presignedUrl;
}

/**
 * Stores document metadata in database
 */
async function storeDocumentMetadata(
  userId: string,
  s3Key: string,
  filename: string,
  documentType: string,
  fileSize: number
): Promise<string> {
  const uploadDate = new Date();
  const deletionDate = new Date(uploadDate.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days later

  const result = await query(
    `INSERT INTO documents (user_id, s3_key, filename, document_type, file_size, upload_date, deletion_date, ocr_status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id`,
    [userId, s3Key, filename, documentType, fileSize, uploadDate, deletionDate, 'pending']
  );

  return result.rows[0].id;
}

/**
 * Main handler for document upload
 */
const uploadHandlerImpl = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  // Parse request body
  if (!event.body) {
    throw new ValidationError('Request body is required');
  }

  const uploadRequest: UploadRequest = JSON.parse(event.body);
  const { filename, fileSize, contentType, documentType } = uploadRequest;

  // Validate required fields
  if (!filename || !fileSize || !contentType || !documentType) {
    throw new ValidationError('Missing required fields: filename, fileSize, contentType, documentType');
  }

  // Validate document type
  if (documentType !== 'contract' && documentType !== 'invoice') {
    throw new ValidationError('Invalid document type. Must be "contract" or "invoice"');
  }

  // Validate file type
  if (!validateFileType(filename, contentType)) {
    throw new ValidationError('File type not supported. Please upload PDF, DOC, DOCX, JPG, or PNG');
  }

  // Validate file size
  if (!validateFileSize(fileSize)) {
    throw new PayloadTooLargeError('File exceeds 10MB limit');
  }

  // Get user ID from Cognito
  const cognitoUserId = getUserId(event);
  const email = event.requestContext.authorizer?.claims?.email || '';

  // Ensure user exists in database
  const userId = await ensureUserExists(cognitoUserId, email);

  // Generate S3 key
  const timestamp = Date.now();
  const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
  const s3Key = `${userId}/${timestamp}-${sanitizedFilename}`;

  // Generate pre-signed URL for upload
  const uploadUrl = await generatePresignedUploadUrl(s3Key, contentType);

  // Store document metadata in database
  const documentId = await storeDocumentMetadata(
    userId,
    s3Key,
    filename,
    documentType,
    fileSize
  );

  logger.info('Document upload initiated', { documentId, userId, filename, fileSize });

  return {
    statusCode: 200,
    headers: { 
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    },
    body: JSON.stringify({
      documentId,
      uploadUrl,
      s3Key,
      expiresIn: 300 // 5 minutes
    })
  };
};

export const handler = withErrorHandling(uploadHandlerImpl);

/**
 * Updates document OCR status in database
 */
async function updateDocumentOCRStatus(
  documentId: string,
  status: 'pending' | 'processing' | 'completed' | 'failed',
  extractedText?: string
): Promise<void> {
  if (extractedText !== undefined) {
    await query(
      'UPDATE documents SET ocr_status = $1, extracted_text = $2 WHERE id = $3',
      [status, extractedText, documentId]
    );
  } else {
    await query(
      'UPDATE documents SET ocr_status = $1 WHERE id = $2',
      [status, documentId]
    );
  }
}

/**
 * Retrieves document metadata from database
 */
async function getDocumentMetadata(documentId: string): Promise<any> {
  const result = await query(
    'SELECT * FROM documents WHERE id = $1',
    [documentId]
  );

  if (result.rows.length === 0) {
    throw new NotFoundError(`Document not found: ${documentId}`);
  }

  return result.rows[0];
}

/**
 * Handler for OCR processing triggered after S3 upload
 * This can be invoked via API Gateway or S3 event trigger
 */
export const processOCR = async (
  event: APIGatewayProxyEvent | S3Event
): Promise<APIGatewayProxyResult | void> => {
  try {
    let documentId: string;
    let s3Bucket: string;
    let s3Key: string;

    // Handle API Gateway event (manual trigger)
    if ('body' in event && event.body) {
      const body = JSON.parse(event.body);
      documentId = body.documentId;

      if (!documentId) {
        throw new ValidationError('documentId is required');
      }

      // Retrieve document metadata
      const document = await getDocumentMetadata(documentId);
      s3Bucket = DOCUMENTS_BUCKET;
      s3Key = document.s3_key;

    } 
    // Handle S3 event (automatic trigger)
    else if ('Records' in event) {
      const s3Event = event as S3Event;
      const record = s3Event.Records[0];
      s3Bucket = record.s3.bucket.name;
      s3Key = decodeURIComponent(record.s3.object.key.replace(/\+/g, ' '));

      // Find document by S3 key
      const result = await query(
        'SELECT id FROM documents WHERE s3_key = $1',
        [s3Key]
      );

      if (result.rows.length === 0) {
        logger.error('Document not found for S3 key', { s3Key });
        return;
      }

      documentId = result.rows[0].id;
    } else {
      throw new ValidationError('Invalid event type');
    }

    logger.info('Starting OCR processing', { documentId, s3Key });

    // Update status to processing
    await updateDocumentOCRStatus(documentId, 'processing');

    // Extract text using Textract with retry logic
    const extractedText = await callWithRetry(
      () => extractTextFromS3Document(s3Bucket, s3Key),
      3,
      1000,
      'Textract OCR'
    );

    if (!extractedText || extractedText.trim().length === 0) {
      logger.warn('No text extracted from document', { documentId, s3Key });
      await updateDocumentOCRStatus(documentId, 'failed');

      if ('body' in event) {
        throw new ValidationError('Unable to extract text from document. Please ensure it\'s not password-protected or corrupted');
      }
      return;
    }

    // Store extracted text and update status to completed
    await updateDocumentOCRStatus(documentId, 'completed', extractedText);

    logger.info('OCR processing completed', { 
      documentId, 
      s3Key, 
      textLength: extractedText.length 
    });

    // Return success response for API Gateway events
    if ('body' in event) {
      return {
        statusCode: 200,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          documentId,
          ocrStatus: 'completed',
          textLength: extractedText.length
        })
      };
    }

  } catch (error) {
    logger.error('OCR processing error', { 
      error: (error as Error).message,
      stack: (error as Error).stack
    });

    // Try to update document status to failed
    try {
      if ('body' in event && event.body) {
        const body = JSON.parse(event.body);
        if (body.documentId) {
          await updateDocumentOCRStatus(body.documentId, 'failed');
        }
      }
    } catch (updateError) {
      logger.error('Failed to update document status', { error: updateError });
    }

    // Return error response for API Gateway events
    if ('body' in event) {
      if (error instanceof ValidationError) {
        return {
          statusCode: 400,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          body: JSON.stringify({ error: (error as Error).message })
        };
      }

      return {
        statusCode: 500,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ 
          error: 'Text extraction failed, please re-upload document' 
        })
      };
    }
  }
};
