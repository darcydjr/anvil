import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { apiService } from '../services/apiService'
import { useApp } from '../contexts/AppContext'
import { Save, ArrowLeft, Eye, Code, Plus } from 'lucide-react'
import toast from 'react-hot-toast'
import { parseMarkdownToForm, convertFormToMarkdown } from '../utils/markdownUtils'
import { generateCapabilityId, generateEnablerId } from '../utils/idGenerator'
import { nameToFilename, namesGenerateDifferentFilenames, idToFilename } from '../utils/fileUtils'
import CapabilityForm from './forms/CapabilityForm'
import EnablerForm from './forms/EnablerForm'
import './DocumentEditor.css'

export default function DocumentEditor() {
  const { type, '*': path, capabilityId } = useParams()
  const navigate = useNavigate()
  const { refreshData, config, capabilities, enablers, setSelectedDocument } = useApp()
  
  const [document, setDocument] = useState(null)
  const [formData, setFormData] = useState({})
  const [markdownContent, setMarkdownContent] = useState('')
  const [editMode, setEditMode] = useState('form') // 'form' or 'markdown'
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isNew, setIsNew] = useState(!path)
  const [originalCapabilityId, setOriginalCapabilityId] = useState(null) // Track original capability for reparenting
  const [originalName, setOriginalName] = useState('') // Track original name for file renaming
  const [validationState, setValidationState] = useState({ isValid: true, errors: {} })

  useEffect(() => {
    if (path) {
      loadDocument()
    } else {
      initializeNewDocument()
    }
  }, [path, type])

  const loadDocument = async () => {
    try {
      setLoading(true)
      const data = await apiService.getFile(path)
      setDocument(data)
      setMarkdownContent(data.content)
      
      // Parse markdown to form data
      const parsed = parseMarkdownToForm(data.content, type)
      setFormData(parsed)
      
      // Track original values for change detection
      if (parsed.name) {
        setOriginalName(parsed.name)
      }
      if (type === 'enabler' && parsed.capabilityId) {
        setOriginalCapabilityId(parsed.capabilityId)
      }
    } catch (err) {
      toast.error(`Failed to load document: ${err.message}`)
      navigate('/')
    } finally {
      setLoading(false)
    }
  }

  const initializeNewDocument = async () => {
    try {
      setLoading(true)
      
      // Load template if available
      try {
        let template;
        
        // Use unified template endpoints for both capabilities and enablers
        if (type === 'enabler') {
          const response = await fetch(`/api/enabler-template/${capabilityId || ''}`);
          template = await response.json();
        } else if (type === 'capability') {
          const response = await fetch('/api/capability-template');
          template = await response.json();
        } else {
          // Use regular template file for other types
          const templatePath = `templates/${type}-template.md`
          template = await apiService.getFile(templatePath)
        }
        
        setMarkdownContent(template.content)
        const parsed = parseMarkdownToForm(template.content, type)
        
        // Set default values
        parsed.owner = config?.owner || 'Product Team'
        if (type === 'enabler') {
          parsed.analysisReview = config?.analysisReview || 'Required'
          parsed.codeReview = config?.codeReview || 'Not Required'
          // Ensure approval defaults to 'Not Approved' for new enablers
          if (!parsed.approval) {
            parsed.approval = 'Not Approved'
          }
        }
        if (type === 'capability') {
          // Only generate new ID if template doesn't have one
          if (!parsed.id) {
            parsed.id = generateId('CAP')
          }
          // Include config data for path selection
          parsed.lastSelectedCapabilityPath = config?.lastSelectedCapabilityPath
        } else if (type === 'enabler') {
          // Only generate new ID if template doesn't have one
          if (!parsed.id) {
            parsed.id = generateId('ENB')
          }
          if (capabilityId) {
            parsed.capabilityId = capabilityId
          }
        }

        setFormData(parsed)
      } catch (templateErr) {
        // No template found, start with empty form
        const defaultData = getDefaultFormData(type, capabilityId)
        setFormData(defaultData)
        setMarkdownContent(convertFormToMarkdown(defaultData, type))
      }
    } catch (err) {
      toast.error(`Failed to initialize document: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const getDefaultFormData = (type, presetCapabilityId) => {
    const base = {
      name: '',
      owner: config?.owner || 'Product Team',
      analysisReview: config?.analysisReview || 'Required',
      codeReview: type === 'enabler' ? (config?.codeReview || 'Not Required') : undefined,
      status: 'In Draft',
      approval: 'Not Approved',
      priority: 'High'
    }

    if (type === 'capability') {
      return {
        ...base,
        id: generateId('CAP'),
        internalUpstream: [],
        internalDownstream: [],
        externalUpstream: '',
        externalDownstream: '',
        enablers: [],
        lastSelectedCapabilityPath: config?.lastSelectedCapabilityPath
      }
    } else if (type === 'enabler') {
      return {
        ...base,
        id: generateId('ENB'),
        capabilityId: presetCapabilityId || '',
        functionalRequirements: [],
        nonFunctionalRequirements: []
      }
    }

    return base
  }

  const generateId = (prefix) => {
    if (prefix === 'CAP') {
      const existingCapabilityIds = (capabilities || []).map(cap => cap.id).filter(Boolean)
      return generateCapabilityId(existingCapabilityIds)
    } else if (prefix === 'ENB') {
      const existingEnablerIds = (enablers || []).map(enb => enb.id).filter(Boolean)
      return generateEnablerId(existingEnablerIds)
    }
    
    // Fallback to old system if unexpected prefix
    const timestamp = Date.now().toString().slice(-2)
    const random = Math.floor(Math.random() * 100).toString().padStart(2, '0')
    return `${prefix}-${timestamp}${random}`
  }

  const handleSave = async () => {
    try {
      setSaving(true)

      // Check validation for enablers
      if (type === 'enabler' && editMode === 'form' && !validationState.isValid) {
        toast.error('Please select a Capability ID before saving')
        setSaving(false)
        return
      }

      // Check path validation for new capabilities
      if (type === 'capability' && isNew && editMode === 'form' && !formData.selectedPath) {
        toast.error('Please select a save path before saving the capability')
        setSaving(false)
        return
      }

      // Check if existing capability path is changing (move operation)
      let isMovingCapability = false
      let originalPath = null
      if (type === 'capability' && !isNew && editMode === 'form' && formData.selectedPath && path) {
        // Extract current directory from the existing path
        const currentDir = path.includes('/') || path.includes('\\')
          ? path.substring(0, path.lastIndexOf('/') || path.lastIndexOf('\\'))
          : ''

        // Compare with selected path
        if (currentDir !== formData.selectedPath) {
          isMovingCapability = true
          originalPath = path
          console.log(`[CAPABILITY-MOVE] Moving capability from ${currentDir} to ${formData.selectedPath}`)
        }
      }

      let contentToSave
      if (editMode === 'form') {
        contentToSave = convertFormToMarkdown(formData, type)
      } else {
        contentToSave = markdownContent
      }

      // Handle filename generation and renaming
      let savePath = path
      let needsRename = false
      let newPath = null

      if (isNew) {
        // Generate filename for new document using ID for uniqueness
        const filename = formData.id ? idToFilename(formData.id, type) : nameToFilename(formData.name || 'untitled', type)

        if (type === 'template') {
          savePath = `templates/${filename}`
        } else if (type === 'capability' && formData.selectedPath) {
          // Use the selected path for capability
          savePath = `${formData.selectedPath}/${filename}`
        } else {
          // Default behavior - just use the filename, server config handles the path
          savePath = filename
        }
      } else if (isMovingCapability) {
        // Handle capability move operation
        const filename = path.split('/').pop().split('\\').pop()
        savePath = `${formData.selectedPath}/${filename}`
        needsRename = true
        newPath = savePath
      } else if (!isNew && originalName && formData.name && formData.name !== originalName) {
        // Check if existing document name changed and would generate different filename
        if (namesGenerateDifferentFilenames(originalName, formData.name, type)) {
          needsRename = true
          newPath = nameToFilename(formData.name, type)
          if (type === 'template') {
            newPath = `templates/${newPath}`
          }
          // For capabilities and enablers, just use the filename - server config handles the path
        }
      }

      // Use enhanced save for capabilities
      if (type === 'capability' && editMode === 'form') {
        await apiService.saveCapabilityWithEnablers(
          savePath, 
          contentToSave, 
          formData.id,
          formData.internalUpstream || [],
          formData.internalDownstream || [],
          formData.enablers || []
        )
      } else if (type === 'enabler' && editMode === 'form') {
        // Use enhanced save for enablers to handle reparenting
        await apiService.saveEnablerWithReparenting(
          savePath,
          contentToSave,
          formData,
          originalCapabilityId
        )
      } else {
        await apiService.saveFile(savePath, contentToSave)
      }
      
      // Handle file renaming/moving if needed
      if (needsRename && newPath) {
        if (isMovingCapability) {
          console.log(`[CAPABILITY-MOVE] Moving capability from ${path} to ${newPath}`)
          await apiService.renameFile(path, newPath)

          // Move all associated enablers
          if (formData.enablers && formData.enablers.length > 0) {
            console.log(`[CAPABILITY-MOVE] Moving ${formData.enablers.length} enablers`)
            for (const enabler of formData.enablers) {
              if (enabler.id) {
                try {
                  // Use consistent filename generation
                  const enablerFilename = idToFilename(enabler.id, 'enabler')
                  const enablerPath = idToFilename(enabler.id, 'enabler')
                  const newEnablerPath = `${formData.selectedPath}/${enablerFilename}`

                  console.log(`[ENABLER-MOVE] Moving enabler ${enabler.id} to ${newEnablerPath}`)
                  await apiService.renameFile(enablerPath, newEnablerPath)
                } catch (enablerError) {
                  console.warn(`[ENABLER-MOVE] Failed to move enabler ${enabler.id}:`, enablerError.message)
                  // Continue with other enablers even if one fails
                }
              }
            }
          }
        } else {
          console.log(`[RENAME] Renaming file from ${savePath} to ${newPath}`)
          await apiService.renameFile(savePath, newPath)
          setOriginalName(formData.name) // Update original name
        }
        savePath = newPath // Update savePath to the new path
      }
      
      // Success - no toast message needed

      // Save path preference for capabilities
      if (type === 'capability' && isNew && formData.selectedPath) {
        try {
          await apiService.updateConfig({
            lastSelectedCapabilityPath: formData.selectedPath
          })
          console.log(`[PATH-PREFERENCE] Saved path preference: ${formData.selectedPath}`)
        } catch (error) {
          console.error('Error saving path preference:', error)
        }
      }

      // Refresh data in app context
      refreshData()
      
      // Navigate to view mode - extract just the filename for navigation
      const filename = savePath.split('/').pop().split('\\').pop()

      // Set selected document for navigation consistency
      setSelectedDocument({
        type: type,
        path: filename,
        id: formData.name || formData.id || filename
      })

      navigate(`/view/${type}/${filename}`)
      
    } catch (err) {
      toast.error(`Failed to save document: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  const handleFormDataChange = (newData) => {
    setFormData({ ...formData, ...newData })
  }

  const handleValidationChange = (isValid, errors) => {
    setValidationState({ isValid, errors })
  }

  const handleModeSwitch = (newMode) => {
    try {
      if (newMode === 'markdown' && editMode === 'form') {
        // Convert form to markdown before switching
        const markdown = convertFormToMarkdown(formData, type)
        setMarkdownContent(markdown)
      } else if (newMode === 'form' && editMode === 'markdown') {
        // Parse markdown to form before switching with error handling
        try {
          const parsed = parseMarkdownToForm(markdownContent, type)
          setFormData(parsed)
        } catch (parseError) {
          console.error('Failed to parse markdown to form data:', parseError)
          toast.error('Failed to parse markdown content. Please check the format and try again.')
          return // Don't switch modes if parsing fails
        }
      }
      setEditMode(newMode)
    } catch (error) {
      console.error('Error switching editor modes:', error)
      toast.error(`Failed to switch to ${newMode} mode: ${error.message}`)
    }
  }

  const handleBack = () => {
    if (isNew) {
      navigate('/')
    } else {
      navigate(`/view/${type}/${path}`)
    }
  }

  if (loading) {
    return (
      <div className="editor-loading">
        <div className="spinner"></div>
        <p>Loading editor...</p>
      </div>
    )
  }

  return (
    <div className="document-editor">
      <div className="editor-header">
        <div className="editor-title">
          <h3>{isNew ? `Create ${type}` : `Edit ${type}`}</h3>
        </div>
        
        <div className="editor-actions">
          <div className="mode-switcher">
            <button 
              className={`btn btn-sm ${editMode === 'form' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => handleModeSwitch('form')}
            >
              <Eye size={14} />
              Form
            </button>
            <button 
              className={`btn btn-sm ${editMode === 'markdown' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => handleModeSwitch('markdown')}
            >
              <Code size={14} />
              Markdown
            </button>
          </div>
          
          <button onClick={handleBack} className="btn btn-secondary btn-sm">
            <ArrowLeft size={16} />
            Back
          </button>
          
          <button 
            onClick={handleSave} 
            disabled={saving}
            className="btn btn-success btn-sm"
          >
            {saving ? (
              <>
                <div className="spinner"></div>
                Saving...
              </>
            ) : (
              <>
                <Save size={16} />
                Save
              </>
            )}
          </button>
        </div>
      </div>

      <div className="editor-content">
        {editMode === 'form' ? (
          <div className="form-editor">
            {type === 'capability' && (
              <CapabilityForm
                data={formData}
                onChange={handleFormDataChange}
                isNew={isNew}
                currentPath={path ? path.substring(0, path.lastIndexOf('/')) : null}
              />
            )}
            {type === 'enabler' && (
              <EnablerForm
                data={formData}
                onChange={handleFormDataChange}
                onValidationChange={handleValidationChange}
              />
            )}
            {type === 'template' && (
              <div className="template-editor">
                <div className="form-group">
                  <label className="form-label">Template Name</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.name || ''}
                    onChange={(e) => handleFormDataChange({ name: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Template Content</label>
                  <textarea
                    className="form-textarea"
                    style={{ minHeight: '400px' }}
                    value={markdownContent}
                    onChange={(e) => setMarkdownContent(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="markdown-editor">
            <textarea
              className="markdown-textarea"
              value={markdownContent}
              onChange={(e) => setMarkdownContent(e.target.value)}
              placeholder="Enter markdown content..."
            />
          </div>
        )}
      </div>
    </div>
  )
}