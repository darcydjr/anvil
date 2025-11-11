import React, { useState, useEffect } from 'react'
import { X, Lightbulb } from 'lucide-react'

interface TipOfTheDayProps {
  className?: string
}

interface Tip {
  id: string
  title: string
  content: string
}

const tips: Tip[] = [
  {
    id: 'anvil-icon',
    title: '1. System Overview',
    content: 'Click the Anvil icon in the header to see a system-wide view of your project with the number of capabilities, enablers, and requirements you have accomplished so far.'
  },
  {
    id: 'search-feature',
    title: '2. Quick Search',
    content: 'Use the search bar to quickly find capabilities, enablers, or requirements across your entire project. Search works across titles, IDs, and content.'
  },
  {
    id: 'capability-grouping',
    title: '3. Smart Organization',
    content: 'Capabilities are automatically grouped by System and Component for better organization. Click the arrows to expand or collapse groups.'
  },
  {
    id: 'status-indicators',
    title: '4. Visual Status Tracking',
    content: 'Look for status icons: microscope for Analysis phase, ruler for Design phase, and anvil icon for Implementation phase.'
  },
  {
    id: 'enabler-filtering',
    title: '5. Focused View',
    content: 'Use the filter button in the Enablers section to show only enablers related to your selected capability.'
  },
  {
    id: 'form-mode',
    title: '6. Dual Editing Modes',
    content: 'Toggle between Form mode for structured editing and Markdown mode for raw text editing using the tabs at the top of documents.'
  },
  {
    id: 'resizable-panels',
    title: '7. Customizable Layout',
    content: 'Drag the grip handle between Capabilities and Enablers sections to resize them to your preferred proportions.'
  },
  {
    id: 'quick-create',
    title: '8. Fast Document Creation',
    content: 'Use the + buttons in the sidebar headers to quickly create new capabilities or enablers from templates.'
  },
  {
    id: 'workspace-selector',
    title: '9. Workspace Management',
    content: 'Use the workspace selector in the header to switch between different projects or create new workspaces for organizing different initiatives.'
  },
  {
    id: 'back-navigation',
    title: '10. Navigation History',
    content: 'Click the Back button that appears when browsing to return to your previous view and maintain your workflow context.'
  },
  {
    id: 'bulk-editing',
    title: '11. Bulk Operations',
    content: 'Select multiple requirements or enablers to perform bulk edit operations like status updates, owner assignments, or priority changes.'
  },
  {
    id: 'auto-save',
    title: '12. Auto-Save Protection',
    content: 'Anvil automatically saves your work as you type, but always click Save to ensure your changes are committed and backed up.'
  },
  {
    id: 'requirement-types',
    title: '13. Requirement Categories',
    content: 'Organize requirements into Functional (FR-001) and Non-Functional (NFR-001) types for better specification management.'
  },
  {
    id: 'dependency-management',
    title: '14. Dependency Tracking',
    content: 'Use the dependency selectors in capabilities to establish relationships between different parts of your system architecture.'
  },
  {
    id: 'approval-workflow',
    title: '15. Approval Process',
    content: 'Track document approval status to ensure all capabilities and enablers meet your quality standards before implementation.'
  },
  {
    id: 'markdown-support',
    title: '17. Rich Text Formatting',
    content: 'Use markdown syntax in text fields to add **bold**, *italic*, `code`, and other formatting to your documentation.'
  },
  {
    id: 'system-architecture',
    title: '18. Architecture Diagrams',
    content: 'Navigate to the system view to see visual relationship diagrams showing how your capabilities and enablers connect.'
  },
  {
    id: 'status-progression',
    title: '19. Workflow States',
    content: 'Follow the natural progression: Draft → Analysis → Design → Implementation → Complete to track your development lifecycle.'
  },
  {
    id: 'priority-levels',
    title: '20. Priority Management',
    content: 'Assign Critical, High, Medium, or Low priorities to capabilities and requirements to guide development focus.'
  },
  {
    id: 'owner-assignment',
    title: '21. Responsibility Tracking',
    content: 'Assign owners to capabilities and enablers to maintain clear accountability throughout your project.'
  },
  {
    id: 'id-conventions',
    title: '22. ID Naming System',
    content: 'Follow the CAP-XXXX format for capabilities and ENB-XXXX for enablers to maintain consistent identification across your project.'
  },
  {
    id: 'template-usage',
    title: '23. Template Benefits',
    content: 'Always start new documents from templates to ensure consistent structure and include all required metadata fields.'
  },
  {
    id: 'review-cycles',
    title: '24. Review Workflow',
    content: 'Use Analysis Review and Design Review checkpoints to ensure quality gates are met before moving to implementation.'
  },
  {
    id: 'settings-customization',
    title: '25. Personalization',
    content: 'Visit Settings to customize default values, tip frequency, and other preferences to match your workflow.'
  },
  {
    id: 'collaboration-tips',
    title: '26. Team Collaboration',
    content: 'Use clear, descriptive titles and maintain consistent naming conventions to help team members understand your architecture.'
  },
  {
    id: 'refactoring-workflow',
    title: '27. Refactoring Process',
    content: 'Refactoring flow: add/modify requirements → mark requirements as "Ready for Refactor" or "Ready for Retirement" → mark enablers as "Ready for Refactor" → set capability to "Ready for Refactor" to trigger redesign workflow.'
  }
]

