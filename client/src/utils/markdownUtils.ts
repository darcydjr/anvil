// Utility functions to parse markdown to form data and vice versa
import { STATUS_VALUES, APPROVAL_VALUES, PRIORITY_VALUES, REVIEW_VALUES, DEFAULT_VALUES } from './constants'

export interface Dependency {
  id: string
  description: string
}

export interface Enabler {
  id: string
  name: string
  description: string
  status: string
  approval: string
  priority: string
}

export interface FunctionalRequirement {
  id: string
  name: string
  requirement: string
  priority: string
  status: string
  approval: string
}

export interface NonFunctionalRequirement {
  id: string
  name: string
  type: string
  requirement: string
  priority: string
  status: string
  approval: string
}

export interface CapabilityFormData {
  name: string
  owner: string
  status: string
  approval: string
  priority: string
  analysisReview: string
  designReview: string
  codeReview: string
  id?: string
  system?: string
  component?: string
  technicalOverview?: string
  purpose?: string
  internalUpstream?: Dependency[]
  internalDownstream?: Dependency[]
  externalUpstream?: string
  externalDownstream?: string
  enablers?: Enabler[]
  technicalSpecifications?: string
  implementationPlan?: string
}

export interface EnablerFormData {
  name: string
  owner: string
  status: string
  approval: string
  priority: string
  analysisReview: string
  designReview: string
  codeReview: string
  id?: string
  capabilityId?: string
  technicalOverview?: string
  purpose?: string
  functionalRequirements?: FunctionalRequirement[]
  nonFunctionalRequirements?: NonFunctionalRequirement[]
  technicalSpecifications?: string
  implementationPlan?: string
}

export type FormData = CapabilityFormData | EnablerFormData
export type DocumentType = 'capability' | 'enabler'

