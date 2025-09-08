# NIA Next Gen Intelligent Assistant - Complete File Documentation

This document provides a comprehensive overview of every file in the project, explaining what each file does and why it's needed.

## 📁 Root Directory Files

### Configuration Files
- **`.env.local`** - Local environment variables (API keys, database URLs, secrets)
- **`.env.local.example`** - Template for environment variables with example values
- **`.gitignore`** - Specifies which files Git should ignore (node_modules, build files, etc.)
- **`components.json`** - Configuration for shadcn/ui component library
- **`next.config.mjs`** - Next.js configuration (build settings, redirects, etc.)
- **`package.json`** - Project dependencies, scripts, and metadata
- **`pnpm-lock.yaml`** - Lock file for pnpm package manager (ensures consistent installs)
- **`tsconfig.json`** - TypeScript configuration (compiler options, paths)
- **`tsconfig.tsbuildinfo`** - TypeScript incremental build cache

### PostCSS Configuration
- **`postcss.config.cjs`** - PostCSS configuration (CommonJS format)
- **`postcss.config.js`** - PostCSS configuration (ES modules)
- **`postcss.config.mjs`** - PostCSS configuration (ES modules with .mjs extension)



### Documentation
- **`README.md`** - Main project documentation and setup instructions
- **`README-SETUP.md`** - Detailed setup instructions
- **`ARCHITECTURE.md`** - System architecture documentation
- **`FEATURES.md`** - Feature list and capabilities
- **`LOCAL-SETUP.md`** - Local development setup guide


### TypeScript Definitions
- **`next-env.d.ts`** - Next.js TypeScript environment definitions

## 📁 App Directory (Next.js 13+ App Router)

### Root App Files
- **`app/globals.css`** - Global CSS styles and Tailwind imports
- **`app/layout.tsx`** - Root layout component (wraps all pages)
- **`app/page.tsx`** - Home page component
- **`app/page.dashboard.tsx`** - Dashboard page component

### App Routes - (app) Group
- **`app/(app)/layout.tsx`** - Layout for authenticated app pages
- **`app/(app)/page.tsx`** - Main dashboard page

#### Integrations
- **`app/(app)/integrations/page.tsx`** - Integrations management page
- **`app/(app)/integrations/teams/callback/page.tsx`** - Microsoft Teams OAuth callback

#### Leads Management
- **`app/(app)/leads/page.tsx`** - Leads listing and management
- **`app/(app)/leads/[id]/page.tsx`** - Individual lead details page
- **`app/(app)/leads/new/page.tsx`** - Create new lead form

#### Meetings
- **`app/(app)/meetings/page.tsx`** - Meetings dashboard and list
- **`app/(app)/meetings/[id]/page.tsx`** - Individual meeting details

#### Other Pages
- **`app/(app)/profile/page.tsx`** - User profile management
- **`app/(app)/settings/page.tsx`** - Application settings
- **`app/(app)/summaries/page.tsx`** - Meeting summaries and reports
- **`app/(app)/test-meeting/page.tsx`** - Meeting testing interface

### Auth Routes - (auth) Group
- **`app/(auth)/login/page.tsx`** - Login page

### Meeting Routes - (meet) Group
- **`app/(meet)/meeting/[id]/page.tsx`** - Live meeting interface



## 📁 Backend Directory (FastAPI Python Server)

### Core Backend Files
- **`backend/.env`** - Backend environment variables
- **`backend/.env.example`** - Backend environment template
- **`backend/Dockerfile`** - Docker image for backend
- **`backend/README.md`** - Backend documentation
- **`backend/requirements.txt`** - Python dependencies
### Main Application
- **`backend/app/__init__.py`** - Python package initialization
- **`backend/app/main.py`** - FastAPI application entry point
- **`backend/app/signaling.py`** - WebRTC signaling server

### Core Configuration
- **`backend/app/core/__init__.py`** - Core package initialization
- **`backend/app/core/auth.py`** - Authentication utilities
- **`backend/app/core/config.py`** - Application configuration

