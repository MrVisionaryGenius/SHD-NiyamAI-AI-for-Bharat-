# AWS Services and APIs Required

This document lists all AWS services and APIs needed to run the NiyamAI Risk Checker application.

## Core AWS Services

### 1. AWS Lambda
**Purpose:** Serverless compute for backend functions

**Functions Required:**
- Auth Lambda (authentication and user management)
- Upload Lambda (document upload and OCR processing)
- Analysis Lambda (risk analysis)
- Report Lambda (dashboard and PDF generation)

**API Actions Needed:**
- `lambda:InvokeFunction`
- `lambda:CreateFunction`
- `lambda:UpdateFunctionCode`
- `lambda:UpdateFunctionConfiguration`
- `lambda:GetFunction`
- `lambda:DeleteFunction`

**Pricing:**
- Free tier: 1M requests/month + 400,000 GB-seconds compute
- After free tier: $0.20 per 1M requests + $0.0000166667 per GB-second

---

### 2. Amazon API Gateway
**Purpose:** REST API endpoints for frontend-backend communication

**Features Used:**
- REST API
- Cognito Authorizer
- Request validation
- CORS configuration
- Throttling and rate limiting
- CloudWatch logging

**API Actions Needed:**
- `apigateway:POST` (create API)
- `apigateway:GET` (read API configuration)
- `apigateway:PUT` (update API)
- `apigateway:DELETE` (delete API)
- `execute-api:Invoke` (invoke API endpoints)

**Pricing:**
- Free tier: 1M API calls/month for 12 months
- After free tier: $3.50 per million API calls

---

### 3. Amazon Cognito
**Purpose:** User authentication and authorization

**Features Used:**
- User Pool for user management
- JWT token generation and validation
- Email/password authentication
- User attributes (email, business_name)
- Password policies

**API Actions Needed:**
- `cognito-idp:SignUp`
- `cognito-idp:InitiateAuth`
- `cognito-idp:GetUser`
- `cognito-idp:AdminGetUser`
- `cognito-idp:AdminInitiateAuth`
- `cognito-idp:DeleteUser`
- `cognito-idp:CreateUserPool`
- `cognito-idp:CreateUserPoolClient`

**Pricing:**
- Free tier: 50,000 MAUs (Monthly Active Users)
- After free tier: $0.0055 per MAU

---

### 4. Amazon S3
**Purpose:** Document storage with encryption and lifecycle policies

**Features Used:**
- Object storage for uploaded documents
- Server-side encryption (AES256)
- Lifecycle policies (7-day auto-deletion)
- Pre-signed URLs for secure uploads
- Versioning
- Access logging
- CORS configuration

**API Actions Needed:**
- `s3:CreateBucket`
- `s3:PutObject`
- `s3:GetObject`
- `s3:DeleteObject`
- `s3:ListBucket`
- `s3:PutBucketEncryption`
- `s3:PutBucketLifecycleConfiguration`
- `s3:PutBucketVersioning`
- `s3:PutBucketCors`
- `s3:PutBucketPolicy`
- `s3:PutBucketLogging`

**Pricing:**
- Free tier: 5GB storage, 20,000 GET requests, 2,000 PUT requests/month for 12 months
- After free tier: $0.023 per GB/month + $0.0004 per 1,000 GET requests + $0.005 per 1,000 PUT requests

---

### 5. Amazon Textract
**Purpose:** OCR (Optical Character Recognition) for document text extraction

**Features Used:**
- Document text detection
- Asynchronous processing for multi-page documents
- Text extraction from PDFs and images

**API Actions Needed:**
- `textract:StartDocumentTextDetection`
- `textract:GetDocumentTextDetection`
- `textract:DetectDocumentText` (for single-page documents)

**Pricing:**
- No free tier
- $1.50 per 1,000 pages for text detection
- First 1M pages/month: $1.50 per 1,000 pages
- Over 1M pages/month: $0.60 per 1,000 pages

---

### 6. Amazon RDS (PostgreSQL)
**Purpose:** Relational database for structured data storage