export default function TipOfTheDay({ className = '' }: TipOfTheDayProps): JSX.Element {
  const [isVisible, setIsVisible] = useState(false)
  const [currentTip, setCurrentTip] = useState<Tip>(tips[0])
  const [lastShownTime, setLastShownTime] = useState<number>(0)
  const [tipSettings, setTipSettings] = useState({ enabled: true, frequency: 60 })

  useEffect(() => {
    const loadTipSettings = async () => {
      try {
        const response = await fetch('/api/config')
        const config = await response.json()
        if (config.tipOfTheDay) {
          setTipSettings({
            enabled: config.tipOfTheDay.enabled !== false,
            frequency: config.tipOfTheDay.frequency || 60
          })
        }
      } catch (error) {
        console.error('Failed to load tip settings:', error)
      }
    }

    loadTipSettings()
  }, [])

  useEffect(() => {
    if (!tipSettings.enabled) {
      setIsVisible(false)
      return
    }
    const showRandomTip = () => {
      const now = Date.now()
      const frequencyMs = tipSettings.frequency * 60 * 1000

      if (now - lastShownTime >= frequencyMs || lastShownTime === 0) {
        const randomTip = tips[Math.floor(Math.random() * tips.length)]
        setCurrentTip(randomTip)
        setIsVisible(true)
        setLastShownTime(now)

        const hideTimer = setTimeout(() => {
          setIsVisible(false)
        }, 10000)

        return () => clearTimeout(hideTimer)
      }
    }

    const initialTimer = setTimeout(showRandomTip, 2000)
    const checkInterval = setInterval(showRandomTip, 60000)

    return () => {
      clearTimeout(initialTimer)
      clearInterval(checkInterval)
    }
  }, [lastShownTime, tipSettings])

  const handleClose = () => {
    setIsVisible(false)
  }

  if (!isVisible) return <></>

  return (
    <div
      className={`fixed bottom-6 left-6 w-[376px] z-50 transform transition-all duration-500 ease-in-out ${
        isVisible
          ? 'translate-y-0 opacity-100'
          : 'translate-y-full opacity-0'
      } ${className}`}
    >
      <div className="bg-gradient-to-r from-primary/90 to-primary/80 backdrop-blur-sm border border-primary/20 rounded-lg shadow-lg p-4">
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold text-primary-foreground mb-1">
              💡 Tip of the Day: {currentTip.title}
            </h4>
            <p className="text-sm text-primary-foreground/90 leading-relaxed">
              {currentTip.content}
            </p>
          </div>

          <button
            onClick={handleClose}
            className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full hover:bg-primary-foreground/10 transition-colors duration-200"
            aria-label="Close tip"
          >
            <X size={14} className="text-primary-foreground" />
          </button>
        </div>

        <div className="mt-3 flex justify-between items-center text-xs text-primary-foreground/70">
          <span>Tip {tips.indexOf(currentTip) + 1} of {tips.length}</span>
          <span>Shows every hour</span>
        </div>
      </div>
    </div>
  )
}