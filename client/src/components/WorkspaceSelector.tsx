import React, { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronDown, Edit2, Settings, Plus } from 'lucide-react'
import { useApp } from '../contexts/AppContext'
import { toast } from 'react-hot-toast'
import { Button } from './ui/button'
import { ButtonGroup } from './ui/button-group'

interface Workspace {
  id: string
  name: string
  description?: string
  isActive?: boolean
}

export default function WorkspaceSelector(): JSX.Element {
  const { workspaces, activeWorkspaceId, activateWorkspace } = useApp()
  const [isOpen, setIsOpen] = useState<boolean>(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  // Ensure workspaces is always an array
  const workspacesList: Workspace[] = Array.isArray(workspaces) ? workspaces : []

  // Find the active workspace
  const activeWorkspace = workspacesList.find(w => w.id === activeWorkspaceId || w.isActive)

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent): void {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const handleWorkspaceChange = async (workspaceId: string): Promise<void> => {
    setIsOpen(false)
    const success = await activateWorkspace(workspaceId)
    if (success) {
      toast.success('Workspace activated')
    } else {
      toast.error('Failed to activate workspace')
    }
  }

  const handleManageWorkspaces = (): void => {
    setIsOpen(false)
    navigate('/manage-workspaces')
  }

  const handleEditWorkspace = (): void => {
    navigate('/manage-workspaces')
  }

  const handleAddWorkspace = (): void => {
    navigate('/manage-workspaces?action=add')
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <ButtonGroup className="border-muted">
        <Button
          variant="outline"
          onClick={() => setIsOpen(!isOpen)}
          title={activeWorkspace ? `Active workspace: ${activeWorkspace.name}` : 'Select workspace'}
          className="text-primary hover:bg-primary/10 hover:text-primary/80 transition-colors h-10 text-base"
        >
          <span className="font-medium">
            {activeWorkspace ? activeWorkspace.name : 'No workspace'}
          </span>
          <ChevronDown size={18} className={`ml-2 text-primary transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </Button>

        <Button
          variant="outline"
          size="icon"
          onClick={handleEditWorkspace}
          title="Edit workspace"
          className="text-primary hover:bg-primary/10 hover:text-primary/80 transition-colors h-10 w-10"
        >
          <Edit2 size={18} />
        </Button>

        <Button
          variant="outline"
          size="icon"
          onClick={handleAddWorkspace}
          title="Add workspace"
          className="text-primary hover:bg-primary/10 hover:text-primary/80 transition-colors h-10 w-10"
        >
          <Plus size={18} />
        </Button>
      </ButtonGroup>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-80 bg-card rounded-lg shadow-lg border border-border z-50">
          <div className="px-4 py-3 border-b border-border rounded-t-lg">
            <h3 className="text-sm font-semibold text-foreground">Workspaces</h3>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {workspacesList.length === 0 ? (
              <div className="px-4 py-8 text-center text-muted-foreground text-sm">No workspaces available</div>
            ) : (
              workspacesList.map((workspace) => (
                <button
                  key={workspace.id}
                  className={`w-full text-left px-4 py-3 hover:bg-accent hover:text-accent-foreground transition-colors border-b border-border ${workspace.isActive || workspace.id === activeWorkspaceId ? 'bg-primary/10' : ''}`}
                  onClick={() => handleWorkspaceChange(workspace.id)}
                >
                  <span className={`block font-medium text-sm ${workspace.isActive || workspace.id === activeWorkspaceId ? 'text-primary' : 'text-foreground'}`}>
                    {workspace.name}
                  </span>
                  {workspace.description && (
                    <span className="block text-xs text-muted-foreground mt-1">{workspace.description}</span>
                  )}
                </button>
              ))
            )}
          </div>
          <div className="border-t border-border" />
          <button
            className="w-full flex items-center gap-2 px-4 py-3 text-sm text-foreground hover:bg-accent hover:text-accent-foreground transition-colors rounded-b-lg"
            onClick={handleManageWorkspaces}
          >
            <Settings size={16} />
            <span>Manage Workspaces...</span>
          </button>
        </div>
      )}
    </div>
  )
}
