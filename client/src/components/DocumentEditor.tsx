import React, { useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation, NavigateFunction, Location } from 'react-router-dom'
import { apiService } from '../services/apiService'
import { useApp } from '../contexts/AppContext'
import { Save, ArrowLeft, Eye, Code } from 'lucide-react'
import toast from 'react-hot-toast'
import { parseMarkdownToForm, convertFormToMarkdown, CapabilityFormData, EnablerFormData } from '../utils/markdownUtils'
import { generateCapabilityId, generateEnablerId } from '../utils/idGenerator'
import { nameToFilename, namesGenerateDifferentFilenames, idToFilename } from '../utils/fileUtils'
import CapabilityForm from './forms/CapabilityForm'
import EnablerForm from './forms/EnablerForm'

interface DocumentParams {
  type: string
  '*': string | undefined
  capabilityId?: string
}

interface FileData {
  content: string
  path?: string
}

interface TemplateData {
  content: string
}

interface ValidationState {
  isValid: boolean
  errors: Record<string, string>
}

interface EnablerLocationState {
  enablerData?: Partial<EnablerFormData>
}

type FormData = CapabilityFormData | EnablerFormData | Record<string, any>

export default function DocumentEditor(): JSX.Element {
  const params = useParams() as DocumentParams
  const { type, '*': path, capabilityId } = params
  const navigate: NavigateFunction = useNavigate()
  const location: Location = useLocation()
  const { refreshData, config, capabilities, enablers, setSelectedDocument } = useApp()
  
  const [document, setDocument] = useState<FileData | null>(null)
  const [formData, setFormData] = useState<FormData>({})
  const [markdownContent, setMarkdownContent] = useState<string>('')
  const [editMode, setEditMode] = useState<'form' | 'markdown'>('form')
  const [loading, setLoading] = useState<boolean>(true)
  const [saving, setSaving] = useState<boolean>(false)
  const [isNew, setIsNew] = useState<boolean>(!path)
  const [originalCapabilityId, setOriginalCapabilityId] = useState<string | null>(null)
  const [originalName, setOriginalName] = useState<string>('')
  const [validationState, setValidationState] = useState<ValidationState>({ isValid: true, errors: {} })

  useEffect(() => {
    if (path) {
      loadDocument()
    } else {
      initializeNewDocument()
    }
  }, [path, type])

  const loadDocument = async (): Promise<void> => {
    try {
      setLoading(true)
      const data: FileData = await apiService.getFile(path!)
      setDocument(data)
      setMarkdownContent(data.content)
      
      const parsed = parseMarkdownToForm(data.content, type)
      setFormData(parsed)
      
      if (parsed.name) {
        setOriginalName(parsed.name)
      }
      if (type === 'enabler' && (parsed as EnablerFormData).capabilityId) {
        setOriginalCapabilityId((parsed as EnablerFormData).capabilityId || null)
      }
    } catch (err) {
      toast.error(`Failed to load document: ${(err as Error).message}`)
      navigate('/')
    } finally {
      setLoading(false)
    }
  }

  const initializeNewDocument = async (): Promise<void> => {
    try {
      setLoading(true)
      
      try {
        let template: TemplateData
        
        if (type === 'enabler') {
          const response = await fetch(`/api/enabler-template/${capabilityId || ''}`)
          template = await response.json()
        } else if (type === 'capability') {
          const response = await fetch('/api/capability-template')
          template = await response.json()
        } else {
          const templatePath = `templates/${type}-template.md`
          template = await apiService.getFile(templatePath)
        }
        
        setMarkdownContent(template.content)
        const parsed = parseMarkdownToForm(template.content, type)
        
        parsed.owner = config?.owner || 'Product Team'
        if (type === 'enabler') {
          const enablerParsed = parsed as EnablerFormData
          enablerParsed.analysisReview = config?.analysisReview || 'Required'
          enablerParsed.codeReview = config?.codeReview || 'Not Required'
          if (!enablerParsed.approval) {
            enablerParsed.approval = 'Not Approved'
          }
        }
        if (type === 'capability') {
          const capParsed = parsed as CapabilityFormData
          if (!capParsed.id) {
            capParsed.id = generateId('CAP')
          }
          capParsed.lastSelectedCapabilityPath = config?.lastSelectedCapabilityPath as string
        } else if (type === 'enabler') {
          const enablerParsed = parsed as EnablerFormData
          if (!enablerParsed.id) {
            enablerParsed.id = generateId('ENB')
          }
          if (capabilityId) {
            enablerParsed.capabilityId = capabilityId
          }

          const locationState = location.state as EnablerLocationState
          if (locationState?.enablerData) {
            const enablerData = locationState.enablerData
            Object.assign(enablerParsed, {
              id: enablerData.id || enablerParsed.id,
              name: enablerData.name || '',
              description: enablerData.description || '',
              status: enablerData.status || enablerParsed.status,
              approval: enablerData.approval || enablerParsed.approval,
              priority: enablerData.priority || enablerParsed.priority,
              owner: enablerData.owner || enablerParsed.owner,
              developer: enablerData.developer || enablerParsed.developer,
              capabilityId: capabilityId || enablerData.capabilityId || enablerParsed.capabilityId
            })
          }
        }

        setFormData(parsed)
      } catch (templateErr) {
        const defaultData = getDefaultFormData(type, capabilityId)
        setFormData(defaultData)
        setMarkdownContent(convertFormToMarkdown(defaultData, type))
      }
    } catch (err) {
      toast.error(`Failed to initialize document: ${(err as Error).message}`)
    } finally {
      setLoading(false)
    }
  }

  const getDefaultFormData = (type: string, presetCapabilityId?: string): FormData => {
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
      } as CapabilityFormData
    } else if (type === 'enabler') {
      return {
        ...base,
        id: generateId('ENB'),
        capabilityId: presetCapabilityId || '',
        functionalRequirements: [],
        nonFunctionalRequirements: []
      } as EnablerFormData
    }

    return base
  }

  const generateId = (prefix: string): string => {
    if (prefix === 'CAP') {
      const existingCapabilityIds = (capabilities || []).map(cap => cap.id).filter(Boolean) as string[]
      return generateCapabilityId(existingCapabilityIds)
    } else if (prefix === 'ENB') {
      const existingEnablerIds = (enablers || []).map(enb => enb.id).filter(Boolean) as string[]
      return generateEnablerId(existingEnablerIds)
    }
    
    const timestamp = Date.now().toString().slice(-2)
    const random = Math.floor(Math.random() * 100).toString().padStart(2, '0')
    return `${prefix}-${timestamp}${random}`
  }

  const handleSave = async (): Promise<void> => {
    try {
      setSaving(true)

      if (type === 'enabler' && editMode === 'form' && !validationState.isValid) {
        toast.error('Please select a Capability ID before saving')
        setSaving(false)
        return
      }

      const capFormData = formData as CapabilityFormData
      if (type === 'capability' && isNew && editMode === 'form' && !capFormData.selectedPath) {
        toast.error('Please select a save path before saving the capability')
        setSaving(false)
        return
      }

      let isMovingCapability = false
      let originalPath: string | null = null
      if (type === 'capability' && !isNew && editMode === 'form' && capFormData.selectedPath && path) {
        const currentDir = path.includes('/') || path.includes('\\')
          ? path.substring(0, path.lastIndexOf('/') || path.lastIndexOf('\\'))
          : ''

        if (currentDir !== capFormData.selectedPath) {
          isMovingCapability = true
          originalPath = path
          console.log(`[CAPABILITY-MOVE] Moving capability from ${currentDir} to ${capFormData.selectedPath}`)
        }
      }

      let contentToSave: string
      if (editMode === 'form') {
        contentToSave = convertFormToMarkdown(formData, type)
      } else {
        contentToSave = markdownContent
      }

      let savePath: string | undefined = path
      let needsRename = false
      let newPath: string | null = null

      if (isNew) {
        const filename = formData.id ? idToFilename(formData.id, type) : nameToFilename(formData.name || 'untitled', type)

        if (type === 'template') {
          savePath = `templates/${filename}`
        } else if (type === 'capability' && capFormData.selectedPath) {
          savePath = `${capFormData.selectedPath}/${filename}`
        } else {
          savePath = filename
        }
      } else if (isMovingCapability) {
        const filename = path!.split('/').pop()!.split('\\').pop()!
        savePath = `${capFormData.selectedPath}/${filename}`
        needsRename = true
        newPath = savePath
      } else if (!isNew && originalName && formData.name && formData.name !== originalName) {
        if (namesGenerateDifferentFilenames(originalName, formData.name, type)) {
          needsRename = true
          newPath = nameToFilename(formData.name, type)
          if (type === 'template') {
            newPath = `templates/${newPath}`
          }
        }
      }

      if (type === 'capability' && editMode === 'form') {
        await apiService.saveCapabilityWithEnablers(
          savePath!, 
          contentToSave, 
          capFormData.id || '',
          capFormData.internalUpstream || [],
          capFormData.internalDownstream || [],
          capFormData.enablers || []
        )
      } else if (type === 'enabler' && editMode === 'form') {
        await apiService.saveEnablerWithReparenting(
          savePath!,
          contentToSave,
          formData as EnablerFormData,
          originalCapabilityId
        )
      } else {
        await apiService.saveFile(savePath!, contentToSave)
      }
      
      if (needsRename && newPath) {
        if (isMovingCapability) {
          console.log(`[CAPABILITY-MOVE] Moving capability from ${path} to ${newPath}`)
          await apiService.renameFile(path!, newPath)

          if (capFormData.enablers && capFormData.enablers.length > 0) {
            console.log(`[CAPABILITY-MOVE] Moving ${capFormData.enablers.length} enablers`)
            for (const enabler of capFormData.enablers) {
              if (enabler.id) {
                try {
                  const enablerFilename = idToFilename(enabler.id, 'enabler')
                  const enablerPath = idToFilename(enabler.id, 'enabler')
                  const newEnablerPath = `${capFormData.selectedPath}/${enablerFilename}`

                  console.log(`[ENABLER-MOVE] Moving enabler ${enabler.id} to ${newEnablerPath}`)
                  await apiService.renameFile(enablerPath, newEnablerPath)
                } catch (enablerError) {
                  console.warn(`[ENABLER-MOVE] Failed to move enabler ${enabler.id}:`, (enablerError as Error).message)
                }
              }
            }
          }
        } else {
          console.log(`[RENAME] Renaming file from ${savePath} to ${newPath}`)
          await apiService.renameFile(savePath!, newPath)
          setOriginalName(formData.name || '')
        }
        savePath = newPath
      }
      
      if (type === 'capability' && isNew && capFormData.selectedPath) {
        try {
          await apiService.updateConfig({
            lastSelectedCapabilityPath: capFormData.selectedPath
          })
          console.log(`[PATH-PREFERENCE] Saved path preference: ${capFormData.selectedPath}`)
        } catch (error) {
          console.error('Error saving path preference:', error)
        }
      }

      refreshData()
      
      const filename = savePath!.split('/').pop()!.split('\\').pop()!

      setSelectedDocument({
        type: type as 'capability' | 'enabler',
        path: filename,
        id: formData.name || formData.id || filename
      })

      navigate(`/view/${type}/${filename}`)
      
    } catch (err) {
      toast.error(`Failed to save document: ${(err as Error).message}`)
    } finally {
      setSaving(false)
    }
  }

  const handleFormDataChange = (newData: Partial<FormData>): void => {
    setFormData({ ...formData, ...newData })
  }

  const handleValidationChange = (isValid: boolean, errors: Record<string, string>): void => {
    setValidationState({ isValid, errors })
  }

  const handleModeSwitch = (newMode: 'form' | 'markdown'): void => {
    try {
      if (newMode === 'markdown' && editMode === 'form') {
        const markdown = convertFormToMarkdown(formData, type)
        setMarkdownContent(markdown)
      } else if (newMode === 'form' && editMode === 'markdown') {
        try {
          const parsed = parseMarkdownToForm(markdownContent, type)
          setFormData(parsed)
        } catch (parseError) {
          console.error('Failed to parse markdown to form data:', parseError)
          toast.error('Failed to parse markdown content. Please check the format and try again.')
          return
        }
      }
      setEditMode(newMode)
    } catch (error) {
      console.error('Error switching editor modes:', error)
      toast.error(`Failed to switch to ${newMode} mode: ${(error as Error).message}`)
    }
  }

  const handleBack = (): void => {
    if (isNew) {
      navigate('/')
    } else {
      navigate(`/view/${type}/${path}`)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-muted-foreground">Loading editor...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-card border-b border-border shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-semibold text-foreground">{isNew ? `Create ${type}` : `Edit ${type}`}</h3>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex rounded-md border border-border overflow-hidden">
              <button
                className={`flex items-center gap-1 px-3 py-2 text-sm ${editMode === 'form' ? 'bg-primary text-primary-foreground' : 'bg-card text-foreground hover:bg-accent hover:text-accent-foreground'} transition-colors`}
                onClick={() => handleModeSwitch('form')}
              >
                <Eye size={14} />
                Form
              </button>
              <button
                className={`flex items-center gap-1 px-3 py-2 text-sm border-l border-border ${editMode === 'markdown' ? 'bg-primary text-primary-foreground' : 'bg-card text-foreground hover:bg-accent hover:text-accent-foreground'} transition-colors`}
                onClick={() => handleModeSwitch('markdown')}
              >
                <Code size={14} />
                Markdown
              </button>
            </div>

            <button onClick={handleBack} className="flex items-center gap-2 px-3 py-2 text-sm bg-muted text-muted-foreground rounded-md hover:bg-accent hover:text-accent-foreground transition-colors">
              <ArrowLeft size={16} />
              Back
            </button>

            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-chart-2 text-white rounded-md hover:bg-chart-2/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
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
      </div>

      <div className="max-w-7xl mx-auto p-6">
        {editMode === 'form' ? (
          <div className="bg-card rounded-lg shadow-sm border border-border p-6">
            {type === 'capability' && (
              <CapabilityForm
                data={formData as CapabilityFormData}
                onChange={handleFormDataChange}
                isNew={isNew}
                currentPath={path ? path.substring(0, path.lastIndexOf('/')) : null}
              />
            )}
            {type === 'enabler' && (
              <EnablerForm
                data={formData as EnablerFormData}
                onChange={handleFormDataChange}
                onValidationChange={handleValidationChange}
              />
            )}
            {type === 'template' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Template Name</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
                    value={formData.name || ''}
                    onChange={(e) => handleFormDataChange({ name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Template Content</label>
                  <textarea
                    className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent font-mono text-sm"
                    style={{ minHeight: '400px' }}
                    value={markdownContent}
                    onChange={(e) => setMarkdownContent(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-card rounded-lg shadow-sm border border-border p-6">
            <textarea
              className="w-full h-[600px] px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent font-mono text-sm resize-none"
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
