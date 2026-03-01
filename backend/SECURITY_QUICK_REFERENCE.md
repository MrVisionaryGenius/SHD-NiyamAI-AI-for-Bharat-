# NiyamAI Security Quick Reference

Quick reference guide for security configurations and common tasks.

## Security Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                         Internet                             │
└────────────────────┬────────────────────────────────────────┘
                     │ HTTPS Only
                     ▼
            ┌────────────────┐
            │  API Gateway   │ ◄── Cognito Authorizer
            │  (HTTPS Only)  │
            └────────┬───────┘
                     │
         ┌───────────┴───────────┐
         │                       │
    ┌────▼─────┐           ┌────▼─────┐
    │   VPC    │           │ Cognito  │
    │          │           │User Pool │
    └──────────┘           └──────────┘
         │
    ┌────┴─────────────────────────────────┐
    │  Private Subnet                      │
    │  ┌──────────────┐  ┌──────────────┐ │
    │  │   Lambda     │  │   Lambda     │ │
    │  │  Functions   │  │  Functions   │ │
    │  └──────┬───────┘  └──────┬───────┘ │
    │         │                 │          │
    │    ┌────┴─────────────────┴────┐    │
    │    │    Lambda Security Group  │    │
    │    └────┬─────────────────┬────┘    │
    │         │                 │          │
    │    ┌────▼────┐       ┌───▼────┐    │
    │    │   RDS   │       │   S3   │    │
    │    │(Private)│       │(Private)│    │
    │    └─────────┘       └────────┘    │
    └──────────────────────────────────────┘
         │
    ┌────▼─────┐
    │   NAT    │
    │ Gateway  │
    └────┬─────┘
         │
    ┌────▼─────────┐
    │  Internet    │
    │ (AI Service) │
    └──────────────┘
```

## Security Features Summary

| Feature | Implementation | Status |
|---------|---------------|--------|
| Lambda in Private Subnets | VPC configuration in serverless.yml | ✅ Configured |
| Security Groups | LambdaSecurityGroup, DatabaseSecurityGroup | ✅ Configured |
| S3 Encryption | AES-256 server-side encryption | ✅ Configured |
| RDS Encryption | Enabled at instance level | ⚠️ Manual setup |
| HTTPS Enforcement | API Gateway + S3 bucket policies | ✅ Configured |
| VPC Endpoints | S3, Textract, Cognito | ✅ Configured |
| Cascade Deletion | Database FK constraints + Lambda logic | ✅ Implemented |
| Access Logging | S3 access logs, API Gateway logs | ✅ Configured |
| Authentication | Cognito User Pools with JWT | ✅ Configured |
| Monitoring | CloudWatch Logs, X-Ray tracing | ✅ Configured |

## Common Security Tasks

### 1. Deploy with Security Configuration

```bash
# Set environment variables
export VPC_ID=vpc-xxxxxxxx
export PRIVATE_SUBNET_1=subnet-xxxxxxxx
export PRIVATE_SUBNET_2=subnet-yyyyyyyy
export PRIVATE_ROUTE_TABLE_ID=rtb-xxxxxxxx
export DB_HOST=your-rds-endpoint.rds.amazonaws.com
export DB_NAME=niyamai
export DB_USER=niyamai_user
export DB_PASSWORD=your-secure-password
export AI_API_KEY=your-api-key

# Deploy
cd backend
serverless deploy --stage prod --region us-east-1
```

### 2. Verify Security Configuration

```bash
# Run verification script
cd backend
chmod +x verify-security-config.sh
./verify-security-config.sh prod us-east-1
```

### 3. Check Lambda VPC Configuration

```bash
# List Lambda functions
aws lambda list-functions --region us-east-1 --query "Functions[?contains(FunctionName, 'niyamai')].FunctionName"

# Check specific function VPC config
aws lambda get-function-configuration \
  --function-name niyamai-risk-checker-prod-auth \
  --region us-east-1 \
  --query "VpcConfig"
```

### 4. Verify S3 Encryption

```bash
# Check bucket encryption
aws s3api get-bucket-encryption \
  --bucket niyamai-documents-prod \
  --region us-east-1

# Check public access block
aws s3api get-public-access-block \
  --bucket niyamai-documents-prod \
  --region us-east-1
