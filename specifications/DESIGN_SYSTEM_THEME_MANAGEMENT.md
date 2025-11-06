# Theme Management - Design System Documentation
**Enabler**: ENB-833105
**Capability**: CAP-832930 - Design UI
**Status**: Implemented
**Last Updated**: November 3, 2025

## Overview

The Theme Management system provides seamless switching between light and dark modes with persistent user preferences. Built using the `next-themes` library, it offers system preference detection, smooth transitions, and zero-flash page loads.

## Implementation

### ThemeProvider Component

**Location**: `client/src/components/ThemeProvider.tsx`

The ThemeProvider wraps the entire application and manages theme state:

```typescript
import { type ThemeProviderProps, ThemeProvider as NextThemesProvider } from "next-themes"

export function ThemeProvider({ children, ...props }: ThemeProviderProps): JSX.Element {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      {...props}
    >
      {children}
    </NextThemesProvider>
  )
}
```

**Configuration**:
- `attribute="class"`: Uses class-based theme switching (`.dark` selector)
- `defaultTheme="system"`: Defaults to user's system preference
- `enableSystem`: Enables automatic system preference detection
- `disableTransitionOnChange`: Prevents CSS transitions during theme switch

### Theme Modes

#### Light Mode
- High contrast for daylight viewing
- Clean, professional aesthetic
- Optimized for readability
- Uses OKLCH light color palette

#### Dark Mode
- Reduced eye strain for low-light environments
- OLED-friendly colors
- Maintains contrast ratios for accessibility
- Uses OKLCH dark color palette

#### System Mode
- Automatically matches operating system preference
- Respects `prefers-color-scheme` media query
- Switches automatically when system theme changes

### CSS Implementation

**Location**: `client/src/index.css`

Theme colors are defined using CSS custom properties:

```css
@layer base {
  :root {
    /* Light mode colors */
    --background: oklch(0.95 0.005 211);
    --foreground: oklch(0.15 0.08 211);
    /* ... other light mode tokens ... */
  }

  html.dark,
  .dark {
    /* Dark mode colors */
    --background: oklch(0.15 0.08 211);
    --foreground: oklch(0.92 0.01 211);
    /* ... other dark mode tokens ... */
  }
}
```

### Usage in Components

Components automatically respond to theme changes through CSS variables:

```tsx
// Colors automatically adjust based on theme
<div className="bg-background text-foreground">
  <h1 className="text-primary">Themed Content</h1>
  <button className="bg-primary text-primary-foreground">
    Themed Button
  </button>
</div>
```

### useTheme Hook

Access and control theme from any component:

```typescript
import { useTheme } from 'next-themes'

function MyComponent() {
  const { theme, setTheme, systemTheme } = useTheme()

  return (
    <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
      Toggle theme
    </button>
  )
}
```

## Storage and Persistence

**Mechanism**: localStorage
**Key**: `theme` (managed by next-themes)
**Values**: `'light'`, `'dark'`, or `'system'`

Theme preference is automatically persisted and restored across sessions.

## Browser Compatibility

- **Chrome/Edge**: ✓ Full support
- **Firefox**: ✓ Full support
- **Safari**: ✓ Full support
- **Mobile browsers**: ✓ Full support

## Accessibility

- Maintains WCAG 2.1 AA contrast ratios in both themes
- Respects `prefers-color-scheme` for users with accessibility needs
- No flash of unstyled content (FOUC) on page load
- Smooth visual experience without jarring transitions

## Pending Implementation

### Theme Toggle UI Component
A dedicated theme toggle button component is needed for user-facing theme switching:

```typescript
// Recommended implementation
function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  return (
    <button
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      className="p-2 rounded-lg hover:bg-accent"
      aria-label="Toggle theme"
    >
      {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
    </button>
  )
}
```

**Suggested Location**: `client/src/components/ThemeToggle.tsx`
**Integration**: Add to Layout header/navigation

## Best Practices

1. **Always test in both themes** during component development
2. **Use semantic color tokens** instead of hardcoded colors
3. **Avoid theme-specific logic** in components when possible
4. **Test contrast ratios** for all text/background combinations
5. **Consider OLED displays** when designing dark mode

## Future Enhancements

- [ ] Multiple theme presets (beyond light/dark)
- [ ] Custom accent color selection
- [ ] Theme preview before applying
- [ ] Scheduled theme switching (auto dark at night)
- [ ] Per-workspace theme preferences

## References

- [next-themes Documentation](https://github.com/pacocoursey/next-themes)
- [OKLCH Color Space](https://oklch.com/)
- [Tailwind CSS Dark Mode](https://tailwindcss.com/docs/dark-mode)