**Features Used:**
- PostgreSQL database engine
- Encryption at rest
- Automated backups
- Multi-AZ deployment (optional, for production)
- VPC security groups

**Database Tables:**
- users
- documents
- assessments
- risks
- recommendations
- security_responses

**API Actions Needed:**
- `rds:CreateDBInstance`
- `rds:DescribeDBInstances`
- `rds:ModifyDBInstance`
- `rds:DeleteDBInstance`
- `rds:CreateDBSnapshot`
- `rds:RestoreDBInstanceFromDBSnapshot`

**Pricing:**
- Free tier: 750 hours/month of db.t2.micro, db.t3.micro, or db.t4g.micro for 12 months
- After free tier: Starting at $0.017/hour for db.t4g.micro (~$12.50/month)
- Storage: $0.115 per GB/month

**Alternative:** Amazon Aurora Serverless (auto-scaling, pay per use)

---

### 7. Amazon VPC
**Purpose:** Network isolation and security

**Features Used:**
- Private subnets for Lambda functions
- Public subnets for NAT Gateway
- Security groups for access control
- VPC endpoints for AWS services
- Route tables

**Components Required:**
- VPC
- 2+ Private subnets (for Lambda)
- 1+ Public subnet (for NAT Gateway)
- Internet Gateway
- NAT Gateway
- Route tables
- Security groups
- VPC Endpoints (S3, Textract, Cognito)

**API Actions Needed:**
- `ec2:CreateVpc`
- `ec2:CreateSubnet`
- `ec2:CreateSecurityGroup`
- `ec2:CreateInternetGateway`
- `ec2:CreateNatGateway`
- `ec2:CreateRouteTable`
- `ec2:CreateVpcEndpoint`
- `ec2:CreateNetworkInterface`
- `ec2:DescribeNetworkInterfaces`
- `ec2:DeleteNetworkInterface`

**Pricing:**
- VPC: Free
- NAT Gateway: $0.045/hour (~$32.40/month) + $0.045 per GB processed
- VPC Endpoints: 
  - Gateway endpoints (S3): Free
  - Interface endpoints (Textract, Cognito): $0.01/hour per AZ (~$7.20/month per endpoint)

---

### 8. Amazon CloudWatch
**Purpose:** Logging, monitoring, and alerting

**Features Used:**
- Lambda function logs
- API Gateway logs
- Custom metrics
- Alarms and notifications
- Log retention

**API Actions Needed:**
- `logs:CreateLogGroup`
- `logs:CreateLogStream`
- `logs:PutLogEvents`
- `logs:DescribeLogStreams`
- `logs:GetLogEvents`
- `cloudwatch:PutMetricData`
- `cloudwatch:GetMetricStatistics`
- `cloudwatch:PutMetricAlarm`

**Pricing:**
- Free tier: 5GB ingestion, 5GB archive, 1M API requests
- After free tier: $0.50 per GB ingested, $0.03 per GB archived

---

### 9. AWS X-Ray
**Purpose:** Distributed tracing and performance analysis

**Features Used:**
- Request tracing across services
- Performance bottleneck identification
- Error analysis

**API Actions Needed:**
- `xray:PutTraceSegments`
- `xray:PutTelemetryRecords`
- `xray:GetTraceSummaries`
- `xray:GetTraceGraph`

**Pricing:**
- Free tier: 100,000 traces recorded/month, 1M traces retrieved/month
- After free tier: $5.00 per 1M traces recorded, $0.50 per 1M traces retrieved

---

### 10. AWS CloudFormation
**Purpose:** Infrastructure as Code (used by Serverless Framework)

**Features Used:**
- Stack creation and management
- Resource provisioning
- Rollback on failure

**API Actions Needed:**
- `cloudformation:CreateStack`
- `cloudformation:UpdateStack`
- `cloudformation:DeleteStack`
- `cloudformation:DescribeStacks`
- `cloudformation:DescribeStackEvents`
- `cloudformation:DescribeStackResources`

**Pricing:**
- Free (no additional charge for CloudFormation itself)

---

## External Services (Non-AWS)

