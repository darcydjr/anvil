/**
 * Agent Orchestrator
 * Central command and coordination for all Anvil subagents
 */

import { EventEmitter } from 'events';
import * as path from 'path';
import * as fs from 'fs-extra';
import { v4 as uuidv4 } from 'uuid';

interface OrchestratorConfig {
  maxConcurrency?: number;
  timeout?: number;
  retryAttempts?: number;
}

interface AgentInstance {
  getCapabilities?: () => string[];
  version?: string;
  [key: string]: any;
}

interface RegisteredAgent {
  id: string;
  instance: AgentInstance;
  status: string;
  capabilities: string[];
  metadata: {
    registeredAt: string;
    version: string;
  };
}

interface WorkflowStage {
  name: string;
  agent: string;
  action: string;
  input?: any;
  required?: boolean;
}

interface WorkflowDefinition {
  name?: string;
  stages: WorkflowStage[];
  input?: any;
  options?: Record<string, any>;
}

interface Job {
  id: string;
  workflow?: WorkflowDefinition;
  agentId?: string;
  action?: string;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  startTime: string;
  endTime?: string;
  currentStage?: number;
  stages?: StageResult[];
  results?: Record<string, any>;
  result?: any;
  errors?: JobError[];
  error?: string;
}

interface StageResult {
  name: string;
  agent: string;
  status: 'completed' | 'failed';
  result: {
    success: boolean;
    data?: any;
    error?: string;
  };
  timestamp: string;
}

interface JobError {
  stage: number;
  error: string;
  timestamp: string;
}

interface RouteRequest {
  agentId: string;
  action: string;
  payload: any;
  options?: Record<string, any>;
}

interface RouteResult {
  success: boolean;
  jobId: string;
  result?: any;
  error?: string;
}

interface DocumentData {
  capabilityId?: string;
  [key: string]: any;
}

interface CapabilityContext {
  path?: string;
  id?: string;
}

interface DocumentContext {
  parentCapabilityPath?: string;
}

class AgentOrchestrator extends EventEmitter {
  private agents: Map<string, RegisteredAgent>;
  private activeJobs: Map<string, Job>;
  private jobHistory: Job[];
  config: OrchestratorConfig | null;
  initialized: boolean;

  constructor() {
    super();
    this.agents = new Map<string, RegisteredAgent>();
    this.activeJobs = new Map<string, Job>();
    this.jobHistory = [];
    this.config = null;
    this.initialized = false;
  }

