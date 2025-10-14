import React from 'react'
import { useApp } from '../contexts/AppContext'
import { FileText, Plus } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import RelationshipDiagram from './RelationshipDiagram'

export default function Dashboard(): React.ReactElement {
  const { capabilities, enablers, loading, error } = useApp()
  const navigate = useNavigate()

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-muted-foreground">Loading documents...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-destructive/10">
        <p className="text-destructive">Error loading documents: {error}</p>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto bg-card min-h-screen">
      <div className="mb-6">
        <h2 className="text-3xl font-bold text-foreground">Document Dashboard</h2>
        <p className="text-muted-foreground mt-1">Manage your capabilities and enablers</p>
      </div>

      <RelationshipDiagram />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-card rounded-lg shadow-md p-6 flex items-center gap-4 border border-border">
          <div className="flex-shrink-0 w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
            <FileText size={24} />
          </div>
          <div className="flex-1">
            <div className="text-3xl font-bold text-foreground">{capabilities.length}</div>
            <div className="text-sm text-muted-foreground">Capabilities</div>
          </div>
        </div>

        <div className="bg-card rounded-lg shadow-md p-6 flex items-center gap-4 border border-border">
          <div className="flex-shrink-0 w-12 h-12 bg-chart-2/10 rounded-lg flex items-center justify-center text-chart-2">
            <FileText size={24} />
          </div>
          <div className="flex-1">
            <div className="text-3xl font-bold text-foreground">{enablers.length}</div>
            <div className="text-sm text-muted-foreground">Enablers</div>
          </div>
        </div>

      </div>

      <div className="mb-8">
        <h3 className="text-2xl font-semibold text-foreground mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div
            className="bg-card rounded-lg shadow-md p-6 cursor-pointer hover:shadow-lg transition-shadow duration-200 border border-border flex flex-col items-center text-center"
            onClick={() => navigate('/create/capability')}
          >
            <Plus size={32} className="text-primary mb-3" />
            <h4 className="text-lg font-semibold text-foreground mb-2">Create Capability</h4>
            <p className="text-sm text-muted-foreground">Define a new high-level technical capability</p>
          </div>

          <div
            className="bg-card rounded-lg shadow-md p-6 cursor-pointer hover:shadow-lg transition-shadow duration-200 border border-border flex flex-col items-center text-center"
            onClick={() => navigate('/create/enabler')}
          >
            <Plus size={32} className="text-chart-2 mb-3" />
            <h4 className="text-lg font-semibold text-foreground mb-2">Create Enabler</h4>
            <p className="text-sm text-muted-foreground">Add implementation details for a capability</p>
          </div>

        </div>
      </div>

      <div className="bg-card rounded-lg shadow-md p-6 border border-border">
        <h3 className="text-2xl font-semibold text-foreground mb-4">Recent Documents</h3>
        <div className="space-y-2">
          {[...capabilities, ...enablers].slice(0, 5).map((doc) => (
            <div
              key={doc.path}
              className="flex items-center gap-3 p-3 rounded-md hover:bg-accent cursor-pointer transition-colors duration-150 border border-transparent hover:border-border"
              onClick={() => navigate(`/view/${doc.type}/${doc.path}`)}
            >
              <FileText size={16} className="text-muted-foreground flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-foreground truncate">{doc.title || doc.name}</div>
                <div className="text-xs text-muted-foreground">{doc.type}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