export function parseMarkdownToForm(markdown: string, type: DocumentType): FormData {
  const lines = markdown.split('\n')
  const result: any = {
    name: '',
    owner: '',
    status: DEFAULT_VALUES.STATUS,
    approval: DEFAULT_VALUES.APPROVAL,
    priority: DEFAULT_VALUES.PRIORITY_CAPABILITY,
    analysisReview: DEFAULT_VALUES.ANALYSIS_REVIEW,
    designReview: DEFAULT_VALUES.DESIGN_REVIEW,
    codeReview: DEFAULT_VALUES.CODE_REVIEW
  }

  // Extract title from H1 heading as fallback for name
  const titleMatch = markdown.match(/^#\s+(.+)$/m)
  if (titleMatch) {
    result.name = titleMatch[1]
  }

  // Extract metadata (metadata Name field will override title if present)
  // Skip lines that are inside HTML comments to avoid parsing template documentation
  let insideComment = false
  for (const line of lines) {
    // Check for HTML comment start/end
    if (line.trim().startsWith('<!--')) {
      insideComment = true
      continue
    }
    if (line.trim().endsWith('-->') || line.trim().includes('-->')) {
      insideComment = false
      continue
    }

    // Skip lines inside comments
    if (insideComment) {
      continue
    }

    // Trim whitespace and make regex more flexible
    const trimmedLine = line.trim()
    const nameMatch = trimmedLine.match(/^-\s*\*\*Name\*\*:\s*(.+)$/)
    const ownerMatch = trimmedLine.match(/^-\s*\*\*Owner\*\*:\s*(.+)$/)
    const statusMatch = trimmedLine.match(/^-\s*\*\*Status\*\*:\s*(.+)$/)
    const approvalMatch = trimmedLine.match(/^-\s*\*\*Approval\*\*:\s*(.+)$/)
    const priorityMatch = trimmedLine.match(/^-\s*\*\*Priority\*\*:\s*(.+)$/)
    const analysisReviewMatch = trimmedLine.match(/^-\s*\*\*Analysis Review\*\*:\s*(.+)$/)
    const codeReviewMatch = trimmedLine.match(/^-\s*\*\*Code Review\*\*:\s*(.+)$/)
    const idMatch = trimmedLine.match(/^-\s*\*\*ID\*\*:\s*(.+)$/)
    const capabilityIdMatch = trimmedLine.match(/^-\s*\*\*Capability ID\*\*:\s*(.+)$/)
    const systemMatch = trimmedLine.match(/^-\s*\*\*System\*\*:\s*(.+)$/)
    const componentMatch = trimmedLine.match(/^-\s*\*\*Component\*\*:\s*(.+)$/)

    if (nameMatch) result.name = nameMatch[1].trim()
    if (ownerMatch) result.owner = ownerMatch[1].trim()
    if (statusMatch) result.status = statusMatch[1].trim()
    if (approvalMatch) result.approval = approvalMatch[1].trim()
    if (priorityMatch) result.priority = priorityMatch[1].trim()
    if (analysisReviewMatch) result.analysisReview = analysisReviewMatch[1].trim()
    if (codeReviewMatch) result.codeReview = codeReviewMatch[1].trim()
    if (idMatch) result.id = idMatch[1].trim()
    if (capabilityIdMatch) result.capabilityId = capabilityIdMatch[1].trim()
    if (systemMatch) result.system = systemMatch[1].trim()
    if (componentMatch) result.component = componentMatch[1].trim()
  }

  // Extract Technical Overview for both capabilities and enablers
  result.technicalOverview = extractTechnicalOverview(markdown)

  // Extract Purpose content from Technical Overview section
  result.purpose = extractPurposeFromTechnicalOverview(markdown)

  if (type === 'capability') {
    result.internalUpstream = parseTable(markdown, 'Internal Upstream Dependency')
    result.internalDownstream = parseTable(markdown, 'Internal Downstream Impact')
    result.externalUpstream = extractExternalDependency(markdown, 'External Upstream Dependencies')
    result.externalDownstream = extractExternalDependency(markdown, 'External Downstream Impact')
    result.enablers = parseEnablersTable(markdown)
    // Preserve Technical Specifications section from template
    result.technicalSpecifications = extractTechnicalSpecifications(markdown)
    // Preserve Development Plan section from template
    result.implementationPlan = extractImplementationPlan(markdown)
  } else if (type === 'enabler') {
    result.functionalRequirements = parseFunctionalRequirements(markdown)
    result.nonFunctionalRequirements = parseNonFunctionalRequirements(markdown)
    // Preserve Technical Specifications section from template
    result.technicalSpecifications = extractTechnicalSpecifications(markdown)
    // Preserve Development Plan section from template
    result.implementationPlan = extractImplementationPlan(markdown)
  }

  return result
}

export function convertFormToMarkdown(formData: FormData, type: DocumentType): string {
  let markdown = `# ${formData.name}\n\n`

  // Add metadata
  markdown += `## Metadata\n\n`
  markdown += `- **Name**: ${formData.name}\n`
  if (type === 'capability') markdown += `- **Type**: Capability\n`
  if (type === 'enabler') markdown += `- **Type**: Enabler\n`
  if (type === 'capability' && (formData as CapabilityFormData).system) markdown += `- **System**: ${(formData as CapabilityFormData).system}\n`
  if (type === 'capability' && (formData as CapabilityFormData).component) markdown += `- **Component**: ${(formData as CapabilityFormData).component}\n`
  if (formData.id) markdown += `- **ID**: ${formData.id}\n`
  markdown += `- **Approval**: ${formData.approval}\n`
  if ((formData as EnablerFormData).capabilityId) markdown += `- **Capability ID**: ${(formData as EnablerFormData).capabilityId}\n`
  markdown += `- **Owner**: ${formData.owner}\n`
  markdown += `- **Status**: ${formData.status}\n`
  markdown += `- **Priority**: ${formData.priority}\n`

  // Add review fields for both capabilities and enablers
  if (type === 'capability') {
    markdown += `- **Analysis Review**: ${formData.analysisReview || 'Required'}\n`
  } else if (type === 'enabler') {
    markdown += `- **Analysis Review**: ${formData.analysisReview || 'Required'}\n`
    markdown += `- **Code Review**: ${formData.codeReview || 'Not Required'}\n`
  }

  markdown += `\n`

  // Add Technical Overview section (appears right after metadata for both types)
  if (formData.purpose) {
    // Use the purpose field from form if available
    markdown += `## Technical Overview\n### Purpose\n${formData.purpose}\n\n`
  } else if (formData.technicalOverview) {
    // Fall back to preserved technical overview section
    markdown += formData.technicalOverview + '\n\n'
  } else {
    // Add default Technical Overview section if not present
    markdown += `## Technical Overview\n### Purpose\n[What is the purpose?]\n\n`
  }

  if (type === 'capability') {
    const capData = formData as CapabilityFormData
    // Enablers (comes right after metadata)
    markdown += `## Enablers\n\n`
    if (capData.enablers && capData.enablers.length > 0) {
      markdown += `| Enabler ID | Name | Description | Status | Approval | Priority |\n`
      markdown += `|------------|------|-------------|--------|----------|----------|\n`
      capData.enablers.forEach(enabler => {
        markdown += `| ${enabler.id || ''} | ${enabler.name || ''} | ${enabler.description || ''} | ${enabler.status || STATUS_VALUES.ENABLER.IN_DRAFT} | ${enabler.approval || APPROVAL_VALUES.NOT_APPROVED} | ${enabler.priority || PRIORITY_VALUES.CAPABILITY_ENABLER.HIGH} |\n`
      })
    } else {
      markdown += `| Enabler ID | Name | Description | Status | Approval | Priority |\n`
      markdown += `|------------|------|-------------|--------|----------|----------|\n`
      markdown += `| | | | | | |\n`
    }
    markdown += `\n`

    // Dependencies Section
    markdown += `## Dependencies\n\n`

    // Internal Dependencies
    markdown += `### Internal Upstream Dependency\n\n`
    if (capData.internalUpstream && capData.internalUpstream.length > 0) {
      markdown += createDependencyTable(capData.internalUpstream)
      markdown += `\n`
    } else {
      markdown += `| Capability ID | Description |\n`
      markdown += `|---------------|-------------|\n`
      markdown += `| | |\n\n`
    }

    markdown += `### Internal Downstream Impact\n\n`
    if (capData.internalDownstream && capData.internalDownstream.length > 0) {
      markdown += createDependencyTable(capData.internalDownstream)
      markdown += `\n`
    } else {
      markdown += `| Capability ID | Description |\n`
      markdown += `|---------------|-------------|\n`
      markdown += `| | |\n\n`
    }

    // External Dependencies
    markdown += `### External Dependencies\n\n`
    markdown += `**External Upstream Dependencies**: ${capData.externalUpstream || 'None identified.'}\n\n`
    markdown += `**External Downstream Impact**: ${capData.externalDownstream || 'None identified.'}\n\n`

    // Technical Specifications logic - preserve existing, only add for completely new documents
    if (capData.technicalSpecifications && capData.technicalSpecifications.trim().length > 0) {
      // Always preserve existing content exactly as is (no modifications)
      markdown += capData.technicalSpecifications.trim() + `\n\n`
    } else {
      // Only add template for completely new capabilities (no existing technical specifications)
      markdown += generateCapabilityTechnicalSpecificationsTemplate()
    }

    // Development Plan (preserved from template)
    if (capData.implementationPlan) {
      markdown += formatImplementationPlan(capData.implementationPlan)
    }
  } else if (type === 'enabler') {
    const enbData = formData as EnablerFormData
    // Functional Requirements
    markdown += `## Functional Requirements\n\n`
    if (enbData.functionalRequirements && enbData.functionalRequirements.length > 0) {
      markdown += `| ID | Name | Requirement | Priority | Status | Approval |\n`
      markdown += `|----|------|-------------|----------|--------|----------|\n`
      enbData.functionalRequirements.forEach(req => {
        markdown += `| ${req.id || ''} | ${req.name || ''} | ${req.requirement || ''} | ${req.priority || PRIORITY_VALUES.REQUIREMENT.MUST_HAVE} | ${req.status || STATUS_VALUES.REQUIREMENT.IN_DRAFT} | ${req.approval || APPROVAL_VALUES.NOT_APPROVED} |\n`
      })
    } else {
      markdown += `| ID | Name | Requirement | Priority | Status | Approval |\n`
      markdown += `|----|------|-------------|----------|--------|----------|\n`
      markdown += `| | | | | | |\n`
    }
    markdown += `\n`

    // Non-Functional Requirements
    markdown += `## Non-Functional Requirements\n\n`
    if (enbData.nonFunctionalRequirements && enbData.nonFunctionalRequirements.length > 0) {
      markdown += `| ID | Name | Type | Requirement | Priority | Status | Approval |\n`
      markdown += `|----|------|------|-------------|----------|--------|----------|\n`
      enbData.nonFunctionalRequirements.forEach(req => {
        markdown += `| ${req.id || ''} | ${req.name || ''} | ${req.type || ''} | ${req.requirement || ''} | ${req.priority || PRIORITY_VALUES.REQUIREMENT.MUST_HAVE} | ${req.status || STATUS_VALUES.REQUIREMENT.IN_DRAFT} | ${req.approval || APPROVAL_VALUES.NOT_APPROVED} |\n`
      })
    } else {
      markdown += `| ID | Name | Type | Requirement | Priority | Status | Approval |\n`
      markdown += `|----|------|------|-------------|----------|--------|----------|\n`
      markdown += `| | | | | | | |\n`
    }
    markdown += `\n`

    // Technical Specifications logic - preserve existing, only add for completely new documents
    if (enbData.technicalSpecifications && enbData.technicalSpecifications.trim().length > 0) {
      // Always preserve existing content exactly as is (no modifications)
      markdown += enbData.technicalSpecifications.trim() + `\n\n`
    } else {
      // Only add template for completely new enablers (no existing technical specifications)
      markdown += generateEnablerTechnicalSpecificationsTemplate()
    }

    // Development Plan (preserved from template)
    if (enbData.implementationPlan) {
      markdown += formatImplementationPlan(enbData.implementationPlan)
    }
  }

  return markdown
}

export function parseTable(markdown: string, sectionTitle: string): Dependency[] {
  const lines = markdown.split('\n')
  const sectionIndex = lines.findIndex(line => line.includes(sectionTitle))

  if (sectionIndex === -1) {
    return []
  }

  const result: Dependency[] = []
  let foundTable = false

  for (let i = sectionIndex; i < lines.length; i++) {
    const line = lines[i]

    if (line.startsWith('|') && !line.includes('---')) {
      if (!foundTable) {
        foundTable = true
        continue // Skip header row
      }

      const cells = line.split('|').map(cell => cell.trim())
      // Remove first and last empty cells (from leading/trailing pipes), but keep middle empty cells
      if (cells.length > 0 && cells[0] === '') cells.shift()
      if (cells.length > 0 && cells[cells.length - 1] === '') cells.pop()

      if (cells.length >= 2) {
        result.push({
          id: cells[0] || '',
          description: cells[1] || ''
        })
      }
    } else if (foundTable && line.startsWith('#')) {
      break
    }
  }

  return result.filter(row => row.id.trim() || row.description.trim()) // Filter completely empty rows
}

function parseEnablersTable(markdown: string): Enabler[] {
  const lines = markdown.split('\n')
  const sectionIndex = lines.findIndex(line => line.includes('Enablers'))

  if (sectionIndex === -1) return []

  const result: Enabler[] = []
  let foundTable = false
  let headerColumns: string[] = []

  for (let i = sectionIndex; i < lines.length; i++) {
    const line = lines[i]

    if (line.startsWith('|') && !line.includes('---')) {
      if (!foundTable) {
        foundTable = true
        // Parse header to understand column structure
        const headerCells = line.split('|').map(cell => cell.trim().toLowerCase())
        if (headerCells.length > 0 && headerCells[0] === '') headerCells.shift()
        if (headerCells.length > 0 && headerCells[headerCells.length - 1] === '') headerCells.pop()
        headerColumns = headerCells
        continue // Skip header row
      }

      const cells = line.split('|').map(cell => cell.trim())
      // Remove first and last empty cells (from leading/trailing pipes)
      if (cells.length > 0 && cells[0] === '') cells.shift()
      if (cells.length > 0 && cells[cells.length - 1] === '') cells.pop()

      // Flexible parsing based on available columns
      if (cells.length >= 3) { // Minimum: ID, Name, Description
        const enabler: Enabler = {
          id: '',
          name: '',
          description: '',
          status: STATUS_VALUES.ENABLER.IN_DRAFT,
          approval: APPROVAL_VALUES.NOT_APPROVED,
          priority: PRIORITY_VALUES.CAPABILITY_ENABLER.HIGH
        }

        // Map cells to fields based on header or position
        for (let j = 0; j < Math.min(cells.length, headerColumns.length); j++) {
          const header = headerColumns[j]
          const value = cells[j] || ''

          if (header.includes('id')) {
            enabler.id = value
          } else if (header.includes('name')) {
            enabler.name = value
          } else if (header.includes('description')) {
            enabler.description = value
          } else if (header.includes('status')) {
            enabler.status = value || STATUS_VALUES.ENABLER.IN_DRAFT
          } else if (header.includes('approval')) {
            enabler.approval = value || APPROVAL_VALUES.NOT_APPROVED
          } else if (header.includes('priority')) {
            enabler.priority = value || PRIORITY_VALUES.CAPABILITY_ENABLER.HIGH
          } else {
            // Fallback to positional mapping for standard 6-column format
            if (j === 0) enabler.id = value
            else if (j === 1) enabler.name = value
            else if (j === 2) enabler.description = value
            else if (j === 3) enabler.status = value || STATUS_VALUES.ENABLER.IN_DRAFT
            else if (j === 4) enabler.approval = value || APPROVAL_VALUES.NOT_APPROVED
            else if (j === 5) enabler.priority = value || PRIORITY_VALUES.CAPABILITY_ENABLER.HIGH
          }
        }

        result.push(enabler)
      }
    } else if (foundTable && line.startsWith('#')) {
      break
    }
  }

  return result.filter(row => row.id || row.name || row.description) // Filter empty rows
}

function parseFunctionalRequirements(markdown: string): FunctionalRequirement[] {
  return parseRequirementsTable(markdown, 'Functional Requirements', ['id', 'name', 'requirement', 'priority', 'status', 'approval']) as FunctionalRequirement[]
}

function parseNonFunctionalRequirements(markdown: string): NonFunctionalRequirement[] {
  return parseRequirementsTable(markdown, 'Non-Functional Requirements', ['id', 'name', 'type', 'requirement', 'priority', 'status', 'approval']) as NonFunctionalRequirement[]
}

function parseRequirementsTable(markdown: string, sectionTitle: string, fields: string[]): any[] {
  const lines = markdown.split('\n')
  const sectionIndex = lines.findIndex(line => line.includes(sectionTitle))

  if (sectionIndex === -1) return []

  const result: any[] = []
  let foundTable = false
  let headerColumns: string[] = []

  for (let i = sectionIndex; i < lines.length; i++) {
    const line = lines[i]

    if (line.startsWith('|') && !line.includes('---')) {
      if (!foundTable) {
        foundTable = true
        // Parse header to understand column structure
        const headerCells = line.split('|').map(cell => cell.trim().toLowerCase())
        if (headerCells.length > 0 && headerCells[0] === '') headerCells.shift()
        if (headerCells.length > 0 && headerCells[headerCells.length - 1] === '') headerCells.pop()
        headerColumns = headerCells
        continue // Skip header row
      }

      const cells = line.split('|').map(cell => cell.trim())
      // Remove first and last empty cells (from leading/trailing pipes)
      if (cells.length > 0 && cells[0] === '') cells.shift()
      if (cells.length > 0 && cells[cells.length - 1] === '') cells.pop()

      // Check if this is an empty row (all cells are empty or whitespace)
      const isEmptyRow = cells.every(cell => !cell || cell.trim() === '')

      // Skip empty rows entirely
      if (isEmptyRow) {
        continue
      }

      // Flexible parsing - handle tables with fewer columns than expected
      if (cells.length >= Math.min(3, fields.length)) { // At least 3 columns or minimum required
        const row: any = {}

        // Initialize all fields with defaults
        fields.forEach(field => {
          if (field === 'priority') {
            row[field] = sectionTitle.includes('Functional')
              ? PRIORITY_VALUES.REQUIREMENT.MUST_HAVE
              : PRIORITY_VALUES.REQUIREMENT.MUST_HAVE
          } else if (field === 'status') {
            row[field] = STATUS_VALUES.REQUIREMENT.IN_DRAFT
          } else if (field === 'approval') {
            row[field] = APPROVAL_VALUES.NOT_APPROVED
          } else {
            row[field] = ''
          }
        })

        // Map available cells to fields
        for (let j = 0; j < Math.min(cells.length, fields.length); j++) {
          if (j < headerColumns.length) {
            // Try to match by header name
            const header = headerColumns[j]
            const matchingField = fields.find(field =>
              header.includes(field.toLowerCase()) ||
              field.toLowerCase().includes(header)
            )
            if (matchingField) {
              row[matchingField] = cells[j] || row[matchingField]
            } else {
              // Fallback to positional mapping
              row[fields[j]] = cells[j] || row[fields[j]]
            }
          } else {
            // Positional mapping when no header info
            row[fields[j]] = cells[j] || row[fields[j]]
          }
        }

        result.push(row)
      }
    } else if (foundTable && line.startsWith('#')) {
      break
    }
  }

  return result.filter(row => {
    // More robust empty value checking
    return Object.values(row).some(value => {
      if (value === null || value === undefined) return false
      if (typeof value === 'string') return value.trim() !== ''
      if (typeof value === 'number') return !isNaN(value)
      if (typeof value === 'boolean') return true
      return Boolean(value) // For other types
    })
  })
}

function extractTechnicalOverview(markdown: string): string {
  const lines = markdown.split('\n')
  const startIndex = lines.findIndex(line => line.trim().startsWith('## Technical Overview'))

  if (startIndex === -1) return ''

  const result: string[] = []
  let inSection = false

  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i]

    if (line.trim().startsWith('## Technical Overview')) {
      inSection = true
      result.push(line)
      continue
    }

    // Stop when we hit another major section (## level)
    if (inSection && line.startsWith('## ') && !line.startsWith('## Technical Overview')) {
      break
    }

    if (inSection) {
      result.push(line)
    }
  }

  return result.join('\n')
}