```

### 5. Check Security Groups

```bash
# Get security group ID from stack
LAMBDA_SG=$(aws cloudformation describe-stacks \
  --stack-name niyamai-risk-checker-prod \
  --region us-east-1 \
  --query "Stacks[0].Outputs[?OutputKey=='LambdaSecurityGroupId'].OutputValue" \
  --output text)

# Describe security group
aws ec2 describe-security-groups \
  --group-ids $LAMBDA_SG \
  --region us-east-1
```

### 6. Verify VPC Endpoints

```bash
# List VPC endpoints
aws ec2 describe-vpc-endpoints \
  --region us-east-1 \
  --filters "Name=vpc-id,Values=vpc-xxxxxxxx" \
  --query "VpcEndpoints[*].[VpcEndpointId,ServiceName,State]" \
  --output table
```

### 7. Check API Gateway Configuration

```bash
# Get API Gateway ID
API_ID=$(aws cloudformation describe-stack-resources \
  --stack-name niyamai-risk-checker-prod \
  --region us-east-1 \
  --query "StackResources[?ResourceType=='AWS::ApiGateway::RestApi'].PhysicalResourceId" \
  --output text)

# Check stage configuration
aws apigateway get-stage \
  --rest-api-id $API_ID \
  --stage-name prod \
  --region us-east-1
```

### 8. Test HTTPS Enforcement

```bash
# This should fail (HTTP not allowed)
curl http://your-api-gateway-url.execute-api.us-east-1.amazonaws.com/prod/dashboard

# This should work (HTTPS)
curl https://your-api-gateway-url.execute-api.us-east-1.amazonaws.com/prod/dashboard
```

### 9. Rotate Database Credentials

```bash
# 1. Update RDS password
aws rds modify-db-instance \
  --db-instance-identifier niyamai-db-prod \
  --master-user-password "new-secure-password" \
  --apply-immediately

# 2. Update Lambda environment variables
aws lambda update-function-configuration \
  --function-name niyamai-risk-checker-prod-auth \
  --environment "Variables={DB_PASSWORD=new-secure-password,...}"

# 3. Repeat for all Lambda functions
```

### 10. Review CloudWatch Logs

```bash
# List log groups
aws logs describe-log-groups \
  --log-group-name-prefix /aws/lambda/niyamai \
  --region us-east-1

# Tail logs for a function
aws logs tail /aws/lambda/niyamai-risk-checker-prod-auth \
  --follow \
  --region us-east-1
