# Implementation Plan: NiyamAI Risk Checker

## Overview

This implementation plan breaks down the NiyamAI Risk Checker into discrete coding tasks. The system is a serverless web application built with Next.js frontend and AWS Lambda backend, providing AI-powered risk analysis for contracts, invoices, and cybersecurity practices.

Implementation follows this sequence:
1. Project setup and infrastructure configuration
2. Authentication and user management
3. Document upload and storage
4. Text extraction with Textract
5. AI-powered risk analysis
6. Dashboard and reporting
7. Testing and integration

## Tasks

- [x] 1. Set up project structure and dependencies
  - Initialize Next.js project with TypeScript
  - Configure AWS SDK, Amplify, and serverless framework
  - Set up project directory structure (frontend, backend/lambdas, shared types)
  - Install dependencies: fast-check for property testing, AWS SDK, PDF generation library
  - Configure TypeScript with strict mode
  - Set up environment variables structure
  - _Requirements: All_

- [x] 2. Implement authentication system
  - [x] 2.1 Configure Amazon Cognito user pool
    - Create Cognito user pool with email/password authentication
    - Configure JWT token settings and expiration
    - Set up user pool client for frontend
    - _Requirements: 1.1, 1.2_
  
  - [x] 2.2 Implement Auth Lambda function
    - Create Lambda function for token validation
    - Implement getUserContext function to retrieve user profile
    - Add error handling for invalid/expired tokens
    - _Requirements: 1.2, 1.3, 1.4_
  
  - [ ]* 2.3 Write property tests for authentication
    - **Property 1: User registration creates Cognito account**
    - **Validates: Requirements 1.1**
  
  - [ ]* 2.4 Write property tests for login and authorization
    - **Property 2: Valid login returns JWT token**
    - **Property 3: Protected resources require authentication**
    - **Validates: Requirements 1.2, 1.3**
  
  - [x] 2.5 Implement frontend authentication components
    - Create AuthProvider with Cognito integration
    - Build login and registration pages
    - Implement JWT token storage and refresh logic
    - Add protected route wrapper component
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 3. Implement document upload and storage
  - [x] 3.1 Configure S3 bucket and lifecycle policies
    - Create private S3 bucket with encryption enabled
    - Configure lifecycle policy for 7-day auto-deletion
    - Set up CORS for frontend uploads
    - _Requirements: 2.2, 2.4_
  
  - [x] 3.2 Create database schema
    - Implement users, documents, assessments, risks, recommendations, and security_responses tables
    - Add indexes for performance
    - Set up foreign key constraints and cascade deletion
    - _Requirements: 2.6, 7.5, 11.7_
  
  - [x] 3.3 Implement Upload Lambda function
    - Create uploadDocument function with file type validation
    - Implement S3 upload with encryption and pre-signed URL generation
    - Add file size validation (10MB limit)
    - Store document metadata in database with user association
    - _Requirements: 2.1, 2.2, 2.3, 2.5, 2.6_
  
  - [ ]* 3.4 Write property tests for document upload
    - **Property 4: File type validation**
    - **Property 5: Document storage with user association**
    - **Property 6: Document ownership enforcement**
    - **Validates: Requirements 2.1, 2.2, 2.3, 2.6, 11.3**
  
  - [x] 3.5 Implement frontend document uploader
    - Create DocumentUploader component with drag-and-drop
    - Add file type and size validation
    - Implement upload progress indicator
    - Display upload errors with retry option
    - _Requirements: 2.1, 2.5, 12.1, 12.6_

