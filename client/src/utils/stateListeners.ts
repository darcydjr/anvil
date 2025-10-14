/**
 * State Field Listener Infrastructure
 *
 * This module provides infrastructure for listening to state changes in
 * Capabilities, Enablers, and Requirements. It allows registering listeners
 * that will be triggered when specific fields change state.
 */

// Event types for state changes
export const STATE_CHANGE_EVENTS = {
  CAPABILITY_STATUS_CHANGE: 'capability_status_change',
  CAPABILITY_APPROVAL_CHANGE: 'capability_approval_change',
  ENABLER_STATUS_CHANGE: 'enabler_status_change',
  ENABLER_APPROVAL_CHANGE: 'enabler_approval_change',
  REQUIREMENT_STATUS_CHANGE: 'requirement_status_change',
  REQUIREMENT_APPROVAL_CHANGE: 'requirement_approval_change'
} as const

export type StateChangeEventType = typeof STATE_CHANGE_EVENTS[keyof typeof STATE_CHANGE_EVENTS]

export interface StateChangeEventData {
  timestamp: string
  [key: string]: any
}

export interface CapabilityStatusChangeEvent extends StateChangeEventData {
  capabilityId: string
  previousStatus?: string
  newStatus: string
  capabilityData: any
}

export interface CapabilityApprovalChangeEvent extends StateChangeEventData {
  capabilityId: string
  previousApproval?: string
  newApproval: string
  capabilityData: any
}

export interface EnablerStatusChangeEvent extends StateChangeEventData {
  enablerId: string
  capabilityId: string
  previousStatus?: string
  newStatus: string
  enablerData: any
}

export interface EnablerApprovalChangeEvent extends StateChangeEventData {
  enablerId: string
  capabilityId: string
  previousApproval?: string
  newApproval: string
  enablerData: any
}

export interface RequirementStatusChangeEvent extends StateChangeEventData {
  requirementId: string
  requirementType: 'functional' | 'nonFunctional'
  parentEnablerId: string
  previousStatus?: string
  newStatus: string
  requirementData: any
}

export interface RequirementApprovalChangeEvent extends StateChangeEventData {
  requirementId: string
  requirementType: 'functional' | 'nonFunctional'
  parentEnablerId: string
  previousApproval?: string
  newApproval: string
  requirementData: any
}

export type StateChangeListener = (eventData: StateChangeEventData) => void

// Global listener registry
class StateListenerRegistry {
  private listeners: Map<string, Map<string, StateChangeListener>> = new Map()

  /**
   * Register a listener for a specific event type
   * @param eventType - The event type to listen for
   * @param listener - The listener function
   * @param listenerId - Unique identifier for the listener
   */
  register(eventType: string, listener: StateChangeListener, listenerId: string): void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Map())
    }

    this.listeners.get(eventType)!.set(listenerId, listener)
    console.log(`Registered listener ${listenerId} for event ${eventType}`)
  }

  /**
   * Unregister a listener
   * @param eventType - The event type
   * @param listenerId - The listener identifier
   */
  unregister(eventType: string, listenerId: string): void {
    if (this.listeners.has(eventType)) {
      this.listeners.get(eventType)!.delete(listenerId)
      console.log(`Unregistered listener ${listenerId} for event ${eventType}`)
    }
  }

  /**
   * Trigger all listeners for a specific event
   * @param eventType - The event type to trigger
   * @param eventData - Data to pass to listeners
   */
  trigger(eventType: string, eventData: StateChangeEventData): void {
    if (this.listeners.has(eventType)) {
      const eventListeners = this.listeners.get(eventType)!
      console.log(`Triggering ${eventListeners.size} listeners for event ${eventType}`, eventData)

      eventListeners.forEach((listener, listenerId) => {
        try {
          listener(eventData)
        } catch (error) {
          console.error(`Error in listener ${listenerId} for event ${eventType}:`, error)
        }
      })
    }
  }

  /**
   * Get all registered listeners (for debugging)
   */
  getListeners(): Record<string, string[]> {
    const result: Record<string, string[]> = {}
    this.listeners.forEach((listeners, eventType) => {
      result[eventType] = Array.from(listeners.keys())
    })
    return result
  }
}

// Global instance
export const stateListenerRegistry = new StateListenerRegistry()

interface PreviousState {
  status?: string
  approval?: string
}

/**
 * Capability State Change Detector
 */
export class CapabilityStateListener {
  private capabilityId: string
  private previousState: PreviousState = {}

  constructor(capabilityId: string) {
    this.capabilityId = capabilityId
  }

  /**
   * Check for state changes and trigger appropriate events
   * @param currentData - Current capability data
   */
  checkForChanges(currentData: any): void {
    const currentStatus = currentData.status
    const currentApproval = currentData.approval

    // Check status change
    if (this.previousState.status !== currentStatus) {
      const eventData: CapabilityStatusChangeEvent = {
        capabilityId: this.capabilityId,
        previousStatus: this.previousState.status,
        newStatus: currentStatus,
        timestamp: new Date().toISOString(),
        capabilityData: currentData
      }

      stateListenerRegistry.trigger(STATE_CHANGE_EVENTS.CAPABILITY_STATUS_CHANGE, eventData)
    }

    // Check approval change
    if (this.previousState.approval !== currentApproval) {
      const eventData: CapabilityApprovalChangeEvent = {
        capabilityId: this.capabilityId,
        previousApproval: this.previousState.approval,
        newApproval: currentApproval,
        timestamp: new Date().toISOString(),
        capabilityData: currentData
      }

      stateListenerRegistry.trigger(STATE_CHANGE_EVENTS.CAPABILITY_APPROVAL_CHANGE, eventData)
    }

    // Update previous state
    this.previousState = {
      status: currentStatus,
      approval: currentApproval
    }
  }
}

