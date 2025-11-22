import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { Plus, Trash2, RefreshCcw, GripVertical, Maximize2, Minimize2, Edit3, ChevronUp, ChevronDown } from 'lucide-react'
import { apiService } from '../../services/apiService'
import { generateFunctionalRequirementId, generateNonFunctionalRequirementId } from '../../utils/idGenerator'
import { stateListenerManager } from '../../utils/stateListeners'
import { STATUS_VALUES, APPROVAL_VALUES, PRIORITY_VALUES, REVIEW_VALUES } from '../../utils/constants'
import { SearchableSelect } from '../ui/SearchableSelect'
import toast from 'react-hot-toast'

import { EnablerFormData, FunctionalRequirement, NonFunctionalRequirement, Dependency, generateEnablerTechnicalSpecificationsTemplate } from '../../utils/markdownUtils'

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

interface EnablerLink {
  id: string
  name: string
  capabilityId: string
  capabilityName: string
  capabilitySystem?: string
  capabilityComponent?: string
}

interface CapabilityLinksResponse {
  capabilities: CapabilityLink[]
}


// Bulk Edit Panel Component
interface BulkEditPanelProps {
  onBulkEdit: (updates: any, selectedIndices: Set<number>) => void
  requirementCount: number
  fieldType: 'functional' | 'nonFunctional'
  selectedRequirements: Set<number>
  onSelectAll: () => void
  onSelectNone: () => void
}

