# NiyamAI Security Configuration Checklist

This checklist ensures all security requirements are met before deploying to production.

## Pre-Deployment Security Checklist

### 1. Network Security Configuration

- [ ] **VPC Setup Complete**
  - [ ] VPC created with public and private subnets
  - [ ] NAT Gateway deployed in public subnet
  - [ ] Route tables configured correctly
  - [ ] VPC ID, subnet IDs, and route table ID documented

- [ ] **Lambda Functions in Private Subnets**
  - [ ] `provider.vpc` section configured in serverless.yml
  - [ ] Private subnet IDs set in environment variables
  - [ ] Lambda security group created and referenced

- [ ] **Security Groups Configured**
  - [ ] Lambda Security Group allows HTTPS (443) outbound
  - [ ] Lambda Security Group allows PostgreSQL (5432) to VPC CIDR
  - [ ] Database Security Group allows PostgreSQL from Lambda SG only
  - [ ] No public internet access to database

### 2. Data Encryption

- [ ] **S3 Encryption at Rest**
  - [ ] AES-256 server-side encryption enabled
  - [ ] Bucket key enabled for cost optimization
  - [ ] Bucket policy denies unencrypted uploads

- [ ] **RDS Encryption at Rest**
  - [ ] Encryption enabled on RDS instance
  - [ ] Encrypted snapshots configured
  - [ ] KMS key configured (if using customer-managed keys)

- [ ] **Encryption in Transit**
  - [ ] HTTPS enforcement on API Gateway
  - [ ] S3 bucket policy denies non-HTTPS requests
  - [ ] Database SSL/TLS required (DB_SSL=true)
  - [ ] TLS 1.2+ enforced

### 3. VPC Endpoints

- [ ] **S3 Gateway Endpoint**
  - [ ] Created and associated with private route table
  - [ ] Policy allows access to documents bucket
  - [ ] No additional cost (gateway endpoint is free)

- [ ] **Textract Interface Endpoint**
  - [ ] Created in private subnets
  - [ ] Private DNS enabled
  - [ ] Security group allows HTTPS from Lambda SG

- [ ] **Cognito Interface Endpoint**
  - [ ] Created in private subnets
  - [ ] Private DNS enabled
  - [ ] Security group allows HTTPS from Lambda SG

### 4. S3 Bucket Security

- [ ] **Access Control**
  - [ ] Block all public access enabled
  - [ ] Bucket policy enforces encryption
  - [ ] Bucket policy enforces HTTPS
  - [ ] Versioning enabled

- [ ] **Lifecycle Management**
  - [ ] 7-day deletion policy configured
  - [ ] Non-current version deletion configured
  - [ ] Policy tested and verified

- [ ] **Logging**
  - [ ] Access logging enabled
  - [ ] Logs stored in separate bucket
  - [ ] Log bucket has encryption enabled
  - [ ] 90-day log retention configured

### 5. API Gateway Security

- [ ] **Authentication**
  - [ ] Cognito User Pool created
  - [ ] Cognito authorizer configured
  - [ ] Protected endpoints use authorizer
  - [ ] JWT token validation working

- [ ] **HTTPS Enforcement**
  - [ ] Resource policy denies non-HTTPS
  - [ ] Custom domain uses SSL certificate (if applicable)
  - [ ] TLS 1.2+ enforced

- [ ] **Monitoring & Throttling**
  - [ ] CloudWatch logging enabled (INFO level)
  - [ ] X-Ray tracing enabled
  - [ ] Throttling limits configured
  - [ ] CloudWatch metrics enabled

### 6. IAM Permissions

- [ ] **Least Privilege Principle**
  - [ ] Lambda execution role has minimal permissions
  - [ ] S3 permissions scoped to documents bucket only
  - [ ] Textract permissions limited to required actions
  - [ ] Cognito permissions limited to required actions
  - [ ] No wildcard (*) resources where avoidable

- [ ] **VPC Permissions**
  - [ ] EC2 network interface permissions granted
  - [ ] Permissions scoped appropriately

### 7. Cognito Configuration

- [ ] **User Pool Settings**
  - [ ] Strong password policy (8+ chars, mixed case, numbers, symbols)
  - [ ] Email verification enabled
  - [ ] Account recovery configured
  - [ ] User attributes configured correctly

- [ ] **User Pool Client**
  - [ ] Client secret not generated (for frontend)
  - [ ] Appropriate auth flows enabled
  - [ ] Token validity periods configured
  - [ ] Prevent user existence errors enabled

### 8. Database Security

- [ ] **RDS Configuration**
  - [ ] Deployed in private subnet
  - [ ] Database security group configured
  - [ ] Public accessibility disabled
  - [ ] Encryption at rest enabled
  - [ ] Automated backups enabled
  - [ ] SSL/TLS required for connections

- [ ] **Database Schema**
  - [ ] Foreign key constraints with CASCADE DELETE
  - [ ] Indexes created for performance
  - [ ] User data properly isolated
  - [ ] Schema deployed successfully

### 9. Data Management

- [ ] **Cascade Deletion**
  - [ ] Account deletion endpoint implemented
  - [ ] Database cascade deletion configured
  - [ ] S3 document deletion implemented
  - [ ] Cognito user deletion implemented
  - [ ] Deletion tested and verified

- [ ] **Data Retention**
  - [ ] 7-day document deletion policy active
  - [ ] Log retention policies configured
  - [ ] Backup retention policies configured

### 10. Monitoring & Logging

- [ ] **CloudWatch Logs**
  - [ ] Lambda function logs enabled
  - [ ] API Gateway logs enabled
  - [ ] Log retention periods configured
  - [ ] Log groups created

