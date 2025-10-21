import React, { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { apiService } from '../services/apiService'
import { useApp } from '../contexts/AppContext'
import { websocketService } from '../services/websocketService'
import { Edit, Trash2, ArrowLeft, Copy } from 'lucide-react'
import toast from 'react-hot-toast'
import { renderMermaidDiagrams } from '../utils/mermaidUtils'

interface DocumentData {
  title?: string
  html?: string
  content?: string
  filePath?: string
  allFilePaths?: string[]
}

interface WebSocketFileChangeData {
  type: string
  filePath: string
}

export default function DocumentView(): React.ReactElement {
  console.log('[DocumentView] Component is starting to execute...')

  const params = useParams<{ type: string; '*': string }>()
  console.log('[DocumentView] Got params:', params)

  const type = params.type
  const path = params['*']
  console.log('[DocumentView] Extracted type:', type, 'path:', path)

  const navigate = useNavigate()
  console.log('[DocumentView] Got navigate function')

  const { addToHistory, navigationHistory, refreshData, setSelectedDocument } = useApp()
  console.log('[DocumentView] Got app context')

  const [document, setDocument] = useState<DocumentData | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [enhancedHtml, setEnhancedHtml] = useState<string>('')
  const [previousContent, setPreviousContent] = useState<string>('')
  const [previousPath, setPreviousPath] = useState<string>('')
  const [changedElements, setChangedElements] = useState<Set<string>>(new Set())

  console.log('[DocumentView] Component mounted/updated with params:', { type, path })

  // Function to create a floating overlay notification for changes
  const createChangeOverlay = useCallback((fieldName: string, oldValue: string, newValue: string) => {
    console.log(`[DocumentView] Creating overlay for ${fieldName}: "${oldValue}" → "${newValue}"`)

    // Create overlay element
    const overlay = window.document.createElement('div')
    overlay.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: linear-gradient(45deg, #ff6b6b, #ff8e53);
      color: white;
      padding: 25px;
      border-radius: 15px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.4);
      z-index: 10000;
      font-family: Arial, sans-serif;
      font-size: 18px;
      font-weight: bold;
      max-width: 450px;
      border: 4px solid #fff;
      animation: bounceIn 0.6s ease-out;
    `

    overlay.innerHTML = `
      <div style="display: flex; align-items: center; gap: 15px;">
        <div style="font-size: 32px;">🚨</div>
        <div>
          <div style="font-size: 20px; margin-bottom: 8px; text-shadow: 1px 1px 2px rgba(0,0,0,0.3);">FIELD CHANGED!</div>
          <div style="font-size: 16px; opacity: 0.95; line-height: 1.4;">
            <strong>${fieldName}:</strong><br/>
            <span style="text-decoration: line-through; opacity: 0.7;">"${oldValue}"</span><br/>
            <span style="color: #ffff99;">→ "${newValue}"</span>
          </div>
        </div>
      </div>
    `

    // Add animations
    const style = window.document.createElement('style')
    style.textContent = `
      @keyframes bounceIn {
        0% {
          transform: scale(0.3) translateX(100%);
          opacity: 0;
        }
        50% {
          transform: scale(1.05) translateX(0);
          opacity: 1;
        }
        70% {
          transform: scale(0.9) translateX(0);
        }
        100% {
          transform: scale(1) translateX(0);
          opacity: 1;
        }
      }
      @keyframes slideOut {
        from {
          transform: translateX(0);
          opacity: 1;
        }
        to {
          transform: translateX(100%);
          opacity: 0;
        }
      }
    `
    window.document.head.appendChild(style)

    // Add to page
    window.document.body.appendChild(overlay)

    // Remove after 8 seconds with slide-out animation
    setTimeout(() => {
      overlay.style.animation = 'slideOut 0.5s ease-in'
      setTimeout(() => {
        if (overlay.parentNode) {
          overlay.parentNode.removeChild(overlay)
        }
        if (style.parentNode) {
          style.parentNode.removeChild(style)
        }
      }, 500)
    }, 8000)
  }, [])

  // Function to identify changes between old and new content
  const identifyChanges = useCallback((oldHtml: string, newHtml: string): string => {
    console.log('[DocumentView] identifyChanges called')
    console.log('[DocumentView] oldHtml length:', oldHtml?.length || 0)
    console.log('[DocumentView] newHtml length:', newHtml?.length || 0)

    if (!oldHtml || !newHtml) {
      console.log('[DocumentView] Missing old or new HTML, returning newHtml')
      return newHtml
    }

    if (oldHtml === newHtml) {
      console.log('[DocumentView] Content unchanged, returning newHtml')
      return newHtml
    }

    try {
      // Create temporary DOM elements to compare
      const tempOld = window.document.createElement('div')
      const tempNew = window.document.createElement('div')
      tempOld.innerHTML = oldHtml
      tempNew.innerHTML = newHtml

      // Look for metadata changes (Status, Priority, Approval, etc.)
      const metadataFields = ['Status', 'Priority', 'Approval', 'Owner', 'Type']
      let foundChanges = false

      metadataFields.forEach(field => {
        const oldField = tempOld.textContent?.match(new RegExp(`${field}[^:]*:\\s*([^\\n-]+)`, 'i'))
        const newField = tempNew.textContent?.match(new RegExp(`${field}[^:]*:\\s*([^\\n-]+)`, 'i'))

        console.log(`[DocumentView] ${field} - Old: "${oldField?.[1]?.trim()}" New: "${newField?.[1]?.trim()}"`)

        if (oldField && newField) {
          console.log(`[DocumentView] ${field} comparison: "${oldField[1].trim()}" === "${newField[1].trim()}" = ${oldField[1].trim() === newField[1].trim()}`)
        }

        if (oldField && newField && oldField[1].trim() !== newField[1].trim()) {
          console.log(`🚨 [DocumentView] ${field} changed from "${oldField[1].trim()}" to "${newField[1].trim()}"`)
          foundChanges = true

          // Create floating overlay notification
          createChangeOverlay(field, oldField[1].trim(), newField[1].trim())

          // Add a subtle inline highlight for reference that stays longer
          const fieldRegex = new RegExp(`(${field}[^:]*:\\s*)([^\\n-]+)`, 'gi')
          const uniqueId = `subtle-highlight-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
          tempNew.innerHTML = tempNew.innerHTML.replace(fieldRegex, (match: string, prefix: string, value: string) => {
            console.log(`[DocumentView] Adding subtle highlight with ID: ${uniqueId}`)
            return `${prefix}<span id="${uniqueId}" style="background: linear-gradient(120deg, #fff3cd 0%, #ffd54f 100%); border-left: 5px solid #ff9800; padding: 5px 10px; font-weight: bold; border-radius: 4px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">${value}</span>`
          })

          // Remove subtle highlight after 15 seconds
          setTimeout(() => {
            try {
              const element = window.document.getElementById(uniqueId)
              if (element) {
                console.log(`[DocumentView] Removing subtle highlight for: ${uniqueId}`)
                element.style.background = 'transparent'
                element.style.borderLeft = 'none'
                element.style.padding = '0'
                element.style.fontWeight = 'normal'
                element.style.borderRadius = '0'
                element.style.boxShadow = 'none'
              }
            } catch (error) {
              console.error(`[DocumentView] Error removing subtle highlight for ${uniqueId}:`, error)
            }
          }, 15000)
        }
      })

      if (foundChanges) {
        console.log('✅ [DocumentView] Changes detected - overlay notification created')
      } else {
        console.log('[DocumentView] No metadata field changes detected')
      }

      return tempNew.innerHTML
    } catch (error) {
      console.error('[DocumentView] Error identifying changes:', error)
      return newHtml
    }
  }, [createChangeOverlay])

  // Function to calculate relative path by finding common prefix
  const calculateRelativePath = useCallback((currentPath: string, allPaths?: string[]): string => {
    if (!currentPath || !allPaths || allPaths.length === 0) return currentPath

    // Filter out null/undefined paths
    const validPaths = allPaths.filter((p): p is string => p != null && typeof p === 'string')
    if (validPaths.length === 0) return currentPath

    // Find the longest common prefix among all paths
    const findCommonPrefix = (paths: string[]): string => {
      if (paths.length === 0) return ''
      if (paths.length === 1) return paths[0]

      // Normalize paths and split by separator
      const normalizedPaths = paths.map(p => p.replace(/\\/g, '/').split('/'))
      const minLength = Math.min(...normalizedPaths.map(p => p.length))

      const commonPrefix: string[] = []
      for (let i = 0; i < minLength; i++) {
        const segment = normalizedPaths[0][i]
        if (normalizedPaths.every(path => path[i] === segment)) {
          commonPrefix.push(segment)
        } else {
          break
        }
      }

      return commonPrefix.join('/')
    }

    const commonPrefix = findCommonPrefix(validPaths)

    if (!commonPrefix) return currentPath

    // Remove common prefix and show relative path with ../ prefix
    const normalizedCurrent = currentPath.replace(/\\/g, '/')
    const normalizedPrefix = commonPrefix + '/'

    if (normalizedCurrent.startsWith(normalizedPrefix)) {
      const relativePath = normalizedCurrent.substring(normalizedPrefix.length)
      return '../' + relativePath
    }

    return currentPath
  }, [])

  // Function to enhance HTML with file path information
  const enhanceHtmlWithFilePath = useCallback((html: string, filePath?: string, allFilePaths?: string[]): string => {
    if (!html || !filePath) return html

    const displayPath = calculateRelativePath(filePath, allFilePaths)

    // Create a DOM parser to modify HTML
    const parser = new DOMParser()
    const doc = parser.parseFromString(html, 'text/html')

    // Find the metadata section (look for h2 containing "Metadata")
    const headings = doc.querySelectorAll('h2')
    let metadataSection: Element | null = null

    for (const heading of Array.from(headings)) {
      if (heading.textContent?.toLowerCase().includes('metadata')) {
        metadataSection = heading
        break
      }
    }

    if (metadataSection) {
      // Find the list that follows the metadata heading
      let currentElement = metadataSection.nextElementSibling
      while (currentElement && currentElement.tagName !== 'UL') {
        currentElement = currentElement.nextElementSibling
      }

      if (currentElement && currentElement.tagName === 'UL') {
        // Create the file path element
        const filePathElement = doc.createElement('li')
        filePathElement.innerHTML = `<strong>Specification Path:</strong> ${displayPath}`

        // Add it to the end of the metadata list
        currentElement.appendChild(filePathElement)
      }
    }

    return doc.body.innerHTML
  }, [calculateRelativePath])

  const loadDocument = useCallback(async () => {
    console.log('[DocumentView] loadDocument called with path:', path, 'type:', type)
    try {
      setLoading(true)
      setError(null)
      console.log('[DocumentView] Making API call to:', path)
      const data = await apiService.getFile(path!)
      console.log('[DocumentView] API response received:', data ? 'Success' : 'No data')

      // Enhance HTML with file path information
      const enhanced = enhanceHtmlWithFilePath(data?.html, data?.filePath, data?.allFilePaths)

      // Identify and highlight changes if this is an update to the same document
      let finalHtml = enhanced
      const currentPath = path!
      if (previousContent && previousContent.length > 0 && previousPath === currentPath) {
        console.log('[DocumentView] Same document - comparing with previous content for changes')
        finalHtml = identifyChanges(previousContent, enhanced)
      } else {
        console.log('[DocumentView] Different document or first load - not comparing for changes')
      }

      // Store the enhanced HTML and path for next comparison
      setPreviousContent(enhanced)
      setPreviousPath(currentPath)

      setEnhancedHtml(finalHtml)
      setDocument(data)

      // Set the selected document for highlighting in sidebar
      setSelectedDocument({
        type: type!,
        path: path!,
        id: data?.title || path! // Use title or path as identifier
      })
      console.log('[DocumentView] Document loaded successfully')
    } catch (err) {
      console.error('[DocumentView] Error loading document:', err)
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
      toast.error(`Failed to load document: ${errorMessage}`)
    } finally {
      setLoading(false)
      console.log('[DocumentView] Loading finished, setting loading to false')
    }
  }, [path, type, setSelectedDocument, previousContent, identifyChanges, enhanceHtmlWithFilePath])

  useEffect(() => {
    loadDocument()
  }, [loadDocument])

  useEffect(() => {
    if (enhancedHtml) {
      // Small delay to ensure DOM is updated with new content
      setTimeout(() => {
        renderMermaidDiagrams()
      }, 100)
    }
  }, [enhancedHtml])

  // WebSocket listener for file changes affecting the current document
  useEffect(() => {
    const removeListener = websocketService.addListener((data: WebSocketFileChangeData) => {
      if (data.type === 'file-change' && path) {
        // Check if the changed file is the current document
        const changedFilePath = data.filePath.replace(/\\/g, '/').toLowerCase()
        const currentPath = path.replace(/\\/g, '/').toLowerCase()

        // Match based on filename or path
        if (changedFilePath.includes(currentPath) || currentPath.includes(changedFilePath)) {
          console.log('Current document changed, reloading:', data.filePath)

          // Add a small delay to ensure file writes are complete
          setTimeout(() => {
            loadDocument()
          }, 500)
        }
      }
    })

    return removeListener
  }, [path, loadDocument])

  const handleEdit = (): void => {
    navigate(`/edit/${type}/${path}`)
  }

  const handleDelete = async (): Promise<void> => {
    if (!window.confirm('Are you sure you want to delete this document? A backup will be created.')) {
      return
    }

    try {
      await apiService.deleteFile(path!)
      // Success - no toast message needed
      refreshData()
      navigate('/')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      toast.error(`Failed to delete document: ${errorMessage}`)
    }
  }

  const handleCopy = async (): Promise<void> => {
    if (!document || !path || !type) {
      toast.error('No document to copy')
      return
    }

    try {
      const response = await fetch(`/api/copy/${type}/${path}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to copy document')
      }

      const result = await response.json()
      toast.success(`Document copied successfully: ${result.newPath}`)
      refreshData()
      navigate(`/view/${type}/${result.newPath}`)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      toast.error(`Failed to copy document: ${errorMessage}`)
    }
  }

  const handleBack = (): void => {
    if (navigationHistory.length > 0) {
      navigate(-1)
    } else {
      navigate('/')
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-muted-foreground">Loading document...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-muted/20 p-6">
        <p className="text-destructive mb-4">Error loading document: {error}</p>
        <button onClick={() => navigate('/')} className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors">
          Back to Dashboard
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="bg-card rounded-lg shadow-sm border border-border mb-6 p-4 flex items-center justify-between">
        <div className="flex-1">
          {document?.title && type !== 'template' && (
            <h1 className="text-2xl font-bold text-foreground">
              {document.title} | {type === 'capability' ? 'Capability' : type === 'enabler' ? 'Enabler' : ''}
            </h1>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleBack} className="flex items-center gap-2 px-3 py-2 text-sm bg-muted text-muted-foreground rounded-md hover:bg-accent hover:text-accent-foreground transition-colors">
            <ArrowLeft size={16} />
            Back
          </button>
          {type === 'template' ? (
            <button onClick={handleEdit} className="flex items-center gap-2 px-3 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors">
              <Edit size={16} />
              Edit
            </button>
          ) : (
            <>
              <button onClick={handleEdit} className="flex items-center gap-2 px-3 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors">
                <Edit size={16} />
                Edit
              </button>
              <button onClick={handleDelete} className="flex items-center gap-2 px-3 py-2 text-sm bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90 transition-colors">
                <Trash2 size={16} />
                Delete
              </button>
              {/* <button onClick={handleCopy} className="flex items-center gap-2 px-3 py-2 text-sm bg-chart-2 text-white border border-chart-2 rounded-md hover:bg-chart-2/90 transition-colors">
                <Copy size={16} />
                Copy
              </button> */}
            </>
          )}
        </div>
      </div>

      <div
        className="bg-card rounded-lg shadow-sm border border-border p-6 markdown-content"
        dangerouslySetInnerHTML={{ __html: enhancedHtml || document?.html || '' }}
      />
    </div>
  )
}
