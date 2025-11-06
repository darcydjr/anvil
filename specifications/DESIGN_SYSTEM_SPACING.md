# Spacing Scale System - Design System Documentation
**Enabler**: ENB-833102
**Capability**: CAP-832930 - Design UI
**Status**: Implemented
**Last Updated**: November 3, 2025

## Overview

The Spacing Scale System provides consistent spacing values for margins, padding, gaps, and layout dimensions throughout Ford Anvil. Built on Tailwind CSS's spacing scale with a 4px (0.25rem) base unit, it ensures visual harmony and predictable layouts.

## Base Unit

**Foundation**: 0.25rem (4px)

All spacing values are multiples of this base unit, creating a consistent rhythm throughout the interface.

## Spacing Scale

### Core Scale

| Token | Value (rem) | Value (px) | Usage |
|-------|-------------|------------|-------|
| 0 | 0 | 0px | Remove spacing |
| px | 1px | 1px | Hairline borders |
| 0.5 | 0.125rem | 2px | Micro spacing |
| 1 | 0.25rem | 4px | Extra small spacing |
| 1.5 | 0.375rem | 6px | Between XS and SM |
| 2 | 0.5rem | 8px | Small spacing |
| 2.5 | 0.625rem | 10px | Between SM and MD |
| 3 | 0.75rem | 12px | Small-medium spacing |
| 3.5 | 0.875rem | 14px | Between SM-MD and MD |
| 4 | 1rem | 16px | Medium spacing (base) |
| 5 | 1.25rem | 20px | Medium-large spacing |
| 6 | 1.5rem | 24px | Large spacing |
| 7 | 1.75rem | 28px | Between LG and XL |
| 8 | 2rem | 32px | Extra large spacing |
| 9 | 2.25rem | 36px | Between XL and 2XL |
| 10 | 2.5rem | 40px | 2X large spacing |
| 11 | 2.75rem | 44px | Between 2XL and 3XL |
| 12 | 3rem | 48px | 3X large spacing |
| 14 | 3.5rem | 56px | 4X large spacing |
| 16 | 4rem | 64px | 5X large spacing |
| 20 | 5rem | 80px | 6X large spacing |
| 24 | 6rem | 96px | 7X large spacing |
| 32 | 8rem | 128px | 8X large spacing |
| 40 | 10rem | 160px | 9X large spacing |
| 48 | 12rem | 192px | 10X large spacing |
| 56 | 14rem | 224px | 11X large spacing |
| 64 | 16rem | 256px | 12X large spacing |

## Border Radius

### Custom Radius Scale

**Base radius**: 0.5rem (8px)

| Token | Value | Usage |
|-------|-------|-------|
| `--radius` | 0.5rem | Base border radius |
| sm | calc(var(--radius) - 4px) | Small radius (4px) |
| md | calc(var(--radius) - 2px) | Medium radius (6px) |
| lg | var(--radius) | Large radius (8px) |
| xl | calc(var(--radius) + 4px) | Extra large radius (12px) |
| 2xl | calc(var(--radius) + 8px) | 2X large radius (16px) |
| 3xl | calc(var(--radius) + 16px) | 3X large radius (24px) |
| full | 9999px | Fully rounded (pills, circles) |

**Implementation** (`client/tailwind.config.js`):
```javascript
borderRadius: {
  lg: 'var(--radius)',
  md: 'calc(var(--radius) - 2px)',
  sm: 'calc(var(--radius) - 4px)'
}
```

## Usage Guidelines

### Margin and Padding

**Padding (Internal spacing)**:
```tsx
// ✓ Good: Consistent padding using scale
<div className="p-4">Standard padding (16px)</div>
<div className="px-6 py-4">Horizontal 24px, Vertical 16px</div>
<div className="p-2 md:p-4 lg:p-6">Responsive padding</div>

// ✗ Bad: Arbitrary values
<div className="p-[13px]">Inconsistent padding</div>
```

**Margin (External spacing)**:
```tsx
// ✓ Good: Consistent margin using scale
<div className="mb-4">Standard bottom margin (16px)</div>
<div className="my-8">Vertical margin (32px)</div>
<div className="mt-2 mb-6">Different top/bottom margins</div>

// ✗ Bad: Arbitrary values
<div className="mb-[23px]">Inconsistent margin</div>
```

### Component Spacing

**Card padding**:
```tsx
<div className="p-4 md:p-6">
  // Mobile: 16px padding
  // Desktop: 24px padding
</div>
```

**Section spacing**:
```tsx
<section className="py-12 md:py-16">
  // Mobile: 48px vertical padding
  // Desktop: 64px vertical padding
</section>
```

**Content gaps**:
```tsx
<div className="space-y-4">
  // 16px gap between child elements
</div>

<div className="grid gap-6">
  // 24px gap in grid layout
</div>
```

### Layout Spacing Recommendations

| Context | Spacing | Rationale |
|---------|---------|-----------|
| Between paragraphs | 0.875rem (14px) | Readable separation |
| Between sections | 3rem (48px) | Clear visual breaks |
| Card padding | 1rem (16px) | Comfortable internal space |
| Button padding | 0.5rem 1rem | Balanced clickable area |
| Input padding | 0.5rem 0.75rem | Comfortable hit target |
| List item spacing | 0.4rem (varies) | Scannable lists |
| Grid gaps | 1.5rem (24px) | Clear separation |