### 11. OpenAI API or Anthropic Claude API
**Purpose:** AI-powered risk analysis

**Features Used:**
- Contract risk analysis
- Invoice GST compliance checking
- Natural language processing

**API Endpoints:**
- OpenAI: `https://api.openai.com/v1/chat/completions`
- Anthropic: `https://api.anthropic.com/v1/messages`

**Pricing:**
- OpenAI GPT-4: $0.03 per 1K input tokens, $0.06 per 1K output tokens
- OpenAI GPT-3.5-turbo: $0.0015 per 1K input tokens, $0.002 per 1K output tokens
- Anthropic Claude: $0.008 per 1K input tokens, $0.024 per 1K output tokens

---

## Optional AWS Services (Recommended for Production)

### 12. AWS WAF (Web Application Firewall)
**Purpose:** Protect API Gateway from common web exploits

**Pricing:**
- $5.00/month per web ACL
- $1.00/month per rule
- $0.60 per 1M requests

---

### 13. AWS Shield
**Purpose:** DDoS protection

**Pricing:**
- Standard: Free (automatic)
- Advanced: $3,000/month (optional, for enterprise)

---

### 14. AWS GuardDuty
**Purpose:** Threat detection and security monitoring

**Pricing:**
- $4.00 per 1M CloudTrail events analyzed
- $1.00 per GB of VPC Flow Logs analyzed

---

### 15. AWS CloudTrail
**Purpose:** Audit logging and compliance

**Pricing:**
- First copy of management events: Free
- Additional copies: $2.00 per 100,000 events

---

### 16. AWS Secrets Manager
**Purpose:** Secure storage for API keys and database credentials

**Pricing:**
- $0.40 per secret per month
- $0.05 per 10,000 API calls

**Alternative:** AWS Systems Manager Parameter Store (free for standard parameters)

---

### 17. Amazon Route 53
**Purpose:** DNS management for custom domain

**Pricing:**
- $0.50 per hosted zone per month
- $0.40 per million queries

---

### 18. AWS Certificate Manager (ACM)
**Purpose:** SSL/TLS certificates for HTTPS

**Pricing:**
- Free for public SSL/TLS certificates

---

### 19. AWS Amplify or CloudFront + S3
**Purpose:** Frontend hosting

**Amplify Pricing:**
- Build & deploy: $0.01 per build minute
- Hosting: $0.15 per GB served

**CloudFront Pricing:**
- Free tier: 1TB data transfer out, 10M HTTP/HTTPS requests
- After free tier: $0.085 per GB (first 10TB)

---

## IAM Permissions Required

### Deployment User/Role Permissions

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "lambda:*",
        "apigateway:*",
        "cognito-idp:*",
        "s3:*",
        "textract:*",
        "rds:*",
        "ec2:*",
        "logs:*",
        "cloudwatch:*",
        "xray:*",
        "cloudformation:*",
        "iam:CreateRole",
        "iam:PutRolePolicy",
        "iam:AttachRolePolicy",
        "iam:PassRole",
        "iam:GetRole",
        "iam:DeleteRole",
        "iam:DeleteRolePolicy",
        "iam:DetachRolePolicy"
      ],
      "Resource": "*"
    }
  ]
}
```

### Lambda Execution Role Permissions

The Lambda functions need these permissions (automatically created by Serverless Framework):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::niyamai-documents-*",
        "arn:aws:s3:::niyamai-documents-*/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "textract:StartDocumentTextDetection",
        "textract:GetDocumentTextDetection"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "cognito-idp:AdminGetUser",
        "cognito-idp:AdminInitiateAuth",
        "cognito-idp:DeleteUser"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "ec2:CreateNetworkInterface",
        "ec2:DescribeNetworkInterfaces",
        "ec2:DeleteNetworkInterface"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "arn:aws:logs:*:*:*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "xray:PutTraceSegments",
        "xray:PutTelemetryRecords"
      ],
      "Resource": "*"
    }
  ]
}
```

---

## Estimated Monthly Costs

### Development/Testing Environment (Low Usage)

