# Requirements Document: NiyamAI Risk Checker

## Introduction

NiyamAI is an AI-powered web platform that helps small businesses in India detect legal, GST, and cybersecurity risks by analyzing uploaded documents and basic business inputs. The system provides risk scoring, issue identification, and actionable recommendations to help businesses that lack access to legal or security experts.

## Glossary

- **System**: The NiyamAI Risk Checker platform
- **User**: Small business owner, freelancer, consultant, or startup founder
- **Document**: Contract, invoice, GST document, or agreement uploaded by the user
- **Risk_Score**: Numerical assessment (0-100) indicating severity of identified risks
- **OCR_Service**: Amazon Textract service for extracting text from documents
- **AI_Service**: External AI API (OpenAI/Claude) for risk analysis
- **Dashboard**: User interface displaying all risk assessments and recommendations
- **Security_Questionnaire**: Form collecting information about user's cybersecurity practices
- **Action_Item**: Specific recommendation for addressing an identified risk
- **Report**: Exportable summary of all risk assessments and recommendations

## Requirements

### Requirement 1: User Authentication and Authorization

**User Story:** As a user, I want to securely register and log in to the platform, so that my business data and risk assessments remain private.

#### Acceptance Criteria

1. WHEN a new user registers with email and password, THE System SHALL create an account using Amazon Cognito
2. WHEN a user logs in with valid credentials, THE System SHALL issue a JWT token for authenticated sessions
3. WHEN a user attempts to access protected resources without authentication, THE System SHALL redirect to the login page
4. WHEN a user's session expires, THE System SHALL require re-authentication
5. THE System SHALL enforce HTTPS for all authentication requests

### Requirement 2: Document Upload and Storage

**User Story:** As a user, I want to upload contracts and invoices securely, so that the system can analyze them for risks.

#### Acceptance Criteria

1. WHEN a user uploads a document, THE System SHALL accept PDF, DOC, DOCX, and image formats (JPG, PNG)
2. WHEN a document is uploaded, THE System SHALL store it in a private S3 bucket with encryption enabled
3. WHEN a document is stored, THE System SHALL generate a pre-signed URL for secure access
4. WHEN a document is 7 days old, THE System SHALL automatically delete it from storage
5. WHEN a document exceeds 10MB, THE System SHALL reject the upload and display an error message
6. THE System SHALL associate each uploaded document with the authenticated user's account

### Requirement 3: Text Extraction from Documents

**User Story:** As a user, I want the system to extract text from my uploaded documents, so that it can analyze the content for risks.

#### Acceptance Criteria

1. WHEN a document is uploaded, THE System SHALL submit it to Amazon Textract for OCR processing
2. WHEN Textract processing completes, THE System SHALL retrieve the extracted text
3. IF Textract processing fails, THEN THE System SHALL log the error and notify the user
4. WHEN text extraction completes, THE System SHALL store the extracted text associated with the document
5. THE System SHALL handle multi-page documents and preserve text structure

### Requirement 4: Contract Risk Analysis

**User Story:** As a user, I want the system to analyze my contracts for legal risks, so that I can identify problematic clauses before signing.

#### Acceptance Criteria

1. WHEN a contract document's text is extracted, THE System SHALL send it to the AI_Service for risk analysis
2. WHEN the AI_Service analyzes a contract, THE System SHALL identify risky clauses, missing protections, and one-sided terms
3. WHEN risks are identified, THE System SHALL generate a Risk_Score between 0 and 100
4. WHEN risks are identified, THE System SHALL provide simplified explanations for each issue
5. WHEN risks are identified, THE System SHALL suggest specific improvements for each issue
6. THE System SHALL highlight the specific clauses or sections containing risks

### Requirement 5: GST and Invoice Compliance Check

**User Story:** As a user, I want the system to check my invoices for GST compliance issues, so that I can avoid penalties and corrections.

#### Acceptance Criteria

1. WHEN an invoice document's text is extracted, THE System SHALL send it to the AI_Service for compliance analysis
2. WHEN the AI_Service analyzes an invoice, THE System SHALL check for required GST fields (GSTIN, invoice number, date, HSN/SAC codes, tax amounts)
3. WHEN compliance issues are found, THE System SHALL generate warnings for each missing or incorrect field
4. WHEN compliance issues are found, THE System SHALL suggest specific corrections
5. WHEN the invoice is compliant, THE System SHALL confirm compliance status
6. THE System SHALL validate invoice structure against GST format requirements

### Requirement 6: Cybersecurity Readiness Assessment

**User Story:** As a user, I want to assess my business's cybersecurity practices, so that I can understand and improve my security posture.

#### Acceptance Criteria

