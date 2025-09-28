// Utility functions to parse markdown to form data and vice versa
import { STATUS_VALUES, APPROVAL_VALUES, PRIORITY_VALUES, REVIEW_VALUES, DEFAULT_VALUES } from './constants'

export function parseMarkdownToForm(markdown, type) {
  const lines = markdown.split('\n')
  const result = {
    name: '',
    owner: '',
    status: DEFAULT_VALUES.STATUS,
    approval: DEFAULT_VALUES.APPROVAL,
    priority: DEFAULT_VALUES.PRIORITY_CAPABILITY,
    analysisReview: DEFAULT_VALUES.ANALYSIS_REVIEW,
    designReview: DEFAULT_VALUES.DESIGN_REVIEW,
    codeReview: DEFAULT_VALUES.CODE_REVIEW
  }

  // Extract metadata
  for (const line of lines) {
    const nameMatch = line.match(/^-\s*\*\*Name\*\*:\s*(.+)$/);
    const ownerMatch = line.match(/^-\s*\*\*Owner\*\*:\s*(.+)$/);
    const statusMatch = line.match(/^-\s*\*\*Status\*\*:\s*(.+)$/);
    const approvalMatch = line.match(/^-\s*\*\*Approval\*\*:\s*(.+)$/);
    const priorityMatch = line.match(/^-\s*\*\*Priority\*\*:\s*(.+)$/);
    const analysisReviewMatch = line.match(/^-\s*\*\*Analysis Review\*\*:\s*(.+)$/);
    const codeReviewMatch = line.match(/^-\s*\*\*Code Review\*\*:\s*(.+)$/);
    const idMatch = line.match(/^-\s*\*\*ID\*\*:\s*(.+)$/);
    const capabilityIdMatch = line.match(/^-\s*\*\*Capability ID\*\*:\s*(.+)$/);
    const systemMatch = line.match(/^-\s*\*\*System\*\*:\s*(.+)$/);
    const componentMatch = line.match(/^-\s*\*\*Component\*\*:\s*(.+)$/);

    if (nameMatch) result.name = nameMatch[1];
    if (ownerMatch) result.owner = ownerMatch[1];
    if (statusMatch) result.status = statusMatch[1];
    if (approvalMatch) result.approval = approvalMatch[1];
    if (priorityMatch) result.priority = priorityMatch[1];
    if (analysisReviewMatch) result.analysisReview = analysisReviewMatch[1];
    if (codeReviewMatch) result.codeReview = codeReviewMatch[1];
    if (idMatch) result.id = idMatch[1];
    if (capabilityIdMatch) result.capabilityId = capabilityIdMatch[1];
    if (systemMatch) result.system = systemMatch[1];
    if (componentMatch) result.component = componentMatch[1];
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

export function convertFormToMarkdown(formData, type) {
  let markdown = `# ${formData.name}\n\n`
  
  // Add metadata
  markdown += `## Metadata\n\n`
  markdown += `- **Name**: ${formData.name}\n`
  if (type === 'capability') markdown += `- **Type**: Capability\n`
  if (type === 'enabler') markdown += `- **Type**: Enabler\n`
  if (type === 'capability' && formData.system) markdown += `- **System**: ${formData.system}\n`
  if (type === 'capability' && formData.component) markdown += `- **Component**: ${formData.component}\n`
  if (formData.id) markdown += `- **ID**: ${formData.id}\n`
  markdown += `- **Approval**: ${formData.approval}\n`
  if (formData.capabilityId) markdown += `- **Capability ID**: ${formData.capabilityId}\n`
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
    // Enablers (comes right after metadata)
    markdown += `## Enablers\n\n`
    if (formData.enablers && formData.enablers.length > 0) {
      markdown += `| Enabler ID | Name | Description | Status | Approval | Priority |\n`
      markdown += `|------------|------|-------------|--------|----------|----------|\n`
      formData.enablers.forEach(enabler => {
        markdown += `| ${enabler.id || ''} | ${enabler.name || ''} | ${enabler.description || ''} | ${enabler.status || STATUS_VALUES.ENABLER.DRAFT} | ${enabler.approval || APPROVAL_VALUES.NOT_APPROVED} | ${enabler.priority || PRIORITY_VALUES.CAPABILITY_ENABLER.HIGH} |\n`
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
    if (formData.internalUpstream && formData.internalUpstream.length > 0) {
      markdown += createDependencyTable(formData.internalUpstream)
      markdown += `\n`
    } else {
      markdown += `| Capability ID | Description |\n`
      markdown += `|---------------|-------------|\n`
      markdown += `| | |\n\n`
    }

    markdown += `### Internal Downstream Impact\n\n`
    if (formData.internalDownstream && formData.internalDownstream.length > 0) {
      markdown += createDependencyTable(formData.internalDownstream)
      markdown += `\n`
    } else {
      markdown += `| Capability ID | Description |\n`
      markdown += `|---------------|-------------|\n`
      markdown += `| | |\n\n`
    }

    // External Dependencies
    markdown += `### External Dependencies\n\n`
    markdown += `**External Upstream Dependencies**: ${formData.externalUpstream || 'None identified.'}\n\n`
    markdown += `**External Downstream Impact**: ${formData.externalDownstream || 'None identified.'}\n\n`

    // Technical Specifications logic - preserve existing, only add for completely new documents
    if (formData.technicalSpecifications && formData.technicalSpecifications.trim().length > 0) {
      // Always preserve existing content exactly as is (no modifications)
      markdown += formData.technicalSpecifications.trim() + `\n\n`
    } else {
      // Only add template for completely new capabilities (no existing technical specifications)
      markdown += `## Technical Specifications (Template)\n\n`
      markdown += `### Capability Dependency Flow Diagram\n`
      markdown += `> **Note for AI**: When designing this section, show the direct relationships and dependencies between capabilities (NOT enablers). Focus on capability-to-capability interactions, business value flows, and how capabilities work together to deliver end-to-end business outcomes. Include:\n`
      markdown += `> - **Current Capability**: The capability being defined and its role in the business value chain\n`
      markdown += `> - **Internal Dependencies**: Dependencies on other capabilities within the same organizational boundary/domain\n`
      markdown += `> - **External Dependencies**: Dependencies on capabilities across organizational boundaries.\n`
      markdown += `> - **Business Flow**: How business value and data flows between capabilities\n`
      markdown += `> - **Exclude**: Enabler-level details, technical implementation specifics, infrastructure components\n\n`
      markdown += `\`\`\`mermaid\n`
      markdown += `flowchart TD\n`
      markdown += `    %% Current Capability\n`
      markdown += `    CURRENT["Current Capability<br/>Primary Business Function<br/>🎯"]\n`
      markdown += `    \n`
      markdown += `    %% Internal Capabilities (Same Organization)\n`
      markdown += `    INT1["Supporting Capability A<br/>Core Service<br/>⚙️"]\n`
      markdown += `    INT2["Supporting Capability B<br/>Data Management<br/>📊"]\n`
      markdown += `    INT3["Supporting Capability C<br/>Business Logic<br/>🔧"]\n`
      markdown += `    \n`
      markdown += `    %% External Capabilities (Different Organization)\n`
      markdown += `    EXT1["External Capability A<br/>Third-party Service<br/>🌐"]\n`
      markdown += `    EXT2["External Capability B<br/>Integration Point<br/>🔗"]\n`
      markdown += `    \n`
      markdown += `    %% Internal Dependencies Flow\n`
      markdown += `    INT1 --> CURRENT\n`
      markdown += `    CURRENT --> INT2\n`
      markdown += `    INT2 --> INT3\n`
      markdown += `    \n`
      markdown += `    %% External Dependencies Flow\n`
      markdown += `    EXT1 --> CURRENT\n`
      markdown += `    CURRENT --> EXT2\n`
      markdown += `    \n`
      markdown += `    %% Styling\n`
      markdown += `    classDef current fill:#e3f2fd,stroke:#1976d2,stroke-width:3px\n`
      markdown += `    classDef internal fill:#e8f5e8,stroke:#388e3c,stroke-width:2px\n`
      markdown += `    classDef external fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px\n`
      markdown += `    \n`
      markdown += `    class CURRENT current\n`
      markdown += `    class INT1,INT2,INT3 internal\n`
      markdown += `    class EXT1,EXT2 external\n`
      markdown += `    \n`
      markdown += `    %% Capability Grouping\n`
      markdown += `    subgraph ORG1 ["Internal Organization"]\n`
      markdown += `        subgraph DOMAIN1 ["Current Domain"]\n`
      markdown += `            CURRENT\n`
      markdown += `        end\n`
      markdown += `        subgraph DOMAIN2 ["Supporting Domain"]\n`
      markdown += `            INT1\n`
      markdown += `            INT2\n`
      markdown += `            INT3\n`
      markdown += `        end\n`
      markdown += `    end\n`
      markdown += `    \n`
      markdown += `    subgraph ORG2 ["External Organization"]\n`
      markdown += `        EXT1\n`
      markdown += `        EXT2\n`
      markdown += `    end\n`
      markdown += `\`\`\`\n\n`
    }

    // Development Plan (preserved from template)
    if (formData.implementationPlan) {
      const trimmedPlan = formData.implementationPlan.trim()
      // Only add if the section doesn't already start with a proper header
      if (trimmedPlan && !trimmedPlan.startsWith('# Development Plan') && !trimmedPlan.startsWith('## Development Plan')) {
        markdown += `# Development Plan\n\n${trimmedPlan}\n\n`
      } else {
        markdown += trimmedPlan + `\n\n`
      }
    }
  } else if (type === 'enabler') {
    // Functional Requirements
    markdown += `## Functional Requirements\n\n`
    if (formData.functionalRequirements && formData.functionalRequirements.length > 0) {
      markdown += `| ID | Name | Requirement | Priority | Status | Approval |\n`
      markdown += `|----|------|-------------|----------|--------|----------|\n`
      formData.functionalRequirements.forEach(req => {
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
    if (formData.nonFunctionalRequirements && formData.nonFunctionalRequirements.length > 0) {
      markdown += `| ID | Name | Type | Requirement | Priority | Status | Approval |\n`
      markdown += `|----|------|------|-------------|----------|--------|----------|\n`
      formData.nonFunctionalRequirements.forEach(req => {
        markdown += `| ${req.id || ''} | ${req.name || ''} | ${req.type || ''} | ${req.requirement || ''} | ${req.priority || PRIORITY_VALUES.REQUIREMENT.MUST_HAVE} | ${req.status || STATUS_VALUES.REQUIREMENT.IN_DRAFT} | ${req.approval || APPROVAL_VALUES.NOT_APPROVED} |\n`
      })
    } else {
      markdown += `| ID | Name | Type | Requirement | Priority | Status | Approval |\n`
      markdown += `|----|------|------|-------------|----------|--------|----------|\n`
      markdown += `| | | | | | | |\n`
    }
    markdown += `\n`

    // Technical Specifications logic - preserve existing, only add for completely new documents
    if (formData.technicalSpecifications && formData.technicalSpecifications.trim().length > 0) {
      // Always preserve existing content exactly as is (no modifications)
      markdown += formData.technicalSpecifications.trim() + `\n\n`
    } else {
      // Only add template for completely new enablers (no existing technical specifications)
      markdown += `## Technical Specifications (Template)\n\n`
      markdown += `### Enabler Dependency Flow Diagram\n`
      markdown += `\`\`\`mermaid\n`
      markdown += `flowchart TD\n`
      markdown += `    ENB_ID["ENB-ID<br/>Enabler Name<br/>📡"]\n`
      markdown += `    \n`
      markdown += `    %% Add your dependency flows here\n`
      markdown += `    \n`
      markdown += `    classDef enabler fill:#e3f2fd,stroke:#1976d2,stroke-width:2px\n`
      markdown += `    class ENB_ID enabler\n`
      markdown += `\`\`\`\n\n`
      markdown += `### API Technical Specifications (if applicable)\n\n`
      markdown += `| API Type | Operation | Channel / Endpoint | Description | Request / Publish Payload | Response / Subscribe Data |\n`
      markdown += `|----------|-----------|---------------------|-------------|----------------------------|----------------------------|\n`
      markdown += `| | | | | | |\n\n`
      markdown += `### Data Models\n`
      markdown += `\`\`\`mermaid\n`
      markdown += `erDiagram\n`
      markdown += `    Entity {\n`
      markdown += `        string id PK\n`
      markdown += `        string name\n`
      markdown += `        string description\n`
      markdown += `    }\n`
      markdown += `    \n`
      markdown += `    %% Add relationships and more entities here\n`
      markdown += `\`\`\`\n\n`
      markdown += `### Class Diagrams\n`
      markdown += `\`\`\`mermaid\n`
      markdown += `classDiagram\n`
      markdown += `    class ENB_ID_Class {\n`
      markdown += `        +String property\n`
      markdown += `        +method() void\n`
      markdown += `    }\n`
      markdown += `    \n`
      markdown += `    %% Add more classes and relationships here\n`
      markdown += `\`\`\`\n\n`
      markdown += `### Sequence Diagrams\n`
      markdown += `\`\`\`mermaid\n`
      markdown += `sequenceDiagram\n`
      markdown += `    participant A as Actor\n`
      markdown += `    participant S as System\n`
      markdown += `    \n`
      markdown += `    A->>S: Request\n`
      markdown += `    S-->>A: Response\n`
      markdown += `    \n`
      markdown += `    %% Add more interactions here\n`
      markdown += `\`\`\`\n\n`
      markdown += `### Dataflow Diagrams\n`
      markdown += `\`\`\`mermaid\n`
      markdown += `flowchart TD\n`
      markdown += `    Input[Input Data] --> Process[Process]\n`
      markdown += `    Process --> Output[Output Data]\n`
      markdown += `    \n`
      markdown += `    %% Add your dataflow diagrams here\n`
      markdown += `\`\`\`\n\n`
      markdown += `### State Diagrams\n`
      markdown += `\`\`\`mermaid\n`
      markdown += `stateDiagram-v2\n`
      markdown += `    [*] --> Initial\n`
      markdown += `    Initial --> Processing\n`
      markdown += `    Processing --> Complete\n`
      markdown += `    Complete --> [*]\n`
      markdown += `    \n`
      markdown += `    %% Add more states and transitions here\n`
      markdown += `\`\`\`\n\n`
    }

    // Development Plan (preserved from template)
    if (formData.implementationPlan) {
      const trimmedPlan = formData.implementationPlan.trim()
      // Only add if the section doesn't already start with a proper header
      if (trimmedPlan && !trimmedPlan.startsWith('# Development Plan') && !trimmedPlan.startsWith('## Development Plan')) {
        markdown += `# Development Plan\n\n${trimmedPlan}\n\n`
      } else {
        markdown += trimmedPlan + `\n\n`
      }
    }
  }

  return markdown
}

export function parseTable(markdown, sectionTitle) {
  const lines = markdown.split('\n')
  const sectionIndex = lines.findIndex(line => line.includes(sectionTitle))
  
  if (sectionIndex === -1) {
    return []
  }
  
  const result = []
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

function parseEnablersTable(markdown) {
  const lines = markdown.split('\n')
  const sectionIndex = lines.findIndex(line => line.includes('Enablers'))
  
  if (sectionIndex === -1) return []
  
  const result = []
  let foundTable = false
  let headerColumns = []
  
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
        const enabler = {
          id: '',
          name: '',
          description: '',
          status: STATUS_VALUES.ENABLER.DRAFT,
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
            enabler.status = value || STATUS_VALUES.ENABLER.DRAFT
          } else if (header.includes('approval')) {
            enabler.approval = value || APPROVAL_VALUES.NOT_APPROVED
          } else if (header.includes('priority')) {
            enabler.priority = value || PRIORITY_VALUES.CAPABILITY_ENABLER.HIGH
          } else {
            // Fallback to positional mapping for standard 6-column format
            if (j === 0) enabler.id = value
            else if (j === 1) enabler.name = value
            else if (j === 2) enabler.description = value
            else if (j === 3) enabler.status = value || STATUS_VALUES.ENABLER.DRAFT
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

function parseFunctionalRequirements(markdown) {
  return parseRequirementsTable(markdown, 'Functional Requirements', ['id', 'name', 'requirement', 'priority', 'status', 'approval'])
}

function parseNonFunctionalRequirements(markdown) {
  return parseRequirementsTable(markdown, 'Non-Functional Requirements', ['id', 'name', 'type', 'requirement', 'priority', 'status', 'approval'])
}

function parseRequirementsTable(markdown, sectionTitle, fields) {
  const lines = markdown.split('\n')
  const sectionIndex = lines.findIndex(line => line.includes(sectionTitle))
  
  if (sectionIndex === -1) return []
  
  const result = []
  let foundTable = false
  let headerColumns = []
  
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
        const row = {}
        
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

function extractSection(markdown, sectionTitle) {
  const lines = markdown.split('\n')
  const sectionIndex = lines.findIndex(line => line.includes(sectionTitle))
  
  if (sectionIndex === -1) return ''
  
  let content = ''
  for (let i = sectionIndex + 1; i < lines.length; i++) {
    const line = lines[i]
    if (line.startsWith('#')) break
    content += line + '\n'
  }
  
  return content.trim()
}

function extractTechnicalOverview(markdown) {
  const lines = markdown.split('\n')
  const startIndex = lines.findIndex(line => line.trim().startsWith('## Technical Overview'))
  
  if (startIndex === -1) return ''
  
  const result = []
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

function extractPurposeFromTechnicalOverview(markdown) {
  const lines = markdown.split('\n')
  const overviewStartIndex = lines.findIndex(line => line.trim().startsWith('## Technical Overview'))
  
  if (overviewStartIndex === -1) return ''
  
  const purposeStartIndex = lines.findIndex((line, index) => 
    index > overviewStartIndex && line.trim().startsWith('### Purpose')
  )
  
  if (purposeStartIndex === -1) return ''
  
  const result = []
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

function extractTechnicalSpecifications(markdown) {
  const lines = markdown.split('\n')
  // Look for both H1 and H2 Technical Specifications headings
  const startIndex = lines.findIndex(line =>
    line.trim().startsWith('# Technical Specifications') ||
    line.trim().startsWith('## Technical Specifications')
  )

  if (startIndex === -1) return ''

  const result = []
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

function extractImplementationPlan(markdown) {
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
  
  const result = []
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

export function createDependencyTable(dependencies) {
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

function extractExternalDependency(markdown, sectionTitle) {
  const lines = markdown.split('\n')
  const sectionIndex = lines.findIndex(line => line.includes(`**${sectionTitle}**`))
  
  if (sectionIndex === -1) return ''
  
  const line = lines[sectionIndex]
  const match = line.match(new RegExp(`\\*\\*${sectionTitle}\\*\\*:\\s*(.+)`))
  
  return match ? match[1] : ''
}