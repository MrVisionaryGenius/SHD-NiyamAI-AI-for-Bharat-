# NiyamAI Risk Checker

AI-powered risk analysis platform for small businesses in India. Analyzes contracts, invoices, and cybersecurity practices to identify legal, GST compliance, and security risks.

## Project Structure

```
.
├── app/                      # Next.js app directory
│   ├── layout.tsx           # Root layout
│   ├── page.tsx             # Home page
│   └── globals.css          # Global styles
├── backend/                  # Backend Lambda functions
│   ├── lambdas/
│   │   ├── auth/            # Authentication Lambda
│   │   ├── upload/          # Document upload Lambda
│   │   ├── analysis/        # Risk analysis Lambda
│   │   └── report/          # Report generation Lambda
│   └── serverless.yml       # Serverless Framework config
├── components/              # React components (to be added)
├── lib/                     # Shared utilities
│   ├── api-client.ts       # Frontend API client
│   ├── db.ts               # Database connection pool
│   └── logger.ts           # Logging utility
├── types/                   # TypeScript type definitions
│   └── index.ts            # Shared types
├── .env.example            # Environment variables template
├── .env.local              # Local environment variables
├── next.config.js          # Next.js configuration
├── tsconfig.json           # TypeScript configuration (strict mode)
├── vitest.config.ts        # Vitest configuration
├── tailwind.config.ts      # Tailwind CSS configuration
└── package.json            # Dependencies and scripts

```

## Tech Stack

### Frontend
- **Next.js 14** - React framework with App Router
- **TypeScript** - Type-safe development (strict mode enabled)
- **Tailwind CSS** - Utility-first CSS framework
- **AWS Amplify** - Authentication and API integration

### Backend
- **AWS Lambda** - Serverless compute
- **API Gateway** - REST API endpoints
- **Amazon Cognito** - User authentication
- **Amazon S3** - Document storage with encryption
- **Amazon Textract** - OCR text extraction
- **PostgreSQL (RDS)** - Relational database
- **Serverless Framework** - Infrastructure as code

### Testing
- **Vitest** - Unit testing framework
- **fast-check** - Property-based testing library

### External Services
- **OpenAI/Claude API** - AI-powered risk analysis

## Getting Started

### Prerequisites
- Node.js 20.x or higher
- npm or yarn
- AWS account with appropriate permissions
- PostgreSQL database (local or RDS)

### Installation

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env.local
# Edit .env.local with your configuration
```

3. Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

### Backend Deployment

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install Serverless Framework globally (if not already installed):
```bash
npm install -g serverless
```

3. Deploy to AWS:
```bash
serverless deploy --stage dev
```

## Available Scripts

- `npm run dev` - Start Next.js development server
- `npm run build` - Build production application
- `npm start` - Start production server
- `npm run lint` - Run ESLint
- `npm test` - Run tests with Vitest
- `npm run test:watch` - Run tests in watch mode

## Environment Variables

See `.env.example` for required environment variables:
- AWS credentials and region
- Database connection details
- Cognito user pool configuration
- S3 bucket name
- AI API key and endpoint
- Next.js public API URL

## Features

- **User Authentication** - Secure registration and login with Amazon Cognito
- **Document Upload** - Upload contracts and invoices (PDF, DOC, DOCX, images)
- **Text Extraction** - Automatic OCR with Amazon Textract
- **Contract Risk Analysis** - AI-powered identification of risky clauses
- **GST Compliance Check** - Validate invoices against GST requirements
- **Security Assessment** - Questionnaire-based cybersecurity evaluation
- **Risk Scoring** - Consistent 0-100 scoring across all risk types
- **Dashboard** - Centralized view of all assessments and recommendations
- **Report Generation** - Export risk assessments as PDF

## Security

- All data encrypted at rest (S3, RDS)
- All data encrypted in transit (TLS 1.2+)
- Lambda functions deployed in private subnets
- No public database access
- Automatic document deletion after 7 days
- User-based access control

## License

This project is for hackathon/prototype purposes.
