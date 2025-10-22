import mermaid from 'mermaid'

// Suppress console errors from Mermaid globally
const originalConsoleError = console.error
const originalConsoleWarn = console.warn

console.error = (...args: any[]) => {
  const message = args[0]?.toString() || ''
  if (message.includes('mermaid') || message.includes('Syntax error in text')) {
    return // Suppress mermaid errors
  }
  originalConsoleError(...args)
}

console.warn = (...args: any[]) => {
  const message = args[0]?.toString() || ''
  if (message.includes('mermaid') || message.includes('Syntax error in text')) {
    return // Suppress mermaid warnings
  }
  originalConsoleWarn(...args)
}

// Initialize Mermaid
mermaid.initialize({
  startOnLoad: false,
  theme: 'default',
  themeVariables: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  },
  suppressErrorRendering: true,
  logLevel: 'fatal',
  errorLevel: 'fatal',
  // Hide mermaid version footer
  securityLevel: 'loose',
  deterministicIds: false,
  flowchart: {
    curve: 'linear'
  },
  er: {
    curve: 'linear'
  }
})

// Override Mermaid's parseError function to suppress error display
try {
  // @ts-ignore - Accessing internal Mermaid functions
  if (mermaid.parseError) {
    // @ts-ignore
    mermaid.parseError = () => {
      // Silently ignore parse errors
    }
  }
} catch (e) {
  // Ignore if parseError doesn't exist
}

function isValidMermaidCode(code: string): boolean {
  const trimmed = code.trim()
  if (!trimmed) return false

  // Check for basic Mermaid diagram types
  const validDiagramTypes = [
    'graph', 'flowchart', 'sequenceDiagram', 'classDiagram', 'stateDiagram',
    'erDiagram', 'journey', 'gantt', 'pie', 'gitGraph', 'mindmap', 'timeline'
  ]

  return validDiagramTypes.some(type => trimmed.startsWith(type))
}

function cleanupMermaidErrors(): void {
  // Remove any mermaid error elements that might have been inserted into the DOM
  const errorElements = document.querySelectorAll('[class*="mermaid"], [id*="mermaid"]')
  errorElements.forEach(element => {
    const text = element.textContent || ''
    if (text.includes('Syntax error in text') || text.includes('mermaid version')) {
      element.remove()
    }
  })

  // Also check for any div elements with error text
  const allDivs = document.querySelectorAll('div')
  allDivs.forEach(div => {
    const text = div.textContent || ''
    if (text.includes('Syntax error in text') && text.includes('mermaid version')) {
      div.remove()
    }
  })
}

export function renderMermaidDiagrams(): void {
  // First clean up any existing errors
  cleanupMermaidErrors()

  const mermaidElements = document.querySelectorAll<HTMLElement>('code.language-mermaid, pre code.language-mermaid')

  mermaidElements.forEach((element, index) => {
    const mermaidCode = element.textContent || ''
    const id = 'mermaid-diagram-' + Date.now() + '-' + index

    // Create a div to hold the rendered diagram
    const diagramDiv = document.createElement('div')
    diagramDiv.id = id
    diagramDiv.className = 'mermaid-diagram'

    // Replace the code block with the diagram div
    const parent = element.closest('pre') || element
    parent.parentNode?.replaceChild(diagramDiv, parent)

    // Validate before rendering
    if (!isValidMermaidCode(mermaidCode)) {
      diagramDiv.innerHTML = `
        <div style="color: #856404; background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 10px; border-radius: 4px; font-size: 0.9em;">
          <strong>⚠️ Invalid Mermaid Diagram:</strong> Code block does not contain valid Mermaid syntax
          <details style="margin-top: 5px;">
            <summary>Show diagram code</summary>
            <pre style="font-size: 0.8em; overflow-x: auto; margin: 5px 0;">${mermaidCode}</pre>
          </details>
        </div>
      `
      return
    }

    // Render the diagram with better error handling
    try {
      mermaid.render(id + '-svg', mermaidCode).then(({ svg }) => {
        diagramDiv.innerHTML = svg
      }).catch((error: Error) => {
        console.warn('Mermaid rendering error suppressed:', error.message)
        diagramDiv.innerHTML = `
          <div style="color: #856404; background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 10px; border-radius: 4px; font-size: 0.9em;">
            <strong>⚠️ Diagram Syntax Error:</strong> ${error.message.split('\n')[0]}
            <details style="margin-top: 5px;">
              <summary>Show diagram code</summary>
              <pre style="font-size: 0.8em; overflow-x: auto; margin: 5px 0;">${mermaidCode}</pre>
            </details>
          </div>
        `
      })
    } catch (error) {
      console.warn('Mermaid rendering error suppressed:', error)
      diagramDiv.innerHTML = `
        <div style="color: #856404; background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 10px; border-radius: 4px; font-size: 0.9em;">
          <strong>⚠️ Diagram Error:</strong> Failed to render diagram
        </div>
      `
    }
  })

  // Clean up any errors that might have appeared during rendering
  setTimeout(cleanupMermaidErrors, 100)
  setTimeout(cleanupMermaidErrors, 500)
  setTimeout(cleanupMermaidErrors, 1000)
}

// Set up periodic cleanup to remove any stray mermaid errors
setInterval(cleanupMermaidErrors, 2000)
