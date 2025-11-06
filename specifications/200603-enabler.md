# Requirements ID Generator

## Metadata
- **Name**: Requirements ID Generator
- **Type**: Enabler
- **ID**: ENB-200603
- **Capability ID**: CAP-600789
- **Owner**: Product Team
- **Status**: Implemented
- **Approval**: Approved
- **Priority**: High
- **Analysis Review**: Not Required
- **Code Review**: Not Required

## Technical Overview
### Purpose
Auto-incrementing ID generation for functional and non-functional requirements with project-wide uniqueness and collision detection.

## Functional Requirements
| ID | Name | Requirement | Status | Priority | Approval |
|----|------|-------------|--------|----------|----------|
| FR-200630 | FR ID Generation | Generate unique FR-XXXXXX IDs for functional requirements | Implemented | High | Approved |
| FR-200631 | NFR ID Generation | Generate unique NFR-XXXXXX IDs for non-functional requirements | Implemented | High | Approved |
| FR-200632 | Sequential Numbering | Use sequential numbering pattern for requirement IDs | Implemented | Medium | Approved |
| FR-200633 | Collision Detection | Scan existing requirements to prevent ID collisions | Implemented | High | Approved |

## Non-Functional Requirements
| ID | Name | Requirement | Type | Status | Priority | Approval |
|----|------|-------------|------|--------|----------|----------|
| NFR-200630 | ID Uniqueness | Generated IDs must be globally unique across all documents | Reliability | Implemented | High | Approved |

## Technical Specifications

### Implementation
- Location: server.ts (ID generation functions)
- Pattern: FR-{number}, NFR-{number}
- Scanning: File system scan for existing IDs
- Fallback: Sequential numbering from 100000

## External Dependencies
- File scanning utilities
- Markdown parsing for ID extraction

## Testing Strategy
- ID generation tests
- Collision detection tests
- Sequential numbering verification
