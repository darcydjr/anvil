import React, { useState, useRef, useEffect, useMemo } from 'react'

interface SearchableSelectOption {
  id: string
  label: string
  system?: string
  component?: string
}

interface SearchableSelectProps {
  value: string
  onChange: (value: string) => void
  options: SearchableSelectOption[]
  placeholder?: string
  className?: string
}

export function SearchableSelect({
  value,
  onChange,
  options,
  placeholder = "Select option",
  className = ""
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchText, setSearchText] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Group options by system and component
  const groupedOptions = useMemo(() => {
    const groups: Record<string, Record<string, SearchableSelectOption[]>> = {}

    options.forEach(option => {
      const system = option.system || 'Unknown System'
      const component = option.component || 'Unknown Component'

      if (!groups[system]) {
        groups[system] = {}
      }

      if (!groups[system][component]) {
        groups[system][component] = []
      }

      groups[system][component].push(option)
    })

    return groups
  }, [options])

  // Filter groups based on search text
  const filteredGroups = useMemo(() => {
    if (!searchText.trim()) {
      return groupedOptions
    }

    const lowerFilter = searchText.toLowerCase().trim()
    const filtered: Record<string, Record<string, SearchableSelectOption[]>> = {}

    Object.keys(groupedOptions).forEach(system => {
      Object.keys(groupedOptions[system]).forEach(component => {
        const filteredOptions = groupedOptions[system][component].filter(option =>
          option.id.toLowerCase().includes(lowerFilter) ||
          option.label.toLowerCase().includes(lowerFilter) ||
          (option.system && option.system.toLowerCase().includes(lowerFilter)) ||
          (option.component && option.component.toLowerCase().includes(lowerFilter))
        )

        if (filteredOptions.length > 0) {
          if (!filtered[system]) {
            filtered[system] = {}
          }
          filtered[system][component] = filteredOptions
        }
      })
    })

    return filtered
  }, [searchText, groupedOptions])

  // Handle escape key to close dropdown
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false)
        setSearchText('')
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen])

  // Handle clicks outside dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setSearchText('')
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // Get display text for selected value
  const getDisplayText = () => {
    if (!value) return placeholder

    const selectedOption = options.find(option => option.id === value)
    return selectedOption ? selectedOption.label : value
  }

  const handleSelect = (optionId: string) => {
    onChange(optionId)
    setIsOpen(false)
    setSearchText('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      setSearchText('')
      setIsOpen(false)
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        className={`w-full px-2 py-1 bg-background border border-border rounded text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring text-left ${className}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className={value ? '' : 'text-muted-foreground'}>
          {getDisplayText()}
        </span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[9999]" onClick={() => setIsOpen(false)}>
          <div
            className="absolute bg-background border border-border rounded-md shadow-xl max-h-72 overflow-hidden"
            style={{
              top: dropdownRef.current?.getBoundingClientRect().bottom || 0,
              left: dropdownRef.current?.getBoundingClientRect().left || 0,
              width: dropdownRef.current?.getBoundingClientRect().width || 'auto',
              minWidth: '300px'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-2 border-b border-border">
              <input
                type="text"
                className="w-full px-2 py-1 bg-background border border-border rounded text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                placeholder="Type to filter... (ESC to clear)"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                onKeyDown={handleKeyDown}
                autoFocus
              />
            </div>
            <div className="max-h-56 overflow-y-auto">
              <div
                className="px-3 py-2 text-sm cursor-pointer hover:bg-accent"
                onClick={() => handleSelect('')}
              >
                <span className="text-muted-foreground">{placeholder}</span>
              </div>
              {Object.keys(filteredGroups).sort().map((system) =>
                Object.keys(filteredGroups[system]).sort().map((component) => (
                  <div key={`${system}-${component}`}>
                    <div className="px-3 py-1 text-sm font-bold text-foreground bg-accent/50">
                      {system} → {component}
                    </div>
                    {filteredGroups[system][component].map((option) => (
                      <div
                        key={option.id}
                        className="px-6 py-2 text-sm cursor-pointer hover:bg-accent"
                        onClick={() => handleSelect(option.id)}
                      >
                        {option.label}
                      </div>
                    ))}
                  </div>
                ))
              )}
              {Object.keys(filteredGroups).length === 0 && (
                <div className="px-3 py-2 text-sm text-muted-foreground">
                  No options found matching "{searchText}"
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}