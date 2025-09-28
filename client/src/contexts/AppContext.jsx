import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react'
import { apiService } from '../services/apiService'
import { websocketService } from '../services/websocketService'

const AppContext = createContext()

const initialState = {
  capabilities: [],
  enablers: [],
  selectedCapability: null,
  selectedDocument: null, // { type: 'capability|enabler', path: 'path', id: 'id' }
  loading: false,
  error: null,
  config: null,
  navigationHistory: []
}

function appReducer(state, action) {
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
    
    case 'ADD_TO_HISTORY':
      // Optimize history to prevent memory issues with large arrays
      const maxHistorySize = 50
      const currentHistory = state.navigationHistory
      const newHistory = currentHistory.length >= maxHistorySize 
        ? [...currentHistory.slice(-maxHistorySize + 1), action.payload]
        : [...currentHistory, action.payload]
      
      return {
        ...state,
        navigationHistory: newHistory
      }
    
    case 'GO_BACK':
      const updatedHistory = [...state.navigationHistory]
      const previous = updatedHistory.pop()
      return {
        ...state,
        navigationHistory: updatedHistory,
        selectedCapability: previous?.selectedCapability || null
      }
    
    case 'CLEAR_HISTORY':
      return { ...state, navigationHistory: [] }
    
    default:
      return state
  }
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(appReducer, initialState)

  const loadData = useCallback(async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true })
      const data = await apiService.getCapabilities()
      dispatch({ type: 'SET_DATA', payload: data })
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error.message })
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

  const setSelectedCapability = useCallback((capability) => {
    dispatch({ type: 'SET_SELECTED_CAPABILITY', payload: capability })
  }, [])

  const setSelectedDocument = useCallback((document) => {
    dispatch({ type: 'SET_SELECTED_DOCUMENT', payload: document })
  }, [])

  const addToHistory = useCallback((item) => {
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

  useEffect(() => {
    loadData()
    loadConfig()

    // Connect to WebSocket and setup file change listeners
    websocketService.connect()

    const removeListener = websocketService.addListener((data) => {
      console.log('WebSocket data received in AppContext:', data)

      if (data.type === 'file-change') {
        // Check if the changed file is a markdown file that affects our data
        const filePath = data.filePath.toLowerCase()
        if (filePath.endsWith('.md') && (filePath.includes('capability') || filePath.includes('enabler'))) {
          console.log('Markdown file changed, refreshing data:', data.filePath)

          // Add a small delay to ensure file writes are complete
          setTimeout(() => {
            loadData()
          }, 500)
        }
      }
    })

    // Cleanup on unmount
    return () => {
      removeListener()
      websocketService.disconnect()
    }
  }, [])

  const value = {
    ...state,
    loadData,
    loadDataWithDependencies,
    setSelectedCapability,
    setSelectedDocument,
    addToHistory,
    goBack,
    clearHistory,
    refreshData
  }

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const context = useContext(AppContext)
  if (!context) {
    throw new Error('useApp must be used within an AppProvider')
  }
  return context
}