# Typography System - Design System Documentation
**Enabler**: ENB-833101
**Capability**: CAP-832930 - Design UI
**Status**: Implemented
**Last Updated**: November 3, 2025

## Overview

The Typography System defines font families, sizes, weights, line heights, and letter spacing for consistent text rendering across Ford Anvil. The system prioritizes readability, accessibility, and visual hierarchy.

## Font Families

### Primary Font Stack

**System UI Fonts** (for all UI elements):
```css
font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont,
             "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
```

**Benefits**:
- Native OS appearance
- Optimal performance (no font downloads)
- Excellent readability
- Cross-platform consistency

### Monospace Font Stack

**For code and technical content**:
```css
font-family: ui-monospace, 'SF Mono', 'Cascadia Code', 'Courier New', monospace;
```

**Usage**:
- Code blocks
- Technical identifiers
- Terminal output
- Fixed-width data display

## Type Scale

### Heading Hierarchy

| Element | Size | Line Height | Weight | Usage |
|---------|------|-------------|--------|-------|
| H1 | 2rem (32px) | 1.3 | 600 (semibold) | Page titles, primary headings |
| H2 | 1.625rem (26px) | 1.3 | 600 (semibold) | Section headings |
| H3 | 1.375rem (22px) | 1.3 | 600 (semibold) | Subsection headings |
| H4 | 1.125rem (18px) | 1.3 | 600 (semibold) | Minor headings |
| H5 | 1rem (16px) | 1.3 | 600 (semibold) | Small headings |
| H6 | 0.875rem (14px) | 1.3 | 600 (semibold) | Micro headings, labels |

### Body Text

| Element | Size | Line Height | Usage |
|---------|------|-------------|-------|
| Body (default) | 1rem (16px) | 1.75 | Primary content, paragraphs |
| Large body | 1.125rem (18px) | 1.75 | Emphasized content, introductions |
| Small body | 0.875rem (14px) | 1.5 | Secondary content, captions |
| Tiny | 0.75rem (12px) | 1.4 | Fine print, metadata |

### Special Text

| Type | Size | Properties | Usage |
|------|------|------------|-------|
| Code inline | 0.875rem (14px) | monospace, padding: 0.125rem 0.375rem | Inline code snippets |
| Code block | 0.875rem (14px) | monospace, line-height: 1.6 | Multi-line code |
| Blockquote | 1rem (16px) | italic, muted color | Quoted content |

## Font Weights

| Weight | Value | Usage |
|--------|-------|-------|
| Normal | 400 | Body text, regular content |
| Medium | 500 | Subtle emphasis |
| Semibold | 600 | Headings, buttons, strong emphasis |
| Bold | 700 | High emphasis (use sparingly) |

## Line Heights

| Context | Value | Purpose |
|---------|-------|---------|
| Headings | 1.3 | Tight spacing for visual hierarchy |
| Body text | 1.75 | Comfortable reading |
| UI elements | 1.5 | Compact for interfaces |
| Code blocks | 1.6 | Clear line separation |

## Implementation

### Markdown Content Styles

**Location**: `client/src/index.css` (lines 100-275)

```css
.markdown-content {
  line-height: 1.75;
  font-size: 1rem;
}

.markdown-content h1 {
  font-size: 2rem;
  @apply border-b-2 border-primary;
  padding-bottom: 0.5rem;
  margin-top: 0;
}

.markdown-content h2 {
  font-size: 1.625rem;
  @apply text-primary border-b border-border/50;
  padding-bottom: 0.3rem;
}

/* ... additional heading and element styles ... */
```

### Tailwind Typography Classes

**Available utility classes**:

```tsx
// Font sizes
<p className="text-sm">Small text</p>
<p className="text-base">Normal text</p>
<p className="text-lg">Large text</p>
<p className="text-xl">Extra large text</p>
<p className="text-2xl">2X large text</p>

// Font weights
<p className="font-normal">Normal weight</p>
<p className="font-medium">Medium weight</p>
<p className="font-semibold">Semibold weight</p>
<p className="font-bold">Bold weight</p>

// Line heights
<p className="leading-tight">Tight line height</p>
<p className="leading-normal">Normal line height</p>
<p className="leading-relaxed">Relaxed line height</p>
```