1. WHEN a user accesses the security assessment, THE System SHALL display a Security_Questionnaire
2. THE Security_Questionnaire SHALL include questions about password practices, device usage, data storage, and access control
3. WHEN a user completes the questionnaire, THE System SHALL evaluate responses against security best practices
4. WHEN evaluation completes, THE System SHALL generate a security Risk_Score between 0 and 100
5. WHEN evaluation completes, THE System SHALL provide specific recommendations for improvement (MFA, device security, etc.)
6. THE System SHALL prioritize recommendations by risk severity

### Requirement 7: Risk Scoring System

**User Story:** As a user, I want to see clear risk scores for each assessment, so that I can quickly understand the severity of issues.

#### Acceptance Criteria

1. WHEN any risk analysis completes, THE System SHALL calculate a Risk_Score between 0 and 100
2. THE System SHALL use consistent scoring methodology across all risk types (legal, GST, security)
3. WHEN displaying a Risk_Score, THE System SHALL include a severity indicator (Low: 0-33, Medium: 34-66, High: 67-100)
4. WHEN multiple risks are identified, THE System SHALL calculate an overall composite score
5. THE System SHALL store all Risk_Scores with timestamps for historical tracking

### Requirement 8: Dashboard and Results Display

**User Story:** As a user, I want to view all my risk assessments in one place, so that I can track and prioritize actions.

#### Acceptance Criteria

1. WHEN a user accesses the Dashboard, THE System SHALL display all completed risk assessments
2. WHEN displaying assessments, THE System SHALL show Risk_Scores, identified issues, and recommendations
3. WHEN displaying assessments, THE System SHALL organize Action_Items by priority
4. THE Dashboard SHALL display separate sections for contract risks, GST issues, and security risks
5. WHEN a user selects an assessment, THE System SHALL display detailed findings and explanations
6. THE Dashboard SHALL update in real-time as new assessments complete

### Requirement 9: Report Generation and Export

**User Story:** As a user, I want to export my risk assessment results, so that I can share them with advisors or keep records.

#### Acceptance Criteria

1. WHEN a user requests a report, THE System SHALL generate a summary of all risk assessments
2. THE Report SHALL include all Risk_Scores, identified issues, and recommendations
3. WHEN generating a report, THE System SHALL format it as a downloadable PDF
4. THE Report SHALL include the user's business name and assessment date
5. WHEN a report is generated, THE System SHALL make it available for download within 30 seconds

### Requirement 10: AI Service Integration

**User Story:** As a system administrator, I want the platform to integrate with external AI services, so that we can leverage advanced language models for risk analysis.

#### Acceptance Criteria

1. THE System SHALL integrate with OpenAI or Claude API for text analysis
2. WHEN sending data to the AI_Service, THE System SHALL include appropriate prompts for risk detection
3. WHEN the AI_Service returns analysis, THE System SHALL parse and structure the results
4. IF the AI_Service request fails, THEN THE System SHALL retry up to 3 times with exponential backoff
5. IF all retries fail, THEN THE System SHALL log the error and notify the user
6. THE System SHALL implement rate limiting to stay within API quotas

### Requirement 11: Data Privacy and Security

**User Story:** As a user, I want my business documents and data to be secure, so that sensitive information remains confidential.

#### Acceptance Criteria

1. THE System SHALL encrypt all data at rest in S3 and RDS using AWS encryption
2. THE System SHALL encrypt all data in transit using TLS 1.2 or higher
3. WHEN storing documents, THE System SHALL ensure they are only accessible by the owning user
4. THE System SHALL deploy backend Lambda functions in private subnets
5. THE System SHALL configure security groups to restrict traffic to necessary ports only
6. THE System SHALL not expose database endpoints to the public internet
7. WHEN a user deletes their account, THE System SHALL permanently delete all associated documents and data

### Requirement 12: Error Handling and User Feedback

**User Story:** As a user, I want clear feedback when errors occur, so that I understand what went wrong and what to do next.

#### Acceptance Criteria

1. WHEN an error occurs during document upload, THE System SHALL display a specific error message
2. WHEN OCR processing fails, THE System SHALL notify the user and suggest re-uploading
3. WHEN AI analysis fails, THE System SHALL notify the user and offer to retry
4. WHEN network errors occur, THE System SHALL display a user-friendly message
5. THE System SHALL log all errors with sufficient detail for debugging
6. WHEN operations are in progress, THE System SHALL display loading indicators

### Requirement 13: Performance and Scalability

**User Story:** As a user, I want the platform to respond quickly, so that I can get risk assessments without long waits.

#### Acceptance Criteria

1. WHEN a user uploads a document, THE System SHALL acknowledge receipt within 2 seconds
2. WHEN processing a document under 5 pages, THE System SHALL complete analysis within 30 seconds
3. WHEN multiple users access the platform simultaneously, THE System SHALL maintain response times
4. THE System SHALL use serverless architecture (Lambda) to scale automatically with demand
5. WHEN displaying the Dashboard, THE System SHALL load within 3 seconds
