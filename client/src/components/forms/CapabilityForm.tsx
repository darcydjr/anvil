import React, { useEffect, useRef, useCallback, useMemo, useState } from 'react'
import { Plus, Trash2, FileText, RefreshCcw, GripVertical } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../../contexts/AppContext'
import { generateEnablerId } from '../../utils/idGenerator'
import { stateListenerManager } from '../../utils/stateListeners'
import { STATUS_VALUES, APPROVAL_VALUES, PRIORITY_VALUES, REVIEW_VALUES } from '../../utils/constants'
import { apiService } from '../../services/apiService'
import toast from 'react-hot-toast'

import { CapabilityFormData, Dependency, Enabler, generateCapabilityTechnicalSpecificationsTemplate } from '../../utils/markdownUtils'

interface CapabilityFormProps {
  data: CapabilityFormData
  onChange: (newData: Partial<CapabilityFormData>) => void
  isNew?: boolean
  currentPath?: string | null
}

interface Workspace {
  id: string
  name: string
  description?: string
  projectPaths: (string | { path: string; icon: string })[]
  isActive?: boolean
}

interface WorkspacesData {
  workspaces: Workspace[]
  activeWorkspaceId: string | null
}

interface CapabilityLink {
  id: string
  title: string
  system?: string
  component?: string
}