### Data Models
- **`backend/app/models/__init__.py`** - Models package initialization
- **`backend/app/models/README.md`** - Models documentation
- **`backend/app/models/schemas.py`** - Pydantic data schemas
- **`backend/app/models/enhanced_schemas.py`** - Enhanced data schemas
- **`backend/app/models/signaling.py`** - WebRTC signaling models

### API Routes
- **`backend/app/routers/__init__.py`** - Routers package initialization
- **`backend/app/routers/ai.py`** - AI-related API endpoints
- **`backend/app/routers/ai_meetings.py`** - AI meeting management
- **`backend/app/routers/auth.py`** - Authentication endpoints
- **`backend/app/routers/integrations.py`** - Third-party integrations
- **`backend/app/routers/leads.py`** - Lead management endpoints
- **`backend/app/routers/meetings.py`** - Meeting management
- **`backend/app/routers/question_sets.py`** - Question set management
- **`backend/app/routers/real_time_analysis.py`** - Real-time analysis
- **`backend/app/routers/scheduled_meetings.py`** - Meeting scheduling
- **`backend/app/routers/signaling.py`** - WebRTC signaling endpoints
- **`backend/app/routers/teams_auth.py`** - Microsoft Teams authentication
- **`backend/app/routers/voice_ai.py`** - Voice AI integration

### Services
- **`backend/app/services/__init__.py`** - Services package initialization
- **`backend/app/services/ai_meeting_orchestrator.py`** - AI meeting coordination
- **`backend/app/services/ai_voice_participant.py`** - AI voice participant
- **`backend/app/services/creatio.py`** - Creatio CRM integration
- **`backend/app/services/email_service.py`** - Email notifications
- **`backend/app/services/gemini.py`** - Google Gemini AI integration
- **`backend/app/services/graph.py`** - Microsoft Graph API
- **`backend/app/services/meeting_scheduler.py`** - Meeting scheduling logic
- **`backend/app/services/question_service.py`** - Question management
- **`backend/app/services/real_time_analysis.py`** - Real-time analysis
- **`backend/app/services/transcription_service.py`** - Speech transcription
- **`backend/app/services/voice_ai_service.py`** - Voice AI service

### Utilities
- **`backend/app/utils/__init__.py`** - Utilities package initialization



## 📁 Components Directory (React Components)

### Main Components
- **`components/AIMeetingInterface.tsx`** - AI meeting interface component
- **`components/ClientOnly.tsx`** - Client-side only rendering wrapper
- **`components/CreatioConfig.tsx`** - Creatio CRM configuration
- **`components/DebugInfo.tsx`** - Debug information display
- **`components/leads-table.tsx`** - Leads data table
- **`components/meetings-list.tsx`** - Meetings list component
- **`components/PreviewWrapper.tsx`** - Preview wrapper component
- **`components/RequireAuth.tsx`** - Authentication guard component
- **`components/sidebar.tsx`** - Main sidebar navigation
- **`components/summary-card.tsx`** - Summary card component
- **`components/TeamsConfig.tsx`** - Microsoft Teams configuration
- **`components/theme-provider.tsx`** - Theme context provider
- **`components/WebRTCAIMeeting.tsx`** - WebRTC meeting component

### Dashboard Components
- **`components/dashboard/metrics-cards.tsx`** - Dashboard metrics cards
- **`components/dashboard/pipeline-chart.tsx`** - Sales pipeline chart
- **`components/dashboard/realtime-metrics-cards.tsx`** - Real-time metrics
- **`components/dashboard/recent-activity.tsx`** - Recent activity feed
- **`components/dashboard/sales-chart.tsx`** - Sales analytics chart
- **`components/dashboard/top-leads.tsx`** - Top leads display

### Layout Components
- **`components/layout/app-header.tsx`** - Application header
- **`components/layout/dashboard-layout.tsx`** - Dashboard layout wrapper
- **`components/layout/global-app-layout.tsx`** - Global app layout

### Leads Components
- **`components/leads/enhanced-leads-table.tsx`** - Enhanced leads table

