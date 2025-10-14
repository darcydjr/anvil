/*
 * Copyright 2025 Darcy Davidson
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

export interface WebSocketMessage {
  type: 'file:changed' | 'file:added' | 'file:removed' | string
  data?: any
  [key: string]: any
}

export type WebSocketListener = (data: WebSocketMessage) => void

class WebSocketService {
  private ws: WebSocket | null = null
  private listeners: Set<WebSocketListener> = new Set()
  private reconnectAttempts: number = 0
  private readonly maxReconnectAttempts: number = 5
  private readonly reconnectInterval: number = 3000
  private isConnected: boolean = false

  connect(): void {
    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      const wsUrl = `${protocol}//${window.location.host}`

      console.log('Connecting to WebSocket:', wsUrl)
      this.ws = new WebSocket(wsUrl)

      this.ws.onopen = () => {
        console.log('WebSocket connected')
        this.isConnected = true
        this.reconnectAttempts = 0
      }

      this.ws.onmessage = (event: MessageEvent) => {
        try {
          const data: WebSocketMessage = JSON.parse(event.data)
          console.log('WebSocket message received:', data)

          // Notify all listeners
          this.listeners.forEach(listener => {
            try {
              listener(data)
            } catch (error) {
              console.error('Error in WebSocket listener:', error)
            }
          })
        } catch (error) {
          console.error('Error parsing WebSocket message:', error)
        }
      }

      this.ws.onclose = () => {
        console.log('WebSocket disconnected')
        this.isConnected = false
        this.attemptReconnect()
      }

      this.ws.onerror = (error: Event) => {
        console.error('WebSocket error:', error)
      }

    } catch (error) {
      console.error('Error connecting to WebSocket:', error)
      this.attemptReconnect()
    }
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++
      console.log(`Attempting to reconnect WebSocket (${this.reconnectAttempts}/${this.maxReconnectAttempts})`)

      setTimeout(() => {
        this.connect()
      }, this.reconnectInterval)
    } else {
      console.error('Max WebSocket reconnect attempts reached')
    }
  }

  addListener(listener: WebSocketListener): () => void {
    this.listeners.add(listener)

    // Return a function to remove the listener
    return () => {
      this.listeners.delete(listener)
    }
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
    this.listeners.clear()
    this.isConnected = false
  }

  getIsConnected(): boolean {
    return this.isConnected
  }
}

// Create a singleton instance
export const websocketService = new WebSocketService()