- [x] 4. Checkpoint - Ensure upload flow works
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Implement text extraction with Textract
  - [x] 5.1 Create Textract service integration
    - Implement TextractService class with startDocumentTextDetection
    - Add getDocumentTextDetection with polling logic
    - Implement extractText to parse Textract results
    - Add error handling and retry logic for Textract failures
    - _Requirements: 3.1, 3.2, 3.3_
  
  - [x] 5.2 Extend Upload Lambda with OCR processing
    - Trigger Textract after S3 upload
    - Poll for Textract completion
    - Store extracted text in database
    - Update document OCR status
    - Handle multi-page documents
    - _Requirements: 3.1, 3.2, 3.4, 3.5_
  
  - [ ]* 5.3 Write property tests for text extraction
    - **Property 7: Textract integration**
    - **Property 8: Multi-page document handling**
    - **Validates: Requirements 3.1, 3.2, 3.4, 3.5**
  
  - [ ]* 5.4 Write unit tests for OCR error handling
    - Test Textract API failures
    - Test corrupted document handling
    - Test timeout scenarios
    - _Requirements: 3.3_

- [x] 6. Implement AI service integration
  - [x] 6.1 Create AI service client
    - Implement AIService class with OpenAI/Claude API integration
    - Add analyzeContractRisks with contract-specific prompt
    - Add analyzeInvoiceCompliance with GST-specific prompt
    - Implement response parsing to extract risks and recommendations
    - _Requirements: 10.1, 10.2, 10.3_
  
  - [x] 6.2 Implement retry logic with exponential backoff
    - Create callWithRetry function with configurable max retries
    - Implement exponential backoff (1s, 2s, 4s)
    - Add comprehensive error logging
    - Handle final failure with user notification
    - _Requirements: 10.4, 10.5_
  
  - [x] 6.3 Implement rate limiting
    - Create rate limiter to stay within API quotas
    - Add request queuing for rate-limited requests
    - Implement delay logic when approaching limits
    - _Requirements: 10.6_
  
  - [ ]* 6.4 Write property tests for AI service integration
    - **Property 19: AI service prompt construction**
    - **Property 20: AI response parsing**
    - **Property 21: AI service retry with exponential backoff**
    - **Property 22: Rate limiting compliance**
    - **Validates: Requirements 10.2, 10.3, 10.4, 10.6**
  
  - [ ]* 6.5 Write unit tests for AI service error handling
    - Test API timeout scenarios
    - Test invalid response handling
    - Test retry exhaustion
    - _Requirements: 10.5_

- [x] 7. Implement contract risk analysis
  - [x] 7.1 Create Analysis Lambda function
    - Implement analyzeContract function
    - Call AI service with extracted text
    - Parse AI response into structured risks and recommendations
    - Calculate risk score from identified issues
    - Store assessment, risks, and recommendations in database
    - _Requirements: 4.1, 4.2, 4.3_
  
  - [x] 7.2 Implement risk scoring algorithm
    - Create calculateRiskScore function with severity weighting
    - Implement getSeverity function for score-to-severity mapping
    - Ensure consistent scoring across all risk types
    - Add composite scoring for multiple risks
    - _Requirements: 4.3, 7.1, 7.2, 7.3, 7.4_
  
  - [ ]* 7.3 Write property tests for contract analysis
    - **Property 9: Contract risk analysis completeness**
    - **Property 10: Risk score bounds and severity mapping**
    - **Property 14: Consistent scoring methodology**
    - **Property 15: Composite risk scoring**
    - **Property 16: Risk score persistence with timestamps**
    - **Validates: Requirements 4.2, 4.3, 4.4, 4.5, 4.6, 7.1, 7.2, 7.3, 7.4, 7.5**
  
  - [ ]* 7.4 Write unit tests for contract analysis edge cases
    - Test empty contract text
    - Test contracts with no identified risks
    - Test contracts with maximum risks
    - _Requirements: 4.1, 4.2_

