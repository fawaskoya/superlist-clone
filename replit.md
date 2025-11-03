# KBN Superlist

A production-ready Superlist-style task & collaboration app with bilingual UI (English/Arabic), RTL support, and AI-powered features.

## Overview

KBN Superlist is a comprehensive task management and collaboration platform that enables users to organize their work across multiple workspaces, create task lists, manage tasks with subtasks and comments, and leverage AI to enhance productivity.

## Key Features

### Core Functionality
- **Multi-workspace support**: Users can create and switch between multiple workspaces
- **Task Lists**: Organize tasks into personal or shared lists within workspaces
- **Task Management**: Full CRUD operations with status tracking (TODO, IN_PROGRESS, DONE), priority levels (LOW, MEDIUM, HIGH), due dates, and assignments
- **Subtasks**: Hierarchical task structure with parent-child relationships
- **Comments**: Collaborative discussion on tasks with timestamps
- **Tags**: Categorize tasks with colored tags

### Authentication
- JWT-based authentication with access and refresh tokens
- Secure password hashing with bcrypt
- Protected routes with middleware

### AI Features (using Replit AI Integrations - OpenAI)
- **Task Summarization**: Generate AI summaries of task content
- **Subtask Generation**: Automatically suggest subtasks based on task title and description
- **Priority Suggestions**: Smart priority recommendations using AI analysis

### Bilingual & RTL Support
- Full i18n support for English and Arabic languages
- Complete RTL (right-to-left) layout that automatically flips for Arabic
- Sidebar, navigation, and all UI elements adapt to text direction
- Language switcher with localStorage persistence

### Modern UI/UX
- Clean, Superlist-inspired design with Tailwind CSS
- Responsive layout optimized for desktop and tablet
- Top navbar with workspace switcher, language toggle, and user menu
- Collapsible sidebar with quick views (Inbox, Today, Upcoming, Assigned to Me) and custom lists
- Task details drawer with inline editing
- Beautiful loading states and error handling

## Tech Stack

### Frontend
- React + TypeScript
- Vite for bundling
- Tailwind CSS for styling
- TanStack Query (React Query) for server state management
- i18next + react-i18next for internationalization
- Wouter for routing
- Shadcn UI components
- React Hook Form with Zod validation

### Backend
- Node.js + TypeScript
- Express.js
- Prisma ORM
- SQLite database
- JWT for authentication
- bcrypt for password hashing
- OpenAI integration via Replit AI Integrations

## Project Structure

```
├── client/                 # Frontend application
│   ├── src/
│   │   ├── components/     # React components (Sidebar, Navbar, TaskList, etc.)
│   │   ├── pages/          # Page components (Login, Register, Dashboard, List)
│   │   ├── contexts/       # React contexts (Auth, Language)
│   │   ├── i18n/          # Internationalization setup and translations
│   │   ├── lib/           # Utility libraries (queryClient)
│   │   └── App.tsx        # Main app component with routing
│   └── index.html         # HTML entry point
├── server/                # Backend application
│   ├── routes.ts          # API routes
│   └── index.ts           # Express server setup
├── shared/                # Shared types and schemas
│   └── schema.ts          # Zod schemas and TypeScript types
├── prisma/                # Database
│   └── schema.prisma      # Prisma schema definition
└── design_guidelines.md   # Comprehensive design system documentation
```

## Database Schema

### User
- Authentication and profile information
- Relationships to workspaces, lists, tasks, and comments

### Workspace
- Multi-tenant workspace structure
- Owner and member management

### WorkspaceMember
- Junction table for workspace membership with roles (OWNER, ADMIN, MEMBER)

### List
- Task lists within workspaces
- Support for personal and shared lists

### Task
- Complete task management with status, priority, due dates
- Hierarchical structure for subtasks (parent-child)
- Assigned to users, ordering support

### TaskComment
- Collaborative comments on tasks

### Tag
- Workspace-scoped tags for task categorization

### TaskTag
- Junction table for task-tag relationships

### Notification
- User notifications (for future features)

## Recent Changes

**2024-11-03 - Landing Page Final Enhancements**
- ✅ **Professional Hero Image** - Added AI-generated hero image with modern abstract design
  - 16:9 aspect ratio optimized for landing pages
  - Integrated into hero section with responsive grid layout
  - Left column: text content, CTAs, feature pills
  - Right column: hero image with gradient glow and rounded corners
  - Shadow effects for depth and visual appeal
  
- ✅ **Improved Section Spacing** - Better visual flow and hierarchy
  - Reduced hero section padding (pt-12 pb-8 md:pt-20 md:pb-12)
  - Reduced features section padding (py-12 md:py-20)
  - Reduced CTA section padding (py-12 md:py-20)
  - Tighter spacing creates more cohesive design
  
- ✅ **Comprehensive Navigation** - Full-featured navbar with anchor links
  - Desktop/Tablet (≥640px): Single-row layout with centered links
  - Mobile (<640px): Two-row stacked layout for better UX
  - Navigation links: Home, Features, About, Pricing (all anchor links)
  - Proper hover states and accessibility (keyboard navigation)
  - Language switcher accessible on all screen sizes
  - All links use semantic HTML with data-testid attributes
  
