/**
 * Agent Orchestrator
 * Central command and coordination for all Anvil subagents
 */

const EventEmitter = require('events');
const path = require('path');
const fs = require('fs-extra');
const { v4: uuidv4 } = require('uuid');

class AgentOrchestrator extends EventEmitter {
  constructor() {
    super();
    this.agents = new Map();
    this.activeJobs = new Map();
    this.jobHistory = [];
    this.config = null;
    this.initialized = false;
  }

  /**
   * Initialize the orchestrator with configuration
   */
  async initialize(config = {}) {
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
    } catch (error) {
      console.error('[ORCHESTRATOR] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Register all available agents
   */
  async registerAgents() {
    const agentModules = {
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
          const agent = new AgentClass();

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
      } catch (error) {
        console.warn(`[ORCHESTRATOR] Failed to register agent ${agentId}:`, error.message);
      }
    }
  }

  /**
   * Execute a workflow with multiple agents
   */
  async executeWorkflow(workflowDefinition) {
    const jobId = uuidv4();
    const job = {
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
        job.currentStage++;

        const stageResult = await this.executeStage(jobId, stage, job.results);

        job.stages.push({
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
        job.results[stage.name] = stageResult.data;

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

    } catch (error) {
      job.status = 'failed';
      job.endTime = new Date().toISOString();
      job.errors.push({
        stage: job.currentStage,
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
  async executeStage(jobId, stage, previousResults) {
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

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Execute a task with a specific agent
   */
  async executeAgentTask(agent, action, input) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Agent task timeout after ${this.config.timeout}ms`));
      }, this.config.timeout);

      try {
        // Check if agent has the requested action
        if (!agent.instance[action]) {
          clearTimeout(timeout);
          reject(new Error(`Agent does not support action: ${action}`));
          return;
        }

        // Execute the agent action
        agent.instance[action](input)
          .then(result => {
            clearTimeout(timeout);
            resolve(result);
          })
          .catch(error => {
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
  async routeRequest(request) {
    const { agentId, action, payload, options = {} } = request;

    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }

    const jobId = uuidv4();
    const job = {
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

    } catch (error) {
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
  getJobStatus(jobId) {
    const activeJob = this.activeJobs.get(jobId);
    if (activeJob) {
      return activeJob;
    }

    return this.jobHistory.find(job => job.id === jobId) || null;
  }

  /**
   * Get all registered agents
   */
  getAgents() {
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
  getJobHistory(limit = 10) {
    return this.jobHistory.slice(-limit);
  }

  /**
   * Get active jobs
   */
  getActiveJobs() {
    return Array.from(this.activeJobs.values());
  }

  /**
   * Cancel an active job
   */
  cancelJob(jobId) {
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
}

// Create singleton instance
const orchestrator = new AgentOrchestrator();

module.exports = orchestrator;