- [x] 8. Implement GST invoice compliance check
  - [x] 8.1 Extend Analysis Lambda with invoice analysis
    - Implement analyzeInvoice function
    - Call AI service with invoice-specific prompt
    - Parse response to check for required GST fields
    - Generate warnings for missing/incorrect fields
    - Store compliance assessment in database
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.6_
  
  - [ ]* 8.2 Write property tests for invoice analysis
    - **Property 11: GST compliance warning completeness**
    - **Validates: Requirements 5.2, 5.3, 5.4, 5.6**
  
  - [ ]* 8.3 Write unit tests for invoice compliance
    - Test compliant invoice (positive case)
    - Test invoice missing GSTIN
    - Test invoice with incorrect tax calculations
    - _Requirements: 5.5_

- [x] 9. Implement security questionnaire assessment
  - [x] 9.1 Define security questionnaire structure
    - Create SECURITY_QUESTIONNAIRE constant with all questions
    - Define questions for passwords, devices, data, and access categories
    - Assign weights and scores to each option
    - _Requirements: 6.1, 6.2_
  
  - [x] 9.2 Implement security assessment logic
    - Create evaluateSecurityQuestionnaire function
    - Calculate weighted score from responses
    - Generate recommendations based on weak responses
    - Prioritize recommendations by severity
    - Store assessment and responses in database
    - _Requirements: 6.3, 6.4, 6.5, 6.6_
  
  - [ ]* 9.3 Write property tests for security assessment
    - **Property 12: Security questionnaire scoring**
    - **Property 13: Security recommendations generation**
    - **Validates: Requirements 6.3, 6.4, 6.5, 6.6**
  
  - [ ]* 9.4 Write unit tests for security assessment edge cases
    - Test all best practices (score 100)
    - Test all worst practices (score 0)
    - Test mixed responses
    - _Requirements: 6.3_
  
  - [x] 9.5 Implement frontend security questionnaire
    - Create SecurityQuestionnaire component with multi-step form
    - Display questions by category
    - Submit responses to Analysis Lambda
    - Display results with recommendations
    - _Requirements: 6.1, 6.2_

- [x] 10. Checkpoint - Ensure all analysis flows work
  - Ensure all tests pass, ask the user if questions arise.

- [x] 11. Implement dashboard and results display
  - [x] 11.1 Create Report Lambda function
    - Implement getDashboardData function
    - Query all user assessments from database
    - Calculate overall risk score
    - Organize action items by priority
    - Return structured dashboard data
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_
  
  - [ ]* 11.2 Write property tests for dashboard
    - **Property 17: Dashboard data completeness**
    - **Validates: Requirements 8.1, 8.2, 8.3, 8.4, 8.5**
  
  - [x] 11.3 Implement frontend dashboard
    - Create Dashboard page with assessment overview
    - Build RiskScoreCard component for displaying scores
    - Create ActionItemList component with priority sorting
    - Organize assessments by type (contract, invoice, security)
    - Add detail view for individual assessments
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_
  
  - [ ]* 11.4 Write unit tests for dashboard components
    - Test empty dashboard state
    - Test dashboard with single assessment
    - Test dashboard with multiple assessments
    - _Requirements: 8.1_

- [x] 12. Implement report generation and export
  - [x] 12.1 Extend Report Lambda with PDF generation
    - Implement generateReport function
    - Query assessment data for selected IDs
    - Format data for PDF layout
    - Generate PDF using library (e.g., PDFKit or Puppeteer)
    - Include business name, dates, scores, issues, and recommendations
    - Return download URL or base64 PDF
    - _Requirements: 9.1, 9.2, 9.3, 9.4_
  
  - [ ]* 12.2 Write property tests for report generation
    - **Property 18: Report generation completeness**
    - **Validates: Requirements 9.1, 9.2, 9.3, 9.4**
  
  - [x] 12.3 Implement frontend report export
    - Create ReportExporter component
    - Add "Export Report" button to dashboard
    - Call Report Lambda and download PDF
    - Display generation progress
    - _Requirements: 9.1, 9.3_
  
  - [ ]* 12.4 Write unit tests for PDF generation
    - Test single assessment report
    - Test multiple assessments report
    - Validate PDF structure
    - _Requirements: 9.3_

