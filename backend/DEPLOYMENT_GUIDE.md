# NiyamAI Risk Checker - Deployment Guide

## Prerequisites

1. **AWS Account** with appropriate permissions
2. **AWS CLI** configured with credentials
3. **Node.js** (v20.x or later)
4. **Serverless Framework** installed globally:
   ```bash
   npm install -g serverless
   ```
5. **PostgreSQL Database** (RDS or local for development)

## Environment Setup

### 1. Configure Environment Variables

Create a `.env` file in the `backend` directory:

```bash
# Database Configuration
DB_HOST=your-rds-endpoint.rds.amazonaws.com
DB_NAME=niyamai
DB_USER=postgres
DB_PASSWORD=your-secure-password
DB_SSL=true

# VPC Configuration (for production)
VPC_ID=vpc-xxxxxxxx
PRIVATE_SUBNET_1=subnet-xxxxxxxx
PRIVATE_SUBNET_2=subnet-yyyyyyyy
PRIVATE_ROUTE_TABLE_ID=rtb-xxxxxxxx

# AI Service
AI_API_KEY=your-openai-or-claude-api-key

# AWS Region
AWS_REGION=us-east-1
```

### 2. Install Dependencies

```bash
cd backend
npm install
```

### 3. Initialize Database

Run the database schema:

```bash
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -f db/schema.sql
```

Or use the initialization script:

```bash
npm run db:init
```

## Deployment

### Development Deployment

Deploy to development stage:

```bash
serverless deploy --stage dev
```

This will:
1. Create CloudFormation stack
2. Deploy Lambda functions
3. Configure API Gateway
4. Set up Cognito User Pool
5. Create S3 buckets with encryption
6. Configure VPC and security groups
7. Set up VPC endpoints

### Production Deployment

Deploy to production stage:

```bash
serverless deploy --stage prod
```

### Deploy Individual Functions

To deploy a single function (faster for updates):

```bash
serverless deploy function --function auth --stage dev
serverless deploy function --function upload --stage dev
serverless deploy function --function analysis --stage dev
serverless deploy function --function report --stage dev
```

## Post-Deployment Configuration

### 1. Get API Gateway URL

After deployment, note the API Gateway URL from the output:

```
endpoints:
  POST - https://abc123xyz.execute-api.us-east-1.amazonaws.com/dev/auth/login
  POST - https://abc123xyz.execute-api.us-east-1.amazonaws.com/dev/auth/register
  ...
```

### 2. Get Cognito Configuration

Retrieve Cognito User Pool details:

```bash
serverless info --stage dev
```

Look for:
- `CognitoUserPoolId`
- `CognitoUserPoolClientId`

### 3. Update Frontend Configuration

Update the frontend `.env.local` file with the API Gateway URL and Cognito details:

```bash
NEXT_PUBLIC_API_URL=https://abc123xyz.execute-api.us-east-1.amazonaws.com/dev
NEXT_PUBLIC_COGNITO_USER_POOL_ID=us-east-1_xxxxxxxxx
NEXT_PUBLIC_COGNITO_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
NEXT_PUBLIC_AWS_REGION=us-east-1
```

## Testing the API

### Option 1: Using Postman

1. Import the Postman collection:
   - File: `backend/postman-collection.json`
   - Update the `base_url` variable with your API Gateway URL

2. Run the requests in order:
   - Register User
   - Login User (saves access token automatically)
   - Upload Contract
   - Process OCR
   - Analyze Contract
   - Get Dashboard
   - Generate Report

### Option 2: Using cURL

#### Register a User
```bash
curl -X POST https://your-api-url/dev/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPassword123!",
    "businessName": "Test Business"
  }'
```

#### Login
```bash
curl -X POST https://your-api-url/dev/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPassword123!"
  }'
```

Save the returned `token` for subsequent requests.

#### Upload Document
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