- ✅ **Detailed Footer** - Professional multi-section footer
  - 5-column responsive grid (2 cols on mobile, 5 on md+)
  - Brand column with logo and description
  - Product column: Features, Pricing, Security, Roadmap
  - Company column: About Us, Blog, Careers, Contact
  - Resources column: Documentation, Support, Community, Status
  - Legal column: Privacy Policy, Terms of Service, Cookie Policy
  - Bottom section with copyright and language switcher
  - Full bilingual support maintained
  
- ✅ **Mobile Navigation Accessibility** - Fully functional on all devices
  - Scrollable horizontal navigation row for small screens
  - All links properly interactive (anchor tags, not spans)
  - Keyboard-focusable and screen-reader accessible
  - Maintains RTL support for Arabic

**2024-11-03 - Landing Page Design Enhancement**
- ✅ **Enhanced Landing Page Visuals** - Modern, unique, professional and friendly design
  - Multi-layered background with decorative blur orbs (primary, purple, blue)
  - Gradient effects on logo icon and brand text (primary to purple-600)
  - AI-powered badge with Sparkles icon in hero section
  - Unique color scheme for each feature card:
    - Tasks: Blue gradient (from-blue-500 to-cyan-500)
    - Collaboration: Purple gradient (from-purple-500 to-pink-500)
    - AI: Amber gradient (from-amber-500 to-orange-500)
    - Bilingual: Emerald gradient (from-emerald-500 to-teal-500)
    - Notifications: Rose gradient (from-rose-500 to-red-500)
    - Search: Indigo gradient (from-indigo-500 to-blue-500)
  - Colored icon backgrounds with ring borders and gradient hover effects
  - Gradient CTA buttons with shadow effects
  - Colored badge pills for hero features (blue, purple, emerald)
  - Enhanced backdrop blur and transparency effects throughout
  - Gradient border effects on CTA section
  - All components follow Shadcn design guidelines (no custom hover states)

**2024-11-03 - Landing Page & Next Phase Features (Major Update)**
- ✅ **Landing Page** - Professional homepage for unauthenticated visitors
  - Modern, responsive design inspired by Superlist/Notion
  - Hero section with gradient background and clear value proposition
  - Feature showcase grid highlighting 6 key features
  - Multiple CTA sections with signup/login buttons
  - Sticky navigation with language switcher
  - Full bilingual support (English/Arabic)
  - Optimized routing structure with persistent providers for authenticated users
  
**2024-11-03 - Next Phase Features (Major Update)**
- ✅ **Real-time Collaboration** - WebSocket infrastructure for live updates
  - Created WebSocketManager with connection handling and workspace subscriptions
  - Added event broadcasting for task/list operations (create, update, delete)
  - Built WebSocketContext with auto-reconnection and query invalidation
  - Fixed subscription management to properly unsubscribe when switching workspaces
  - Added user-specific broadcasting for notifications
  
- ✅ **Drag-and-Drop Task Reordering** - Visual task organization
  - Integrated @dnd-kit library for sortable tasks with smooth animations
  - Added proper order index recalculation with transaction support
  - Created drag handle with GripVertical icon (appears on hover)
  - Supports cross-list moves with automatic reindexing of all affected tasks
  - WebSocket broadcasting of reorder events
  
- ✅ **Advanced Search & Filtering** - Complete search functionality
  - Backend: GET /api/workspaces/:id/search endpoint with full-text search
  - Frontend: SearchBar component in navbar with debounced input
  - Filters: status, priority, assignedTo with dropdown UI
  - Real-time results display with highlighted search terms
  - Navigate to tasks directly from search results
  - Bilingual support (English/Arabic)
  
- ✅ **Notifications System** - Real-time notifications for collaboration
  - Backend: Notification model already in schema
  - Created GET, PATCH endpoints for notifications
  - Notification triggers when tasks are assigned
  - NotificationBell component in navbar with unread badge
  - Real-time notification delivery via WebSocket
  - Mark individual or all notifications as read
  - Time-relative display (e.g., "2 minutes ago")
  - Bilingual notification messages
  
- ✅ **Routing Fix** - Fixed 404 error on app load
  - Redirect unauthenticated users from root to login page
  - Improved loading state handling
  
**Remaining Next-Phase Features:**
- Task Activity Timeline (history tracking)
- Rich Text Editor (markdown support)
- File Attachments System
- Advanced Workspace Permissions

**2024-01 - Initial Implementation**
- Defined complete Prisma database schema
- Set up i18n with comprehensive English and Arabic translations
- Built all frontend components with exceptional visual quality
- Implemented RTL support for Arabic language
- Created authentication pages (Login, Register)
- Built main app layout with sidebar and navbar
- Implemented task management components (TaskList, TaskItem, TaskDetailsDrawer)
- Added workspace switcher and language switcher
- Configured design system tokens in Tailwind
- Fixed critical multi-workspace selection bug with WorkspaceContext
- Created Today/Upcoming/Assigned quick-view pages with backend filtering

## Development

### Prerequisites
- Node.js 20+
- npm

### Setup
1. Install dependencies: `npm install`
2. Initialize database: `npx prisma migrate dev`
3. Run development server: `npm run dev`

### Available Scripts
- `npm run dev`: Start both frontend and backend in development mode
- `npm run dev:client`: Start only the frontend
- `npm run dev:server`: Start only the backend

## User Preferences

- Frontend visual quality is the top priority
- Follow design_guidelines.md religiously for all UI implementations
- Use Shadcn UI components consistently
- Maintain proper spacing, typography, and color contrast
- Ensure all interactions feel smooth and delightful
- Support both English and Arabic languages with proper RTL
