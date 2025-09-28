import React, { useState, useEffect } from 'react'
import { toast } from 'react-hot-toast'
import { useApp } from '../contexts/AppContext'
import { Plus, Trash2, Save, Settings as SettingsIcon, FolderOpen, Check, Edit2, ChevronDown, ChevronRight,
         Folder, BookOpen, FileText, Database, Package, GitBranch, Code, Zap, Target, Star,
         Layers, Box, Component, Archive, Briefcase, Building } from 'lucide-react'
import './Settings.css'

export default function Settings() {
  const { refreshData } = useApp()
  const [config, setConfig] = useState(null)
  const [workspaces, setWorkspaces] = useState({ workspaces: [], activeWorkspaceId: null })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [newImportPath, setNewImportPath] = useState('')
  const [newImportName, setNewImportName] = useState('')

  // Workspace form state
  const [newWorkspaceName, setNewWorkspaceName] = useState('')
  const [newWorkspaceDescription, setNewWorkspaceDescription] = useState('')
  const [newWorkspacePaths, setNewWorkspacePaths] = useState([{ path: '', icon: 'Folder' }])
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

  // Available icons for project paths
  const availableIcons = [
    { name: 'Folder', component: Folder, label: 'Folder' },
    { name: 'BookOpen', component: BookOpen, label: 'Documentation' },
    { name: 'FileText', component: FileText, label: 'Files' },
    { name: 'Database', component: Database, label: 'Database' },
    { name: 'Package', component: Package, label: 'Package' },
    { name: 'GitBranch', component: GitBranch, label: 'Git Branch' },
    { name: 'Code', component: Code, label: 'Code' },
    { name: 'Zap', component: Zap, label: 'API' },
    { name: 'Target', component: Target, label: 'Requirements' },
    { name: 'Star', component: Star, label: 'Important' },
    { name: 'Layers', component: Layers, label: 'Architecture' },
    { name: 'Component', component: Component, label: 'Components' },
    { name: 'Archive', component: Archive, label: 'Archive' },
    { name: 'Briefcase', component: Briefcase, label: 'Business' },
    { name: 'Building', component: Building, label: 'Organization' }
  ]

  // Helper function to get icon component by name
  const getIconComponent = (iconName) => {
    const iconConfig = availableIcons.find(icon => icon.name === iconName)
    return iconConfig ? iconConfig.component : Folder
  }

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

  const addImportedComponent = () => {
    if (!newImportName.trim() || !newImportPath.trim()) {
      toast.error('Please provide both name and path for the imported component')
      return
    }

    if (!config.importedComponents) {
      config.importedComponents = []
    }

    // Check for duplicate names
    if (config.importedComponents.some(comp => comp.name === newImportName.trim())) {
      toast.error('A component with this name already exists')
      return
    }

    const newComponent = {
      id: Date.now().toString(),
      name: newImportName.trim(),
      path: newImportPath.trim(),
      enabled: true,
      addedDate: new Date().toISOString()
    }

    setConfig({
      ...config,
      importedComponents: [...config.importedComponents, newComponent]
    })

    setNewImportName('')
    setNewImportPath('')
    toast.success('Imported component added')
  }

  const removeImportedComponent = (id) => {
    if (!config.importedComponents) return

    setConfig({
      ...config,
      importedComponents: config.importedComponents.filter(comp => comp.id !== id)
    })
    toast.success('Imported component removed')
  }

  const toggleComponentEnabled = (id) => {
    if (!config.importedComponents) return

    setConfig({
      ...config,
      importedComponents: config.importedComponents.map(comp =>
        comp.id === id ? { ...comp, enabled: !comp.enabled } : comp
      )
    })
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
    const validPaths = newWorkspacePaths.filter(p => p.path && p.path.trim())
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
          projectPaths: validPaths,
          copySwPlan: newWorkspaceCopySwPlan
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create workspace')
      }

      setNewWorkspaceName('')
      setNewWorkspaceDescription('')
      setNewWorkspacePaths([{ path: '', icon: 'Folder' }])
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
    updatedPaths[index] = { ...updatedPaths[index], path: value }
    setNewWorkspacePaths(updatedPaths)
  }

  const updateWorkspacePathIcon = (index, iconName) => {
    const updatedPaths = [...newWorkspacePaths]
    updatedPaths[index] = { ...updatedPaths[index], icon: iconName }
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
    setNewWorkspacePaths([...newWorkspacePaths, { path: '', icon: 'Folder' }])
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

    const validPaths = editWorkspacePaths.filter(p => p.path && p.path.trim())

    try {
      const response = await fetch(`/api/workspaces/${editingWorkspaceId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editWorkspaceName.trim(),
          description: editWorkspaceDescription.trim(),
          projectPaths: validPaths,
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

    // Convert paths to path objects if they're still strings (backward compatibility)
    const pathObjects = (workspace.projectPaths || []).map(pathItem => {
      if (typeof pathItem === 'string') {
        return { path: pathItem, icon: 'Folder' }
      }
      return pathItem
    })
    setEditWorkspacePaths(pathObjects)
    setShowEditForm(true)
  }

  const updateEditWorkspacePath = (index, value) => {
    const updatedPaths = [...editWorkspacePaths]
    updatedPaths[index] = { ...updatedPaths[index], path: value }
    setEditWorkspacePaths(updatedPaths)
  }

  const updateEditWorkspacePathIcon = (index, iconName) => {
    const updatedPaths = [...editWorkspacePaths]
    updatedPaths[index] = { ...updatedPaths[index], icon: iconName }
    setEditWorkspacePaths(updatedPaths)
  }

  const addEditWorkspacePath = () => {
    setEditWorkspacePaths([...editWorkspacePaths, { path: '', icon: 'Folder' }])
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
                    {newWorkspacePaths.map((pathObj, index) => (
                      <div key={index} className="path-input-group">
                        <div className="path-icon-selector">
                          <select
                            value={pathObj.icon}
                            onChange={(e) => updateWorkspacePathIcon(index, e.target.value)}
                            className="icon-select"
                            title="Select icon for this path"
                          >
                            {availableIcons.map(icon => (
                              <option key={icon.name} value={icon.name}>
                                {icon.label}
                              </option>
                            ))}
                          </select>
                          <div className="icon-preview">
                            {React.createElement(getIconComponent(pathObj.icon), { size: 16 })}
                          </div>
                        </div>
                        <input
                          type="text"
                          value={pathObj.path}
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
                        setNewWorkspacePaths([{ path: '', icon: 'Folder' }])
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
                    {editWorkspacePaths.map((pathObj, index) => (
                      <div key={index} className="path-input-group">
                        <div className="path-icon-selector">
                          <select
                            value={pathObj.icon}
                            onChange={(e) => updateEditWorkspacePathIcon(index, e.target.value)}
                            className="icon-select"
                            title="Select icon for this path"
                          >
                            {availableIcons.map(icon => (
                              <option key={icon.name} value={icon.name}>
                                {icon.label}
                              </option>
                            ))}
                          </select>
                          <div className="icon-preview">
                            {React.createElement(getIconComponent(pathObj.icon), { size: 16 })}
                          </div>
                        </div>
                        <input
                          type="text"
                          value={pathObj.path}
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
                    <th>Description</th>
                    <th>Project Paths</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {workspaces.workspaces.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="no-workspaces-row">
                        No workspaces found. Use the button below to create one.
                      </td>
                    </tr>
                  ) : (
                    workspaces.workspaces.map((workspace) => (
                      <tr key={workspace.id}>
                        <td>{workspace.name}</td>
                        <td>{workspace.description || '—'}</td>
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
                                    const pathObj = typeof pathItem === 'string'
                                      ? { path: pathItem, icon: 'Folder' }
                                      : pathItem
                                    const IconComponent = getIconComponent(pathObj.icon)

                                    return (
                                      <tr key={index}>
                                        <td className="path-value" colSpan="2">
                                          <IconComponent size={12} />
                                          <span>{pathObj.path}</span>
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

        {/* Imported Components */}
        <section className="settings-section">
          <h2>Imported Components</h2>
          <p className="section-description">
            Import specifications from other Anvil projects to view and reference their capabilities and enablers.
          </p>

          {/* Add New Import */}
          <div className="import-form">
            <h3>Add New Import</h3>
            <div className="import-inputs">
              <div className="form-group">
                <label>Component Name</label>
                <input
                  type="text"
                  value={newImportName}
                  onChange={(e) => setNewImportName(e.target.value)}
                  placeholder="e.g., Authentication Service"
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label>Specifications Path</label>
                <input
                  type="text"
                  value={newImportPath}
                  onChange={(e) => setNewImportPath(e.target.value)}
                  placeholder="e.g., /path/to/other-project/specifications"
                  className="form-input"
                />
              </div>
              <button
                onClick={addImportedComponent}
                className="add-import-button"
              >
                <Plus size={16} />
                Add Import
              </button>
            </div>
          </div>

          {/* Imported Components List */}
          <div className="imported-components-list">
            <h3>Current Imports</h3>
            {!config.importedComponents || config.importedComponents.length === 0 ? (
              <div className="no-imports">
                No imported components. Add one above to get started.
              </div>
            ) : (
              <div className="imports-table">
                <table>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Path</th>
                      <th>Status</th>
                      <th>Added</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {config.importedComponents.map((component) => (
                      <tr key={component.id}>
                        <td>{component.name}</td>
                        <td className="path-cell">{component.path}</td>
                        <td>
                          <label className="toggle-switch">
                            <input
                              type="checkbox"
                              checked={component.enabled}
                              onChange={() => toggleComponentEnabled(component.id)}
                            />
                            <span className="toggle-slider"></span>
                          </label>
                          <span className={`status-text ${component.enabled ? 'enabled' : 'disabled'}`}>
                            {component.enabled ? 'Enabled' : 'Disabled'}
                          </span>
                        </td>
                        <td>{new Date(component.addedDate).toLocaleDateString()}</td>
                        <td>
                          <button
                            onClick={() => removeImportedComponent(component.id)}
                            className="remove-button"
                            title="Remove import"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        {/* Templates Configuration */}
        <section className="settings-section">
          <h2>Templates Configuration</h2>
          <p className="section-description">
            Templates are shared across all workspaces and define the structure for new documents.
          </p>

          <div className="form-group">
            <label>Templates Path</label>
            <input
              type="text"
              value={config.templates || ''}
              onChange={(e) => updateConfigField('templates', e.target.value)}
              className="form-input"
              placeholder="./templates"
            />
          </div>
        </section>
      </div>
    </div>
  )
}