function extractPurposeFromTechnicalOverview(markdown: string): string {
  const lines = markdown.split('\n')
  const overviewStartIndex = lines.findIndex(line => line.trim().startsWith('## Technical Overview'))

  if (overviewStartIndex === -1) return ''

  const purposeStartIndex = lines.findIndex((line, index) =>
    index > overviewStartIndex && line.trim().startsWith('### Purpose')
  )

  if (purposeStartIndex === -1) return ''

  const result: string[] = []
  let collectingPurpose = false

  for (let i = purposeStartIndex + 1; i < lines.length; i++) {
    const line = lines[i]

    // Stop when we hit another section (### or ## level)
    if (line.startsWith('###') || line.startsWith('##')) {
      break
    }

    // Skip empty lines at the start
    if (!collectingPurpose && line.trim() === '') {
      continue
    }

    collectingPurpose = true
    result.push(line)
  }

  return result.join('\n').trim()
}

function extractTechnicalSpecifications(markdown: string): string {
  const lines = markdown.split('\n')
  // Look for both H1 and H2 Technical Specifications headings
  const startIndex = lines.findIndex(line =>
    line.trim().startsWith('# Technical Specifications') ||
    line.trim().startsWith('## Technical Specifications')
  )

  if (startIndex === -1) return ''

  const result: string[] = []
  let inSection = false
  let sectionLevel = ''

  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i]

    if (line.trim().startsWith('# Technical Specifications') ||
      line.trim().startsWith('## Technical Specifications')) {
      inSection = true
      sectionLevel = line.startsWith('# ') ? '# ' : '## '
      result.push(line)
      continue
    }

    // Stop when we hit another section at the same or higher level
    if (inSection && line.startsWith(sectionLevel) &&
      !line.trim().startsWith(sectionLevel + 'Technical Specifications')) {
      break
    }

    if (inSection) {
      result.push(line)
    }
  }

  return result.join('\n')
}

