import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../contexts/AppContext'
import { FileText, Plus, ArrowLeft, ChevronDown, ChevronRight, Settings, Box, Zap } from 'lucide-react'

interface SidebarExpandedSections {
  capabilities: boolean
  enablers: boolean
}

interface ExpandedComponentGroups {
  [groupKey: string]: boolean
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

interface Requirement {
  id: string
  name: string
  type: 'Functional' | 'Non-Functional'
  enablerID: string
  enablerName: string
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
    loading,
    searchTerm,
    searchResults
  } = useApp()

  const [expandedSections, setExpandedSections] = useState<SidebarExpandedSections>({
    capabilities: true,
    enablers: true
  })

  const [expandedComponentGroups, setExpandedComponentGroups] = useState<ExpandedComponentGroups>({})

  const navigate = useNavigate()

  const toggleSection = (section: keyof SidebarExpandedSections): void => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  const toggleComponentGroup = (groupKey: string): void => {
    setExpandedComponentGroups(prev => ({
      ...prev,
      [groupKey]: !prev[groupKey]
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

  const handleRequirementClick = (requirement: Requirement): void => {
    // Find the enabler that contains this requirement
    const enabler = enablers.find(e => e.id === requirement.enablerID)
    if (enabler) {
      setSelectedDocument({
        type: 'enabler',
        path: enabler.path,
        id: enabler.id || enabler.title || enabler.path
      })
      navigate(`/view/enabler/${enabler.path}`)
    }
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

  const capabilityGroups = useMemo(() => groupCapabilitiesBySystemComponent(capabilities), [capabilities])

  // Initialize expanded state for new component groups (open by default)
  useEffect(() => {
    setExpandedComponentGroups(prev => {
      const newState = { ...prev }
      Object.keys(capabilityGroups).forEach(groupKey => {
        if (!(groupKey in newState)) {
          newState[groupKey] = true // Open by default
        }
      })
      return newState
    })
  }, [capabilityGroups])

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

  // Show search results if there's a search term
  if (searchTerm.trim()) {
    return (
      <div className="bg-card text-foreground rounded-[10px] p-6 shadow-md overflow-y-auto max-h-[calc(100vh-120px)]">
        {navigationHistory.length > 0 && (
          <button onClick={handleBackClick} className="flex items-center gap-2 py-2 px-4 mb-4 bg-card/70 border border-border rounded cursor-pointer text-sm text-primary w-full transition-all duration-150 ease-in-out backdrop-blur-[1px] hover:bg-accent hover:text-primary/80 hover:backdrop-blur-[2px]">
            <ArrowLeft size={16} />
            Back
          </button>
        )}

        <div className="mb-6">
          <h4 className="text-lg font-semibold text-foreground border-b-2 border-primary pb-2 mb-4">
            Search Results for "{searchTerm}"
          </h4>

          {searchResults.capabilities.length > 0 && (
            <div className="mb-6">
              <h5 className="text-md font-medium text-foreground mb-3 flex items-center gap-2">
                <Box size={16} />
                Capabilities ({searchResults.capabilities.length})
              </h5>
              <div className="ml-4 border-l-2 border-primary/20 pl-2 space-y-1">
                {searchResults.capabilities.map((capability) => {
                  const isActive = selectedDocument?.type === 'capability' && selectedDocument?.path === capability.path
                  const isImplemented = capability.status === 'Implemented'
                  return (
                    <div
                      key={capability.path}
                      className={`flex items-center gap-3 py-2 px-3 rounded-md cursor-pointer transition-all duration-150 ease-in-out text-foreground text-sm ${
                        isActive
                          ? 'bg-primary/80 text-primary-foreground backdrop-blur-sm'
                          : 'hover:bg-accent hover:text-accent-foreground hover:backdrop-blur-sm'
                      } ${isImplemented ? 'relative' : ''}`}
                      onClick={() => handleCapabilityClick(capability)}
                    >
                      <Zap size={16} className={isImplemented ? 'text-chart-4 fill-chart-4' : ''} />
                      <span className="flex-1 break-words">{capability.title || capability.name}</span>
                      {capability.id && <small className="text-xs opacity-70">({capability.id})</small>}
                      {isImplemented && <span className="absolute right-2 text-xs opacity-70">✨</span>}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {searchResults.enablers.length > 0 && (
            <div className="mb-6">
              <h5 className="text-md font-medium text-foreground mb-3 flex items-center gap-2">
                <Zap size={16} />
                Enablers ({searchResults.enablers.length})
              </h5>
              <div className="ml-4 border-l-2 border-primary/20 pl-2 space-y-1">
                {searchResults.enablers.map((enabler) => {
                  const isActive = selectedDocument?.type === 'enabler' && selectedDocument?.path === enabler.path
                  const isImplemented = enabler.status === 'Implemented'
                  return (
                    <div
                      key={enabler.path}
                      className={`flex items-center gap-3 py-2 px-3 rounded-md cursor-pointer transition-all duration-150 ease-in-out text-foreground text-sm ${
                        isActive
                          ? 'bg-primary/80 text-primary-foreground backdrop-blur-sm'
                          : 'hover:bg-accent hover:text-accent-foreground hover:backdrop-blur-sm'
                      } ${isImplemented ? 'relative' : ''}`}
                      onClick={() => handleEnablerClick(enabler)}
                    >
                      <Zap size={16} className={isImplemented ? 'text-chart-4 fill-chart-4' : ''} />
                      <span className="flex-1 break-words">{enabler.title || enabler.name}</span>
                      {enabler.id && <small className="text-xs opacity-70">({enabler.id})</small>}
                      {isImplemented && <span className="absolute right-2 text-xs opacity-70">✨</span>}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {searchResults.requirements.length > 0 && (
            <div className="mb-6">
              <h5 className="text-md font-medium text-foreground mb-3 flex items-center gap-2">
                <FileText size={16} />
                Requirements ({searchResults.requirements.length})
              </h5>
              <div className="ml-4 border-l-2 border-primary/20 pl-2 space-y-1">
                {searchResults.requirements.map((requirement, index) => (
                  <div
                    key={`${requirement.enablerID}-${requirement.id}-${index}`}
                    className="flex items-start gap-3 py-2 px-3 rounded-md cursor-pointer transition-all duration-150 ease-in-out text-foreground text-sm hover:bg-accent hover:text-accent-foreground hover:backdrop-blur-sm"
                    onClick={() => handleRequirementClick(requirement)}
                  >
                    <FileText size={16} className="mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <span className="block font-medium">{requirement.name || requirement.id}</span>
                      <small className="text-xs text-muted-foreground">
                        {requirement.type} • in {requirement.enablerName}
                      </small>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {searchResults.capabilities.length === 0 &&
           searchResults.enablers.length === 0 &&
           searchResults.requirements.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <p>No results found for "{searchTerm}"</p>
            </div>
          )}
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
            className="flex items-center justify-center w-8 h-8 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors duration-200 shadow-sm border border-primary/20"
            title="Create New Capability"
          >
            <Plus size={18} strokeWidth={2.5} />
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
                  <div
                    className="flex items-center gap-3 py-3 px-3 rounded-md transition-all duration-150 ease-in-out text-foreground cursor-pointer hover:bg-accent hover:text-accent-foreground"
                    onClick={() => toggleComponentGroup(groupKey)}
                  >
                    {expandedComponentGroups[groupKey] ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    <Box size={16} />
                    <span>{groupKey}</span>
                  </div>
                  {expandedComponentGroups[groupKey] && (
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
                  )}
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
            className="flex items-center justify-center w-8 h-8 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors duration-200 shadow-sm border border-primary/20"
            title="Create New Enabler"
          >
            <Plus size={18} strokeWidth={2.5} />
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
