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

import axios, { AxiosInstance, AxiosError } from 'axios'

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
}

export interface Capability {
  id: string
  name: string
  status: string
  approval: string
  priority: string
  owner: string
  path: string
  type: 'capability'
  system?: string
  component?: string
}

export interface Enabler {
  id: string
  name: string
  description: string
  status: string
  approval: string
  priority: string
  capabilityId: string
}

export interface Dependency {
  id: string
  description: string
}

export interface CapabilitiesResponse {
  capabilities: Capability[]
  enablers: Enabler[]
}

export interface CapabilitiesWithDependenciesResponse extends CapabilitiesResponse {
  dependencies?: {
    [capabilityId: string]: {
      upstream: Dependency[]
      downstream: Dependency[]
    }
  }
}

export interface FileResponse {
  content: string
  path: string
}

export interface RenameFileRequest {
  newFilePath: string
}

export interface CapabilityLink {
  id: string
  name: string
  path: string
}

export interface Config {
  owner?: string
  analysisReview?: string
  designReview?: string
  codeReview?: string
  [key: string]: any
}

export interface SaveCapabilityWithDependenciesRequest {
  content: string
  capabilityId: string
  upstreamDeps: Dependency[]
  downstreamDeps: Dependency[]
}

export interface SaveCapabilityWithEnablersRequest extends SaveCapabilityWithDependenciesRequest {
  enablers: Enabler[]
}

export interface EnablerData {
  id: string
  name: string
  capabilityId: string
  [key: string]: any
}

export interface SaveEnablerWithReparentingRequest {
  content: string
  enablerData: EnablerData
  originalCapabilityId?: string
}

export interface AnalyzeForDiscoveryRequest {
  text: string
}

export interface DiscoveryAnalysisResponse {
  analysis: any
  suggestions: any[]
}

export interface CreateFromDiscoveryRequest {
  type: string
  documentData: any
  context?: any
}

// Enhanced Error Type
interface EnhancedError extends Error {
  status?: number
  originalError?: AxiosError
}

// Configure axios defaults
const api: AxiosInstance = axios.create({
  baseURL: '/api',
  timeout: 10000
})

// Add response interceptor for consistent error handling
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    // Enhanced error information
    const enhancedError = new Error(
      (error.response?.data as any)?.error ||
      error.message ||
      'An unexpected error occurred'
    ) as EnhancedError
    enhancedError.status = error.response?.status
    enhancedError.originalError = error
    return Promise.reject(enhancedError)
  }
)

