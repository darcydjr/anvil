import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react'
import mermaid from 'mermaid'
import { useApp } from '../contexts/AppContext'
import { Maximize2, Minimize2, X, Move, RotateCcw } from 'lucide-react'

interface DiagramData {
  capabilities: any[]
  enablers: any[]
}

export default function RelationshipDiagram(): JSX.Element {
  const { loadDataWithDependencies, loading } = useApp()
  const mermaidRef = useRef<HTMLDivElement>(null)
  const expandedMermaidRef = useRef<HTMLDivElement>(null)
  const [diagramId] = useState<string>(() => `diagram-${Date.now()}`)
  const [expandedDiagramId] = useState<string>(() => `expanded-diagram-${Date.now()}`)
  const [diagramData, setDiagramData] = useState<DiagramData | null>(null)
  const [diagramLoading, setDiagramLoading] = useState<boolean>(true)
  const [isExpanded, setIsExpanded] = useState<boolean>(false)
  const [isPanMode, setIsPanMode] = useState<boolean>(false)
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState<boolean>(false)
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 })

  // Load diagram data with dependencies
  useEffect(() => {
    const loadDiagramData = async (): Promise<void> => {
      try {
        setDiagramLoading(true)
        const data = await loadDataWithDependencies()
        setDiagramData(data)
      } catch (error) {
        console.error('Failed to load diagram data:', error)
        setDiagramData({ capabilities: [], enablers: [] })
      } finally {
        setDiagramLoading(false)
      }
    }

    loadDiagramData()
  }, [loadDataWithDependencies])

  // Generate Mermaid diagram syntax
  const diagramSyntax = useMemo<string | null>(() => {
    if (diagramLoading || !diagramData) return null

    const { capabilities, enablers } = diagramData

    // If no capabilities or enablers, show default template diagram
    if (capabilities.length === 0 && enablers.length === 0) {
      return `
graph TB
    %% Default template showing relationship structure
    CAP1["🎯 Capability 1<br/>High-level functionality"]
    CAP2["🎯 Capability 2<br/>Another capability"]

    ENB1["⚙️ Enabler 1A<br/>Implementation detail"]
    ENB2["⚙️ Enabler 1B<br/>Implementation detail"]
    ENB3["⚙️ Enabler 2A<br/>Implementation detail"]

    %% Capability to Enabler relationships
    CAP1 --> ENB1
    CAP1 --> ENB2
    CAP2 --> ENB3

    %% Capability dependencies
    CAP1 -.-> CAP2

    %% Styling
    classDef capability fill:#e1f5fe,stroke:#01579b,stroke-width:2px,color:#000
    classDef enabler fill:#f3e5f5,stroke:#4a148c,stroke-width:2px,color:#000
    classDef dependency stroke:#ff9800,stroke-width:2px,stroke-dasharray: 5 5

    class CAP1,CAP2 capability
    class ENB1,ENB2,ENB3 enabler
      `
    }

    // Build diagram with actual data
    let diagram = `
graph TB
    %% Dynamic diagram showing actual capabilities and enablers
`

    // Add capabilities with CAP IDs shown
    const capabilityNodes = capabilities.map((cap: any) => {
      const capId = (cap.id || cap.name).replace(/[^a-zA-Z0-9_]/g, '_').replace(/^[^a-zA-Z]/, 'C_') || 'UnknownCap'
      const title = cap.title || cap.name
      const system = cap.system ? `${cap.system}` : ''
      const component = cap.component ? ` | ${cap.component}` : ''
      // Display only capability name, not ID
      const label = `🎯 ${title}<br/>${system}${component}`
      return {
        id: capId,
        label: label,
        originalId: cap.id,
        path: cap.path,
        system: cap.system,
        component: cap.component
      }
    })

    // Add only capability nodes to diagram (no enablers)
    capabilityNodes.forEach((cap: any) => {
      diagram += `    ${cap.id}["${cap.label}"]\n`
    })

    // Add capability dependency relationships
    capabilities.forEach((capability: any) => {
      const currentCapNode = capabilityNodes.find((cap: any) => cap.originalId === capability.id)
      if (!currentCapNode) return

      // Add upstream dependencies (dependencies this capability relies on)
      if (capability.upstreamDependencies && capability.upstreamDependencies.length > 0) {
        capability.upstreamDependencies.forEach((dep: any) => {
          if (dep.id) {
            const dependencyCap = capabilityNodes.find((cap: any) => cap.originalId === dep.id)
            if (dependencyCap) {
              diagram += `    ${dependencyCap.id} -.->|Upstream Dependency| ${currentCapNode.id}\n`
            }
          }
        })
      }

      // Add downstream dependencies (capabilities that depend on this one)
      if (capability.downstreamDependencies && capability.downstreamDependencies.length > 0) {
        capability.downstreamDependencies.forEach((dep: any) => {
          if (dep.id) {
            const dependentCap = capabilityNodes.find((cap: any) => cap.originalId === dep.id)
            if (dependentCap) {
              diagram += `    ${currentCapNode.id} -.->|Downstream Impact| ${dependentCap.id}\n`
            }
          }
        })
      }
    })

    // Group capabilities by system and component for better organization
    const systemGroups: Record<string, any> = {}

    // Group capabilities by system only (simpler boundary structure)
    capabilityNodes.forEach((cap: any) => {
      const capability = capabilities.find((c: any) => c.id === cap.originalId)
      const system = capability?.system || 'Unassigned'

      if (!systemGroups[system]) {
        systemGroups[system] = {
          system,
          capabilities: []
        }
      }
      systemGroups[system].capabilities.push(cap)
    })

    // Add subgraphs for system grouping (cleaner boundaries)
    const systemNames = Object.keys(systemGroups).filter(s => s !== 'Unassigned')
    if (systemNames.length > 1) {
      systemNames.forEach((systemName, index) => {
        const group = systemGroups[systemName]

        diagram += `
    subgraph SYS${index}["🏢 ${systemName} System"]
`
        // Add only capabilities to subgraph
        group.capabilities.forEach((cap: any) => {
          diagram += `        ${cap.id}\n`
        })

        diagram += `    end\n`
      })
    }

    // Add modern styling
    diagram += `
    %% Modern Professional Styling
    classDef capability fill:#ffffff,stroke:#3182ce,stroke-width:3px,color:#2b6cb0,font-weight:600,font-size:16px,rx:12,ry:12
    classDef enabler fill:#ffffff,stroke:#8b5cf6,stroke-width:3px,color:#6b46c1,font-weight:500,font-size:15px,rx:8,ry:8
    classDef dependency stroke:#38b2ac,stroke-width:2px,stroke-dasharray:8 4
    classDef system fill:#f0fff4,stroke:#38a169,stroke-width:2px,color:#2f855a,font-weight:bold

    ${capabilityNodes.filter((c: any) => c.id && c.id.trim()).length > 0 ? `class ${capabilityNodes.filter((c: any) => c.id && c.id.trim()).map((c: any) => c.id).join(',')} capability` : ''}
`

    return diagram
  }, [diagramData, diagramLoading])

  useEffect(() => {
    if (!diagramSyntax || !mermaidRef.current) return

    const renderDiagram = async (): Promise<void> => {
      try {
        // Initialize mermaid with beautiful modern theme
        mermaid.initialize({
          startOnLoad: false,
          theme: 'base',
          themeVariables: {
            primaryColor: '#ffffff',
            primaryTextColor: '#2d3748',
            primaryBorderColor: '#4299e1',
            lineColor: '#718096',
            secondaryColor: '#ebf8ff',
            secondaryTextColor: '#2b6cb0',
            secondaryBorderColor: '#3182ce',
            tertiaryColor: '#faf5ff',
            tertiaryTextColor: '#6b46c1',
            tertiaryBorderColor: '#8b5cf6',
            background: '#f7fafc',
            mainBkg: '#ffffff',
            cScale0: '#ebf8ff',
            cScale1: '#bee3f8',
            cScale2: '#90cdf4',
            edgeLabelBackground: '#ffffff',
            clusterBkg: '#f7fafc',
            clusterBorder: '#e2e8f0',
            textColor: '#2d3748',
            nodeTextColor: '#2d3748',
            errorBkgColor: '#fed7d7',
            errorTextColor: '#c53030'
          },
          flowchart: {
            useMaxWidth: true,
            htmlLabels: true,
            curve: 'basis',
            diagramPadding: 20
          },
          fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
          fontSize: 16
        })

        // Clear previous diagram
        mermaidRef.current.innerHTML = ''

        // Render new diagram
        const { svg } = await mermaid.render(diagramId, diagramSyntax)
        mermaidRef.current.innerHTML = svg

        // Add click handlers for navigation and apply pan transform
        const svgElement = mermaidRef.current.querySelector('svg')
        if (svgElement) {
          svgElement.addEventListener('click', handleDiagramClick)
          svgElement.style.transform = `translate(${panOffset.x}px, ${panOffset.y}px)`
          svgElement.style.cursor = isPanMode ? (isDragging ? 'grabbing' : 'grab') : 'default'
        }

      } catch (error) {
        console.error('Error rendering relationship diagram:', error)
        if (mermaidRef.current) {
          mermaidRef.current.innerHTML = `
          <div class="diagram-error">
            <p>Error rendering diagram</p>
            <small>${error instanceof Error ? error.message : 'Unknown error'}</small>
          </div>
        `
        }
      }
    }

    renderDiagram()

    // Cleanup
    return () => {
      const svgElement = mermaidRef.current?.querySelector('svg')
      if (svgElement) {
        svgElement.removeEventListener('click', handleDiagramClick)
      }
    }
  }, [diagramSyntax, diagramId, panOffset, isPanMode, isDragging])

  const handleDiagramClick = (event: MouseEvent): void => {
    // Find clicked node
    const clickedElement = (event.target as HTMLElement).closest('.node')
    if (!clickedElement) return

    const nodeId = clickedElement.id
    console.log('Clicked node:', nodeId)

    // TODO: Add navigation logic here
    // Could navigate to the specific capability or enabler view
  }

  const handleExpand = (): void => {
    setIsExpanded(true)
  }

  const handleCollapse = (): void => {
    setIsExpanded(false)
  }

  const togglePanMode = (): void => {
    setIsPanMode(!isPanMode)
  }

  const resetPan = (): void => {
    setPanOffset({ x: 0, y: 0 })
  }

  const handleMouseDown = useCallback((event: React.MouseEvent) => {
    if (!isPanMode) return

    setIsDragging(true)
    setDragStart({
      x: event.clientX - panOffset.x,
      y: event.clientY - panOffset.y
    })
    event.preventDefault()
  }, [isPanMode, panOffset])

  const handleMouseMove = useCallback((event: React.MouseEvent) => {
    if (!isDragging || !isPanMode) return

    const newOffset = {
      x: event.clientX - dragStart.x,
      y: event.clientY - dragStart.y
    }
    setPanOffset(newOffset)
  }, [isDragging, isPanMode, dragStart])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  const handleMouseLeave = useCallback(() => {
    setIsDragging(false)
  }, [])

  // Close expanded view on escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent): void => {
      if (event.key === 'Escape' && isExpanded) {
        handleCollapse()
      }
    }

    if (isExpanded) {
      document.addEventListener('keydown', handleEscape)
      return () => {
        document.removeEventListener('keydown', handleEscape)
      }
    }
  }, [isExpanded])

  // Render diagram in expanded view
  useEffect(() => {
    if (!diagramSyntax || !expandedMermaidRef.current || !isExpanded) return

    const renderExpandedDiagram = async (): Promise<void> => {
      try {
        // Initialize mermaid with the same configuration
        mermaid.initialize({
          startOnLoad: false,
          theme: 'base',
          themeVariables: {
            primaryColor: '#ffffff',
            primaryTextColor: '#2d3748',
            primaryBorderColor: '#4299e1',
            lineColor: '#718096',
            secondaryColor: '#ebf8ff',
            secondaryTextColor: '#2b6cb0',
            secondaryBorderColor: '#3182ce',
            tertiaryColor: '#faf5ff',
            tertiaryTextColor: '#6b46c1',
            tertiaryBorderColor: '#8b5cf6',
            background: '#f7fafc',
            mainBkg: '#ffffff',
            cScale0: '#ebf8ff',
            cScale1: '#bee3f8',
            cScale2: '#90cdf4',
            edgeLabelBackground: '#ffffff',
            clusterBkg: '#f7fafc',
            clusterBorder: '#e2e8f0',
            textColor: '#2d3748',
            nodeTextColor: '#2d3748',
            errorBkgColor: '#fed7d7',
            errorTextColor: '#c53030'
          },
          flowchart: {
            useMaxWidth: true,
            htmlLabels: true,
            curve: 'basis',
            diagramPadding: 20
          },
          fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
          fontSize: 16
        })

        // Clear previous diagram
        expandedMermaidRef.current.innerHTML = ''

        // Render new diagram with expanded ID
        const { svg } = await mermaid.render(expandedDiagramId, diagramSyntax)
        expandedMermaidRef.current.innerHTML = svg

        // Add click handlers for navigation and apply pan transform
        const svgElement = expandedMermaidRef.current.querySelector('svg')
        if (svgElement) {
          svgElement.addEventListener('click', handleDiagramClick)
          svgElement.style.transform = `translate(${panOffset.x}px, ${panOffset.y}px)`
          svgElement.style.cursor = isPanMode ? (isDragging ? 'grabbing' : 'grab') : 'default'
        }

      } catch (error) {
        console.error('Error rendering expanded diagram:', error)
        if (expandedMermaidRef.current) {
          expandedMermaidRef.current.innerHTML = `
          <div class="diagram-error">
            <p>Error rendering diagram</p>
            <small>${error instanceof Error ? error.message : 'Unknown error'}</small>
          </div>
        `
        }
      }
    }

    renderExpandedDiagram()

    // Cleanup
    return () => {
      const svgElement = expandedMermaidRef.current?.querySelector('svg')
      if (svgElement) {
        svgElement.removeEventListener('click', handleDiagramClick)
      }
    }
  }, [diagramSyntax, expandedDiagramId, isExpanded, panOffset, isPanMode, isDragging])

  if (loading || diagramLoading) {
    return (
      <div className="bg-card rounded-lg shadow-md border border-border p-6 mb-8">
        <div className="flex flex-col items-center justify-center py-8">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-muted-foreground">Loading relationship diagram...</p>
        </div>
      </div>
    )
  }

  const capabilities = diagramData?.capabilities || []
  const enablers = diagramData?.enablers || []

  return (
    <div className={`bg-card rounded-lg shadow-md border border-border p-6 mb-8 transition-all duration-300 ${isExpanded ? 'fixed inset-4 z-40 overflow-hidden' : ''}`}>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-semibold text-foreground mb-1">
            System Architecture{isExpanded ? ' - Expanded View' : ''}
          </h3>
          <p className="text-sm text-muted-foreground">
            {capabilities.length === 0
              ? 'Template showing capability dependencies'
              : `${capabilities.length} capabilities with dependency relationships`
            }
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={togglePanMode}
            className={`flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors ${
              isPanMode
                ? 'bg-secondary text-secondary-foreground hover:bg-secondary/90'
                : 'bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            }`}
            title={isPanMode ? 'Disable pan mode' : 'Enable pan mode'}
          >
            <Move size={16} />
            {isPanMode ? 'Pan: ON' : 'Pan'}
          </button>
          {isPanMode && (
            <button
              onClick={resetPan}
              className="flex items-center gap-2 px-3 py-2 text-sm bg-muted text-muted-foreground rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
              title="Reset pan position"
            >
              <RotateCcw size={16} />
              Reset
            </button>
          )}
          {isExpanded ? (
            <>
              <button
                onClick={handleCollapse}
                className="flex items-center gap-2 px-3 py-2 text-sm bg-muted text-muted-foreground rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
                title="Exit expanded view"
              >
                <Minimize2 size={16} />
                Collapse
              </button>
              <button
                onClick={handleCollapse}
                className="flex items-center justify-center w-8 h-8 text-muted-foreground rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
                title="Close"
              >
                <X size={18} />
              </button>
            </>
          ) : (
            <button
              onClick={handleExpand}
              className="flex items-center gap-2 px-3 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
              title="Expand diagram"
            >
              <Maximize2 size={16} />
              Expand
            </button>
          )}
        </div>
      </div>
      <div
        className={`bg-muted rounded-lg p-4 overflow-hidden transition-all duration-300 ${isExpanded ? 'h-[calc(100vh-200px)]' : ''}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        style={{
          cursor: isPanMode ? (isDragging ? 'grabbing' : 'grab') : 'default',
          userSelect: isPanMode ? 'none' : 'auto'
        }}
      >
        {isExpanded ? (
          <div ref={expandedMermaidRef} className="mermaid w-full h-full" />
        ) : (
          <div ref={mermaidRef} className="mermaid" />
        )}
      </div>
    </div>
  )
}
