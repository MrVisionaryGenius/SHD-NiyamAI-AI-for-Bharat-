# API Testing Guide

This guide explains how to test the NiyamAI Risk Checker API endpoints.

## Prerequisites

- API Gateway deployed and accessible
- Valid AWS credentials configured
- Postman (optional) or cURL installed

## Testing Methods

### Method 1: Automated Test Script

The easiest way to test all endpoints is using the provided test script.

#### Setup

1. Make the script executable:
   ```bash
   chmod +x test-api.sh
   ```

2. Set your API URL:
   ```bash
   export API_URL="https://your-api-id.execute-api.us-east-1.amazonaws.com/dev"
   ```

3. Run the tests:
   ```bash
   ./test-api.sh
   ```

The script will:
- Register a new test user
- Login and obtain access token
- Upload contract and invoice documents
- Complete security questionnaire
- Retrieve dashboard data
- Generate a PDF report
- Test error handling
- Clean up by deleting the test account

#### Expected Output

```
=== NiyamAI Risk Checker API Test ===
API URL: https://...
Test Email: test-1234567890@example.com

Test 1: Register User
✓ User registration successful
User ID: abc123...

Test 2: Login User
✓ User login successful
Access Token: eyJhbGc...

...

=== All Tests Completed ===
API Gateway is properly configured and all endpoints are working!
```

### Method 2: Postman Collection

#### Import Collection

1. Open Postman
2. Click "Import" → "File"
3. Select `backend/postman-collection.json`
4. The collection will be imported with all endpoints

#### Configure Variables

1. Click on the collection name
2. Go to "Variables" tab
3. Update `base_url` with your API Gateway URL:
   ```
   https://your-api-id.execute-api.us-east-1.amazonaws.com/dev
   ```

#### Run Tests

Execute requests in this order:

1. **Authentication → Register User**
   - Creates a new user account
   - Returns user ID

2. **Authentication → Login User**
   - Logs in with credentials
   - Automatically saves access token to collection variable

3. **Document Upload → Upload Contract**
   - Initiates contract upload
   - Returns pre-signed S3 URL
   - Saves document ID

4. **Document Upload → Upload Invoice**
   - Initiates invoice upload
   - Saves invoice document ID

5. **Document Upload → Process OCR** (optional)
   - Manually triggers OCR processing
   - Usually triggered automatically by S3 event

6. **Analysis → Analyze Contract**
   - Analyzes uploaded contract
   - Returns risks and recommendations
   - Saves assessment ID

7. **Analysis → Analyze Invoice**
   - Checks GST compliance
   - Returns warnings and recommendations

8. **Analysis → Security Questionnaire**
   - Submits security responses
   - Returns security assessment

9. **Dashboard & Reports → Get Dashboard**
   - Retrieves all assessments
   - Shows overall risk score

10. **Dashboard & Reports → Generate Report**
    - Creates PDF report
    - Returns download URL

11. **Authentication → Delete Account** (cleanup)
    - Deletes test account and all data

### Method 3: Manual cURL Testing

#### 1. Register User

```bash
curl -X POST https://your-api-url/dev/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPassword123!",
    "businessName": "Test Business"
  }'
```

Expected response:
```json
{
  "id": "uuid",
  "cognitoUserId": "...",
  "email": "test@example.com",
  "businessName": "Test Business",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

#### 2. Login

```bash
curl -X POST https://your-api-url/dev/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPassword123!"
  }'
```

Expected response:
```json
{
  "token": "eyJhbGc...",
  "idToken": "eyJhbGc...",
  "refreshToken": "eyJhbGc...",
  "expiresAt": "2024-01-01T01:00:00.000Z"
}
```

Save the `token` value for subsequent requests.

#### 3. Upload Document

```bash
curl -X POST https://your-api-url/dev/documents/upload \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "filename": "contract.pdf",
    "fileSize": 102400,
    "contentType": "application/pdf",
    "documentType": "contract"
  }'
```

Expected response:
```json
{
  "documentId": "uuid",
  "uploadUrl": "https://s3.amazonaws.com/...",
  "s3Key": "user-id/timestamp-contract.pdf",
  "expiresIn": 300
}
```

#### 4. Security Questionnaire

```bash
curl -X POST https://your-api-url/dev/analyze/security \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "responses": [
      {"questionId": "pwd_policy", "response": "manager"},
      {"questionId": "mfa_usage", "response": "all"},
      {"questionId": "device_security", "response": "all"},
      {"questionId": "software_updates", "response": "auto"},
      {"questionId": "data_backup", "response": "auto_cloud"},
      {"questionId": "data_sharing", "response": "secure"},
      {"questionId": "access_control", "response": "managed"},
      {"questionId": "wifi_security", "response": "secure"}
    ]
  }'
```

#### 5. Get Dashboard

```bash
curl -X GET https://your-api-url/dev/dashboard \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

