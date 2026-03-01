import { APIGatewayProxyResult } from 'aws-lambda';
import { logger } from './logger';

/**
 * Custom error classes for specific error types
 */
export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class AuthorizationError extends Error {
  constructor(message: string = 'Access denied') {
    super(message);
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class AuthenticationError extends Error {
  constructor(message: string = 'Authentication required') {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class ConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConflictError';
  }
}

export class PayloadTooLargeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PayloadTooLargeError';
  }
}

export class ServiceUnavailableError extends Error {
  constructor(message: string = 'Service temporarily unavailable, please try again later') {
    super(message);
    this.name = 'ServiceUnavailableError';
  }
}

/**
 * Error context for logging
 */
interface ErrorContext {
  userId?: string;
  documentId?: string;
  assessmentId?: string;
  path?: string;
  method?: string;
  [key: string]: any;
}

/**
 * Maps error types to HTTP status codes and user-friendly messages
 */
function getErrorResponse(error: Error, context?: ErrorContext): { statusCode: number; message: string } {
  // Log error with context
  logger.error('Request failed', {
    error: error.message,
    errorName: error.name,
    stack: error.stack,
    timestamp: new Date().toISOString(),
    ...context
  });

  // Map error to appropriate status code and message
  if (error instanceof ValidationError) {
    return {
      statusCode: 400,
      message: error.message
    };
  }

  if (error instanceof AuthenticationError) {
    return {
      statusCode: 401,
      message: error.message
    };
  }

  if (error instanceof AuthorizationError) {
    return {
      statusCode: 403,
      message: error.message
    };
  }

  if (error instanceof NotFoundError) {
    return {
      statusCode: 404,
      message: error.message
    };
  }

  if (error instanceof ConflictError) {
    return {
      statusCode: 409,
      message: error.message
    };
  }

  if (error instanceof PayloadTooLargeError) {
    return {
      statusCode: 413,
      message: error.message
    };
  }

  if (error instanceof ServiceUnavailableError) {
    return {
      statusCode: 503,
      message: error.message
    };
  }

  // Handle AWS SDK errors
  if (error.name === 'UsernameExistsException') {
    return {
      statusCode: 409,
      message: 'User with this email already exists'
    };
  }

  if (error.name === 'NotAuthorizedException' || error.name === 'UserNotFoundException') {
    return {
      statusCode: 401,
      message: 'Invalid email or password'
    };
  }

  if (error.name === 'InvalidPasswordException') {
    return {
      statusCode: 400,
      message: 'Password does not meet requirements'
    };
  }

  // Handle JSON parsing errors
  if (error instanceof SyntaxError && error.message.includes('JSON')) {
    return {
      statusCode: 400,
      message: 'Invalid JSON in request body'
    };
  }

  // Handle database errors
  if (error.message.includes('duplicate key') || error.message.includes('unique constraint')) {
    return {
      statusCode: 409,
      message: 'Resource already exists'
    };
  }

  if (error.message.includes('foreign key constraint')) {
    return {
      statusCode: 400,
      message: 'Invalid reference to related resource'
    };
  }

  // Default to internal server error
  return {
    statusCode: 500,
    message: 'Internal server error'
  };
}

/**
 * Wraps Lambda handler with comprehensive error handling
 * Returns appropriate HTTP status codes and user-friendly error messages
 */
export function withErrorHandling(
  handler: (event: any, context?: ErrorContext) => Promise<APIGatewayProxyResult>
): (event: any) => Promise<APIGatewayProxyResult> {
  return async (event: any): Promise<APIGatewayProxyResult> => {
    const headers = {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
    };

    try {
      // Handle OPTIONS for CORS
      if (event.httpMethod === 'OPTIONS') {
        return {
          statusCode: 200,
          headers,
          body: ''
        };
      }

      // Extract context for error logging
      const errorContext: ErrorContext = {
        path: event.path,
        method: event.httpMethod,
        userId: event.requestContext?.authorizer?.userId || event.requestContext?.authorizer?.claims?.sub
      };

      // Call the actual handler
      return await handler(event, errorContext);

    } catch (error) {
      // Extract context for error logging
      const errorContext: ErrorContext = {
        path: event.path,
        method: event.httpMethod,
        userId: event.requestContext?.authorizer?.userId || event.requestContext?.authorizer?.claims?.sub
      };

      // Get appropriate error response
      const { statusCode, message } = getErrorResponse(error as Error, errorContext);

      return {
        statusCode,
        headers,
        body: JSON.stringify({ error: message })
      };
    }
  };
}

/**
 * Retry logic with exponential backoff
 * Used for external service calls (AI API, Textract, etc.)
 */
export async function callWithRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000,
  operationName: string = 'operation'
): Promise<T> {
  let lastError: Error;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;

      if (attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt);
        logger.warn(`${operationName} attempt ${attempt + 1} failed, retrying in ${delay}ms`, {
          error: lastError.message,
          attempt: attempt + 1,
          maxRetries: maxRetries + 1
        });
        await sleep(delay);
      }
    }
  }

  logger.error(`All ${maxRetries + 1} attempts failed for ${operationName}`, {
    error: lastError!.message,
    stack: lastError!.stack
  });

  throw new ServiceUnavailableError(`${operationName} failed after ${maxRetries + 1} attempts`);
}

/**
 * Sleep utility for retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
