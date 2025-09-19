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

import axios from 'axios'

// Configure axios defaults
const api = axios.create({
  baseURL: '/api',
  timeout: 10000
})

// Add response interceptor for consistent error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Enhanced error information
    const enhancedError = new Error(
      error.response?.data?.error || 
      error.message || 
      'An unexpected error occurred'
    )
    enhancedError.status = error.response?.status
    enhancedError.originalError = error
    return Promise.reject(enhancedError)
  }
)

export const apiService = {
  async getCapabilities() {
    try {
      const response = await api.get('/capabilities')
      return response.data
    } catch (error) {
      console.error('Failed to get capabilities:', error)
      throw new Error(`Failed to load capabilities: ${error.message}`)
    }
  },

  async getCapabilitiesWithDependencies() {
    try {
      const response = await api.get('/capabilities-with-dependencies')
      return response.data
    } catch (error) {
      console.error('Failed to fetch capabilities with dependencies:', error)
      throw new Error(`Failed to fetch capabilities with dependencies: ${error.message}`)
    }
  },

  async getFile(filePath) {
    try {
      if (!filePath) {
        throw new Error('File path is required')
      }
      const response = await api.get(`/file/${filePath}`)
      return response.data
    } catch (error) {
      console.error(`Failed to get file ${filePath}:`, error)
      throw new Error(`Failed to load file: ${error.message}`)
    }
  },

  async saveFile(filePath, content) {
    try {
      if (!filePath) {
        throw new Error('File path is required')
      }
      if (content === undefined || content === null) {
        throw new Error('Content is required')
      }
      const response = await api.post(`/file/${filePath}`, { content })
      return response.data
    } catch (error) {
      console.error(`Failed to save file ${filePath}:`, error)
      throw new Error(`Failed to save file: ${error.message}`)
    }
  },

  async deleteFile(filePath) {
    try {
      if (!filePath) {
        throw new Error('File path is required')
      }
      const response = await api.delete(`/file/${filePath}`)
      return response.data
    } catch (error) {
      console.error(`Failed to delete file ${filePath}:`, error)
      throw new Error(`Failed to delete file: ${error.message}`)
    }
  },

  async renameFile(oldPath, newPath) {
    try {
      if (!oldPath || !newPath) {
        throw new Error('Both old and new file paths are required')
      }
      const response = await api.put(`/file/rename/${oldPath}`, { newFilePath: newPath })
      return response.data
    } catch (error) {
      console.error(`Failed to rename file ${oldPath} to ${newPath}:`, error)
      throw new Error(`Failed to rename file: ${error.message}`)
    }
  },

  async getCapabilityLinks() {
    try {
      const response = await api.get('/links/capabilities')
      return response.data
    } catch (error) {
      console.error('Failed to get capability links:', error)
      throw new Error(`Failed to load capability links: ${error.message}`)
    }
  },

  async getConfig() {
    try {
      const response = await api.get('/config/defaults')
      return response.data
    } catch (error) {
      console.error('Failed to get config:', error)
      // Don't throw for config errors - return empty defaults
      return {}
    }
  },

  async updateConfig(config) {
    try {
      if (!config || typeof config !== 'object') {
        throw new Error('Valid config object is required')
      }
      const response = await api.post('/config/defaults', config)
      return response.data
    } catch (error) {
      console.error('Failed to update config:', error)
      throw new Error(`Failed to update configuration: ${error.message}`)
    }
  },

  async saveCapabilityWithDependencies(filePath, content, capabilityId, upstreamDeps, downstreamDeps) {
    try {
      if (!filePath) throw new Error('File path is required')
      if (!content) throw new Error('Content is required')
      if (!capabilityId) throw new Error('Capability ID is required')
      
      const response = await api.post(`/capability-with-dependencies/${filePath}`, {
        content,
        capabilityId,
        upstreamDeps: upstreamDeps || [],
        downstreamDeps: downstreamDeps || []
      })
      return response.data
    } catch (error) {
      console.error('Failed to save capability with dependencies:', error)
      throw new Error(`Failed to save capability: ${error.message}`)
    }
  },

  async saveCapabilityWithEnablers(filePath, content, capabilityId, upstreamDeps, downstreamDeps, enablers) {
    try {
      if (!filePath) throw new Error('File path is required')
      if (!content) throw new Error('Content is required')
      if (!capabilityId) throw new Error('Capability ID is required')
      
      const response = await api.post(`/capability-with-enablers/${filePath}`, {
        content,
        capabilityId,
        upstreamDeps: upstreamDeps || [],
        downstreamDeps: downstreamDeps || [],
        enablers: enablers || []
      })
      return response.data
    } catch (error) {
      console.error('Failed to save capability with enablers:', error)
      throw new Error(`Failed to save capability: ${error.message}`)
    }
  },

  async saveEnablerWithReparenting(filePath, content, enablerData, originalCapabilityId) {
    try {
      if (!filePath) throw new Error('File path is required')
      if (!content) throw new Error('Content is required')
      if (!enablerData) throw new Error('Enabler data is required')
      
      const response = await api.post(`/enabler-with-reparenting/${filePath}`, {
        content,
        enablerData,
        originalCapabilityId
      })
      return response.data
    } catch (error) {
      console.error('Failed to save enabler with reparenting:', error)
      throw new Error(`Failed to save enabler: ${error.message}`)
    }
  },

  async analyzeForDiscovery(inputText) {
    try {
      if (!inputText) throw new Error('Input text is required')

      const response = await api.post('/discovery/analyze', {
        text: inputText
      })
      return response.data
    } catch (error) {
      console.error('Failed to analyze text for discovery:', error)
      throw new Error(`Failed to analyze text: ${error.message}`)
    }
  },

  async createFromDiscovery(type, documentData) {
    try {
      if (!type || !documentData) throw new Error('Type and document data are required')

      const response = await api.post('/discovery/create', {
        type,
        documentData
      })
      return response.data
    } catch (error) {
      console.error('Failed to create document from discovery:', error)
      throw new Error(`Failed to create ${type}: ${error.message}`)
    }
  }
}