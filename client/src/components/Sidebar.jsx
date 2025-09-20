import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../contexts/AppContext'
import { FileText, Plus, ArrowLeft, ChevronDown, ChevronRight, Settings, Box, Zap, Wand2 } from 'lucide-react'
import DocumentWizard from './wizard/DocumentWizard'
import './Sidebar.css'

export default function Sidebar() {
  const {
    capabilities,
    enablers,
    templates,
    selectedCapability,
    setSelectedCapability,
    selectedDocument,
    setSelectedDocument,
    navigationHistory,
    goBack,
    clearHistory,
    loading,
    refreshData
  } = useApp()

  const [expandedSections, setExpandedSections] = useState({
    capabilities: true,
    enablers: true,
    templates: true
  })
  const [showWizard, setShowWizard] = useState(false)
  const [wizardType, setWizardType] = useState(null)

  const navigate = useNavigate()

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  const handleCapabilityClick = (capability) => {
    setSelectedCapability(capability)
    setSelectedDocument({ 
      type: 'capability', 
      path: capability.path, 
      id: capability.id || capability.title || capability.path
    })
    clearHistory()
    navigate(`/view/capability/${capability.path}`)
  }

  const handleEnablerClick = (enabler) => {
    setSelectedDocument({ 
      type: 'enabler', 
      path: enabler.path, 
      id: enabler.id || enabler.title || enabler.path
    })
    navigate(`/view/enabler/${enabler.path}`)
  }

  const handleTemplateClick = (template) => {
    setSelectedDocument({ 
      type: 'template', 
      path: template.path, 
      id: template.id || template.title || template.path
    })
    navigate(`/view/template/${template.path}`)
  }

  const handleCreateCapability = () => {
    // Clear selected document when creating new
    setSelectedDocument(null)
    navigate('/create/capability')
  }

  const handleCreateEnabler = () => {
    // Clear selected document when creating new
    setSelectedDocument(null)
    navigate('/create/enabler')
  }

  const handleCreateWithWizard = (type) => {
    setWizardType(type)
    setShowWizard(true)
  }

  const handleWizardComplete = async (wizardData) => {
    try {
      setShowWizard(false)

      // Import necessary utilities
      const { convertFormToMarkdown } = await import('../utils/markdownUtils')
      const { idToFilename, nameToFilename } = await import('../utils/fileUtils')
      const { apiService } = await import('../services/apiService')

      // Convert wizard data to markdown
      const contentToSave = convertFormToMarkdown(wizardData, wizardData.type)

      // Generate filename
      const filename = wizardData.id ? idToFilename(wizardData.id, wizardData.type) : nameToFilename(wizardData.name || 'untitled', wizardData.type)

      let savePath = filename
      if (wizardData.type === 'capability' && wizardData.selectedPath) {
        savePath = `${wizardData.selectedPath}/${filename}`
      }

      // Save the document
      if (wizardData.type === 'capability') {
        await apiService.saveCapabilityWithEnablers(
          savePath,
          contentToSave,
          wizardData.id,
          wizardData.internalUpstream || [],
          wizardData.internalDownstream || [],
          wizardData.enablers || []
        )
      } else if (wizardData.type === 'enabler') {
        await apiService.saveEnablerWithReparenting(
          savePath,
          contentToSave,
          wizardData,
          null
        )
      }

      // Save path preference
      if (wizardData.type === 'capability' && wizardData.selectedPath) {
        try {
          await apiService.updateConfig({
            lastSelectedCapabilityPath: wizardData.selectedPath
          })
        } catch (error) {
          console.error('Error saving path preference:', error)
        }
      }

      await refreshData()
      navigate(`/edit/${wizardData.type}/${savePath}`)
    } catch (error) {
      console.error('Error creating document from wizard:', error)
    }
  }

  const handleBackClick = () => {
    goBack()
  }

  // Filter enablers based on selected capability
  const filteredEnablers = selectedCapability
    ? enablers.filter(enabler => enabler.capabilityId === selectedCapability.id)
    : enablers

  // Group capabilities by system|component structure
  const groupCapabilitiesBySystemComponent = (capabilities) => {
    const groups = {}

    capabilities.forEach(capability => {
      // Use system and component metadata fields
      const system = capability.system?.trim()
      const component = capability.component?.trim()

      if (system && component) {
        // Create group key using metadata fields
        const groupKey = `${system} | ${component}`

        if (!groups[groupKey]) {
          groups[groupKey] = []
        }
        groups[groupKey].push(capability)
      } else {
        // Add to unassigned group if system or component is missing
        if (!groups['Unassigned']) {
          groups['Unassigned'] = []
        }
        groups['Unassigned'].push(capability)
      }
    })

    return groups
  }

  const capabilityGroups = groupCapabilitiesBySystemComponent(capabilities)

  if (loading) {
    return (
      <div className="sidebar">
        <div className="sidebar-loading">
          <div className="spinner"></div>
          Loading...
        </div>
      </div>
    )
  }

  return (
    <div className="sidebar">
      {navigationHistory.length > 0 && (
        <button onClick={handleBackClick} className="back-button">
          <ArrowLeft size={16} />
          Back
        </button>
      )}

      <div className="sidebar-section">
        <div 
          className="sidebar-section-header"
          onClick={() => toggleSection('capabilities')}
        >
          {expandedSections.capabilities ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          <span>Capabilities</span>
          <div className="section-actions">
            <button
              onClick={(e) => {
                e.stopPropagation()
                handleCreateWithWizard('capability')
              }}
              className="btn btn-sm btn-info"
              title="Create with wizard"
            >
              <Wand2 size={14} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                handleCreateCapability()
              }}
              className="btn btn-sm btn-primary"
              title="Create directly"
            >
              <Plus size={14} />
            </button>
          </div>
        </div>
        
        {expandedSections.capabilities && (
          <div className="sidebar-items">
            {Object.entries(capabilityGroups)
              .sort(([a], [b]) => {
                // Sort "Unassigned" to the bottom
                if (a === 'Unassigned') return 1
                if (b === 'Unassigned') return -1
                return a.localeCompare(b)
              })
              .map(([groupKey, groupCapabilities]) => (
                <div key={groupKey} className="capability-group">
                  <div className="sidebar-item capability-item group-header">
                    <Box size={16} />
                    <span>{groupKey}</span>
                  </div>
                  <div className="capability-group-items">
                    {groupCapabilities.map((capability) => (
                      <div
                        key={capability.path}
                        className={`sidebar-item capability-item ${selectedDocument?.type === 'capability' && selectedDocument?.path === capability.path ? 'active' : ''}`}
                        onClick={() => handleCapabilityClick(capability)}
                      >
                        <Zap size={16} />
                        <span>{capability.title || capability.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      <div className="sidebar-section">
        <div
          className="sidebar-section-header"
          onClick={() => toggleSection('enablers')}
        >
          {expandedSections.enablers ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          <span>Enablers</span>
          <div className="section-actions">
            <button
              onClick={(e) => {
                e.stopPropagation()
                handleCreateWithWizard('enabler')
              }}
              className="btn btn-sm btn-info"
              title="Create with wizard"
            >
              <Wand2 size={14} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                handleCreateEnabler()
              }}
              className="btn btn-sm btn-primary"
              title="Create directly"
            >
              <Plus size={14} />
            </button>
          </div>
        </div>
        
        {expandedSections.enablers && (
          <div className="sidebar-items">
            {filteredEnablers.map((enabler) => (
              <div 
                key={enabler.path}
                className={`sidebar-item ${selectedDocument?.type === 'enabler' && selectedDocument?.path === enabler.path ? 'active' : ''} ${selectedCapability ? 'indented' : ''}`}
                onClick={() => handleEnablerClick(enabler)}
              >
                <Zap size={16} />
                <span>{enabler.title || enabler.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="sidebar-section">
        <div 
          className="sidebar-section-header"
          onClick={() => toggleSection('templates')}
        >
          {expandedSections.templates ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          <span>Templates</span>
        </div>
        
        {expandedSections.templates && (
          <div className="sidebar-items">
            {templates.map((template) => (
              <div 
                key={template.path}
                className={`sidebar-item ${selectedDocument?.type === 'template' && selectedDocument?.path === template.path ? 'active' : ''}`}
                onClick={() => handleTemplateClick(template)}
              >
                <Settings size={16} />
                <span>{template.title || template.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {showWizard && (
        <DocumentWizard
          initialType={wizardType}
          onClose={() => setShowWizard(false)}
          onComplete={handleWizardComplete}
        />
      )}
    </div>
  )
}