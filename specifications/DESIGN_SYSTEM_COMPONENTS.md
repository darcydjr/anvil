# Component Library - Design System Documentation
**Enabler**: ENB-833103
**Capability**: CAP-832930 - Design UI
**Status**: Implemented
**Last Updated**: November 3, 2025

## Overview

The Component Library provides a collection of reusable React components built with TypeScript, Tailwind CSS, and the Ford Anvil design system. All components follow consistent styling, behavior patterns, and accessibility standards.

## Component Architecture

### Technology Stack

- **React 18**: Functional components with hooks
- **TypeScript**: Full type safety and IntelliSense support
- **Tailwind CSS**: Utility-first styling with design tokens
- **Lucide React**: Icon library
- **React Router v6**: Navigation and routing

### Design Principles

1. **Composition over Configuration**: Components are composable and flexible
2. **Accessibility First**: WCAG 2.1 AA compliance minimum
3. **TypeScript Native**: Full type definitions for all props
4. **Theme Aware**: Automatic light/dark mode support
5. **Responsive**: Mobile-first responsive design

## Core Components

### Layout Components

#### Layout
**Location**: `client/src/components/Layout.tsx`
**Purpose**: Main application layout wrapper

**Features**:
- Combines Header and Sidebar
- Responsive layout grid
- Content area management

**Usage**:
```tsx
<Layout>
  <Routes>
    <Route path="/" element={<Dashboard />} />
  </Routes>
</Layout>
```

#### Header
**Location**: `client/src/components/Header.tsx`
**Purpose**: Top navigation bar

**Features**:
- Logo/branding area
- Global actions (settings, help, search)
- Workspace selector integration
- Responsive mobile menu

**Used Icons**: Settings, HelpCircle, Lightbulb, Clipboard, Search, X

#### Sidebar
**Location**: `client/src/components/Sidebar.tsx`
**Purpose**: Left navigation panel

**Features**:
- Hierarchical navigation
- Collapsible sections
- Active route highlighting
- Filter and view options
- Drag-and-drop support

**Used Icons**: FileText, Plus, ArrowLeft, ChevronDown, ChevronRight, Settings, Box, Zap, PencilRuler, Ruler, Microscope, GripHorizontal, Filter

### Page Components

#### Dashboard
**Location**: `client/src/components/Dashboard.tsx`
**Purpose**: Main dashboard view

**Features**:
- Capability overview cards
- Quick actions
- Status summaries
- Navigation to child views

**Used Icons**: FileText, Plus

#### Discovery
**Location**: `client/src/components/Discovery.tsx`
**Purpose**: AI-powered discovery interface

**Features**:
- Text input for discovery prompts
- Real-time analysis
- Suggestion display
- Loading states
- Error handling

**Used Icons**: Lightbulb, FileText, Zap, Eye, EyeOff, Send, Loader, AlertCircle

#### Plan
**Location**: `client/src/components/Plan.tsx`
**Purpose**: Planning and workflow interface

**Features**:
- Capability planning
- Status management
- Copy/export functionality
- Edit modes

**Used Icons**: Save, RotateCcw, Eye, Edit3, Copy, Check

#### Settings
**Location**: `client/src/components/Settings.tsx`
**Purpose**: Application settings

**Features**:
- Collapsible sections
- Form controls
- Save functionality
- Default value management

**Used Icons**: Save, Settings, ChevronDown, ChevronRight

### Document Components

#### DocumentView
**Location**: `client/src/components/DocumentView.tsx`
**Purpose**: Read-only document display

**Features**:
- Markdown rendering
- Syntax highlighting
- Action buttons (edit, delete, copy)
- Breadcrumb navigation
- Mermaid diagram rendering

**Used Icons**: Edit, Trash2, ArrowLeft, Copy, Folder

#### DocumentEditor
**Location**: `client/src/components/DocumentEditor.tsx`
**Purpose**: Document editing interface

**Features**:
- Markdown editor
- Live preview
- Auto-save
- Code/preview toggle
- Validation

**Used Icons**: Save, ArrowLeft, Eye, Code

#### TemplateEditor
**Location**: `client/src/components/TemplateEditor.tsx`
**Purpose**: Template management

**Features**:
- Template editing
- Save functionality
- Navigation

**Used Icons**: Save, ArrowLeft

### Workspace Components

#### WorkspaceSelector
**Location**: `client/src/components/WorkspaceSelector.tsx`
**Purpose**: Workspace switching dropdown

