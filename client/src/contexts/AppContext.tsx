import React, { createContext, useContext, useReducer, useEffect, useCallback, useState, useRef, ReactNode, useMemo } from 'react'
import { apiService } from '../services/apiService'
import { websocketService } from '../services/websocketService'

// Simple debounce utility function
function debounce<T extends (...args: any[]) => void>(func: T, wait: number): T {
  let timeoutId: NodeJS.Timeout | null = null
  return ((...args: any[]) => {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }
    timeoutId = setTimeout(() => func(...args), wait)
  }) as T
}

interface Capability {
  id?: string
  title?: string
  name?: string
  path: string
  type: string
  status?: string
  [key: string]: unknown
}

interface Enabler {
  id?: string
  title?: string
  name?: string
  path: string
  type: string
  capabilityId?: string
  status?: string
  [key: string]: unknown
}

interface Requirement {
  id: string
  name: string
  type: 'Functional' | 'Non-Functional'
  enablerID: string
  enablerName: string
  [key: string]: unknown
}

interface SearchResults {
  capabilities: Capability[]
  enablers: Enabler[]
  requirements: Requirement[]
}

interface SelectedDocument {
  type: 'capability' | 'enabler'
  path: string
  id: string
}

interface NavigationHistoryItem {
  selectedCapability: Capability | null
}

interface Workspace {
  id: string
  name: string
  description?: string
  projectPaths: string[] | { path: string; icon: string }[]
  isActive?: boolean
  [key: string]: unknown
}

interface Config {
  owner?: string
  analysisReview?: string
  codeReview?: string
  description?: string
  [key: string]: unknown
}

interface WebSocketData {
  type: string
  filePath?: string
  [key: string]: unknown
}

interface AppState {
  capabilities: Capability[]
  enablers: Enabler[]
  selectedCapability: Capability | null
  selectedDocument: SelectedDocument | null
  loading: boolean
  error: string | null
  config: Config | null
  navigationHistory: NavigationHistoryItem[]
  workspaces: Workspace[]
  activeWorkspaceId: string | null
  searchTerm: string
  searchResults: SearchResults
}

type AppAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string }
  | { type: 'SET_DATA'; payload: { capabilities?: Capability[]; enablers?: Enabler[] } }
  | { type: 'SET_SELECTED_CAPABILITY'; payload: Capability | null }
  | { type: 'SET_SELECTED_DOCUMENT'; payload: SelectedDocument | null }
  | { type: 'SET_CONFIG'; payload: Config }
  | { type: 'ADD_TO_HISTORY'; payload: NavigationHistoryItem }
  | { type: 'GO_BACK' }
  | { type: 'CLEAR_HISTORY' }
  | { type: 'SET_WORKSPACES'; payload: { workspaces: Workspace[]; activeWorkspaceId: string | null } }
  | { type: 'SET_SEARCH_TERM'; payload: string }
  | { type: 'SET_SEARCH_RESULTS'; payload: SearchResults }

interface AppContextValue extends AppState {
  loadData: () => Promise<void>
  loadDataWithDependencies: () => Promise<unknown>
  setSelectedCapability: (capability: Capability | null) => void
  setSelectedDocument: (document: SelectedDocument | null) => void
  addToHistory: (item: NavigationHistoryItem) => void
  goBack: () => void
  clearHistory: () => void
  refreshData: () => void
  loadWorkspaces: () => Promise<void>
  activateWorkspace: (workspaceId: string) => Promise<boolean>
  setSearchTerm: (term: string) => void
  performSearch: (term: string) => void
  suppressExternalChangeNotification: (filePath: string, duration?: number) => void
}

const AppContext = createContext<AppContextValue | undefined>(undefined)

