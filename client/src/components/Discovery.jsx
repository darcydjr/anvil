import React, { useState } from 'react'
import { Lightbulb, FileText, Zap, Eye, EyeOff, Send, Loader, AlertCircle } from 'lucide-react'
import { marked } from 'marked'
import { apiService } from '../services/apiService'
import toast from 'react-hot-toast'
import './Discovery.css'

export default function Discovery() {
  const [inputText, setInputText] = useState('')
  const [previewMode, setPreviewMode] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [results, setResults] = useState(null)

  const handleAnalyze = async () => {
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
      toast.error(`Analysis failed: ${error.message}`)
    } finally {
      setAnalyzing(false)
    }
  }

  const handleCreateDocuments = async () => {
    if (!results) return

    try {
      // Create capabilities and enablers based on analysis results
      for (const capability of results.capabilities || []) {
        await apiService.createFromDiscovery('capability', capability)
      }

      for (const enabler of results.enablers || []) {
        await apiService.createFromDiscovery('enabler', enabler)
      }

      toast.success(`Created ${results.capabilities?.length || 0} capabilities and ${results.enablers?.length || 0} enablers`)
      setResults(null)
      setInputText('')
    } catch (error) {
      console.error('Document creation failed:', error)
      toast.error(`Failed to create documents: ${error.message}`)
    }
  }

  const renderPreview = () => {
    try {
      return { __html: marked(inputText) }
    } catch (error) {
      return { __html: '<p>Invalid markdown</p>' }
    }
  }

  return (
    <div className="discovery-container">
      <div className="discovery-header">
        <div className="discovery-title">
          <Lightbulb size={24} />
          <h1>Discovery</h1>
        </div>
        <div className="discovery-notice">
          <AlertCircle size={20} />
          <p className="discovery-notice-text">
            <strong>Feature Not Yet Implemented:</strong> This Discovery feature is currently under development.
            The AI analysis and document generation functionality will be available in a future release.
          </p>
        </div>
        <p className="discovery-subtitle">
          Enter or paste text/markdown describing your project requirements. AI will analyze and generate Capabilities, Enablers, and Requirements.
        </p>
      </div>

      <div className="discovery-content">
        <div className="input-section">
          <div className="input-header">
            <div className="input-tabs">
              <button
                className={`tab ${!previewMode ? 'active' : ''}`}
                onClick={() => setPreviewMode(false)}
              >
                <FileText size={16} />
                Edit
              </button>
              <button
                className={`tab ${previewMode ? 'active' : ''}`}
                onClick={() => setPreviewMode(true)}
              >
                {previewMode ? <Eye size={16} /> : <EyeOff size={16} />}
                Preview
              </button>
            </div>
            <button
              className="analyze-button"
              onClick={handleAnalyze}
              disabled={analyzing || !inputText.trim()}
            >
              {analyzing ? (
                <>
                  <Loader size={16} className="spinning" />
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

          <div className="input-content">
            {previewMode ? (
              <div
                className="markdown-preview"
                dangerouslySetInnerHTML={renderPreview()}
              />
            ) : (
              <textarea
                className="discovery-input"
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
          <div className="results-section">
            <div className="results-header">
              <h2>Analysis Results</h2>
              <button
                className="create-documents-button"
                onClick={handleCreateDocuments}
              >
                <Send size={16} />
                Create Documents
              </button>
            </div>

            <div className="results-content">
              {results.capabilities && results.capabilities.length > 0 && (
                <div className="result-group">
                  <h3>Capabilities ({results.capabilities.length})</h3>
                  <div className="result-items">
                    {results.capabilities.map((cap, index) => (
                      <div key={index} className="result-item capability-item">
                        <h4>{cap.name}</h4>
                        <p>{cap.description}</p>
                        {cap.enablers && cap.enablers.length > 0 && (
                          <div className="nested-enablers">
                            <strong>Enablers:</strong> {cap.enablers.join(', ')}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {results.enablers && results.enablers.length > 0 && (
                <div className="result-group">
                  <h3>Enablers ({results.enablers.length})</h3>
                  <div className="result-items">
                    {results.enablers.map((enabler, index) => (
                      <div key={index} className="result-item enabler-item">
                        <h4>{enabler.name}</h4>
                        <p>{enabler.description}</p>
                        {enabler.requirements && enabler.requirements.length > 0 && (
                          <div className="nested-requirements">
                            <strong>Requirements:</strong>
                            <ul>
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
                <div className="result-group">
                  <h3>Analysis Summary</h3>
                  <div className="result-summary">
                    <p>{results.summary}</p>
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