### Meeting Components
- **`components/meetings/EmailNotificationSettings.tsx`** - Email settings
- **`components/meetings/enhanced-meetings-list.tsx`** - Enhanced meetings list
- **`components/meetings/EnhancedWebRTCMeeting.tsx`** - Enhanced WebRTC meeting
- **`components/meetings/MeetingCalendarView.tsx`** - Calendar view
- **`components/meetings/MeetingInsights.tsx`** - Meeting insights
- **`components/meetings/MeetingScheduler.tsx`** - Meeting scheduler
- **`components/meetings/MeetingsDashboard.tsx`** - Main meetings dashboard
- **`components/meetings/QuestionSetManager.tsx`** - Question set management
- **`components/meetings/QuickJoinMeeting.tsx`** - Quick join interface
- **`components/meetings/RealTimeTranscription.tsx`** - Live transcription

### Navigation Components
- **`components/navigation/app-sidebar.tsx`** - Application sidebar
- **`components/navigation/collapsible-sidebar.tsx`** - Collapsible sidebar

### UI Components (shadcn/ui)
All files in `components/ui/` are reusable UI components from the shadcn/ui library:
- **`accordion.tsx`** - Collapsible content sections
- **`alert-dialog.tsx`** - Modal alert dialogs
- **`alert.tsx`** - Alert notifications
- **`aspect-ratio.tsx`** - Aspect ratio container
- **`avatar.tsx`** - User avatar component
- **`badge.tsx`** - Status badges
- **`breadcrumb.tsx`** - Navigation breadcrumbs
- **`button.tsx`** - Button component
- **`calendar.tsx`** - Date picker calendar
- **`card.tsx`** - Card container
- **`carousel.tsx`** - Image/content carousel
- **`chart.tsx`** - Chart components
- **`checkbox.tsx`** - Checkbox input
- **`collapsible.tsx`** - Collapsible content
- **`command.tsx`** - Command palette
- **`context-menu.tsx`** - Right-click context menu
- **`dashboard-header.tsx`** - Dashboard header
- **`dialog.tsx`** - Modal dialogs
- **`drawer.tsx`** - Slide-out drawer
- **`dropdown-menu.tsx`** - Dropdown menus
- **`form.tsx`** - Form components
- **`hover-card.tsx`** - Hover popover
- **`input-otp.tsx`** - OTP input field
- **`input.tsx`** - Text input field
- **`label.tsx`** - Form labels
- **`logo.tsx`** - Application logo
- **`menubar.tsx`** - Menu bar
- **`navigation-menu.tsx`** - Navigation menu
- **`pagination.tsx`** - Pagination controls
- **`popover.tsx`** - Popover component
- **`profile-dropdown.tsx`** - User profile dropdown
- **`progress.tsx`** - Progress bar
- **`radio-group.tsx`** - Radio button group
- **`resizable.tsx`** - Resizable panels
- **`scroll-area.tsx`** - Custom scrollbar
- **`select.tsx`** - Select dropdown
- **`separator.tsx`** - Visual separator
- **`sheet.tsx`** - Side sheet
- **`sidebar.tsx`** - Sidebar component
- **`skeleton.tsx`** - Loading skeleton
- **`slider.tsx`** - Range slider
- **`sonner.tsx`** - Toast notifications
- **`switch.tsx`** - Toggle switch
- **`system-status.tsx`** - System status indicator
- **`table.tsx`** - Data table
- **`tabs.tsx`** - Tab navigation
- **`textarea.tsx`** - Multi-line text input
- **`toast.tsx`** - Toast notification
- **`toaster.tsx`** - Toast container
- **`toggle-group.tsx`** - Toggle button group
- **`toggle.tsx`** - Toggle button
- **`tooltip.tsx`** - Tooltip component
- **`use-mobile.tsx`** - Mobile detection hook
- **`use-toast.ts`** - Toast hook

## 📁 Contexts Directory
- **`contexts/IntegrationsContext.tsx`** - Integration state management context

## 📁 Database Directory

