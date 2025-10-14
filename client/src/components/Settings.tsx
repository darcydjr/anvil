import React, { useState, useEffect } from 'react'
import { toast } from 'react-hot-toast'
import { useApp } from '../contexts/AppContext'
import { Plus, Trash2, Save, Settings as SettingsIcon, ChevronDown, ChevronRight } from 'lucide-react'

interface ImportedComponent {
  id: string
  name: string
  path: string
  enabled: boolean
  addedDate: string
}

interface ServerConfig {
  port: number
}

interface DefaultsConfig {
  owner: string
  analysisReview: string
  codeReview: string
}

interface Config {
  server?: ServerConfig
  defaults?: DefaultsConfig
  templates?: string
  importedComponents?: ImportedComponent[]
}

export default function Settings(): React.ReactElement {
  const { refreshData } = useApp()
  const [config, setConfig] = useState<Config | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [saving, setSaving] = useState<boolean>(false)
  const [newImportPath, setNewImportPath] = useState<string>('')
  const [newImportName, setNewImportName] = useState<string>('')
  const [isBasicConfigExpanded, setIsBasicConfigExpanded] = useState<boolean>(false)
  const [isDefaultValuesExpanded, setIsDefaultValuesExpanded] = useState<boolean>(false)

  useEffect(() => {
    loadConfig()
  }, [])

  const loadConfig = async (): Promise<void> => {
    try {
      setLoading(true)
      const response = await fetch('/api/config')
      const data: Config = await response.json()
      setConfig(data)
    } catch (error) {
      toast.error('Failed to load configuration')
      console.error('Error loading config:', error)
    } finally {
      setLoading(false)
    }
  }

  const saveConfig = async (): Promise<void> => {
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

  const addImportedComponent = (): void => {
    if (!newImportName.trim() || !newImportPath.trim()) {
      toast.error('Please provide both name and path for the imported component')
      return
    }

    if (!config) return

    const importedComponents = config.importedComponents || []

    // Check for duplicate names
    if (importedComponents.some(comp => comp.name === newImportName.trim())) {
      toast.error('A component with this name already exists')
      return
    }

    const newComponent: ImportedComponent = {
      id: Date.now().toString(),
      name: newImportName.trim(),
      path: newImportPath.trim(),
      enabled: true,
      addedDate: new Date().toISOString()
    }

    setConfig({
      ...config,
      importedComponents: [...importedComponents, newComponent]
    })

    setNewImportName('')
    setNewImportPath('')
    toast.success('Imported component added')
  }

  const removeImportedComponent = (id: string): void => {
    if (!config || !config.importedComponents) return

    setConfig({
      ...config,
      importedComponents: config.importedComponents.filter(comp => comp.id !== id)
    })
    toast.success('Imported component removed')
  }

  const toggleComponentEnabled = (id: string): void => {
    if (!config || !config.importedComponents) return

    setConfig({
      ...config,
      importedComponents: config.importedComponents.map(comp =>
        comp.id === id ? { ...comp, enabled: !comp.enabled } : comp
      )
    })
  }

  const updateConfigField = (field: keyof Config, value: string): void => {
    if (!config) return
    setConfig({
      ...config,
      [field]: value
    })
  }

  const updateNestedConfigField = (section: keyof Config, field: string, value: string | number): void => {
    if (!config) return
    setConfig({
      ...config,
      [section]: {
        ...(config[section] as Record<string, unknown>),
        [field]: value
      }
    })
  }

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto p-6">
        <div className="text-center text-muted-foreground">Loading settings...</div>
      </div>
    )
  }

  if (!config) {
    return (
      <div className="max-w-5xl mx-auto p-6">
        <div className="text-center text-destructive">Failed to load configuration</div>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="mb-6 flex items-center gap-3">
        <SettingsIcon size={24} className="text-foreground" />
        <h1 className="text-3xl font-bold text-foreground">Settings</h1>
      </div>

      <div className="space-y-6">
        {/* Basic Configuration */}
        <section className="bg-card rounded-lg shadow-md border border-border">
          <div
            className="flex items-center justify-between p-4 cursor-pointer hover:bg-accent hover:text-accent-foreground transition-colors"
            onClick={() => setIsBasicConfigExpanded(!isBasicConfigExpanded)}
          >
            <h2 className="text-xl font-semibold text-foreground">Basic Configuration</h2>
            {isBasicConfigExpanded ? <ChevronDown size={20} className="text-muted-foreground" /> : <ChevronRight size={20} className="text-muted-foreground" />}
          </div>

          {isBasicConfigExpanded && (
            <div className="border-t border-border p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Server Port</label>
                <input
                  type="number"
                  value={config.server?.port || 3000}
                  onChange={(e) => updateNestedConfigField('server', 'port', parseInt(e.target.value))}
                  className="w-full px-3 py-2 bg-card border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
                />
              </div>
              <div className="flex justify-end">
                <button
                  onClick={saveConfig}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save size={16} />
                  {saving ? 'Saving...' : 'Save Basic Configuration'}
                </button>
              </div>
            </div>
          )}
        </section>

        {/* Default Values */}
        <section className="bg-card rounded-lg shadow-md border border-border">
          <div
            className="flex items-center justify-between p-4 cursor-pointer hover:bg-accent hover:text-accent-foreground transition-colors"
            onClick={() => setIsDefaultValuesExpanded(!isDefaultValuesExpanded)}
          >
            <h2 className="text-xl font-semibold text-foreground">Default Values</h2>
            {isDefaultValuesExpanded ? <ChevronDown size={20} className="text-muted-foreground" /> : <ChevronRight size={20} className="text-muted-foreground" />}
          </div>

          {isDefaultValuesExpanded && (
            <div className="border-t border-border p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Default Owner</label>
                <input
                  type="text"
                  value={config.defaults?.owner || ''}
                  onChange={(e) => updateNestedConfigField('defaults', 'owner', e.target.value)}
                  className="w-full px-3 py-2 bg-card border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Analysis Review Default</label>
                <select
                  value={config.defaults?.analysisReview || 'Required'}
                  onChange={(e) => updateNestedConfigField('defaults', 'analysisReview', e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
                >
                  <option value="Required">Required</option>
                  <option value="Not Required">Not Required</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Code Review Default</label>
                <select
                  value={config.defaults?.codeReview || 'Not Required'}
                  onChange={(e) => updateNestedConfigField('defaults', 'codeReview', e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
                >
                  <option value="Required">Required</option>
                  <option value="Not Required">Not Required</option>
                </select>
              </div>
              <div className="flex justify-end">
                <button
                  onClick={saveConfig}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save size={16} />
                  {saving ? 'Saving...' : 'Save Default Values'}
                </button>
              </div>
            </div>
          )}
        </section>

        {/* Imported Components */}
        <section className="bg-card rounded-lg shadow-md border border-border p-6">
          <h2 className="text-xl font-semibold text-foreground mb-2">Imported Components</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Import specifications from other Anvil projects to view and reference their capabilities and enablers.
          </p>

          {/* Add New Import */}
          <div className="mb-6 p-4 bg-muted rounded-lg border border-border">
            <h3 className="text-lg font-semibold text-foreground mb-4">Add New Import</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Component Name</label>
                <input
                  type="text"
                  value={newImportName}
                  onChange={(e) => setNewImportName(e.target.value)}
                  placeholder="e.g., Authentication Service"
                  className="w-full px-3 py-2 bg-card border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring text-foreground placeholder:text-muted-foreground"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Specifications Path</label>
                <input
                  type="text"
                  value={newImportPath}
                  onChange={(e) => setNewImportPath(e.target.value)}
                  placeholder="e.g., /path/to/other-project/specifications"
                  className="w-full px-3 py-2 bg-card border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring text-foreground placeholder:text-muted-foreground"
                />
              </div>
              <button
                onClick={addImportedComponent}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
              >
                <Plus size={16} />
                Add Import
              </button>
            </div>
          </div>

          {/* Imported Components List */}
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-4">Current Imports</h3>
            {!config.importedComponents || config.importedComponents.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No imported components. Add one above to get started.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-muted border-b border-border">
                      <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">Name</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">Path</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">Status</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">Added</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {config.importedComponents.map((component) => (
                      <tr key={component.id} className="border-b border-border hover:bg-accent hover:text-accent-foreground transition-colors">
                        <td className="px-4 py-3 text-sm text-foreground">{component.name}</td>
                        <td className="px-4 py-3 text-sm text-muted-foreground font-mono truncate max-w-xs">{component.path}</td>
                        <td className="px-4 py-3">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <div className="relative inline-block w-10 h-5">
                              <input
                                type="checkbox"
                                checked={component.enabled}
                                onChange={() => toggleComponentEnabled(component.id)}
                                className="sr-only peer"
                              />
                              <div className="w-10 h-5 bg-muted-foreground/30 rounded-full peer peer-checked:bg-primary transition-colors"></div>
                              <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-background rounded-full transition-transform peer-checked:translate-x-5"></div>
                            </div>
                            <span className={`text-sm ${component.enabled ? 'text-chart-2 font-medium' : 'text-muted-foreground'}`}>
                              {component.enabled ? 'Enabled' : 'Disabled'}
                            </span>
                          </label>
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">{new Date(component.addedDate).toLocaleDateString()}</td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => removeImportedComponent(component.id)}
                            className="p-2 text-destructive hover:bg-destructive/10 rounded-md transition-colors"
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
        <section className="bg-card rounded-lg shadow-md border border-border p-6">
          <h2 className="text-xl font-semibold text-foreground mb-2">Templates Configuration</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Templates are shared across all workspaces and define the structure for new documents.
          </p>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Templates Path</label>
            <input
              type="text"
              value={config.templates || ''}
              onChange={(e) => updateConfigField('templates', e.target.value)}
              className="w-full px-3 py-2 bg-card border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring text-foreground placeholder:text-muted-foreground"
              placeholder="./templates"
            />
          </div>
        </section>
      </div>
    </div>
  )
}