| Service | Usage | Cost |
|---------|-------|------|
| Lambda | 100K requests, 10GB-seconds | Free tier |
| API Gateway | 100K requests | Free tier |
| Cognito | 100 MAUs | Free tier |
| S3 | 5GB storage, 10K requests | Free tier |
| Textract | 100 pages | $0.15 |
| RDS (db.t4g.micro) | 750 hours | Free tier |
| VPC (NAT Gateway) | 1 NAT, 10GB | $33.90 |
| VPC Endpoints | 2 interface endpoints | $14.40 |
| CloudWatch Logs | 1GB | Free tier |
| **Total** | | **~$48.45/month** |

### Production Environment (Medium Usage)

| Service | Usage | Cost |
|---------|-------|------|
| Lambda | 1M requests, 100GB-seconds | $1.87 |
| API Gateway | 1M requests | $3.50 |
| Cognito | 1,000 MAUs | $5.50 |
| S3 | 50GB storage, 100K requests | $1.55 |
| Textract | 1,000 pages | $1.50 |
| RDS (db.t4g.small) | 730 hours | $25.00 |
| VPC (NAT Gateway) | 1 NAT, 100GB | $37.50 |
| VPC Endpoints | 2 interface endpoints | $14.40 |
| CloudWatch Logs | 10GB | $5.30 |
| X-Ray | 100K traces | Free tier |
| OpenAI API | 100 analyses | $5.00 |
| **Total** | | **~$101.12/month** |

### Cost Optimization Tips

1. **Use S3 lifecycle policies** - Already configured for 7-day deletion
2. **Right-size RDS instance** - Start with db.t4g.micro, scale as needed
3. **Use Aurora Serverless** - Pay only for actual database usage
4. **Optimize Lambda memory** - Test different memory settings for best cost/performance
5. **Enable S3 Intelligent-Tiering** - Automatic cost optimization for storage
6. **Use CloudWatch Logs retention** - Set appropriate retention periods (7-30 days)
7. **Consider Reserved Capacity** - For predictable workloads (RDS, NAT Gateway)
8. **Use VPC Gateway Endpoints** - Free for S3 (already configured)
9. **Batch Textract requests** - Process multiple pages together
10. **Cache API responses** - Reduce Lambda invocations and API calls

---

## Setup Checklist

Before deployment, ensure you have:

- [ ] AWS Account with billing enabled
- [ ] AWS CLI installed and configured
- [ ] IAM user/role with required permissions
- [ ] VPC with public and private subnets
- [ ] NAT Gateway in public subnet
- [ ] RDS PostgreSQL instance created
- [ ] Database schema initialized
- [ ] OpenAI or Claude API key
- [ ] Environment variables configured
- [ ] Serverless Framework installed
- [ ] Node.js 20.x installed

---

## Quick Start Commands

```bash
# Install Serverless Framework
npm install -g serverless

# Configure AWS credentials
aws configure

# Install dependencies
cd backend
npm install

# Deploy to AWS
serverless deploy --stage dev

# View deployed resources
serverless info --stage dev

# Test API endpoints
./test-api.sh
```

---

## Support and Documentation

- **AWS Documentation:** https://docs.aws.amazon.com/
- **Serverless Framework:** https://www.serverless.com/framework/docs
- **AWS Free Tier:** https://aws.amazon.com/free/
- **AWS Pricing Calculator:** https://calculator.aws/

---

## Security Best Practices

1. Enable MFA for AWS root account
2. Use IAM roles instead of access keys where possible
3. Enable CloudTrail for audit logging
4. Encrypt all data at rest and in transit
5. Use VPC endpoints to avoid internet traffic
6. Implement least privilege access
7. Regularly rotate credentials
8. Enable AWS Config for compliance monitoring
9. Use AWS Secrets Manager for sensitive data
10. Implement backup and disaster recovery

---

## Conclusion

The NiyamAI Risk Checker requires 10 core AWS services plus 1 external AI API. The estimated cost for a development environment is ~$48/month, and for a production environment with medium usage is ~$101/month. Most services have free tiers that can significantly reduce costs during development and testing.
