import React, { useState, useEffect } from 'react'
import { toast } from 'react-hot-toast'
import { useApp } from '../contexts/AppContext'
import { Plus, Trash2, Save, Edit2, Check, Folder, FolderOpen, GripVertical } from 'lucide-react'

interface PathItem {
  path: string
  icon: string
}

interface Workspace {
  id: string
  name: string
  description: string
  projectPaths: Array<string | PathItem>
  copySwPlan?: boolean
  isActive?: boolean
}

interface WorkspacesData {
  workspaces: Workspace[]
  activeWorkspaceId: string | null
}

export default function ManageWorkspaces(): JSX.Element {
  const { loadWorkspaces, refreshData } = useApp()
  const [workspaces, setWorkspaces] = useState<WorkspacesData>({ workspaces: [], activeWorkspaceId: null })
  const [loading, setLoading] = useState<boolean>(true)

  // Workspace form state
  const [newWorkspaceName, setNewWorkspaceName] = useState<string>('')
  const [newWorkspaceDescription, setNewWorkspaceDescription] = useState<string>('')
  const [newWorkspacePaths, setNewWorkspacePaths] = useState<string[]>(['./[WorkspaceName]/specifications','./[WorkspaceName]/tests','./[WorkspaceName]/code','./[WorkspaceName]/uploaded-assets'])

// Dynamically update mandatory path entries when name changes
useEffect(() => {
  const ws = newWorkspaceName.trim() || '[WorkspaceName]'
  setNewWorkspacePaths([
    `./${ws}/specifications`,
    `./${ws}/tests`,
    `./${ws}/code`,
    `./${ws}/uploaded-assets`
  ])
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [newWorkspaceName])
  const [newWorkspaceCopySwPlan, setNewWorkspaceCopySwPlan] = useState<boolean>(true)
  const [editingWorkspaceId, setEditingWorkspaceId] = useState<string | null>(null)
  const [editWorkspaceName, setEditWorkspaceName] = useState<string>('')
  const [editWorkspaceDescription, setEditWorkspaceDescription] = useState<string>('')
  const [editWorkspacePaths, setEditWorkspacePaths] = useState<string[]>([])
  const [editWorkspaceCopySwPlan, setEditWorkspaceCopySwPlan] = useState<boolean>(true)
  const [showCreateForm, setShowCreateForm] = useState<boolean>(false)
  const [showEditForm, setShowEditForm] = useState<boolean>(false)
  const [draggedNewPathIndex, setDraggedNewPathIndex] = useState<number | null>(null)
  const [draggedEditPathIndex, setDraggedEditPathIndex] = useState<number | null>(null)

  useEffect(() => {
    loadWorkspacesData()
  }, [])

  const loadWorkspacesData = async (): Promise<void> => {
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

  const createWorkspace = async (): Promise<void> => {
    const validPaths = newWorkspacePaths.filter(p => p && p.trim())
    if (!newWorkspaceName.trim()) {
      toast.error('Please provide a workspace name')
      return
    } // Additional paths optional now (mandatory auto-created)

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
      loadWorkspaces()
      refreshData()
      toast.success('Workspace created successfully')
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      toast.error(errorMessage)
    }
  }

  const activateWorkspace = async (workspaceId: string): Promise<void> => {
    try {
      const response = await fetch(`/api/workspaces/${workspaceId}/activate`, {
        method: 'POST'
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to activate workspace')
      }

      await loadWorkspacesData()
      loadWorkspaces()
      refreshData()
      toast.success('Workspace activated')
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      toast.error(errorMessage)
    }
  }

  const deleteWorkspace = async (workspaceId: string): Promise<void> => {
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
      loadWorkspaces()
      refreshData()
      toast.success('Workspace deleted')
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      toast.error(errorMessage)
    }
  }

  const updateWorkspace = async (): Promise<void> => {
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
      loadWorkspaces()
      refreshData()
      toast.success('Workspace updated successfully')
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      toast.error(errorMessage)
    }
  }

  const startEditingWorkspace = (workspace: Workspace): void => {
    setEditingWorkspaceId(workspace.id)
    setEditWorkspaceName(workspace.name)
    setEditWorkspaceDescription(workspace.description || '')
    setEditWorkspaceCopySwPlan(workspace.copySwPlan !== false)

    const mandatory = [
      `./${workspace.name}/specifications`,
      `./${workspace.name}/code`,
      `./${workspace.name}/tests`,
      `./${workspace.name}/uploaded-assets`
    ]
    const allPaths = (workspace.projectPaths || []).map(p => typeof p === 'string' ? p : p.path || '')
    // Ensure mandatory indexes 0-3 in editWorkspacePaths
    const mandatoryResolved = [
      allPaths.find(p => p.endsWith('/specifications')) || mandatory[0],
      allPaths.find(p => p.endsWith('/tests')) || mandatory[2].replace('/code','/tests'),
      allPaths.find(p => p.endsWith('/code')) || mandatory[1],
      allPaths.find(p => p.endsWith('/uploaded-assets')) || mandatory[3]
    ]
    const extras = allPaths.filter(p => !mandatoryResolved.includes(p))
    setEditWorkspacePaths([...mandatoryResolved, ...extras])
    setShowEditForm(true)
  }

  const updateWorkspacePath = (index: number, value: string): void => {
    const updatedPaths = [...newWorkspacePaths]
    updatedPaths[index] = value
    setNewWorkspacePaths(updatedPaths)
  }

  const addWorkspacePath = (): void => {
    setNewWorkspacePaths([...newWorkspacePaths, ''])
  }

  const removeWorkspacePath = (index: number): void => {
    setNewWorkspacePaths(newWorkspacePaths.filter((_, i) => i !== index))
  }

  const updateEditWorkspacePath = (index: number, value: string): void => {
    const updatedPaths = [...editWorkspacePaths]
    updatedPaths[index] = value
    setEditWorkspacePaths(updatedPaths)
  }

  const addEditWorkspacePath = (): void => {
    setEditWorkspacePaths([...editWorkspacePaths, ''])
  }

  const removeEditWorkspacePath = (index: number): void => {
    setEditWorkspacePaths(editWorkspacePaths.filter((_, i) => i !== index))
  }

  // Drag and drop handlers for new workspace paths
  const handleNewPathDragStart = (e: React.DragEvent, index: number): void => {
    setDraggedNewPathIndex(index)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleNewPathDragOver = (e: React.DragEvent): void => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleNewPathDrop = (e: React.DragEvent, targetIndex: number): void => {
    e.preventDefault()

    if (draggedNewPathIndex === null || draggedNewPathIndex === targetIndex) {
      setDraggedNewPathIndex(null)
      return
    }

    const paths = [...newWorkspacePaths]
    const [removed] = paths.splice(draggedNewPathIndex, 1)
    paths.splice(targetIndex, 0, removed)

    setNewWorkspacePaths(paths)
    setDraggedNewPathIndex(null)
  }

  const handleNewPathDragEnd = (): void => {
    setDraggedNewPathIndex(null)
  }

  // Drag and drop handlers for edit workspace paths
  const handleEditPathDragStart = (e: React.DragEvent, index: number): void => {
    setDraggedEditPathIndex(index)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleEditPathDragOver = (e: React.DragEvent): void => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleEditPathDrop = (e: React.DragEvent, targetIndex: number): void => {
    e.preventDefault()

    if (draggedEditPathIndex === null || draggedEditPathIndex === targetIndex) {
      setDraggedEditPathIndex(null)
      return
    }

    const paths = [...editWorkspacePaths]
    const [removed] = paths.splice(draggedEditPathIndex, 1)
    paths.splice(targetIndex, 0, removed)

    setEditWorkspacePaths(paths)
    setDraggedEditPathIndex(null)
  }

  const handleEditPathDragEnd = (): void => {
    setDraggedEditPathIndex(null)
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
        {/* Create New Workspace Form */}
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
                  <div
                    key={index}
                    className="flex items-center gap-2 mb-2"
                    draggable
                    onDragStart={(e) => handleNewPathDragStart(e, index)}
                    onDragOver={handleNewPathDragOver}
                    onDrop={(e) => handleNewPathDrop(e, index)}
                    onDragEnd={handleNewPathDragEnd}
                  >
                    <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center text-muted-foreground cursor-move">
                      <GripVertical size={16} />
                    </div>
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
                <label className="block text-sm font-medium text-foreground mb-2">Mandatory Project Paths</label>
                <div className="space-y-2 mb-4">
                  {['specifications','tests','code','uploaded-assets'].map((label, idx) => {
                    const current = editWorkspacePaths[idx] || ''
                    return (
                      <div key={label} className="flex items-center gap-2">
                        <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center text-muted-foreground"><Folder size={16} /></div>
                        <span className="text-xs font-medium w-28 text-muted-foreground capitalize">{label}</span>
                        <input
                          type="text"
                          value={current}
                          onChange={(e) => {
                            const updated = [...editWorkspacePaths]
                            updated[idx] = e.target.value
                            setEditWorkspacePaths(updated)
                          }}
                          className="flex-1 px-3 py-2 bg-background border border-border rounded-md text-foreground text-xs"
                        />
                      </div>
                    )
                  })}
                </div>
                <label className="block text-sm font-medium text-foreground mb-2">Additional Project Paths</label>
                {editWorkspacePaths.map((path, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 mb-2"
                    draggable
                    onDragStart={(e) => handleEditPathDragStart(e, index)}
                    onDragOver={handleEditPathDragOver}
                    onDrop={(e) => handleEditPathDrop(e, index)}
                    onDragEnd={handleEditPathDragEnd}
                  >
                    <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center text-muted-foreground cursor-move">
                      <GripVertical size={16} />
                    </div>
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
                    <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                      No workspaces found. Use the button below to create one.
                    </td>
                  </tr>
                ) : (
                  workspaces.workspaces
                    .sort((a, b) => {
                      if (a.isActive && !b.isActive) return -1
                      if (!a.isActive && b.isActive) return 1
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
