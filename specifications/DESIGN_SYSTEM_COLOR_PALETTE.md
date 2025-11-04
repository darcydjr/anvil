# Color Palette System - Design System Documentation
**Enabler**: ENB-833100
**Capability**: CAP-832930 - Design UI
**Status**: Implemented
**Last Updated**: November 3, 2025

## Overview

The Color Palette System defines all colors used in Ford Anvil using the OKLCH color space for perceptually uniform colors across light and dark themes. The system provides semantic color tokens that automatically adapt to the current theme.

## OKLCH Color Space

**What is OKLCH?**
- Perceptually uniform color space
- Better than HSL for accessibility
- Maintains consistent perceived brightness
- Easier to create accessible color variations

**Format**: `oklch(lightness chroma hue / alpha)`
- **Lightness**: 0-1 (0 = black, 1 = white)
- **Chroma**: 0-0.4 (color intensity)
- **Hue**: 0-360 degrees
- **Alpha**: Optional transparency

## Color Tokens

### Base Semantic Tokens

| Token | Purpose | Light Mode | Dark Mode |
|-------|---------|------------|-----------|
| `--background` | Page background | `oklch(0.95 0.005 211)` | `oklch(0.15 0.08 211)` |
| `--foreground` | Primary text | `oklch(0.15 0.08 211)` | `oklch(0.92 0.01 211)` |
| `--card` | Card backgrounds | `oklch(1 0 0)` | `oklch(0.25 0.05 222)` |
| `--card-foreground` | Card text | `oklch(0.15 0.08 222)` | `oklch(0.98 0.02 210)` |
| `--popover` | Popover backgrounds | `oklch(1 0 0)` | `oklch(0.20 0.05 222)` |
| `--popover-foreground` | Popover text | `oklch(0.15 0.08 222)` | `oklch(0.98 0.02 210)` |

### Interactive Element Tokens

| Token | Purpose | Light Mode | Dark Mode |
|-------|---------|------------|-----------|
| `--primary` | Primary actions | `oklch(0.6 0.2 235)` | `oklch(0.9 0.1 235 / 80)` |
| `--primary-foreground` | Text on primary | `oklch(100% 0.0 0)` | `oklch(23.173% 0.04079 214.257)` |
| `--secondary` | Secondary actions | `oklch(99.281% 0.00654 209.662)` | `oklch(0.25 0.03 217)` |
| `--secondary-foreground` | Text on secondary | `oklch(0.20 0.05 222)` | `oklch(0.98 0.02 210)` |

### State Indication Tokens

| Token | Purpose | Light Mode | Dark Mode |
|-------|---------|------------|-----------|
| `--muted` | Muted backgrounds | `oklch(0.98 0.005 210)` | `oklch(0.25 0.03 217)` |
| `--muted-foreground` | Muted text | `oklch(0.55 0.02 215)` | `oklch(0.70 0.02 215)` |
| `--accent` | Accent backgrounds | `oklch(0.96 0.01 210)` | `oklch(0.25 0.03 217)` |
| `--accent-foreground` | Text on accent | `oklch(0.20 0.05 222)` | `oklch(0.98 0.02 210)` |
| `--destructive` | Destructive actions | `oklch(0.55 0.22 27)` | `oklch(0.45 0.20 27)` |
| `--destructive-foreground` | Text on destructive | `oklch(0.98 0.02 210)` | `oklch(0.98 0.02 210)` |

### Form Element Tokens

| Token | Purpose | Light Mode | Dark Mode |
|-------|---------|------------|-----------|
| `--border` | Border colors | `oklch(0.91 0.03 214)` | `oklch(0.25 0.03 217)` |
| `--input` | Input borders | `oklch(0.91 0.03 214)` | `oklch(0.25 0.03 217)` |
| `--ring` | Focus rings | `oklch(0.70 0.25 217)` | `oklch(0.60 0.25 224)` |

### Chart Color Tokens

