import React, { useEffect, useRef, useCallback, useMemo, useState } from 'react'
import { Plus, Trash2, FileText } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../../contexts/AppContext'
import { generateEnablerId } from '../../utils/idGenerator'
import { stateListenerManager } from '../../utils/stateListeners'
import { STATUS_VALUES, APPROVAL_VALUES, PRIORITY_VALUES, REVIEW_VALUES } from '../../utils/constants'
import { apiService } from '../../services/apiService'
import toast from 'react-hot-toast'

function CapabilityForm({ data, onChange, isNew = false, currentPath = null }) {
  const { capabilities, enablers } = useApp()
  const navigate = useNavigate()
  const stateListenerRef = useRef(null)
  const [workspaces, setWorkspaces] = useState({ workspaces: [], activeWorkspaceId: null })
  const [originalPath, setOriginalPath] = useState(null)

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
  
  // Memoize status, approval, priority, and review options
  const statusOptions = useMemo(() => [
    STATUS_VALUES.CAPABILITY.IN_DRAFT,
    STATUS_VALUES.CAPABILITY.READY_FOR_ANALYSIS,
    STATUS_VALUES.CAPABILITY.READY_FOR_DESIGN,
    STATUS_VALUES.CAPABILITY.READY_FOR_IMPLEMENTATION,
    STATUS_VALUES.CAPABILITY.IMPLEMENTED
  ], [])
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
  ], [])

  return (
    <div className="capability-form">
      {/* Basic Information */}
      <div className="form-section">
        <h4>Basic Information</h4>
        <div className="form-grid">
          <div className="form-group">
            <label className="form-label">Name *</label>
            <input
              type="text"
              className="form-input"
              value={data.name || ''}
              onChange={(e) => handleBasicChange('name', e.target.value)}
              placeholder="Capability name"
            />
          </div>

          <div className="form-group">
            <label className="form-label">ID</label>
            <input
              type="text"
              className="form-input"
              value={data.id || ''}
              onChange={(e) => handleBasicChange('id', e.target.value)}
              placeholder="CAP-1000"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Approval</label>
            <select
              className="form-select"
              value={data.approval || APPROVAL_VALUES.NOT_APPROVED}
              onChange={(e) => handleBasicChange('approval', e.target.value)}
            >
              {approvalOptions.map(approval => (
                <option key={approval} value={approval}>{approval}</option>
              ))}
            </select>
          </div>

          {workspaces.workspaces.length > 0 && (
            <div className="form-group">
              <label className="form-label">
                Specification Path {isNew ? '*' : ''}
              </label>
              <select
                className="form-select"
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
                <small className="form-helper-text">
                  ⚠️ Changing this will move the capability and all its enablers to the new path
                </small>
              )}
            </div>
          )}

          <div className="form-group">
            <label className="form-label">System</label>
            <input
              type="text"
              className="form-input"
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

          <div className="form-group">
            <label className="form-label">Component</label>
            <input
              type="text"
              className="form-input"
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

          <div className="form-group">
            <label className="form-label">Owner</label>
            <input
              type="text"
              className="form-input"
              value={data.owner || ''}
              onChange={(e) => handleBasicChange('owner', e.target.value)}
              placeholder="Product Team"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Status</label>
            <select
              className="form-select"
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

          <div className="form-group">
            <label className="form-label">Priority</label>
            <select
              className="form-select"
              value={data.priority || PRIORITY_VALUES.CAPABILITY_ENABLER.HIGH}
              onChange={(e) => handleBasicChange('priority', e.target.value)}
            >
              {priorityOptions.map(priority => (
                <option key={priority} value={priority}>{priority}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Analysis Review</label>
            <select
              className="form-select"
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
      <div className="form-section">
        <h4>Technical Overview</h4>
        <div className="form-group">
          <label className="form-label">Purpose</label>
          <textarea
            className="form-textarea"
            value={data.purpose || ''}
            onChange={(e) => handleBasicChange('purpose', e.target.value)}
            placeholder="What is the purpose?"
            rows={4}
          />
        </div>
      </div>

      {/* Enablers */}
      <div className="form-section">
        <h4>Enablers</h4>
        <div className="table-container">
          <table className="editable-table">
            <thead>
              <tr>
                <th>Enabler ID</th>
                <th>Name</th>
                <th>Description</th>
                <th>Status</th>
                <th>Approval</th>
                <th>Priority</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {(data.enablers || []).map((enabler, index) => (
                <tr key={index}>
                  <td>
                    <input
                      type="text"
                      value={enabler.id || ''}
                      onChange={(e) => handleArrayChange('enablers', index, 'id', e.target.value)}
                      placeholder="ENB-1000"
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      value={enabler.name || ''}
                      onChange={(e) => handleArrayChange('enablers', index, 'name', e.target.value)}
                      placeholder="Enabler name"
                    />
                  </td>
                  <td>
                    <textarea
                      value={enabler.description || ''}
                      onChange={(e) => handleArrayChange('enablers', index, 'description', e.target.value)}
                      placeholder="Brief description"
                    />
                  </td>
                  <td>
                    <select
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
                  <td>
                    <select
                      value={enabler.approval || APPROVAL_VALUES.NOT_APPROVED}
                      onChange={(e) => handleArrayChange('enablers', index, 'approval', e.target.value)}
                    >
                      {approvalOptions.map(approval => (
                        <option key={approval} value={approval}>{approval}</option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <select
                      value={enabler.priority || PRIORITY_VALUES.CAPABILITY_ENABLER.HIGH}
                      onChange={(e) => handleArrayChange('enablers', index, 'priority', e.target.value)}
                    >
                      {priorityOptions.map(priority => (
                        <option key={priority} value={priority}>{priority}</option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                      <button
                        type="button"
                        onClick={() => handleCreateEnablerDocument(enabler, index)}
                        className="btn btn-sm btn-success"
                        title="Create enabler document"
                        disabled={!enabler.id || !enabler.name || !data.id}
                      >
                        <FileText size={12} />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeArrayItem('enablers', index)}
                        className="remove-row-btn"
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
          <div className="table-actions">
            <button
              type="button"
              onClick={() => addArrayItem('enablers', templates.enabler)}
              className="add-row-btn"
            >
              <Plus size={14} />
              Add Enabler
            </button>
            <button
              type="button"
              onClick={approveAllEnablers}
              className="btn btn-success btn-sm"
              disabled={!data.enablers || data.enablers.length === 0}
              style={{ marginLeft: '10px' }}
            >
              Approve All
            </button>
          </div>
        </div>
      </div>

      {/* Dependencies Section */}
      <div className="form-section">
        <h4>Dependencies</h4>
        
        {/* Internal Upstream Dependencies */}
        <h4>Internal Upstream Dependencies</h4>
        <div className="table-container">
          <table className="editable-table">
            <thead>
              <tr>
                <th>Capability ID</th>
                <th>Description</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {(data.internalUpstream || []).map((dep, index) => (
                <tr key={index}>
                  <td>
                    <select
                      value={dep.id || ''}
                      onChange={(e) => handleArrayChange('internalUpstream', index, 'id', e.target.value)}
                    >
                      <option value="">Select capability</option>
                      {capabilities.map((cap) => (
                        <option key={cap.path} value={cap.id || cap.title}>
                          {cap.title} - {cap.id || cap.title}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <textarea
                      value={dep.description || ''}
                      onChange={(e) => handleArrayChange('internalUpstream', index, 'description', e.target.value)}
                      placeholder="Describe the dependency"
                    />
                  </td>
                  <td>
                    <button
                      type="button"
                      onClick={() => removeArrayItem('internalUpstream', index)}
                      className="remove-row-btn"
                    >
                      <Trash2 size={12} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="table-actions">
            <button
              type="button"
              onClick={() => addArrayItem('internalUpstream', templates.upstream)}
              className="add-row-btn"
            >
              <Plus size={14} />
              Add Dependency
            </button>
          </div>
        </div>

        {/* Internal Downstream Impact */}
        <h4 style={{ marginTop: '1.5rem' }}>Internal Downstream Impact</h4>
        <div className="table-container">
          <table className="editable-table">
            <thead>
              <tr>
                <th>Capability ID</th>
                <th>Description</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {(data.internalDownstream || []).map((impact, index) => (
                <tr key={index}>
                  <td>
                    <select
                      value={impact.id || ''}
                      onChange={(e) => handleArrayChange('internalDownstream', index, 'id', e.target.value)}
                    >
                      <option value="">Select capability</option>
                      {capabilities.map((cap) => (
                        <option key={cap.path} value={cap.id || cap.title}>
                          {cap.title} - {cap.id || cap.title}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <textarea
                      value={impact.description || ''}
                      onChange={(e) => handleArrayChange('internalDownstream', index, 'description', e.target.value)}
                      placeholder="Describe the impact"
                    />
                  </td>
                  <td>
                    <button
                      type="button"
                      onClick={() => removeArrayItem('internalDownstream', index)}
                      className="remove-row-btn"
                    >
                      <Trash2 size={12} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="table-actions">
            <button
              type="button"
              onClick={() => addArrayItem('internalDownstream', templates.downstream)}
              className="add-row-btn"
            >
              <Plus size={14} />
              Add Dependency
            </button>
          </div>
        </div>

        {/* External Dependencies */}
        <h4 style={{ marginTop: '1.5rem' }}>External Dependencies</h4>
        <div className="form-grid">
          <div className="form-group">
            <label className="form-label">External Upstream Dependencies</label>
            <textarea
              className="form-textarea"
              value={data.externalUpstream || ''}
              onChange={(e) => handleBasicChange('externalUpstream', e.target.value)}
              placeholder="Describe external upstream dependencies..."
              style={{ minHeight: '100px' }}
            />
          </div>

          <div className="form-group">
            <label className="form-label">External Downstream Impact</label>
            <textarea
              className="form-textarea"
              value={data.externalDownstream || ''}
              onChange={(e) => handleBasicChange('externalDownstream', e.target.value)}
              placeholder="Describe external downstream impact..."
              style={{ minHeight: '100px' }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

// Memoize component to prevent unnecessary re-renders
export default React.memo(CapabilityForm)