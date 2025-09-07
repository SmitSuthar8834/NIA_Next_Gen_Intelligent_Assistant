# NIA Dashboard Architecture

## Frontend Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Next.js App Router                       │
├─────────────────────────────────────────────────────────────┤
│  app/                                                       │
│  ├── layout.tsx (Root Layout)                              │
│  ├── (app)/                                                │
│  │   ├── layout.tsx (App Layout)                           │
│  │   ├── page.tsx (Dashboard)                              │
│  │   ├── profile/page.tsx                                  │
│  │   ├── leads/page.tsx                                    │
│  │   └── integrations/page.tsx                             │
│  └── (auth)/                                               │
│      ├── login/page.tsx                                    │
│      └── signup/page.tsx                                   │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    State Management                         │
├─────────────────────────────────────────────────────────────┤
│  stores/                                                    │
│  ├── userStore.ts (Zustand + Persist)                      │
│  └── integrationsStore.ts                                  │
│                                                             │
│  hooks/                                                     │
│  ├── useUser.ts (Lightweight selectors)                    │
│  ├── useProfile.ts                                         │
│  └── use-realtime-data.ts                                  │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    Components Layer                         │
├─────────────────────────────────────────────────────────────┤
│  components/                                                │
│  ├── ui/ (Shadcn/ui components)                            │
│  ├── layout/ (Layout components)                           │
│  ├── navigation/ (Navigation components)                   │
│  └── forms/ (Form components)                              │
└─────────────────────────────────────────────────────────────┘
```

## Backend Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    FastAPI Backend                          │
├─────────────────────────────────────────────────────────────┤
│  backend/app/                                               │
│  ├── main.py (FastAPI app)                                 │
│  ├── routers/                                              │
│  │   ├── leads.py                                          │
│  │   ├── meetings.py                                       │
│  │   └── integrations.py                                   │
│  ├── services/                                             │
│  │   ├── creatio.py                                        │
│  │   └── supabase.py                                       │
│  └── models/                                               │
│      └── schemas.py                                        │
└─────────────────────────────────────────────────────────────┘
```

## Database Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Supabase Database                        │
├─────────────────────────────────────────────────────────────┤
│  Tables:                                                    │
│  ├── auth.users (Supabase Auth)                            │
│  ├── profiles (User profiles)                              │
│  ├── leads (Lead data)                                     │
│  ├── meetings (Meeting data)                               │
│  └── creatio_configs (Integration configs)                 │
│                                                             │
│  Storage:                                                   │
│  └── avatars/ (Profile pictures)                           │
│                                                             │
│  RLS Policies:                                              │
│  ├── Users can only access their own data                  │
│  └── Secure file upload policies                           │
└─────────────────────────────────────────────────────────────┘
```

## Data Flow

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Browser   │───▶│  Next.js    │───▶│  Supabase   │───▶│  Database   │
│             │    │  Frontend   │    │  Client     │    │             │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
       │                   │                   │                   │
       │                   ▼                   ▼                   │
       │            ┌─────────────┐    ┌─────────────┐              │
       │            │  Zustand    │    │  Real-time  │              │
       │            │  Store      │    │  Subscr.    │              │
       │            └─────────────┘    └─────────────┘              │
       │                   │                   │                   │
       └───────────────────┼───────────────────┼───────────────────┘
                           │                   │
                           ▼                   ▼
                    ┌─────────────┐    ┌─────────────┐
                    │  Local      │    │  FastAPI    │
                    │  Storage    │    │  Backend    │
                    └─────────────┘    └─────────────┘
```

## Performance Optimizations

### 1. **Zustand Store with Persistence**
- ✅ Local storage caching
- ✅ Selective subscriptions
- ✅ Optimistic updates
- ✅ Background data loading

### 2. **Lightweight Hooks**
- ✅ `useUser()` - Only user data
- ✅ `useProfile()` - Only profile data
- ✅ `useFullUser()` - Complete state
- ✅ Shallow comparison to prevent re-renders

### 3. **Database Optimizations**
- ✅ RLS policies for security
- ✅ Proper indexing
- ✅ Single query profile loading
- ✅ Optimistic UI updates

### 4. **Caching Strategy**
- ✅ Browser localStorage for user data
- ✅ Skip redundant API calls
- ✅ Background refresh on auth changes
- ✅ Immediate UI updates

## Performance Issues Fixed

### Before:
- ❌ Multiple database calls per page load
- ❌ Blocking initialization
- ❌ No caching
- ❌ Complex context providers
- ❌ Unnecessary re-renders

### After:
- ✅ Single database call with caching
- ✅ Non-blocking initialization
- ✅ Persistent local storage
- ✅ Simple Zustand store
- ✅ Selective subscriptions

## Error Handling

### User Store Errors:
- ✅ Graceful profile creation
- ✅ Network error recovery
- ✅ Clear error messages
- ✅ Fallback states

### UI Error Handling:
- ✅ Loading states
- ✅ Error boundaries
- ✅ Retry mechanisms
- ✅ User feedback

## Security

### Authentication:
- ✅ Supabase Auth integration
- ✅ JWT token validation
- ✅ Automatic session refresh

### Authorization:
- ✅ Row Level Security (RLS)
- ✅ User-specific data access
- ✅ Secure file uploads
- ✅ API endpoint protection

## Deployment Architecture

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Vercel    │    │   Railway   │    │  Supabase   │
│  (Frontend) │    │  (Backend)  │    │ (Database)  │
│             │    │             │    │             │
│  Next.js    │───▶│  FastAPI    │───▶│ PostgreSQL  │
│  Static     │    │  Python     │    │ Auth        │
│  Assets     │    │  API        │    │ Storage     │
└─────────────┘    └─────────────┘    └─────────────┘
```

This architecture provides:
- **Fast page loads** with caching and optimizations
- **Real-time updates** with Supabase subscriptions
- **Secure data access** with RLS policies
- **Scalable state management** with Zustand
- **Error resilience** with proper error handling