| Token | Purpose | Light Mode | Dark Mode |
|-------|---------|------------|-----------|
| `--chart-1` | Primary chart color | `oklch(0.70 0.20 12)` | `oklch(0.60 0.20 220)` |
| `--chart-2` | Secondary chart color | `oklch(0.50 0.15 173)` | `oklch(0.55 0.15 160)` |
| `--chart-3` | Tertiary chart color | `oklch(0.35 0.10 197)` | `oklch(0.65 0.20 30)` |
| `--chart-4` | Quaternary chart color | `oklch(0.75 0.20 43)` | `oklch(0.70 0.18 280)` |
| `--chart-5` | Quinary chart color | `oklch(0.75 0.22 27)` | `oklch(0.65 0.20 340)` |

## Implementation

### CSS Custom Properties

**Location**: `client/src/index.css`

```css
@layer base {
  :root {
    --background: oklch(0.95 0.005 211);
    --foreground: oklch(0.15 0.08 211);
    /* ... other light mode tokens ... */
  }

  html.dark,
  .dark {
    --background: oklch(0.15 0.08 211);
    --foreground: oklch(0.92 0.01 211);
    /* ... other dark mode tokens ... */
  }
}
```

### Tailwind Configuration

**Location**: `client/tailwind.config.js`

```javascript
theme: {
  extend: {
    colors: {
      background: 'var(--background)',
      foreground: 'var(--foreground)',
      card: {
        DEFAULT: 'var(--card)',
        foreground: 'var(--card-foreground)'
      },
      // ... other color mappings
    }
  }
}
```

## Usage Guidelines

### Using Color Tokens in Components

```tsx
// Correct: Use semantic tokens
<div className="bg-background text-foreground">
  <button className="bg-primary text-primary-foreground">
    Primary Action
  </button>
</div>

// Incorrect: Hardcoded colors
<div className="bg-white text-black">
  <button className="bg-blue-500 text-white">
    Primary Action
  </button>
</div>
```

### Color Token Selection Guide

**For backgrounds:**
- Page/App background → `background`
- Card/Panel background → `card`
- Muted areas → `muted`
- Accent areas → `accent`

**For text:**
- Primary text → `foreground`
- Secondary text → `muted-foreground`
- On colored backgrounds → Use corresponding `-foreground` token

**For interactive elements:**
- Primary actions → `primary` / `primary-foreground`
- Secondary actions → `secondary` / `secondary-foreground`
- Destructive actions → `destructive` / `destructive-foreground`

**For borders:**
- Standard borders → `border`
- Input borders → `input`
- Focus indicators → `ring`

## Accessibility

### Contrast Ratios

All color combinations meet WCAG 2.1 AA requirements:
- **Normal text**: Minimum 4.5:1 contrast ratio
- **Large text**: Minimum 3:1 contrast ratio
- **UI components**: Minimum 3:1 contrast ratio

### Testing Tools

Recommended tools for verifying contrast:
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
- [Accessible Colors](https://accessible-colors.com/)
- Browser DevTools accessibility audits

## Adding New Colors

To add a new semantic color token:

1. **Define in CSS** (`client/src/index.css`):
```css
:root {
  --my-new-color: oklch(0.70 0.15 180);
}

.dark {
  --my-new-color: oklch(0.60 0.15 180);
}
```

2. **Add to Tailwind** (`client/tailwind.config.js`):
```javascript
colors: {
  'my-new-color': 'var(--my-new-color)',
}
```

3. **Use in components**:
```tsx
<div className="bg-my-new-color">Content</div>
```

## Color Naming Conventions

- Use semantic names (what it's for) not descriptive names (what it looks like)
- ✓ Good: `primary`, `destructive`, `muted`
- ✗ Bad: `blue`, `red`, `gray`

## Browser Support

- **Chrome/Edge 111+**: ✓ Native OKLCH support
- **Firefox 113+**: ✓ Native OKLCH support
- **Safari 15.4+**: ✓ Native OKLCH support
- **Older browsers**: Graceful fallback to sRGB

## Tools and Resources

- [OKLCH Color Picker](https://oklch.com/)
- [Color Space Converter](https://colorjs.io/apps/convert/)
- [Tailwind CSS Colors](https://tailwindcss.com/docs/customizing-colors)
- [CSS Color Module Level 4](https://www.w3.org/TR/css-color-4/)

## Future Enhancements

- [ ] Custom color theme builder
- [ ] Extended chart color palette (10+ colors)
- [ ] Color blind mode variations
- [ ] High contrast mode
- [ ] Print-optimized color scheme