/**
 * Enabler State Change Detector
 */
export class EnablerStateListener {
  private enablerId: string
  private previousState: PreviousState = {}

  constructor(enablerId: string) {
    this.enablerId = enablerId
  }

  /**
   * Check for state changes and trigger appropriate events
   * @param currentData - Current enabler data
   */
  checkForChanges(currentData: any): void {
    const currentStatus = currentData.status
    const currentApproval = currentData.approval

    // Check status change
    if (this.previousState.status !== currentStatus) {
      const eventData: EnablerStatusChangeEvent = {
        enablerId: this.enablerId,
        capabilityId: currentData.capabilityId,
        previousStatus: this.previousState.status,
        newStatus: currentStatus,
        timestamp: new Date().toISOString(),
        enablerData: currentData
      }

      stateListenerRegistry.trigger(STATE_CHANGE_EVENTS.ENABLER_STATUS_CHANGE, eventData)
    }

    // Check approval change
    if (this.previousState.approval !== currentApproval) {
      const eventData: EnablerApprovalChangeEvent = {
        enablerId: this.enablerId,
        capabilityId: currentData.capabilityId,
        previousApproval: this.previousState.approval,
        newApproval: currentApproval,
        timestamp: new Date().toISOString(),
        enablerData: currentData
      }

      stateListenerRegistry.trigger(STATE_CHANGE_EVENTS.ENABLER_APPROVAL_CHANGE, eventData)
    }

    // Update previous state
    this.previousState = {
      status: currentStatus,
      approval: currentApproval
    }
  }
}

/**
 * Requirements State Change Detector
 */
export class RequirementStateListener {
  private requirementId: string
  private requirementType: 'functional' | 'nonFunctional'
  private parentEnablerId: string
  private previousState: PreviousState = {}

  constructor(requirementId: string, requirementType: 'functional' | 'nonFunctional', parentEnablerId: string) {
    this.requirementId = requirementId
    this.requirementType = requirementType
    this.parentEnablerId = parentEnablerId
  }

  /**
   * Check for state changes and trigger appropriate events
   * @param currentData - Current requirement data
   */
  checkForChanges(currentData: any): void {
    const currentStatus = currentData.status
    const currentApproval = currentData.approval

    // Check status change
    if (this.previousState.status !== currentStatus) {
      const eventData: RequirementStatusChangeEvent = {
        requirementId: this.requirementId,
        requirementType: this.requirementType,
        parentEnablerId: this.parentEnablerId,
        previousStatus: this.previousState.status,
        newStatus: currentStatus,
        timestamp: new Date().toISOString(),
        requirementData: currentData
      }

      stateListenerRegistry.trigger(STATE_CHANGE_EVENTS.REQUIREMENT_STATUS_CHANGE, eventData)
    }

    // Check approval change
    if (this.previousState.approval !== currentApproval) {
      const eventData: RequirementApprovalChangeEvent = {
        requirementId: this.requirementId,
        requirementType: this.requirementType,
        parentEnablerId: this.parentEnablerId,
        previousApproval: this.previousState.approval,
        newApproval: currentApproval,
        timestamp: new Date().toISOString(),
        requirementData: currentData
      }

      stateListenerRegistry.trigger(STATE_CHANGE_EVENTS.REQUIREMENT_APPROVAL_CHANGE, eventData)
    }

    // Update previous state
    this.previousState = {
      status: currentStatus,
      approval: currentApproval
    }
  }
}

/**
 * Helper function to create and manage state listeners
 */
export class StateListenerManager {
  private listeners: Map<string, CapabilityStateListener | EnablerStateListener | RequirementStateListener> = new Map()

  /**
   * Create or get capability listener
   * @param capabilityId
   * @returns CapabilityStateListener
   */
  getCapabilityListener(capabilityId: string): CapabilityStateListener {
    const key = `capability_${capabilityId}`
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new CapabilityStateListener(capabilityId))
    }
    return this.listeners.get(key) as CapabilityStateListener
  }

  /**
   * Create or get enabler listener
   * @param enablerId
   * @returns EnablerStateListener
   */
  getEnablerListener(enablerId: string): EnablerStateListener {
    const key = `enabler_${enablerId}`
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new EnablerStateListener(enablerId))
    }
    return this.listeners.get(key) as EnablerStateListener
  }

  /**
   * Create or get requirement listener
   * @param requirementId
   * @param requirementType
   * @param parentEnablerId
   * @returns RequirementStateListener
   */
  getRequirementListener(requirementId: string, requirementType: 'functional' | 'nonFunctional', parentEnablerId: string): RequirementStateListener {
    const key = `requirement_${requirementId}_${requirementType}_${parentEnablerId}`
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new RequirementStateListener(requirementId, requirementType, parentEnablerId))
    }
    return this.listeners.get(key) as RequirementStateListener
  }

  /**
   * Clean up listeners for removed items
   * @param listenerId
   */
  removeListener(listenerId: string): void {
    this.listeners.delete(listenerId)
  }
}

// Global state listener manager
export const stateListenerManager = new StateListenerManager()

/**
 * Automation Triggers
 *
 * Automation behaviors are now implemented directly in form components
 * for simpler and more reliable operation.
 */