export const apiService = {
  async getCapabilities(): Promise<CapabilitiesResponse> {
    try {
      const response = await api.get<CapabilitiesResponse>('/capabilities')
      return response.data
    } catch (error) {
      console.error('Failed to get capabilities:', error)
      throw new Error(`Failed to load capabilities: ${(error as Error).message}`)
    }
  },

  async getCapabilitiesWithDependencies(): Promise<CapabilitiesWithDependenciesResponse> {
    try {
      const response = await api.get<CapabilitiesWithDependenciesResponse>('/capabilities-with-dependencies')
      return response.data
    } catch (error) {
      console.error('Failed to fetch capabilities with dependencies:', error)
      throw new Error(`Failed to fetch capabilities with dependencies: ${(error as Error).message}`)
    }
  },

  async getFile(filePath: string): Promise<FileResponse> {
    try {
      if (!filePath) {
        throw new Error('File path is required')
      }
      const response = await api.get<FileResponse>(`/file/${filePath}`)
      return response.data
    } catch (error) {
      console.error(`Failed to get file ${filePath}:`, error)
      throw new Error(`Failed to load file: ${(error as Error).message}`)
    }
  },

  async saveFile(filePath: string, content: string): Promise<ApiResponse> {
    try {
      if (!filePath) {
        throw new Error('File path is required')
      }
      if (content === undefined || content === null) {
        throw new Error('Content is required')
      }
      const response = await api.post<ApiResponse>(`/file/${filePath}`, { content })
      return response.data
    } catch (error) {
      console.error(`Failed to save file ${filePath}:`, error)
      throw new Error(`Failed to save file: ${(error as Error).message}`)
    }
  },

  async deleteFile(filePath: string): Promise<ApiResponse> {
    try {
      if (!filePath) {
        throw new Error('File path is required')
      }
      const response = await api.delete<ApiResponse>(`/file/${filePath}`)
      return response.data
    } catch (error) {
      console.error(`Failed to delete file ${filePath}:`, error)
      throw new Error(`Failed to delete file: ${(error as Error).message}`)
    }
  },

  async renameFile(oldPath: string, newPath: string): Promise<ApiResponse> {
    try {
      if (!oldPath || !newPath) {
        throw new Error('Both old and new file paths are required')
      }
      const response = await api.put<ApiResponse>(`/file/rename/${oldPath}`, { newFilePath: newPath })
      return response.data
    } catch (error) {
      console.error(`Failed to rename file ${oldPath} to ${newPath}:`, error)
      throw new Error(`Failed to rename file: ${(error as Error).message}`)
    }
  },

  async getCapabilityLinks(): Promise<CapabilityLink[]> {
    try {
      const response = await api.get<CapabilityLink[]>('/links/capabilities')
      return response.data
    } catch (error) {
      console.error('Failed to get capability links:', error)
      throw new Error(`Failed to load capability links: ${(error as Error).message}`)
    }
  },

  async getConfig(): Promise<Config> {
    try {
      const response = await api.get<Config>('/config/defaults')
      return response.data
    } catch (error) {
      console.error('Failed to get config:', error)
      // Don't throw for config errors - return empty defaults
      return {}
    }
  },

  async updateConfig(config: Config): Promise<ApiResponse<Config>> {
    try {
      if (!config || typeof config !== 'object') {
        throw new Error('Valid config object is required')
      }
      const response = await api.post<ApiResponse<Config>>('/config/defaults', config)
      return response.data
    } catch (error) {
      console.error('Failed to update config:', error)
      throw new Error(`Failed to update configuration: ${(error as Error).message}`)
    }
  },

  async saveCapabilityWithDependencies(
    filePath: string,
    content: string,
    capabilityId: string,
    upstreamDeps: Dependency[],
    downstreamDeps: Dependency[]
  ): Promise<ApiResponse> {
    try {
      if (!filePath) throw new Error('File path is required')
      if (!content) throw new Error('Content is required')
      if (!capabilityId) throw new Error('Capability ID is required')

      const response = await api.post<ApiResponse>(`/capability-with-dependencies/${filePath}`, {
        content,
        capabilityId,
        upstreamDeps: upstreamDeps || [],
        downstreamDeps: downstreamDeps || []
      })
      return response.data
    } catch (error) {
      console.error('Failed to save capability with dependencies:', error)
      throw new Error(`Failed to save capability: ${(error as Error).message}`)
    }
  },

  async saveCapabilityWithEnablers(
    filePath: string,
    content: string,
    capabilityId: string,
    upstreamDeps: Dependency[],
    downstreamDeps: Dependency[],
    enablers: Enabler[]
  ): Promise<ApiResponse> {
    try {
      if (!filePath) throw new Error('File path is required')
      if (!content) throw new Error('Content is required')
      if (!capabilityId) throw new Error('Capability ID is required')

      const response = await api.post<ApiResponse>(`/capability-with-enablers/${filePath}`, {
        content,
        capabilityId,
        upstreamDeps: upstreamDeps || [],
        downstreamDeps: downstreamDeps || [],
        enablers: enablers || []
      })
      return response.data
    } catch (error) {
      console.error('Failed to save capability with enablers:', error)
      throw new Error(`Failed to save capability: ${(error as Error).message}`)
    }
  },

  async saveEnablerWithReparenting(
    filePath: string,
    content: string,
    enablerData: EnablerData,
    originalCapabilityId?: string
  ): Promise<ApiResponse> {
    try {
      if (!filePath) throw new Error('File path is required')
      if (!content) throw new Error('Content is required')
      if (!enablerData) throw new Error('Enabler data is required')

      const response = await api.post<ApiResponse>(`/enabler-with-reparenting/${filePath}`, {
        content,
        enablerData,
        originalCapabilityId
      })
      return response.data
    } catch (error) {
      console.error('Failed to save enabler with reparenting:', error)
      throw new Error(`Failed to save enabler: ${(error as Error).message}`)
    }
  },

  async analyzeForDiscovery(inputText: string): Promise<DiscoveryAnalysisResponse> {
    try {
      if (!inputText) throw new Error('Input text is required')

      const response = await api.post<DiscoveryAnalysisResponse>('/discovery/analyze', {
        text: inputText
      })
      return response.data
    } catch (error) {
      console.error('Failed to analyze text for discovery:', error)
      throw new Error(`Failed to analyze text: ${(error as Error).message}`)
    }
  },

  async createFromDiscovery(type: string, documentData: any, context: any = {}): Promise<ApiResponse> {
    try {
      if (!type || !documentData) throw new Error('Type and document data are required')

      const response = await api.post<ApiResponse>('/discovery/create', {
        type,
        documentData,
        context
      })
      return response.data
    } catch (error) {
      console.error('Failed to create document from discovery:', error)
      throw new Error(`Failed to create ${type}: ${(error as Error).message}`)
    }
  }
}
