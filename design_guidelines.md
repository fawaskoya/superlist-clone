# KBN Superlist - Design Guidelines

## Design Approach

**Reference-Based Design**: Drawing inspiration from modern productivity tools including Superlist, Linear, Notion, and Asana. The design prioritizes efficiency, clarity, and visual calm to support focused work.

**Core Principles**:
- Information density balanced with breathing room
- Clear visual hierarchy for rapid scanning
- Consistent, predictable interactions
- Seamless bilingual experience with proper RTL adaptation

---

## Typography System

**Font Families**:
- Primary: Inter (via Google Fonts CDN) - for UI elements, labels, body text
- Monospace: JetBrains Mono - for technical details, IDs, timestamps

**Type Scale**:
- Page titles: text-2xl (24px), font-semibold
- Section headers: text-lg (18px), font-semibold  
- Task titles: text-base (16px), font-medium
- Body text: text-sm (14px), font-normal
- Helper text/metadata: text-xs (12px), font-normal
- Navigation items: text-sm (14px), font-medium

**Line Heights**:
- Headings: leading-tight (1.25)
- Body: leading-normal (1.5)
- Compact lists: leading-snug (1.375)

---

## Layout System

**Spacing Primitives**: Use Tailwind units of 2, 3, 4, 6, 8, 12, 16 for consistency

**Core Spacing Patterns**:
- Component padding: p-3, p-4, p-6
- Section gaps: space-y-4, space-y-6
- Card spacing: p-4 to p-6
- List item padding: px-4 py-3
- Input fields: px-3 py-2
- Margins between major sections: mb-8, mb-12

**App Shell Structure**:

**Top Navbar**: h-16, fixed positioning, spanning full width
- Contains: Logo/app name (left), workspace switcher (center-left), language toggle, user menu (right)
- Internal padding: px-6
- Items aligned with gap-4 between groups

**Sidebar**: w-64, fixed height from below navbar to bottom
- Top section: Quick views (Inbox, Today, Upcoming, Assigned to Me) with spacing of space-y-1
- Divider: my-4 
- Lists section: Grouped by workspace, space-y-1 for items
- Internal padding: p-4
- Each nav item: px-3 py-2, rounded-lg

**Main Content Area**: ml-64 (offset for sidebar), pt-16 (offset for navbar)
- Container: max-w-5xl mx-auto
- Padding: px-8 py-6

**Task Details Drawer**: w-96, slides in from right (or left in RTL), full height
- Internal padding: p-6
- Sections divided with space-y-6

---

## Component Library

### Navigation Components

**Workspace Switcher**:
- Dropdown button style with workspace name + chevron
- Dropdown menu: w-72, max-h-96 with scroll
- Each workspace item: p-3, hover effect, rounded-lg
- Active workspace indicated with subtle background treatment
- "Create workspace" button at bottom with border-t separator

**Sidebar Navigation Items**:
- Height: h-9
- Icon (20px) + label layout with gap-3
- Hover state with subtle background
- Active state with stronger background + border accent on left (right in RTL)

**Language Switcher**:
- Toggle button showing current language (EN/AR)
- Compact, h-9, px-3
- Click toggles between languages instantly

### Task Components

**Task List Container**:
- Background: subtle card background
- Border: 1px subtle border
- Rounded: rounded-xl
- Padding: p-1
- Individual tasks separated by 1px dividers

**Task Item**:
- Layout: checkbox (left) + content area + metadata (right) + actions (far right)
- Padding: px-4 py-3
- Hover: subtle background lift
- Checkbox: 20px square, rounded-md, custom styled
- Title: truncate with max-width
- Metadata row: flex gap-2 for tags, due date, assignee avatar (16px circle)
- Quick actions (on hover): edit, more menu icons (16px)

**Task Details Drawer Sections**:
- Title: Large editable input, text-xl, font-semibold, border-b below
- Description: Textarea, min-h-32, grows with content
- Metadata Grid: 2-column layout (label + value) with gap-4
- Status/Priority: Styled select dropdowns with visual indicators
- Due Date: Date picker input
- Assigned To: Avatar + name dropdown
- Subtasks: Nested checklist, indented by pl-6, space-y-2
- Comments: reverse chronological, space-y-4, each comment in p-3 rounded container
- AI Action buttons: Full-width, grouped at bottom, space-y-2

**Add Task Input**:
- Inline in task list
- Input field: px-4 py-3, placeholder text
- Expands on focus to show quick actions (priority, due date)
- Compact: h-11 when collapsed

### Form Elements

**Input Fields**:
- Height: h-10
- Padding: px-3 py-2
- Border: 1px solid, rounded-lg
- Focus: 2px ring, outline-none
- Font: text-sm

**Textarea**:
- Padding: p-3
- Rounded: rounded-lg
- Border: 1px solid
- Resize: vertical

