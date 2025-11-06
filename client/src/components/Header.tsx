import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Settings, HelpCircle, Lightbulb, Clipboard, Search, X, MessageSquare } from 'lucide-react'
import { useApp } from '../contexts/AppContext'
import { version } from '../../../package.json'
import WorkspaceSelector from './WorkspaceSelector'
import { Button } from './ui/button'
import { ButtonGroup } from './ui/button-group'
import { ThemeToggle } from './ui/theme-toggle'

export default function Header(): JSX.Element {
  const { config, setSelectedCapability, searchTerm, setSearchTerm, performSearch } = useApp()
  const navigate = useNavigate()
  const [localSearchTerm, setLocalSearchTerm] = useState('')

  const handleLogoClick = (): void => {
    setSelectedCapability(null)
    navigate('/')
  }

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const value = e.target.value
    setLocalSearchTerm(value)
    setSearchTerm(value)
    performSearch(value)
  }

  const handleSearchClear = (): void => {
    setLocalSearchTerm('')
    setSearchTerm('')
    performSearch('')
  }

  // Sync local state with context
  useEffect(() => {
    setLocalSearchTerm(searchTerm)
  }, [searchTerm])

  const majorVersion = version.split('.')[0]

  return (
    <header className="p-4 bg-background border-border">
      <div className="flex justify-between items-center relative">
        <div className="flex items-center gap-4 flex-1">
          <div className="flex items-center gap-4 cursor-pointer transition-opacity duration-150 ease-in-out hover:opacity-80" onClick={handleLogoClick}>
            <img
              src="/logo.png"
              alt="Anvil Logo"
              className="w-[80px] h-[80px] object-contain"
              onError={(e: React.SyntheticEvent<HTMLImageElement, Event>): void => {
                (e.target as HTMLImageElement).style.display = 'none'
              }}
            />
          </div>
          <WorkspaceSelector />
        </div>
        <div className="flex justify-center items-center flex-1 absolute left-1/2 -translate-x-1/2">
          <div className="text-center">
            <div className="text-2xl whitespace-nowrap font-semibold text-foreground">
              {config?.description || 'Product Specifications Driven Development'}
            </div>
            <div className="text-sm text-muted-foreground">
              v{version}
            </div>
          </div>
        </div>
        <div className="flex gap-4 items-center flex-1 justify-end">
          <div className="relative max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={20} />
              <input
                type="text"
                placeholder="Search capabilities, enablers, requirements..."
                value={localSearchTerm}
                onChange={handleSearchChange}
                className="w-full pl-10 pr-10 py-2 border border-border rounded-md bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent min-w-[300px]"
              />
              {localSearchTerm && (
                <button
                  onClick={handleSearchClear}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ButtonGroup>
              <Button
                variant="outline"
                size="icon"
                onClick={(): void => navigate('/discovery')}
                title="Discovery - AI Analysis"
                className="text-primary hover:bg-primary/10 hover:text-primary/80 transition-colors"
              >
                <Lightbulb size={20} />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={(): void => navigate('/chat')}
                title="AI Chat Assistant"
                className="text-primary hover:bg-primary/10 hover:text-primary/80 transition-colors"
              >
                <MessageSquare size={20} />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={(): void => window.open('/SOFTWARE_DEVELOPMENT_PLAN.md', '_blank')}
                title="Software Development Plan"
                className="text-primary hover:bg-primary/10 hover:text-primary/80 transition-colors"
              >
                <Clipboard size={20} />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={(): void => window.open('/README.md', '_blank')}
                title="Documentation"
                className="text-primary hover:bg-primary/10 hover:text-primary/80 transition-colors"
              >
                <HelpCircle size={20} />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={(): void => navigate('/settings')}
                title="Settings"
                className="text-primary hover:bg-primary/10 hover:text-primary/80 transition-colors"
              >
                <Settings size={20} />
              </Button>
            </ButtonGroup>
            <ThemeToggle />
          </div>
        </div>
      </div>
    </header>
  )
}
