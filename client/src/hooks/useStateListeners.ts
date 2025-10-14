/**
 * React Hook for State Field Listeners
 *
 * This hook provides a convenient way to integrate state listeners
 * into React components for Capabilities, Enablers, and Requirements.
 */

import { useEffect, useRef } from 'react'
import { stateListenerManager, stateListenerRegistry, STATE_CHANGE_EVENTS, StateChangeListener } from '../utils/stateListeners'

interface CapabilityData {
  status?: string
  approval?: string
  [key: string]: any
}

interface EnablerData {
  status?: string
  approval?: string
  [key: string]: any
}

interface RequirementData {
  id?: string
  status?: string
  approval?: string
  [key: string]: any
}

interface ListenerRegistration {
  eventType: string
  listenerId: string
}

/**
 * Hook for managing capability state listeners
 * @param capabilityId - The capability ID
 * @param capabilityData - Current capability data
 * @returns Listener registration functions
 */
export function useCapabilityStateListener(capabilityId: string | undefined, capabilityData: CapabilityData | undefined) {
  const listenerRef = useRef<any>(null)

  useEffect(() => {
    if (capabilityId) {
      listenerRef.current = stateListenerManager.getCapabilityListener(capabilityId)
      // Initialize with current state
      if (capabilityData) {
        listenerRef.current.checkForChanges(capabilityData)
      }
    }
  }, [capabilityId])

  // Check for state changes when relevant data updates
  useEffect(() => {
    if (listenerRef.current && capabilityId && capabilityData) {
      listenerRef.current.checkForChanges(capabilityData)
    }
  }, [capabilityData?.status, capabilityData?.approval])

  return {
    /**
     * Register a listener for capability status changes
     * @param callback - Callback function
     * @param listenerId - Unique listener ID
     */
    onStatusChange: (callback: StateChangeListener, listenerId: string): void => {
      stateListenerRegistry.register(STATE_CHANGE_EVENTS.CAPABILITY_STATUS_CHANGE, callback, listenerId)
    },

    /**
     * Register a listener for capability approval changes
     * @param callback - Callback function
     * @param listenerId - Unique listener ID
     */
    onApprovalChange: (callback: StateChangeListener, listenerId: string): void => {
      stateListenerRegistry.register(STATE_CHANGE_EVENTS.CAPABILITY_APPROVAL_CHANGE, callback, listenerId)
    }
  }
}

/**
 * Hook for managing enabler state listeners
 * @param enablerId - The enabler ID
 * @param enablerData - Current enabler data
 * @returns Listener registration functions
 */
export function useEnablerStateListener(enablerId: string | undefined, enablerData: EnablerData | undefined) {
  const listenerRef = useRef<any>(null)

  useEffect(() => {
    if (enablerId) {
      listenerRef.current = stateListenerManager.getEnablerListener(enablerId)
      // Initialize with current state
      if (enablerData) {
        listenerRef.current.checkForChanges(enablerData)
      }
    }
  }, [enablerId])

  // Check for state changes when relevant data updates
  useEffect(() => {
    if (listenerRef.current && enablerId && enablerData) {
      listenerRef.current.checkForChanges(enablerData)
    }
  }, [enablerData?.status, enablerData?.approval])

  return {
    /**
     * Register a listener for enabler status changes
     * @param callback - Callback function
     * @param listenerId - Unique listener ID
     */
    onStatusChange: (callback: StateChangeListener, listenerId: string): void => {
      stateListenerRegistry.register(STATE_CHANGE_EVENTS.ENABLER_STATUS_CHANGE, callback, listenerId)
    },

    /**
     * Register a listener for enabler approval changes
     * @param callback - Callback function
     * @param listenerId - Unique listener ID
     */
    onApprovalChange: (callback: StateChangeListener, listenerId: string): void => {
      stateListenerRegistry.register(STATE_CHANGE_EVENTS.ENABLER_APPROVAL_CHANGE, callback, listenerId)
    }
  }
}

/**
 * Hook for managing requirement state listeners
 * @param requirements - Array of requirements
 * @param requirementType - 'functional' or 'nonFunctional'
 * @param parentEnablerId - Parent enabler ID
 * @returns Listener registration functions
 */
export function useRequirementStateListeners(
  requirements: RequirementData[] | undefined,
  requirementType: 'functional' | 'nonFunctional',
  parentEnablerId: string | undefined
) {
  const listenersRef = useRef<Map<string, any>>(new Map())

  useEffect(() => {
    if (parentEnablerId && requirements) {
      requirements.forEach((req) => {
        if (req.id) {
          const listener = stateListenerManager.getRequirementListener(req.id, requirementType, parentEnablerId)
          listenersRef.current.set(req.id, listener)
          listener.checkForChanges(req)
        }
      })
    }
  }, [requirements?.length, requirementType, parentEnablerId])

  // Check for state changes when requirements update
  useEffect(() => {
    if (requirements && parentEnablerId) {
      requirements.forEach((req) => {
        if (req.id) {
          const listener = listenersRef.current.get(req.id)
          if (listener) {
            listener.checkForChanges(req)
          }
        }
      })
    }
  }, [requirements])

  return {
    /**
     * Register a listener for requirement status changes
     * @param callback - Callback function
     * @param listenerId - Unique listener ID
     */
    onStatusChange: (callback: StateChangeListener, listenerId: string): void => {
      stateListenerRegistry.register(STATE_CHANGE_EVENTS.REQUIREMENT_STATUS_CHANGE, callback, listenerId)
    },

    /**
     * Register a listener for requirement approval changes
     * @param callback - Callback function
     * @param listenerId - Unique listener ID
     */
    onApprovalChange: (callback: StateChangeListener, listenerId: string): void => {
      stateListenerRegistry.register(STATE_CHANGE_EVENTS.REQUIREMENT_APPROVAL_CHANGE, callback, listenerId)
    }
  }
}

/**
 * Hook for registering general state change listeners
 * @returns Registration and cleanup functions
 */
export function useStateChangeListeners() {
  const registeredListeners = useRef<Set<ListenerRegistration>>(new Set())

  // Cleanup listeners on unmount
  useEffect(() => {
    return () => {
      registeredListeners.current.forEach(({ eventType, listenerId }) => {
        stateListenerRegistry.unregister(eventType, listenerId)
      })
    }
  }, [])

  return {
    /**
     * Register a listener and track it for cleanup
     * @param eventType - Event type
     * @param callback - Callback function
     * @param listenerId - Unique listener ID
     */
    register: (eventType: string, callback: StateChangeListener, listenerId: string): void => {
      stateListenerRegistry.register(eventType, callback, listenerId)
      registeredListeners.current.add({ eventType, listenerId })
    },

    /**
     * Unregister a specific listener
     * @param eventType - Event type
     * @param listenerId - Unique listener ID
     */
    unregister: (eventType: string, listenerId: string): void => {
      stateListenerRegistry.unregister(eventType, listenerId)
      registeredListeners.current.forEach((item) => {
        if (item.eventType === eventType && item.listenerId === listenerId) {
          registeredListeners.current.delete(item)
        }
      })
    },

    /**
     * Get current listener registry state (for debugging)
     */
    getListeners: (): Record<string, string[]> => stateListenerRegistry.getListeners()
  }
}