**Select Dropdowns**:
- Height: h-10
- Appearance: custom with chevron icon
- Padding: pl-3 pr-8

**Buttons**:
- Primary: h-10, px-6, rounded-lg, font-medium
- Secondary: h-10, px-6, rounded-lg, border variant
- Small: h-8, px-4, text-sm
- Icon only: w-8 h-8, rounded-lg, centered icon
- AI action buttons: h-10, full width in drawer, icon + label, rounded-lg

### Cards & Containers

**List Header Card**:
- Padding: p-6
- Rounded: rounded-xl
- Border: 1px subtle
- Layout: Title + description (stacked) | Members (right) | AI button (far right)
- Space-y-2 for title/description stack

**Empty States**:
- Centered layout with icon (32px) + text
- Padding: py-16
- Icon above text with mb-4

### Overlays & Modals

**Modal Dialog**:
- Max width: max-w-lg
- Padding: p-6
- Rounded: rounded-2xl
- Header: text-xl font-semibold, mb-4
- Footer: flex justify-end gap-3, mt-6, pt-6 border-t

**Dropdown Menus**:
- Width: w-56 (or context-dependent)
- Padding: p-2
- Rounded: rounded-xl
- Border: 1px subtle, shadow-lg
- Menu items: px-3 py-2, rounded-lg, gap-2 for icon+label

---

## Bilingual & RTL Support

**Layout Adaptations for RTL (Arabic)**:
- Sidebar flips to right side
- Drawer opens from left instead of right
- Flex layouts use flex-row-reverse where appropriate
- Text alignment: text-right for Arabic
- Padding/margin: swap pl/pr, ml/mr using Tailwind's rtl: prefix
- Icons: directional icons (chevrons, arrows) flip horizontally

**Language-Specific Typography**:
- Arabic: Increase line-height by 0.125 for better readability (leading-relaxed)
- Ensure adequate letter-spacing for Latin text (tracking-normal)
- Both languages use same font-size but may need weight adjustments for visual balance

**Navigation in RTL**:
- Workspace switcher maintains same position (center-left becomes center-right)
- User menu remains on opposite end
- Breadcrumbs reverse direction

---

## Interaction Patterns

**Task Interactions**:
- Click task row: Opens drawer
- Click checkbox: Toggles completion inline (no drawer)
- Drag handle (left/right based on language): Reorder tasks
- Hover: Show quick action icons

**Workspace Switching**:
- Click switcher: Opens dropdown
- Click workspace: Switches context, closes dropdown
- Keyboard: Arrow keys navigate, Enter selects

**AI Features**:
- Action buttons clearly labeled with magic wand emoji (🪄) or icon
- Loading state: Button shows spinner, disabled during processing
- Result display: Inline preview with "Apply" and "Cancel" options
- Success feedback: Brief confirmation message, 2s duration

---

## Responsive Behavior

**Desktop (1024px+)**: Full layout as described
**Tablet (768px-1023px)**: 
- Sidebar: w-48 (narrower), icon + shortened labels
- Drawer: w-80 (narrower)
- Main content: px-6 (tighter padding)

**Mobile (< 768px)**: 
- Sidebar: Overlay drawer, hidden by default
- Navbar: Hamburger menu for sidebar toggle
- Drawer: Full-screen overlay
- Task list: Stack metadata vertically

---

## Visual Rhythm & Hierarchy

**Information Density**:
- Tasks: Compact but breathable (py-3 is sweet spot)
- Drawers: Generous padding (p-6) for focused editing
- Modals: Balanced (p-6) for clarity

**Visual Weight Distribution**:
- Strong: Page titles, task titles, primary actions
- Medium: Section headers, metadata labels, nav items
- Light: Helper text, timestamps, secondary info

**Card Elevation**:
- Level 0: Main background
- Level 1: Sidebar, navbar (subtle border)
- Level 2: Cards, task items (border + subtle shadow)
- Level 3: Dropdowns, modals (stronger shadow)
- Level 4: Drawer (strongest shadow for layering)

---

## Icon System

**Library**: Heroicons (Outline for general UI, Solid for active states)

**Icon Sizes**:
- Nav icons: 20px (w-5 h-5)
- Task metadata icons: 16px (w-4 h-4)
- Button icons: 20px (w-5 h-5)
- Empty state icons: 48px (w-12 h-12)

**Icon Usage**:
- Always pair with labels in primary navigation
- Metadata icons can stand alone with tooltips
- Use consistent icon style throughout (all outline or all solid per context)

---

## Animation Guidelines

**Use Sparingly**:
- Drawer slide: 200ms ease-out
- Dropdown fade: 150ms ease-in-out
- Hover transitions: 100ms ease
- Task completion: Subtle fade (150ms) + optional strikethrough
- No elaborate animations, transitions, or scroll effects