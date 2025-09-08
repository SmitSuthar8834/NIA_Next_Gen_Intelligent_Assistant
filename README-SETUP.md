# Lead Management System Setup

A complete lead management system with Next.js frontend, FastAPI backend, and Supabase database.

## Quick Start

### Prerequisites
- Node.js 18+ and npm/pnpm
- Python 3.10+
- Supabase account

### 1. Install Dependencies

**Frontend:**
```bash
npm install
# or
pnpm install
```

**Backend:**
```bash
cd backend
pip install -r requirements.txt
```

### 2. Environment Setup

**Frontend (.env.local):**
```bash
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

**Backend (backend/.env):**
```bash
SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
JWT_SECRET=your-jwt-secret
```

### 3. Database Setup

Run the SQL migration in your Supabase SQL editor:
```sql
-- Copy and paste the contents of database/migrations/001_create_tables.sql
```

### 4. Start Development Servers

**Option 1: Start both servers with one command**
```bash
npm run dev:full
```

**Option 2: Start servers separately**

Terminal 1 (Frontend):
```bash
npm run dev
```

Terminal 2 (Backend):
```bash
npm run dev:backend
```



## Access Points

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs

## Features

### Pages Available
- `/leads` - View and manage leads
- `/integrations` - Configure Creatio CRM integration
- `/meetings` - Manage meetings (via API)

### API Endpoints
- `GET /leads` - Fetch user's leads
- `POST /leads` - Create new lead
- `GET /leads/{id}` - Get lead details with meetings
- `GET /meetings` - Fetch user's meetings
- `POST /meetings` - Create new meeting
- `POST /integrations/creatio/config` - Save Creatio config
- `GET /integrations/creatio/config` - Get Creatio config
- `POST /integrations/creatio/sync-leads` - Sync leads from Creatio

## Creatio Integration

1. Go to `/integrations` in your frontend
2. Configure your Creatio OAuth credentials:
   - Base URL: Your Creatio instance (e.g., `https://mycreatio.com`)
   - Identity Service URL: OAuth service URL
   - Client ID & Secret: From your Creatio OAuth app
   - Collection Name: Usually `LeadCollection`
3. Click "Sync Leads" to import leads where you're the owner

## Troubleshooting

**Backend not starting?**
- Ensure Python 3.10+ is installed
- Install uvicorn: `pip install uvicorn`
- Check if port 8000 is available

**Frontend not connecting to backend?**
- Ensure backend is running on port 8000
- Check CORS settings in `backend/app/main.py`

**Database errors?**
- Verify Supabase credentials in .env files
- Run the database migration SQL
- Check RLS policies are enabled

## Development Notes

- Frontend uses Next.js 15 with App Router
- Backend uses FastAPI with Supabase Python client
- Authentication handled via Supabase JWT tokens
- CORS configured for localhost:3000 → localhost:8000