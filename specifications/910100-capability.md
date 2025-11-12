# AI Chat Assistant Configuration

## Metadata
- **Name**: AI Chat Assistant Configuration
- **Type**: Capability
- **System**: Ford Anvil Core
- **Component**: AI Integration
- **ID**: CAP-910100
- **Owner**: Product Team
- **Status**: Implemented
- **Approval**: Approved
- **Priority**: Medium
- **Analysis Review**: Not Required

## Technical Overview
### Purpose
Provides end-user configuration interface and backend persistence for integrating Anthropic Claude as the AI chat assistant inside Anvil.

### Scope
Covers UI configuration section, server-side persistence of aiAssistant settings, secure handling of API key, and enablement of ChatService initialization.

## Enablers
| ID | Description |
|----|-------------|
| ENB-910101 | AI Assistant Settings UI Section allowing entry of Claude API key |
| ENB-200903 | Configuration API Endpoints used to store aiAssistant configuration |
| ENB-200801 | Core Configuration API infrastructure |

## Dependencies
### Internal Upstream Dependency
| Capability ID | Description |
|---------------|-------------|
| CAP-800901 | Configuration Management |

### Internal Downstream Impact
| Capability ID | Description |
|---------------|-------------|
| CAP-900012 | System Configuration Visibility |

## Functional Requirements
| ID | Name | Requirement | Status | Priority | Approval |
|----|------|-------------|--------|----------|----------|
| FR-910100 | API Key Input | Provide masked input for Claude API key with local persistence | Implemented | Medium | Approved |
| FR-910101 | Save Operation | Persist aiAssistant.provider, apiKey, model, maxTokens via POST /api/config | Implemented | Medium | Approved |
| FR-910102 | Validation | Accept non-empty string for apiKey; allow empty to disable assistant | Implemented | Medium | Approved |
| FR-910103 | User Guidance | Present clear instructions to obtain Claude API key | Implemented | Medium | Approved |

## Non-Functional Requirements
| ID | Name | Requirement | Type | Status | Priority | Approval |
|----|------|-------------|------|--------|----------|----------|
| NFR-910100 | Local Storage | API key stored only in config.local.json, not transmitted externally except to Claude API | Security | Implemented | Medium | Approved |
| NFR-910101 | No Logging | API key value must not be written to application logs | Security | Implemented | High | Approved |

## Technical Specifications
### UI Implementation
- Location: client/src/components/Settings.tsx
- Section Title: "AI Chat Assistant configuration"
- Added below Tip of the Day Settings section
- Uses existing saveConfig POST /api/config call

### Backend Implementation
- Existing /api/config endpoint persists aiAssistant object
- ChatService reads AIAssistantConfig (provider, apiKey, model, maxTokens) and initializes Anthropic client

### Security Considerations
- API key kept only in memory and config.local.json
- Recommendation: future enhancement to redact apiKey from GET /api/config responses

## Testing Strategy
- Manual verification of save & reload
- Future: Add automated test to ensure no logging of plain API key

## Change Log
- 2025-11-12T23:30:43.549Z: Initial capability document created for AI Chat Assistant configuration (commit pending)
