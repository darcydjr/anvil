import React, { useEffect, useState } from 'react'
import { useTheme } from 'next-themes'

interface ColorInfo {
  name: string
  variable: string
  computedValue: string
  tailwindClass: string
}

export default function DesignSystemDebug(): JSX.Element {
  const { theme } = useTheme()
  const [colors, setColors] = useState<ColorInfo[]>([])
  const [cssVariables, setCssVariables] = useState<Record<string, string>>({})
  const [tailwindStatus, setTailwindStatus] = useState<string>('checking...')

  useEffect(() => {
    // Get computed styles from root
    const root = document.documentElement
    const computedStyle = getComputedStyle(root)

    // Extract all --color-* variables
    const colorVars: Record<string, string> = {}
    const colorInfos: ColorInfo[] = []

    const colorNames = [
      { name: 'Background', variable: '--color-background', tailwindClass: 'bg-background' },
      { name: 'Foreground', variable: '--color-foreground', tailwindClass: 'text-foreground' },
      { name: 'Primary', variable: '--color-primary', tailwindClass: 'bg-primary' },
      { name: 'Primary Foreground', variable: '--color-primary-foreground', tailwindClass: 'text-primary-foreground' },
      { name: 'Secondary', variable: '--color-secondary', tailwindClass: 'bg-secondary' },
      { name: 'Muted', variable: '--color-muted', tailwindClass: 'bg-muted' },
      { name: 'Muted Foreground', variable: '--color-muted-foreground', tailwindClass: 'text-muted-foreground' },
      { name: 'Accent', variable: '--color-accent', tailwindClass: 'bg-accent' },
      { name: 'Border', variable: '--color-border', tailwindClass: 'border-border' },
      { name: 'Input', variable: '--color-input', tailwindClass: 'bg-input' },
      { name: 'Ring', variable: '--color-ring', tailwindClass: 'ring-ring' },
      { name: 'Destructive', variable: '--color-destructive', tailwindClass: 'bg-destructive' },
      { name: 'Card', variable: '--color-card', tailwindClass: 'bg-card' },
    ]

    colorNames.forEach(({ name, variable, tailwindClass }) => {
      const value = computedStyle.getPropertyValue(variable).trim()
      colorVars[variable] = value
      colorInfos.push({
        name,
        variable,
        computedValue: value,
        tailwindClass,
      })
    })

    setCssVariables(colorVars)
    setColors(colorInfos)

    // Check if Tailwind is loaded
    const testElement = document.createElement('div')
    testElement.className = 'bg-primary'
    document.body.appendChild(testElement)
    const bgColor = getComputedStyle(testElement).backgroundColor
    document.body.removeChild(testElement)

    if (bgColor && bgColor !== 'rgba(0, 0, 0, 0)' && bgColor !== 'transparent') {
      setTailwindStatus(`✅ Tailwind loaded (bg-primary = ${bgColor})`)
    } else {
      setTailwindStatus(`❌ Tailwind NOT working (bg-primary = ${bgColor})`)
    }

    // Log to console for easy copying
    console.group('🎨 Design System Debug Info')
    console.log('Theme mode:', theme)
    console.log('CSS Variables:', colorVars)
    console.log('Tailwind Status:', tailwindStatus)
    console.log('Document classes:', document.documentElement.className)
    console.log('Body classes:', document.body.className)
    console.groupEnd()
  }, [theme, tailwindStatus])

  return (
    <div className="p-8 bg-background min-h-screen">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="border border-border rounded-lg p-6 bg-card">
          <h1 className="text-3xl font-bold text-foreground mb-2">Design System Debug Panel</h1>
          <p className="text-muted-foreground">
            Use this page to diagnose design system issues. Copy the console output or take screenshots to share with Claude.
          </p>
        </div>

        {/* Current Theme */}
        <div className="border border-border rounded-lg p-6 bg-card">
          <h2 className="text-2xl font-semibold text-foreground mb-4">Current Theme</h2>
          <div className="space-y-2">
            <p className="text-foreground">
              <strong>Active Theme:</strong> <span className="font-mono bg-muted px-2 py-1 rounded">{theme}</span>
            </p>
            <p className="text-foreground">
              <strong>HTML Classes:</strong>{' '}
              <span className="font-mono bg-muted px-2 py-1 rounded">{document.documentElement.className || '(none)'}</span>
            </p>
            <p className="text-foreground">
              <strong>Body Classes:</strong>{' '}
              <span className="font-mono bg-muted px-2 py-1 rounded">{document.body.className || '(none)'}</span>
            </p>
          </div>
        </div>

        {/* Tailwind Status */}
        <div className="border border-border rounded-lg p-6 bg-card">
          <h2 className="text-2xl font-semibold text-foreground mb-4">Tailwind Status</h2>
          <p className="text-lg font-mono">{tailwindStatus}</p>
        </div>

        {/* CSS Variables */}
        <div className="border border-border rounded-lg p-6 bg-card">
          <h2 className="text-2xl font-semibold text-foreground mb-4">CSS Variables (from :root)</h2>
          <div className="space-y-2">
            {colors.map((color) => (
              <div key={color.variable} className="flex items-center justify-between border-b border-border pb-2">
                <div className="flex-1">
                  <p className="font-semibold text-foreground">{color.name}</p>
                  <p className="text-sm font-mono text-muted-foreground">{color.variable}</p>
                </div>
                <div className="flex items-center gap-4">
                  <code className="text-sm bg-muted px-2 py-1 rounded text-foreground">
                    {color.computedValue || '❌ NOT SET'}
                  </code>
                  {color.computedValue && (
                    <div
                      className="w-16 h-8 rounded border border-border"
                      style={{ backgroundColor: color.computedValue }}
                      title={color.computedValue}
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tailwind Utility Classes Test */}
        <div className="border border-border rounded-lg p-6 bg-card">
          <h2 className="text-2xl font-semibold text-foreground mb-4">Tailwind Utility Classes Test</h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 bg-background border border-border rounded">
              <p className="text-sm font-mono mb-2">bg-background</p>
              <p className="text-foreground">Background color</p>
            </div>
            <div className="p-4 bg-primary border border-border rounded">
              <p className="text-sm font-mono mb-2 text-primary-foreground">bg-primary</p>
              <p className="text-primary-foreground">Primary color</p>
            </div>
            <div className="p-4 bg-secondary border border-border rounded">
              <p className="text-sm font-mono mb-2 text-secondary-foreground">bg-secondary</p>
              <p className="text-secondary-foreground">Secondary color</p>
            </div>
            <div className="p-4 bg-muted border border-border rounded">
              <p className="text-sm font-mono mb-2 text-muted-foreground">bg-muted</p>
              <p className="text-muted-foreground">Muted color</p>
            </div>
            <div className="p-4 bg-accent border border-border rounded">
              <p className="text-sm font-mono mb-2 text-accent-foreground">bg-accent</p>
              <p className="text-accent-foreground">Accent color</p>
            </div>
            <div className="p-4 bg-destructive border border-border rounded">
              <p className="text-sm font-mono mb-2 text-destructive-foreground">bg-destructive</p>
              <p className="text-destructive-foreground">Destructive color</p>
            </div>
          </div>
        </div>

        {/* Text Colors Test */}
        <div className="border border-border rounded-lg p-6 bg-card">
          <h2 className="text-2xl font-semibold text-foreground mb-4">Text Colors Test</h2>
          <div className="space-y-2">
            <p className="text-foreground">
              <span className="font-mono bg-muted px-2 py-1 rounded text-sm">text-foreground</span> - Main text color
            </p>
            <p className="text-muted-foreground">
              <span className="font-mono bg-muted px-2 py-1 rounded text-sm">text-muted-foreground</span> - Muted text color
            </p>
            <p className="text-primary">
              <span className="font-mono bg-muted px-2 py-1 rounded text-sm">text-primary</span> - Primary text color
            </p>
          </div>
        </div>

        {/* Instructions */}
        <div className="border border-destructive rounded-lg p-6 bg-destructive/10">
          <h2 className="text-2xl font-semibold text-foreground mb-4">📋 How to Share Debug Info with Claude</h2>
          <div className="space-y-3 text-foreground">
            <p><strong>Option 1: Browser Console</strong></p>
            <ol className="list-decimal list-inside space-y-1 ml-4">
              <li>Open browser DevTools (F12 or Cmd+Option+I)</li>
              <li>Go to the Console tab</li>
              <li>Look for "🎨 Design System Debug Info" group</li>
              <li>Expand it and copy all the output</li>
              <li>Paste it to Claude</li>
            </ol>

            <p className="mt-4"><strong>Option 2: Screenshot</strong></p>
            <ol className="list-decimal list-inside space-y-1 ml-4">
              <li>Take a screenshot of this entire page</li>
              <li>Share the screenshot with Claude</li>
            </ol>

            <p className="mt-4"><strong>Option 3: Inspect Element</strong></p>
            <ol className="list-decimal list-inside space-y-1 ml-4">
              <li>Right-click on any colored box above</li>
              <li>Click "Inspect" or "Inspect Element"</li>
              <li>In the Styles panel, look for computed colors</li>
              <li>Take a screenshot of the Styles panel</li>
              <li>Share with Claude</li>
            </ol>
          </div>
        </div>

        {/* Raw Data for Copying */}
        <div className="border border-border rounded-lg p-6 bg-card">
          <h2 className="text-2xl font-semibold text-foreground mb-4">📄 Raw Data (Copy-Paste Ready)</h2>
          <pre className="bg-muted p-4 rounded overflow-x-auto text-sm">
            {JSON.stringify(
              {
                theme,
                htmlClasses: document.documentElement.className,
                bodyClasses: document.body.className,
                tailwindStatus,
                cssVariables,
                colors: colors.map(c => ({
                  name: c.name,
                  variable: c.variable,
                  value: c.computedValue
                }))
              },
              null,
              2
            )}
          </pre>
        </div>
      </div>
    </div>
  )
}