**Features**:
- Workspace list
- Active workspace indicator
- Quick actions
- Settings access

**Used Icons**: ChevronDown, Edit2, Settings, Plus

#### ManageWorkspaces
**Location**: `client/src/components/ManageWorkspaces.tsx`
**Purpose**: Workspace management interface

**Features**:
- Create/edit/delete workspaces
- Drag-and-drop reordering
- Path management
- Inline editing

**Used Icons**: Plus, Trash2, Save, Edit2, Check, Folder, FolderOpen, GripVertical

### Utility Components

#### ThemeProvider
**Location**: `client/src/components/ThemeProvider.tsx`
**Purpose**: Theme management context

**Features**:
- Light/dark mode support
- System preference detection
- Persistent theme storage

**See**: [DESIGN_SYSTEM_THEME_MANAGEMENT.md](./DESIGN_SYSTEM_THEME_MANAGEMENT.md)

#### PrivateRoute
**Location**: `client/src/components/PrivateRoute.tsx`
**Purpose**: Authentication guard for routes

**Features**:
- Authentication verification
- Loading states
- Automatic redirect to login
- Protected content rendering

**Usage**:
```tsx
<PrivateRoute>
  <Dashboard />
</PrivateRoute>
```

#### Login
**Location**: `client/src/components/Login.tsx`
**Purpose**: Authentication interface

**Features**:
- Username/password form
- Client-side validation
- Error messaging
- Loading states
- Default credentials display

**Used Icons**: LogIn

### Visualization Components

#### RelationshipDiagram
**Location**: `client/src/components/RelationshipDiagram.tsx`
**Purpose**: Interactive capability relationship visualization

**Features**:
- Mermaid diagram rendering
- Zoom controls
- Pan/move functionality
- Fullscreen mode
- Reset view

**Used Icons**: Maximize2, Minimize2, X, Move, RotateCcw

## Component Patterns

### Form Components

#### Standard Form Pattern
```tsx
<form className="space-y-6" onSubmit={handleSubmit}>
  <div className="space-y-2">
    <label className="block text-sm font-medium text-foreground">
      Field Label
    </label>
    <input
      type="text"
      className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
    />
  </div>

  <button
    type="submit"
    className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
  >
    Submit
  </button>
</form>
```

### Button Patterns

#### Primary Button
```tsx
<button className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">
  Primary Action
</button>
```

#### Secondary Button
```tsx
<button className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors">
  Secondary Action
</button>
```

#### Destructive Button
```tsx
<button className="px-4 py-2 bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 transition-colors">
  Delete
</button>
```

#### Icon Button
```tsx
<button className="p-2 rounded-lg hover:bg-accent transition-colors" aria-label="Settings">
  <Settings size={20} />
</button>
```

### Card Patterns

#### Standard Card
```tsx
<div className="bg-card text-card-foreground rounded-lg border border-border p-6 shadow-sm">
  <h3 className="text-lg font-semibold mb-2">Card Title</h3>
  <p className="text-muted-foreground">Card content goes here.</p>
</div>
```

#### Interactive Card
```tsx
<div className="bg-card text-card-foreground rounded-lg border border-border p-6 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
  {/* Card content */}
</div>
```

### Loading States

#### Spinner
```tsx
import { Loader } from 'lucide-react'

<div className="flex items-center justify-center py-8">
  <Loader className="w-8 h-8 animate-spin text-primary" />
</div>
```

#### Loading Button
```tsx
<button
  disabled={loading}
  className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg disabled:opacity-50"
>
  {loading && <Loader className="w-4 h-4 animate-spin" />}
  <span>{loading ? 'Processing...' : 'Submit'}</span>
</button>
```

### Error States

#### Error Message
```tsx
<div className="rounded-md bg-destructive/10 border border-destructive p-4">
  <div className="flex items-center gap-2 text-destructive">
    <AlertCircle size={20} />
    <p className="font-medium">Error occurred</p>
  </div>
  <p className="text-sm text-destructive/80 mt-2">
    {errorMessage}
  </p>
</div>
```

### Success States

#### Success Message
```tsx
<div className="rounded-md bg-green-50 dark:bg-green-900/20 border border-green-500 p-4">
  <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
    <Check size={20} />
    <p className="font-medium">Success!</p>
  </div>
  <p className="text-sm text-green-600 dark:text-green-300 mt-2">
    Operation completed successfully.
  </p>
</div>
```

