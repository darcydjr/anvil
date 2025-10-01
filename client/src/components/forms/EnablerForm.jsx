import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { apiService } from '../../services/apiService'
import { generateFunctionalRequirementId, generateNonFunctionalRequirementId } from '../../utils/idGenerator'
import { stateListenerManager } from '../../utils/stateListeners'
import { STATUS_VALUES, APPROVAL_VALUES, PRIORITY_VALUES, REVIEW_VALUES } from '../../utils/constants'

function EnablerForm({ data, onChange, onValidationChange }) {
  const [availableCapabilities, setAvailableCapabilities] = useState([])
  const [validationErrors, setValidationErrors] = useState({})
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
    ],
    approval: Object.values(APPROVAL_VALUES),
    priority: Object.values(PRIORITY_VALUES.CAPABILITY_ENABLER),
    review: Object.values(REVIEW_VALUES),
    requirementPriority: Object.values(PRIORITY_VALUES.REQUIREMENT),
    requirementStatus: Object.values(STATUS_VALUES.REQUIREMENT).sort()
  }), [])

  const nfrTypes = [
    'Performance', 'Scalability', 'Security', 'Reliability', 'Availability',
    'Usability', 'Maintainability', 'Portability', 'Compliance', 'Technical Constraint', 'Other'
  ]

  return (
    <div className="enabler-form">
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
              placeholder="Enabler name"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Type</label>
            <input
              type="text"
              className="form-input"
              value="Enabler"
              readOnly
              style={{ backgroundColor: '#f5f5f5', cursor: 'not-allowed' }}
            />
          </div>

          <div className="form-group">
            <label className="form-label">ID</label>
            <input
              type="text"
              className="form-input"
              value={data.id || ''}
              onChange={(e) => handleBasicChange('id', e.target.value)}
              placeholder="ENB-1000"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Capability ID</label>
            <select
              className="form-select"
              value={data.capabilityId || ''}
              onChange={(e) => handleBasicChange('capabilityId', e.target.value)}
            >
              <option value="">Select a capability...</option>
              {availableCapabilities.map((cap) => (
                <option key={cap.id} value={cap.id}>
                  {cap.id} - {cap.title}
                </option>
              ))}
            </select>
            {validationErrors.capabilityId && (
              <span className="error-message">{validationErrors.capabilityId}</span>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Approval</label>
            <select
              className="form-select"
              value={data.approval || APPROVAL_VALUES.NOT_APPROVED}
              onChange={(e) => handleBasicChange('approval', e.target.value)}
            >
              {Object.values(APPROVAL_VALUES).map(approval => (
                <option key={approval} value={approval}>{approval}</option>
              ))}
            </select>
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

          <div className="form-group">
            <label className="form-label">Priority</label>
            <select
              className="form-select"
              value={data.priority || PRIORITY_VALUES.CAPABILITY_ENABLER.HIGH}
              onChange={(e) => handleBasicChange('priority', e.target.value)}
            >
              {Object.values(PRIORITY_VALUES.CAPABILITY_ENABLER).map(priority => (
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
              {Object.values(REVIEW_VALUES).map(review => (
                <option key={review} value={review}>{review}</option>
              ))}
            </select>
          </div>



          <div className="form-group">
            <label className="form-label">Code Review</label>
            <select
              className="form-select"
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

      {/* Functional Requirements */}
      <div className="form-section">
        <h4>Functional Requirements</h4>
        <div className="table-container">
          <table className="editable-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Requirement</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Approval</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {(data.functionalRequirements || []).map((req, index) => (
                <tr key={index}>
                  <td>
                    <input
                      type="text"
                      value={req.id || ''}
                      onChange={(e) => handleArrayChange('functionalRequirements', index, 'id', e.target.value)}
                      placeholder="FR-123456"
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      value={req.name || ''}
                      onChange={(e) => handleArrayChange('functionalRequirements', index, 'name', e.target.value)}
                      placeholder="Requirement name"
                    />
                  </td>
                  <td>
                    <textarea
                      value={req.requirement || ''}
                      onChange={(e) => handleArrayChange('functionalRequirements', index, 'requirement', e.target.value)}
                      placeholder="Describe the functional requirement"
                    />
                  </td>
                  <td>
                    <select
                      value={req.priority || PRIORITY_VALUES.REQUIREMENT.MUST_HAVE}
                      onChange={(e) => handleArrayChange('functionalRequirements', index, 'priority', e.target.value)}
                    >
                      {Object.values(PRIORITY_VALUES.REQUIREMENT).map(priority => (
                        <option key={priority} value={priority}>{priority}</option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <select
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
                  <td>
                    <select
                      value={req.approval || APPROVAL_VALUES.NOT_APPROVED}
                      onChange={(e) => handleArrayChange('functionalRequirements', index, 'approval', e.target.value)}
                    >
                      {Object.values(APPROVAL_VALUES).map(approval => (
                        <option key={approval} value={approval}>{approval}</option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <button
                      type="button"
                      onClick={() => removeArrayItem('functionalRequirements', index)}
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
              onClick={() => addArrayItem('functionalRequirements', templates.functionalReq)}
              className="add-row-btn"
            >
              <Plus size={14} />
              Add Functional Requirement
            </button>
          </div>
        </div>
      </div>

      {/* Non-Functional Requirements */}
      <div className="form-section">
        <h4>Non-Functional Requirements</h4>
        <div className="table-container">
          <table className="editable-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Type</th>
                <th>Requirement</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Approval</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {(data.nonFunctionalRequirements || []).map((req, index) => (
                <tr key={index}>
                  <td>
                    <input
                      type="text"
                      value={req.id || ''}
                      onChange={(e) => handleArrayChange('nonFunctionalRequirements', index, 'id', e.target.value)}
                      placeholder="NFR-123456"
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      value={req.name || ''}
                      onChange={(e) => handleArrayChange('nonFunctionalRequirements', index, 'name', e.target.value)}
                      placeholder="Requirement name"
                    />
                  </td>
                  <td>
                    <select
                      value={req.type || ''}
                      onChange={(e) => handleArrayChange('nonFunctionalRequirements', index, 'type', e.target.value)}
                    >
                      <option value="">Select type</option>
                      {nfrTypes.map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <textarea
                      value={req.requirement || ''}
                      onChange={(e) => handleArrayChange('nonFunctionalRequirements', index, 'requirement', e.target.value)}
                      placeholder="Describe the non-functional requirement"
                    />
                  </td>
                  <td>
                    <select
                      value={req.priority || PRIORITY_VALUES.REQUIREMENT.MUST_HAVE}
                      onChange={(e) => handleArrayChange('nonFunctionalRequirements', index, 'priority', e.target.value)}
                    >
                      {Object.values(PRIORITY_VALUES.REQUIREMENT).map(priority => (
                        <option key={priority} value={priority}>{priority}</option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <select
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
                  <td>
                    <select
                      value={req.approval || APPROVAL_VALUES.NOT_APPROVED}
                      onChange={(e) => handleArrayChange('nonFunctionalRequirements', index, 'approval', e.target.value)}
                    >
                      {Object.values(APPROVAL_VALUES).map(approval => (
                        <option key={approval} value={approval}>{approval}</option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <button
                      type="button"
                      onClick={() => removeArrayItem('nonFunctionalRequirements', index)}
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
              onClick={() => addArrayItem('nonFunctionalRequirements', templates.nonFunctionalReq)}
              className="add-row-btn"
            >
              <Plus size={14} />
              Add Non-Functional Requirement
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Memoize component to prevent unnecessary re-renders
export default React.memo(EnablerForm)