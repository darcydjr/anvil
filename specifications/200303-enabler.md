# External Change Notifications

## Metadata
- **Name**: External Change Notifications
- **Type**: Enabler
- **ID**: ENB-200303
- **Capability ID**: CAP-300456
- **Owner**: Product Team
- **Status**: Implemented
- **Approval**: Approved
- **Priority**: Medium
- **Analysis Review**: Not Required
- **Code Review**: Not Required

## Technical Overview
### Purpose
Displays floating overlay notifications in DocumentView showing specific field changes (status, approval, priority) when documents are modified externally by tools like Claude Code.

## Functional Requirements
| ID | Name | Requirement | Status | Priority | Approval |
|----|------|-------------|--------|----------|----------|
| FR-200330 | Change Detection | Detect when currently viewed document is modified externally | Implemented | High | Approved |
| FR-200331 | Field Comparison | Compare old and new metadata to identify changed fields | Implemented | High | Approved |
| FR-200332 | Notification Display | Show floating notification with list of changed fields | Implemented | High | Approved |
| FR-200333 | Manual Reload | Provide reload button to refresh document view with new content | Implemented | High | Approved |
| FR-200334 | Notification Dismissal | Allow users to dismiss notifications | Implemented | Low | Approved |

## Non-Functional Requirements
| ID | Name | Requirement | Type | Status | Priority | Approval |
|----|------|-------------|------|--------|----------|----------|
| NFR-200330 | Notification Visibility | Notifications must be clearly visible without blocking document content | Usability | Implemented | High | Approved |

## Technical Specifications

### Implementation
- Location: DocumentView.tsx
- Trigger: WebSocket 'fileChanged' event
- Display: Floating overlay with changed field list
- Comparison: Metadata diff algorithm

### Detected Changes
- Status field changes
- Approval field changes
- Priority field changes
- Name/Title changes

## External Dependencies
- WebSocket service
- Document viewer component
- Metadata extraction utilities

## Testing Strategy
- Change detection tests
- Notification display tests
- Field comparison algorithm tests