function CapabilityForm({ data, onChange, isNew = false, currentPath = null }: CapabilityFormProps): JSX.Element {
  const { capabilities, enablers } = useApp()
  const navigate = useNavigate()
  const stateListenerRef = useRef(null)
  const [workspaces, setWorkspaces] = useState<WorkspacesData>({ workspaces: [], activeWorkspaceId: null })
  const [originalPath, setOriginalPath] = useState<string | null>(null)
  const [availableCapabilities, setAvailableCapabilities] = useState<CapabilityLink[]>([])
  const [draggedEnablerIndex, setDraggedEnablerIndex] = useState<number | null>(null)

  // State to track if we've already enriched the data
  const [hasEnriched, setHasEnriched] = useState(false)

  // Enrich enabler data ONLY on initial load
  useEffect(() => {
    if (!hasEnriched && data.enablers && data.enablers.length > 0 && enablers.length > 0) {
      console.log('🔍 CapabilityForm: Starting enabler enrichment', {
        dataEnablers: data.enablers.length,
        enablerFiles: enablers.length,
        enablerFileIds: enablers.map(e => e.id)
      })

      const enrichedData = data.enablers.map(enabler => {
        const enablerFile = enablers.find(e => e.id === enabler.id)

        console.log(`🔍 CapabilityForm: Processing enabler ${enabler.id}`, {
          enablerFile: enablerFile ? 'FOUND' : 'NOT_FOUND',
          enablerFilePriority: enablerFile?.priority,
          currentPriority: enabler.priority,
          enablerFileStatus: enablerFile?.status,
          enablerFileApproval: enablerFile?.approval
        })

        if (enablerFile) {
          const enriched = {
            ...enabler,
            name: enablerFile.name || enablerFile.title || enabler.name || '',
            description: enablerFile.purpose || enabler.description || '',
            status: enablerFile.status || STATUS_VALUES.ENABLER.IN_DRAFT,
            approval: enablerFile.approval || APPROVAL_VALUES.NOT_APPROVED,
            priority: enablerFile.priority || PRIORITY_VALUES.CAPABILITY_ENABLER.HIGH
          }

          console.log(`✅ CapabilityForm: Enriched enabler ${enabler.id}`, {
            before: { status: enabler.status, approval: enabler.approval, priority: enabler.priority },
            after: { status: enriched.status, approval: enriched.approval, priority: enriched.priority }
          })

          return enriched
        }
        return enabler
      })

      console.log('🔍 CapabilityForm: Final enriched data', enrichedData)
      onChange({ enablers: enrichedData })
      setHasEnriched(true)
    }
  }, [data.enablers, enablers, hasEnriched, onChange])

  // Use the form data directly (no enrichment after initial load)
  const enrichedEnablers = data.enablers || []

  // Initialize state listener for capability
  useEffect(() => {
    if (data.id) {
      stateListenerRef.current = stateListenerManager.getCapabilityListener(data.id)
      // Initialize with current state
      stateListenerRef.current.checkForChanges(data)
    }
  }, [data.id])

  // Check for state changes when data updates
  useEffect(() => {
    if (stateListenerRef.current && data.id) {
      stateListenerRef.current.checkForChanges(data)
    }
  }, [data.status, data.approval])

  // Load workspaces for path selection
  useEffect(() => {
    const loadWorkspaces = async () => {
      try {
        const response = await fetch('/api/workspaces')
        if (response.ok) {
          const workspaceData = await response.json()
          setWorkspaces(workspaceData)

          // Auto-select path logic
          const activeWorkspace = workspaceData.workspaces.find(ws => ws.id === workspaceData.activeWorkspaceId)
          if (activeWorkspace && activeWorkspace.projectPaths) {
            const availablePaths = activeWorkspace.projectPaths.map(pathObj =>
              typeof pathObj === 'string' ? pathObj : pathObj.path
            )

            // Set original path for existing capabilities
            if (!isNew && currentPath) {
              setOriginalPath(currentPath)
              // Always set the current path as selected for existing capabilities
              onChange({ selectedPath: currentPath })
            } else if (isNew) {
              // Check if this is the first capability and only one path exists
              const isFirstCapability = !capabilities || capabilities.length === 0
              const hasOnlyOnePath = availablePaths.length === 1

              if (isFirstCapability && hasOnlyOnePath && !data.selectedPath) {
                // Auto-select the only available path
                onChange({ selectedPath: availablePaths[0] })
              } else {
                // Try to use the last selected path from config
                const lastSelectedPath = data.lastSelectedCapabilityPath
                if (lastSelectedPath && availablePaths.includes(lastSelectedPath) && !data.selectedPath) {
                  console.log(`[PATH-PREFERENCE] Using last selected path: ${lastSelectedPath}`)
                  onChange({ selectedPath: lastSelectedPath })
                }
              }
            }
          }
        }
      } catch (error) {
        console.error('Error loading workspaces:', error)
      }
    }

    // Load workspaces for both new and existing capabilities
    loadWorkspaces()
  }, [isNew, capabilities, data.lastSelectedCapabilityPath, onChange, currentPath])

  // Load capabilities for dropdowns
  useEffect(() => {
    const loadCapabilities = async () => {
      try {
        const response = await apiService.getCapabilityLinks()
        setAvailableCapabilities(response.capabilities || [])
      } catch (error) {
        console.warn('Could not load capabilities for dropdown:', error)
      }
    }

    loadCapabilities()
  }, [])

  const handleBasicChange = useCallback(async (field, value) => {
    onChange({ [field]: value })
    
    // Save review field preferences to config
    if (['analysisReview'].includes(field)) {
      try {
        await apiService.updateConfig({ [field]: value })
        console.log(`Saved ${field} preference: ${value}`)
      } catch (error) {
        console.error(`Error saving ${field} preference:`, error)
      }
    }
  }, [onChange])

  const handleArrayChange = useCallback((field, index, key, value) => {
    const newArray = [...(data[field] || [])]
    newArray[index] = { ...newArray[index], [key]: value }
    onChange({ [field]: newArray })
  }, [data, onChange])

  const addArrayItem = useCallback((field, template) => {
    let newTemplate = { ...template }
    
    // Auto-generate Enabler ID if adding to enablers array
    if (field === 'enablers') {
      // Generate complete enabler with all metadata fields (like DocumentEditor)
      const currentDate = new Date().toISOString().split('T')[0]
      newTemplate = {
        id: generateNextEnablerId(),
        name: '',
        description: '',
        status: STATUS_VALUES.ENABLER.IN_DRAFT,
        approval: APPROVAL_VALUES.NOT_APPROVED, 
        priority: PRIORITY_VALUES.CAPABILITY_ENABLER.HIGH,
        owner: 'Product Team', // Default owner
        developer: '[Development Team/Lead]',
        createdDate: currentDate,
        lastUpdated: currentDate,
        version: '1.0',
        capabilityId: data.id || '', // Link to current capability
        // Technical sections will be preserved by template system
        functionalRequirements: [],
        nonFunctionalRequirements: []
      }
    }
    
    const newArray = [...(data[field] || []), newTemplate]
    onChange({ [field]: newArray })
  }, [data, onChange, capabilities, enablers])
  
  const generateNextEnablerId = () => {
    // Collect ALL enabler IDs from across the project (from app context)
    const allProjectEnablerIds = (enablers || [])
      .map(enabler => enabler.id)
      .filter(id => id && id.startsWith('ENB-'))
    
    // Also check enablers in current capability being edited (in case they haven't been saved yet)
    const currentCapabilityIds = (data.enablers || [])
      .map(enabler => enabler.id)
      .filter(id => id && id.startsWith('ENB-'))
    
    // Combine all existing IDs
    const allExistingIds = [...allProjectEnablerIds, ...currentCapabilityIds]
    
    // Use the new ID generation utility
    return generateEnablerId(allExistingIds)
  }

  const removeArrayItem = useCallback((field, index) => {
    const newArray = [...(data[field] || [])]
    newArray.splice(index, 1)
    onChange({ [field]: newArray })
  }, [data, onChange])

  const handleCreateEnablerDocument = useCallback((enabler, index) => {
    if (!enabler.id || !enabler.name) {
      toast.error('Enabler must have an ID and name before creating document')
      return
    }

    if (!data.id) {
      toast.error('Please save the capability first before creating enabler documents')
      return
    }

    // Navigate to create enabler with capability context
    navigate(`/create/enabler/for/${data.id}`, {
      state: {
        enablerData: enabler,
        capabilityId: data.id,
        capabilityName: data.name
      }
    })
  }, [navigate, data.id, data.name])

  // Function to approve all enablers
  const approveAllEnablers = useCallback(() => {
    const enablerData = data.enablers || []
    if (enablerData.length === 0) return

    const newArray = enablerData.map(enabler => ({
      ...enabler,
      approval: APPROVAL_VALUES.APPROVED
    }))

    onChange({ enablers: newArray })
  }, [data, onChange])

  // Memoize templates to prevent recreating on every render
  const templates = useMemo(() => ({
    upstream: { id: '', description: '' },
    downstream: { id: '', description: '' },
    enabler: {
      id: '',
      name: '',
      description: '',
      status: STATUS_VALUES.ENABLER.READY_FOR_ANALYSIS,
      approval: APPROVAL_VALUES.NOT_APPROVED,
      priority: PRIORITY_VALUES.CAPABILITY_ENABLER.HIGH
    }
  }), [])

  // Group capabilities by system and component
  const groupedCapabilities = useMemo(() => {
    const groups = {}

    availableCapabilities.forEach(cap => {
      const system = cap.system || 'Unknown System'
      const component = cap.component || 'Unknown Component'

      if (!groups[system]) {
        groups[system] = {}
      }

      if (!groups[system][component]) {
        groups[system][component] = []
      }

      groups[system][component].push(cap)
    })

    return groups
  }, [availableCapabilities])
  
  // Memoize status, approval, priority, and review options
  const statusOptions = useMemo(() => [
    STATUS_VALUES.CAPABILITY.IN_DRAFT,
    STATUS_VALUES.CAPABILITY.READY_FOR_ANALYSIS,
    STATUS_VALUES.CAPABILITY.READY_FOR_DESIGN,
    STATUS_VALUES.CAPABILITY.READY_FOR_IMPLEMENTATION,
    STATUS_VALUES.CAPABILITY.IMPLEMENTED,
    STATUS_VALUES.CAPABILITY.READY_FOR_REFACTOR
  ].sort(), [])
  const approvalOptions = useMemo(() => Object.values(APPROVAL_VALUES), [])
  const priorityOptions = useMemo(() => Object.values(PRIORITY_VALUES.CAPABILITY_ENABLER), [])
  const reviewOptions = useMemo(() => Object.values(REVIEW_VALUES), [])

  // Extract unique systems and components from existing capabilities
  const existingSystems = useMemo(() => {
    if (!capabilities || capabilities.length === 0) return []
    const systems = capabilities
      .map(cap => cap.system)
      .filter(system => system && system.trim())
      .map(system => system.trim())
    return [...new Set(systems)].sort()
  }, [capabilities])

  const existingComponents = useMemo(() => {
    if (!capabilities || capabilities.length === 0) return []
    const components = capabilities
      .map(cap => cap.component)
      .filter(component => component && component.trim())
      .map(component => component.trim())
    return [...new Set(components)].sort()
  }, [capabilities])
  const enablerStatusOptions = useMemo(() => [
    STATUS_VALUES.ENABLER.IN_DRAFT,
    STATUS_VALUES.ENABLER.READY_FOR_ANALYSIS,
    STATUS_VALUES.ENABLER.READY_FOR_DESIGN,
    STATUS_VALUES.ENABLER.READY_FOR_IMPLEMENTATION,
    STATUS_VALUES.ENABLER.READY_FOR_REFACTOR,
    STATUS_VALUES.ENABLER.READY_FOR_RETIREMENT,
    STATUS_VALUES.ENABLER.IMPLEMENTED,
    STATUS_VALUES.ENABLER.RETIRED
  ].sort(), [])

  // Function to clear technical specifications and replace with template
  const handleClearTechnicalSpecifications = useCallback(() => {
    const confirmed = window.confirm(
      'Are you sure you want to clear the technical specifications and replace them with the template? This action cannot be undone.'
    )

    if (confirmed) {
      const templateSpecs = generateCapabilityTechnicalSpecificationsTemplate()
      onChange({ technicalSpecifications: templateSpecs })
      toast.success('Technical specifications cleared and replaced with template')
    }
  }, [onChange])

  // Drag and drop handlers for enablers
  const handleEnablerDragStart = useCallback((e: React.DragEvent, index: number) => {
    setDraggedEnablerIndex(index)
    e.dataTransfer.effectAllowed = 'move'
  }, [])

  const handleEnablerDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }, [])

  const handleEnablerDrop = useCallback((e: React.DragEvent, targetIndex: number) => {
    e.preventDefault()

    if (draggedEnablerIndex === null || draggedEnablerIndex === targetIndex) {
      setDraggedEnablerIndex(null)
      return
    }

    const enablers = [...(data.enablers || [])]

    // Remove from source position
    const [removed] = enablers.splice(draggedEnablerIndex, 1)

    // Insert at target position
    enablers.splice(targetIndex, 0, removed)

    onChange({ enablers })
    setDraggedEnablerIndex(null)
  }, [draggedEnablerIndex, data.enablers, onChange])

  const handleEnablerDragEnd = useCallback(() => {
    setDraggedEnablerIndex(null)
  }, [])

  return (
    <div className="space-y-6">
      {/* Basic Information */}
      <div className="bg-card rounded-lg border border-border p-6 space-y-4">
        <h4 className="text-lg font-semibold text-foreground">Basic Information</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-foreground">Name *</label>
            <input
              type="text"
              className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
              value={data.name || ''}
              onChange={(e) => handleBasicChange('name', e.target.value)}
              placeholder="Capability name"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-foreground">ID</label>
            <input
              type="text"
              className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
              value={data.id || ''}
              onChange={(e) => handleBasicChange('id', e.target.value)}
              placeholder="CAP-1000"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-foreground">Approval</label>
            <select
              className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
              value={data.approval || APPROVAL_VALUES.NOT_APPROVED}
              onChange={(e) => handleBasicChange('approval', e.target.value)}
            >
              {approvalOptions.map(approval => (
                <option key={approval} value={approval}>{approval}</option>
              ))}
            </select>
          </div>

          {workspaces.workspaces.length > 0 && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-foreground">
                Specification Path {isNew ? '*' : ''}
              </label>
              <select
                className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
                value={data.selectedPath || ''}
                onChange={(e) => handleBasicChange('selectedPath', e.target.value)}
                required={isNew}
              >
                <option value="">
                  {isNew ? 'Select where to save this capability...' : originalPath || 'Select path...'}
                </option>
                {workspaces.workspaces
                  .find(ws => ws.id === workspaces.activeWorkspaceId)
                  ?.projectPaths?.map((pathObj, index) => {
                    // Handle both string paths (legacy) and path objects with icons
                    const path = typeof pathObj === 'string' ? pathObj : pathObj.path;
                    const icon = typeof pathObj === 'string' ? 'Folder' : pathObj.icon;
                    return (
                      <option key={index} value={path}>
                        {path}
                      </option>
                    );
                  })}
              </select>
              {!isNew && originalPath && data.selectedPath && data.selectedPath !== originalPath && data.selectedPath !== '' && (
                <small className="text-xs text-muted-foreground">
                  ⚠️ Changing this will move the capability and all its enablers to the new path
                </small>
              )}
            </div>
          )}

          <div className="space-y-2">
            <label className="block text-sm font-medium text-foreground">System</label>
            <input
              type="text"
              className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
              value={data.system || ''}
              onChange={(e) => handleBasicChange('system', e.target.value)}
              placeholder="e.g., Authentication System"
              list="existing-systems"
            />
            {existingSystems.length > 0 && (
              <datalist id="existing-systems">
                {existingSystems.map((system, index) => (
                  <option key={index} value={system} />
                ))}
              </datalist>
            )}
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-foreground">Component</label>
            <input
              type="text"
              className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
              value={data.component || ''}
              onChange={(e) => handleBasicChange('component', e.target.value)}
              placeholder="e.g., User Management Component"
              list="existing-components"
            />
            {existingComponents.length > 0 && (
              <datalist id="existing-components">
                {existingComponents.map((component, index) => (
                  <option key={index} value={component} />
                ))}
              </datalist>
            )}
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-foreground">Owner</label>
            <input
              type="text"
              className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
              value={data.owner || ''}
              onChange={(e) => handleBasicChange('owner', e.target.value)}
              placeholder="Product Team"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-foreground">Status</label>
            <select
              className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
              value={data.status || STATUS_VALUES.CAPABILITY.IN_DRAFT}
              onChange={(e) => handleBasicChange('status', e.target.value)}
            >
              {statusOptions.map(status => (
                <option
                  key={status}
                  value={status}
                >
                  {status}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-foreground">Priority</label>
            <select
              className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
              value={data.priority || PRIORITY_VALUES.CAPABILITY_ENABLER.HIGH}
              onChange={(e) => handleBasicChange('priority', e.target.value)}
            >
              {priorityOptions.map(priority => (
                <option key={priority} value={priority}>{priority}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-foreground">Analysis Review</label>
            <select
              className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
              value={data.analysisReview || REVIEW_VALUES.REQUIRED}
              onChange={(e) => handleBasicChange('analysisReview', e.target.value)}
            >
              {reviewOptions.map(review => (
                <option key={review} value={review}>{review}</option>
              ))}
            </select>
          </div>

        </div>
      </div>

      {/* Technical Overview */}
      <div className="bg-card rounded-lg border border-border p-6 space-y-4">
        <h4 className="text-lg font-semibold text-foreground">Technical Overview</h4>
        <div className="space-y-2">
          <label className="block text-sm font-medium text-foreground">Purpose</label>
          <textarea
            className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent resize-y"
            value={data.purpose || ''}
            onChange={(e) => handleBasicChange('purpose', e.target.value)}
            placeholder="What is the purpose?"
            rows={4}
          />
        </div>
      </div>

      {/* Enablers */}
      <div className="bg-card rounded-lg border border-border p-6 space-y-4">
        <h4 className="text-lg font-semibold text-foreground">Enablers</h4>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left p-2 text-sm font-medium text-foreground w-8"></th>
                <th className="text-left p-2 text-sm font-medium text-foreground">Enabler ID</th>
                <th className="text-left p-2 text-sm font-medium text-foreground">Name</th>
                <th className="text-left p-2 text-sm font-medium text-foreground">Status</th>
                <th className="text-left p-2 text-sm font-medium text-foreground">Approval</th>
                <th className="text-left p-2 text-sm font-medium text-foreground">Priority</th>
                <th className="text-left p-2 text-sm font-medium text-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {enrichedEnablers.map((enabler, index) => (
                <tr
                  key={index}
                  className="border-b border-border hover:bg-accent"
                  draggable
                  onDragStart={(e) => handleEnablerDragStart(e, index)}
                  onDragOver={handleEnablerDragOver}
                  onDrop={(e) => handleEnablerDrop(e, index)}
                  onDragEnd={handleEnablerDragEnd}
                >
                  <td className="p-2 cursor-move">
                    <GripVertical className="w-4 h-4 text-muted-foreground" />
                  </td>
                  <td className="p-2">
                    <input
                      type="text"
                      className="w-full px-2 py-1 bg-background border border-border rounded text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                      value={enabler.id || ''}
                      onChange={(e) => handleArrayChange('enablers', index, 'id', e.target.value)}
                      placeholder="ENB-1000"
                    />
                  </td>
                  <td className="p-2">
                    <input
                      type="text"
                      className="w-full px-2 py-1 bg-background border border-border rounded text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                      value={enabler.name || ''}
                      onChange={(e) => handleArrayChange('enablers', index, 'name', e.target.value)}
                      placeholder="Enabler name"
                    />
                  </td>
                  <td className="p-2">
                    <select
                      className="w-full px-2 py-1 bg-background border border-border rounded text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                      value={enabler.status || STATUS_VALUES.ENABLER.READY_FOR_ANALYSIS}
                      onChange={(e) => handleArrayChange('enablers', index, 'status', e.target.value)}
                    >
                      {enablerStatusOptions.map(status => (
                        <option
                          key={status}
                          value={status}
                        >
                          {status}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="p-2">
                    <select
                      className="w-full px-2 py-1 bg-background border border-border rounded text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                      value={enabler.approval || APPROVAL_VALUES.NOT_APPROVED}
                      onChange={(e) => handleArrayChange('enablers', index, 'approval', e.target.value)}
                    >
                      {approvalOptions.map(approval => (
                        <option key={approval} value={approval}>{approval}</option>
                      ))}
                    </select>
                  </td>
                  <td className="p-2">
                    <select
                      className="w-full px-2 py-1 bg-background border border-border rounded text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                      value={enabler.priority || PRIORITY_VALUES.CAPABILITY_ENABLER.HIGH}
                      onChange={(e) => handleArrayChange('enablers', index, 'priority', e.target.value)}
                    >
                      {priorityOptions.map(priority => (
                        <option key={priority} value={priority}>{priority}</option>
                      ))}
                    </select>
                  </td>
                  <td className="p-2">
                    <div className="flex gap-1 items-center">
                      <button
                        type="button"
                        onClick={() => handleCreateEnablerDocument(enabler, index)}
                        className="p-1 bg-chart-2 text-white rounded hover:bg-chart-2/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        title="Create enabler document"
                        disabled={!enabler.id || !enabler.name || !data.id}
                      >
                        <FileText size={12} />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeArrayItem('enablers', index)}
                        className="p-1 bg-destructive text-destructive-foreground rounded hover:bg-destructive/90 transition-colors"
                        title="Remove from list"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-4">
            <button
              type="button"
              onClick={() => addArrayItem('enablers', templates.enabler)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
            >
              <Plus size={14} />
              Add Enabler
            </button>
            <button
              type="button"
              onClick={approveAllEnablers}
              className="btn btn-success btn-sm"
              disabled={!enrichedEnablers || enrichedEnablers.length === 0}
              style={{ marginLeft: '10px' }}
            >
              Approve All
            </button>
          </div>
        </div>
      </div>

      {/* Dependencies Section */}
      <div className="bg-card rounded-lg border border-border p-6 space-y-6">
        <h4 className="text-lg font-semibold text-foreground">Dependencies</h4>
        <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mb-4">
          <div className="text-sm text-blue-800">
            <p className="mb-1"><strong>Upstream Capabilities:</strong> Deliver inputs, services, or data required by this capability.</p>
            <p><strong>Downstream Capabilities:</strong> Consume outputs or services produced by this capability.</p>
          </div>
        </div>

        {/* Internal Upstream Dependencies */}
        <div className="space-y-4">
          <h5 className="text-base font-medium text-foreground">Internal Upstream Dependencies</h5>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-2 text-sm font-medium text-foreground">Capability ID</th>
                  <th className="text-left p-2 text-sm font-medium text-foreground">Description</th>
                  <th className="text-left p-2 text-sm font-medium text-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {(data.internalUpstream || []).map((dep, index) => (
                  <tr key={index} className="border-b border-border hover:bg-accent">
                    <td className="p-2">
                      <select
                        className="w-full px-2 py-1 bg-background border border-border rounded text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                        value={dep.id || ''}
                        onChange={(e) => handleArrayChange('internalUpstream', index, 'id', e.target.value)}
                      >
                        <option value="">Select capability</option>
                        {Object.keys(groupedCapabilities).sort().map((system) =>
                          Object.keys(groupedCapabilities[system]).sort().map((component) => (
                            <optgroup key={`${system}-${component}`} label={`${system} → ${component}`}>
                              {groupedCapabilities[system][component].map((cap) => (
                                <option key={cap.id} value={cap.id}>
                                  {cap.id} - {cap.title}
                                </option>
                              ))}
                            </optgroup>
                          ))
                        )}
                      </select>
                    </td>
                    <td className="p-2">
                      <textarea
                        className="w-full px-2 py-1 bg-background border border-border rounded text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-y"
                        value={dep.description || ''}
                        onChange={(e) => handleArrayChange('internalUpstream', index, 'description', e.target.value)}
                        placeholder="Describe the dependency"
                      />
                    </td>
                    <td className="p-2">
                      <button
                        type="button"
                        onClick={() => removeArrayItem('internalUpstream', index)}
                        className="p-1 bg-destructive text-destructive-foreground rounded hover:bg-destructive/90 transition-colors"
                      >
                        <Trash2 size={12} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-4">
              <button
                type="button"
                onClick={() => addArrayItem('internalUpstream', templates.upstream)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
              >
                <Plus size={14} />
                Add Dependency
              </button>
            </div>
          </div>
        </div>

        {/* Internal Downstream Impact */}
        <div className="space-y-4">
          <h5 className="text-base font-medium text-foreground">Internal Downstream Impact</h5>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-2 text-sm font-medium text-foreground">Capability ID</th>
                  <th className="text-left p-2 text-sm font-medium text-foreground">Description</th>
                  <th className="text-left p-2 text-sm font-medium text-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {(data.internalDownstream || []).map((impact, index) => (
                  <tr key={index} className="border-b border-border hover:bg-accent">
                    <td className="p-2">
                      <select
                        className="w-full px-2 py-1 bg-background border border-border rounded text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                        value={impact.id || ''}
                        onChange={(e) => handleArrayChange('internalDownstream', index, 'id', e.target.value)}
                      >
                        <option value="">Select capability</option>
                        {Object.keys(groupedCapabilities).sort().map((system) =>
                          Object.keys(groupedCapabilities[system]).sort().map((component) => (
                            <optgroup key={`${system}-${component}`} label={`${system} → ${component}`}>
                              {groupedCapabilities[system][component].map((cap) => (
                                <option key={cap.id} value={cap.id}>
                                  {cap.id} - {cap.title}
                                </option>
                              ))}
                            </optgroup>
                          ))
                        )}
                      </select>
                    </td>
                    <td className="p-2">
                      <textarea
                        className="w-full px-2 py-1 bg-background border border-border rounded text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-y"
                        value={impact.description || ''}
                        onChange={(e) => handleArrayChange('internalDownstream', index, 'description', e.target.value)}
                        placeholder="Describe the impact"
                      />
                    </td>
                    <td className="p-2">
                      <button
                        type="button"
                        onClick={() => removeArrayItem('internalDownstream', index)}
                        className="p-1 bg-destructive text-destructive-foreground rounded hover:bg-destructive/90 transition-colors"
                      >
                        <Trash2 size={12} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-4">
              <button
                type="button"
                onClick={() => addArrayItem('internalDownstream', templates.downstream)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
              >
                <Plus size={14} />
                Add Dependency
              </button>
            </div>
          </div>
        </div>

        {/* External Dependencies */}
        <div className="space-y-4">
          <h5 className="text-base font-medium text-foreground">External Dependencies</h5>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-foreground">External Upstream Dependencies</label>
              <textarea
                className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent resize-y min-h-[100px]"
                value={data.externalUpstream || ''}
                onChange={(e) => handleBasicChange('externalUpstream', e.target.value)}
                placeholder="Describe external upstream dependencies..."
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-foreground">External Downstream Impact</label>
              <textarea
                className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent resize-y min-h-[100px]"
                value={data.externalDownstream || ''}
                onChange={(e) => handleBasicChange('externalDownstream', e.target.value)}
                placeholder="Describe external downstream impact..."
              />
            </div>
          </div>
        </div>

        {/* Clear Technical Specifications Button */}
        <div className="flex justify-start mt-8 pt-6 border-t border-border">
          <button
            type="button"
            onClick={handleClearTechnicalSpecifications}
            className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors"
            title="Replace technical specifications with template"
          >
            <RefreshCcw size={14} />
            Clear Technical Specifications
          </button>
        </div>
      </div>
    </div>
  )
}

// Memoize component to prevent unnecessary re-renders
export default React.memo(CapabilityForm)