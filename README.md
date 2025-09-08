# NIA Sales Assistant

A comprehensive sales assistant application with lead management, meeting synchronization, and CRM integrations.

## 🚀 Features

- **Lead Management**: Create, track, and manage sales leads
- **Meeting Management**: Sync meetings from Microsoft Teams calendar
- **Microsoft Teams Integration**: OAuth2 authentication and meeting sync
- **Creatio CRM Integration**: Bi-directional lead synchronization
- **Real-time Updates**: Live data synchronization with Supabase
- **Modern UI**: Built with Next.js 14, Tailwind CSS, and shadcn/ui

## 🏗️ Architecture

- **Frontend**: Next.js 14 with App Router, TypeScript, Tailwind CSS
- **Backend**: FastAPI with Python, Microsoft Graph API integration
- **Database**: Supabase (PostgreSQL) with Row Level Security
- **Authentication**: Supabase Auth with JWT tokens
- **State Management**: Zustand with persistence

## 📋 Prerequisites

- Node.js 18+
- Python 3.8+
- Supabase account and project
- Microsoft Azure App Registration (for Teams integration)
- Creatio CRM instance (optional)

## 🛠️ Quick Start

### 1. Clone and Install

```bash
git clone <repository-url>
cd nia-sales-assistant

# Install frontend dependencies
npm install

# Install backend dependencies
cd backend
pip install -r requirements.txt
```

### 2. Database Setup

Run the database migrations in your Supabase SQL editor:

```sql
-- Run these in order:
database/migrations/001_create_tables.sql
database/migrations/002_add_creatio_fields.sql
database/migrations/003_create_profiles_table.sql
database/migrations/004_add_teams_integration.sql
```

### 3. Environment Configuration

**Frontend** - Create `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

**Backend** - Create `backend/.env`:
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
JWT_SECRET=your-jwt-secret
MICROSOFT_CLIENT_ID=your-azure-app-client-id
MICROSOFT_CLIENT_SECRET=your-azure-app-client-secret
FRONTEND_URL=http://localhost:3000
```

### 4. Microsoft Teams Setup

1. **Create Azure App Registration:**
   - Go to [Azure Portal](https://portal.azure.com/#blade/Microsoft_AAD_RegisteredApps/ApplicationsListBlade)
   - Create new registration: "NIA Sales Assistant"
   - Redirect URI: `http://localhost:3000/integrations/teams/callback`
   - Note the Application (client) ID

2. **Configure Permissions:**
   - Add API permissions: `Calendars.Read`, `User.Read`
   - Grant admin consent

3. **Create Client Secret:**
   - Generate new client secret
   - Add to backend `.env` file

### 5. Run the Application

**Start Backend:**
```bash
cd backend
uvicorn app.main:app --reload
```

**Start Frontend:**
```bash
npm run dev
```

Visit:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs

## 📱 Usage

### Microsoft Teams Integration

1. **Connect Teams Account:**
   - Go to `/integrations` page
   - Click "Connect Microsoft Teams"
   - Complete OAuth flow

2. **Sync Meetings:**
   - Click "Sync Meetings" to import from Teams calendar
   - Meetings appear in `/meetings` page
   - Automatic deduplication based on event IDs

3. **Meeting Features:**
   - View upcoming and past meetings
   - Access meeting join links
   - Transcript and summary placeholders (future features)

### Creatio CRM Integration

1. **Configure Creatio:**
   - Go to `/integrations` page
   - Fill in Creatio OAuth credentials
   - Set collection name (usually "Lead")

2. **Sync Leads:**
   - Click "Sync Leads" to import from Creatio
   - Leads filtered by your email (owner)
   - Automatic deduplication and updates

## 🔌 API Endpoints

### Microsoft Teams
- `POST /auth/teams/login` - Initiate OAuth flow
- `GET /auth/teams/callback` - Handle OAuth callback
- `GET /auth/teams/status` - Check connection status
- `GET /meetings/sync` - Sync meetings from Teams

### Meetings
- `GET /meetings/` - List all meetings
- `GET /meetings/transcript/{id}` - Get transcript (placeholder)
- `POST /meetings/summarize/{id}` - Generate summary (placeholder)

### Leads & CRM
- `GET /leads/` - List all leads
- `POST /integrations/creatio/sync-leads` - Sync from Creatio

## 🗄️ Database Schema

### Core Tables
- `leads` - Lead information with CRM integration
- `meetings` - Meeting data with Teams sync
- `teams_configs` - Microsoft Teams OAuth tokens
- `creatio_configs` - Creatio CRM configuration

### Teams Integration Fields
- `meetings.event_id` - Teams event ID for deduplication
- `meetings.meeting_link` - Teams meeting join URL
- `meetings.meeting_time` - Scheduled meeting time
- `teams_configs.microsoft_access_token` - OAuth access token
- `teams_configs.microsoft_refresh_token` - OAuth refresh token

## 🚀 Deployment

### Frontend (Vercel)
```bash
# Deploy to Vercel
vercel --prod

# Set environment variables in Vercel dashboard
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

### Backend (Railway/Heroku)
```bash
# Deploy to Railway
railway deploy

# Set environment variables
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
MICROSOFT_CLIENT_ID=...
MICROSOFT_CLIENT_SECRET=...
FRONTEND_URL=https://your-frontend-domain.com
```

## 🔧 Development

### Project Structure
```
├── app/                    # Next.js app directory
├── components/             # React components
├── hooks/                  # Custom React hooks
├── lib/                    # Utilities and configurations
├── stores/                 # Zustand state management
├── backend/                # FastAPI backend
│   ├── app/
│   │   ├── routers/       # API endpoints
│   │   ├── services/      # Business logic
│   │   └── models/        # Data models
├── database/              # SQL migrations
└── docs/                  # Documentation
```

### Key Components
- `TeamsConfig.tsx` - Microsoft Teams integration UI
- `CreatioConfig.tsx` - Creatio CRM integration UI
- `use-meetings.ts` - Meeting management hook
- `graph.py` - Microsoft Graph API service
- `teams_auth.py` - Teams OAuth endpoints

## 🐛 Troubleshooting

### Common Issues

1. **Teams OAuth fails:**
   - Check redirect URI matches Azure app registration
   - Verify client ID and secret in backend `.env`

2. **Meeting sync fails:**
   - Check Teams connection status
   - Verify token hasn't expired (auto-refresh should handle this)

3. **CORS errors:**
   - Ensure frontend URL is configured in backend CORS settings
   - Check environment variables are loaded correctly

### Debug Mode
```bash
# Backend debug logging
export LOG_LEVEL=DEBUG
uvicorn app.main:app --reload --log-level debug

# Frontend debug
npm run dev
```

## 📚 Documentation

- [Backend API Documentation](backend/README.md)
- [Architecture Overview](ARCHITECTURE.md)
- [Features List](FEATURES.md)
- [Setup Guide](README-SETUP.md)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

For issues and questions:
1. Check the troubleshooting section
2. Review the documentation
3. Create an issue on GitHub