  /**
   * Initialize the orchestrator with configuration
   */
  async initialize(config: OrchestratorConfig = {}): Promise<{ success: boolean; message: string }> {
    try {
      this.config = {
        maxConcurrency: 3,
        timeout: 300000, // 5 minutes default
        retryAttempts: 2,
        ...config
      };

      // Register all available agents
      await this.registerAgents();

      this.initialized = true;
      this.emit('initialized', { timestamp: new Date().toISOString() });

      return { success: true, message: 'Orchestrator initialized successfully' };
    } catch (error: any) {
      console.error('[ORCHESTRATOR] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Register all available agents
   */
  async registerAgents(): Promise<void> {
    const agentModules: Record<string, string> = {
      'requirements-analyzer': '../requirements/analyzer',
      'design-architect': '../design/architect',
      'code-generator': '../codegen/generator',
      'test-automator': '../testing/test-generator',
      'documentation-generator': '../documentation/doc-generator'
    };

    for (const [agentId, modulePath] of Object.entries(agentModules)) {
      try {
        // Check if agent module exists
        const fullPath = path.resolve(__dirname, modulePath + '.js');
        if (await fs.pathExists(fullPath)) {
          const AgentClass = require(modulePath);
          const agent: AgentInstance = new AgentClass();

          this.agents.set(agentId, {
            id: agentId,
            instance: agent,
            status: 'ready',
            capabilities: agent.getCapabilities ? agent.getCapabilities() : [],
            metadata: {
              registeredAt: new Date().toISOString(),
              version: agent.version || '1.0.0'
            }
          });

          console.log(`[ORCHESTRATOR] Registered agent: ${agentId}`);
        }
      } catch (error: any) {
        console.warn(`[ORCHESTRATOR] Failed to register agent ${agentId}:`, error.message);
      }
    }
  }

  /**
   * Execute a workflow with multiple agents
   */
  async executeWorkflow(workflowDefinition: WorkflowDefinition): Promise<Job> {
    const jobId = uuidv4();
    const job: Job = {
      id: jobId,
      workflow: workflowDefinition,
      status: 'running',
      startTime: new Date().toISOString(),
      currentStage: 0,
      stages: [],
      results: {},
      errors: []
    };

    this.activeJobs.set(jobId, job);
    this.emit('workflow:started', { jobId, workflow: workflowDefinition.name });

    try {
      // Execute workflow stages sequentially
      for (const stage of workflowDefinition.stages) {
        job.currentStage!++;

        const stageResult = await this.executeStage(jobId, stage, job.results!);

        job.stages!.push({
          name: stage.name,
          agent: stage.agent,
          status: stageResult.success ? 'completed' : 'failed',
          result: stageResult,
          timestamp: new Date().toISOString()
        });

        if (!stageResult.success && stage.required !== false) {
          throw new Error(`Stage ${stage.name} failed: ${stageResult.error}`);
        }

        // Store stage results for next stages
        job.results![stage.name] = stageResult.data;

        this.emit('stage:completed', {
          jobId,
          stage: stage.name,
          stageNumber: job.currentStage,
          totalStages: workflowDefinition.stages.length
        });
      }

      job.status = 'completed';
      job.endTime = new Date().toISOString();

      this.emit('workflow:completed', { jobId, results: job.results });

    } catch (error: any) {
      job.status = 'failed';
      job.endTime = new Date().toISOString();
      job.errors!.push({
        stage: job.currentStage!,
        error: error.message,
        timestamp: new Date().toISOString()
      });

      this.emit('workflow:failed', { jobId, error: error.message });

    } finally {
      // Move to history
      this.jobHistory.push(job);
      this.activeJobs.delete(jobId);

      // Keep only last 100 jobs in history
      if (this.jobHistory.length > 100) {
        this.jobHistory.shift();
      }
    }

    return job;
  }

  /**
   * Execute a single workflow stage
   */
  async executeStage(jobId: string, stage: WorkflowStage, previousResults: Record<string, any>): Promise<{ success: boolean; data?: any; error?: string }> {
    const agent = this.agents.get(stage.agent);

    if (!agent) {
      return {
        success: false,
        error: `Agent ${stage.agent} not found`
      };
    }

    try {
      // Prepare input for the agent
      const input = {
        ...stage.input,
        previousResults,
        jobId,
        stage: stage.name
      };

      // Execute agent task
      const result = await this.executeAgentTask(agent, stage.action, input);

      return {
        success: true,
        data: result
      };

    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Execute a task with a specific agent
   */
  async executeAgentTask(agent: RegisteredAgent, action: string, input: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Agent task timeout after ${this.config!.timeout}ms`));
      }, this.config!.timeout!);

      try {
        // Check if agent has the requested action
        if (!agent.instance[action]) {
          clearTimeout(timeout);
          reject(new Error(`Agent does not support action: ${action}`));
          return;
        }

        // Execute the agent action
        agent.instance[action](input)
          .then((result: any) => {
            clearTimeout(timeout);
            resolve(result);
          })
          .catch((error: any) => {
            clearTimeout(timeout);
            reject(error);
          });

      } catch (error) {
        clearTimeout(timeout);
        reject(error);
      }
    });
  }

  /**
   * Route a request to the appropriate agent
   */
  async routeRequest(request: RouteRequest): Promise<RouteResult> {
    const { agentId, action, payload, options = {} } = request;

    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }

    const jobId = uuidv4();
    const job: Job = {
      id: jobId,
      agentId,
      action,
      status: 'running',
      startTime: new Date().toISOString()
    };

    this.activeJobs.set(jobId, job);
    this.emit('job:started', { jobId, agentId, action });

    try {
      const result = await this.executeAgentTask(agent, action, payload);

      job.status = 'completed';
      job.result = result;
      job.endTime = new Date().toISOString();

      this.emit('job:completed', { jobId, result });

      return {
        success: true,
        jobId,
        result
      };

    } catch (error: any) {
      job.status = 'failed';
      job.error = error.message;
      job.endTime = new Date().toISOString();

      this.emit('job:failed', { jobId, error: error.message });

      return {
        success: false,
        jobId,
        error: error.message
      };

    } finally {
      // Move to history
      this.jobHistory.push(job);
      this.activeJobs.delete(jobId);
    }
  }

  /**
   * Get status of a specific job
   */
  getJobStatus(jobId: string): Job | null {
    const activeJob = this.activeJobs.get(jobId);
    if (activeJob) {
      return activeJob;
    }

    return this.jobHistory.find(job => job.id === jobId) || null;
  }

  /**
   * Get all registered agents
   */
  getAgents(): Array<{ id: string; status: string; capabilities: string[]; metadata: { registeredAt: string; version: string } }> {
    return Array.from(this.agents.entries()).map(([id, agent]) => ({
      id,
      status: agent.status,
      capabilities: agent.capabilities,
      metadata: agent.metadata
    }));
  }

  /**
   * Get job history
   */
  getJobHistory(limit: number = 10): Job[] {
    return this.jobHistory.slice(-limit);
  }

  /**
   * Get active jobs
   */
  getActiveJobs(): Job[] {
    return Array.from(this.activeJobs.values());
  }

  /**
   * Cancel an active job
   */
  cancelJob(jobId: string): boolean {
    const job = this.activeJobs.get(jobId);
    if (job) {
      job.status = 'cancelled';
      job.endTime = new Date().toISOString();
      this.jobHistory.push(job);
      this.activeJobs.delete(jobId);
      this.emit('job:cancelled', { jobId });
      return true;
    }
    return false;
  }

  /**
   * Create document with capability context awareness
   * This method helps agents create enablers in the same folder as their parent capability
   */
  async createDocumentWithContext(type: string, documentData: DocumentData, capabilityContext: string | CapabilityContext | null = null): Promise<any> {
    try {
      const axios = require('axios');
      const baseURL = 'http://localhost:3000'; // Default Anvil server

      const context: DocumentContext = {};

      // If creating an enabler and we have capability context, use it
      if (type === 'enabler' && capabilityContext) {
        if (typeof capabilityContext === 'string') {
          // If it's a capability ID, let the backend find the path
          documentData.capabilityId = capabilityContext;
        } else if (capabilityContext.path) {
          // If it's a capability object with path, use it directly
          context.parentCapabilityPath = capabilityContext.path;
        } else if (capabilityContext.id) {
          // If it's a capability object with ID, let the backend find it
          documentData.capabilityId = capabilityContext.id;
        }
      }

      const response = await axios.post(`${baseURL}/api/discovery/create`, {
        type,
        documentData,
        context
      });

      console.log(`[AGENT] Created ${type} document:`, response.data.fileName);
      return response.data;

    } catch (error: any) {
      console.error(`[AGENT] Failed to create ${type} document:`, error.message);
      throw error;
    }
  }
}

// Create singleton instance
const orchestrator = new AgentOrchestrator();

export = orchestrator;
