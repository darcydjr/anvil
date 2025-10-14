import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../contexts/AppContext'
import { FileText, Plus, ArrowLeft, ChevronDown, ChevronRight, Settings, Box, Zap } from 'lucide-react'

interface SidebarExpandedSections {
  capabilities: boolean
  enablers: boolean
}

interface Capability {
  id?: string
  title?: string
  name?: string
  path: string
  system?: string
  component?: string
  status?: string
}

interface Enabler {
  id?: string
  title?: string
  name?: string
  path: string
  capabilityId?: string
  status?: string
}

interface SelectedDocument {
  type: 'capability' | 'enabler'
  path: string
  id: string
}

export default function Sidebar(): JSX.Element {
  const {
    capabilities,
    enablers,
    selectedCapability,
    setSelectedCapability,
    selectedDocument,
    setSelectedDocument,
    navigationHistory,
    goBack,
    clearHistory,
    loading
  } = useApp()

  const [expandedSections, setExpandedSections] = useState<SidebarExpandedSections>({
    capabilities: true,
    enablers: true
  })

  const navigate = useNavigate()

  const toggleSection = (section: keyof SidebarExpandedSections): void => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  const handleCapabilityClick = (capability: Capability): void => {
    setSelectedCapability(capability)
    setSelectedDocument({
      type: 'capability',
      path: capability.path,
      id: capability.id || capability.title || capability.path
    })
    clearHistory()
    navigate(`/view/capability/${capability.path}`)
  }

  const handleEnablerClick = (enabler: Enabler): void => {
    setSelectedDocument({
      type: 'enabler',
      path: enabler.path,
      id: enabler.id || enabler.title || enabler.path
    })
    navigate(`/view/enabler/${enabler.path}`)
  }

  const handleCreateCapability = (): void => {
    setSelectedDocument(null)
    navigate('/create/capability')
  }

  const handleCreateEnabler = (): void => {
    setSelectedDocument(null)
    navigate('/create/enabler')
  }

  const handleBackClick = (): void => {
    goBack()
  }

  const filteredEnablers = selectedCapability
    ? enablers.filter(enabler => enabler.capabilityId === selectedCapability.id)
    : enablers

  const groupCapabilitiesBySystemComponent = (capabilitiesList: Capability[]): Record<string, Capability[]> => {
    const groups: Record<string, Capability[]> = {}

    capabilitiesList.forEach(capability => {
      const system = capability.system?.trim()
      const component = capability.component?.trim()

      if (system && component) {
        const groupKey = `${system} | ${component}`

        if (!groups[groupKey]) {
          groups[groupKey] = []
        }
        groups[groupKey].push(capability)
      } else {
        if (!groups['Unassigned']) {
          groups['Unassigned'] = []
        }
        groups['Unassigned'].push(capability)
      }
    })

    return groups
  }

  const capabilityGroups = groupCapabilitiesBySystemComponent(capabilities)

  const getAssociatedCapabilityId = (): string | null => {
    if (selectedDocument?.type === 'enabler') {
      const selectedEnabler = enablers.find(enabler => enabler.path === selectedDocument.path)
      return selectedEnabler?.capabilityId || null
    }
    return null
  }

  const associatedCapabilityId = getAssociatedCapabilityId()

  if (loading) {
    return (
      <div className="bg-card text-foreground rounded-[10px] p-6 shadow-md overflow-y-auto max-h-[calc(100vh-120px)]">
        <div className="flex items-center justify-center p-8 text-primary">
          <div className="spinner"></div>
          Loading...
        </div>
      </div>
    )
  }

  return (
    <div className="bg-card text-foreground rounded-[10px] p-6 shadow-md overflow-y-auto max-h-[calc(100vh-120px)]">
      {navigationHistory.length > 0 && (
        <button onClick={handleBackClick} className="flex items-center gap-2 py-2 px-4 mb-4 bg-card/70 border border-border rounded cursor-pointer text-sm text-primary w-full transition-all duration-150 ease-in-out backdrop-blur-[1px] hover:bg-accent hover:text-primary/80 hover:backdrop-blur-[2px]">
          <ArrowLeft size={16} />
          Back
        </button>
      )}

      <div className="mb-6">
        <div
          className="flex items-center gap-2 py-3 font-semibold text-xl text-foreground cursor-pointer border-b-2 border-primary mb-3 justify-between uppercase tracking-wide hover:text-foreground/90"
          onClick={(): void => toggleSection('capabilities')}
        >
          {expandedSections.capabilities ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          <span className="flex-1 ml-2">Capabilities</span>
          <button
            onClick={(e: React.MouseEvent<HTMLButtonElement>): void => {
              e.stopPropagation()
              handleCreateCapability()
            }}
            className="btn btn-sm btn-primary"
          >
            <Plus size={14} />
          </button>
        </div>

        {expandedSections.capabilities && (
          <div className="flex flex-col gap-1">
            {Object.entries(capabilityGroups)
              .sort(([a], [b]) => {
                if (a === 'Unassigned') return 1
                if (b === 'Unassigned') return -1
                return a.localeCompare(b)
              })
              .map(([groupKey, groupCapabilities]) => (
                <div key={groupKey} className="mb-4">
                  <div className="flex items-center gap-3 py-3 px-3 rounded-md transition-all duration-150 ease-in-out text-foreground">
                    <Box size={16} />
                    <span>{groupKey}</span>
                  </div>
                  <div className="ml-4 border-l-2 border-primary/20 pl-2">
                    {groupCapabilities
                      .sort((a, b) => {
                        const nameA = (a.title || a.name || '').toLowerCase()
                        const nameB = (b.title || b.name || '').toLowerCase()
                        return nameA.localeCompare(nameB)
                      })
                      .map((capability) => {
                        const isActive = selectedDocument?.type === 'capability' && selectedDocument?.path === capability.path
                        const isAssociated = !!associatedCapabilityId && capability.id === associatedCapabilityId
                        const isImplemented = capability.status === 'Implemented'

                        return (
                          <div
                            key={capability.path}
                            className={`flex items-center gap-3 py-3 px-3 rounded-md cursor-pointer transition-all duration-150 ease-in-out text-foreground mb-1 text-sm ${
                              isActive
                                ? 'bg-primary/80 text-primary-foreground backdrop-blur-sm'
                                : isAssociated
                                ? 'bg-transparent border-2 border-primary/80 rounded-lg text-primary font-medium'
                                : 'hover:bg-accent hover:text-accent-foreground hover:backdrop-blur-sm'
                            } ${isImplemented ? 'relative' : ''}`}
                            onClick={(): void => handleCapabilityClick(capability)}
                          >
                            <Zap size={16} className={isImplemented ? 'text-chart-4 fill-chart-4' : ''} />
                            <span className="flex-1 break-words">{capability.title || capability.name}</span>
                            {isImplemented && <span className="absolute right-2 text-xs opacity-70">✨</span>}
                          </div>
                        )
                      })}
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      <div className="mb-6 last:mb-0">
        <div
          className="flex items-center gap-2 py-3 font-semibold text-xl text-foreground cursor-pointer border-b-2 border-primary mb-3 justify-between uppercase tracking-wide hover:text-foreground/90"
          onClick={(): void => toggleSection('enablers')}
        >
          {expandedSections.enablers ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          <span className="flex-1 ml-2">Enablers</span>
          <button
            onClick={(e: React.MouseEvent<HTMLButtonElement>): void => {
              e.stopPropagation()
              handleCreateEnabler()
            }}
            className="btn btn-sm btn-primary"
          >
            <Plus size={14} />
          </button>
        </div>

        {expandedSections.enablers && (
          <div className="ml-4 border-l-2 border-primary/20 pl-2">
            {filteredEnablers
              .sort((a, b) => {
                const nameA = (a.title || a.name || '').toLowerCase()
                const nameB = (b.title || b.name || '').toLowerCase()
                return nameA.localeCompare(nameB)
              })
              .map((enabler) => {
                const isActive = selectedDocument?.type === 'enabler' && selectedDocument?.path === enabler.path
                const isImplemented = enabler.status === 'Implemented'

                return (
                  <div
                    key={enabler.path}
                    className={`flex items-center gap-3 py-3 px-3 rounded-md cursor-pointer transition-all duration-150 ease-in-out text-foreground mb-1 text-sm ${
                      isActive
                        ? 'bg-primary/80 text-primary-foreground backdrop-blur-sm'
                        : 'hover:bg-accent hover:text-accent-foreground hover:backdrop-blur-sm'
                    } ${isImplemented ? 'relative' : ''}`}
                    onClick={(): void => handleEnablerClick(enabler)}
                  >
                    <Zap size={16} className={isImplemented ? 'text-chart-4 fill-chart-4' : ''} />
                    <span className="flex-1 break-words">{enabler.title || enabler.name}</span>
                    {isImplemented && <span className="absolute right-2 text-xs opacity-70">✨</span>}
                  </div>
                )
              })}
          </div>
        )}
      </div>
    </div>
  )
}