```

## Security Group Rules Reference

### Lambda Security Group (Egress)

| Protocol | Port | Destination | Purpose |
|----------|------|-------------|---------|
| TCP | 443 | 0.0.0.0/0 | HTTPS for AI API, AWS services |
| TCP | 5432 | 10.0.0.0/16 | PostgreSQL to RDS |

### Database Security Group (Ingress)

| Protocol | Port | Source | Purpose |
|----------|------|--------|---------|
| TCP | 5432 | Lambda SG | PostgreSQL from Lambda only |

## VPC Endpoints Reference

| Service | Type | Cost | Purpose |
|---------|------|------|---------|
| S3 | Gateway | Free | Private S3 access |
| Textract | Interface | ~$7/month | Private Textract access |
| Cognito | Interface | ~$7/month | Private Cognito access |

## Encryption Reference

### S3 Encryption
- **Algorithm**: AES-256
- **Key Management**: AWS-managed (SSE-S3)
- **Bucket Key**: Enabled (reduces costs)
- **Enforcement**: Bucket policy denies unencrypted uploads

### RDS Encryption
- **Algorithm**: AES-256
- **Key Management**: AWS-managed or KMS
- **Snapshots**: Automatically encrypted
- **Replicas**: Inherit encryption from primary

### In-Transit Encryption
- **API Gateway**: TLS 1.2+
- **S3**: HTTPS enforced via bucket policy
- **RDS**: SSL/TLS required (DB_SSL=true)
- **Lambda to AWS Services**: HTTPS via VPC endpoints

## Compliance Mapping

| Requirement | Implementation | Verification |
|-------------|---------------|--------------|
| 11.1 - Data encrypted at rest | S3 + RDS encryption | Check bucket/DB encryption |
| 11.2 - Data encrypted in transit | HTTPS enforcement | Test HTTP rejection |
| 11.3 - Document access control | User-based S3 access | Test cross-user access |
| 11.4 - Lambda in private subnets | VPC configuration | Check Lambda VPC config |
| 11.5 - Security groups | Restrictive SG rules | Review SG rules |
| 11.6 - No public DB access | RDS in private subnet | Check RDS public access |
| 11.7 - Cascade deletion | FK constraints + Lambda | Test account deletion |
| 1.5 - HTTPS enforcement | API Gateway policy | Test HTTP rejection |

## Troubleshooting

### Lambda Cannot Access Internet
**Symptom**: AI API calls fail, Textract calls fail
**Solution**:
1. Verify NAT Gateway is running
2. Check route table has route to NAT Gateway (0.0.0.0/0 → NAT)
3. Verify Lambda security group allows outbound HTTPS

### Lambda Cannot Access RDS
**Symptom**: Database connection errors
**Solution**:
1. Verify Lambda and RDS are in same VPC
2. Check Lambda security group allows outbound PostgreSQL
3. Check DB security group allows inbound from Lambda SG
4. Verify DB_HOST environment variable is correct

### S3 Access Denied
**Symptom**: Upload or download fails with 403
**Solution**:
1. Verify IAM role has S3 permissions
2. Check bucket policy allows Lambda role
3. Verify VPC endpoint policy allows access
4. Check if encryption is enforced and request includes encryption header

### API Gateway 403 Errors
**Symptom**: Authenticated requests return 403
**Solution**:
1. Verify Cognito token is valid and not expired
2. Check Authorization header format: `Bearer <token>`
3. Verify API Gateway authorizer is configured correctly
4. Check Cognito User Pool ARN matches

### VPC Endpoint Not Working
**Symptom**: Services not accessible via VPC endpoint
**Solution**:
1. Verify endpoint is in "available" state
2. Check private DNS is enabled (for interface endpoints)
3. Verify security group allows HTTPS
4. Check route table association (for gateway endpoints)

## Security Monitoring Commands

### Check for Security Findings
```bash
# AWS Security Hub findings
aws securityhub get-findings \
  --filters '{"ResourceId":[{"Value":"niyamai","Comparison":"CONTAINS"}]}' \
  --region us-east-1

# AWS Config compliance
aws configservice describe-compliance-by-resource \
  --resource-type AWS::S3::Bucket \
  --region us-east-1
```

### Monitor Failed Authentication Attempts
```bash
# Check Cognito logs
aws logs filter-log-events \
  --log-group-name /aws/lambda/niyamai-risk-checker-prod-auth \
  --filter-pattern "401" \
  --region us-east-1
```

### Review S3 Access Logs
```bash
# Download recent access logs
aws s3 sync s3://niyamai-documents-prod-logs/s3-access-logs/ ./logs/ \
  --exclude "*" \
  --include "$(date +%Y-%m-%d)*"
```

## Emergency Procedures

### Suspected Security Breach
1. **Immediate**: Disable affected Lambda functions
   ```bash
   aws lambda update-function-configuration \
     --function-name <function-name> \
     --environment "Variables={DISABLED=true}"
   ```

2. **Isolate**: Update security groups to block traffic
   ```bash
   aws ec2 revoke-security-group-ingress \
     --group-id <sg-id> \
     --protocol all
   ```

3. **Investigate**: Review CloudTrail logs
   ```bash
   aws cloudtrail lookup-events \
     --lookup-attributes AttributeKey=ResourceName,AttributeValue=niyamai \
     --region us-east-1
   ```

4. **Rotate**: Change all credentials immediately
   - Database password
   - AI API key
   - Cognito user pool secrets

### Data Leak Response
1. **Identify**: Determine scope of leaked data
2. **Contain**: Revoke access to affected resources
3. **Notify**: Inform affected users (if applicable)
4. **Remediate**: Fix vulnerability and deploy patch
5. **Document**: Record incident details and lessons learned

## Contact Information

- **Security Team**: security@niyamai.com
- **On-Call**: +1-XXX-XXX-XXXX
- **AWS Support**: https://console.aws.amazon.com/support/

---

**Last Updated**: [Date]
**Version**: 1.0
