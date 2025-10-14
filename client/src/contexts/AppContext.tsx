import React, { createContext, useContext, useReducer, useEffect, useCallback, ReactNode } from 'react'
import { apiService } from '../services/apiService'
import { websocketService } from '../services/websocketService'

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
  activeWorkspaceId: null
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

    default:
      return state
  }
}

interface AppProviderProps {
  children: ReactNode
}

export function AppProvider({ children }: AppProviderProps): JSX.Element {
  const [state, dispatch] = useReducer(appReducer, initialState)

  const loadData = useCallback(async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true })
      const data = await apiService.getCapabilities()
      dispatch({ type: 'SET_DATA', payload: data })
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: (error as Error).message })
    }
  }, [])

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
      loadData()

      return true
    } catch (error) {
      console.error('Failed to activate workspace:', error)
      return false
    }
  }, [loadWorkspaces, loadData])

  useEffect(() => {
    loadData()
    loadConfig()
    loadWorkspaces()

    websocketService.connect()

    const removeListener = websocketService.addListener((data: WebSocketData) => {
      console.log('WebSocket data received in AppContext:', data)

      if (data.type === 'file-change') {
        const filePath = (data.filePath || '').toLowerCase()
        if (filePath.endsWith('.md') && (filePath.includes('capability') || filePath.includes('enabler'))) {
          console.log('Markdown file changed, refreshing data:', data.filePath)

          setTimeout(() => {
            loadData()
          }, 500)
        }
      }
    })

    return () => {
      removeListener()
      websocketService.disconnect()
    }
  }, [loadData, loadConfig, loadWorkspaces])

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
    activateWorkspace
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
