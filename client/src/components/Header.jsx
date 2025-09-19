import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Settings, HelpCircle, Bot, Lightbulb } from 'lucide-react'
import { useApp } from '../contexts/AppContext'
import { version } from '../../../package.json'
import './Header.css'

export default function Header() {
  const { config, setSelectedCapability } = useApp()
  const navigate = useNavigate()

  const handleLogoClick = () => {
    // Clear capability selection to show all enablers
    setSelectedCapability(null)
    // Navigate to dashboard
    navigate('/')
  }

  // Extract major version for level display
  const majorVersion = version.split('.')[0]

  return (
    <header className="header">
      <div className="header-content">
        <div className="header-logo" onClick={handleLogoClick}>
          <img 
            src="/logo.png" 
            alt="Anvil Logo" 
            className="logo-image"
            onError={(e) => {
              e.target.style.display = 'none'
            }}
          />
          <div className="header-title-section">
            <h1>Anvil</h1>
            <div className="header-subtitle">
              {config?.description || 'Product Specifications Driven Development'}
            </div>
          </div>
        </div>
        <div className="header-right">
          <div className="level-build-row">
            <div className="level-display">LEVEL {majorVersion}</div>
            <div className="build-version">BUILD v{version}</div>
          </div>
          <div className="header-actions">
            <button
              className="agents-button"
              onClick={() => navigate('/agents')}
              title="Agent Dashboard"
            >
              <Bot size={20} />
            </button>
            <button
              className="discovery-button"
              onClick={() => navigate('/discovery')}
              title="Discovery - AI Analysis"
            >
              <Lightbulb size={20} />
            </button>
            <button
              className="help-button"
              onClick={() => window.open('/README.md', '_blank')}
              title="Documentation"
            >
              <HelpCircle size={20} />
            </button>
            <button
              className="settings-button"
              onClick={() => navigate('/settings')}
              title="Settings"
            >
              <Settings size={20} />
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}