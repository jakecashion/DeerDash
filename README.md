# DeerDash - Deer Pattern Analysis

A web application for analyzing trail camera photos to detect deer activity patterns using AWS Rekognition.

## Architecture

```
frontend/          React + Vite + TypeScript (hosted on Vercel)
backend/           AWS SAM (Lambda + S3 + DynamoDB + Rekognition)
```

## Prerequisites

- Node.js 20+
- AWS CLI v2
- AWS SAM CLI
- A Clerk account (free tier)
- An AWS account (free tier)

## AWS Setup

### 1. Install AWS CLI & SAM CLI

```bash
# macOS
brew install awscli aws-sam-cli
```

### 2. Configure AWS Credentials

Create an IAM user with programmatic access. Attach the following managed policies:

- `AmazonS3FullAccess`
- `AmazonDynamoDBFullAccess`
- `AmazonRekognitionReadOnlyAccess`
- `AWSLambda_FullAccess`
- `AmazonAPIGatewayAdministrator`
- `AWSCloudFormationFullAccess`
- `IAMFullAccess` (required for SAM to create Lambda execution roles)

Then configure your local credentials:

```bash
aws configure
# AWS Access Key ID: <your-key>
# AWS Secret Access Key: <your-secret>
# Default region: us-east-1
# Default output format: json
```

> **Tip:** For production, scope these policies down to least-privilege. The broad policies above are for development convenience only.

### 3. Deploy the Backend

```bash
cd backend
npm install
sam build
sam deploy --guided
```

SAM will prompt you for a stack name (use `deerdash`) and region. Accept the defaults for everything else. After deployment, note the **ApiUrl** and **BucketName** from the outputs.

### 4. Set Up the Frontend

```bash
cd frontend
npm install
```

Create a `.env.local` file:

```env
VITE_API_URL=<ApiUrl from SAM output>
VITE_S3_BUCKET=<BucketName from SAM output>
VITE_CLERK_PUBLISHABLE_KEY=<your Clerk publishable key>
```

Start the dev server:

```bash
npm run dev
```

### 5. Clerk Authentication

1. Create an application at [clerk.com](https://clerk.com).
2. Copy the **Publishable Key** into your `.env.local`.
3. No backend Clerk config is needed for the MVP — auth is enforced client-side.

## Environment Variables Reference

| Variable | Location | Description |
|---|---|---|
| `VITE_API_URL` | Frontend `.env.local` | API Gateway base URL |
| `VITE_S3_BUCKET` | Frontend `.env.local` | S3 bucket name for uploads |
| `VITE_CLERK_PUBLISHABLE_KEY` | Frontend `.env.local` | Clerk publishable key |
| `TABLE_NAME` | Backend (auto-set by SAM) | DynamoDB table name |
| `BUCKET_NAME` | Backend (auto-set by SAM) | S3 bucket name |

## Development

```bash
# Frontend
cd frontend && npm run dev

# Backend (local API simulation)
cd backend && sam local start-api
```

## Testing

```bash
# Backend unit tests (data processing logic)
cd backend && npm test
```