- [ ] **CloudWatch Alarms** (Recommended)
  - [ ] Lambda error rate alarms
  - [ ] API Gateway 4xx/5xx alarms
  - [ ] Database connection failure alarms
  - [ ] S3 access denied alarms

- [ ] **X-Ray Tracing**
  - [ ] Enabled on API Gateway
  - [ ] Lambda functions instrumented
  - [ ] Service map visible

### 11. Environment Variables

- [ ] **Sensitive Data**
  - [ ] Database credentials set securely
  - [ ] AI API key set securely
  - [ ] No secrets in code or version control
  - [ ] .env.example provided without secrets

- [ ] **Configuration**
  - [ ] VPC_ID set
  - [ ] PRIVATE_SUBNET_1 and PRIVATE_SUBNET_2 set
  - [ ] PRIVATE_ROUTE_TABLE_ID set
  - [ ] DB_HOST, DB_NAME, DB_USER, DB_PASSWORD set
  - [ ] AI_API_KEY set

### 12. Testing & Verification

- [ ] **Security Testing**
  - [ ] Run verify-security-config.sh script
  - [ ] All checks pass or warnings understood
  - [ ] Manual verification of critical settings

- [ ] **Functional Testing**
  - [ ] Authentication flow tested
  - [ ] Document upload tested
  - [ ] OCR processing tested
  - [ ] Risk analysis tested
  - [ ] Report generation tested
  - [ ] Account deletion tested

- [ ] **Security Scanning**
  - [ ] Dependency vulnerability scan (npm audit)
  - [ ] SAST scan completed (if applicable)
  - [ ] AWS Config rules checked
  - [ ] Security Hub findings reviewed

### 13. Compliance Verification

- [ ] **Requirement 11.1**: Data encrypted at rest (S3, RDS)
- [ ] **Requirement 11.2**: Data encrypted in transit (HTTPS, TLS)
- [ ] **Requirement 11.3**: Document access restricted to owner
- [ ] **Requirement 11.4**: Lambda functions in private subnets
- [ ] **Requirement 11.5**: Security groups restrict traffic
- [ ] **Requirement 11.6**: Database not publicly accessible
- [ ] **Requirement 11.7**: Cascade deletion on account removal
- [ ] **Requirement 1.5**: HTTPS enforcement

## Post-Deployment Verification

### Immediate Checks (Within 1 hour)

1. **Run Verification Script**
   ```bash
   cd backend
   chmod +x verify-security-config.sh
   ./verify-security-config.sh <stage> <region>
   ```

2. **Test API Endpoints**
   - [ ] Health check endpoint responds
   - [ ] Authentication endpoints work
   - [ ] Protected endpoints require auth
   - [ ] HTTPS enforced (HTTP requests rejected)

3. **Verify VPC Configuration**
   - [ ] Lambda functions show VPC configuration in console
   - [ ] Lambda can access internet (for AI API calls)
   - [ ] Lambda can access RDS database
   - [ ] VPC endpoints are active

4. **Check S3 Bucket**
   - [ ] Bucket is not publicly accessible
   - [ ] Encryption is enabled
   - [ ] Lifecycle policy is active
   - [ ] Logging is working

### Daily Monitoring (First Week)

- [ ] Review CloudWatch logs for errors
- [ ] Check Lambda execution metrics
- [ ] Monitor API Gateway metrics
- [ ] Review S3 access logs
- [ ] Check for security findings in Security Hub

### Weekly Reviews

- [ ] Review CloudWatch alarms
- [ ] Check AWS Config compliance
- [ ] Review IAM access patterns
- [ ] Audit user activity logs
- [ ] Review cost optimization opportunities

## Security Incident Response

### If Security Issue Detected

1. **Immediate Actions**
   - Document the issue with timestamps
   - Assess severity and impact
   - Isolate affected resources if needed
   - Notify stakeholders

2. **Investigation**
   - Review CloudWatch logs
   - Check CloudTrail for API activity
   - Review VPC Flow Logs
   - Identify root cause

3. **Remediation**
   - Apply security patches
   - Update configurations
   - Rotate compromised credentials
   - Deploy fixes

4. **Post-Incident**
   - Document lessons learned
   - Update security procedures
   - Implement preventive measures
   - Conduct security review

## Additional Security Recommendations

### High Priority
- [ ] Enable AWS WAF on API Gateway for DDoS protection
- [ ] Implement AWS Secrets Manager for database credentials
- [ ] Enable GuardDuty for threat detection
- [ ] Enable CloudTrail for audit logging

### Medium Priority
- [ ] Use AWS KMS for customer-managed encryption keys
- [ ] Implement AWS Config rules for compliance
- [ ] Set up AWS Security Hub
- [ ] Enable MFA for AWS console access

### Low Priority (Cost vs. Benefit)
- [ ] Implement AWS Shield Advanced (if DDoS is a concern)
- [ ] Use AWS Macie for data discovery (if handling PII)
- [ ] Implement AWS Inspector for vulnerability scanning

## Sign-Off

Before deploying to production, ensure this checklist is completed and signed off by:

- [ ] **Developer**: _________________ Date: _______
- [ ] **Security Lead**: _________________ Date: _______
- [ ] **DevOps Lead**: _________________ Date: _______
- [ ] **Project Manager**: _________________ Date: _______

## Notes

Document any deviations from this checklist or additional security measures implemented:

```
[Add notes here]
```

---

**Last Updated**: [Date]
**Version**: 1.0
**Next Review**: [Date]
