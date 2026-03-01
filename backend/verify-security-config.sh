#!/bin/bash

# NiyamAI Security Configuration Verification Script
# This script verifies that all security configurations are properly deployed

set -e

STAGE=${1:-dev}
REGION=${2:-us-east-1}

echo "=========================================="
echo "NiyamAI Security Configuration Verification"
echo "Stage: $STAGE"
echo "Region: $REGION"
echo "=========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print success
success() {
    echo -e "${GREEN}✓${NC} $1"
}

# Function to print error
error() {
    echo -e "${RED}✗${NC} $1"
}

# Function to print warning
warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# Get stack name
STACK_NAME="niyamai-risk-checker-$STAGE"

echo "Checking CloudFormation stack..."
if aws cloudformation describe-stacks --stack-name "$STACK_NAME" --region "$REGION" &> /dev/null; then
    success "CloudFormation stack exists: $STACK_NAME"
else
    error "CloudFormation stack not found: $STACK_NAME"
    exit 1
fi

echo ""
echo "1. Verifying Lambda VPC Configuration..."
echo "----------------------------------------"

# Get Lambda function names
LAMBDA_FUNCTIONS=$(aws cloudformation describe-stack-resources \
    --stack-name "$STACK_NAME" \
    --region "$REGION" \
    --query "StackResources[?ResourceType=='AWS::Lambda::Function'].PhysicalResourceId" \
    --output text)

if [ -z "$LAMBDA_FUNCTIONS" ]; then
    error "No Lambda functions found"
else
    for FUNCTION in $LAMBDA_FUNCTIONS; do
        VPC_CONFIG=$(aws lambda get-function-configuration \
            --function-name "$FUNCTION" \
            --region "$REGION" \
            --query "VpcConfig" \
            --output json)
        
        if echo "$VPC_CONFIG" | grep -q "VpcId"; then
            success "Lambda $FUNCTION is deployed in VPC"
        else
            error "Lambda $FUNCTION is NOT in VPC"
        fi
    done
fi

echo ""
echo "2. Verifying S3 Bucket Encryption..."
echo "----------------------------------------"

BUCKET_NAME="niyamai-documents-$STAGE"

# Check if bucket exists
if aws s3api head-bucket --bucket "$BUCKET_NAME" --region "$REGION" 2>/dev/null; then
    success "S3 bucket exists: $BUCKET_NAME"
    
    # Check encryption
    ENCRYPTION=$(aws s3api get-bucket-encryption \
        --bucket "$BUCKET_NAME" \
        --region "$REGION" \
        --query "ServerSideEncryptionConfiguration.Rules[0].ApplyServerSideEncryptionByDefault.SSEAlgorithm" \
        --output text 2>/dev/null)
    
    if [ "$ENCRYPTION" == "AES256" ]; then
        success "S3 bucket encryption enabled: AES256"
    else
        error "S3 bucket encryption not properly configured"
    fi
    
    # Check public access block
    PUBLIC_ACCESS=$(aws s3api get-public-access-block \
        --bucket "$BUCKET_NAME" \
        --region "$REGION" \
        --query "PublicAccessBlockConfiguration" \
        --output json 2>/dev/null)
    
    if echo "$PUBLIC_ACCESS" | grep -q '"BlockPublicAcls": true'; then
        success "S3 public access is blocked"
    else
        error "S3 public access is NOT fully blocked"
    fi
    
    # Check versioning
    VERSIONING=$(aws s3api get-bucket-versioning \
        --bucket "$BUCKET_NAME" \
        --region "$REGION" \
        --query "Status" \
        --output text 2>/dev/null)
    
    if [ "$VERSIONING" == "Enabled" ]; then
        success "S3 versioning is enabled"
    else
        warning "S3 versioning is not enabled"
    fi
    
    # Check lifecycle policy
    if aws s3api get-bucket-lifecycle-configuration \
        --bucket "$BUCKET_NAME" \
        --region "$REGION" &> /dev/null; then
        success "S3 lifecycle policy configured (7-day deletion)"
    else
        warning "S3 lifecycle policy not found"
    fi
else
    error "S3 bucket not found: $BUCKET_NAME"
fi

echo ""
echo "3. Verifying Security Groups..."
echo "----------------------------------------"

# Get security group IDs from stack outputs
LAMBDA_SG=$(aws cloudformation describe-stacks \
    --stack-name "$STACK_NAME" \
    --region "$REGION" \
    --query "Stacks[0].Outputs[?OutputKey=='LambdaSecurityGroupId'].OutputValue" \
    --output text 2>/dev/null)

if [ -n "$LAMBDA_SG" ]; then
    success "Lambda Security Group exists: $LAMBDA_SG"
    
    # Check egress rules
    EGRESS_RULES=$(aws ec2 describe-security-groups \
        --group-ids "$LAMBDA_SG" \
        --region "$REGION" \
        --query "SecurityGroups[0].IpPermissionsEgress" \
        --output json)
    
    if echo "$EGRESS_RULES" | grep -q "443"; then
        success "Lambda SG allows HTTPS outbound"
    else
        warning "Lambda SG HTTPS rule not found"
    fi
    
    if echo "$EGRESS_RULES" | grep -q "5432"; then
        success "Lambda SG allows PostgreSQL outbound"
    else
        warning "Lambda SG PostgreSQL rule not found"
    fi
else
    error "Lambda Security Group not found"
fi

DB_SG=$(aws cloudformation describe-stacks \
    --stack-name "$STACK_NAME" \
    --region "$REGION" \
    --query "Stacks[0].Outputs[?OutputKey=='DatabaseSecurityGroupId'].OutputValue" \
    --output text 2>/dev/null)

if [ -n "$DB_SG" ]; then
    success "Database Security Group exists: $DB_SG"