- [x] 13. Implement comprehensive error handling
  - [x] 13.1 Add error handling to all Lambda functions
    - Wrap all Lambda handlers with try-catch
    - Implement error logging with context
    - Return appropriate HTTP status codes
    - Map errors to user-friendly messages
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_
  
  - [x] 13.2 Implement frontend error display
    - Create ErrorDisplay component
    - Add error boundaries to catch React errors
    - Display specific error messages for each error type
    - Add retry buttons for retryable errors
    - _Requirements: 12.1, 12.2, 12.3, 12.4_
  
  - [x] 13.3 Implement loading state management
    - Add loading states to all async operations
    - Create loading indicators for uploads, OCR, and analysis
    - Update UI to show progress
    - _Requirements: 12.6_
  
  - [ ]* 13.4 Write property tests for error handling
    - **Property 24: Error message specificity**
    - **Property 25: Error logging completeness**
    - **Property 26: Loading state management**
    - **Validates: Requirements 12.1, 12.4, 12.5, 12.6**

- [x] 14. Implement data management and security
  - [x] 14.1 Implement cascade deletion
    - Add account deletion endpoint to Auth Lambda
    - Implement deletion of all user data from database
    - Delete all user documents from S3
    - Verify cascade deletion with foreign key constraints
    - _Requirements: 11.7_
  
  - [ ]* 14.2 Write property tests for data management
    - **Property 23: Cascade deletion on account removal**
    - **Validates: Requirements 11.7**
  
  - [x] 14.3 Configure AWS security settings
    - Deploy Lambda functions in private subnets
    - Configure security groups for restricted access
    - Enable S3 and RDS encryption
    - Set up VPC endpoints for AWS services
    - Configure HTTPS enforcement on API Gateway
    - _Requirements: 11.1, 11.2, 11.4, 11.5, 11.6, 1.5_

- [x] 15. Set up API Gateway and integrate all Lambdas
  - [x] 15.1 Configure API Gateway
    - Create REST API with resource paths
    - Set up Cognito authorizer for protected endpoints
    - Configure CORS for frontend access
    - Add request/response validation
    - _Requirements: 1.3, 1.5_
  
  - [x] 15.2 Wire all Lambda functions to API Gateway
    - Connect Auth Lambda to /auth endpoints
    - Connect Upload Lambda to /documents endpoints
    - Connect Analysis Lambda to /analyze endpoints
    - Connect Report Lambda to /dashboard and /reports endpoints
    - Test all endpoints with Postman or similar tool
    - _Requirements: All_

- [ ] 16. Deploy frontend to AWS
  - [ ] 16.1 Configure Next.js for production
    - Set up environment variables for API endpoints
    - Configure build settings for static export or SSR
    - Optimize bundle size and performance
    - _Requirements: All_
  
  - [ ] 16.2 Deploy to AWS Amplify or S3 + CloudFront
    - Set up Amplify hosting or S3 bucket with CloudFront
    - Configure custom domain (if applicable)
    - Enable HTTPS with SSL certificate
    - Test deployed application
    - _Requirements: 1.5_

- [ ] 17. Final checkpoint - End-to-end testing
  - Test complete user flow: register → login → upload contract → view analysis → export report
  - Test complete invoice flow: upload invoice → view GST compliance check
  - Test security questionnaire flow: complete questionnaire → view recommendations
  - Verify all error scenarios display appropriate messages
  - Verify document auto-deletion after 7 days (check lifecycle policy)
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional property-based and unit tests that can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at key milestones
- Property tests validate universal correctness properties with 100+ iterations
- Unit tests validate specific examples, edge cases, and error conditions
- The implementation uses TypeScript throughout for type safety
- All Lambda functions should be deployed in private subnets for security
- Mock external services (Textract, AI API) during development and testing
- Use environment variables for all configuration (API keys, bucket names, etc.)
