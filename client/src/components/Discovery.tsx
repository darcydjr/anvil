import React, { useState } from 'react'
import { Lightbulb, FileText, Zap, Eye, EyeOff, Send, Loader, AlertCircle } from 'lucide-react'
import { marked } from 'marked'
import { apiService } from '../services/apiService'
import toast from 'react-hot-toast'

interface DiscoveryCapability {
  id: string
  name: string
  description: string
  enablers?: string[]
}

interface DiscoveryEnabler {
  id: string
  name: string
  description: string
  capabilityId?: string
  requirements?: string[]
}

interface DiscoveryResults {
  capabilities?: DiscoveryCapability[]
  enablers?: DiscoveryEnabler[]
  summary?: string
}

export default function Discovery(): JSX.Element {
  const [inputText, setInputText] = useState<string>('')
  const [previewMode, setPreviewMode] = useState<boolean>(false)
  const [analyzing, setAnalyzing] = useState<boolean>(false)
  const [results, setResults] = useState<DiscoveryResults | null>(null)

  const handleAnalyze = async (): Promise<void> => {
    if (!inputText.trim()) {
      toast.error('Please enter some text to analyze')
      return
    }

    setAnalyzing(true)
    try {
      const response = await apiService.analyzeForDiscovery(inputText)
      setResults(response)
      toast.success('Analysis completed successfully!')
    } catch (error) {
      console.error('Discovery analysis failed:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      toast.error(`Analysis failed: ${errorMessage}`)
    } finally {
      setAnalyzing(false)
    }
  }

  const handleCreateDocuments = async (): Promise<void> => {
    if (!results) return

    try {
      const createdCapabilities: Array<{ id: string; path: string | null }> = []

      // Create capabilities first to establish context
      for (const capability of results.capabilities || []) {
        const result = await apiService.createFromDiscovery('capability', capability)
        createdCapabilities.push({
          id: capability.id,
          path: result.fileName ? `specifications/${result.fileName}` : null
        })
      }

      // Create enablers with capability context
      for (const enabler of results.enablers || []) {
        let context: Record<string, string> = {}

        // Try to find matching capability for this enabler
        if (enabler.capabilityId) {
          const matchingCap = createdCapabilities.find(cap => cap.id === enabler.capabilityId)
          if (matchingCap && matchingCap.path) {
            context.parentCapabilityPath = matchingCap.path
          }
        } else if (createdCapabilities.length === 1) {
          // If only one capability was created, associate enabler with it
          context.parentCapabilityPath = createdCapabilities[0].path || ''
        }

        await apiService.createFromDiscovery('enabler', enabler, context)
      }

      toast.success(`Created ${results.capabilities?.length || 0} capabilities and ${results.enablers?.length || 0} enablers`)
      setResults(null)
      setInputText('')
    } catch (error) {
      console.error('Document creation failed:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      toast.error(`Failed to create documents: ${errorMessage}`)
    }
  }

  const renderPreview = (): { __html: string } => {
    try {
      return { __html: marked(inputText) }
    } catch (error) {
      return { __html: '<p>Invalid markdown</p>' }
    }
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-4">
          <Lightbulb size={24} className="text-chart-4" />
          <h1 className="text-3xl font-bold text-foreground">Discovery</h1>
        </div>
        <div className="bg-chart-4/10 border border-chart-4/30 rounded-lg p-4 flex items-start gap-3 mb-4">
          <AlertCircle size={20} className="text-chart-4 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-foreground">
            <strong>Feature Not Yet Implemented:</strong> This Discovery feature is currently under development.
            The AI analysis and document generation functionality will be available in a future release.
          </p>
        </div>
        <p className="text-muted-foreground">
          Enter or paste text/markdown describing your project requirements. AI will analyze and generate Capabilities, Enablers, and Requirements.
        </p>
      </div>

      <div className="space-y-6">
        <div className="bg-card rounded-lg shadow-md border border-border">
          <div className="border-b border-border p-4 flex items-center justify-between">
            <div className="flex rounded-md border border-border overflow-hidden">
              <button
                className={`flex items-center gap-2 px-4 py-2 text-sm ${!previewMode ? 'bg-primary text-primary-foreground' : 'bg-background text-foreground hover:bg-accent hover:text-accent-foreground'} transition-colors`}
                onClick={() => setPreviewMode(false)}
              >
                <FileText size={16} />
                Edit
              </button>
              <button
                className={`flex items-center gap-2 px-4 py-2 text-sm border-l border-border ${previewMode ? 'bg-primary text-primary-foreground' : 'bg-background text-foreground hover:bg-accent hover:text-accent-foreground'} transition-colors`}
                onClick={() => setPreviewMode(true)}
              >
                {previewMode ? <Eye size={16} /> : <EyeOff size={16} />}
                Preview
              </button>
            </div>
            <button
              className="flex items-center gap-2 px-4 py-2 bg-chart-3 text-white rounded-md hover:bg-chart-3/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={handleAnalyze}
              disabled={analyzing || !inputText.trim()}
            >
              {analyzing ? (
                <>
                  <Loader size={16} className="animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Zap size={16} />
                  Analyze with AI
                </>
              )}
            </button>
          </div>

          <div className="p-6">
            {previewMode ? (
              <div
                className="markdown-content"
                dangerouslySetInnerHTML={renderPreview()}
              />
            ) : (
              <textarea
                className="w-full h-96 px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring text-foreground font-mono text-sm resize-none placeholder:text-muted-foreground"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Enter your project description, requirements, or paste markdown here...

Example:
# E-commerce Platform
We need to build an online shopping platform with user authentication, product catalog, shopping cart, and payment processing.

## Key Features
- User registration and login
- Product browsing and search
- Shopping cart management
- Secure payment processing
- Order tracking

## Technical Requirements
- Mobile responsive design
- High performance and scalability
- Secure data handling"
                rows={20}
              />
            )}
          </div>
        </div>

        {results && (
          <div className="bg-card rounded-lg shadow-md border border-border p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold text-foreground">Analysis Results</h2>
              <button
                className="flex items-center gap-2 px-4 py-2 bg-chart-2 text-white rounded-md hover:bg-chart-2/90 transition-colors"
                onClick={handleCreateDocuments}
              >
                <Send size={16} />
                Create Documents
              </button>
            </div>

            <div className="space-y-6">
              {results.capabilities && results.capabilities.length > 0 && (
                <div>
                  <h3 className="text-xl font-semibold text-foreground mb-4">Capabilities ({results.capabilities.length})</h3>
                  <div className="space-y-4">
                    {results.capabilities.map((cap, index) => (
                      <div key={index} className="bg-primary/10 border border-primary/30 rounded-lg p-4">
                        <h4 className="text-lg font-semibold text-foreground mb-2">{cap.name}</h4>
                        <p className="text-foreground mb-2">{cap.description}</p>
                        {cap.enablers && cap.enablers.length > 0 && (
                          <div className="text-sm text-muted-foreground">
                            <strong>Enablers:</strong> {cap.enablers.join(', ')}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {results.enablers && results.enablers.length > 0 && (
                <div>
                  <h3 className="text-xl font-semibold text-foreground mb-4">Enablers ({results.enablers.length})</h3>
                  <div className="space-y-4">
                    {results.enablers.map((enabler, index) => (
                      <div key={index} className="bg-chart-2/10 border border-chart-2/30 rounded-lg p-4">
                        <h4 className="text-lg font-semibold text-foreground mb-2">{enabler.name}</h4>
                        <p className="text-foreground mb-2">{enabler.description}</p>
                        {enabler.requirements && enabler.requirements.length > 0 && (
                          <div className="text-sm text-muted-foreground">
                            <strong>Requirements:</strong>
                            <ul className="list-disc list-inside mt-2 space-y-1">
                              {enabler.requirements.map((req, reqIndex) => (
                                <li key={reqIndex}>{req}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {results.summary && (
                <div>
                  <h3 className="text-xl font-semibold text-foreground mb-4">Analysis Summary</h3>
                  <div className="bg-muted border border-border rounded-lg p-4">
                    <p className="text-foreground">{results.summary}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