function BulkEditPanel({ onBulkEdit, requirementCount, fieldType, selectedRequirements, onSelectAll, onSelectNone }: BulkEditPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [bulkPriority, setBulkPriority] = useState('')
  const [bulkStatus, setBulkStatus] = useState('')
  const [bulkApproval, setBulkApproval] = useState('')

  const handleBulkApply = () => {
    const updates = {}
    if (bulkPriority) updates.priority = bulkPriority
    if (bulkStatus) updates.status = bulkStatus
    if (bulkApproval) updates.approval = bulkApproval

    if (Object.keys(updates).length > 0 && selectedRequirements.size > 0) {
      onBulkEdit(updates, selectedRequirements)
      // Reset form
      setBulkPriority('')
      setBulkStatus('')
      setBulkApproval('')
      setIsExpanded(false)
    }
  }

  const hasUpdates = bulkPriority || bulkStatus || bulkApproval
  const canApply = hasUpdates && selectedRequirements.size > 0

  if (requirementCount === 0) return null

  return (
    <div className="mb-4 border border-border rounded-md">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-2 bg-accent text-foreground rounded-t-md hover:bg-accent/80 transition-colors flex items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <Edit3 size={16} />
          <span className="font-medium">Bulk Edit {fieldType === 'functional' ? 'Functional' : 'Non-Functional'} Requirements</span>
          <span className="text-sm text-muted-foreground">({selectedRequirements.size} of {requirementCount} selected)</span>
        </div>
        <span className="text-sm">{isExpanded ? '▲' : '▼'}</span>
      </button>

      {isExpanded && (
        <div className="p-4 bg-card border-t border-border space-y-4">
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm text-muted-foreground">
              Apply the same values to selected {fieldType} requirements. Leave fields empty to skip updating them.
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onSelectAll}
                className="px-3 py-1 bg-primary/10 text-primary rounded-md hover:bg-primary/20 transition-colors text-sm"
              >
                Select All
              </button>
              <button
                type="button"
                onClick={onSelectNone}
                className="px-3 py-1 bg-muted text-muted-foreground rounded-md hover:bg-muted/80 transition-colors text-sm"
              >
                Select None
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-foreground">Priority</label>
              <select
                className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
                value={bulkPriority}
                onChange={(e) => setBulkPriority(e.target.value)}
              >
                <option value="">Select priority...</option>
                {Object.values(PRIORITY_VALUES.REQUIREMENT).map(priority => (
                  <option key={priority} value={priority}>{priority}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-foreground">Status</label>
              <select
                className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
                value={bulkStatus}
                onChange={(e) => setBulkStatus(e.target.value)}
              >
                <option value="">Select status...</option>
                {Object.values(STATUS_VALUES.REQUIREMENT).sort().map(status => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-foreground">Approval</label>
              <select
                className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
                value={bulkApproval}
                onChange={(e) => setBulkApproval(e.target.value)}
              >
                <option value="">Select approval...</option>
                {Object.values(APPROVAL_VALUES).map(approval => (
                  <option key={approval} value={approval}>{approval}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={handleBulkApply}
              disabled={!canApply}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Apply to {selectedRequirements.size} Selected {fieldType === 'functional' ? 'Functional' : 'Non-Functional'} Requirements
            </button>
            <button
              type="button"
              onClick={() => {
                setBulkPriority('')
                setBulkStatus('')
                setBulkApproval('')
              }}
              className="px-4 py-2 bg-muted text-muted-foreground rounded-md hover:bg-muted/80 transition-colors"
            >
              Clear
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function EnablerForm({ data, onChange, onValidationChange }: EnablerFormProps): JSX.Element {
  const [availableCapabilities, setAvailableCapabilities] = useState<CapabilityLink[]>([])
  const [availableEnablers, setAvailableEnablers] = useState<EnablerLink[]>([])
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})
  const [draggedItem, setDraggedItem] = useState<{ type: 'functional' | 'nonFunctional', index: number } | null>(null)
  const [expandedRequirements, setExpandedRequirements] = useState<Set<string>>(new Set())
  const [selectedFunctionalRequirements, setSelectedFunctionalRequirements] = useState<Set<number>>(new Set())
  const [selectedNonFunctionalRequirements, setSelectedNonFunctionalRequirements] = useState<Set<number>>(new Set())
  const stateListenerRef = useRef(null)
  const requirementListenersRef = useRef(new Map())

  useEffect(() => {
    loadCapabilities()
    loadEnablers()
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

  const loadEnablers = async () => {
    try {
      const enablers = await apiService.getEnablerLinks()
      setAvailableEnablers(enablers || [])
    } catch (error) {
      console.warn('Could not load enablers for dropdown:', error)
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

    // Clear selections for the removed item and adjust indices
    if (field === 'functionalRequirements') {
      const newSelected = new Set()
      selectedFunctionalRequirements.forEach(i => {
        if (i < index) {
          newSelected.add(i)
        } else if (i > index) {
          newSelected.add(i - 1)
        }
      })
      setSelectedFunctionalRequirements(newSelected)
    } else if (field === 'nonFunctionalRequirements') {
      const newSelected = new Set()
      selectedNonFunctionalRequirements.forEach(i => {
        if (i < index) {
          newSelected.add(i)
        } else if (i > index) {
          newSelected.add(i - 1)
        }
      })
      setSelectedNonFunctionalRequirements(newSelected)
    }
  }, [data, onChange, selectedFunctionalRequirements, selectedNonFunctionalRequirements])

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

  // Bulk edit functions for requirements
  const bulkEditRequirements = useCallback((field, updates, selectedIndices) => {
    const fieldData = data[field] || []
    if (fieldData.length === 0) return

    const newArray = fieldData.map((req, index) => {
      if (selectedIndices.has(index)) {
        return { ...req, ...updates }
      }
      return req
    })

    onChange({ [field]: newArray })
  }, [data, onChange])

  // Memoize templates and dropdown options
  const templates = useMemo(() => ({
    upstream: { id: '', description: '' },
    downstream: { id: '', description: '' },
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

  // Group enablers by system and component (flattened for use in selects)
  const groupedEnablers = useMemo(() => {
    const groups = {}

    availableEnablers.forEach(enabler => {
      const system = enabler.capabilitySystem || 'Unknown System'
      const component = enabler.capabilityComponent || 'Unknown Component'

      if (!groups[system]) {
        groups[system] = {}
      }

      if (!groups[system][component]) {
        groups[system][component] = []
      }

      groups[system][component].push(enabler)
    })

    return groups
  }, [availableEnablers])

  // Convert enablers to SearchableSelect options
  const enablerOptions = useMemo(() => {
    return availableEnablers.map(enabler => ({
      id: enabler.id,
      label: `${enabler.id} - ${enabler.name}`,
      system: enabler.capabilitySystem,
      component: enabler.capabilityComponent
    }))
  }, [availableEnablers])

  // Convert capabilities to SearchableSelect options
  const capabilityOptions = useMemo(() => {
    return availableCapabilities.map(cap => ({
      id: cap.id,
      label: `${cap.id} - ${cap.title}`,
      system: cap.system,
      component: cap.component
    }))
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

  // Toggle requirement expansion
  const toggleRequirementExpansion = useCallback((type: 'functional' | 'nonFunctional', index: number) => {
    const key = `${type}_${index}`
    setExpandedRequirements(prev => {
      const newSet = new Set(prev)
      if (newSet.has(key)) {
        newSet.delete(key)
      } else {
        newSet.add(key)
      }
      return newSet
    })
  }, [])

  // Move requirement to top or bottom
  const moveRequirement = useCallback((type: 'functional' | 'nonFunctional', index: number, direction: 'top' | 'bottom') => {
    const field = type === 'functional' ? 'functionalRequirements' : 'nonFunctionalRequirements'
    const requirements = [...(data[field] || [])]

    if (requirements.length <= 1) return

    // Remove the item from current position
    const [item] = requirements.splice(index, 1)

    // Insert at new position
    if (direction === 'top') {
      requirements.unshift(item)
    } else {
      requirements.push(item)
    }

    onChange({ [field]: requirements })

    // Update selections to maintain consistency
    if (type === 'functional') {
      const newSelected = new Set<number>()
      selectedFunctionalRequirements.forEach(selectedIndex => {
        if (selectedIndex === index) {
          // The moved item goes to new position
          newSelected.add(direction === 'top' ? 0 : requirements.length - 1)
        } else if (direction === 'top') {
          // Items shift down when something moves to top
          if (selectedIndex < index) {
            newSelected.add(selectedIndex + 1)
          } else {
            newSelected.add(selectedIndex)
          }
        } else {
          // Items shift up when something moves to bottom
          if (selectedIndex > index) {
            newSelected.add(selectedIndex - 1)
          } else {
            newSelected.add(selectedIndex)
          }
        }
      })
      setSelectedFunctionalRequirements(newSelected)
    } else {
      const newSelected = new Set<number>()
      selectedNonFunctionalRequirements.forEach(selectedIndex => {
        if (selectedIndex === index) {
          newSelected.add(direction === 'top' ? 0 : requirements.length - 1)
        } else if (direction === 'top') {
          if (selectedIndex < index) {
            newSelected.add(selectedIndex + 1)
          } else {
            newSelected.add(selectedIndex)
          }
        } else {
          if (selectedIndex > index) {
            newSelected.add(selectedIndex - 1)
          } else {
            newSelected.add(selectedIndex)
          }
        }
      })
      setSelectedNonFunctionalRequirements(newSelected)
    }
  }, [data, onChange, selectedFunctionalRequirements, selectedNonFunctionalRequirements])


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
            <SearchableSelect
              value={data.capabilityId || ''}
              onChange={(value) => handleBasicChange('capabilityId', value)}
              options={capabilityOptions}
              placeholder="Select a capability..."
              className="px-3 py-2 focus:ring-2 focus:ring-ring focus:border-transparent"
            />
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
                <th className="text-left p-2 text-sm font-medium text-foreground w-8">
                  <input
                    type="checkbox"
                    checked={selectedFunctionalRequirements.size === (data.functionalRequirements || []).length && (data.functionalRequirements || []).length > 0}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedFunctionalRequirements(new Set((data.functionalRequirements || []).map((_, index) => index)))
                      } else {
                        setSelectedFunctionalRequirements(new Set())
                      }
                    }}
                    className="rounded"
                  />
                </th>
                <th className="text-left p-2 text-sm font-medium text-foreground w-8"></th>
                <th className="text-left p-2 text-sm font-medium text-foreground w-28">ID</th>
                <th className="text-left p-2 text-sm font-medium text-foreground w-50">Name</th>
                <th className="text-left p-2 text-sm font-medium text-foreground">Requirement</th>
                <th className="text-left p-2 text-sm font-medium text-foreground w-24">Priority</th>
                <th className="text-left p-2 text-sm font-medium text-foreground w-24">Status</th>
                <th className="text-left p-2 text-sm font-medium text-foreground w-20">Approval</th>
                <th className="text-left p-2 text-sm font-medium text-foreground w-32">Actions</th>
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
                  <td className="p-2">
                    <input
                      type="checkbox"
                      checked={selectedFunctionalRequirements.has(index)}
                      onChange={(e) => {
                        const newSelected = new Set(selectedFunctionalRequirements)
                        if (e.target.checked) {
                          newSelected.add(index)
                        } else {
                          newSelected.delete(index)
                        }
                        setSelectedFunctionalRequirements(newSelected)
                      }}
                      className="rounded"
                    />
                  </td>
                  <td className="p-2">
                    <div className="flex items-center gap-1">
                      <GripVertical className="w-4 h-4 text-muted-foreground cursor-move" />
                      <div className="flex flex-col">
                        <button
                          type="button"
                          onClick={() => moveRequirement('functional', index, 'top')}
                          className="p-0.5 hover:bg-accent rounded text-muted-foreground hover:text-foreground transition-colors"
                          title="Move to top"
                          disabled={index === 0}
                        >
                          <ChevronUp className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveRequirement('functional', index, 'bottom')}
                          className="p-0.5 hover:bg-accent rounded text-muted-foreground hover:text-foreground transition-colors"
                          title="Move to bottom"
                          disabled={index === (data.functionalRequirements || []).length - 1}
                        >
                          <ChevronDown className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
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
                      className={`w-full px-2 py-1 bg-background border border-border rounded text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-y ${
                        expandedRequirements.has(`functional_${index}`) ? 'min-h-32' : 'min-h-[60px]'
                      }`}
                      value={req.requirement || ''}
                      onChange={(e) => handleArrayChange('functionalRequirements', index, 'requirement', e.target.value)}
                      onPaste={(e) => {
                        // Get the pasted text from clipboard
                        const pastedText = e.clipboardData?.getData('text/plain') || ''
                        // Auto-expand if pasted content has multiple lines
                        if (pastedText.includes('\n') && !expandedRequirements.has(`functional_${index}`)) {
                          // Small delay to ensure paste completes
                          setTimeout(() => {
                            toggleRequirementExpansion('functional', index)
                          }, 100)
                        }
                      }}
                      placeholder="Describe the functional requirement (supports multiple lines)"
                      rows={expandedRequirements.has(`functional_${index}`) ? 8 : 3}
                      style={{
                        minHeight: expandedRequirements.has(`functional_${index}`) ? '128px' : '60px'
                      }}
                      onInput={(e) => {
                        // Auto-resize textarea to fit content
                        const target = e.target as HTMLTextAreaElement
                        target.style.height = 'auto'
                        target.style.height = `${Math.max(target.scrollHeight, expandedRequirements.has(`functional_${index}`) ? 128 : 60)}px`
                      }}
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
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => removeArrayItem('functionalRequirements', index)}
                        className="p-1 bg-destructive text-destructive-foreground rounded hover:bg-destructive/90 transition-colors"
                      >
                        <Trash2 size={12} />
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleRequirementExpansion('functional', index)}
                        className="p-1 bg-primary/10 hover:bg-primary/20 border border-primary/20 rounded text-primary hover:text-primary transition-colors"
                        title={expandedRequirements.has(`functional_${index}`) ? 'Collapse' : 'Expand'}
                      >
                        {expandedRequirements.has(`functional_${index}`) ? (
                          <Minimize2 size={12} />
                        ) : (
                          <Maximize2 size={12} />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <BulkEditPanel
          onBulkEdit={(updates, selectedIndices) => bulkEditRequirements('functionalRequirements', updates, selectedIndices)}
          requirementCount={data.functionalRequirements?.length || 0}
          fieldType="functional"
          selectedRequirements={selectedFunctionalRequirements}
          onSelectAll={() => setSelectedFunctionalRequirements(new Set((data.functionalRequirements || []).map((_, index) => index)))}
          onSelectNone={() => setSelectedFunctionalRequirements(new Set())}
        />

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

      {/* Non-Functional Requirements */}
      <div className="bg-card rounded-lg border border-border p-6 space-y-4">
        <h4 className="text-lg font-semibold text-foreground">Non-Functional Requirements</h4>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left p-2 text-sm font-medium text-foreground w-8">
                  <input
                    type="checkbox"
                    checked={selectedNonFunctionalRequirements.size === (data.nonFunctionalRequirements || []).length && (data.nonFunctionalRequirements || []).length > 0}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedNonFunctionalRequirements(new Set((data.nonFunctionalRequirements || []).map((_, index) => index)))
                      } else {
                        setSelectedNonFunctionalRequirements(new Set())
                      }
                    }}
                    className="rounded"
                  />
                </th>
                <th className="text-left p-2 text-sm font-medium text-foreground w-8"></th>
                <th className="text-left p-2 text-sm font-medium text-foreground w-28">ID</th>
                <th className="text-left p-2 text-sm font-medium text-foreground w-50">Name</th>
                <th className="text-left p-2 text-sm font-medium text-foreground w-30">Type</th>
                <th className="text-left p-2 text-sm font-medium text-foreground">Requirement</th>
                <th className="text-left p-2 text-sm font-medium text-foreground w-24">Priority</th>
                <th className="text-left p-2 text-sm font-medium text-foreground w-24">Status</th>
                <th className="text-left p-2 text-sm font-medium text-foreground w-20">Approval</th>
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
                  <td className="p-2">
                    <input
                      type="checkbox"
                      checked={selectedNonFunctionalRequirements.has(index)}
                      onChange={(e) => {
                        const newSelected = new Set(selectedNonFunctionalRequirements)
                        if (e.target.checked) {
                          newSelected.add(index)
                        } else {
                          newSelected.delete(index)
                        }
                        setSelectedNonFunctionalRequirements(newSelected)
                      }}
                      className="rounded"
                    />
                  </td>
                  <td className="p-2">
                    <div className="flex items-center gap-1">
                      <GripVertical className="w-4 h-4 text-muted-foreground cursor-move" />
                      <div className="flex flex-col">
                        <button
                          type="button"
                          onClick={() => moveRequirement('nonFunctional', index, 'top')}
                          className="p-0.5 hover:bg-accent rounded text-muted-foreground hover:text-foreground transition-colors"
                          title="Move to top"
                          disabled={index === 0}
                        >
                          <ChevronUp className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveRequirement('nonFunctional', index, 'bottom')}
                          className="p-0.5 hover:bg-accent rounded text-muted-foreground hover:text-foreground transition-colors"
                          title="Move to bottom"
                          disabled={index === (data.nonFunctionalRequirements || []).length - 1}
                        >
                          <ChevronDown className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
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
                      className={`w-full px-2 py-1 bg-background border border-border rounded text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-y ${
                        expandedRequirements.has(`nonFunctional_${index}`) ? 'min-h-32' : 'min-h-[60px]'
                      }`}
                      value={req.requirement || ''}
                      onChange={(e) => handleArrayChange('nonFunctionalRequirements', index, 'requirement', e.target.value)}
                      onPaste={(e) => {
                        // Get the pasted text from clipboard
                        const pastedText = e.clipboardData?.getData('text/plain') || ''
                        // Auto-expand if pasted content has multiple lines
                        if (pastedText.includes('\n') && !expandedRequirements.has(`nonFunctional_${index}`)) {
                          // Small delay to ensure paste completes
                          setTimeout(() => {
                            toggleRequirementExpansion('nonFunctional', index)
                          }, 100)
                        }
                      }}
                      placeholder="Describe the non-functional requirement (supports multiple lines)"
                      rows={expandedRequirements.has(`nonFunctional_${index}`) ? 8 : 3}
                      style={{
                        minHeight: expandedRequirements.has(`nonFunctional_${index}`) ? '128px' : '60px'
                      }}
                      onInput={(e) => {
                        // Auto-resize textarea to fit content
                        const target = e.target as HTMLTextAreaElement
                        target.style.height = 'auto'
                        target.style.height = `${Math.max(target.scrollHeight, expandedRequirements.has(`nonFunctional_${index}`) ? 128 : 60)}px`
                      }}
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
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => removeArrayItem('nonFunctionalRequirements', index)}
                        className="p-1 bg-destructive text-destructive-foreground rounded hover:bg-destructive/90 transition-colors"
                      >
                        <Trash2 size={12} />
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleRequirementExpansion('nonFunctional', index)}
                        className="p-1 bg-primary/10 hover:bg-primary/20 border border-primary/20 rounded text-primary hover:text-primary transition-colors"
                        title={expandedRequirements.has(`nonFunctional_${index}`) ? 'Collapse' : 'Expand'}
                      >
                        {expandedRequirements.has(`nonFunctional_${index}`) ? (
                          <Minimize2 size={12} />
                        ) : (
                          <Maximize2 size={12} />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <BulkEditPanel
          onBulkEdit={(updates, selectedIndices) => bulkEditRequirements('nonFunctionalRequirements', updates, selectedIndices)}
          requirementCount={data.nonFunctionalRequirements?.length || 0}
          fieldType="nonFunctional"
          selectedRequirements={selectedNonFunctionalRequirements}
          onSelectAll={() => setSelectedNonFunctionalRequirements(new Set((data.nonFunctionalRequirements || []).map((_, index) => index)))}
          onSelectNone={() => setSelectedNonFunctionalRequirements(new Set())}
        />

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

      {/* Dependencies Section */}
      <div className="bg-card rounded-lg border border-border p-6 space-y-6">
        <h4 className="text-lg font-semibold text-foreground">Dependencies</h4>
        <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mb-4">
          <div className="text-sm text-blue-800">
            <p className="mb-1"><strong>Upstream Enablers:</strong> Deliver inputs, services, or data required by this enabler.</p>
            <p><strong>Downstream Enablers:</strong> Consume outputs or services produced by this enabler.</p>
          </div>
        </div>

        {/* Internal Upstream Dependencies */}
        <div className="space-y-4">
          <h5 className="text-base font-medium text-foreground">Internal Upstream Dependencies</h5>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-2 text-sm font-medium text-foreground">Enabler ID</th>
                  <th className="text-left p-2 text-sm font-medium text-foreground">Description</th>
                  <th className="text-left p-2 text-sm font-medium text-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {(data.internalUpstream || []).map((dep, index) => (
                  <tr key={index} className="border-b border-border hover:bg-accent">
                    <td className="p-2">
                      <SearchableSelect
                        value={dep.id || ''}
                        onChange={(value) => handleArrayChange('internalUpstream', index, 'id', value)}
                        options={enablerOptions}
                        placeholder="Select enabler"
                      />
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
                  <th className="text-left p-2 text-sm font-medium text-foreground">Enabler ID</th>
                  <th className="text-left p-2 text-sm font-medium text-foreground">Description</th>
                  <th className="text-left p-2 text-sm font-medium text-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {(data.internalDownstream || []).map((impact, index) => (
                  <tr key={index} className="border-b border-border hover:bg-accent">
                    <td className="p-2">
                      <SearchableSelect
                        value={impact.id || ''}
                        onChange={(value) => handleArrayChange('internalDownstream', index, 'id', value)}
                        options={enablerOptions}
                        placeholder="Select enabler"
                      />
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