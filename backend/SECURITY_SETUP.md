# NiyamAI Security Configuration Guide

## Overview

This document describes the security configurations implemented for the NiyamAI Risk Checker application, following AWS best practices for serverless applications.

## Security Features Implemented

### 1. Network Security

#### VPC Configuration
- **Lambda Functions in Private Subnets**: All Lambda functions are deployed in private subnets with no direct internet access
- **NAT Gateway**: Outbound internet access for Lambda functions is routed through NAT Gateway for external API calls
- **Security Groups**: Restrictive security groups control traffic between components

#### Security Groups

**Lambda Security Group** (`LambdaSecurityGroup`):
- Egress Rules:
  - HTTPS (443) to 0.0.0.0/0 for external API calls (AI service, Cognito)
  - PostgreSQL (5432) to VPC CIDR for database access

**Database Security Group** (`DatabaseSecurityGroup`):
- Ingress Rules:
  - PostgreSQL (5432) from Lambda Security Group only
- No public internet access

### 2. VPC Endpoints

VPC endpoints enable private connectivity to AWS services without internet gateway:

- **S3 Gateway Endpoint**: Free, high-bandwidth access to S3 bucket
- **Textract Interface Endpoint**: Private access to Amazon Textract
- **Cognito Interface Endpoint**: Private access to Cognito Identity Provider

Benefits:
- Traffic stays within AWS network
- Reduced data transfer costs
- Enhanced security (no public internet exposure)

### 3. Data Encryption

#### Encryption at Rest
- **S3 Bucket**: AES-256 server-side encryption enabled
- **RDS Database**: Encryption enabled (configured separately in RDS)
- **Bucket Key**: Enabled for reduced encryption costs

#### Encryption in Transit
- **HTTPS Enforcement**: All API Gateway endpoints require HTTPS
- **TLS 1.2+**: Enforced for all connections
- **S3 Bucket Policy**: Denies non-HTTPS requests
- **Database SSL**: Required for PostgreSQL connections

### 4. S3 Bucket Security

#### Access Control
- **Block Public Access**: All public access blocked
- **Bucket Policy**: Enforces encryption and secure transport
- **Versioning**: Enabled for data protection
- **Lifecycle Policy**: Automatic deletion after 7 days

#### Logging
- **Access Logs**: Stored in separate logging bucket
- **Log Retention**: 90 days
- **Encrypted Logs**: AES-256 encryption

### 5. API Gateway Security

#### Authentication & Authorization
- **Cognito User Pools**: JWT-based authentication
- **Authorizer**: Validates tokens for protected endpoints
- **Resource Policy**: Denies non-HTTPS requests

#### Monitoring & Throttling
- **CloudWatch Logging**: INFO level logging enabled
- **X-Ray Tracing**: Distributed tracing enabled
- **Throttling**: 10,000 requests/second rate limit, 5,000 burst limit
- **Metrics**: CloudWatch metrics enabled

### 6. IAM Permissions

Lambda execution role follows principle of least privilege:
- S3: GetObject, PutObject, DeleteObject, ListBucket (scoped to documents bucket)
- Textract: StartDocumentTextDetection, GetDocumentTextDetection
- Cognito: AdminGetUser, AdminInitiateAuth, DeleteUser
- VPC: Network interface management for VPC deployment

### 7. Data Management

#### Cascade Deletion
- **Database**: Foreign key constraints with ON DELETE CASCADE
- **S3**: Batch deletion of user documents
- **Cognito**: User deletion from identity provider
- **Transaction**: Atomic deletion with rollback on failure

#### Data Retention
- **Documents**: Auto-deleted after 7 days
- **Logs**: Retained for 90 days
- **User Data**: Deleted on account deletion

## Environment Variables Required

Before deployment, set these environment variables:

```bash
# Database Configuration
export DB_HOST=your-rds-endpoint.rds.amazonaws.com
export DB_NAME=niyamai
export DB_USER=niyamai_user
export DB_PASSWORD=your-secure-password

# VPC Configuration (must be created before deployment)
export VPC_ID=vpc-xxxxxxxx
export PRIVATE_SUBNET_1=subnet-xxxxxxxx
export PRIVATE_SUBNET_2=subnet-yyyyyyyy
export PRIVATE_ROUTE_TABLE_ID=rtb-xxxxxxxx

# AI Service
export AI_API_KEY=your-openai-or-claude-api-key
```

