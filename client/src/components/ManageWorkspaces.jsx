import React, { useState, useEffect } from 'react'
import { toast } from 'react-hot-toast'
import { useApp } from '../contexts/AppContext'
import { Plus, Trash2, Save, Edit2, Check, Folder, FolderOpen } from 'lucide-react'

export default function ManageWorkspaces() {
  const { loadWorkspaces } = useApp()
  const [workspaces, setWorkspaces] = useState({ workspaces: [], activeWorkspaceId: null })
  const [loading, setLoading] = useState(true)

  // Workspace form state
  const [newWorkspaceName, setNewWorkspaceName] = useState('')
  const [newWorkspaceDescription, setNewWorkspaceDescription] = useState('')
  const [newWorkspacePaths, setNewWorkspacePaths] = useState([''])
  const [newWorkspaceCopySwPlan, setNewWorkspaceCopySwPlan] = useState(true)
  const [editingWorkspaceId, setEditingWorkspaceId] = useState(null)
  const [editWorkspaceName, setEditWorkspaceName] = useState('')
  const [editWorkspaceDescription, setEditWorkspaceDescription] = useState('')
  const [editWorkspacePaths, setEditWorkspacePaths] = useState([])
  const [editWorkspaceCopySwPlan, setEditWorkspaceCopySwPlan] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [showEditForm, setShowEditForm] = useState(false)

  useEffect(() => {
    loadWorkspacesData()
  }, [])

  const loadWorkspacesData = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/workspaces')
      const data = await response.json()
      setWorkspaces(data)
    } catch (error) {
      toast.error('Failed to load workspaces')
      console.error('Error loading workspaces:', error)
    } finally {
      setLoading(false)
    }
  }

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
      await loadWorkspacesData()
      loadWorkspaces() // Update global context
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

      await loadWorkspacesData()
      loadWorkspaces() // Update global context
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

      await loadWorkspacesData()
      loadWorkspaces() // Update global context
      toast.success('Workspace deleted')
    } catch (error) {
      toast.error(error.message)
    }
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
      await loadWorkspacesData()
      loadWorkspaces() // Update global context
      toast.success('Workspace updated successfully')
    } catch (error) {
      toast.error(error.message)
    }
  }

  const startEditingWorkspace = (workspace) => {
    setEditingWorkspaceId(workspace.id)
    setEditWorkspaceName(workspace.name)
    setEditWorkspaceDescription(workspace.description || '')
    setEditWorkspaceCopySwPlan(workspace.copySwPlan !== false)

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

  const updateWorkspacePath = (index, value) => {
    const updatedPaths = [...newWorkspacePaths]
    updatedPaths[index] = value
    setNewWorkspacePaths(updatedPaths)
  }

  const addWorkspacePath = () => {
    setNewWorkspacePaths([...newWorkspacePaths, ''])
  }

  const removeWorkspacePath = (index) => {
    setNewWorkspacePaths(newWorkspacePaths.filter((_, i) => i !== index))
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
      <div className="max-w-7xl mx-auto p-6">
        <div className="text-center text-muted-foreground">Loading workspaces...</div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <FolderOpen size={28} className="text-primary" />
          <h1 className="text-3xl font-bold text-foreground">Manage Workspaces</h1>
        </div>
        <p className="text-muted-foreground">
          Workspaces organize your document collections. Each workspace can have multiple project paths where your capabilities and enablers are stored.
        </p>
      </div>

      <div className="space-y-6">
        {/* Create New Workspace */}
        <div>
          {showCreateForm && (
            <div className="bg-card rounded-lg shadow-md border border-border p-6 mb-6">
              <h3 className="text-xl font-semibold text-foreground mb-4">Create New Workspace</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Workspace Name</label>
                  <input
                    type="text"
                    value={newWorkspaceName}
                    onChange={(e) => setNewWorkspaceName(e.target.value)}
                    placeholder="e.g., Main Project"
                    className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring text-foreground placeholder:text-muted-foreground"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Description (Optional)</label>
                  <input
                    type="text"
                    value={newWorkspaceDescription}
                    onChange={(e) => setNewWorkspaceDescription(e.target.value)}
                    placeholder="e.g., Primary development workspace"
                    className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring text-foreground placeholder:text-muted-foreground"
                  />
                </div>
                <div>
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newWorkspaceCopySwPlan !== false}
                      onChange={(e) => setNewWorkspaceCopySwPlan(e.target.checked)}
                      className="mt-1 w-4 h-4 text-primary border-border rounded focus:ring-ring"
                    />
                    <span className="text-sm text-foreground">
                      Automatically copy SOFTWARE_DEVELOPMENT_PLAN.md to new project paths
                    </span>
                  </label>
                  <small className="block text-xs text-muted-foreground mt-1 ml-6">
                    When enabled, SOFTWARE_DEVELOPMENT_PLAN.md will be automatically copied to new project paths in this workspace.
                  </small>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Project Paths</label>
                  {newWorkspacePaths.map((path, index) => (
                    <div key={index} className="flex items-center gap-2 mb-2">
                      <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center text-muted-foreground">
                        <Folder size={16} />
                      </div>
                      <input
                        type="text"
                        value={path}
                        onChange={(e) => updateWorkspacePath(index, e.target.value)}
                        placeholder="e.g., ../specifications"
                        className="flex-1 px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring text-foreground placeholder:text-muted-foreground"
                      />
                      <button
                        type="button"
                        onClick={() => removeWorkspacePath(index)}
                        className="p-2 text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addWorkspacePath}
                    className="flex items-center gap-2 px-3 py-2 text-sm bg-muted text-foreground rounded-md hover:bg-muted/80 transition-colors mt-2"
                  >
                    <Plus size={14} />
                    Add Path
                  </button>
                </div>
                <div className="flex items-center gap-3 justify-end pt-4 border-t border-border">
                  <button
                    onClick={createWorkspace}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
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
                    className="px-4 py-2 bg-muted text-foreground rounded-md hover:bg-muted/80 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Edit Workspace Form */}
          {showEditForm && (
            <div className="bg-card rounded-lg shadow-md border border-border p-6 mb-6">
              <h3 className="text-xl font-semibold text-foreground mb-4">Edit Workspace</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Workspace Name</label>
                  <input
                    type="text"
                    value={editWorkspaceName}
                    onChange={(e) => setEditWorkspaceName(e.target.value)}
                    placeholder="e.g., Main Project"
                    className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring text-foreground placeholder:text-muted-foreground"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Description (Optional)</label>
                  <input
                    type="text"
                    value={editWorkspaceDescription}
                    onChange={(e) => setEditWorkspaceDescription(e.target.value)}
                    placeholder="e.g., Primary development workspace"
                    className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring text-foreground placeholder:text-muted-foreground"
                  />
                </div>
                <div>
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editWorkspaceCopySwPlan !== false}
                      onChange={(e) => setEditWorkspaceCopySwPlan(e.target.checked)}
                      className="mt-1 w-4 h-4 text-primary border-border rounded focus:ring-ring"
                    />
                    <span className="text-sm text-foreground">
                      Automatically copy SOFTWARE_DEVELOPMENT_PLAN.md to new project paths
                    </span>
                  </label>
                  <small className="block text-xs text-muted-foreground mt-1 ml-6">
                    When enabled, SOFTWARE_DEVELOPMENT_PLAN.md will be automatically copied to new project paths in this workspace.
                  </small>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Project Paths</label>
                  {editWorkspacePaths.map((path, index) => (
                    <div key={index} className="flex items-center gap-2 mb-2">
                      <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center text-muted-foreground">
                        <Folder size={16} />
                      </div>
                      <input
                        type="text"
                        value={path}
                        onChange={(e) => updateEditWorkspacePath(index, e.target.value)}
                        placeholder="e.g., ../specifications"
                        className="flex-1 px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring text-foreground placeholder:text-muted-foreground"
                      />
                      <button
                        type="button"
                        onClick={() => removeEditWorkspacePath(index)}
                        className="p-2 text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addEditWorkspacePath}
                    className="flex items-center gap-2 px-3 py-2 text-sm bg-muted text-foreground rounded-md hover:bg-muted/80 transition-colors mt-2"
                  >
                    <Plus size={14} />
                    Add Path
                  </button>
                </div>
                <div className="flex items-center gap-3 justify-end pt-4 border-t border-border">
                  <button
                    onClick={updateWorkspace}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
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
                    className="px-4 py-2 bg-muted text-foreground rounded-md hover:bg-muted/80 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Workspace List */}
        <div className="bg-card rounded-lg shadow-md border border-border p-6">
          <h3 className="text-xl font-semibold text-foreground mb-4">Workspaces</h3>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-muted border-b border-border">
                  <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">Name</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">Project Paths</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">Status</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {workspaces.workspaces.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="px-4 py-8 text-center text-muted-foreground">
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
                    <tr key={workspace.id} className="border-b border-border hover:bg-accent hover:text-accent-foreground transition-colors">
                      <td className="px-4 py-3 text-sm text-foreground font-medium">{workspace.name}</td>
                      <td className="px-4 py-3">
                        <div className="space-y-1">
                          {workspace.projectPaths.length === 0 ? (
                            <div className="text-sm text-muted-foreground italic">No paths configured</div>
                          ) : (
                            workspace.projectPaths.map((pathItem, index) => {
                              // Handle both string paths (legacy) and path objects with icons
                              const pathStr = typeof pathItem === 'string'
                                ? pathItem
                                : pathItem.path

                              return (
                                <div key={index} className="text-sm text-muted-foreground font-mono truncate max-w-md">
                                  {pathStr}
                                </div>
                              )
                            })
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="activeWorkspace"
                            checked={workspace.isActive}
                            onChange={() => {
                              if (!workspace.isActive) {
                                activateWorkspace(workspace.id)
                              }
                            }}
                            className="w-4 h-4 text-primary border-border focus:ring-ring"
                          />
                          <span className={`text-sm font-medium ${workspace.isActive ? 'text-green-600' : 'text-muted-foreground'}`}>
                            {workspace.isActive ? (
                              <span className="flex items-center gap-1">
                                <Check size={12} />
                                Active
                              </span>
                            ) : (
                              'Inactive'
                            )}
                          </span>
                        </label>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => startEditingWorkspace(workspace)}
                            className="p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground rounded-md transition-colors"
                            title="Edit workspace"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => deleteWorkspace(workspace.id)}
                            className="p-2 text-destructive hover:bg-destructive/10 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={workspace.isActive}
                            title={workspace.isActive ? "Cannot delete active workspace" : "Delete workspace"}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            <div className="mt-4 flex justify-start">
              <button
                onClick={() => setShowCreateForm(true)}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
              >
                <Plus size={14} />
                Add Workspace
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
