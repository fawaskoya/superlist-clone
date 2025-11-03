# KBN Superlist

## Overview

KBN Superlist is a production-ready, comprehensive task management and collaboration platform. It allows users to organize work across multiple bilingual, RTL-supported workspaces, create task lists, manage tasks with subtasks and comments, and leverage AI for enhanced productivity. The project aims to deliver a modern, intuitive user experience inspired by leading productivity tools.

## User Preferences

- Frontend visual quality is the top priority
- Follow design_guidelines.md religiously for all UI implementations
- Use Shadcn UI components consistently
- Maintain proper spacing, typography, and color contrast
- Ensure all interactions feel smooth and delightful
- Support both English and Arabic languages with proper RTL

## System Architecture

KBN Superlist is built with a modern web application architecture, featuring a React + TypeScript frontend and a Node.js + Express.js backend.

### UI/UX Decisions
- **Design System**: Clean, Superlist-inspired design utilizing Tailwind CSS for styling and Shadcn UI components for a consistent look and feel.
- **Responsiveness**: Optimized for desktop and tablet with adaptive layouts.
- **Bilingual & RTL**: Full i18n support for English and Arabic, including complete RTL layout flipping for Arabic, affecting all UI elements (sidebar, navbar, etc.).
- **Theming**: Comprehensive dark/light theme system with a `ThemeProvider` context and localStorage persistence.
- **Key UI Elements**: Top navbar with workspace switcher, language/theme toggles; collapsible sidebar with quick views; task details drawer for inline editing.

### Technical Implementations
- **Frontend**: React with TypeScript, Vite for bundling, TanStack Query for server state management, Wouter for routing, React Hook Form with Zod for validation.
- **Backend**: Node.js with TypeScript, Express.js for API, Prisma ORM for database interactions, SQLite for the database.
- **Authentication**: JWT-based with access/refresh tokens and bcrypt for password hashing.
- **AI Features**: Integration with OpenAI for task summarization, subtask generation, and priority suggestions.
- **Real-time Features**: WebSocket infrastructure for real-time collaboration, including task updates, reordering, and notifications.
- **Database Schema**: Designed with Prisma, including models for User, Workspace, List, Task (with subtasks), TaskComment, Tag, and Notification.

### Feature Specifications
- **Core Task Management**: CRUD operations for tasks, subtasks, lists, status tracking (TODO, IN_PROGRESS, DONE), priority levels, due dates, assignments, and tags.
- **Workspaces**: Multi-tenant workspace support with owner/member management and roles.
- **Notifications**: Real-time notification system for user-specific events, such as task assignments.
- **Advanced Search & Filtering**: Comprehensive search functionality with filters for status, priority, and assignee.
- **Drag-and-Drop**: Visual task reordering within and across lists using `@dnd-kit`.

## External Dependencies

- **Database**: SQLite (via Prisma ORM)
- **AI Integration**: OpenAI (via Replit AI Integrations)
- **Authentication**: JWT (JSON Web Tokens), bcrypt
- **Styling**: Tailwind CSS
- **UI Components**: Shadcn UI
- **Internationalization**: i18next, react-i18next
- **State Management**: TanStack Query (React Query)
- **Routing**: Wouter
- **Form Management**: React Hook Form, Zod
- **Drag and Drop**: @dnd-kit

## Recent Changes

**2024-11-03 - Navigation Headers for Auth Pages**
- ✅ **Login/Register Navigation** - Added navigation headers to auth pages
  - Created consistent header with brand logo linking to homepage
  - Users can now easily return to homepage from login/register pages
  - Header includes ThemeToggle and LanguageSwitcher
  - Layout: `border-b bg-card/50 backdrop-blur-sm` with container
  - Logo uses semantic Link component (not button) for accessibility
  - Supports right-click → open in new tab behavior
  - Consistent h-16 height with landing page navbar
  - Fully responsive with proper RTL support

**2024-11-03 - Dark Mode Implementation (Complete)**
- ✅ **ThemeProvider Context** - Global theme management system
  - Created ThemeContext at `client/src/contexts/ThemeContext.tsx`
  - Manages theme state with localStorage persistence ('light' or 'dark')
  - Adds/removes 'dark' class on document.documentElement
  - Provides theme, toggleTheme, and setTheme methods to all components
  
- ✅ **ThemeToggle Component** - Intuitive theme switcher UI
  - Created reusable component at `client/src/components/ThemeToggle.tsx`
  - Shows Moon icon in light mode, Sun icon in dark mode
  - Uses Shadcn Button with ghost variant and icon size
  - data-testid: "button-theme-toggle" for testing
  
- ✅ **App-Wide Integration** - Theme toggle available everywhere
  - Landing page: Theme toggle in navbar (both desktop and mobile)
  - Authenticated app: Theme toggle in Navbar (next to NotificationBell)
  - Login/Register pages: Theme toggle in navigation header
  - All pages support seamless theme switching with persistence

**Previously Completed Features:**
- Professional landing page with hero image, features showcase, and comprehensive footer
- Complete bilingual support (English/Arabic) with RTL layout
- Real-time collaboration with WebSocket infrastructure
- Drag-and-drop task reordering with @dnd-kit
- Advanced search and filtering functionality
- Notifications system with real-time delivery
- Multi-workspace support with roles and permissions
- Complete task management with subtasks, comments, and tags
- AI-powered features (task summarization, subtask generation, priority suggestions)