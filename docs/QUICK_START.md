# Document AI Platform - Quick Start Guide

## Prerequisites

Before running the application, ensure you have:

1. **Node.js 18+** - Download from https://nodejs.org
2. **PostgreSQL 15+** - Download from https://www.postgresql.org/download/windows/
3. **Git** - Download from https://git-scm.com/download/windows
4. **OpenAI API Key** or **Anthropic API Key** for AI agents

## Quick Setup (Windows)

### Step 1: Install Dependencies

Open PowerShell or Command Prompt in the project directory and run:

```bash
npm install
```

### Step 2: Configure PostgreSQL

1. Start PostgreSQL service
2. Open pgAdmin or psql and create database:

```sql
CREATE DATABASE docai_db;
CREATE USER docai_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE docai_db TO docai_user;
```

### Step 3: Configure Environment

Copy the example environment file:

```bash
copy .env.example .env.local
```

Edit `.env.local` with your values:

```env
DATABASE_URL="postgresql://docai_user:your_password@localhost:5432/docai_db"
NEXTAUTH_SECRET="generate-random-secret-here"
NEXTAUTH_URL="http://localhost:3000"
OPENAI_API_KEY="sk-your-openai-key"
```

To generate a secret:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Step 4: Initialize Database

```bash
npx prisma generate
npx prisma db push
npx prisma db seed
```

### Step 5: Start Development Server

```bash
npm run dev
```

Open http://localhost:3000 in your browser.

## Default Login Credentials

For demo/testing:
- Email: admin@vanmerven.com
- Password: admin123

Or use "Continue to Demo" to bypass authentication.

## Quick Usage Guide

### 1. Add a Party

1. Navigate to **Parties** in the sidebar
2. Click **Add Party**
3. Fill in party information
4. Click **Create Party**

### 2. Run Party Profile (LEXA Agent)

1. Open the party detail page
2. Click **Run Party Profile (LEXA)**
3. Wait for the AI agent to analyze and create party profile
4. View the assigned priority tier and review score

### 3. Run Document Review (CLARA Agent)

For Critical/High priority parties:
1. On the party detail page, click **Run Document Review (CLARA)**
2. The agent performs detailed multi-dimensional document review
3. View comprehensive review scores and recommendations

### 4. Upload Documents

1. Navigate to **Documents**
2. Upload legal documents (SOC2, penetration tests, etc.)
3. Run ARIA agent for AI-powered analysis
4. View extracted issues

### 5. View Dashboard

The main dashboard shows:
- Overall party priority distribution
- Open issues count
- AI agent activity
- Alerts and notifications

## API Reference

### Orchestrator API (Full Workflow)

```bash
# Onboard a new party (runs LEXA -> CLARA -> DORA -> RITA)
POST /api/orchestrator
{
  "partyId": "party-id",
  "dataTypesAccessed": ["Customer Data", "PII"],
  "hasPiiAccess": true,
  "businessCriticality": "BUSINESS_CRITICAL"
}

# Process a document (runs ARIA -> ATLAS -> RITA)
PUT /api/orchestrator
{
  "partyId": "party-id",
  "documentId": "document-id",
  "documentContent": "Document text content..."
}

# Run maintenance cycle
PATCH /api/orchestrator
```

### Individual Agent APIs

```bash
# LEXA - Party Profiling
POST /api/agents/lexa

# CLARA - Document Review
POST /api/agents/clara

# ARIA - Document Analysis
POST /api/agents/aria

# RITA - Report Generation
POST /api/agents/rita
GET /api/agents/rita  # Dashboard data

# ATLAS - Action Items
POST /api/agents/atlas
PUT /api/agents/atlas   # Risk acceptance
GET /api/agents/atlas   # Check overdue
```

## AI Agent Summary

| Agent | Purpose | Trigger |
|-------|---------|---------|
| **LEXA** | Party profiling | New party registration |
| **CLARA** | Document review | Critical/High priority party |
| **DORA** | Document collection | Review initiated |
| **ARIA** | Document analysis | Documents received |
| **RITA** | Report generation | Analysis complete |
| **ATLAS** | Action item management | Issues identified |

## Troubleshooting

### Database Connection Error
- Verify PostgreSQL is running
- Check DATABASE_URL in .env.local
- Run `npx prisma db push` again

### AI Agent Not Working
- Verify OPENAI_API_KEY or ANTHROPIC_API_KEY is set
- Check API key has sufficient credits
- Review console for error messages

### Build Errors
```bash
# Clear cache and reinstall
rm -rf node_modules .next
npm install
npm run dev
```

## Project Structure

```
document-ai-platform/
├── src/
│   ├── app/           # Next.js pages and API routes
│   ├── components/    # React components
│   └── lib/
│       └── agents/    # AI agent implementations
├── prisma/            # Database schema
├── docs/              # Documentation
└── public/            # Static assets
```

## Support

For issues or questions, refer to:
- `docs/tprm-architecture.md` - Complete architecture documentation
- API logs in browser console
- Prisma Studio: `npx prisma studio`
