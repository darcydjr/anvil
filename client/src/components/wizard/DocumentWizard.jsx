import React, { useState, useEffect } from 'react'
import { ChevronRight, ChevronLeft, Check, HelpCircle, X, Wand2 } from 'lucide-react'
import { useApp } from '../../contexts/AppContext'
import { generateCapabilityId, generateEnablerId } from '../../utils/idGenerator'
import { STATUS_VALUES, APPROVAL_VALUES, PRIORITY_VALUES } from '../../utils/constants'
import './DocumentWizard.css'

const WIZARD_STEPS = {
  DOCUMENT_TYPE: 'documentType',
  BASIC_INFO: 'basicInfo',
  WORKSPACE_PATH: 'workspacePath',
  TECHNICAL_DETAILS: 'technicalDetails',
  ENABLERS: 'enablers',
  DEPENDENCIES: 'dependencies',
  REVIEW: 'review'
}

const STEP_CONFIG = {
  capability: [
    WIZARD_STEPS.DOCUMENT_TYPE,
    WIZARD_STEPS.BASIC_INFO,
    WIZARD_STEPS.WORKSPACE_PATH,
    WIZARD_STEPS.TECHNICAL_DETAILS,
    WIZARD_STEPS.ENABLERS,
    WIZARD_STEPS.DEPENDENCIES,
    WIZARD_STEPS.REVIEW
  ],
  enabler: [
    WIZARD_STEPS.DOCUMENT_TYPE,
    WIZARD_STEPS.BASIC_INFO,
    WIZARD_STEPS.WORKSPACE_PATH,
    WIZARD_STEPS.TECHNICAL_DETAILS,
    WIZARD_STEPS.DEPENDENCIES,
    WIZARD_STEPS.REVIEW
  ]
}

const STEP_LABELS = {
  [WIZARD_STEPS.DOCUMENT_TYPE]: 'Choose Document Type',
  [WIZARD_STEPS.BASIC_INFO]: 'Basic Information',
  [WIZARD_STEPS.WORKSPACE_PATH]: 'Save Location',
  [WIZARD_STEPS.TECHNICAL_DETAILS]: 'Technical Details',
  [WIZARD_STEPS.ENABLERS]: 'Define Enablers',
  [WIZARD_STEPS.DEPENDENCIES]: 'Dependencies',
  [WIZARD_STEPS.REVIEW]: 'Review & Create'
}

const HELP_TEXT = {
  documentType: {
    title: 'What type of document?',
    description: 'Choose between a Capability (high-level feature) or an Enabler (implementation detail)',
    tips: [
      'Capabilities describe WHAT the system should do',
      'Enablers describe HOW to implement capabilities',
      'Start with a Capability if defining a new feature'
    ]
  },
  basicInfo: {
    title: 'Basic Information',
    description: 'Provide essential details about your document',
    tips: [
      'Use clear, descriptive names',
      'IDs are auto-generated but can be customized',
      'Owner should be a team or role, not an individual'
    ]
  },
  workspacePath: {
    title: 'Where to save?',
    description: 'Choose which project path this document belongs to',
    tips: [
      'Documents are organized by project paths',
      'Each path represents a different module or feature area',
      'You can move documents between paths later'
    ]
  },
  technicalDetails: {
    title: 'Technical Overview',
    description: 'Describe the technical purpose and scope',
    tips: [
      'Be specific about what problem this solves',
      'Include key technical constraints or requirements',
      'This helps AI understand implementation context'
    ]
  },
  enablers: {
    title: 'Break down into enablers',
    description: 'Define the implementation components needed',
    tips: [
      'Each enabler should be a discrete, implementable unit',
      'Think of enablers as work packages or stories',
      'You can add more enablers later as needed'
    ]
  },
  dependencies: {
    title: 'What does this depend on?',
    description: 'Identify upstream dependencies and downstream impacts',
    tips: [
      'Internal dependencies are other capabilities in your system',
      'External dependencies are third-party services or libraries',
      'This helps with planning and risk assessment'
    ]
  },
  review: {
    title: 'Review and Create',
    description: 'Verify all information before creating the document',
    tips: [
      'Double-check names and IDs for consistency',
      'Ensure all required fields are completed',
      'You can always edit after creation'
    ]
  }
}

