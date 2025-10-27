import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { Plus, Trash2, RefreshCcw, GripVertical } from 'lucide-react'
import { apiService } from '../../services/apiService'
import { generateFunctionalRequirementId, generateNonFunctionalRequirementId } from '../../utils/idGenerator'
import { stateListenerManager } from '../../utils/stateListeners'
import { STATUS_VALUES, APPROVAL_VALUES, PRIORITY_VALUES, REVIEW_VALUES } from '../../utils/constants'
import toast from 'react-hot-toast'

import { EnablerFormData, FunctionalRequirement, NonFunctionalRequirement, generateEnablerTechnicalSpecificationsTemplate } from '../../utils/markdownUtils'

interface EnablerFormProps {
  data: EnablerFormData
  onChange: (newData: Partial<EnablerFormData>) => void
  onValidationChange?: (isValid: boolean, errors: Record<string, string>) => void
}

interface CapabilityLink {
  id: string
  title: string
  system?: string
  component?: string
}

interface CapabilityLinksResponse {
  capabilities: CapabilityLink[]
}


function EnablerForm({ data, onChange, onValidationChange }: EnablerFormProps): JSX.Element {
  const [availableCapabilities, setAvailableCapabilities] = useState<CapabilityLink[]>([])
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})
  const [draggedItem, setDraggedItem] = useState<{ type: 'functional' | 'nonFunctional', index: number } | null>(null)
  const stateListenerRef = useRef(null)
  const requirementListenersRef = useRef(new Map())

  useEffect(() => {
    loadCapabilities()
  }, [])

  // Validation effect
  useEffect(() => {
    const errors = {}

    // Name is required
    if (!data.name || data.name.trim() === '') {
      errors.name = 'Name is required'
    }

    setValidationErrors(errors)

    // Notify parent of validation state
    if (onValidationChange) {
      onValidationChange(Object.keys(errors).length === 0, errors)
    }
  }, [data.name, onValidationChange])

  // Initialize state listener for enabler
  useEffect(() => {
    if (data.id) {
      stateListenerRef.current = stateListenerManager.getEnablerListener(data.id)
      // Initialize with current state
      stateListenerRef.current.checkForChanges(data)
    }
  }, [data.id])

  // Check for enabler state changes
  useEffect(() => {
    if (stateListenerRef.current && data.id) {
      stateListenerRef.current.checkForChanges(data)
    }
  }, [data.status, data.approval])

  // Initialize requirement listeners
  useEffect(() => {
    if (data.id) {
      // Initialize functional requirements listeners
      if (data.functionalRequirements) {
        data.functionalRequirements.forEach((req, index) => {
          if (req.id) {
            const listener = stateListenerManager.getRequirementListener(req.id, 'functional', data.id)
            requirementListenersRef.current.set(`functional_${req.id}`, listener)
            listener.checkForChanges(req)
          }
        })
      }

      // Initialize non-functional requirements listeners
      if (data.nonFunctionalRequirements) {
        data.nonFunctionalRequirements.forEach((req, index) => {
          if (req.id) {
            const listener = stateListenerManager.getRequirementListener(req.id, 'nonFunctional', data.id)
            requirementListenersRef.current.set(`nonFunctional_${req.id}`, listener)
            listener.checkForChanges(req)
          }
        })
      }
    }
  }, [data.id, data.functionalRequirements?.length, data.nonFunctionalRequirements?.length])

  // Check for requirement state changes
  useEffect(() => {
    if (data.functionalRequirements) {
      data.functionalRequirements.forEach((req) => {
        if (req.id) {
          const listener = requirementListenersRef.current.get(`functional_${req.id}`)
          if (listener) {
            listener.checkForChanges(req)
          }
        }
      })
    }

    if (data.nonFunctionalRequirements) {
      data.nonFunctionalRequirements.forEach((req) => {
        if (req.id) {
          const listener = requirementListenersRef.current.get(`nonFunctional_${req.id}`)
          if (listener) {
            listener.checkForChanges(req)
          }
        }
      })
    }
  }, [data.functionalRequirements, data.nonFunctionalRequirements])

  // Cleanup state listeners on component unmount
  useEffect(() => {
    return () => {
      // Clean up all requirement listeners
      requirementListenersRef.current.clear()
      // Clean up enabler listener
      if (stateListenerRef.current) {
        stateListenerRef.current = null
      }
    }
  }, [])


  const loadCapabilities = async () => {
    try {
      const response = await apiService.getCapabilityLinks()
      setAvailableCapabilities(response.capabilities || [])
    } catch (error) {
      console.warn('Could not load capabilities for dropdown:', error)
    }
  }

  const handleBasicChange = useCallback(async (field, value) => {
    onChange({ [field]: value })
    
    // Save review field preferences to config
    if (['analysisReview', 'codeReview'].includes(field)) {
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
    
    // Automation: If requirement status becomes "Refactored" and enabler is "Implemented", change enabler to "Refactored"
    if (key === 'status' && value === 'Refactored' && data.status === 'Implemented') {
      console.log(`Requirement became Refactored and enabler is Implemented, changing enabler to Refactored`)
      onChange({ status: 'Refactored' })
    }
  }, [data, onChange])

  const addArrayItem = useCallback((field, template) => {
    let newTemplate = { ...template }
    
    // Auto-generate requirement IDs
    if (field === 'functionalRequirements') {
      // Collect all existing functional requirement IDs for uniqueness check
      const existingFRIds = (data.functionalRequirements || [])
        .map(req => req.id)
        .filter(id => id && id.startsWith('FR-'))
      
      newTemplate.id = generateFunctionalRequirementId(existingFRIds)
    } else if (field === 'nonFunctionalRequirements') {
      // Collect all existing non-functional requirement IDs for uniqueness check
      const existingNFRIds = (data.nonFunctionalRequirements || [])
        .map(req => req.id)
        .filter(id => id && id.startsWith('NFR-'))
      
      newTemplate.id = generateNonFunctionalRequirementId(existingNFRIds)
    }
    
    const newArray = [...(data[field] || []), newTemplate]
    onChange({ [field]: newArray })
  }, [data, onChange])

  const removeArrayItem = useCallback((field, index) => {
    const newArray = [...(data[field] || [])]
    newArray.splice(index, 1)
    onChange({ [field]: newArray })
  }, [data, onChange])

  // Function to approve all requirements in a specific field
  const approveAllRequirements = useCallback((field) => {
    const fieldData = data[field] || []
    if (fieldData.length === 0) return

    const newArray = fieldData.map(req => ({
      ...req,
      approval: APPROVAL_VALUES.APPROVED
    }))

    onChange({ [field]: newArray })
  }, [data, onChange])

  // Memoize templates and dropdown options
  const templates = useMemo(() => ({
    functionalReq: { 
      id: '', 
      name: '', 
      requirement: '', 
      priority: PRIORITY_VALUES.REQUIREMENT.MUST_HAVE, 
      status: STATUS_VALUES.REQUIREMENT.IN_DRAFT, 
      approval: APPROVAL_VALUES.NOT_APPROVED 
    },
    nonFunctionalReq: { 
      id: '', 
      name: '', 
      type: '', 
      requirement: '', 
      priority: PRIORITY_VALUES.REQUIREMENT.MUST_HAVE, 
      status: STATUS_VALUES.REQUIREMENT.IN_DRAFT, 
      approval: APPROVAL_VALUES.NOT_APPROVED 
    }
  }), [])
  
  const dropdownOptions = useMemo(() => ({
    enablerStatus: [
      STATUS_VALUES.ENABLER.IN_DRAFT,
      STATUS_VALUES.ENABLER.READY_FOR_ANALYSIS,
      STATUS_VALUES.ENABLER.READY_FOR_DESIGN,
      STATUS_VALUES.ENABLER.READY_FOR_IMPLEMENTATION,
      STATUS_VALUES.ENABLER.READY_FOR_REFACTOR,
      STATUS_VALUES.ENABLER.READY_FOR_RETIREMENT,
      STATUS_VALUES.ENABLER.IMPLEMENTED,
      STATUS_VALUES.ENABLER.RETIRED
    ].sort(),
    approval: Object.values(APPROVAL_VALUES),
    priority: Object.values(PRIORITY_VALUES.CAPABILITY_ENABLER),
    review: Object.values(REVIEW_VALUES),
    requirementPriority: Object.values(PRIORITY_VALUES.REQUIREMENT),
    requirementStatus: Object.values(STATUS_VALUES.REQUIREMENT).sort()
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

  const nfrTypes = [
    'Performance', 'Scalability', 'Security', 'Reliability', 'Availability',
    'Usability', 'Maintainability', 'Portability', 'Compliance', 'Technical Constraint', 'Other'
  ]

  const handleClearTechnicalSpecifications = useCallback(() => {
    const confirmed = window.confirm(
      'Are you sure you want to clear the technical specifications and replace them with the template? This action cannot be undone.'
    )
    if (confirmed) {
      const templateSpecs = generateEnablerTechnicalSpecificationsTemplate()
      onChange({ technicalSpecifications: templateSpecs })
      toast.success('Technical specifications cleared and replaced with template')
    }
  }, [onChange])

  // Drag and drop handlers
  const handleDragStart = useCallback((e: React.DragEvent, type: 'functional' | 'nonFunctional', index: number) => {
    setDraggedItem({ type, index })
    e.dataTransfer.effectAllowed = 'move'
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }, [])

  const handleDrop = useCallback((e: React.DragEvent, targetType: 'functional' | 'nonFunctional', targetIndex: number) => {
    e.preventDefault()

    if (!draggedItem || draggedItem.type !== targetType) {
      setDraggedItem(null)
      return
    }

    const sourceIndex = draggedItem.index
    const field = targetType === 'functional' ? 'functionalRequirements' : 'nonFunctionalRequirements'
    const requirements = [...(data[field] || [])]

    // Remove from source position
    const [removed] = requirements.splice(sourceIndex, 1)

    // Insert at target position
    requirements.splice(targetIndex, 0, removed)

    onChange({ [field]: requirements })
    setDraggedItem(null)
  }, [draggedItem, data, onChange])

  const handleDragEnd = useCallback(() => {
    setDraggedItem(null)
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
              placeholder="Enabler name"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-foreground">Type</label>
            <input
              type="text"
              className="w-full px-3 py-2 bg-muted border border-border rounded-md text-muted-foreground cursor-not-allowed"
              value="Enabler"
              readOnly
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-foreground">ID</label>
            <input
              type="text"
              className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
              value={data.id || ''}
              onChange={(e) => handleBasicChange('id', e.target.value)}
              placeholder="ENB-1000"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-foreground">Capability ID</label>
            <select
              className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
              value={data.capabilityId || ''}
              onChange={(e) => handleBasicChange('capabilityId', e.target.value)}
            >
              <option value="">Select a capability...</option>
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
            {validationErrors.capabilityId && (
              <span className="text-xs text-destructive">{validationErrors.capabilityId}</span>
            )}
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-foreground">Approval</label>
            <select
              className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
              value={data.approval || APPROVAL_VALUES.NOT_APPROVED}
              onChange={(e) => handleBasicChange('approval', e.target.value)}
            >
              {Object.values(APPROVAL_VALUES).map(approval => (
                <option key={approval} value={approval}>{approval}</option>
              ))}
            </select>
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
              value={data.status || STATUS_VALUES.ENABLER.READY_FOR_ANALYSIS}
              onChange={(e) => handleBasicChange('status', e.target.value)}
            >
              {dropdownOptions.enablerStatus.map(status => (
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
              {Object.values(PRIORITY_VALUES.CAPABILITY_ENABLER).map(priority => (
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
              {Object.values(REVIEW_VALUES).map(review => (
                <option key={review} value={review}>{review}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-foreground">Code Review</label>
            <select
              className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
              value={data.codeReview || REVIEW_VALUES.NOT_REQUIRED}
              onChange={(e) => handleBasicChange('codeReview', e.target.value)}
            >
              {Object.values(REVIEW_VALUES).map(review => (
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

      {/* Functional Requirements */}
      <div className="bg-card rounded-lg border border-border p-6 space-y-4">
        <h4 className="text-lg font-semibold text-foreground">Functional Requirements</h4>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left p-2 text-sm font-medium text-foreground w-8"></th>
                <th className="text-left p-2 text-sm font-medium text-foreground w-24">ID</th>
                <th className="text-left p-2 text-sm font-medium text-foreground">Name</th>
                <th className="text-left p-2 text-sm font-medium text-foreground">Requirement</th>
                <th className="text-left p-2 text-sm font-medium text-foreground">Priority</th>
                <th className="text-left p-2 text-sm font-medium text-foreground">Status</th>
                <th className="text-left p-2 text-sm font-medium text-foreground">Approval</th>
                <th className="text-left p-2 text-sm font-medium text-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(data.functionalRequirements || []).map((req, index) => (
                <tr
                  key={index}
                  className="border-b border-border hover:bg-accent"
                  draggable
                  onDragStart={(e) => handleDragStart(e, 'functional', index)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, 'functional', index)}
                  onDragEnd={handleDragEnd}
                >
                  <td className="p-2 cursor-move">
                    <GripVertical className="w-4 h-4 text-muted-foreground" />
                  </td>
                  <td className="p-2">
                    <input
                      type="text"
                      className="w-full px-2 py-1 bg-background border border-border rounded text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                      value={req.id || ''}
                      onChange={(e) => handleArrayChange('functionalRequirements', index, 'id', e.target.value)}
                      placeholder="FR-123456"
                    />
                  </td>
                  <td className="p-2">
                    <input
                      type="text"
                      className="w-full px-2 py-1 bg-background border border-border rounded text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                      value={req.name || ''}
                      onChange={(e) => handleArrayChange('functionalRequirements', index, 'name', e.target.value)}
                      placeholder="Requirement name"
                    />
                  </td>
                  <td className="p-2">
                    <textarea
                      className="w-full px-2 py-1 bg-background border border-border rounded text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-y"
                      value={req.requirement || ''}
                      onChange={(e) => handleArrayChange('functionalRequirements', index, 'requirement', e.target.value)}
                      placeholder="Describe the functional requirement"
                    />
                  </td>
                  <td className="p-2">
                    <select
                      className="w-full px-2 py-1 bg-background border border-border rounded text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                      value={req.priority || PRIORITY_VALUES.REQUIREMENT.MUST_HAVE}
                      onChange={(e) => handleArrayChange('functionalRequirements', index, 'priority', e.target.value)}
                    >
                      {Object.values(PRIORITY_VALUES.REQUIREMENT).map(priority => (
                        <option key={priority} value={priority}>{priority}</option>
                      ))}
                    </select>
                  </td>
                  <td className="p-2">
                    <select
                      className="w-full px-2 py-1 bg-background border border-border rounded text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                      value={req.status || STATUS_VALUES.REQUIREMENT.IN_DRAFT}
                      onChange={(e) => handleArrayChange('functionalRequirements', index, 'status', e.target.value)}
                    >
                      {dropdownOptions.requirementStatus.map(status => (
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
                      value={req.approval || APPROVAL_VALUES.NOT_APPROVED}
                      onChange={(e) => handleArrayChange('functionalRequirements', index, 'approval', e.target.value)}
                    >
                      {Object.values(APPROVAL_VALUES).map(approval => (
                        <option key={approval} value={approval}>{approval}</option>
                      ))}
                    </select>
                  </td>
                  <td className="p-2">
                    <button
                      type="button"
                      onClick={() => removeArrayItem('functionalRequirements', index)}
                      className="p-1 bg-destructive text-destructive-foreground rounded hover:bg-destructive/90 transition-colors"
                    >
                      <Trash2 size={12} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={() => addArrayItem('functionalRequirements', templates.functionalReq)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
            >
              <Plus size={14} />
              Add Functional Requirement
            </button>
            <button
              type="button"
              onClick={() => approveAllRequirements('functionalRequirements')}
              className="px-4 py-2 bg-chart-2 text-white rounded-md hover:bg-chart-2/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              disabled={!data.functionalRequirements || data.functionalRequirements.length === 0}
            >
              Approve All
            </button>
          </div>
        </div>
      </div>

      {/* Non-Functional Requirements */}
      <div className="bg-card rounded-lg border border-border p-6 space-y-4">
        <h4 className="text-lg font-semibold text-foreground">Non-Functional Requirements</h4>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left p-2 text-sm font-medium text-foreground w-8"></th>
                <th className="text-left p-2 text-sm font-medium text-foreground w-24">ID</th>
                <th className="text-left p-2 text-sm font-medium text-foreground">Name</th>
                <th className="text-left p-2 text-sm font-medium text-foreground">Type</th>
                <th className="text-left p-2 text-sm font-medium text-foreground">Requirement</th>
                <th className="text-left p-2 text-sm font-medium text-foreground">Priority</th>
                <th className="text-left p-2 text-sm font-medium text-foreground">Status</th>
                <th className="text-left p-2 text-sm font-medium text-foreground">Approval</th>
                <th className="text-left p-2 text-sm font-medium text-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(data.nonFunctionalRequirements || []).map((req, index) => (
                <tr
                  key={index}
                  className="border-b border-border hover:bg-accent"
                  draggable
                  onDragStart={(e) => handleDragStart(e, 'nonFunctional', index)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, 'nonFunctional', index)}
                  onDragEnd={handleDragEnd}
                >
                  <td className="p-2 cursor-move">
                    <GripVertical className="w-4 h-4 text-muted-foreground" />
                  </td>
                  <td className="p-2">
                    <input
                      type="text"
                      className="w-full px-2 py-1 bg-background border border-border rounded text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                      value={req.id || ''}
                      onChange={(e) => handleArrayChange('nonFunctionalRequirements', index, 'id', e.target.value)}
                      placeholder="NFR-123456"
                    />
                  </td>
                  <td className="p-2">
                    <input
                      type="text"
                      className="w-full px-2 py-1 bg-background border border-border rounded text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                      value={req.name || ''}
                      onChange={(e) => handleArrayChange('nonFunctionalRequirements', index, 'name', e.target.value)}
                      placeholder="Requirement name"
                    />
                  </td>
                  <td className="p-2">
                    <select
                      className="w-full px-2 py-1 bg-background border border-border rounded text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                      value={req.type || ''}
                      onChange={(e) => handleArrayChange('nonFunctionalRequirements', index, 'type', e.target.value)}
                    >
                      <option value="">Select type</option>
                      {nfrTypes.map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </td>
                  <td className="p-2">
                    <textarea
                      className="w-full px-2 py-1 bg-background border border-border rounded text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-y"
                      value={req.requirement || ''}
                      onChange={(e) => handleArrayChange('nonFunctionalRequirements', index, 'requirement', e.target.value)}
                      placeholder="Describe the non-functional requirement"
                    />
                  </td>
                  <td className="p-2">
                    <select
                      className="w-full px-2 py-1 bg-background border border-border rounded text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                      value={req.priority || PRIORITY_VALUES.REQUIREMENT.MUST_HAVE}
                      onChange={(e) => handleArrayChange('nonFunctionalRequirements', index, 'priority', e.target.value)}
                    >
                      {Object.values(PRIORITY_VALUES.REQUIREMENT).map(priority => (
                        <option key={priority} value={priority}>{priority}</option>
                      ))}
                    </select>
                  </td>
                  <td className="p-2">
                    <select
                      className="w-full px-2 py-1 bg-background border border-border rounded text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                      value={req.status || STATUS_VALUES.REQUIREMENT.IN_DRAFT}
                      onChange={(e) => handleArrayChange('nonFunctionalRequirements', index, 'status', e.target.value)}
                    >
                      {dropdownOptions.requirementStatus.map(status => (
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
                      value={req.approval || APPROVAL_VALUES.NOT_APPROVED}
                      onChange={(e) => handleArrayChange('nonFunctionalRequirements', index, 'approval', e.target.value)}
                    >
                      {Object.values(APPROVAL_VALUES).map(approval => (
                        <option key={approval} value={approval}>{approval}</option>
                      ))}
                    </select>
                  </td>
                  <td className="p-2">
                    <button
                      type="button"
                      onClick={() => removeArrayItem('nonFunctionalRequirements', index)}
                      className="p-1 bg-destructive text-destructive-foreground rounded hover:bg-destructive/90 transition-colors"
                    >
                      <Trash2 size={12} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={() => addArrayItem('nonFunctionalRequirements', templates.nonFunctionalReq)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
            >
              <Plus size={14} />
              Add Non-Functional Requirement
            </button>
            <button
              type="button"
              onClick={() => approveAllRequirements('nonFunctionalRequirements')}
              className="px-4 py-2 bg-chart-2 text-white rounded-md hover:bg-chart-2/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              disabled={!data.nonFunctionalRequirements || data.nonFunctionalRequirements.length === 0}
            >
              Approve All
            </button>
          </div>
        </div>
      </div>

      {/* Clear Technical Specifications */}
      <div className="bg-card rounded-lg border border-border p-6">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={handleClearTechnicalSpecifications}
            className="inline-flex items-center gap-2 px-4 py-2 bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90 transition-colors"
          >
            <RefreshCcw size={16} />
            Clear Technical Specifications
          </button>
          <div>
            <h4 className="text-lg font-semibold text-foreground">Clear Technical Specifications</h4>
            <p className="text-sm text-muted-foreground mt-1">
              Replace the current technical specifications with the template content
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

// Memoize component to prevent unnecessary re-renders
export default React.memo(EnablerForm)