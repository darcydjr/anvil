import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { apiService } from '../services/apiService'
import { useApp } from '../contexts/AppContext'
import { websocketService } from '../services/websocketService'
import { Edit, Trash2, ArrowLeft, Copy, Folder } from 'lucide-react'
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

  // Handle both normal routes (/view/:type/*) and direct file access (/*.md)
  const type = params.type
  let path = params['*']

  // If no type and no path, check if this is a direct file access
  if (!type && !path) {
    // Get the current pathname and use it as the path
    const currentPath = window.location.pathname
    if (currentPath.endsWith('.md')) {
      path = currentPath.substring(1) // Remove leading slash
    }
  }

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
  const [isExternalReload, setIsExternalReload] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)

  console.log('[DocumentView] Component mounted/updated with params:', { type, path })

  // Function to get status icon based on status value
  const getStatusIcon = (status: string): string => {
    const statusLower = status.toLowerCase()

    // Implementation/Development status icons
    if (statusLower.includes('implementation') || statusLower.includes('implementing')) return '<img src="/anvil.png" style="width: 24px; height: 24px; vertical-align: middle;" alt="Implementation" />'
    if (statusLower.includes('implemented') || statusLower.includes('complete')) return '✅'
    if (statusLower.includes('in progress') || statusLower.includes('active')) return '⚡'

    // Review status icons
    if (statusLower.includes('review')) return '👀'
    if (statusLower.includes('analysis')) return '🔬'
    if (statusLower.includes('design')) return '📐'

    // Planning status icons
    if (statusLower.includes('draft') || statusLower.includes('planning')) return '📝'
    if (statusLower.includes('ready')) return '🟢'
    if (statusLower.includes('pending') || statusLower.includes('waiting')) return '⏳'

    // Problem status icons
    if (statusLower.includes('blocked') || statusLower.includes('issue')) return '🚫'
    if (statusLower.includes('cancelled') || statusLower.includes('rejected')) return '❌'

    // Default icon
    return '📋'
  }

  // Function to create a floating overlay notification for external changes
  const createExternalChangeOverlay = useCallback((fieldName: string, oldValue: string, newValue: string, documentId: string, documentName: string) => {
    console.log(`[DocumentView] Creating external change overlay for ${fieldName}: "${oldValue}" → "${newValue}"`)

    // Create overlay element
    const overlay = window.document.createElement('div')
    overlay.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #363636;
      color: #fff;
      border: 1px solid #555;
      padding: 25px;
      border-radius: 15px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.4);
      z-index: 10000;
      font-family: Arial, sans-serif;
      font-size: 18px;
      font-weight: bold;
      max-width: 450px;
      animation: bounceIn 0.6s ease-out;
    `

    overlay.innerHTML = `
      <div style="display: flex; align-items: center; gap: 15px;">
        <div>
          <div style="font-size: 14px; font-weight: 600; margin-bottom: 8px; color: #fff;">
            🔄 External Change | ${documentId} | ${documentName}
          </div>
          <div style="font-size: 13px; color: #ccc; display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 16px;">${getStatusIcon(newValue)}</span>
            <span style="color: #4ade80; font-weight: 600;">${fieldName}: ${oldValue} → ${newValue}</span>
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


  const handleOpenExplorer = useCallback(async () => {
    if (!path) return

    try {
      const result = await apiService.openExplorer(path)
      if (result.success) {
        toast.success('File explorer opened successfully')
      } else {
        toast.error(result.error || 'Failed to open file explorer')
      }
    } catch (error) {
      console.error('Error opening file explorer:', error)
      toast.error('Failed to open file explorer')
    }
  }, [path])

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

  // Function to clean up enabler dependency tables in HTML
  const cleanEnablerDependencyTables = useCallback((html: string): string => {
    if (!html || !type || type !== 'enabler') return html

    // Create a DOM parser to modify HTML
    const parser = new DOMParser()
    const doc = parser.parseFromString(html, 'text/html')

    // Find dependency sections for enablers
    const headings = doc.querySelectorAll('h3')
    for (const heading of Array.from(headings)) {
      const headingText = heading.textContent?.toLowerCase() || ''

      if (headingText.includes('internal upstream dependency') || headingText.includes('internal downstream impact')) {
        // Find the table that follows this heading
        let nextElement = heading.nextElementSibling
        while (nextElement && nextElement.tagName !== 'TABLE') {
          nextElement = nextElement.nextElementSibling
        }

        if (nextElement && nextElement.tagName === 'TABLE') {
          const table = nextElement as HTMLTableElement

          // Check if this table needs cleaning by examining the data rows
          const headerRow = table.querySelector('thead tr') || table.querySelector('tr')
          if (headerRow) {
            const headers = Array.from(headerRow.querySelectorAll('th, td'))
            const dataRows = Array.from(table.querySelectorAll('tbody tr, tr')).slice(1) // Skip header row

            // Check if any data row has more than 2 cells or if cells contain status values
            const needsCleaning = dataRows.some(row => {
              const cells = Array.from(row.querySelectorAll('td'))
              if (cells.length > 2) return true // More than 2 columns of data

              // Check if the second cell contains status/metadata values instead of description
              if (cells.length >= 2) {
                const secondCellText = cells[1]?.textContent?.trim() || ''
                const containsStatusValue = ['in draft', 'ready for', 'in progress', 'completed', 'implemented', 'approved', 'not approved', 'high', 'medium', 'low', 'critical'].some(status =>
                  secondCellText.toLowerCase().includes(status)
                )
                return containsStatusValue
              }
              return false
            })

            if (needsCleaning) {
              // This is an old format table, rebuild it to show only Enabler ID and Description
              const rows = Array.from(table.querySelectorAll('tbody tr, tr')).slice(1) // Skip header row

              // Extract header column names for analysis
              const headerColumns = headers.map(h => h.textContent?.toLowerCase().trim() || '')

              // Create new table structure
              const newTable = doc.createElement('table')
              newTable.innerHTML = `
                <thead>
                  <tr>
                    <th>Enabler ID</th>
                    <th>Description</th>
                  </tr>
                </thead>
                <tbody></tbody>
              `

              const tbody = newTable.querySelector('tbody')!

              // Process data rows
              for (const row of rows) {
                const cells = Array.from(row.querySelectorAll('td'))
                if (cells.length > 0) {
                  // Extract enabler ID from first cell or any cell that contains it
                  let enablerId = ''
                  let description = ''

                  // Look for ENB-XXXXXX in all cells
                  for (let i = 0; i < cells.length; i++) {
                    const cellText = cells[i]?.textContent?.trim() || ''
                    const enablerIdMatch = cellText.match(/ENB-\d+/)
                    if (enablerIdMatch) {
                      enablerId = enablerIdMatch[0]
                      break
                    }
                  }

                  // Skip empty rows or rows without valid enabler IDs
                  if (enablerId) {

                    // Try to find description from various strategies
                    if (headerColumns.length >= 2) {
                      const descIndex = headerColumns.findIndex(h => h.includes('description'))

                      if (descIndex >= 0 && descIndex < cells.length) {
                        // Found description column
                        const descCell = cells[descIndex]?.textContent?.trim() || ''
                        const isStatusValue = ['in draft', 'ready for', 'in progress', 'completed', 'implemented', 'approved', 'not approved', 'high', 'medium', 'low', 'critical'].some(status =>
                          descCell.toLowerCase().includes(status)
                        )
                        if (descCell && descCell !== enablerId && !isStatusValue) {
                          description = descCell
                        }
                      } else if (cells.length >= 2) {
                        // No explicit description column, check second cell
                        const secondCellText = cells[1]?.textContent?.trim() || ''
                        const isStatusValue = ['in draft', 'ready for', 'in progress', 'completed', 'implemented', 'approved', 'not approved', 'high', 'medium', 'low', 'critical'].some(status =>
                          secondCellText.toLowerCase().includes(status)
                        )
                        if (secondCellText && secondCellText !== enablerId && !isStatusValue) {
                          description = secondCellText
                        }
                      }
                    }

                    const newRow = doc.createElement('tr')
                    newRow.innerHTML = `
                      <td>${enablerId}</td>
                      <td>${description}</td>
                    `
                    tbody.appendChild(newRow)
                  }
                }
              }

              // Replace the old table with the new one
              table.parentNode?.replaceChild(newTable, table)
            }
          }
        }
      }
    }

    return doc.body.innerHTML
  }, [type])

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

    console.log('[DocumentView] Looking for metadata section, found headings:', headings.length)

    for (const heading of Array.from(headings)) {
      console.log('[DocumentView] Checking heading:', heading.textContent)
      if (heading.textContent?.toLowerCase().includes('metadata')) {
        metadataSection = heading
        console.log('[DocumentView] Found metadata section')
        break
      }
    }

    if (metadataSection) {
      // Find the list that follows the metadata heading
      let currentElement = metadataSection.nextElementSibling
      while (currentElement && currentElement.tagName !== 'UL') {
        currentElement = currentElement.nextElementSibling
      }

      console.log('[DocumentView] Found UL element:', currentElement ? 'Yes' : 'No')

      if (currentElement && currentElement.tagName === 'UL') {
        // Look for existing Specification Path item
        const listItems = currentElement.querySelectorAll('li')
        let specPathItem: Element | null = null

        console.log('[DocumentView] Found list items:', listItems.length)

        for (const item of Array.from(listItems)) {
          console.log('[DocumentView] Checking list item:', item.textContent)
          if (item.textContent?.includes('Specification Path:')) {
            specPathItem = item
            console.log('[DocumentView] Found existing Specification Path item')
            break
          }
        }


        // Create folder icon container
        const iconContainer = doc.createElement('span')
        iconContainer.className = 'folder-icon-container'
        iconContainer.style.cursor = 'pointer'
        iconContainer.style.color = '#6b7280'
        iconContainer.style.transition = 'color 0.2s ease'
        iconContainer.style.marginLeft = '8px'
        iconContainer.title = 'Open file explorer to directory'
        iconContainer.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"/>
          </svg>
        `

        // Add hover effects through CSS
        iconContainer.onmouseenter = () => {
          iconContainer.style.color = '#3b82f6'
        }
        iconContainer.onmouseleave = () => {
          iconContainer.style.color = '#6b7280'
        }

        // Store the click handler data for later use
        iconContainer.setAttribute('data-open-explorer', 'true')

        if (specPathItem) {
          // Add icon to existing item, ensuring inline display
          console.log('[DocumentView] Adding icon to existing Specification Path item')
          specPathItem.style.display = 'flex'
          specPathItem.style.alignItems = 'center'
          specPathItem.style.gap = '8px'
          specPathItem.appendChild(iconContainer)
        } else {
          // Create new item if none exists
          console.log('[DocumentView] Creating new Specification Path item with displayPath:', displayPath)
          const filePathElement = doc.createElement('li')
          filePathElement.style.display = 'flex'
          filePathElement.style.alignItems = 'center'
          filePathElement.style.gap = '8px'
          const textSpan = doc.createElement('span')
          textSpan.innerHTML = `<strong>Specification Path:</strong> ${displayPath}`
          filePathElement.appendChild(textSpan)
          filePathElement.appendChild(iconContainer)
          currentElement.appendChild(filePathElement)
          console.log('[DocumentView] Added new Specification Path item to metadata list')
        }
      }
    } else {
      console.log('[DocumentView] No metadata section found')
    }

    console.log('[DocumentView] enhanceHtmlWithFilePath completed')
    return doc.body.innerHTML
  }, [calculateRelativePath])


  // Attach click handlers to folder and copy icons after HTML is rendered
  useEffect(() => {
    if (contentRef.current) {
      const folderIcon = contentRef.current.querySelector('[data-open-explorer="true"]')
      if (folderIcon) {
        const clickHandler = (e: Event) => {
          e.preventDefault()
          e.stopPropagation()
          handleOpenExplorer()
        }
        folderIcon.addEventListener('click', clickHandler)
      }


      return () => {
        if (folderIcon) {
          folderIcon.removeEventListener('click', () => {})
        }
      }
    }
  }, [enhancedHtml, document?.html, handleOpenExplorer])

  const loadDocument = useCallback(async () => {
    console.log('[DocumentView] loadDocument called with path:', path, 'type:', type)
    try {
      setLoading(true)
      setError(null)
      console.log('[DocumentView] Making API call to:', path)
      const data = await apiService.getFile(path!)
      console.log('[DocumentView] API response received:', data ? 'Success' : 'No data')

      // Clean up enabler dependency tables first, then enhance with file path info
      const cleanedHtml = cleanEnablerDependencyTables(data?.html || '')
      const enhanced = enhanceHtmlWithFilePath(cleanedHtml, data?.filePath, data?.allFilePaths)

      // Use enhanced HTML directly without change detection for internal changes
      let finalHtml = enhanced
      const currentPath = path!
      console.log('[DocumentView] Loading document without internal change detection')

      // Store the enhanced HTML and path for next comparison
      setPreviousContent(enhanced)
      setPreviousPath(currentPath)

      setEnhancedHtml(finalHtml)
      setDocument(data)

      // Reset external reload flag after loading
      if (isExternalReload) {
        setIsExternalReload(false)
      }

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
  }, [path, type, setSelectedDocument, enhanceHtmlWithFilePath, cleanEnablerDependencyTables, isExternalReload])

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

  // Track if the current load is from an external change to prevent duplicate overlays

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

          // Mark this as an external reload to prevent duplicate overlays
          setIsExternalReload(true)

          // Add a small delay to ensure file writes are complete
          setTimeout(() => {
            loadDocument()
          }, 500)
        }
      }
    })

    return removeListener
  }, [path, loadDocument])

  // Listen for external change events from AppContext
  useEffect(() => {
    const handleExternalChange = (event: CustomEvent) => {
      console.log('[DocumentView] Received external-change event:', event.detail)
      const { documentId, documentName, changes, filePath } = event.detail

      console.log('[DocumentView] Current path:', path)
      console.log('[DocumentView] Event filePath:', filePath)
      console.log('[DocumentView] Path match check:', path && filePath && (filePath.includes(path) || path.includes(filePath)))

      // Only show overlay if this document is currently viewed
      if (path && filePath && (filePath.includes(path) || path.includes(filePath))) {
        // Create overlay for the first change (most common case)
        if (changes && changes.length > 0) {
          const change = changes[0]
          createExternalChangeOverlay(change.field, change.oldValue, change.newValue, documentId, documentName)
        }
      }
    }

    window.addEventListener('external-change', handleExternalChange as EventListener)
    return () => {
      window.removeEventListener('external-change', handleExternalChange as EventListener)
    }
  }, [path, createExternalChangeOverlay])

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
    if (!document || !path) {
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
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 bg-card border-b border-border shadow-sm -m-4 mb-4 p-4 max-w-[99.8%] mx-auto">
        <div className="flex items-center justify-between">
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
                <button onClick={handleCopy} className="flex items-center gap-2 px-3 py-2 text-sm bg-chart-2 text-white border border-chart-2 rounded-md hover:bg-chart-2/90 transition-colors">
                  <Copy size={16} />
                  Copy
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <div>
        <div
          ref={contentRef}
          className="bg-card rounded-lg shadow-sm border border-border p-6 markdown-content"
          dangerouslySetInnerHTML={{ __html: enhancedHtml || document?.html || '' }}
        />
      </div>
    </div>
  )
}
