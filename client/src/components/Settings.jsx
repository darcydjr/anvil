import React, { useState, useEffect } from 'react'
import { toast } from 'react-hot-toast'
import { useApp } from '../contexts/AppContext'
import { useTheme } from '../contexts/ThemeContext'
import { Plus, Trash2, Save, Settings as SettingsIcon, FolderOpen, Check, Edit2, ChevronDown, ChevronRight, Folder, Moon, Sun } from 'lucide-react'
import './Settings.css'

export default function Settings() {
  const { refreshData } = useApp()
  const { theme, toggleTheme, isDark } = useTheme()
  const [config, setConfig] = useState(null)
  const [workspaces, setWorkspaces] = useState({ workspaces: [], activeWorkspaceId: null })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Workspace form state
  const [newWorkspaceName, setNewWorkspaceName] = useState('')
  const [newWorkspaceDescription, setNewWorkspaceDescription] = useState('')
  const [newWorkspacePaths, setNewWorkspacePaths] = useState([''])
  const [newWorkspaceCopySwPlan, setNewWorkspaceCopySwPlan] = useState(true) // Default to true
  const [editingWorkspace, setEditingWorkspace] = useState(null)
  const [newProjectPath, setNewProjectPath] = useState('')
  const [editingWorkspaceId, setEditingWorkspaceId] = useState(null)
  const [editWorkspaceName, setEditWorkspaceName] = useState('')
  const [editWorkspaceDescription, setEditWorkspaceDescription] = useState('')
  const [editWorkspacePaths, setEditWorkspacePaths] = useState([])
  const [editWorkspaceCopySwPlan, setEditWorkspaceCopySwPlan] = useState(true) // Default to true
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [showEditForm, setShowEditForm] = useState(false)
  const [isBasicConfigExpanded, setIsBasicConfigExpanded] = useState(false)
  const [isDefaultValuesExpanded, setIsDefaultValuesExpanded] = useState(false)


  useEffect(() => {
    loadConfig()
    loadWorkspaces()
  }, [])

  const loadConfig = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/config')
      const data = await response.json()
      setConfig(data)
    } catch (error) {
      toast.error('Failed to load configuration')
      console.error('Error loading config:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadWorkspaces = async () => {
    try {
      const response = await fetch('/api/workspaces')
      const data = await response.json()
      setWorkspaces(data)
    } catch (error) {
      toast.error('Failed to load workspaces')
      console.error('Error loading workspaces:', error)
    }
  }

  const saveConfig = async () => {
    try {
      setSaving(true)
      const response = await fetch('/api/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(config)
      })

      if (!response.ok) {
        throw new Error('Failed to save configuration')
      }

      toast.success('Configuration saved successfully')
    } catch (error) {
      toast.error('Failed to save configuration')
      console.error('Error saving config:', error)
    } finally {
      setSaving(false)
    }
  }


  const updateConfigField = (field, value) => {
    setConfig({
      ...config,
      [field]: value
    })
  }

  const updateNestedConfigField = (section, field, value) => {
    setConfig({
      ...config,
      [section]: {
        ...config[section],
        [field]: value
      }
    })
  }

  // Workspace management functions
  const createWorkspace = async () => {
    const validPaths = newWorkspacePaths.filter(p => p && p.trim())
    if (!newWorkspaceName.trim() || validPaths.length === 0) {
      toast.error('Please provide workspace name and at least one project path')
      return
    }

    try {
      const response = await fetch('/api/workspaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newWorkspaceName.trim(),
          description: newWorkspaceDescription.trim(),
          projectPaths: validPaths.map(path => ({ path, icon: 'Folder' })),
          copySwPlan: newWorkspaceCopySwPlan
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create workspace')
      }

      setNewWorkspaceName('')
      setNewWorkspaceDescription('')
      setNewWorkspacePaths([''])
      setNewWorkspaceCopySwPlan(true)
      setShowCreateForm(false)
      await loadWorkspaces()
      toast.success('Workspace created successfully')
    } catch (error) {
      toast.error(error.message)
    }
  }

  const activateWorkspace = async (workspaceId) => {
    try {
      const response = await fetch(`/api/workspaces/${workspaceId}/activate`, {
        method: 'POST'
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to activate workspace')
      }

      await loadWorkspaces()

      // Refresh the main application data to load capabilities/enablers from new workspace
      refreshData()

      toast.success('Workspace activated')
    } catch (error) {
      toast.error(error.message)
    }
  }

  const deleteWorkspace = async (workspaceId) => {
    if (!confirm('Are you sure you want to delete this workspace?')) return

    try {
      const response = await fetch(`/api/workspaces/${workspaceId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete workspace')
      }

      await loadWorkspaces()
      toast.success('Workspace deleted')
    } catch (error) {
      toast.error(error.message)
    }
  }

  const addProjectPath = async (workspaceId) => {
    if (!newProjectPath.trim()) {
      toast.error('Please enter a project path')
      return
    }

    try {
      const response = await fetch(`/api/workspaces/${workspaceId}/paths`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: newProjectPath.trim() })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to add project path')
      }

      setNewProjectPath('')
      await loadWorkspaces()
      toast.success('Project path added')
    } catch (error) {
      toast.error(error.message)
    }
  }

  const removeProjectPath = async (workspaceId, pathToRemove) => {
    try {
      const response = await fetch(`/api/workspaces/${workspaceId}/paths`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: pathToRemove })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to remove project path')
      }

      await loadWorkspaces()
      toast.success('Project path removed')
    } catch (error) {
      toast.error(error.message)
    }
  }

  const updateWorkspacePath = (index, value) => {
    const updatedPaths = [...newWorkspacePaths]
    updatedPaths[index] = value
    setNewWorkspacePaths(updatedPaths)
  }


  const selectDirectory = async (callback) => {
    const manualPath = prompt(
      'Please enter the full absolute path to your project directory:\n\n' +
      'Examples:\n' +
      'Windows: C:\\Development\\MyProject\\specifications\n' +
      'Mac/Linux: /Users/username/Documents/MyProject/specifications'
    )

    if (manualPath && manualPath.trim()) {
      callback(manualPath.trim())
    }
  }

  const addWorkspacePath = () => {
    setNewWorkspacePaths([...newWorkspacePaths, ''])
  }

  const removeWorkspacePath = (index) => {
    // Allow removal of all paths - user can have workspace with no paths
    setNewWorkspacePaths(newWorkspacePaths.filter((_, i) => i !== index))
  }

  const updateWorkspace = async () => {
    if (!editWorkspaceName.trim()) {
      toast.error('Please provide a workspace name')
      return
    }

    const validPaths = editWorkspacePaths.filter(p => p && p.trim())

    try {
      const response = await fetch(`/api/workspaces/${editingWorkspaceId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editWorkspaceName.trim(),
          description: editWorkspaceDescription.trim(),
          projectPaths: validPaths.map(path => ({ path, icon: 'Folder' })),
          copySwPlan: editWorkspaceCopySwPlan
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update workspace')
      }

      setEditingWorkspaceId(null)
      setEditWorkspaceName('')
      setEditWorkspaceDescription('')
      setEditWorkspacePaths([])
      setEditWorkspaceCopySwPlan(true)
      setShowEditForm(false)
      await loadWorkspaces()
      toast.success('Workspace updated successfully')
    } catch (error) {
      toast.error(error.message)
    }
  }

  const startEditingWorkspace = (workspace) => {
    setEditingWorkspaceId(workspace.id)
    setEditWorkspaceName(workspace.name)
    setEditWorkspaceDescription(workspace.description || '')
    setEditWorkspaceCopySwPlan(workspace.copySwPlan !== false) // Default to true if not set

    // Convert paths to simple strings for editing
    const pathStrings = (workspace.projectPaths || []).map(pathItem => {
      if (typeof pathItem === 'string') {
        return pathItem
      }
      return pathItem.path || ''
    })
    setEditWorkspacePaths(pathStrings)
    setShowEditForm(true)
  }

  const updateEditWorkspacePath = (index, value) => {
    const updatedPaths = [...editWorkspacePaths]
    updatedPaths[index] = value
    setEditWorkspacePaths(updatedPaths)
  }


  const addEditWorkspacePath = () => {
    setEditWorkspacePaths([...editWorkspacePaths, ''])
  }

  const removeEditWorkspacePath = (index) => {
    setEditWorkspacePaths(editWorkspacePaths.filter((_, i) => i !== index))
  }

  if (loading) {
    return (
      <div className="settings-container">
        <div className="loading">Loading settings...</div>
      </div>
    )
  }

  if (!config) {
    return (
      <div className="settings-container">
        <div className="error">Failed to load configuration</div>
      </div>
    )
  }

  return (
    <div className="settings-container">
      <div className="settings-header">
        <div className="settings-title">
          <SettingsIcon size={24} />
          <h1>Settings</h1>
        </div>
      </div>

      <div className="settings-content">
        {/* Theme Settings */}
        <section className="settings-section">
          <h2>Appearance</h2>
          <p className="section-description">
            Choose between light and dark mode for the application interface.
          </p>
          <div className="form-group">
            <label>Theme</label>
            <div className="theme-toggle-container">
              <button
                onClick={toggleTheme}
                className="theme-toggle-button"
                title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
              >
                <div className="theme-toggle-option">
                  <Sun size={20} />
                  <span>Light</span>
                </div>
                <div className="theme-toggle-slider" data-active={!isDark}>
                  <div className="theme-toggle-thumb" />
                </div>
                <div className="theme-toggle-option">
                  <Moon size={20} />
                  <span>Dark</span>
                </div>
              </button>
            </div>
          </div>
        </section>

        {/* Basic Configuration */}
        <section className="settings-section">
          <div
            className="settings-section-header expandable"
            onClick={() => setIsBasicConfigExpanded(!isBasicConfigExpanded)}
          >
            <h2>Basic Configuration</h2>
            {isBasicConfigExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
          </div>

          {isBasicConfigExpanded && (
            <div className="settings-section-content">
              <div className="form-group">
                <label>Server Port</label>
                <input
                  type="number"
                  value={config.server?.port || 3000}
                  onChange={(e) => updateNestedConfigField('server', 'port', parseInt(e.target.value))}
                  className="form-input"
                />
              </div>
              <div className="section-save-actions">
                <button
                  onClick={saveConfig}
                  disabled={saving}
                  className="section-save-button"
                >
                  <Save size={16} />
                  {saving ? 'Saving...' : 'Save Basic Configuration'}
                </button>
              </div>
            </div>
          )}
        </section>

        {/* Default Values */}
        <section className="settings-section">
          <div
            className="settings-section-header expandable"
            onClick={() => setIsDefaultValuesExpanded(!isDefaultValuesExpanded)}
          >
            <h2>Default Values</h2>
            {isDefaultValuesExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
          </div>

          {isDefaultValuesExpanded && (
            <div className="settings-section-content">
              <div className="form-group">
                <label>Default Owner</label>
                <input
                  type="text"
                  value={config.defaults?.owner || ''}
                  onChange={(e) => updateNestedConfigField('defaults', 'owner', e.target.value)}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label>Analysis Review Default</label>
                <select
                  value={config.defaults?.analysisReview || 'Required'}
                  onChange={(e) => updateNestedConfigField('defaults', 'analysisReview', e.target.value)}
                  className="form-select"
                >
                  <option value="Required">Required</option>
                  <option value="Not Required">Not Required</option>
                </select>
              </div>

              <div className="form-group">
                <label>Code Review Default</label>
                <select
                  value={config.defaults?.codeReview || 'Not Required'}
                  onChange={(e) => updateNestedConfigField('defaults', 'codeReview', e.target.value)}
                  className="form-select"
                >
                  <option value="Required">Required</option>
                  <option value="Not Required">Not Required</option>
                </select>
              </div>
              <div className="section-save-actions">
                <button
                  onClick={saveConfig}
                  disabled={saving}
                  className="section-save-button"
                >
                  <Save size={16} />
                  {saving ? 'Saving...' : 'Save Default Values'}
                </button>
              </div>
            </div>
          )}
        </section>

        {/* Workspaces */}
        <section className="settings-section">
          <h2>Workspaces</h2>
          <p className="section-description">
            Workspaces organize your document collections. Each workspace can have multiple project paths where your capabilities and enablers are stored.
          </p>


          {/* Create New Workspace */}
          <div className="create-workspace-section">
            {showCreateForm && (
              <div className="workspace-form">
                <h3>Create New Workspace</h3>
                <div className="workspace-inputs">
                  <div className="form-group">
                    <label>Workspace Name</label>
                    <input
                      type="text"
                      value={newWorkspaceName}
                      onChange={(e) => setNewWorkspaceName(e.target.value)}
                      placeholder="e.g., Main Project"
                      className="form-input"
                    />
                  </div>
                  <div className="form-group">
                    <label>Description (Optional)</label>
                    <input
                      type="text"
                      value={newWorkspaceDescription}
                      onChange={(e) => setNewWorkspaceDescription(e.target.value)}
                      placeholder="e.g., Primary development workspace"
                      className="form-input"
                    />
                  </div>
                  <div className="form-group">
                    <label>
                      <input
                        type="checkbox"
                        checked={newWorkspaceCopySwPlan !== false} // Default to true if not set
                        onChange={(e) => setNewWorkspaceCopySwPlan(e.target.checked)}
                        className="form-checkbox"
                      />
                      Automatically copy SOFTWARE_DEVELOPMENT_PLAN.md to new project paths
                    </label>
                    <small className="form-help">
                      When enabled, SOFTWARE_DEVELOPMENT_PLAN.md will be automatically copied to new project paths in this workspace.
                    </small>
                  </div>
                  <div className="form-group">
                    <label>Project Paths</label>
                    {newWorkspacePaths.map((path, index) => (
                      <div key={index} className="path-input-group">
                        <div className="path-icon">
                          <Folder size={16} />
                        </div>
                        <input
                          type="text"
                          value={path}
                          onChange={(e) => updateWorkspacePath(index, e.target.value)}
                          placeholder="e.g., ../specifications"
                          className="form-input"
                        />
                        <button
                          type="button"
                          onClick={() => removeWorkspacePath(index)}
                          className="remove-path-button"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={addWorkspacePath}
                      className="add-path-button"
                    >
                      <Plus size={14} />
                      Add Path
                    </button>
                  </div>
                  <div className="form-actions">
                    <button
                      onClick={createWorkspace}
                      className="save-workspace-button"
                    >
                      <Save size={16} />
                      Save
                    </button>
                    <button
                      onClick={() => {
                        setShowCreateForm(false)
                        setNewWorkspaceName('')
                        setNewWorkspaceDescription('')
                        setNewWorkspacePaths([''])
                        setNewWorkspaceCopySwPlan(true)
                      }}
                      className="cancel-create-button"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Edit Workspace Form */}
            {showEditForm && (
              <div className="workspace-form">
                <h3>Edit Workspace</h3>
                <div className="workspace-inputs">
                  <div className="form-group">
                    <label>Workspace Name</label>
                    <input
                      type="text"
                      value={editWorkspaceName}
                      onChange={(e) => setEditWorkspaceName(e.target.value)}
                      placeholder="e.g., Main Project"
                      className="form-input"
                    />
                  </div>
                  <div className="form-group">
                    <label>Description (Optional)</label>
                    <input
                      type="text"
                      value={editWorkspaceDescription}
                      onChange={(e) => setEditWorkspaceDescription(e.target.value)}
                      placeholder="e.g., Primary development workspace"
                      className="form-input"
                    />
                  </div>
                  <div className="form-group">
                    <label>
                      <input
                        type="checkbox"
                        checked={editWorkspaceCopySwPlan !== false}
                        onChange={(e) => setEditWorkspaceCopySwPlan(e.target.checked)}
                        className="form-checkbox"
                      />
                      Automatically copy SOFTWARE_DEVELOPMENT_PLAN.md to new project paths
                    </label>
                    <small className="form-help">
                      When enabled, SOFTWARE_DEVELOPMENT_PLAN.md will be automatically copied to new project paths in this workspace.
                    </small>
                  </div>
                  <div className="form-group">
                    <label>Project Paths</label>
                    {editWorkspacePaths.map((path, index) => (
                      <div key={index} className="path-input-group">
                        <div className="path-icon">
                          <Folder size={16} />
                        </div>
                        <input
                          type="text"
                          value={path}
                          onChange={(e) => updateEditWorkspacePath(index, e.target.value)}
                          placeholder="e.g., ../specifications"
                          className="form-input"
                        />
                        <button
                          type="button"
                          onClick={() => removeEditWorkspacePath(index)}
                          className="remove-path-button"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={addEditWorkspacePath}
                      className="add-path-button"
                    >
                      <Plus size={14} />
                      Add Path
                    </button>
                  </div>
                  <div className="form-actions">
                    <button
                      onClick={updateWorkspace}
                      className="save-workspace-button"
                    >
                      <Save size={16} />
                      Save Changes
                    </button>
                    <button
                      onClick={() => {
                        setShowEditForm(false)
                        setEditingWorkspaceId(null)
                        setEditWorkspaceName('')
                        setEditWorkspaceDescription('')
                        setEditWorkspacePaths([])
                        setEditWorkspaceCopySwPlan(true)
                      }}
                      className="cancel-create-button"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Workspace List */}
          <div className="workspace-list">
            <h4>Workspaces</h4>
            <div className="table-container">
              <table className="editable-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Project Paths</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {workspaces.workspaces.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="no-workspaces-row">
                        No workspaces found. Use the button below to create one.
                      </td>
                    </tr>
                  ) : (
                    workspaces.workspaces
                      .sort((a, b) => {
                        // Put active workspace first
                        if (a.isActive && !b.isActive) return -1
                        if (!a.isActive && b.isActive) return 1
                        // Then sort alphabetically by name
                        return a.name.localeCompare(b.name)
                      })
                      .map((workspace) => (
                      <tr key={workspace.id}>
                        <td>{workspace.name}</td>
                        <td>
                          <div className="paths-mini-table">
                            <table className="mini-table">
                              <tbody>
                                {workspace.projectPaths.length === 0 ? (
                                  <tr>
                                    <td className="no-paths" colSpan="2">No paths configured</td>
                                  </tr>
                                ) : (
                                  workspace.projectPaths.map((pathItem, index) => {
                                    // Handle both string paths (legacy) and path objects with icons
                                    const pathStr = typeof pathItem === 'string'
                                      ? pathItem
                                      : pathItem.path

                                    return (
                                      <tr key={index}>
                                        <td className="path-value" colSpan="2">
                                          <span>{pathStr}</span>
                                        </td>
                                      </tr>
                                    )
                                  })
                                )}
                              </tbody>
                            </table>
                          </div>
                        </td>
                        <td>
                          <label className="workspace-status-selector">
                            <input
                              type="radio"
                              name="activeWorkspace"
                              checked={workspace.isActive}
                              onChange={() => {
                                if (!workspace.isActive) {
                                  activateWorkspace(workspace.id)
                                }
                              }}
                              className="workspace-radio"
                            />
                            <span className={`status-label ${workspace.isActive ? 'active' : 'inactive'}`}>
                              {workspace.isActive ? (
                                <>
                                  <Check size={12} />
                                  Active
                                </>
                              ) : (
                                'Inactive'
                              )}
                            </span>
                          </label>
                        </td>
                        <td>
                          <button
                            onClick={() => startEditingWorkspace(workspace)}
                            className="remove-row-btn"
                            title="Edit workspace"
                            style={{ background: '#6c757d' }}
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => deleteWorkspace(workspace.id)}
                            className="remove-row-btn"
                            disabled={workspace.isActive}
                            title={workspace.isActive ? "Cannot delete active workspace" : "Delete workspace"}
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
              <div className="table-actions">
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="add-row-btn"
                >
                  <Plus size={14} />
                  Add Workspace
                </button>
              </div>
            </div>
          </div>
        </section>


      </div>
    </div>
  )
}