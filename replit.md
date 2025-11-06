# TaskFlow

## Overview

TaskFlow is a production-ready, comprehensive task management and collaboration platform. It allows users to organize work across multiple bilingual, RTL-supported workspaces, create task lists, manage tasks with subtasks and comments, and leverage AI for enhanced productivity. The project aims to deliver a modern, intuitive user experience inspired by leading productivity tools.

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

**2024-11-03 - Four Advanced Features Implementation (COMPLETE)**
- ✅ **Feature 1: Task Activity Timeline**
  - Added TaskActivity model with ActivityType enum (15 activity types)
  - Created activityLogger.ts helper module for consistent activity logging
  - Implemented GET /api/tasks/:id/activities endpoint
  - Built TaskActivityTimeline component with chronological activity display
  - Integrated activity logging into: task creation, status changes, priority changes, assignments, moves, comments, file attachments
  - Real-time activity updates via WebSocket integration

- ✅ **Feature 2: Rich Text Editor (Markdown Support)**
  - Installed react-markdown and remark-gfm for markdown rendering
  - Created MarkdownEditor component with Write/Preview tabs
  - Integrated markdown editor into task description field in TaskDetailsDrawer
  - Supports full markdown syntax: bold, italic, links, lists, tables, code blocks
  - Split-view editing with live preview toggle

- ✅ **Feature 3: File Attachments System**
  - Added FileAttachment model to database schema
  - Implemented local file storage with multer (10MB limit per file)
  - Created upload directory structure and file management
  - Built API endpoints: POST /api/tasks/:id/attachments (upload), GET /api/tasks/:id/attachments (list), GET /api/attachments/:id (download), DELETE /api/attachments/:id (delete)
  - Created FileAttachments component with upload/download/delete functionality
  - File metadata tracking: filename, size, MIME type, uploader, timestamp
  - Integrated file activity logging (FILE_ATTACHED, FILE_REMOVED)

- ✅ **Feature 4: Advanced Workspace Permissions**
  - Extended Role enum with VIEWER role
  - Added Permission enum with 8 granular permissions: MANAGE_WORKSPACE, MANAGE_MEMBERS, MANAGE_LISTS, CREATE_TASKS, EDIT_ALL_TASKS, DELETE_TASKS, COMMENT_TASKS, VIEW_ONLY
  - Created permissions.ts helper module with role-based permission system
  - Added custom permissions field to WorkspaceMember model
  - Implemented permission checking functions: getUserWorkspacePermissions(), hasPermission(), updateMemberPermissions()
  - Built API endpoints: GET /api/workspaces/:id/members (list with permissions), PATCH /api/workspaces/:workspaceId/members/:userId (update permissions)
  - Default role-based permissions with override capability

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

**2024-11-06 - Task Creation UI & Date Filtering (Complete)**
- ✅ **Visible Task Creation Button** - Enhanced task creation UX
  - Added visible "Add" button to TaskList component next to input field
  - Supports both button click and Enter key for task creation
  - Button uses `size="lg"` (min-h-10, 40px) to match Input height
  - Input uses `min-h-10` (40px) for perfect height alignment
  - Architect-reviewed and approved for height consistency compliance
  - Proper disabled states and loading indicators
  - data-testid: "button-add-task" for E2E testing
  
- ✅ **Today/Upcoming Page Filtering** - Date-based task views working correctly
  - Verified backend endpoints already implemented:
    - `GET /api/workspaces/:workspaceId/tasks/today` - Tasks due today
    - `GET /api/workspaces/:workspaceId/tasks/upcoming` - Tasks with future due dates
  - QuickViewTaskList component uses correct query structure
  - E2E tests confirm accurate filtering with no overlap
  - Tasks appear in correct views based on due date
  
- ✅ **List Creation Dialog** - Fixed sidebar list creation
  - Added Dialog component for creating new lists
  - Fixed schema validation (removed workspaceId from request body)
  - Smooth workflow: Click "+" button → Enter name → Submit
  - Proper error handling and success notifications

**2024-11-06 - Inbox/Tasks System Implementation (Complete)**
- ✅ **Database Schema Evolution** - Made Task.listId nullable for Inbox support
  - Modified Task model: listId is now optional (nullable)
  - Added workspaceId field to Task model (required, with workspace relation)
  - Migration strategy: Added workspaceId as nullable, populated from list.workspaceId, then made required
  - Preserves all existing data while enabling new Inbox functionality
  
- ✅ **Backend API Enhancements** - New endpoints and bug fixes
  - Created POST /api/workspaces/:id/tasks - Create inbox tasks (listId = null)
  - Created GET /api/workspaces/:id/tasks/inbox - Fetch inbox tasks
  - Created GET /api/workspaces/:id/tasks/all - Fetch all workspace tasks
  - Fixed PATCH /api/tasks/:id - Uses task.workspaceId instead of task.list.workspaceId
  - Fixed DELETE /api/tasks/:id - Uses task.workspaceId instead of task.list.workspaceId
  - Fixed GET /api/workspaces/:id/tasks/today - Now includes inbox tasks with today's due date
  - Fixed GET /api/workspaces/:id/tasks/upcoming - Now includes inbox tasks with future due dates
  - Fixed POST /api/auth/register - Default tasks now include workspaceId
  
- ✅ **Frontend Components & Pages** - New views and navigation
  - Created InboxTaskList component - Displays tasks where listId = null
  - Created TasksPage (/tasks) - Global task view with date-based grouping
  - Updated DashboardPage (/dashboard) - Now uses InboxTaskList for quick capture
  - Updated AppSidebar - Added "Tasks" navigation link with ListCheck icon
  - Updated App.tsx - Added /tasks route to routing configuration
  - TaskDetailsDrawer - Works seamlessly with both inbox and list tasks
  
- ✅ **Architecture & Design Patterns**
  - Inbox paradigm: Tasks with listId = null serve as quick capture inbox
  - Tasks page: Global view showing ALL tasks (inbox + lists) grouped by due date
  - Grouping logic: Overdue, Today, Tomorrow, Upcoming, No due date
  - Tasks remain in inbox even when assigned due dates or other properties
  - All endpoints consistently use task.workspaceId for workspace-level operations
  
- ✅ **E2E Testing & Validation**
  - Comprehensive test coverage for registration, inbox creation, task updates
  - Verified Today/Upcoming pages include inbox tasks correctly
  - Confirmed status updates, due date changes work for inbox tasks
  - All CRUD operations tested and working for both inbox and list tasks
  - No breaking changes to existing functionality

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