# NIA Sales Assistant - FastAPI Backend

A production-ready FastAPI backend service that integrates with Supabase for lead and meeting management, featuring Microsoft Teams integration and Creatio CRM sync.

## 🚀 Features

- **Lead Management**: Create, read, update leads with CRM integration
- **Meeting Management**: Sync meetings from Microsoft Teams calendar
- **Microsoft Teams Integration**: OAuth2 flow, meeting sync, transcript placeholders
- **Creatio CRM Integration**: Bi-directional lead synchronization
- **Authentication**: JWT-based auth with Supabase
- **Real-time Updates**: WebSocket support for live data
- **Production Ready**: Logging, error handling, CORS, validation

## 📋 Prerequisites

- Python 3.8+
- Supabase account and project
- Microsoft Azure App Registration (for Teams integration)
- Creatio CRM instance (optional)

## 🛠️ Setup

### 1. Install Dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 2. Database Setup

Run the database migrations in your Supabase SQL editor:

```bash
# Run these in order:
database/migrations/001_create_tables.sql
database/migrations/002_add_creatio_fields.sql
database/migrations/003_create_profiles_table.sql
database/migrations/004_add_teams_integration.sql
```

### 3. Microsoft Teams Setup

1. **Create Azure App Registration:**
   - Go to [Azure Portal](https://portal.azure.com/#blade/Microsoft_AAD_RegisteredApps/ApplicationsListBlade)
   - Click "New registration"
   - Name: "NIA Sales Assistant"
   - Redirect URI: `http://localhost:3000/integrations/teams/callback`
   - Note down the Application (client) ID

2. **Configure App Permissions:**
   - Go to "API permissions"
   - Add permissions: `Calendars.Read`, `User.Read`
   - Grant admin consent

3. **Create Client Secret:**
   - Go to "Certificates & secrets"
   - Create new client secret
   - Note down the secret value

### 4. Environment Configuration

Create/update `backend/.env`:

```env
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
JWT_SECRET=your-jwt-secret

# Microsoft Teams/Graph API Configuration
MICROSOFT_CLIENT_ID=your-azure-app-client-id
MICROSOFT_CLIENT_SECRET=your-azure-app-client-secret
MICROSOFT_TENANT_ID=common

# Frontend URL for OAuth redirects
FRONTEND_URL=http://localhost:3000
```

### 5. Run the Server

```bash
# Development
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Production
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

The API will be available at `http://localhost:8000`

## 📚 API Documentation

Once running, visit:
- **Swagger UI**: `http://localhost:8000/docs`
- **ReDoc**: `http://localhost:8000/redoc`

## 🏗️ Project Structure

```
backend/
├── app/
│   ├── main.py                 # FastAPI app entry point
│   ├── core/
│   │   ├── config.py          # Environment config & settings
│   │   └── auth.py            # JWT authentication middleware
│   ├── routers/
│   │   ├── auth.py            # User authentication endpoints
│   │   ├── leads.py           # Lead management endpoints
│   │   ├── meetings.py        # Meeting management & Teams sync
│   │   ├── teams_auth.py      # Microsoft Teams OAuth flow
│   │   ├── integrations.py    # Creatio CRM integration
│   │   └── ai.py              # AI processing (placeholders)
│   ├── services/
│   │   ├── graph.py           # Microsoft Graph API wrapper
│   │   ├── creatio.py         # Creatio CRM service
│   │   └── supabase.py        # Supabase utilities
│   ├── models/
│   │   └── schemas.py         # Pydantic models & validation
│   └── utils/                 # Helper functions
├── requirements.txt
└── .env
```

## 🔌 API Endpoints

### Authentication
- `GET /auth/me` - Get current user info
- `POST /auth/teams/login` - Initiate Teams OAuth flow
- `GET /auth/teams/callback` - Handle Teams OAuth callback
- `GET /auth/teams/status` - Check Teams connection status
- `DELETE /auth/teams/disconnect` - Disconnect Teams

### Leads
- `GET /leads` - Get all leads for user
- `POST /leads` - Create new lead
- `GET /leads/{id}` - Get lead details with meetings

### Meetings
- `GET /meetings` - Get all meetings for user
- `POST /meetings` - Create new meeting
- `GET /meetings/sync` - Sync meetings from Teams calendar
- `GET /meetings/transcript/{id}` - Get meeting transcript (placeholder)
- `POST /meetings/summarize/{id}` - Generate AI summary (placeholder)

### Integrations
- `POST /integrations/creatio/config` - Save Creatio configuration
- `GET /integrations/creatio/config` - Get Creatio configuration
- `POST /integrations/creatio/sync-leads` - Sync leads from Creatio CRM

### AI (Placeholders)
- `POST /ai/summarize` - Summarize transcript text

## 🔗 Frontend Integration

From your Next.js app, call the API with Supabase JWT:

```javascript
const { data: { session } } = await supabase.auth.getSession()
const response = await fetch("http://localhost:8000/meetings/sync", {
  headers: {
    "Authorization": `Bearer ${session?.access_token}`
  }
})
```

## 🔧 Microsoft Teams Integration

### How It Works

1. **OAuth Flow**: User clicks "Connect Teams" → redirected to Microsoft login
2. **Token Exchange**: Backend exchanges auth code for access/refresh tokens
3. **Meeting Sync**: Fetch upcoming meetings from Microsoft Graph API
4. **Data Storage**: Store meetings with Teams event IDs for deduplication

### Features

- ✅ OAuth2 authentication with Microsoft
- ✅ Automatic token refresh
- ✅ Meeting sync from Teams calendar
- ✅ Meeting details (subject, time, duration, join link)
- 🔄 Transcript fetching (placeholder - API not yet available)
- 🔄 AI summarization (placeholder)

### Database Schema

```sql
-- Teams configuration per user
teams_configs (
  id, user_id, microsoft_access_token, 
  microsoft_refresh_token, microsoft_token_expires_at
)

-- Meetings with Teams integration
meetings (
  id, user_id, lead_id, subject, meeting_time,
  meeting_link, duration, event_id, -- event_id from Teams
  transcript, summary
)

-- Separate tables for transcripts and summaries
transcripts (id, meeting_id, user_id, content, source)
summaries (id, meeting_id, user_id, content, ai_model)
```

## 🏢 Creatio CRM Integration

### Setup

1. **Configure OAuth in Creatio:**
   - Create OAuth application in your Creatio instance
   - Note Client ID and Client Secret
   - Ensure access to Lead entity

2. **Configure in Frontend:**
   - Go to `/integrations` page
   - Fill in Creatio configuration
   - Click "Sync Leads"

### How It Works

1. **Authentication**: OAuth 2.0 client credentials flow
2. **Data Fetching**: Query Creatio OData API with owner filter
3. **Sync Logic**: Update existing leads or create new ones
4. **Deduplication**: Use `external_id` to track Creatio leads

## 🚀 Production Deployment

### Using Docker

```dockerfile
FROM python:3.9-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY app/ ./app/
EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Using Railway/Heroku

1. Set environment variables in platform
2. Use `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
3. Ensure CORS allows your frontend domain

### Environment Variables for Production

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
JWT_SECRET=your-strong-jwt-secret
MICROSOFT_CLIENT_ID=your-azure-app-id
MICROSOFT_CLIENT_SECRET=your-azure-app-secret
FRONTEND_URL=https://your-frontend-domain.com
```

## 🔍 Troubleshooting

### Common Issues

1. **Teams OAuth fails**: Check redirect URI matches Azure app registration
2. **Token expired**: Tokens auto-refresh, but check network connectivity
3. **CORS errors**: Ensure frontend URL is in CORS origins
4. **Database errors**: Verify all migrations are applied

### Logs

```bash
# Enable debug logging
export LOG_LEVEL=DEBUG
uvicorn app.main:app --reload --log-level debug
```

## 🧪 Testing

```bash
# Run tests (when implemented)
pytest

# Test API endpoints
curl -H "Authorization: Bearer YOUR_JWT" http://localhost:8000/meetings/
```

## 📈 Monitoring

- Health check: `GET /health`
- Metrics: `GET /metrics` (when implemented)
- Logs: Structured JSON logging for production

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Add tests for new features
4. Submit pull request

## 📄 License

MIT License - see LICENSE file for details