## Common Spacing Patterns

### Container Padding

```tsx
// Page container
<main className="container mx-auto px-4 md:px-6 lg:px-8">
  {/* Content */}
</main>

// Section container
<section className="px-4 py-12 md:px-6 md:py-16">
  {/* Section content */}
</section>
```

### Card Layouts

```tsx
// Standard card
<div className="rounded-lg p-6 space-y-4">
  <h3>Card Title</h3>
  <p>Card content</p>
</div>

// Compact card
<div className="rounded-md p-4 space-y-2">
  <h4>Compact Card</h4>
  <p className="text-sm">Content</p>
</div>
```

### Form Layouts

```tsx
// Form with consistent spacing
<form className="space-y-6">
  <div className="space-y-2">
    <label className="block">Label</label>
    <input className="w-full px-3 py-2" />
  </div>

  <div className="space-y-2">
    <label className="block">Label</label>
    <input className="w-full px-3 py-2" />
  </div>

  <button className="px-4 py-2">Submit</button>
</form>
```

### List Spacing

```tsx
// Vertical list
<ul className="space-y-2">
  <li>Item 1</li>
  <li>Item 2</li>
  <li>Item 3</li>
</ul>

// Horizontal list
<ul className="flex gap-4">
  <li>Item 1</li>
  <li>Item 2</li>
  <li>Item 3</li>
</ul>
```

## Tailwind Utility Classes

### Padding

```tsx
// All sides
className="p-4"    // 16px all sides
className="p-6"    // 24px all sides

// Horizontal/Vertical
className="px-4"   // 16px left/right
className="py-6"   // 24px top/bottom

// Individual sides
className="pt-4"   // 16px top
className="pr-4"   // 16px right
className="pb-4"   // 16px bottom
className="pl-4"   // 16px left
```

### Margin

```tsx
// All sides
className="m-4"    // 16px all sides

// Horizontal/Vertical
className="mx-4"   // 16px left/right
className="my-6"   // 24px top/bottom

// Individual sides
className="mt-4"   // 16px top
className="mr-4"   // 16px right
className="mb-4"   // 16px bottom
className="ml-4"   // 16px left

// Auto margins (centering)
className="mx-auto" // Horizontal centering
```

### Gap (Flexbox/Grid)

```tsx
// Flex/Grid gap
className="gap-4"    // 16px gap
className="gap-x-4"  // 16px horizontal gap
className="gap-y-6"  // 24px vertical gap

// Space between (Flexbox)
className="space-x-4"  // 16px horizontal space
className="space-y-4"  // 16px vertical space
```

## Responsive Spacing

### Mobile-First Approach

```tsx
// Small on mobile, larger on desktop
<div className="p-4 md:p-6 lg:p-8">
  // Mobile: 16px
  // Tablet: 24px
  // Desktop: 32px
</div>

// Responsive margins
<section className="mt-8 md:mt-12 lg:mt-16">
  // Mobile: 32px top margin
  // Tablet: 48px top margin
  // Desktop: 64px top margin
</section>
```

### Breakpoint-Specific Spacing

```tsx
<div className="
  p-2 sm:p-4 md:p-6 lg:p-8 xl:p-12
">
  // xs (<640px): 8px
  // sm (≥640px): 16px
  // md (≥768px): 24px
  // lg (≥1024px): 32px
  // xl (≥1280px): 48px
</div>
```

## Negative Spacing

Use for overlapping elements or pulling elements into margins:

```tsx
// Pull element up
<div className="-mt-4">Overlaps previous element</div>

// Pull element left
<div className="-ml-2">Extends into left margin</div>
```

## Best Practices

### Do's

✓ **Use the spacing scale** consistently
✓ **Use responsive spacing** for different screen sizes
✓ **Use semantic spacing** (space-y, gap) for related elements
✓ **Test on mobile** devices for touch targets
✓ **Maintain visual rhythm** with consistent spacing

### Don'ts

✗ **Don't use arbitrary values** (`p-[13px]`) unless absolutely necessary
✗ **Don't mix units** (px, rem, em) within same context
✗ **Don't use excessive spacing** that wastes screen space
✗ **Don't create cramped layouts** with insufficient spacing
✗ **Don't forget touch targets** (minimum 44px for mobile)

## Accessibility

### Touch Target Sizes

Minimum sizes for interactive elements:
- **Minimum**: 44x44px (WCAG 2.1 AAA)
- **Recommended**: 48x48px for better usability

```tsx
// Good touch target
<button className="px-4 py-3 min-h-[44px]">
  Button
</button>
```

### Visual Separation

- Use adequate spacing between interactive elements
- Maintain clear visual hierarchy with spacing
- Ensure sufficient contrast between spaced elements

## Tools and Resources

- [Tailwind Spacing Scale](https://tailwindcss.com/docs/customizing-spacing)
- [8-Point Grid System](https://spec.fm/specifics/8-pt-grid)
- [Material Design Spacing](https://material.io/design/layout/spacing-methods.html)
- [Space in Design Systems](https://medium.com/eightshapes-llc/space-in-design-systems-188bcbae0d62)

## Future Enhancements

- [ ] Container queries for component-level responsive spacing
- [ ] Spacing presets for different density modes
- [ ] Automatic spacing optimization based on content
- [ ] Advanced grid systems with custom spacing
- [ ] Spacing tokens for specific component types
