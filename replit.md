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