const initialState: AppState = {
  capabilities: [],
  enablers: [],
  selectedCapability: null,
  selectedDocument: null,
  loading: false,
  error: null,
  config: null,
  navigationHistory: [],
  workspaces: [],
  activeWorkspaceId: null,
  searchTerm: '',
  searchResults: {
    capabilities: [],
    enablers: [],
    requirements: []
  }
}

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload }

    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false }

    case 'SET_DATA':
      return {
        ...state,
        capabilities: action.payload.capabilities || [],
        enablers: action.payload.enablers || [],
        loading: false,
        error: null
      }

    case 'SET_SELECTED_CAPABILITY':
      return { ...state, selectedCapability: action.payload }

    case 'SET_SELECTED_DOCUMENT':
      return { ...state, selectedDocument: action.payload }

    case 'SET_CONFIG':
      return { ...state, config: action.payload }

    case 'ADD_TO_HISTORY': {
      const maxHistorySize = 50
      const currentHistory = state.navigationHistory
      const newHistory = currentHistory.length >= maxHistorySize
        ? [...currentHistory.slice(-maxHistorySize + 1), action.payload]
        : [...currentHistory, action.payload]

      return {
        ...state,
        navigationHistory: newHistory
      }
    }

    case 'GO_BACK': {
      const updatedHistory = [...state.navigationHistory]
      const previous = updatedHistory.pop()
      return {
        ...state,
        navigationHistory: updatedHistory,
        selectedCapability: previous?.selectedCapability || null
      }
    }

    case 'CLEAR_HISTORY':
      return { ...state, navigationHistory: [] }

    case 'SET_WORKSPACES':
      return {
        ...state,
        workspaces: action.payload.workspaces || [],
        activeWorkspaceId: action.payload.activeWorkspaceId || null
      }

    case 'SET_SEARCH_TERM':
      return { ...state, searchTerm: action.payload }

    case 'SET_SEARCH_RESULTS':
      return { ...state, searchResults: action.payload }

    default:
      return state
  }
}

interface AppProviderProps {
  children: ReactNode
}

