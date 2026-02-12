import React, { useState, useEffect } from 'react'
import { toast } from 'react-hot-toast'
import { useApp } from '../contexts/AppContext'
import { Save, Settings as SettingsIcon, ChevronDown, ChevronRight, Palette } from 'lucide-react'
import { useTheme } from 'next-themes'
import { designSystems, getCurrentDesignSystem, saveDesignSystem, applyDesignSystem, type DesignSystem } from '../config/designSystems'

interface ServerConfig {
  port: number
}

interface DefaultsConfig {
  owner: string
  analysisReview: string
  codeReview: string
}

interface TipConfig {
  enabled: boolean
  frequency: number // in minutes
}

interface Config {
  server?: ServerConfig
  defaults?: DefaultsConfig
  tipOfTheDay?: TipConfig
}

export default function Settings(): React.ReactElement {
  const { refreshData } = useApp()
  const { theme, resolvedTheme } = useTheme()
  const [config, setConfig] = useState<Config | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [saving, setSaving] = useState<boolean>(false)
  const [isBasicConfigExpanded, setIsBasicConfigExpanded] = useState<boolean>(false)
  const [isDefaultValuesExpanded, setIsDefaultValuesExpanded] = useState<boolean>(false)
  const [isDesignSystemExpanded, setIsDesignSystemExpanded] = useState<boolean>(true)
  const [selectedDesignSystem, setSelectedDesignSystem] = useState<DesignSystem>(getCurrentDesignSystem())
  const [isTipSettingsExpanded, setIsTipSettingsExpanded] = useState<boolean>(false)

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

  const handleDesignSystemChange = (system: DesignSystem): void => {
    setSelectedDesignSystem(system)
    saveDesignSystem(system.id)

    // Apply immediately
    const currentTheme = resolvedTheme as 'light' | 'dark' || 'light'
    applyDesignSystem(system, currentTheme)

    toast.success(`Switched to ${system.name}`)

    // Reload page to fully apply the new design system
    setTimeout(() => {
      window.location.reload()
    }, 500)
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
        {/* Design System Selector */}
        <section className="bg-card rounded-lg shadow-md border border-border">
          <div
            className="flex items-center justify-between p-4 cursor-pointer hover:bg-accent hover:text-accent-foreground transition-colors"
            onClick={() => setIsDesignSystemExpanded(!isDesignSystemExpanded)}
          >
            <div className="flex items-center gap-3">
              <Palette size={20} className="text-primary" />
              <h2 className="text-xl font-semibold text-foreground">Design System</h2>
            </div>
            {isDesignSystemExpanded ? <ChevronDown size={20} className="text-muted-foreground" /> : <ChevronRight size={20} className="text-muted-foreground" />}
          </div>

          {isDesignSystemExpanded && (
            <div className="border-t border-border p-4 space-y-4">
              <p className="text-sm text-muted-foreground mb-4">
                Choose a design system to change the color scheme of the application.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {designSystems.map((system) => (
                  <button
                    key={system.id}
                    onClick={() => handleDesignSystemChange(system)}
                    className={`
                      relative p-4 rounded-lg border-2 transition-all text-left
                      ${selectedDesignSystem.id === system.id
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50 bg-card'
                      }
                    `}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div
                        className="w-8 h-8 rounded-full border-2 border-border"
                        style={{ backgroundColor: system.primaryHex }}
                      />
                      <div className="flex-1">
                        <h3 className="font-semibold text-foreground">{system.name}</h3>
                        {selectedDesignSystem.id === system.id && (
                          <span className="text-xs text-primary font-medium">Active</span>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">{system.description}</p>
                    <div className="mt-3 flex gap-2">
                      <div className="text-xs text-muted-foreground">
                        Primary: <code className="bg-muted px-1 py-0.5 rounded">{system.primaryHex}</code>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>

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

        {/* Tip of the Day Settings */}
        <section className="bg-card rounded-lg shadow-md border border-border">
          <div
            className="flex items-center justify-between p-4 cursor-pointer hover:bg-accent hover:text-accent-foreground transition-colors"
            onClick={() => setIsTipSettingsExpanded(!isTipSettingsExpanded)}
          >
            <h2 className="text-xl font-semibold text-foreground">Tip of the Day Settings</h2>
            {isTipSettingsExpanded ? <ChevronDown size={20} className="text-muted-foreground" /> : <ChevronRight size={20} className="text-muted-foreground" />}
          </div>

          {isTipSettingsExpanded && (
            <div className="border-t border-border p-4 space-y-4">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="tipEnabled"
                  checked={config.tipOfTheDay?.enabled !== false}
                  onChange={(e) => updateNestedConfigField('tipOfTheDay', 'enabled', e.target.checked)}
                  className="w-4 h-4 text-primary bg-background border-border rounded focus:ring-ring focus:ring-2"
                />
                <label htmlFor="tipEnabled" className="text-sm font-medium text-foreground">
                  Enable Tip of the Day
                </label>
              </div>
              <p className="text-sm text-muted-foreground">
                Show helpful tips about using Anvil that slide up from the bottom of the navigation panel.
              </p>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Tip Frequency</label>
                <select
                  value={config.tipOfTheDay?.frequency || 60}
                  onChange={(e) => updateNestedConfigField('tipOfTheDay', 'frequency', parseInt(e.target.value))}
                  className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
                  disabled={config.tipOfTheDay?.enabled === false}
                >
                  <option value={15}>Every 15 minutes</option>
                  <option value={30}>Every 30 minutes</option>
                  <option value={60}>Every 1 hour</option>
                  <option value={120}>Every 2 hours</option>
                  <option value={240}>Every 4 hours</option>
                </select>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={saveConfig}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save size={16} />
                  {saving ? 'Saving...' : 'Save Tip Settings'}
                </button>
              </div>
            </div>
          )}
        </section>

        {/* AI Chat Assistant configuration (inserted 2025-11-12T23:28:45.392Z) */}
        <section className="bg-card rounded-lg shadow-md border border-border mt-6">
          <div
            className="flex items-center justify-between p-4 cursor-pointer hover:bg-accent hover:text-accent-foreground transition-colors"
            onClick={() => setIsTipSettingsExpanded(!isTipSettingsExpanded)}
          >
            <h2 className="text-xl font-semibold text-foreground">AI Chat Assistant configuration</h2>
            {isTipSettingsExpanded ? <ChevronDown size={20} className="text-muted-foreground" /> : <ChevronRight size={20} className="text-muted-foreground" />}
          </div>

          {isTipSettingsExpanded && (
            <div className="border-t border-border p-4 space-y-4">
              <p className="text-sm text-muted-foreground">
                Enter your Anthropic Claude API key. To obtain a key: 1) Log in to <a className="text-primary underline" href="https://console.anthropic.com" target="_blank" rel="noreferrer">console.anthropic.com</a>, 2) Navigate to API Keys, 3) Generate a new key, 4) Copy and paste it below. Your key is stored in your local configuration file (config.local.json) and used only for AI chat requests.
              </p>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Claude API Key</label>
                <input
                  type="password"
                  value={(config as any).aiAssistant?.apiKey || ''}
                  onChange={(e) => setConfig({ ...(config as any), aiAssistant: { ...((config as any).aiAssistant || {}), provider: 'claude', apiKey: e.target.value } })}
                  placeholder="sk-ant-..."
                  className="w-full px-3 py-2 bg-card border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring text-foreground font-mono"
                />
              </div>
              <div className="flex justify-end">
                <button
                  onClick={saveConfig}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save size={16} />
                  {saving ? 'Saving...' : 'Save AI Assistant Settings'}
                </button>
              </div>
            </div>
          )}
        </section>

      </div>
    </div>
  )
}
