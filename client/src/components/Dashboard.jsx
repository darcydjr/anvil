import React, { useState } from 'react'
import { useApp } from '../contexts/AppContext'
import { FileText, Plus, Settings, CheckCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { apiService } from '../services/apiService'
import { APPROVAL_VALUES } from '../utils/constants'
import toast from 'react-hot-toast'
import RelationshipDiagram from './RelationshipDiagram'
import './Dashboard.css'

export default function Dashboard() {
  const { capabilities, enablers, loading, error, refreshData } = useApp()
  const navigate = useNavigate()
  const [processing, setProcessing] = useState({
    capabilities: false,
    enablers: false,
    requirements: false
  })

  const handleApproveAllCapabilities = async () => {
    setProcessing(prev => ({ ...prev, capabilities: true }))
    try {
      let updateCount = 0

      for (const capability of capabilities) {
        if (capability.approval !== APPROVAL_VALUES.APPROVED) {
          // Read current file content
          const response = await apiService.getFile(capability.path)
          const content = response.content

          // Update approval in metadata
          const updatedContent = content.replace(
            /^-\s*\*\*Approval\*\*:\s*.+$/m,
            `- **Approval**: ${APPROVAL_VALUES.APPROVED}`
          )

          // Save updated content
          await apiService.saveFile(capability.path, updatedContent)
          updateCount++
        }
      }

      if (updateCount > 0) {
        toast.success(`Approved ${updateCount} capabilities`)
        refreshData()
      } else {
        toast.info('All capabilities are already approved')
      }
    } catch (error) {
      console.error('Error approving capabilities:', error)
      toast.error('Failed to approve capabilities')
    } finally {
      setProcessing(prev => ({ ...prev, capabilities: false }))
    }
  }

  const handleApproveAllEnablers = async () => {
    setProcessing(prev => ({ ...prev, enablers: true }))
    try {
      let updateCount = 0

      for (const enabler of enablers) {
        if (enabler.approval !== APPROVAL_VALUES.APPROVED) {
          // Read current file content
          const response = await apiService.getFile(enabler.path)
          const content = response.content

          // Update approval in metadata
          const updatedContent = content.replace(
            /^-\s*\*\*Approval\*\*:\s*.+$/m,
            `- **Approval**: ${APPROVAL_VALUES.APPROVED}`
          )

          // Save updated content
          await apiService.saveFile(enabler.path, updatedContent)
          updateCount++
        }
      }

      if (updateCount > 0) {
        toast.success(`Approved ${updateCount} enablers`)
        refreshData()
      } else {
        toast.info('All enablers are already approved')
      }
    } catch (error) {
      console.error('Error approving enablers:', error)
      toast.error('Failed to approve enablers')
    } finally {
      setProcessing(prev => ({ ...prev, enablers: false }))
    }
  }

  const handleApproveAllRequirements = async () => {
    setProcessing(prev => ({ ...prev, requirements: true }))
    try {
      let updateCount = 0

      for (const enabler of enablers) {
        // Check if enabler has unapproved requirements
        const hasUnapprovedReqs =
          (enabler.functionalRequirements && enabler.functionalRequirements.some(req => req.approval !== APPROVAL_VALUES.APPROVED)) ||
          (enabler.nonFunctionalRequirements && enabler.nonFunctionalRequirements.some(req => req.approval !== APPROVAL_VALUES.APPROVED))

        if (hasUnapprovedReqs) {
          // Read current file content
          const response = await apiService.getFile(enabler.path)
          let content = response.content

          // Update functional requirements table
          if (enabler.functionalRequirements) {
            const functionalSection = content.match(/(## Functional Requirements\s*\n[\s\S]*?)(?=\n##|\n#|$)/i)
            if (functionalSection) {
              const updatedSection = functionalSection[1].replace(
                /(\|[^|]*\|[^|]*\|[^|]*\|[^|]*\|)\s*([^|]*?)(\s*\|)/g,
                `$1 ${APPROVAL_VALUES.APPROVED} $3`
              )
              content = content.replace(functionalSection[1], updatedSection)
            }
          }

          // Update non-functional requirements table
          if (enabler.nonFunctionalRequirements) {
            const nfrSection = content.match(/(## Non-Functional Requirements\s*\n[\s\S]*?)(?=\n##|\n#|$)/i)
            if (nfrSection) {
              const updatedSection = nfrSection[1].replace(
                /(\|[^|]*\|[^|]*\|[^|]*\|[^|]*\|[^|]*\|)\s*([^|]*?)(\s*\|)/g,
                `$1 ${APPROVAL_VALUES.APPROVED} $3`
              )
              content = content.replace(nfrSection[1], updatedSection)
            }
          }

          // Save updated content
          await apiService.saveFile(enabler.path, content)
          updateCount++
        }
      }

      if (updateCount > 0) {
        toast.success(`Approved requirements in ${updateCount} enablers`)
        refreshData()
      } else {
        toast.info('All requirements are already approved')
      }
    } catch (error) {
      console.error('Error approving requirements:', error)
      toast.error('Failed to approve requirements')
    } finally {
      setProcessing(prev => ({ ...prev, requirements: false }))
    }
  }

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="spinner"></div>
        <p>Loading documents...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="dashboard-error">
        <p>Error loading documents: {error}</p>
      </div>
    )
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h2>Document Dashboard</h2>
        <p>Manage your capabilities and enablers</p>
      </div>

      <RelationshipDiagram />

      <div className="dashboard-stats">
        <div className="stat-card">
          <div className="stat-icon">
            <FileText size={24} />
          </div>
          <div className="stat-content">
            <div className="stat-number">{capabilities.length}</div>
            <div className="stat-label">Capabilities</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <FileText size={24} />
          </div>
          <div className="stat-content">
            <div className="stat-number">{enablers.length}</div>
            <div className="stat-label">Enablers</div>
          </div>
        </div>

      </div>

      <div className="dashboard-actions">
        <h3>Quick Actions</h3>
        <div className="action-cards">
          <div
            className="action-card"
            onClick={() => navigate('/create/capability')}
          >
            <Plus size={32} />
            <h4>Create Capability</h4>
            <p>Define a new high-level technical capability</p>
          </div>

          <div
            className="action-card"
            onClick={() => navigate('/create/enabler')}
          >
            <Plus size={32} />
            <h4>Create Enabler</h4>
            <p>Add implementation details for a capability</p>
          </div>

          <div
            className={`action-card approval-card ${processing.capabilities ? 'processing' : ''}`}
            onClick={!processing.capabilities ? handleApproveAllCapabilities : undefined}
          >
            <CheckCircle size={32} />
            <h4>Approve All Capabilities</h4>
            <p>{processing.capabilities ? 'Processing...' : `Approve ${capabilities.filter(c => c.approval !== APPROVAL_VALUES.APPROVED).length} capabilities`}</p>
          </div>

          <div
            className={`action-card approval-card ${processing.enablers ? 'processing' : ''}`}
            onClick={!processing.enablers ? handleApproveAllEnablers : undefined}
          >
            <CheckCircle size={32} />
            <h4>Approve All Enablers</h4>
            <p>{processing.enablers ? 'Processing...' : `Approve ${enablers.filter(e => e.approval !== APPROVAL_VALUES.APPROVED).length} enablers`}</p>
          </div>

          <div
            className={`action-card approval-card ${processing.requirements ? 'processing' : ''}`}
            onClick={!processing.requirements ? handleApproveAllRequirements : undefined}
          >
            <CheckCircle size={32} />
            <h4>Approve All Requirements</h4>
            <p>{processing.requirements ? 'Processing...' : 'Approve all unapproved requirements'}</p>
          </div>

        </div>
      </div>

      <div className="dashboard-recent">
        <h3>Recent Documents</h3>
        <div className="recent-list">
          {[...capabilities, ...enablers].slice(0, 5).map((doc) => (
            <div 
              key={doc.path}
              className="recent-item"
              onClick={() => navigate(`/view/${doc.type}/${doc.path}`)}
            >
              <FileText size={16} />
              <div className="recent-content">
                <div className="recent-title">{doc.title || doc.name}</div>
                <div className="recent-type">{doc.type}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}