export function AppProvider({ children }: AppProviderProps): JSX.Element {
  const [state, dispatch] = useReducer(appReducer, initialState)
  const [suppressedPaths, setSuppressedPaths] = useState<Set<string>>(new Set())

  // Use refs to store latest function references for stable WebSocket handler
  const loadDataRef = useRef<() => Promise<void>>()
  const checkForMetadataChangesRef = useRef<(filePath: string, source?: 'form-save' | 'external-change') => Promise<void>>()

  const loadData = useCallback(async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true })
      const data = await apiService.getCapabilitiesDynamic()
      dispatch({ type: 'SET_DATA', payload: data })
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: (error as Error).message })
    }
  }, [])

  // Create debounced version of loadData to prevent excessive API calls during rapid file changes
  const debouncedLoadData = useMemo(() =>
    debounce(() => {
      if (loadDataRef.current) {
        console.log('[AppContext] Debounced loadData called - refreshing capabilities data')
        loadDataRef.current()
      }
    }, 2000), // 2-second delay to batch rapid file changes
  [])

  const loadDataWithDependencies = useCallback(async () => {
    try {
      const data = await apiService.getCapabilitiesWithDependencies()
      return data
    } catch (error) {
      console.error('Failed to load data with dependencies:', error)
      throw error
    }
  }, [])

  const loadConfig = useCallback(async () => {
    try {
      const config = await apiService.getConfig()
      dispatch({ type: 'SET_CONFIG', payload: config })
    } catch (error) {
      console.warn('Could not load config defaults:', error)
    }
  }, [])

  const setSelectedCapability = useCallback((capability: Capability | null) => {
    dispatch({ type: 'SET_SELECTED_CAPABILITY', payload: capability })
  }, [])

  const setSelectedDocument = useCallback((document: SelectedDocument | null) => {
    dispatch({ type: 'SET_SELECTED_DOCUMENT', payload: document })
  }, [])

  const addToHistory = useCallback((item: NavigationHistoryItem) => {
    dispatch({ type: 'ADD_TO_HISTORY', payload: item })
  }, [])

  const goBack = useCallback(() => {
    dispatch({ type: 'GO_BACK' })
  }, [])

  const clearHistory = useCallback(() => {
    dispatch({ type: 'CLEAR_HISTORY' })
  }, [])

  const refreshData = useCallback(() => {
    loadData()
  }, [loadData])

  const loadWorkspaces = useCallback(async () => {
    try {
      const response = await fetch('/api/workspaces')
      const data = await response.json()
      dispatch({ type: 'SET_WORKSPACES', payload: data })
    } catch (error) {
      console.error('Failed to load workspaces:', error)
    }
  }, [])

  const activateWorkspace = useCallback(async (workspaceId: string) => {
    try {
      const response = await fetch(`/api/workspaces/${workspaceId}/activate`, {
        method: 'POST'
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to activate workspace')
      }

      await loadWorkspaces()

      // Clear selected documents when switching workspaces
      setSelectedCapability(null)
      setSelectedDocument(null)
      clearHistory()

      // WebSocket reconnection will be handled by the workspace change useEffect
      console.log('[AppContext] Workspace switched, WebSocket reconnection will be handled by workspace change effect...')

      loadData()

      return true
    } catch (error) {
      console.error('Failed to activate workspace:', error)
      return false
    }
  }, [loadWorkspaces, loadData])

  const setSearchTerm = useCallback((term: string) => {
    dispatch({ type: 'SET_SEARCH_TERM', payload: term })
  }, [])

  const performSearch = useCallback((term: string) => {
    if (!term.trim()) {
      dispatch({ type: 'SET_SEARCH_RESULTS', payload: { capabilities: [], enablers: [], requirements: [] } })
      return
    }

    const searchTerm = term.toLowerCase()

    // Search capabilities
    const filteredCapabilities = state.capabilities.filter(capability =>
      (capability.title?.toLowerCase().includes(searchTerm)) ||
      (capability.name?.toLowerCase().includes(searchTerm)) ||
      (capability.id?.toLowerCase().includes(searchTerm)) ||
      (capability.system?.toLowerCase().includes(searchTerm)) ||
      (capability.component?.toLowerCase().includes(searchTerm))
    )

    // Search enablers
    const filteredEnablers = state.enablers.filter(enabler =>
      (enabler.title?.toLowerCase().includes(searchTerm)) ||
      (enabler.name?.toLowerCase().includes(searchTerm)) ||
      (enabler.id?.toLowerCase().includes(searchTerm)) ||
      (enabler.capabilityId?.toLowerCase().includes(searchTerm))
    )

    // Search requirements within enablers
    const requirements: Requirement[] = []
    state.enablers.forEach(enabler => {
      // Check functional requirements
      if (enabler.functionalRequirements && Array.isArray(enabler.functionalRequirements)) {
        enabler.functionalRequirements.forEach((req: any) => {
          if (req.name?.toLowerCase().includes(searchTerm) || req.id?.toLowerCase().includes(searchTerm)) {
            requirements.push({
              id: req.id,
              name: req.name,
              type: 'Functional',
              enablerID: enabler.id || '',
              enablerName: enabler.title || enabler.name || ''
            })
          }
        })
      }

      // Check non-functional requirements
      if (enabler.nonFunctionalRequirements && Array.isArray(enabler.nonFunctionalRequirements)) {
        enabler.nonFunctionalRequirements.forEach((req: any) => {
          if (req.name?.toLowerCase().includes(searchTerm) || req.id?.toLowerCase().includes(searchTerm)) {
            requirements.push({
              id: req.id,
              name: req.name,
              type: 'Non-Functional',
              enablerID: enabler.id || '',
              enablerName: enabler.title || enabler.name || ''
            })
          }
        })
      }
    })

    dispatch({
      type: 'SET_SEARCH_RESULTS',
      payload: {
        capabilities: filteredCapabilities,
        enablers: filteredEnablers,
        requirements
      }
    })
  }, [state.capabilities, state.enablers])

  // Function to suppress external change notifications for user-initiated saves
  const suppressExternalChangeNotification = useCallback((filePath: string, duration: number = 3000) => {
    const normalizedPath = filePath.toLowerCase().replace(/\\/g, '/')

    setSuppressedPaths(prev => {
      const newSet = new Set(prev)
      newSet.add(normalizedPath)
      return newSet
    })

    // Remove suppression after duration
    setTimeout(() => {
      setSuppressedPaths(prev => {
        const newSet = new Set(prev)
        newSet.delete(normalizedPath)
        return newSet
      })
    }, duration)

    console.log(`[AppContext] Suppressing external change notifications for: ${normalizedPath} (${duration}ms)`)
  }, [])

  // Helper function to extract metadata from content
  const extractMetadata = useCallback((text: string) => {
    const metadata: { [key: string]: string } = {}
    const metadataFields = ['Status', 'Priority', 'Approval', 'Owner', 'Type']

    metadataFields.forEach(field => {
      const match = text.match(new RegExp(`${field}[^:]*:\\s*([^\\n-]+)`, 'i'))
      if (match) {
        metadata[field] = match[1].trim()
      }
    })

    return metadata
  }, [])

  // Function to initialize metadata storage for all documents
  const initializeMetadataStorage = useCallback(async () => {
    try {
      const allDocuments = [...state.capabilities, ...state.enablers]

      for (const doc of allDocuments) {
        try {
          const response = await fetch(`/api/file/${doc.path}`)
          if (response.ok) {
            const data = await response.json()
            const content = data.content || ''
            const metadata = extractMetadata(content)
            const storageKey = `metadata_${doc.path}`

            // Only store if we don't already have metadata for this document
            if (!localStorage.getItem(storageKey)) {
              localStorage.setItem(storageKey, JSON.stringify(metadata))
            }
          }
        } catch (err) {
          // Skip documents that can't be loaded
          console.warn(`Could not initialize metadata for ${doc.path}:`, err)
        }
      }
    } catch (error) {
      console.error('Error initializing metadata storage:', error)
    }
  }, [state.capabilities, state.enablers, extractMetadata])



  // Function to check for metadata changes and show notifications
  const checkForMetadataChanges = useCallback(async (filePath: string, source: 'form-save' | 'external-change' = 'external-change') => {
    console.log(`[AppContext] checkForMetadataChanges called with:`, { filePath, source })

    try {
      // Only suppress notifications for form saves, not external changes
      if (source === 'form-save') {
        const normalizedPath = filePath.toLowerCase().replace(/\\/g, '/')
        if (suppressedPaths.has(normalizedPath)) {
          console.log(`[AppContext] Skipping notification for suppressed form save: ${normalizedPath}`)
          return
        }
      }

      // Get the current document content
      const response = await fetch(`/api/file/${filePath}`)
      if (!response.ok) return

      const data = await response.json()
      const content = data.content || ''

      const currentMetadata = extractMetadata(content)

      // Extract document ID and name for notification
      const idMatch = content.match(/ID[^:]*:\s*([A-Z]{3}-\d+)/i) || content.match(/(CAP-\d+|ENB-\d+)/i)
      const nameMatch = content.match(/Name[^:]*:\s*([^\n]+)/i)

      const documentId = idMatch?.[1]?.trim() || 'Unknown ID'
      const documentName = nameMatch?.[1]?.trim() || 'Unknown Document'

      // Store current metadata to compare with future changes
      const storageKey = `metadata_${filePath}`
      const previousMetadata = JSON.parse(localStorage.getItem(storageKey) || '{}')

      // Check for changes in Status or Approval
      const statusChanged = (previousMetadata.Status || '') !== (currentMetadata.Status || '')
      const approvalChanged = (previousMetadata.Approval || '') !== (currentMetadata.Approval || '')

      console.log('[AppContext] Status change check:', {
        previousStatus: previousMetadata.Status,
        currentStatus: currentMetadata.Status,
        statusChanged,
        previousApproval: previousMetadata.Approval,
        currentApproval: currentMetadata.Approval,
        approvalChanged
      })

      if (statusChanged || approvalChanged) {
        // Collect all changes to show in overlay
        const changes: { field: string, oldValue: string, newValue: string }[] = []

        if (statusChanged) {
          changes.push({
            field: 'Status',
            oldValue: previousMetadata.Status || '(empty)',
            newValue: currentMetadata.Status || '(empty)'
          })
        }

        if (approvalChanged) {
          changes.push({
            field: 'Approval',
            oldValue: previousMetadata.Approval || '(empty)',
            newValue: currentMetadata.Approval || '(empty)'
          })
        }

        // Trigger external change notification via custom event for DocumentView
        console.log(`[AppContext] Dispatching external-change event:`, {
          documentId,
          documentName,
          changes,
          filePath
        })

        const event = new CustomEvent('external-change', {
          detail: {
            documentId,
            documentName,
            changes,
            filePath
          }
        })
        window.dispatchEvent(event)
      }

      // Store current metadata for future comparisons
      localStorage.setItem(storageKey, JSON.stringify(currentMetadata))

    } catch (error) {
      console.error('Error checking metadata changes:', error)
    }
  }, [extractMetadata, suppressedPaths])

  // Update refs when functions change
  useEffect(() => {
    loadDataRef.current = loadData
    checkForMetadataChangesRef.current = checkForMetadataChanges
  }, [loadData, checkForMetadataChanges])

  // WebSocket listener setup and management
  const setupWebSocketListener = useCallback(() => {
    console.log('[AppContext] Setting up WebSocket listener...')

    const removeListener = websocketService.addListener((data: WebSocketData) => {
      console.log('[AppContext] WebSocket data received:', data)

      if (data.type === 'file-change') {
        const filePath = (data.filePath || '').toLowerCase()
        console.log('[AppContext] Processing file-change event for:', filePath)
        console.log('[AppContext] File ends with .md:', filePath.endsWith('.md'))

        if (filePath.endsWith('.md')) {
          console.log('[AppContext] Markdown file changed, processing:', data.filePath)
          console.log('[AppContext] checkForMetadataChangesRef.current available:', !!checkForMetadataChangesRef.current)

          // Check for metadata changes and show toast notifications using ref
          if (checkForMetadataChangesRef.current) {
            console.log('[AppContext] Calling checkForMetadataChanges with:', data.filePath)
            checkForMetadataChangesRef.current(data.filePath || '')
          } else {
            console.warn('[AppContext] checkForMetadataChangesRef.current is not available!')
          }

          // Use debounced loadData to prevent excessive API calls during rapid editing
          debouncedLoadData()
        }
      }
    })

    return removeListener
  }, [debouncedLoadData])

  // Store current listener cleanup function
  const listenerCleanupRef = useRef<(() => void) | null>(null)

  // Watch for workspace changes and reconnect WebSocket with fresh listeners
  const [previousActiveWorkspaceId, setPreviousActiveWorkspaceId] = useState<string | null>(null)

  useEffect(() => {
    if (state.activeWorkspaceId &&
        previousActiveWorkspaceId &&
        state.activeWorkspaceId !== previousActiveWorkspaceId) {
      console.log('[AppContext] Active workspace changed, forcing WebSocket reconnection...')

      // Clean up existing listener before reconnecting
      if (listenerCleanupRef.current) {
        console.log('[AppContext] Cleaning up existing WebSocket listener before reconnect...')
        listenerCleanupRef.current()
        listenerCleanupRef.current = null
      }

      // Force reconnection and set up fresh listener
      websocketService.forceReconnect()

      // Set up new listener after a brief delay to ensure WebSocket is connected
      setTimeout(() => {
        console.log('[AppContext] Setting up fresh WebSocket listener after workspace change...')
        listenerCleanupRef.current = setupWebSocketListener()
      }, 500)
    }
    setPreviousActiveWorkspaceId(state.activeWorkspaceId)
  }, [state.activeWorkspaceId, previousActiveWorkspaceId, setupWebSocketListener])

  useEffect(() => {
    loadData()
    loadConfig()
    loadWorkspaces()

    websocketService.connect()

    // Debug WebSocket connection status
    setTimeout(() => {
      console.log('[AppContext] WebSocket connection status:', websocketService.getIsConnected())
    }, 1000)

    // Set up initial WebSocket listener
    listenerCleanupRef.current = setupWebSocketListener()

    return () => {
      if (listenerCleanupRef.current) {
        listenerCleanupRef.current()
        listenerCleanupRef.current = null
      }
      websocketService.disconnect()
    }
  }, [setupWebSocketListener])

  // Initialize metadata storage when data is loaded
  useEffect(() => {
    if (state.capabilities.length > 0 || state.enablers.length > 0) {
      initializeMetadataStorage()
    }
  }, [state.capabilities, state.enablers, initializeMetadataStorage])

  const value: AppContextValue = {
    ...state,
    loadData,
    loadDataWithDependencies,
    setSelectedCapability,
    setSelectedDocument,
    addToHistory,
    goBack,
    clearHistory,
    refreshData,
    loadWorkspaces,
    activateWorkspace,
    setSearchTerm,
    performSearch,
    suppressExternalChangeNotification
  }

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp(): AppContextValue {
  const context = useContext(AppContext)
  if (!context) {
    throw new Error('useApp must be used within an AppProvider')
  }
  return context
}