function extractImplementationPlan(markdown: string): string {
  const lines = markdown.split('\n')
  // Look for both old and new Development Plan section names
  const startIndex = lines.findIndex(line =>
    line.trim().startsWith('# Development Plan') ||
    line.trim().startsWith('## Development Plan') ||
    line.trim().startsWith('## Implementation Plan') ||
    line.trim().startsWith('## Capability Development Plan') ||
    line.trim().startsWith('## Enabler Development Plan')
  )

  if (startIndex === -1) return ''

  const result: string[] = []
  let inSection = false
  let sectionName = ''

  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i]

    if (line.trim().startsWith('# Development Plan') ||
      line.trim().startsWith('## Development Plan') ||
      line.trim().startsWith('## Implementation Plan') ||
      line.trim().startsWith('## Capability Development Plan') ||
      line.trim().startsWith('## Enabler Development Plan')) {
      inSection = true
      sectionName = line.trim()
      result.push(line)
      continue
    }

    // Stop when we hit another major section (# or ## level depending on what we're extracting)
    if (inSection && ((line.startsWith('# ') && sectionName.startsWith('# ')) ||
      (line.startsWith('## ') && sectionName.startsWith('## '))) &&
      line.trim() !== sectionName) {
      break
    }

    if (inSection) {
      result.push(line)
    }
  }

  return result.join('\n')
}