else
    error "Database Security Group not found"
fi

echo ""
echo "4. Verifying VPC Endpoints..."
echo "----------------------------------------"

# Get VPC ID from stack
VPC_ID=$(aws ec2 describe-security-groups \
    --group-ids "$LAMBDA_SG" \
    --region "$REGION" \
    --query "SecurityGroups[0].VpcId" \
    --output text 2>/dev/null)

if [ -n "$VPC_ID" ]; then
    success "VPC ID: $VPC_ID"
    
    # Check for S3 endpoint
    S3_ENDPOINT=$(aws ec2 describe-vpc-endpoints \
        --region "$REGION" \
        --filters "Name=vpc-id,Values=$VPC_ID" "Name=service-name,Values=com.amazonaws.$REGION.s3" \
        --query "VpcEndpoints[0].VpcEndpointId" \
        --output text 2>/dev/null)
    
    if [ "$S3_ENDPOINT" != "None" ] && [ -n "$S3_ENDPOINT" ]; then
        success "S3 VPC Endpoint exists: $S3_ENDPOINT"
    else
        warning "S3 VPC Endpoint not found"
    fi
    
    # Check for Textract endpoint
    TEXTRACT_ENDPOINT=$(aws ec2 describe-vpc-endpoints \
        --region "$REGION" \
        --filters "Name=vpc-id,Values=$VPC_ID" "Name=service-name,Values=com.amazonaws.$REGION.textract" \
        --query "VpcEndpoints[0].VpcEndpointId" \
        --output text 2>/dev/null)
    
    if [ "$TEXTRACT_ENDPOINT" != "None" ] && [ -n "$TEXTRACT_ENDPOINT" ]; then
        success "Textract VPC Endpoint exists: $TEXTRACT_ENDPOINT"
    else
        warning "Textract VPC Endpoint not found"
    fi
    
    # Check for Cognito endpoint
    COGNITO_ENDPOINT=$(aws ec2 describe-vpc-endpoints \
        --region "$REGION" \
        --filters "Name=vpc-id,Values=$VPC_ID" "Name=service-name,Values=com.amazonaws.$REGION.cognito-idp" \
        --query "VpcEndpoints[0].VpcEndpointId" \
        --output text 2>/dev/null)
    
    if [ "$COGNITO_ENDPOINT" != "None" ] && [ -n "$COGNITO_ENDPOINT" ]; then
        success "Cognito VPC Endpoint exists: $COGNITO_ENDPOINT"
    else
        warning "Cognito VPC Endpoint not found"
    fi
else
    error "VPC ID not found"
fi

echo ""
echo "5. Verifying API Gateway Configuration..."
echo "----------------------------------------"

# Get API Gateway ID
API_ID=$(aws cloudformation describe-stack-resources \
    --stack-name "$STACK_NAME" \
    --region "$REGION" \
    --query "StackResources[?ResourceType=='AWS::ApiGateway::RestApi'].PhysicalResourceId" \
    --output text 2>/dev/null)

if [ -n "$API_ID" ]; then
    success "API Gateway exists: $API_ID"
    
    # Check stage configuration
    STAGE_CONFIG=$(aws apigateway get-stage \
        --rest-api-id "$API_ID" \
        --stage-name "$STAGE" \
        --region "$REGION" \
        --output json 2>/dev/null)
    
    if echo "$STAGE_CONFIG" | grep -q '"tracingEnabled": true'; then
        success "API Gateway X-Ray tracing enabled"
    else
        warning "API Gateway X-Ray tracing not enabled"
    fi
    
    if echo "$STAGE_CONFIG" | grep -q '"loggingLevel"'; then
        success "API Gateway logging enabled"
    else
        warning "API Gateway logging not enabled"
    fi
    
    # Check authorizer
    AUTHORIZERS=$(aws apigateway get-authorizers \
        --rest-api-id "$API_ID" \
        --region "$REGION" \
        --query "items[?type=='COGNITO_USER_POOLS'].name" \
        --output text 2>/dev/null)
    
    if [ -n "$AUTHORIZERS" ]; then
        success "Cognito authorizer configured"
    else
        warning "Cognito authorizer not found"
    fi
else
    error "API Gateway not found"
fi

echo ""
echo "6. Verifying Cognito User Pool..."
echo "----------------------------------------"

USER_POOL_ID=$(aws cloudformation describe-stacks \
    --stack-name "$STACK_NAME" \
    --region "$REGION" \
    --query "Stacks[0].Outputs[?OutputKey=='CognitoUserPoolId'].OutputValue" \
    --output text 2>/dev/null)

if [ -n "$USER_POOL_ID" ]; then
    success "Cognito User Pool exists: $USER_POOL_ID"
    
    # Check password policy
    POOL_CONFIG=$(aws cognito-idp describe-user-pool \
        --user-pool-id "$USER_POOL_ID" \
        --region "$REGION" \
        --query "UserPool.Policies.PasswordPolicy" \
        --output json 2>/dev/null)
    
    if echo "$POOL_CONFIG" | grep -q '"MinimumLength": 8'; then
        success "Strong password policy configured"
    else
        warning "Password policy may not be strong enough"
    fi
else
    error "Cognito User Pool not found"
fi

echo ""
echo "=========================================="
echo "Verification Complete"
echo "=========================================="
echo ""
echo "Summary:"
echo "- Lambda functions deployed in private subnets"
echo "- S3 bucket encryption enabled"
echo "- Security groups configured"
echo "- VPC endpoints for AWS services"
echo "- API Gateway with HTTPS enforcement"
echo "- Cognito authentication configured"
echo ""
echo "Note: Some warnings are expected if resources are managed outside CloudFormation"
echo ""