### Migrations
- **`database/migration_verification.md`** - Migration verification docs
- **`database/test_migration_syntax.sql`** - Migration syntax testing
- **`database/migrations/001_create_tables.sql`** - Initial table creation
- **`database/migrations/002_add_creatio_fields.sql`** - Creatio integration fields
- **`database/migrations/003_create_profiles_table.sql`** - User profiles table
- **`database/migrations/004_add_teams_integration.sql`** - Teams integration
- **`database/migrations/005_add_ai_features.sql`** - AI features schema
- **`database/migrations/005_add_ai_meetings.sql`** - AI meetings schema
- **`database/migrations/006_fix_meetings_duration.sql`** - Duration field fix
- **`database/migrations/007_enhanced_ai_meetings_schema.sql`** - Enhanced AI schema
- **`database/migrations/008_complete_ai_meeting_system.sql`** - Complete system schema



## 📁 Hooks Directory (React Hooks)
- **`hooks/use-leads.ts`** - Leads data management hook
- **`hooks/use-meetings.ts`** - Meetings data management hook
- **`hooks/use-mobile.ts`** - Mobile device detection hook
- **`hooks/use-realtime-data.ts`** - Real-time data subscription hook
- **`hooks/use-toast.ts`** - Toast notifications hook
- **`hooks/useUser.ts`** - User authentication hook

## 📁 Lib Directory (Utilities & Services)

### Core Utilities
- **`lib/config.ts`** - Application configuration
- **`lib/mock-data.ts`** - Mock data for development
- **`lib/signaling.ts`** - WebRTC signaling client
- **`lib/supabaseClient.ts`** - Supabase client configuration
- **`lib/utils.ts`** - General utility functions

### Services
- **`lib/services/transcription.ts`** - Speech transcription service

### Types
- **`lib/types/webrtc.ts`** - WebRTC type definitions

### WebRTC
- **`lib/webrtc/client.ts`** - WebRTC client implementation
- **`lib/webrtc/enhanced-meeting-manager.ts`** - Enhanced meeting management
- **`lib/webrtc/voice-activity-detector.ts`** - Voice activity detection

## 📁 Public Directory (Static Assets)
- **`public/placeholder-logo.png`** - Placeholder logo image (PNG)
- **`public/placeholder-logo.svg`** - Placeholder logo image (SVG)
- **`public/placeholder-user.jpg`** - Default user avatar
- **`public/placeholder.jpg`** - General placeholder image
- **`public/placeholder.svg`** - General placeholder SVG



## 📁 Stores Directory (State Management)
- **`stores/meeting.ts`** - Meeting state management (Zustand)
- **`stores/userStore.ts`** - User state management (Zustand)

## 📁 Styles Directory
- **`styles/globals.css`** - Global CSS styles and Tailwind configuration

## 📁 Types Directory (TypeScript Definitions)
- **`types/meetings.ts`** - Meeting-related type definitions
- **`types/speech.d.ts`** - Speech recognition type definitions
- **`types/webrtc.d.ts`** - WebRTC type definitions

## 📁 Hidden/System Directories

### .git Directory
Contains Git version control data (commit history, branches, etc.)

### .kiro Directory
- **`.kiro/specs/enhanced-ai-meetings/`** - Kiro IDE specifications for AI meetings

### .next Directory
Next.js build cache and generated files (automatically created during build)

### .vscode Directory
- **`.vscode/settings.json`** - VS Code workspace settings

### node_modules Directory
Contains all npm/pnpm package dependencies (automatically managed)

## Why Each File is Needed

### Configuration Files
These files configure the development environment, build process, and deployment settings. They ensure consistent behavior across different environments and team members.

### App Router Structure
Next.js 13+ uses file-based routing where the folder structure determines the URL structure. Each page.tsx file becomes a route, and layout.tsx files provide shared layouts.

### Backend API
The FastAPI backend provides REST APIs for data management, AI integration, WebRTC signaling, and third-party service integration. It's organized in a modular structure for maintainability.

### React Components
Components are organized by feature and reusability. UI components provide consistent design, while feature components handle specific business logic.

### Database Migrations
Sequential SQL files that evolve the database schema over time, allowing for version control of database changes.

### State Management
Hooks and stores manage application state, providing reactive data flow and consistent state across components.

### Type Definitions
TypeScript definitions ensure type safety and better developer experience with autocomplete and error checking.

This architecture provides a scalable, maintainable, and feature-rich AI-powered meeting assistant with CRM integration, real-time communication, and comprehensive user management.