export function createDependencyTable(dependencies: Dependency[]): string {
  let table = `| Capability ID | Description |\n`
  table += `|---------------|-------------|\n`

  if (dependencies.length === 0) {
    table += `| | |\n`
  } else {
    dependencies.forEach(dep => {
      table += `| ${dep.id || ''} | ${dep.description || ''} |\n`
    })
  }

  return table
}

function extractExternalDependency(markdown: string, sectionTitle: string): string {
  const lines = markdown.split('\n')
  const sectionIndex = lines.findIndex(line => line.includes(`**${sectionTitle}**`))

  if (sectionIndex === -1) return ''

  const line = lines[sectionIndex]
  const match = line.match(new RegExp(`\\*\\*${sectionTitle}\\*\\*:\\s*(.+)`))

  return match ? match[1] : ''
}

function formatImplementationPlan(implementationPlan: string): string {
  const trimmedPlan = implementationPlan.trim()
  // Only add if the section doesn't already start with a proper header
  if (trimmedPlan && !trimmedPlan.startsWith('# Development Plan') && !trimmedPlan.startsWith('## Development Plan')) {
    return `# Development Plan\n\n${trimmedPlan}\n\n`
  } else {
    return trimmedPlan + `\n\n`
  }
}

export function generateCapabilityTechnicalSpecificationsTemplate(): string {
  let template = `## Technical Specifications (Template)\n\n`
  template += `### Capability Dependency Flow Diagram\n`
  template += `> **Note for AI**: When designing this section, show the direct relationships and dependencies between capabilities (NOT enablers). Focus on capability-to-capability interactions, business value flows, and how capabilities work together to deliver end-to-end business outcomes. Include:\n`
  template += `> - **Current Capability**: The capability being defined and its role in the business value chain\n`
  template += `> - **Internal Dependencies**: Dependencies on other capabilities within the same organizational boundary/domain\n`
  template += `> - **External Dependencies**: Dependencies on capabilities across organizational boundaries.\n`
  template += `> - **Business Flow**: How business value and data flows between capabilities\n`
  template += `> - **Exclude**: Enabler-level details, technical implementation specifics, infrastructure components\n\n`
  template += `\`\`\`mermaid\n`
  template += `flowchart TD\n`
  template += `    %% Current Capability\n`
  template += `    CURRENT["Current Capability<br/>Primary Business Function<br/>🎯"]\n`
  template += `    \n`
  template += `    %% Internal Capabilities (Same Organization)\n`
  template += `    INT1["Supporting Capability A<br/>Core Service<br/>⚙️"]\n`
  template += `    INT2["Supporting Capability B<br/>Data Management<br/>📊"]\n`
  template += `    INT3["Supporting Capability C<br/>Business Logic<br/>🔧"]\n`
  template += `    \n`
  template += `    %% External Capabilities (Different Organization)\n`
  template += `    EXT1["External Capability A<br/>Third-party Service<br/>🌐"]\n`
  template += `    EXT2["External Capability B<br/>Integration Point<br/>🔗"]\n`
  template += `    \n`
  template += `    %% Internal Dependencies Flow\n`
  template += `    INT1 --> CURRENT\n`
  template += `    CURRENT --> INT2\n`
  template += `    INT2 --> INT3\n`
  template += `    \n`
  template += `    %% External Dependencies Flow\n`
  template += `    EXT1 --> CURRENT\n`
  template += `    CURRENT --> EXT2\n`
  template += `    \n`
  template += `    %% Styling\n`
  template += `    classDef current fill:#e3f2fd,stroke:#1976d2,stroke-width:3px\n`
  template += `    classDef internal fill:#e8f5e8,stroke:#388e3c,stroke-width:2px\n`
  template += `    classDef external fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px\n`
  template += `    \n`
  template += `    class CURRENT current\n`
  template += `    class INT1,INT2,INT3 internal\n`
  template += `    class EXT1,EXT2 external\n`
  template += `    \n`
  template += `    %% Capability Grouping\n`
  template += `    subgraph ORG1 ["Internal Organization"]\n`
  template += `        subgraph DOMAIN1 ["Current Domain"]\n`
  template += `            CURRENT\n`
  template += `        end\n`
  template += `        subgraph DOMAIN2 ["Supporting Domain"]\n`
  template += `            INT1\n`
  template += `            INT2\n`
  template += `            INT3\n`
  template += `        end\n`
  template += `    end\n`
  template += `    \n`
  template += `    subgraph ORG2 ["External Organization"]\n`
  template += `        EXT1\n`
  template += `        EXT2\n`
  template += `    end\n`
  template += `\`\`\`\n\n`
  return template
}