export default function DocumentWizard({ onClose, onComplete, initialType = null }) {
  const { capabilities, enablers, workspaces } = useApp()
  const [currentStep, setCurrentStep] = useState(0)
  const [documentType, setDocumentType] = useState(initialType || 'capability')
  const [formData, setFormData] = useState({
    type: initialType || null,
    name: '',
    id: '',
    system: '',
    component: '',
    owner: 'Product Team',
    status: STATUS_VALUES.CAPABILITY.IN_DRAFT,
    approval: APPROVAL_VALUES.NOT_APPROVED,
    priority: PRIORITY_VALUES.CAPABILITY_ENABLER.HIGH,
    purpose: '',
    selectedPath: '',
    enablers: [],
    internalUpstream: [],
    internalDownstream: [],
    externalUpstream: '',
    externalDownstream: '',
    capabilityId: '',
    functionalRequirements: [],
    nonFunctionalRequirements: []
  })
  const [errors, setErrors] = useState({})
  const [showHelp, setShowHelp] = useState(true)

  useEffect(() => {
    if (formData.type && !formData.id) {
      const existingIds = formData.type === 'capability'
        ? capabilities.map(c => c.id).filter(Boolean)
        : enablers.map(e => e.id).filter(Boolean)

      const newId = formData.type === 'capability'
        ? generateCapabilityId(existingIds)
        : generateEnablerId(existingIds)

      setFormData(prev => ({ ...prev, id: newId }))
    }
  }, [formData.type, capabilities, enablers])

  const steps = formData.type ? STEP_CONFIG[formData.type] : [WIZARD_STEPS.DOCUMENT_TYPE]
  const currentStepKey = steps[currentStep]

  const validateStep = () => {
    const newErrors = {}

    switch (currentStepKey) {
      case WIZARD_STEPS.DOCUMENT_TYPE:
        if (!formData.type) {
          newErrors.type = 'Please select a document type'
        }
        break

      case WIZARD_STEPS.BASIC_INFO:
        if (!formData.name?.trim()) {
          newErrors.name = 'Name is required'
        }
        if (!formData.id?.trim()) {
          newErrors.id = 'ID is required'
        }
        break

      case WIZARD_STEPS.WORKSPACE_PATH:
        if (!formData.selectedPath) {
          newErrors.selectedPath = 'Please select a save location'
        }
        break
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleNext = () => {
    if (validateStep()) {
      if (currentStep < steps.length - 1) {
        setCurrentStep(currentStep + 1)
      } else {
        handleComplete()
      }
    }
  }

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleComplete = () => {
    if (onComplete) {
      onComplete(formData)
    }
  }

  const updateFormData = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }))
    }
  }

  const addEnabler = () => {
    const existingEnablerIds = [
      ...enablers.map(e => e.id),
      ...formData.enablers.map(e => e.id)
    ].filter(Boolean)

    const newEnabler = {
      id: generateEnablerId(existingEnablerIds),
      name: '',
      description: '',
      status: STATUS_VALUES.ENABLER.IN_DRAFT,
      approval: APPROVAL_VALUES.NOT_APPROVED,
      priority: PRIORITY_VALUES.CAPABILITY_ENABLER.HIGH
    }

    setFormData(prev => ({
      ...prev,
      enablers: [...prev.enablers, newEnabler]
    }))
  }

  const updateEnabler = (index, field, value) => {
    const updatedEnablers = [...formData.enablers]
    updatedEnablers[index] = { ...updatedEnablers[index], [field]: value }
    setFormData(prev => ({ ...prev, enablers: updatedEnablers }))
  }

  const removeEnabler = (index) => {
    setFormData(prev => ({
      ...prev,
      enablers: prev.enablers.filter((_, i) => i !== index)
    }))
  }

  const renderStepContent = () => {
    switch (currentStepKey) {
      case WIZARD_STEPS.DOCUMENT_TYPE:
        return (
          <div className="wizard-step-content">
            <div className="document-type-selection">
              <div
                className={`type-card ${formData.type === 'capability' ? 'selected' : ''}`}
                onClick={() => updateFormData('type', 'capability')}
              >
                <div className="type-card-header">
                  <h3>Capability</h3>
                  <span className="type-badge">CAP-XXXX</span>
                </div>
                <p>High-level business feature or functionality</p>
                <ul className="type-features">
                  <li>Defines WHAT the system should do</li>
                  <li>Contains multiple enablers</li>
                  <li>Business-oriented language</li>
                </ul>
              </div>

              <div
                className={`type-card ${formData.type === 'enabler' ? 'selected' : ''}`}
                onClick={() => updateFormData('type', 'enabler')}
              >
                <div className="type-card-header">
                  <h3>Enabler</h3>
                  <span className="type-badge">ENB-XXXX</span>
                </div>
                <p>Technical implementation component</p>
                <ul className="type-features">
                  <li>Defines HOW to implement</li>
                  <li>Part of a capability</li>
                  <li>Technical specifications</li>
                </ul>
              </div>
            </div>
            {errors.type && <span className="error-message">{errors.type}</span>}
          </div>
        )

      case WIZARD_STEPS.BASIC_INFO:
        return (
          <div className="wizard-step-content">
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">
                  Name <span className="required">*</span>
                </label>
                <input
                  type="text"
                  className={`form-input ${errors.name ? 'error' : ''}`}
                  value={formData.name}
                  onChange={(e) => updateFormData('name', e.target.value)}
                  placeholder={`Enter ${formData.type} name`}
                />
                {errors.name && <span className="error-message">{errors.name}</span>}
              </div>

              <div className="form-group">
                <label className="form-label">
                  ID <span className="required">*</span>
                </label>
                <input
                  type="text"
                  className={`form-input ${errors.id ? 'error' : ''}`}
                  value={formData.id}
                  onChange={(e) => updateFormData('id', e.target.value)}
                  placeholder="Auto-generated"
                />
                {errors.id && <span className="error-message">{errors.id}</span>}
              </div>

              {formData.type === 'capability' && (
                <>
                  <div className="form-group">
                    <label className="form-label">System</label>
                    <input
                      type="text"
                      className="form-input"
                      value={formData.system}
                      onChange={(e) => updateFormData('system', e.target.value)}
                      placeholder="e.g., Authentication System"
                      list="existing-systems"
                    />
                    <datalist id="existing-systems">
                      {[...new Set(capabilities.map(c => c.system).filter(Boolean))].map((system, idx) => (
                        <option key={idx} value={system} />
                      ))}
                    </datalist>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Component</label>
                    <input
                      type="text"
                      className="form-input"
                      value={formData.component}
                      onChange={(e) => updateFormData('component', e.target.value)}
                      placeholder="e.g., User Management"
                      list="existing-components"
                    />
                    <datalist id="existing-components">
                      {[...new Set(capabilities.map(c => c.component).filter(Boolean))].map((component, idx) => (
                        <option key={idx} value={component} />
                      ))}
                    </datalist>
                  </div>
                </>
              )}

              {formData.type === 'enabler' && (
                <div className="form-group">
                  <label className="form-label">Parent Capability</label>
                  <select
                    className="form-select"
                    value={formData.capabilityId}
                    onChange={(e) => updateFormData('capabilityId', e.target.value)}
                  >
                    <option value="">Select capability...</option>
                    {capabilities.map((cap) => (
                      <option key={cap.id} value={cap.id}>
                        {cap.title} ({cap.id})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Owner</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.owner}
                  onChange={(e) => updateFormData('owner', e.target.value)}
                  placeholder="Product Team"
                />
              </div>
            </div>
          </div>
        )

      case WIZARD_STEPS.WORKSPACE_PATH:
        return (
          <div className="wizard-step-content">
            <div className="form-group">
              <label className="form-label">
                Save Location <span className="required">*</span>
              </label>
              <div className="path-selection">
                {workspaces?.workspaces?.find(ws => ws.id === workspaces.activeWorkspaceId)?.projectPaths?.map((pathObj, index) => {
                  const path = typeof pathObj === 'string' ? pathObj : pathObj.path
                  return (
                    <div
                      key={index}
                      className={`path-option ${formData.selectedPath === path ? 'selected' : ''}`}
                      onClick={() => updateFormData('selectedPath', path)}
                    >
                      <div className="path-option-content">
                        <span className="path-name">{path}</span>
                        {formData.selectedPath === path && <Check size={16} />}
                      </div>
                    </div>
                  )
                })}
              </div>
              {errors.selectedPath && <span className="error-message">{errors.selectedPath}</span>}
            </div>
          </div>
        )

      case WIZARD_STEPS.TECHNICAL_DETAILS:
        return (
          <div className="wizard-step-content">
            <div className="form-group">
              <label className="form-label">Purpose & Technical Overview</label>
              <textarea
                className="form-textarea"
                value={formData.purpose}
                onChange={(e) => updateFormData('purpose', e.target.value)}
                placeholder={`Describe the ${formData.type}'s purpose and technical approach...`}
                rows={8}
              />
              <div className="field-hint">
                Be specific about:
                <ul>
                  <li>What problem this solves</li>
                  <li>Key technical requirements</li>
                  <li>Expected outcomes</li>
                </ul>
              </div>
            </div>
          </div>
        )

      case WIZARD_STEPS.ENABLERS:
        return (
          <div className="wizard-step-content">
            <div className="enablers-section">
              <div className="section-header">
                <h4>Enablers</h4>
                <button className="btn-secondary" onClick={addEnabler}>
                  Add Enabler
                </button>
              </div>

              {formData.enablers.length === 0 ? (
                <div className="empty-state">
                  <p>No enablers defined yet.</p>
                  <p>Click "Add Enabler" to break down this capability into implementation components.</p>
                </div>
              ) : (
                <div className="enablers-list">
                  {formData.enablers.map((enabler, index) => (
                    <div key={index} className="enabler-card">
                      <div className="enabler-header">
                        <span className="enabler-id">{enabler.id}</span>
                        <button
                          className="remove-btn"
                          onClick={() => removeEnabler(index)}
                        >
                          <X size={16} />
                        </button>
                      </div>
                      <div className="enabler-fields">
                        <input
                          type="text"
                          className="form-input"
                          value={enabler.name}
                          onChange={(e) => updateEnabler(index, 'name', e.target.value)}
                          placeholder="Enabler name"
                        />
                        <textarea
                          className="form-textarea"
                          value={enabler.description}
                          onChange={(e) => updateEnabler(index, 'description', e.target.value)}
                          placeholder="Brief description"
                          rows={2}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )

      case WIZARD_STEPS.DEPENDENCIES:
        return (
          <div className="wizard-step-content">
            <div className="dependencies-section">
              <div className="form-group">
                <label className="form-label">Internal Upstream Dependencies</label>
                <select
                  multiple
                  className="form-select-multiple"
                  value={formData.internalUpstream.map(d => d.id)}
                  onChange={(e) => {
                    const selectedIds = Array.from(e.target.selectedOptions).map(o => o.value)
                    const deps = selectedIds.map(id => ({ id, description: '' }))
                    updateFormData('internalUpstream', deps)
                  }}
                >
                  {capabilities.map((cap) => (
                    <option key={cap.id} value={cap.id}>
                      {cap.title} ({cap.id})
                    </option>
                  ))}
                </select>
                <div className="field-hint">Hold Ctrl/Cmd to select multiple</div>
              </div>

              <div className="form-group">
                <label className="form-label">External Dependencies</label>
                <textarea
                  className="form-textarea"
                  value={formData.externalUpstream}
                  onChange={(e) => updateFormData('externalUpstream', e.target.value)}
                  placeholder="List external services, APIs, or libraries this depends on..."
                  rows={4}
                />
              </div>
            </div>
          </div>
        )

      case WIZARD_STEPS.REVIEW:
        return (
          <div className="wizard-step-content review-step">
            <h3>Review Your {formData.type === 'capability' ? 'Capability' : 'Enabler'}</h3>

            <div className="review-section">
              <h4>Basic Information</h4>
              <div className="review-grid">
                <div className="review-item">
                  <span className="review-label">Name:</span>
                  <span className="review-value">{formData.name || 'Not set'}</span>
                </div>
                <div className="review-item">
                  <span className="review-label">ID:</span>
                  <span className="review-value">{formData.id}</span>
                </div>
                <div className="review-item">
                  <span className="review-label">Save Location:</span>
                  <span className="review-value">{formData.selectedPath || 'Not set'}</span>
                </div>
                <div className="review-item">
                  <span className="review-label">Owner:</span>
                  <span className="review-value">{formData.owner}</span>
                </div>
              </div>
            </div>

            {formData.purpose && (
              <div className="review-section">
                <h4>Purpose</h4>
                <p className="review-text">{formData.purpose}</p>
              </div>
            )}

            {formData.type === 'capability' && formData.enablers.length > 0 && (
              <div className="review-section">
                <h4>Enablers ({formData.enablers.length})</h4>
                <ul className="review-list">
                  {formData.enablers.map((enabler, index) => (
                    <li key={index}>
                      <strong>{enabler.id}:</strong> {enabler.name || 'Unnamed'}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="review-actions">
              <p className="review-note">
                Ready to create your {formData.type}? You can always edit these details later.
              </p>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  const getHelpContent = () => {
    const helpKey = currentStepKey === WIZARD_STEPS.DOCUMENT_TYPE ? 'documentType' :
                    currentStepKey.replace('WIZARD_STEPS.', '').toLowerCase()
    return HELP_TEXT[helpKey] || HELP_TEXT.documentType
  }

  return (
    <div className="wizard-overlay">
      <div className="wizard-container">
        <div className="wizard-header">
          <h2>
            <Wand2 size={20} />
            Document Creation Wizard
          </h2>
          <button className="wizard-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="wizard-progress">
          {steps.map((step, index) => (
            <div
              key={step}
              className={`progress-step ${index === currentStep ? 'active' : ''} ${index < currentStep ? 'completed' : ''}`}
            >
              <div className="step-indicator">
                {index < currentStep ? <Check size={14} /> : index + 1}
              </div>
              <span className="step-label">{STEP_LABELS[step]}</span>
            </div>
          ))}
        </div>

        <div className="wizard-body">
          <div className="wizard-content">
            <div className="step-header">
              <h3>{STEP_LABELS[currentStepKey]}</h3>
              <button
                className="help-toggle"
                onClick={() => setShowHelp(!showHelp)}
              >
                <HelpCircle size={18} />
              </button>
            </div>

            {showHelp && (
              <div className="help-panel">
                <h4>{getHelpContent().title}</h4>
                <p>{getHelpContent().description}</p>
                {getHelpContent().tips && (
                  <ul className="help-tips">
                    {getHelpContent().tips.map((tip, index) => (
                      <li key={index}>{tip}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {renderStepContent()}
          </div>
        </div>

        <div className="wizard-footer">
          <button
            className="btn-secondary"
            onClick={handlePrevious}
            disabled={currentStep === 0}
          >
            <ChevronLeft size={16} />
            Previous
          </button>

          <span className="step-counter">
            Step {currentStep + 1} of {steps.length}
          </span>

          <button
            className="btn-primary"
            onClick={handleNext}
          >
            {currentStep === steps.length - 1 ? 'Create Document' : 'Next'}
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}