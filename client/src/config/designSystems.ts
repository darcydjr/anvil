/**
 * Design System Configurations
 *
 * This file contains all available design systems with their color palettes
 * in OKLCH format for perceptually uniform color representation.
 */

export interface DesignSystemColors {
  // Light mode colors
  light: {
    background: string
    foreground: string
    card: string
    cardForeground: string
    popover: string
    popoverForeground: string
    primary: string
    primaryForeground: string
    secondary: string
    secondaryForeground: string
    muted: string
    mutedForeground: string
    accent: string
    accentForeground: string
    destructive: string
    destructiveForeground: string
    border: string
    input: string
    ring: string
  }
  // Dark mode colors
  dark: {
    background: string
    foreground: string
    card: string
    cardForeground: string
    popover: string
    popoverForeground: string
    primary: string
    primaryForeground: string
    secondary: string
    secondaryForeground: string
    muted: string
    mutedForeground: string
    accent: string
    accentForeground: string
    destructive: string
    destructiveForeground: string
    border: string
    input: string
    ring: string
  }
}

export interface DesignSystem {
  id: string
  name: string
  description: string
  colors: DesignSystemColors
  primaryHex: string // For display purposes
}

// Purple Design System (Original)
export const purpleDesignSystem: DesignSystem = {
  id: 'purple',
  name: 'Purple Design System',
  description: 'Vibrant purple theme with modern aesthetics',
  primaryHex: '#7b1fa2',
  colors: {
    light: {
      background: 'oklch(0.98 0.005 280)',
      foreground: 'oklch(0.15 0.02 280)',
      card: 'oklch(1 0 0)',
      cardForeground: 'oklch(0.15 0.02 280)',
      popover: 'oklch(1 0 0)',
      popoverForeground: 'oklch(0.15 0.02 280)',
      primary: 'oklch(0.48 0.18 305)',
      primaryForeground: 'oklch(1 0 0)',
      secondary: 'oklch(0.85 0.08 305)',
      secondaryForeground: 'oklch(0.20 0.05 305)',
      muted: 'oklch(0.96 0.01 280)',
      mutedForeground: 'oklch(0.50 0.02 280)',
      accent: 'oklch(0.92 0.05 305)',
      accentForeground: 'oklch(0.20 0.05 305)',
      destructive: 'oklch(0.55 0.22 27)',
      destructiveForeground: 'oklch(0.98 0.02 27)',
      border: 'oklch(0.90 0.02 280)',
      input: 'oklch(0.90 0.02 280)',
      ring: 'oklch(0.48 0.18 305)',
    },
    dark: {
      background: 'oklch(0.12 0.02 280)',
      foreground: 'oklch(0.95 0.01 280)',
      card: 'oklch(0.15 0.02 280)',
      cardForeground: 'oklch(0.95 0.01 280)',
      popover: 'oklch(0.15 0.02 280)',
      popoverForeground: 'oklch(0.95 0.01 280)',
      primary: 'oklch(0.65 0.20 305)',
      primaryForeground: 'oklch(1 0 0)',
      secondary: 'oklch(0.25 0.05 305)',
      secondaryForeground: 'oklch(0.95 0.01 280)',
      muted: 'oklch(0.20 0.02 280)',
      mutedForeground: 'oklch(0.70 0.02 280)',
      accent: 'oklch(0.25 0.05 305)',
      accentForeground: 'oklch(0.95 0.01 280)',
      destructive: 'oklch(0.60 0.25 27)',
      destructiveForeground: 'oklch(0.95 0.01 280)',
      border: 'oklch(0.25 0.02 280)',
      input: 'oklch(0.25 0.02 280)',
      ring: 'oklch(0.65 0.20 305)',
    }
  }
}

// Blue Design System
export const blueDesignSystem: DesignSystem = {
  id: 'blue',
  name: 'Blue Design System',
  description: 'Professional blue theme with clean aesthetics',
  primaryHex: '#003478',
  colors: {
    light: {
      background: 'oklch(0.98 0.005 240)',
      foreground: 'oklch(0.15 0.02 240)',
      card: 'oklch(1 0 0)',
      cardForeground: 'oklch(0.15 0.02 240)',
      popover: 'oklch(1 0 0)',
      popoverForeground: 'oklch(0.15 0.02 240)',
      primary: 'oklch(0.32 0.12 250)',
      primaryForeground: 'oklch(1 0 0)',
      secondary: 'oklch(0.85 0.06 250)',
      secondaryForeground: 'oklch(0.20 0.05 250)',
      muted: 'oklch(0.96 0.01 240)',
      mutedForeground: 'oklch(0.50 0.02 240)',
      accent: 'oklch(0.92 0.04 250)',
      accentForeground: 'oklch(0.20 0.05 250)',
      destructive: 'oklch(0.55 0.22 27)',
      destructiveForeground: 'oklch(0.98 0.02 27)',
      border: 'oklch(0.90 0.02 240)',
      input: 'oklch(0.90 0.02 240)',
      ring: 'oklch(0.32 0.12 250)',
    },
    dark: {
      background: 'oklch(0.12 0.02 240)',
      foreground: 'oklch(0.95 0.01 240)',
      card: 'oklch(0.15 0.02 240)',
      cardForeground: 'oklch(0.95 0.01 240)',
      popover: 'oklch(0.15 0.02 240)',
      popoverForeground: 'oklch(0.95 0.01 240)',
      primary: 'oklch(0.55 0.15 250)',
      primaryForeground: 'oklch(1 0 0)',
      secondary: 'oklch(0.25 0.05 250)',
      secondaryForeground: 'oklch(0.95 0.01 240)',
      muted: 'oklch(0.20 0.02 240)',
      mutedForeground: 'oklch(0.70 0.02 240)',
      accent: 'oklch(0.25 0.05 250)',
      accentForeground: 'oklch(0.95 0.01 240)',
      destructive: 'oklch(0.60 0.25 27)',
      destructiveForeground: 'oklch(0.95 0.01 240)',
      border: 'oklch(0.25 0.02 240)',
      input: 'oklch(0.25 0.02 240)',
      ring: 'oklch(0.55 0.15 250)',
    }
  }
}

// All available design systems
export const designSystems: DesignSystem[] = [
  blueDesignSystem,
  purpleDesignSystem,
]

// Get design system by ID
export function getDesignSystem(id: string): DesignSystem {
  return designSystems.find(ds => ds.id === id) || blueDesignSystem
}

// Get current design system from localStorage
export function getCurrentDesignSystem(): DesignSystem {
  if (typeof window === 'undefined') return blueDesignSystem

  const savedId = localStorage.getItem('designSystem')
  return savedId ? getDesignSystem(savedId) : blueDesignSystem
}

// Save design system selection
export function saveDesignSystem(id: string): void {
  if (typeof window === 'undefined') return
  localStorage.setItem('designSystem', id)
}

// Apply design system colors to CSS variables
export function applyDesignSystem(system: DesignSystem, theme: 'light' | 'dark'): void {
  if (typeof document === 'undefined') return

  const colors = system.colors[theme]
  const root = document.documentElement

  // Apply all color variables
  Object.entries(colors).forEach(([key, value]) => {
    const cssVarName = `--color-${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`
    root.style.setProperty(cssVarName, value)
  })
}