## Styling Guidelines

### Class Organization

Follow this order for Tailwind classes:
1. Layout (flex, grid, block)
2. Positioning (relative, absolute)
3. Sizing (w-, h-, max-w-)
4. Spacing (p-, m-, gap-)
5. Typography (text-, font-)
6. Colors (bg-, text-, border-)
7. Borders (border, rounded)
8. Effects (shadow, opacity)
9. Transitions (transition, hover:)
10. Interactive states (focus:, active:, disabled:)

**Example**:
```tsx
<div className="flex items-center justify-between w-full p-4 text-sm font-medium text-foreground bg-card border border-border rounded-lg shadow-sm hover:shadow-md transition-shadow">
  {/* Content */}
</div>
```

### Responsive Design

Use mobile-first breakpoints:
```tsx
<div className="
  p-4
  md:p-6
  lg:p-8
  grid
  grid-cols-1
  md:grid-cols-2
  lg:grid-cols-3
  gap-4
">
  {/* Responsive grid */}
</div>
```

### Dark Mode

Use theme tokens instead of dark: variants:
```tsx
// ✓ Good: Uses theme tokens
<div className="bg-background text-foreground">

// ✗ Bad: Hardcoded dark mode
<div className="bg-white dark:bg-gray-900 text-black dark:text-white">
```

## Accessibility

### Semantic HTML

Always use semantic elements:
```tsx
// ✓ Good
<button>Click me</button>
<nav>...</nav>
<main>...</main>

// ✗ Bad
<div onClick={handleClick}>Click me</div>
<div>...</div> {/* for navigation */}
```

### ARIA Attributes

Provide ARIA labels where needed:
```tsx
<button aria-label="Close dialog">
  <X size={20} />
</button>

<input
  type="text"
  aria-describedby="help-text"
/>
<p id="help-text" className="text-sm text-muted-foreground">
  Helper text
</p>
```

### Keyboard Navigation

Ensure all interactive elements are keyboard accessible:
```tsx
<div
  role="button"
  tabIndex={0}
  onKeyDown={(e) => e.key === 'Enter' && handleClick()}
  onClick={handleClick}
>
  Clickable div
</div>
```

### Focus Indicators

Always show focus states:
```tsx
<button className="focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
  Button
</button>
```

## Component Best Practices

### TypeScript Props

Always define prop interfaces:
```tsx
interface ButtonProps {
  children: React.ReactNode
  onClick?: () => void
  variant?: 'primary' | 'secondary' | 'destructive'
  disabled?: boolean
}

function Button({ children, onClick, variant = 'primary', disabled }: ButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={/* variant-based classes */}
    >
      {children}
    </button>
  )
}
```

### State Management

Use appropriate React hooks:
```tsx
// Local state
const [value, setValue] = useState<string>('')

// Side effects
useEffect(() => {
  // Effect logic
}, [dependencies])

// Context
const { theme, setTheme } = useTheme()

// Navigation
const navigate = useNavigate()
```

### Error Boundaries

Implement error boundaries for robust UX:
```tsx
<ErrorBoundary fallback={<ErrorFallback />}>
  <SomeComponent />
</ErrorBoundary>
```

## Testing Guidelines

### Component Testing

Test key behaviors:
- Rendering
- User interactions
- Props validation
- Edge cases
- Accessibility

### Accessibility Testing

- Run automated accessibility audits
- Test keyboard navigation
- Verify screen reader compatibility
- Check color contrast ratios

## Future Enhancements

- [ ] Shared Button component with variants
- [ ] Form components library (Input, Select, Checkbox, Radio)
- [ ] Modal/Dialog component
- [ ] Toast notification system
- [ ] Tooltip component
- [ ] Dropdown menu component
- [ ] Table component with sorting/filtering
- [ ] Tabs component
- [ ] Accordion component
- [ ] Progress indicators
- [ ] Badge/Chip components
- [ ] Avatar component
- [ ] Skeleton loaders
- [ ] Empty states
- [ ] Component documentation with Storybook

## Resources

- [React Documentation](https://react.dev/)
- [Tailwind CSS Components](https://tailwindui.com/)
- [Headless UI](https://headlessui.com/)
- [Radix UI](https://www.radix-ui.com/)
- [shadcn/ui](https://ui.shadcn.com/)
- [React Aria](https://react-spectrum.adobe.com/react-aria/)
