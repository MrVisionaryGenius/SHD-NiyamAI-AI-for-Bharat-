# NiyamAI Risk Checker API Documentation

## Base URL
```
https://{api-id}.execute-api.{region}.amazonaws.com/{stage}
```

## Authentication

Most endpoints require authentication using AWS Cognito JWT tokens. Include the token in the Authorization header:

```
Authorization: Bearer {access_token}
```

## Endpoints

### Authentication Endpoints

#### POST /auth/register
Register a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "businessName": "My Business" // optional
}
```

**Response (201 Created):**
```json
{
  "id": "uuid",
  "cognitoUserId": "cognito-user-id",
  "email": "user@example.com",
  "businessName": "My Business",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

**Error Responses:**
- 400: Validation error (missing fields, weak password)
- 409: User already exists

---

#### POST /auth/login
Login with email and password.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

**Response (200 OK):**
```json
{
  "token": "access-token",
  "idToken": "id-token",
  "refreshToken": "refresh-token",
  "expiresAt": "2024-01-01T01:00:00.000Z"
}
```

**Error Responses:**
- 400: Validation error (missing fields)
- 401: Invalid credentials

---

#### DELETE /auth/account
Delete user account and all associated data.

**Headers:**
```
Authorization: Bearer {access_token}
```

**Response (200 OK):**
```json
{
  "message": "Account deleted successfully"
}
```

**Error Responses:**
- 401: Unauthorized (missing or invalid token)
- 404: User not found

---

### Document Upload Endpoints

#### POST /documents/upload
Initiate document upload and get pre-signed S3 URL.

**Headers:**
```
Authorization: Bearer {access_token}
```

**Request Body:**
```json
{
  "filename": "contract.pdf",
  "fileSize": 1048576,
  "contentType": "application/pdf",
  "documentType": "contract"
}
```

**Response (200 OK):**
```json
{
  "documentId": "uuid",
  "uploadUrl": "https://s3.amazonaws.com/...",
  "s3Key": "user-id/timestamp-filename.pdf",
  "expiresIn": 300
}
```

**Error Responses:**
- 400: Invalid file type or size
- 401: Unauthorized
- 413: File too large (>10MB)

**Supported File Types:**
- PDF: `application/pdf`
- Word: `application/msword`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
- Images: `image/jpeg`, `image/png`

**Document Types:**
- `contract`: Legal contracts
- `invoice`: GST invoices

---

#### POST /documents/process-ocr
Manually trigger OCR processing for a document.

**Headers:**
```
Authorization: Bearer {access_token}
```

**Request Body:**
```json
{
  "documentId": "uuid"
}
```

**Response (200 OK):**
```json
{
  "documentId": "uuid",
  "ocrStatus": "completed",
  "textLength": 5000
}
```

**Error Responses:**
- 400: Invalid document ID or corrupted document
- 401: Unauthorized
- 404: Document not found
- 500: OCR processing failed

---

### Analysis Endpoints

#### POST /analyze/contract
Analyze a contract document for legal risks.

**Headers:**
```
Authorization: Bearer {access_token}
```

**Request Body:**
```json
{
  "documentId": "uuid"
}
```

**Response (200 OK):**
```json
{
  "assessmentId": "uuid",
  "riskScore": 75,
  "severity": "high",
  "risks": [
    {
      "id": "uuid",
      "category": "liability",
      "severity": "high",
      "description": "Unlimited liability clause found",
      "location": "Section 5.2"
    }
  ],
  "recommendations": [
    {
      "id": "uuid",
      "issue": "Unlimited liability",
      "suggestion": "Negotiate a liability cap",
      "priority": 1
    }
  ]
}
```

**Error Responses:**
- 400: Invalid document ID or text not extracted
- 401: Unauthorized
- 403: Access denied (document belongs to another user)
- 404: Document not found

---

#### POST /analyze/invoice
Analyze an invoice for GST compliance.

**Headers:**
```
Authorization: Bearer {access_token}
```

**Request Body:**
```json
{
  "documentId": "uuid"
}
```

**Response (200 OK):**
```json
{
  "assessmentId": "uuid",
  "riskScore": 45,
  "severity": "medium",
  "warnings": [
    {
      "id": "uuid",
      "category": "GSTIN",
      "severity": "high",
      "description": "GSTIN number is missing",
      "location": null
    }
  ],
  "recommendations": [
    {
      "id": "uuid",
      "issue": "Missing GSTIN",
      "suggestion": "Add valid GSTIN number to invoice header",
      "priority": 1
    }
  ]
}
```

**Error Responses:**
- 400: Invalid document ID or text not extracted
- 401: Unauthorized
- 403: Access denied
- 404: Document not found

---

#### POST /analyze/security
Evaluate security questionnaire responses.

**Headers:**
```
Authorization: Bearer {access_token}
```

**Request Body:**
```json
{
  "responses": [
    {
      "questionId": "pwd_policy",
      "response": "manager"
    },
    {
      "questionId": "mfa_usage",
      "response": "all"
    }
  ]
}
```

**Response (200 OK):**
```json
{
  "assessmentId": "uuid",
  "riskScore": 85,
  "severity": "low",
  "recommendations": [
    {
      "id": "uuid",
      "issue": "Outdated software and systems",
      "suggestion": "Enable automatic updates for operating systems and applications",
      "priority": 1
    }
  ]
}
```

**Error Responses:**
- 400: Invalid question ID or response
- 401: Unauthorized

---

### Dashboard and Report Endpoints

#### GET /dashboard
Get dashboard data with all assessments and action items.

**Headers:**
```
Authorization: Bearer {access_token}
```

**Response (200 OK):**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "businessName": "My Business"
  },
  "recentAssessments": [
    {
      "id": "uuid",
      "userId": "uuid",
      "documentId": "uuid",
      "assessmentType": "contract",
      "riskScore": 75,
      "severity": "high",
      "status": "completed",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "risks": [...],
      "recommendations": [...]
    }
  ],
  "overallRiskScore": 65,
  "actionItems": [
    {
      "id": "uuid",
      "assessmentId": "uuid",
      "issue": "Unlimited liability",
      "suggestion": "Negotiate a liability cap",
      "priority": 1,
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "documentCount": 5
}
```

**Error Responses:**
- 401: Unauthorized

---

#### POST /reports/generate
Generate PDF report for selected assessments.

**Headers:**
```
Authorization: Bearer {access_token}
```

**Request Body:**
```json
{
  "assessmentIds": ["uuid1", "uuid2", "uuid3"]
}
```

**Response (200 OK):**
```json
{
  "url": "https://s3.amazonaws.com/...",
  "expiresAt": "2024-01-01T01:00:00.000Z"
}
```

**Error Responses:**
- 400: Invalid or missing assessment IDs
- 401: Unauthorized
- 404: Assessment not found

---

## Error Response Format

All error responses follow this format:

```json
{
  "error": "Error message describing what went wrong"
}
```

## HTTP Status Codes

- **200 OK**: Request successful
- **201 Created**: Resource created successfully
- **400 Bad Request**: Invalid request data
- **401 Unauthorized**: Missing or invalid authentication
- **403 Forbidden**: Access denied
- **404 Not Found**: Resource not found
- **409 Conflict**: Resource already exists
- **413 Payload Too Large**: File size exceeds limit
- **500 Internal Server Error**: Server error

## Rate Limiting

API Gateway is configured with the following throttling limits:
- Burst limit: 5000 requests
- Rate limit: 10000 requests per second

## CORS

All endpoints support CORS with the following configuration:
- Allowed origins: `*`
- Allowed headers: `Content-Type`, `Authorization`
- Allowed methods: `GET`, `POST`, `DELETE`, `OPTIONS`

## Security

- All endpoints enforce HTTPS
- Protected endpoints require valid Cognito JWT tokens
- Documents are encrypted at rest (AES256)
- Data in transit is encrypted (TLS 1.2+)
- Lambda functions run in private subnets
- Database is not publicly accessible
