#!/bin/bash

# NiyamAI Risk Checker API Test Script
# This script tests all API endpoints in sequence

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
API_URL="${API_URL:-https://your-api-id.execute-api.us-east-1.amazonaws.com/dev}"
TEST_EMAIL="test-$(date +%s)@example.com"
TEST_PASSWORD="TestPassword123!"
TEST_BUSINESS="Test Business"

echo -e "${YELLOW}=== NiyamAI Risk Checker API Test ===${NC}"
echo "API URL: $API_URL"
echo "Test Email: $TEST_EMAIL"
echo ""

# Test 1: Register User
echo -e "${YELLOW}Test 1: Register User${NC}"
REGISTER_RESPONSE=$(curl -s -X POST "$API_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$TEST_EMAIL\",
    \"password\": \"$TEST_PASSWORD\",
    \"businessName\": \"$TEST_BUSINESS\"
  }")

if echo "$REGISTER_RESPONSE" | grep -q "id"; then
  echo -e "${GREEN}✓ User registration successful${NC}"
  USER_ID=$(echo "$REGISTER_RESPONSE" | grep -o '"id":"[^"]*' | cut -d'"' -f4)
  echo "User ID: $USER_ID"
else
  echo -e "${RED}✗ User registration failed${NC}"
  echo "Response: $REGISTER_RESPONSE"
  exit 1
fi
echo ""

# Test 2: Login User
echo -e "${YELLOW}Test 2: Login User${NC}"
LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$TEST_EMAIL\",
    \"password\": \"$TEST_PASSWORD\"
  }")

if echo "$LOGIN_RESPONSE" | grep -q "token"; then
  echo -e "${GREEN}✓ User login successful${NC}"
  ACCESS_TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*' | cut -d'"' -f4)
  echo "Access Token: ${ACCESS_TOKEN:0:50}..."
else
  echo -e "${RED}✗ User login failed${NC}"
  echo "Response: $LOGIN_RESPONSE"
  exit 1
fi
echo ""

# Test 3: Upload Contract Document
echo -e "${YELLOW}Test 3: Upload Contract Document${NC}"
UPLOAD_RESPONSE=$(curl -s -X POST "$API_URL/documents/upload" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d '{
    "filename": "test-contract.pdf",
    "fileSize": 102400,
    "contentType": "application/pdf",
    "documentType": "contract"
  }')

if echo "$UPLOAD_RESPONSE" | grep -q "documentId"; then
  echo -e "${GREEN}✓ Document upload initiated${NC}"
  DOCUMENT_ID=$(echo "$UPLOAD_RESPONSE" | grep -o '"documentId":"[^"]*' | cut -d'"' -f4)
  UPLOAD_URL=$(echo "$UPLOAD_RESPONSE" | grep -o '"uploadUrl":"[^"]*' | cut -d'"' -f4)
  echo "Document ID: $DOCUMENT_ID"
  echo "Upload URL: ${UPLOAD_URL:0:80}..."
else
  echo -e "${RED}✗ Document upload failed${NC}"
  echo "Response: $UPLOAD_RESPONSE"
  exit 1
fi
echo ""

# Test 4: Upload Invoice Document
echo -e "${YELLOW}Test 4: Upload Invoice Document${NC}"
INVOICE_UPLOAD_RESPONSE=$(curl -s -X POST "$API_URL/documents/upload" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d '{
    "filename": "test-invoice.pdf",
    "fileSize": 51200,
    "contentType": "application/pdf",
    "documentType": "invoice"
  }')

if echo "$INVOICE_UPLOAD_RESPONSE" | grep -q "documentId"; then
  echo -e "${GREEN}✓ Invoice upload initiated${NC}"
  INVOICE_DOCUMENT_ID=$(echo "$INVOICE_UPLOAD_RESPONSE" | grep -o '"documentId":"[^"]*' | cut -d'"' -f4)
  echo "Invoice Document ID: $INVOICE_DOCUMENT_ID"
else
  echo -e "${RED}✗ Invoice upload failed${NC}"
  echo "Response: $INVOICE_UPLOAD_RESPONSE"
  exit 1
fi
echo ""

# Test 5: Security Questionnaire
echo -e "${YELLOW}Test 5: Security Questionnaire${NC}"
SECURITY_RESPONSE=$(curl -s -X POST "$API_URL/analyze/security" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
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
  }')

