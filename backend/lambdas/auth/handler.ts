import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import {
  CognitoIdentityProviderClient,
  SignUpCommand,
  InitiateAuthCommand,
  GetUserCommand,
  DeleteUserCommand,
  AuthFlowType,
} from '@aws-sdk/client-cognito-identity-provider';
import { S3Client, ListObjectsV2Command, DeleteObjectsCommand } from '@aws-sdk/client-s3';
import { Pool } from 'pg';
import {
  withErrorHandling,
  ValidationError,
  AuthenticationError,
  NotFoundError,
  ConflictError
} from '../../lib/error-handler';
import { logger } from '../../lib/logger';

const cognitoClient = new CognitoIdentityProviderClient({
  region: process.env.REGION || 'us-east-1',
});

const s3Client = new S3Client({
  region: process.env.REGION || 'us-east-1',
});

const DOCUMENTS_BUCKET = process.env.DOCUMENTS_BUCKET || 'niyamai-documents';

const pool = new Pool({
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  port: 5432,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

interface UserContext {
  userId: string;
  cognitoUserId: string;
  email: string;
  businessName?: string;
}

interface UserProfile {
  id: string;
  cognitoUserId: string;
  email: string;
  businessName?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Helper function to log errors
function logError(message: string, error: any, context?: any): void {
  logger.error(message, {
    error: error.message || error,
    stack: error.stack,
    ...context
  });
}

// Helper function to log info
function logInfo(message: string, context?: any): void {
  logger.info(message, context);
}

// Validate JWT token and get user context
async function validateToken(token: string): Promise<UserContext> {
  try {
    // Remove 'Bearer ' prefix if present
    const cleanToken = token.replace(/^Bearer\s+/i, '');

    const command = new GetUserCommand({
      AccessToken: cleanToken,
    });

    const response = await cognitoClient.send(command);

    const email = response.UserAttributes?.find(attr => attr.Name === 'email')?.Value;
    const cognitoUserId = response.Username;

    if (!email || !cognitoUserId) {
      throw new AuthenticationError('Invalid token: missing user attributes');
    }

    // Get user from database
    const dbResult = await pool.query(
      'SELECT id, cognito_user_id, email, business_name FROM users WHERE cognito_user_id = $1',
      [cognitoUserId]
    );

    if (dbResult.rows.length === 0) {
      throw new NotFoundError('User not found in database');
    }

    const user = dbResult.rows[0];

    return {
      userId: user.id,
      cognitoUserId: user.cognito_user_id,
      email: user.email,
      businessName: user.business_name,
    };
  } catch (error: any) {
    logError('Token validation failed', error, { token: token.substring(0, 20) + '...' });
    
    if (error instanceof AuthenticationError || error instanceof NotFoundError) {
      throw error;
    }
    
    throw new AuthenticationError('Invalid or expired token');
  }
}

// Get user profile by user ID
async function getUserContext(userId: string): Promise<UserProfile> {
  try {
    const result = await pool.query(
      'SELECT id, cognito_user_id, email, business_name, created_at, updated_at FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('User not found');
    }

    const user = result.rows[0];

    return {
      id: user.id,
      cognitoUserId: user.cognito_user_id,
      email: user.email,
      businessName: user.business_name,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
    };
  } catch (error: any) {
    logError('Failed to get user context', error, { userId });
    
    if (error instanceof NotFoundError) {
      throw error;
    }
    
    throw error;
  }
}

// Register a new user
async function registerUser(email: string, password: string, businessName?: string): Promise<any> {
  try {
    logInfo('Registering new user', { email });

    // Sign up user in Cognito
    const signUpCommand = new SignUpCommand({
      ClientId: process.env.COGNITO_CLIENT_ID!,
      Username: email,
      Password: password,
      UserAttributes: [
        {
          Name: 'email',
          Value: email,
        },
      ],
    });

    const signUpResponse = await cognitoClient.send(signUpCommand);
    const cognitoUserId = signUpResponse.UserSub!;

    logInfo('User registered in Cognito', { cognitoUserId, email });

    // Create user record in database
    const dbResult = await pool.query(
      `INSERT INTO users (cognito_user_id, email, business_name, created_at, updated_at)
       VALUES ($1, $2, $3, NOW(), NOW())
       RETURNING id, cognito_user_id, email, business_name, created_at, updated_at`,
      [cognitoUserId, email, businessName || null]
    );

    const user = dbResult.rows[0];

    logInfo('User created in database', { userId: user.id, email });

    return {
      id: user.id,
      cognitoUserId: user.cognito_user_id,
      email: user.email,
      businessName: user.business_name,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
    };
  } catch (error: any) {
    logError('User registration failed', error, { email });
    
    if (error.name === 'UsernameExistsException') {
      throw new ConflictError('User with this email already exists');
    }
    
    if (error.name === 'InvalidPasswordException') {
      throw new ValidationError('Password does not meet requirements');
    }
    
    throw error;
  }
}

// Login user
async function loginUser(email: string, password: string): Promise<any> {
  try {
    logInfo('User login attempt', { email });

    const authCommand = new InitiateAuthCommand({
      ClientId: process.env.COGNITO_CLIENT_ID!,
      AuthFlow: AuthFlowType.USER_PASSWORD_AUTH,
      AuthParameters: {
        USERNAME: email,
        PASSWORD: password,
      },
    });

    const authResponse = await cognitoClient.send(authCommand);

    if (!authResponse.AuthenticationResult) {
      throw new AuthenticationError('Authentication failed');
    }

    const { AccessToken, IdToken, RefreshToken, ExpiresIn } = authResponse.AuthenticationResult;

    logInfo('User logged in successfully', { email });

    // Calculate expiration time
    const expiresAt = new Date(Date.now() + (ExpiresIn! * 1000));

    return {
      token: AccessToken,
      idToken: IdToken,
      refreshToken: RefreshToken,
      expiresAt: expiresAt.toISOString(),
    };
  } catch (error: any) {
    logError('User login failed', error, { email });
    
    if (error.name === 'NotAuthorizedException' || error.name === 'UserNotFoundException') {
      throw new AuthenticationError('Invalid email or password');
    }
    
    if (error instanceof AuthenticationError) {
      throw error;
    }
    
    throw error;
  }
}

// Delete user account and all associated data
async function deleteAccount(userId: string, accessToken: string): Promise<void> {
  const client = await pool.connect();
  
  try {
    logInfo('Starting account deletion', { userId });
    
    // Start transaction
    await client.query('BEGIN');
    
    // Get all user documents from database to delete from S3
    const documentsResult = await client.query(
      'SELECT s3_key FROM documents WHERE user_id = $1',
      [userId]
    );
    
    logInfo('Found documents to delete', { userId, count: documentsResult.rows.length });
    
    // Delete all documents from S3
    if (documentsResult.rows.length > 0) {
      const s3Keys = documentsResult.rows.map(row => row.s3_key);
      
      // Delete objects in batches of 1000 (S3 limit)
      for (let i = 0; i < s3Keys.length; i += 1000) {
        const batch = s3Keys.slice(i, i + 1000);
        
        const deleteCommand = new DeleteObjectsCommand({
          Bucket: DOCUMENTS_BUCKET,
          Delete: {
            Objects: batch.map(key => ({ Key: key })),
            Quiet: true,
          },
        });
        
        await s3Client.send(deleteCommand);
        logInfo('Deleted S3 objects batch', { userId, batchSize: batch.length });
      }
    }
    
    // Delete user from database (cascade will delete all related records)
    const deleteResult = await client.query(
      'DELETE FROM users WHERE id = $1 RETURNING id',
      [userId]
    );
    
    if (deleteResult.rows.length === 0) {
      throw new NotFoundError('User not found');
    }
    
    logInfo('Deleted user from database', { userId });
    
    // Commit transaction
    await client.query('COMMIT');
    
    // Delete user from Cognito
    try {
      const deleteUserCommand = new DeleteUserCommand({
        AccessToken: accessToken,
      });
      
      await cognitoClient.send(deleteUserCommand);
      logInfo('Deleted user from Cognito', { userId });
    } catch (error: any) {
      // Log but don't fail if Cognito deletion fails (user data already deleted)
      logError('Failed to delete user from Cognito', error, { userId });
    }
    
    logInfo('Account deletion completed successfully', { userId });
  } catch (error: any) {
    // Rollback transaction on error
    await client.query('ROLLBACK');
    logError('Account deletion failed', error, { userId });
    throw error;
  } finally {
    client.release();
  }
}

const handlerImpl = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS',
  };

  const path = event.path;
  const method = event.httpMethod;

  // Parse request body
  const body = event.body ? JSON.parse(event.body) : {};

  // Route to appropriate handler
  if (path === '/auth/register' && method === 'POST') {
    const { email, password, businessName } = body;

    if (!email || !password) {
      throw new ValidationError('Email and password are required');
    }

    if (password.length < 8) {
      throw new ValidationError('Password must be at least 8 characters long');
    }

    const user = await registerUser(email, password, businessName);

    return {
      statusCode: 201,
      headers,
      body: JSON.stringify(user),
    };
  }

  if (path === '/auth/login' && method === 'POST') {
    const { email, password } = body;

    if (!email || !password) {
      throw new ValidationError('Email and password are required');
    }

    const authResult = await loginUser(email, password);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(authResult),
    };
  }

  if (path === '/auth/account' && method === 'DELETE') {
    // Extract token from Authorization header
    const authHeader = event.headers.Authorization || event.headers.authorization;
    
    if (!authHeader) {
      throw new AuthenticationError('Authorization header required');
    }
    
    const token = authHeader.replace(/^Bearer\s+/i, '');
    
    // Validate token and get user context
    const userContext = await validateToken(token);
    
    // Delete account
    await deleteAccount(userContext.userId, token);
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ message: 'Account deleted successfully' }),
    };
  }

  // Invalid route
  throw new NotFoundError('Not found');
};

export const handler = withErrorHandling(handlerImpl);

// Export helper functions for testing
export { validateToken, getUserContext, registerUser, loginUser, deleteAccount };