export function generateEnablerTechnicalSpecificationsTemplate(): string {
  let template = `## Technical Specifications (Template)\n\n`
  template += `### Enabler Dependency Flow Diagram\n`
  template += `\`\`\`mermaid\n`
  template += `flowchart TD\n`
  template += `    ENB_ID["ENB-ID<br/>Enabler Name<br/>📡"]\n`
  template += `    \n`
  template += `    %% Add your dependency flows here\n`
  template += `    \n`
  template += `    classDef enabler fill:#e3f2fd,stroke:#1976d2,stroke-width:2px\n`
  template += `    class ENB_ID enabler\n`
  template += `\`\`\`\n\n`
  template += `### API Technical Specifications (if applicable)\n\n`
  template += `| API Type | Operation | Channel / Endpoint | Description | Request / Publish Payload | Response / Subscribe Data |\n`
  template += `|----------|-----------|---------------------|-------------|----------------------------|----------------------------|\n`
  template += `| | | | | | |\n\n`
  template += `### Data Models\n`
  template += `\`\`\`mermaid\n`
  template += `erDiagram\n`
  template += `    Entity {\n`
  template += `        string id PK\n`
  template += `        string name\n`
  template += `        string description\n`
  template += `    }\n`
  template += `    \n`
  template += `    %% Add relationships and more entities here\n`
  template += `\`\`\`\n\n`
  template += `### Class Diagrams\n`
  template += `\`\`\`mermaid\n`
  template += `classDiagram\n`
  template += `    class ENB_ID_Class {\n`
  template += `        +String property\n`
  template += `        +method() void\n`
  template += `    }\n`
  template += `    \n`
  template += `    %% Add more classes and relationships here\n`
  template += `\`\`\`\n\n`
  template += `### Sequence Diagrams\n`
  template += `\`\`\`mermaid\n`
  template += `sequenceDiagram\n`
  template += `    participant A as Actor\n`
  template += `    participant S as System\n`
  template += `    \n`
  template += `    A->>S: Request\n`
  template += `    S-->>A: Response\n`
  template += `    \n`
  template += `    %% Add more interactions here\n`
  template += `\`\`\`\n\n`
  template += `### Dataflow Diagrams\n`
  template += `\`\`\`mermaid\n`
  template += `flowchart TD\n`
  template += `    Input[Input Data] --> Process[Process]\n`
  template += `    Process --> Output[Output Data]\n`
  template += `    \n`
  template += `    %% Add your dataflow diagrams here\n`
  template += `\`\`\`\n\n`
  template += `### State Diagrams\n`
  template += `\`\`\`mermaid\n`
  template += `stateDiagram-v2\n`
  template += `    [*] --> Initial\n`
  template += `    Initial --> Processing\n`
  template += `    Processing --> Complete\n`
  template += `    Complete --> [*]\n`
  template += `    \n`
  template += `    %% Add more states and transitions here\n`
  template += `\`\`\`\n\n`
  return template
}