## Pre-Deployment Checklist

### VPC Setup (One-time)
1. Create VPC with public and private subnets
2. Create NAT Gateway in public subnet
3. Configure route tables:
   - Public subnet: Route to Internet Gateway
   - Private subnet: Route to NAT Gateway
4. Note VPC ID, subnet IDs, and route table ID

### RDS Setup (One-time)
1. Create RDS PostgreSQL instance in private subnet
2. Use DatabaseSecurityGroup for security group
3. Enable encryption at rest
4. Enable automated backups
5. Disable public accessibility
6. Note endpoint and credentials

### Deployment Steps

1. **Install Dependencies**
   ```bash
   cd backend
   npm install
   ```

2. **Set Environment Variables**
   ```bash
   # Copy and edit .env file
   cp .env.example .env
   # Edit .env with your values
   ```

3. **Deploy Infrastructure**
   ```bash
   # Deploy to dev environment
   serverless deploy --stage dev
   
   # Deploy to production
   serverless deploy --stage prod
   ```

4. **Initialize Database**
   ```bash
   # Run schema creation
   psql -h $DB_HOST -U $DB_USER -d $DB_NAME -f db/schema.sql
   ```

5. **Verify Deployment**
   - Check CloudFormation stack status
   - Verify Lambda functions are in VPC
   - Test API endpoints
   - Verify S3 bucket encryption
   - Check VPC endpoints are active

## Security Monitoring

### CloudWatch Alarms (Recommended)
- Lambda errors and throttles
- API Gateway 4xx/5xx errors
- Database connection failures
- S3 access denied errors

### AWS Config Rules (Recommended)
- s3-bucket-public-read-prohibited
- s3-bucket-public-write-prohibited
- s3-bucket-ssl-requests-only
- rds-storage-encrypted
- lambda-inside-vpc

### Security Hub
Enable AWS Security Hub for continuous security monitoring and compliance checks.

## Compliance

This configuration addresses the following security requirements:

- **Requirement 11.1**: Data encrypted at rest (S3, RDS)
- **Requirement 11.2**: Data encrypted in transit (HTTPS, TLS)
- **Requirement 11.3**: Document access restricted to owner
- **Requirement 11.4**: Lambda functions in private subnets
- **Requirement 11.5**: Security groups restrict traffic
- **Requirement 11.6**: Database not publicly accessible
- **Requirement 11.7**: Cascade deletion on account removal
- **Requirement 1.5**: HTTPS enforcement

## Troubleshooting

### Lambda Cannot Access Internet
- Verify NAT Gateway is running
- Check route table has route to NAT Gateway
- Verify security group allows outbound HTTPS

### Lambda Cannot Access RDS
- Verify Lambda and RDS are in same VPC
- Check security group allows PostgreSQL from Lambda SG
- Verify DB_HOST environment variable is correct

### S3 Access Denied
- Verify IAM role has required permissions
- Check bucket policy allows Lambda role
- Verify VPC endpoint policy allows access

### API Gateway 403 Errors
- Verify Cognito token is valid
- Check Authorization header format: `Bearer <token>`
- Verify API Gateway authorizer is configured

## Cost Optimization

- **VPC Endpoints**: Interface endpoints cost ~$7/month each
- **NAT Gateway**: ~$32/month + data transfer
- **S3 Versioning**: Minimal cost with 7-day lifecycle
- **CloudWatch Logs**: ~$0.50/GB ingested

Consider:
- Use S3 Gateway Endpoint (free) instead of Interface Endpoint
- Reduce log retention period if needed
- Use single NAT Gateway for dev environment

## Additional Security Recommendations

1. **Enable AWS WAF** on API Gateway for DDoS protection
2. **Implement AWS Secrets Manager** for database credentials
3. **Enable GuardDuty** for threat detection
4. **Use AWS KMS** for customer-managed encryption keys
5. **Implement CloudTrail** for audit logging
6. **Enable MFA** for AWS console access
7. **Regular security audits** using AWS Trusted Advisor

## Support

For security issues or questions, contact the development team.
