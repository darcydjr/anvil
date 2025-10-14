import mermaid from 'mermaid'

// Initialize Mermaid
mermaid.initialize({
  startOnLoad: false,
  theme: 'default',
  themeVariables: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  },
  suppressErrorRendering: false,
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

export function renderMermaidDiagrams(): void {
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

    // Render the diagram
    mermaid.render(id + '-svg', mermaidCode).then(({ svg }) => {
      diagramDiv.innerHTML = svg
    }).catch((error: Error) => {
      console.error('Mermaid rendering error for diagram:', mermaidCode.substring(0, 100) + '...', error)
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
  })
}
