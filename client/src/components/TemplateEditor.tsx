import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { apiService } from '../services/apiService'
import { Save, ArrowLeft } from 'lucide-react'
import toast from 'react-hot-toast'
import './DocumentEditor.css'

export default function TemplateEditor(): JSX.Element {
  const { '*': path } = useParams<{ '*': string }>()
  const navigate = useNavigate()

  const [markdownContent, setMarkdownContent] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(true)
  const [saving, setSaving] = useState<boolean>(false)

  useEffect(() => {
    loadTemplate()
  }, [path])

  const loadTemplate = async (): Promise<void> => {
    if (!path) return

    try {
      setLoading(true)
      const data = await apiService.getFile(path)
      setMarkdownContent(data.content)
    } catch (err) {
      console.error('Error loading template:', err)
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      toast.error(`Failed to load template: ${errorMessage}`)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (): Promise<void> => {
    if (!path) return

    try {
      setSaving(true)
      await apiService.saveFile(path, markdownContent)
      toast.success('Template saved successfully')
    } catch (err) {
      console.error('Error saving template:', err)
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      toast.error(`Failed to save template: ${errorMessage}`)
    } finally {
      setSaving(false)
    }
  }

  const handleBack = (): void => {
    navigate(`/view/template/${path}`)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>): void => {
    if (e.ctrlKey && e.key === 's') {
      e.preventDefault()
      handleSave()
    }
    if (e.key === 'Escape') {
      handleBack()
    }
  }

  if (loading) {
    return (
      <div className="document-loading">
        <div className="spinner"></div>
        <p>Loading template...</p>
      </div>
    )
  }

  return (
    <div className="document-editor">
      {/* Sticky toolbar */}
      <div className="editor-toolbar">
        <div className="toolbar-group">
          <button
            onClick={handleBack}
            className="btn btn-secondary btn-sm"
          >
            <ArrowLeft size={16} />
            Back
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn btn-primary btn-sm"
          >
            <Save size={16} />
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      {/* Markdown editor */}
      <div className="editor-content">
        <div className="markdown-editor">
          <textarea
            value={markdownContent}
            onChange={(e) => setMarkdownContent(e.target.value)}
            onKeyDown={handleKeyDown}
            className="markdown-textarea"
            placeholder="Edit template markdown content..."
            autoFocus
          />
        </div>
      </div>
    </div>
  )
}
