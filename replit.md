# TaskFlow

## Overview
TaskFlow is a production-ready, comprehensive task management and collaboration platform. It enables users to organize work across multiple bilingual, RTL-supported workspaces, create task lists, manage tasks with subtasks and comments, and leverage AI for enhanced productivity. The project aims to deliver a modern, intuitive user experience inspired by leading productivity tools, focusing on a clean design and smooth interactions.

## User Preferences
- Frontend visual quality is the top priority
- Follow design_guidelines.md religiously for all UI implementations
- Use Shadcn UI components consistently
- Maintain proper spacing, typography, and color contrast
- Ensure all interactions feel smooth and delightful
- Support both English and Arabic languages with proper RTL

## System Architecture
TaskFlow is built with a modern web application architecture, featuring a React + TypeScript frontend and a Node.js + Express.js backend.

### UI/UX Decisions
- **Design System**: Clean, Superlist-inspired design utilizing Tailwind CSS for styling and Shadcn UI components.
- **Responsiveness**: Optimized for desktop and tablet with adaptive layouts.
- **Bilingual & RTL**: Full i18n support for English and Arabic, including complete RTL layout flipping for all UI elements.
- **Theming**: Comprehensive dark/light theme system with a `ThemeProvider` context and localStorage persistence.
- **Key UI Elements**: Top navbar with workspace switcher, language/theme toggles; collapsible sidebar with quick views; task details drawer for inline editing.

### Technical Implementations
- **Frontend**: React with TypeScript, Vite, TanStack Query for server state management, Wouter for routing, React Hook Form with Zod for validation.
- **Backend**: Node.js with TypeScript, Express.js for API, Prisma ORM for database interactions.
- **Authentication**: JWT-based with access/refresh tokens and bcrypt for password hashing.
- **AI Features**: Integration with OpenAI for task summarization, subtask generation, and priority suggestions.
- **Real-time Features**: WebSocket infrastructure for real-time collaboration, including task updates, reordering, and notifications.
- **Database Schema**: Designed with Prisma, including models for User, Workspace, List, Task (with subtasks), TaskComment, Tag, Notification, TaskActivity, and FileAttachment.
- **Task Management**: CRUD for tasks, subtasks, lists, status tracking (TODO, IN_PROGRESS, DONE), priority levels, due dates, task assignment to workspace members, and tags. Includes an "Inbox" concept for tasks without a specific list. Full assignment UI in TaskDetailsDrawer with member selection dropdown.
- **Workspaces**: Multi-tenant workspace support with owner/member management, roles, and granular permissions.
- **Notifications**: Real-time notification system for user-specific events.
- **Advanced Search & Filtering**: Comprehensive search with filters.
- **Drag-and-Drop**: Visual task reordering using `@dnd-kit`.
- **Rich Text Editor**: Markdown support for task descriptions with a Write/Preview editor.
- **File Attachments**: Local file storage for task attachments with upload, list, download, and delete functionalities.
- **Activity Timeline**: Tracks and displays task-related activities (creation, status changes, comments, attachments).

### System Design Choices
- **Modular Architecture**: Clear separation of concerns between frontend, backend, and shared utilities.
- **Scalability**: Designed for future growth with a robust database schema and API structure.
- **Security**: JWT-based authentication, role-based access control, and comprehensive permission checks on all backend operations.

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
- **File Uploads**: Multer
- **Markdown Rendering**: react-markdown, remark-gfm