#### 6. Generate Report

```bash
curl -X POST https://your-api-url/dev/reports/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "assessmentIds": ["assessment-uuid-1", "assessment-uuid-2"]
  }'
```

## Testing Checklist

Use this checklist to verify all functionality:

### Authentication
- [ ] User can register with valid email and password
- [ ] Registration fails with weak password
- [ ] Registration fails with duplicate email
- [ ] User can login with valid credentials
- [ ] Login fails with invalid credentials
- [ ] User can delete their account
- [ ] Deleted account cannot login

### Document Upload
- [ ] User can upload PDF documents
- [ ] User can upload Word documents
- [ ] User can upload image documents (JPG, PNG)
- [ ] Upload fails for unsupported file types
- [ ] Upload fails for files > 10MB
- [ ] Pre-signed URL is generated correctly
- [ ] Document metadata is stored in database

### OCR Processing
- [ ] OCR is triggered automatically after S3 upload
- [ ] OCR can be triggered manually via API
- [ ] Extracted text is stored in database
- [ ] OCR status is updated correctly
- [ ] OCR handles multi-page documents

### Contract Analysis
- [ ] Contract analysis identifies risks
- [ ] Risk score is calculated correctly (0-100)
- [ ] Severity mapping is correct (low/medium/high)
- [ ] Recommendations are generated
- [ ] Results are stored in database
- [ ] User can only analyze their own documents

### Invoice Analysis
- [ ] Invoice analysis checks GST compliance
- [ ] Missing fields are identified
- [ ] Warnings are generated
- [ ] Recommendations are provided
- [ ] Results are stored in database

### Security Questionnaire
- [ ] All 8 questions can be answered
- [ ] Security score is calculated correctly
- [ ] Recommendations are generated for weak areas
- [ ] Recommendations are prioritized by severity
- [ ] Results are stored in database

### Dashboard
- [ ] Dashboard shows all user assessments
- [ ] Overall risk score is calculated
- [ ] Action items are prioritized
- [ ] Document count is accurate
- [ ] User can only see their own data

### Report Generation
- [ ] PDF report is generated
- [ ] Report includes all selected assessments
- [ ] Report includes business name and date
- [ ] Download URL is valid
- [ ] URL expires after 1 hour

### Error Handling
- [ ] Invalid requests return 400 Bad Request
- [ ] Unauthorized requests return 401 Unauthorized
- [ ] Forbidden access returns 403 Forbidden
- [ ] Missing resources return 404 Not Found
- [ ] Large files return 413 Payload Too Large
- [ ] Server errors return 500 Internal Server Error
- [ ] Error messages are descriptive

### Security
- [ ] All endpoints enforce HTTPS
- [ ] Protected endpoints require authentication
- [ ] JWT tokens expire after 1 hour
- [ ] Users cannot access other users' data
- [ ] Documents are encrypted at rest
- [ ] Data in transit is encrypted
- [ ] CORS is configured correctly

### Performance
- [ ] Document upload acknowledged within 2 seconds
- [ ] Dashboard loads within 3 seconds
- [ ] Report generation completes within 30 seconds
- [ ] API handles concurrent requests

## Troubleshooting

### Common Issues

#### 401 Unauthorized
- Check that Authorization header is present
- Verify token format: `Bearer {token}`
- Ensure token hasn't expired (1 hour validity)
- Try logging in again to get a fresh token

#### 403 Forbidden
- Verify you're accessing your own resources
- Check document ownership
- Ensure user ID matches in database

#### 404 Not Found
- Verify the resource ID is correct
- Check that the resource exists in database
- Ensure you're using the correct endpoint path

#### 500 Internal Server Error
- Check CloudWatch logs for Lambda function
- Verify database connection
- Check external service availability (Textract, AI API)
- Review error stack trace in logs

#### CORS Errors
- Verify CORS is configured in serverless.yml
- Check that frontend origin is allowed
- Ensure preflight OPTIONS requests are handled

### Debugging Tips

1. **Enable verbose logging:**
   ```bash
   export SLS_DEBUG=*
   ```

2. **Check Lambda logs:**
   ```bash
   serverless logs --function auth --tail
   ```

3. **View API Gateway logs:**
   - Go to CloudWatch → Log Groups
   - Find `/aws/apigateway/niyamai-risk-checker-{stage}`

4. **Test with verbose cURL:**
   ```bash
   curl -v -X POST https://your-api-url/dev/auth/login ...
   ```

5. **Validate JSON:**
   - Use a JSON validator to check request body
   - Ensure all required fields are present
   - Check data types match schema

## Next Steps

After successful testing:
1. Document any issues found
2. Update API documentation if needed
3. Perform load testing
4. Test with real documents
5. Verify data cleanup (7-day deletion)
6. Test account deletion cascade
7. Perform security audit