#### Get Dashboard
```bash
curl -X GET https://your-api-url/dev/dashboard \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Option 3: Using the Test Script

Run the automated test script:

```bash
cd backend
npm run test:api
```

This will test all endpoints in sequence and report results.

## Monitoring and Logs

### View Lambda Logs

```bash
serverless logs --function auth --stage dev --tail
serverless logs --function upload --stage dev --tail
serverless logs --function analysis --stage dev --tail
serverless logs --function report --stage dev --tail
```

### View API Gateway Logs

Check CloudWatch Logs:
- Log Group: `/aws/apigateway/niyamai-risk-checker-dev`

### Monitor Metrics

View metrics in AWS Console:
- API Gateway → Your API → Dashboard
- Lambda → Functions → Select function → Monitoring
- CloudWatch → Dashboards

## Troubleshooting

### Common Issues

#### 1. Lambda Timeout
**Symptom:** 504 Gateway Timeout
**Solution:** Increase timeout in `serverless.yml`:
```yaml
functions:
  analysis:
    timeout: 60  # Increase from 30 to 60 seconds
```

#### 2. VPC Configuration Issues
**Symptom:** Lambda cannot access external services
**Solution:** 
- Ensure NAT Gateway is configured in public subnet
- Verify VPC endpoints are created for S3, Textract, Cognito
- Check security group rules allow outbound HTTPS (port 443)

#### 3. Database Connection Errors
**Symptom:** "Connection refused" or "Timeout"
**Solution:**
- Verify RDS security group allows inbound from Lambda security group
- Check database credentials in environment variables
- Ensure Lambda is in same VPC as RDS

#### 4. Cognito Authorization Errors
**Symptom:** 401 Unauthorized on protected endpoints
**Solution:**
- Verify JWT token is valid and not expired
- Check Authorization header format: `Bearer {token}`
- Ensure Cognito User Pool ID matches in serverless.yml

#### 5. S3 Upload Errors
**Symptom:** "Access Denied" when uploading to S3
**Solution:**
- Verify Lambda IAM role has S3 permissions
- Check bucket policy allows Lambda to write
- Ensure encryption is enabled on upload

### Debug Mode

Enable verbose logging:

```bash
export SLS_DEBUG=*
serverless deploy --stage dev --verbose
```

## Cleanup

To remove all deployed resources:

```bash
serverless remove --stage dev
```

**Warning:** This will delete:
- All Lambda functions
- API Gateway
- S3 buckets (if empty)
- Cognito User Pool
- CloudWatch Logs
- VPC resources

## Security Checklist

Before production deployment:

- [ ] Change all default passwords
- [ ] Enable MFA for AWS account
- [ ] Review IAM roles and permissions (principle of least privilege)
- [ ] Enable CloudTrail for audit logging
- [ ] Configure AWS WAF for API Gateway
- [ ] Set up AWS Shield for DDoS protection
- [ ] Enable GuardDuty for threat detection
- [ ] Configure backup and disaster recovery
- [ ] Review and test security groups
- [ ] Enable encryption for all data at rest and in transit
- [ ] Set up monitoring and alerting
- [ ] Perform security audit and penetration testing

## Performance Optimization

### Lambda Optimization
- Use Lambda layers for shared dependencies
- Enable Lambda provisioned concurrency for critical functions
- Optimize cold start times by minimizing dependencies

### API Gateway Optimization
- Enable caching for GET requests
- Configure throttling limits appropriately
- Use API Gateway usage plans for rate limiting

### Database Optimization
- Create indexes on frequently queried columns
- Use connection pooling
- Consider read replicas for high read workloads

## Cost Optimization

### Monitor Costs
- Set up AWS Cost Explorer
- Create billing alerts
- Review CloudWatch metrics for unused resources

### Reduce Costs
- Use S3 lifecycle policies (already configured for 7-day deletion)
- Right-size Lambda memory allocation
- Use S3 Intelligent-Tiering for long-term storage
- Consider Reserved Capacity for RDS if usage is predictable

## Support

For issues or questions:
1. Check the API documentation: `backend/API_DOCUMENTATION.md`
2. Review CloudWatch logs for error details
3. Consult AWS documentation for service-specific issues
4. Contact the development team

## Next Steps

After successful deployment:
1. Deploy the frontend application
2. Configure custom domain name
3. Set up CI/CD pipeline
4. Implement monitoring and alerting
5. Perform load testing
6. Complete security audit
7. Document operational procedures
