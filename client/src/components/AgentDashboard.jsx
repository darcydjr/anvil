/**
 * Agent Dashboard Component
 * UI for managing and monitoring AI agents
 */

import React, { useState, useEffect } from 'react';
import {
  Bot,
  Activity,
  CheckCircle,
  AlertCircle,
  Clock,
  Play,
  Pause,
  RefreshCw,
  Settings,
  FileText,
  Code,
  TestTube,
  BookOpen,
  Workflow
} from 'lucide-react';
import axios from 'axios';
import './AgentDashboard.css';

const AgentDashboard = () => {
  const [agents, setAgents] = useState([]);
  const [activeJobs, setActiveJobs] = useState([]);
  const [jobHistory, setJobHistory] = useState([]);
  const [workflows, setWorkflows] = useState([]);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [selectedWorkflow, setSelectedWorkflow] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('agents');
  const [executionResult, setExecutionResult] = useState(null);

  // Agent icons mapping
  const agentIcons = {
    'requirements-analyzer': FileText,
    'design-architect': Settings,
    'code-generator': Code,
    'test-automator': TestTube,
    'documentation-generator': BookOpen
  };

  // Load initial data
  useEffect(() => {
    loadAgentData();
    const interval = setInterval(loadAgentData, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const loadAgentData = async () => {
    try {
      const [agentsRes, statusRes, historyRes, workflowsRes] = await Promise.all([
        axios.get('/api/agents'),
        axios.get('/api/agents/status'),
        axios.get('/api/agents/history'),
        axios.get('/api/agents/workflows')
      ]);

      setAgents(agentsRes.data.agents || []);
      setActiveJobs(statusRes.data.status?.activeJobs || []);
      setJobHistory(historyRes.data.history || []);
      setWorkflows(workflowsRes.data.workflows || []);
      setLoading(false);
    } catch (error) {
      console.error('Error loading agent data:', error);
      setLoading(false);
    }
  };

  const executeWorkflow = async (workflowId) => {
    try {
      const result = await axios.post('/api/agents/workflow', {
        workflowName: workflowId,
        input: {
          // This would be populated from form inputs
          documentId: 'test-doc',
          documentContent: 'Test content'
        }
      });

      setExecutionResult(result.data);
      loadAgentData(); // Refresh to show new job
    } catch (error) {
      console.error('Error executing workflow:', error);
      setExecutionResult({
        success: false,
        error: error.response?.data?.error || error.message
      });
    }
  };

  const cancelJob = async (jobId) => {
    try {
      await axios.delete(`/api/agents/job/${jobId}`);
      loadAgentData();
    } catch (error) {
      console.error('Error cancelling job:', error);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'ready':
      case 'completed':
        return 'success';
      case 'running':
      case 'in_progress':
        return 'warning';
      case 'failed':
      case 'error':
        return 'danger';
      default:
        return 'secondary';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'ready':
      case 'completed':
        return <CheckCircle size={16} />;
      case 'running':
      case 'in_progress':
        return <Clock size={16} />;
      case 'failed':
      case 'error':
        return <AlertCircle size={16} />;
      default:
        return <Activity size={16} />;
    }
  };

  const renderAgentsTab = () => (
    <div className="agents-grid">
      {agents.map(agent => {
        const IconComponent = agentIcons[agent.id] || Bot;
        return (
          <div
            key={agent.id}
            className={`agent-card ${selectedAgent?.id === agent.id ? 'selected' : ''}`}
            onClick={() => setSelectedAgent(agent)}
          >
            <div className="agent-header">
              <IconComponent size={24} />
              <h3>{agent.id.replace(/-/g, ' ')}</h3>
            </div>
            <div className={`agent-status status-${getStatusColor(agent.status)}`}>
              {getStatusIcon(agent.status)}
              <span>{agent.status}</span>
            </div>
            <div className="agent-capabilities">
              <h4>Capabilities:</h4>
              <ul>
                {agent.capabilities.slice(0, 3).map((cap, idx) => (
                  <li key={idx}>{cap}</li>
                ))}
                {agent.capabilities.length > 3 && (
                  <li>+{agent.capabilities.length - 3} more</li>
                )}
              </ul>
            </div>
            <div className="agent-meta">
              <small>Version: {agent.metadata?.version || '1.0.0'}</small>
            </div>
          </div>
        );
      })}
    </div>
  );

  const renderWorkflowsTab = () => (
    <div className="workflows-container">
      <div className="workflows-list">
        {workflows.map(workflow => (
          <div
            key={workflow.id}
            className={`workflow-card ${selectedWorkflow?.id === workflow.id ? 'selected' : ''}`}
            onClick={() => setSelectedWorkflow(workflow)}
          >
            <div className="workflow-header">
              <Workflow size={20} />
              <h3>{workflow.name}</h3>
              {workflow.enabled && (
                <span className="badge badge-success">Enabled</span>
              )}
            </div>
            <div className="workflow-stages">
              <p>{workflow.stages?.length || 0} stages</p>
              {workflow.requireApproval && (
                <span className="badge badge-warning">Requires Approval</span>
              )}
            </div>
            <button
              className="btn btn-primary btn-sm"
              onClick={(e) => {
                e.stopPropagation();
                executeWorkflow(workflow.id);
              }}
              disabled={!workflow.enabled}
            >
              <Play size={14} /> Execute
            </button>
          </div>
        ))}
      </div>

      {selectedWorkflow && (
        <div className="workflow-details">
          <h3>{selectedWorkflow.name}</h3>
          <div className="workflow-stages-detail">
            <h4>Stages:</h4>
            {selectedWorkflow.stages?.map((stage, idx) => (
              <div key={idx} className="stage-item">
                <div className="stage-number">{idx + 1}</div>
                <div className="stage-info">
                  <strong>{stage.name}</strong>
                  <span className="stage-agent">{stage.agent}</span>
                  <span className="stage-action">{stage.action}</span>
                  {stage.required && (
                    <span className="badge badge-danger">Required</span>
                  )}
                  {stage.approvalRequired && (
                    <span className="badge badge-warning">Approval Required</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderJobsTab = () => (
    <div className="jobs-container">
      {activeJobs.length > 0 && (
        <div className="active-jobs">
          <h3>Active Jobs</h3>
          <div className="jobs-list">
            {activeJobs.map(job => (
              <div key={job.id} className="job-card active">
                <div className="job-header">
                  <span className="job-id">{job.id.slice(0, 8)}</span>
                  <span className={`job-status status-${getStatusColor(job.status)}`}>
                    {getStatusIcon(job.status)}
                    {job.status}
                  </span>
                </div>
                <div className="job-details">
                  <p>Agent: {job.agentId}</p>
                  <p>Action: {job.action}</p>
                  <p>Started: {new Date(job.startTime).toLocaleTimeString()}</p>
                </div>
                <button
                  className="btn btn-danger btn-sm"
                  onClick={() => cancelJob(job.id)}
                >
                  <Pause size={14} /> Cancel
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="job-history">
        <h3>Job History</h3>
        <div className="jobs-list">
          {jobHistory.map(job => (
            <div key={job.id} className="job-card">
              <div className="job-header">
                <span className="job-id">{job.id.slice(0, 8)}</span>
                <span className={`job-status status-${getStatusColor(job.status)}`}>
                  {getStatusIcon(job.status)}
                  {job.status}
                </span>
              </div>
              <div className="job-details">
                <p>Agent: {job.agentId || 'Workflow'}</p>
                <p>Action: {job.action || job.workflow}</p>
                <p>Duration: {
                  job.endTime ?
                  `${Math.round((new Date(job.endTime) - new Date(job.startTime)) / 1000)}s` :
                  'N/A'
                }</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="agent-dashboard loading">
        <RefreshCw className="spin" size={32} />
        <p>Loading agent system...</p>
      </div>
    );
  }

  return (
    <div className="agent-dashboard">
      <div className="dashboard-header">
        <h2>
          <Bot size={24} />
          Agent Control Center
        </h2>
        <button
          className="btn btn-secondary"
          onClick={loadAgentData}
        >
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      <div className="dashboard-tabs">
        <button
          className={`tab ${activeTab === 'agents' ? 'active' : ''}`}
          onClick={() => setActiveTab('agents')}
        >
          <Bot size={16} /> Agents ({agents.length})
        </button>
        <button
          className={`tab ${activeTab === 'workflows' ? 'active' : ''}`}
          onClick={() => setActiveTab('workflows')}
        >
          <Workflow size={16} /> Workflows ({workflows.length})
        </button>
        <button
          className={`tab ${activeTab === 'jobs' ? 'active' : ''}`}
          onClick={() => setActiveTab('jobs')}
        >
          <Activity size={16} /> Jobs ({activeJobs.length})
        </button>
      </div>

      <div className="dashboard-content">
        {activeTab === 'agents' && renderAgentsTab()}
        {activeTab === 'workflows' && renderWorkflowsTab()}
        {activeTab === 'jobs' && renderJobsTab()}
      </div>

      {executionResult && (
        <div className={`execution-result ${executionResult.success ? 'success' : 'error'}`}>
          <button
            className="close-btn"
            onClick={() => setExecutionResult(null)}
          >
            ×
          </button>
          {executionResult.success ? (
            <div>
              <CheckCircle size={20} />
              <p>Workflow started successfully</p>
              <small>Job ID: {executionResult.jobId}</small>
            </div>
          ) : (
            <div>
              <AlertCircle size={20} />
              <p>Execution failed</p>
              <small>{executionResult.error}</small>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AgentDashboard;