## Usage Guidelines

### Heading Best Practices

```tsx
// ✓ Good: Semantic HTML with proper hierarchy
<h1 className="text-3xl font-semibold text-foreground">
  Page Title
</h1>
<h2 className="text-2xl font-semibold text-primary">
  Section Heading
</h2>

// ✗ Bad: Non-semantic divs, skipping levels
<div className="text-3xl font-bold">
  Page Title
</div>
<h4>Skipped H2 and H3</h4>
```

### Body Text Best Practices

```tsx
// ✓ Good: Readable line length, proper line height
<p className="max-w-prose leading-relaxed text-foreground">
  This paragraph has good readability with proper line length
  and comfortable line spacing for extended reading.
</p>

// ✗ Bad: Too wide, tight line height
<p className="w-full leading-tight">
  This text is hard to read because lines are too long
  and spacing is too tight for comfortable reading.
</p>
```

### Code Display Best Practices

```tsx
// ✓ Good: Monospace with background
<code className="bg-muted/70 px-1.5 py-0.5 rounded text-sm font-mono">
  const variable = 'value'
</code>

// For code blocks
<pre className="bg-muted/50 p-4 rounded-lg overflow-x-auto">
  <code className="text-sm font-mono">
    {codeContent}
  </code>
</pre>
```

## Accessibility

### Readability Guidelines

- **Minimum font size**: 14px for body text
- **Maximum line length**: 65-75 characters (use `max-w-prose`)
- **Paragraph spacing**: 0.875rem (14px) between paragraphs
- **Contrast ratios**: Follow WCAG 2.1 AA standards

### Font Size Considerations

- Never use font sizes smaller than 12px for readable content
- Allow user zoom (don't disable viewport scaling)
- Use relative units (rem/em) for better accessibility
- Test with browser zoom at 200%

## Responsive Typography

### Mobile Considerations

```tsx
// Scale headings on mobile
<h1 className="text-2xl md:text-3xl lg:text-4xl">
  Responsive Heading
</h1>

// Adjust line length
<p className="max-w-full md:max-w-prose">
  Text that adapts to screen size
</p>
```

### Breakpoint Recommendations

| Breakpoint | H1 Size | Body Size | Line Length |
|------------|---------|-----------|-------------|
| Mobile (<640px) | 1.75rem | 1rem | 100% |
| Tablet (640-1024px) | 2rem | 1rem | max-w-prose |
| Desktop (>1024px) | 2.5rem | 1rem | max-w-prose |

## Special Use Cases

### Markdown Content

Apply `.markdown-content` class for properly styled markdown:

```tsx
<div className="markdown-content"
     dangerouslySetInnerHTML={{ __html: markdownHTML }} />
```

**Includes**:
- Styled headings with borders
- Formatted lists and tables
- Code blocks with syntax highlighting
- Blockquotes with left border
- Links with underlines

### Data Tables

```tsx
<table className="text-sm">
  <thead>
    <th className="font-semibold text-foreground">Header</th>
  </thead>
  <tbody>
    <td className="text-muted-foreground">Data</td>
  </tbody>
</table>
```

### Form Labels

```tsx
<label className="text-sm font-medium text-foreground">
  Field Label
</label>
<input className="text-base" />
```

## Typography in Dark Mode

All typography automatically adapts to dark mode through color tokens:

- Headings use `text-foreground` or `text-primary`
- Body text uses `text-foreground`
- Muted text uses `text-muted-foreground`
- Code uses appropriate background and foreground combinations

## Future Enhancements

- [ ] Variable font support for smoother scaling
- [ ] Additional font weight options (300, 800)
- [ ] Custom font integration option
- [ ] Typography presets (compact, comfortable, spacious)
- [ ] Reading mode with enhanced typography
- [ ] Print stylesheet optimizations

## Tools and Resources

- [Tailwind Typography Plugin](https://tailwindcss.com/docs/typography-plugin)
- [Type Scale Calculator](https://type-scale.com/)
- [Modular Scale](https://www.modularscale.com/)
- [Web Typography Best Practices](https://web.dev/font-best-practices/)
- [Butterick's Practical Typography](https://practicaltypography.com/)
