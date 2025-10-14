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
  Workflow,
  type LucideIcon
} from 'lucide-react';
import axios from 'axios';

interface AgentMetadata {
  version?: string
}

interface Agent {
  id: string
  status: string
  capabilities: string[]
  metadata?: AgentMetadata
}

interface Job {
  id: string
  agentId?: string
  action?: string
  workflow?: string
  status: string
  startTime: string
  endTime?: string
}

interface WorkflowStage {
  name: string
  agent: string
  action: string
  required?: boolean
  approvalRequired?: boolean
}

interface Workflow {
  id: string
  name: string
  enabled: boolean
  stages?: WorkflowStage[]
  requireApproval?: boolean
}

interface ExecutionResult {
  success: boolean
  jobId?: string
  error?: string
}

const AgentDashboard: React.FC = () => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [activeJobs, setActiveJobs] = useState<Job[]>([]);
  const [jobHistory, setJobHistory] = useState<Job[]>([]);
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<string>('agents');
  const [executionResult, setExecutionResult] = useState<ExecutionResult | null>(null);

  // Agent icons mapping
  const agentIcons: Record<string, LucideIcon> = {
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

  const loadAgentData = async (): Promise<void> => {
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

  const executeWorkflow = async (workflowId: string): Promise<void> => {
    try {
      const result = await axios.post('/api/agents/workflow', {
        workflowName: workflowId,
        input: {
          documentId: 'test-doc',
          documentContent: 'Test content'
        }
      });

      setExecutionResult(result.data);
      loadAgentData();
    } catch (error) {
      console.error('Error executing workflow:', error);
      setExecutionResult({
        success: false,
        error: axios.isAxiosError(error) ? error.response?.data?.error || error.message : 'Unknown error'
      });
    }
  };

  const cancelJob = async (jobId: string): Promise<void> => {
    try {
      await axios.delete(`/api/agents/job/${jobId}`);
      loadAgentData();
    } catch (error) {
      console.error('Error cancelling job:', error);
    }
  };

  const getStatusColor = (status: string): string => {
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

  const getStatusIcon = (status: string): JSX.Element => {
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

  const renderAgentsTab = (): JSX.Element => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {agents.map(agent => {
        const IconComponent = agentIcons[agent.id] || Bot;
        return (
          <div
            key={agent.id}
            className={`bg-card rounded-lg border-2 p-6 cursor-pointer transition-all duration-200 ${selectedAgent?.id === agent.id ? 'border-primary shadow-lg' : 'border-border hover:border-border/80 hover:shadow-md'}`}
            onClick={() => setSelectedAgent(agent)}
          >
            <div className="flex items-center gap-3 mb-4">
              <IconComponent size={24} className="text-primary" />
              <h3 className="text-lg font-semibold text-foreground capitalize">{agent.id.replace(/-/g, ' ')}</h3>
            </div>
            <div className={`flex items-center gap-2 mb-4 px-3 py-2 rounded-md text-sm font-medium ${getStatusColor(agent.status) === 'success' ? 'bg-green-100 text-green-800' : getStatusColor(agent.status) === 'warning' ? 'bg-yellow-100 text-yellow-800' : 'bg-muted text-foreground'}`}>
              {getStatusIcon(agent.status)}
              <span>{agent.status}</span>
            </div>
            <div className="mb-4">
              <h4 className="text-sm font-semibold text-foreground mb-2">Capabilities:</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                {agent.capabilities.slice(0, 3).map((cap, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>{cap}</span>
                  </li>
                ))}
                {agent.capabilities.length > 3 && (
                  <li className="text-muted-foreground italic">+{agent.capabilities.length - 3} more</li>
                )}
              </ul>
            </div>
            <div className="text-xs text-muted-foreground">
              Version: {agent.metadata?.version || '1.0.0'}
            </div>
          </div>
        );
      })}
    </div>
  );

  const renderWorkflowsTab = (): JSX.Element => (
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

  const renderJobsTab = (): JSX.Element => (
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
                  `${Math.round((new Date(job.endTime).getTime() - new Date(job.startTime).getTime()) / 1000)}s` :
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
      <div className="flex flex-col items-center justify-center min-h-screen bg-background">
        <RefreshCw className="w-12 h-12 text-primary animate-spin" size={32} />
        <p className="mt-4 text-muted-foreground">Loading agent system...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="bg-card rounded-lg shadow-md border border-border mb-6 p-4 flex items-center justify-between">
        <h2 className="flex items-center gap-3 text-2xl font-bold text-foreground">
          <Bot size={24} />
          Agent Control Center
        </h2>
        <button
          className="flex items-center gap-2 px-4 py-2 bg-muted text-foreground rounded-md hover:bg-muted/80 transition-colors"
          onClick={loadAgentData}
        >
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3 mb-6">
        <AlertCircle size={20} className="text-yellow-600 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-yellow-800">
          <strong>Feature Not Yet Implemented:</strong> The Agent Control Center is currently under development.
          AI agent management and workflow automation will be available in a future release.
        </p>
      </div>

      <div className="bg-card rounded-lg shadow-md border border-border mb-6">
        <div className="flex border-b border-border">
          <button
            className={`flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'agents' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'}`}
            onClick={() => setActiveTab('agents')}
          >
            <Bot size={16} /> Agents ({agents.length})
          </button>
          <button
            className={`flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'workflows' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'}`}
            onClick={() => setActiveTab('workflows')}
          >
            <Workflow size={16} /> Workflows ({workflows.length})
          </button>
          <button
            className={`flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'jobs' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'}`}
            onClick={() => setActiveTab('jobs')}
          >
            <Activity size={16} /> Jobs ({activeJobs.length})
          </button>
        </div>
      </div>

      <div className="p-6">
        {activeTab === 'agents' && renderAgentsTab()}
        {activeTab === 'workflows' && renderWorkflowsTab()}
        {activeTab === 'jobs' && renderJobsTab()}
      </div>

      {executionResult && (
        <div className={`fixed bottom-4 right-4 max-w-md rounded-lg shadow-lg border-2 p-4 ${executionResult.success ? 'bg-green-50 border-green-500' : 'bg-red-50 border-red-500'}`}>
          <button
            className="absolute top-2 right-2 text-muted-foreground hover:text-foreground text-xl font-bold"
            onClick={() => setExecutionResult(null)}
          >
            ×
          </button>
          {executionResult.success ? (
            <div className="flex items-start gap-3">
              <CheckCircle size={20} className="text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-green-800">Workflow started successfully</p>
                <small className="text-green-700">Job ID: {executionResult.jobId}</small>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-3">
              <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-red-800">Execution failed</p>
                <small className="text-red-700">{executionResult.error}</small>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AgentDashboard;