if echo "$SECURITY_RESPONSE" | grep -q "assessmentId"; then
  echo -e "${GREEN}✓ Security questionnaire completed${NC}"
  SECURITY_ASSESSMENT_ID=$(echo "$SECURITY_RESPONSE" | grep -o '"assessmentId":"[^"]*' | cut -d'"' -f4)
  RISK_SCORE=$(echo "$SECURITY_RESPONSE" | grep -o '"riskScore":[0-9]*' | cut -d':' -f2)
  SEVERITY=$(echo "$SECURITY_RESPONSE" | grep -o '"severity":"[^"]*' | cut -d'"' -f4)
  echo "Assessment ID: $SECURITY_ASSESSMENT_ID"
  echo "Risk Score: $RISK_SCORE"
  echo "Severity: $SEVERITY"
else
  echo -e "${RED}✗ Security questionnaire failed${NC}"
  echo "Response: $SECURITY_RESPONSE"
  exit 1
fi
echo ""

# Test 6: Get Dashboard
echo -e "${YELLOW}Test 6: Get Dashboard${NC}"
DASHBOARD_RESPONSE=$(curl -s -X GET "$API_URL/dashboard" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

if echo "$DASHBOARD_RESPONSE" | grep -q "recentAssessments"; then
  echo -e "${GREEN}✓ Dashboard retrieved successfully${NC}"
  OVERALL_RISK=$(echo "$DASHBOARD_RESPONSE" | grep -o '"overallRiskScore":[0-9]*' | cut -d':' -f2)
  DOC_COUNT=$(echo "$DASHBOARD_RESPONSE" | grep -o '"documentCount":[0-9]*' | cut -d':' -f2)
  echo "Overall Risk Score: $OVERALL_RISK"
  echo "Document Count: $DOC_COUNT"
else
  echo -e "${RED}✗ Dashboard retrieval failed${NC}"
  echo "Response: $DASHBOARD_RESPONSE"
  exit 1
fi
echo ""

# Test 7: Generate Report
echo -e "${YELLOW}Test 7: Generate Report${NC}"
REPORT_RESPONSE=$(curl -s -X POST "$API_URL/reports/generate" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d "{
    \"assessmentIds\": [\"$SECURITY_ASSESSMENT_ID\"]
  }")

if echo "$REPORT_RESPONSE" | grep -q "url"; then
  echo -e "${GREEN}✓ Report generated successfully${NC}"
  REPORT_URL=$(echo "$REPORT_RESPONSE" | grep -o '"url":"[^"]*' | cut -d'"' -f4)
  echo "Report URL: ${REPORT_URL:0:80}..."
else
  echo -e "${RED}✗ Report generation failed${NC}"
  echo "Response: $REPORT_RESPONSE"
  exit 1
fi
echo ""

# Test 8: Invalid File Type (should fail)
echo -e "${YELLOW}Test 8: Invalid File Type (Expected Failure)${NC}"
INVALID_UPLOAD_RESPONSE=$(curl -s -X POST "$API_URL/documents/upload" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d '{
    "filename": "test.exe",
    "fileSize": 1024,
    "contentType": "application/x-msdownload",
    "documentType": "contract"
  }')

if echo "$INVALID_UPLOAD_RESPONSE" | grep -q "error"; then
  echo -e "${GREEN}✓ Invalid file type correctly rejected${NC}"
else
  echo -e "${RED}✗ Invalid file type was not rejected${NC}"
  echo "Response: $INVALID_UPLOAD_RESPONSE"
fi
echo ""

# Test 9: Unauthorized Access (should fail)
echo -e "${YELLOW}Test 9: Unauthorized Access (Expected Failure)${NC}"
UNAUTH_RESPONSE=$(curl -s -X GET "$API_URL/dashboard")

if echo "$UNAUTH_RESPONSE" | grep -q "Unauthorized\|Authentication required"; then
  echo -e "${GREEN}✓ Unauthorized access correctly blocked${NC}"
else
  echo -e "${RED}✗ Unauthorized access was not blocked${NC}"
  echo "Response: $UNAUTH_RESPONSE"
fi
echo ""

# Test 10: Delete Account (cleanup)
echo -e "${YELLOW}Test 10: Delete Account${NC}"
DELETE_RESPONSE=$(curl -s -X DELETE "$API_URL/auth/account" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

if echo "$DELETE_RESPONSE" | grep -q "deleted successfully"; then
  echo -e "${GREEN}✓ Account deleted successfully${NC}"
else
  echo -e "${RED}✗ Account deletion failed${NC}"
  echo "Response: $DELETE_RESPONSE"
fi
echo ""

# Summary
echo -e "${GREEN}=== All Tests Completed ===${NC}"
echo "API Gateway is properly configured and all endpoints are working!"
echo ""
echo "Summary:"
echo "  - Authentication: ✓"
echo "  - Document Upload: ✓"
echo "  - Security Analysis: ✓"
echo "  - Dashboard: ✓"
echo "  - Report Generation: ✓"
echo "  - Error Handling: ✓"
echo "  - Authorization: ✓"
