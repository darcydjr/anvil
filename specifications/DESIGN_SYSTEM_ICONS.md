# Icon System - Design System Documentation
**Enabler**: ENB-833104
**Capability**: CAP-832930 - Design UI
**Status**: Implemented
**Last Updated**: November 3, 2025

## Overview

The Icon System uses Lucide React, a comprehensive open-source icon library providing 1000+ consistently designed icons. All icons are MIT licensed, fully accessible, and optimized for React applications.

## Icon Library

**Library**: [Lucide React](https://lucide.dev/)
**Version**: Latest (check `package.json` for specific version)
**License**: MIT
**Total Icons**: 1000+

### Why Lucide React?

- ✓ **Consistent design**: All icons follow the same design language
- ✓ **React native**: Built specifically for React with TypeScript support
- ✓ **Tree-shakeable**: Only import icons you use
- ✓ **Customizable**: Easily adjust size, color, stroke width
- ✓ **Accessible**: Built-in ARIA attributes
- ✓ **Lightweight**: Small bundle size impact

## Currently Used Icons

### Navigation & Actions

| Icon | Component | Usage |
|------|------|-------|
| `FileText` | Dashboard, Sidebar | Document representation |
| `Plus` | Dashboard, Sidebar, ManageWorkspaces | Create/add actions |
| `ArrowLeft` | DocumentView, DocumentEditor | Back navigation |
| `Settings` | Header, Sidebar, WorkspaceSelector | Settings access |
| `Edit` / `Edit2` / `Edit3` | DocumentView, WorkspaceSelector | Edit actions |
| `Trash2` | DocumentView, ManageWorkspaces | Delete actions |
| `Save` | DocumentEditor, Settings, Plan | Save actions |

### Interface Elements

| Icon | Component | Usage |
|------|------|-------|
| `ChevronDown` / `ChevronRight` | Sidebar, Settings, WorkspaceSelector | Expandable sections |
| `X` | Header, RelationshipDiagram | Close/dismiss actions |
| `Search` | Header | Search functionality |
| `HelpCircle` | Header | Help/documentation |

### Content & Features

| Icon | Component | Usage |
|------|------|-------|
| `Lightbulb` | Header, Discovery | Discovery/ideas |
| `Eye` / `EyeOff` | Discovery, DocumentEditor | Visibility toggle |
| `Code` | DocumentEditor | Code view |
| `Copy` | DocumentView, Plan | Copy actions |
| `Clipboard` | Header | Clipboard operations |

### Status & Feedback

| Icon | Component | Usage |
|------|------|-------|
| `Check` | ManageWorkspaces, Plan | Confirmation |
| `Loader` | Discovery | Loading states |
| `AlertCircle` | Discovery | Alerts/warnings |
| `Send` | Discovery | Submit/send actions |

### Organization

| Icon | Component | Usage |
|------|------|-------|
| `Folder` / `FolderOpen` | DocumentView, ManageWorkspaces | Folder states |
| `Box` | Sidebar | Package/module representation |
| `GripVertical` / `GripHorizontal` | ManageWorkspaces, Sidebar | Drag handles |
| `Filter` | Sidebar | Filtering options |

### Specialized

| Icon | Component | Usage |
|------|------|-------|
| `PencilRuler` | Sidebar | Design tools |
| `Ruler` | Sidebar | Measurement tools |
| `Microscope` | Sidebar | Analysis tools |
| `Zap` | Discovery, Sidebar | Quick actions/energy |
| `Maximize2` / `Minimize2` | RelationshipDiagram | View toggles |
| `Move` | RelationshipDiagram | Move/pan actions |
| `RotateCcw` | RelationshipDiagram, Plan | Reset/undo actions |
| `LogIn` | Login | Authentication |

## Implementation

### Basic Usage

```tsx
import { IconName } from 'lucide-react'

function MyComponent() {
  return (
    <div>
      <IconName size={20} />
    </div>
  )
}
```

### Icon Sizing

**Standard sizes**:
```tsx
<Save size={16} />  // Small (text inline)
<Save size={20} />  // Medium (default, buttons)
<Save size={24} />  // Large (headers, emphasis)
<Save size={32} />  // Extra large (hero sections)
```

**Responsive sizing**:
```tsx
<Save className="w-4 h-4 md:w-5 md:h-5" />
```

### Icon Colors

Icons inherit the current text color by default:

```tsx
// Inherits text color
<div className="text-primary">
  <Save size={20} />
</div>

// Explicit color
<Save size={20} className="text-destructive" />

// With design tokens
<Save size={20} className="text-muted-foreground" />
```

### Stroke Width

Customize stroke width for different visual weights:

```tsx
<Save size={20} strokeWidth={1.5} />  // Light
<Save size={20} strokeWidth={2} />    // Default
<Save size={20} strokeWidth={2.5} />  // Bold
```

### Complete Example

```tsx
import { Save } from 'lucide-react'

function SaveButton() {
  return (
    <button className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg">
      <Save size={20} strokeWidth={2} />
      <span>Save Changes</span>
    </button>
  )
}
```

## Common Usage Patterns

### Icon Buttons

```tsx
import { Settings } from 'lucide-react'

// Icon-only button
<button
  className="p-2 rounded-lg hover:bg-accent"
  aria-label="Settings"
>
  <Settings size={20} />
</button>

// Icon with text
<button className="flex items-center gap-2 px-4 py-2 rounded-lg">
  <Settings size={20} />
  <span>Settings</span>
</button>
```

### Navigation Icons

```tsx
import { ArrowLeft } from 'lucide-react'

<button
  onClick={() => navigate(-1)}
  className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
>
  <ArrowLeft size={20} />
  <span>Back</span>
</button>
```

### Status Indicators

```tsx
import { Check, AlertCircle, Loader } from 'lucide-react'

// Success
<div className="flex items-center gap-2 text-green-600">
  <Check size={16} />
  <span>Saved</span>
</div>

// Error
<div className="flex items-center gap-2 text-destructive">
  <AlertCircle size={16} />
  <span>Error occurred</span>
</div>

// Loading
<div className="flex items-center gap-2">
  <Loader size={16} className="animate-spin" />
  <span>Loading...</span>
</div>
```

### List Item Icons

```tsx
import { FileText, Folder } from 'lucide-react'

<ul className="space-y-2">
  <li className="flex items-center gap-2">
    <Folder size={16} className="text-muted-foreground" />
    <span>Folder Name</span>
  </li>
  <li className="flex items-center gap-2">
    <FileText size={16} className="text-muted-foreground" />
    <span>Document Name</span>
  </li>
</ul>
```

### Icon Animations

```tsx
import { Loader, RotateCcw } from 'lucide-react'

// Spin animation
<Loader className="animate-spin" size={20} />

// Rotate on hover
<button className="group">
  <RotateCcw
    size={20}
    className="transition-transform group-hover:rotate-180"
  />
</button>
```

## Accessibility

### ARIA Labels

Always provide accessible labels for icon-only buttons:

```tsx
// ✓ Good: Has aria-label
<button aria-label="Close dialog">
  <X size={20} />
</button>

// ✗ Bad: No accessible label
<button>
  <X size={20} />
</button>
```

### Decorative vs. Functional Icons

```tsx
// Decorative (with visible text)
<button className="flex items-center gap-2">
  <Save size={20} aria-hidden="true" />
  <span>Save</span>
</button>

// Functional (icon only)
<button aria-label="Save changes">
  <Save size={20} />
</button>
```

### Focus Indicators

Ensure icon buttons have visible focus states:

```tsx
<button className="p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-ring">
  <Settings size={20} />
</button>
```

## Icon Guidelines

### Size Guidelines

| Context | Recommended Size | Example |
|---------|-----------------|---------|
| Inline with text | 16px | `<Icon size={16} />` |
| Buttons (small) | 16-18px | `<Icon size={16} />` |
| Buttons (medium) | 20px | `<Icon size={20} />` |
| Buttons (large) | 24px | `<Icon size={24} />` |
| Headers | 24-32px | `<Icon size={28} />` |
| Hero sections | 32-48px | `<Icon size={40} />` |

### Color Guidelines

| Context | Color Class | Example |
|---------|------------|---------|
| Primary actions | `text-primary` | Submit buttons |
| Secondary content | `text-muted-foreground` | Metadata icons |
| Destructive actions | `text-destructive` | Delete buttons |
| Success states | `text-green-600` | Confirmation |
| Warning states | `text-yellow-600` | Caution |
| Error states | `text-destructive` | Errors |

### Visual Weight

- Use `strokeWidth={1.5}` for light/subtle icons
- Use `strokeWidth={2}` for standard icons (default)
- Use `strokeWidth={2.5}` for emphasis/headers

## Performance

### Tree Shaking

Lucide React is fully tree-shakeable. Only import icons you use:

```tsx
// ✓ Good: Named imports
import { Save, Edit, Trash } from 'lucide-react'

// ✗ Bad: Default import (imports all icons)
import * as Icons from 'lucide-react'
```

### Bundle Size

Each icon adds approximately:
- **~1-2KB** gzipped per icon
- Minimal impact with proper tree shaking

## Finding Icons

### Icon Browser

Visit [lucide.dev](https://lucide.dev/icons/) to:
- Browse all available icons
- Search by keyword
- View icon variations
- Copy import code

### Common Icon Categories

- **Files & Folders**: FileText, File, Folder, FolderOpen
- **Actions**: Plus, Edit, Trash, Save, Copy, Download
- **Navigation**: ArrowLeft, ArrowRight, ChevronDown, Menu
- **Status**: Check, X, AlertCircle, Info, HelpCircle
- **Media**: Play, Pause, Volume, Camera, Image
- **Communication**: Mail, MessageSquare, Phone, Send
- **Settings**: Settings, Sliders, Tool, Wrench

## Best Practices

### Do's

✓ **Use consistent sizing** across similar contexts
✓ **Provide accessible labels** for icon buttons
✓ **Use semantic colors** from design tokens
✓ **Import only needed icons** for tree shaking
✓ **Align icons with text** using flex layouts
✓ **Use appropriate stroke width** for visual hierarchy

### Don'ts

✗ **Don't mix icon libraries** (stick to Lucide)
✗ **Don't use arbitrary sizes** (use standard sizes)
✗ **Don't forget accessibility** labels
✗ **Don't use icons without context** when unclear
✗ **Don't overuse icons** (can clutter interface)

## Troubleshooting

### Icon Not Displaying

```tsx
// Check import is correct
import { IconName } from 'lucide-react'

// Ensure icon name is correct (case-sensitive)
<IconName /> // not <iconname />

// Check size is reasonable
<IconName size={20} /> // not size={0}
```

### Icon Color Issues

```tsx
// Icons inherit currentColor
<div className="text-primary">
  <Save size={20} /> {/* Will be primary color */}
</div>

// Or set explicitly
<Save size={20} className="text-primary" />
```

## Future Enhancements

- [ ] Icon component wrapper for consistent defaults
- [ ] Custom icon set for brand-specific icons
- [ ] Icon animation library
- [ ] Icon size presets (xs, sm, md, lg, xl)
- [ ] Icon documentation page in app
- [ ] SVG sprite optimization for frequently used icons

## Resources

- [Lucide React Documentation](https://lucide.dev/guide/packages/lucide-react)
- [Icon Browser](https://lucide.dev/icons/)
- [GitHub Repository](https://github.com/lucide-icons/lucide)
- [Figma Plugin](https://www.figma.com/community/plugin/939567362549682242/Lucide-Icons)
- [Icon Accessibility Guide](https://www.sarasoueidan.com/blog/accessible-icon-buttons/)
