/**
 * Agent API Endpoints
 * RESTful API for agent interactions
 */

const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs-extra');
const orchestrator = require('../agents/orchestrator');
const AgentRouter = require('../agents/orchestrator/router');

// Initialize agent router
const agentRouter = new AgentRouter();

// Load agent configuration
let agentConfig = {};
try {
  agentConfig = require('../agent-config.json');
} catch (error) {
  console.warn('[AGENT-API] No agent config found, using defaults');
}

/**
 * Initialize agents on server start
 */
async function initializeAgents() {
  try {
    console.log('[AGENT-API] Initializing agent orchestrator...');
    await orchestrator.initialize(agentConfig.agents?.orchestrator || {});
    console.log('[AGENT-API] Agent orchestrator initialized successfully');
    return true;
  } catch (error) {
    console.error('[AGENT-API] Failed to initialize agents:', error);
    return false;
  }
}

/**
 * GET /api/agents
 * Get all registered agents and their capabilities
 */
router.get('/', (req, res) => {
  try {
    const agents = orchestrator.getAgents();
    res.json({
      success: true,
      agents,
      config: agentConfig.agents || {}
    });
  } catch (error) {
    console.error('[AGENT-API] Error getting agents:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/agents/status
 * Get orchestrator status and active jobs
 */
router.get('/status', (req, res) => {
  try {
    const status = {
      initialized: orchestrator.initialized,
      activeJobs: orchestrator.getActiveJobs(),
      registeredAgents: orchestrator.getAgents().length,
      config: orchestrator.config
    };

    res.json({
      success: true,
      status
    });
  } catch (error) {
    console.error('[AGENT-API] Error getting status:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/agents/analyze
 * Trigger requirements analysis on a document
 */
router.post('/analyze', async (req, res) => {
  try {
    const { documentId, documentContent, documentType, options = {} } = req.body;

    if (!documentContent) {
      return res.status(400).json({
        success: false,
        error: 'Document content is required'
      });
    }

    // Route to appropriate analyzer based on document type
    const agentId = 'requirements-analyzer';
    const action = documentType === 'Capability' ? 'analyzeCapability' : 'analyzeEnabler';

    const result = await orchestrator.routeRequest({
      agentId,
      action,
      payload: {
        documentId,
        documentContent,
        options
      }
    });

    res.json(result);

  } catch (error) {
    console.error('[AGENT-API] Error analyzing document:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/agents/design
 * Generate design from specifications
 */
router.post('/design', async (req, res) => {
  try {
    const { requirements, systemType, options = {} } = req.body;

    if (!requirements) {
      return res.status(400).json({
        success: false,
        error: 'Requirements are required'
      });
    }

    const result = await orchestrator.routeRequest({
      agentId: 'design-architect',
      action: 'createSystemDesign',
      payload: {
        requirements,
        systemType,
        options
      }
    });

    res.json(result);

  } catch (error) {
    console.error('[AGENT-API] Error generating design:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/agents/generate
 * Generate code from design/requirements
 */
router.post('/generate', async (req, res) => {
  try {
    const { design, language, framework, target, options = {} } = req.body;

    if (!design) {
      return res.status(400).json({
        success: false,
        error: 'Design is required'
      });
    }

    const action = target === 'backend' ? 'generateBackend' :
                   target === 'frontend' ? 'generateFrontend' :
                   'generate';

    const result = await orchestrator.routeRequest({
      agentId: 'code-generator',
      action,
      payload: {
        design,
        language,
        framework,
        options
      }
    });

    res.json(result);

  } catch (error) {
    console.error('[AGENT-API] Error generating code:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/agents/test
 * Generate and run tests
 */
router.post('/test', async (req, res) => {
  try {
    const { code, testType, framework, requirements, options = {} } = req.body;

    if (!code) {
      return res.status(400).json({
        success: false,
        error: 'Code is required'
      });
    }

    const result = await orchestrator.routeRequest({
      agentId: 'test-automator',
      action: 'generateTests',
      payload: {
        code,
        testType,
        framework,
        requirements,
        options
      }
    });

    res.json(result);

  } catch (error) {
    console.error('[AGENT-API] Error generating tests:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/agents/document
 * Generate documentation
 */
router.post('/document', async (req, res) => {
  try {
    const { source, docType, format, options = {} } = req.body;

    if (!source) {
      return res.status(400).json({
        success: false,
        error: 'Source is required'
      });
    }

    const result = await orchestrator.routeRequest({
      agentId: 'documentation-generator',
      action: 'generateDocumentation',
      payload: {
        source,
        docType,
        format,
        options
      }
    });

    res.json(result);

  } catch (error) {
    console.error('[AGENT-API] Error generating documentation:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/agents/workflow
 * Execute a complete workflow
 */
router.post('/workflow', async (req, res) => {
  try {
    const { workflowName, input, options = {} } = req.body;

    // Get workflow definition from config
    const workflowDef = agentConfig.workflows?.[workflowName];

    if (!workflowDef) {
      return res.status(400).json({
        success: false,
        error: `Workflow ${workflowName} not found`
      });
    }

    if (!workflowDef.enabled) {
      return res.status(400).json({
        success: false,
        error: `Workflow ${workflowName} is disabled`
      });
    }

    // Start workflow execution
    const jobId = await orchestrator.executeWorkflow({
      ...workflowDef,
      input,
      options
    });

    res.json({
      success: true,
      jobId,
      message: `Workflow ${workflowName} started`,
      checkStatus: `/api/agents/job/${jobId}`
    });

  } catch (error) {
    console.error('[AGENT-API] Error executing workflow:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/agents/job/:jobId
 * Get status of a specific job
 */
router.get('/job/:jobId', (req, res) => {
  try {
    const { jobId } = req.params;
    const job = orchestrator.getJobStatus(jobId);

    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Job not found'
      });
    }

    res.json({
      success: true,
      job
    });

  } catch (error) {
    console.error('[AGENT-API] Error getting job status:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * DELETE /api/agents/job/:jobId
 * Cancel an active job
 */
router.delete('/job/:jobId', (req, res) => {
  try {
    const { jobId } = req.params;
    const cancelled = orchestrator.cancelJob(jobId);

    if (!cancelled) {
      return res.status(404).json({
        success: false,
        error: 'Job not found or already completed'
      });
    }

    res.json({
      success: true,
      message: `Job ${jobId} cancelled`
    });

  } catch (error) {
    console.error('[AGENT-API] Error cancelling job:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/agents/history
 * Get job execution history
 */
router.get('/history', (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const history = orchestrator.getJobHistory(limit);

    res.json({
      success: true,
      history
    });

  } catch (error) {
    console.error('[AGENT-API] Error getting history:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/agents/route
 * Intelligently route a request to the appropriate agent
 */
router.post('/route', async (req, res) => {
  try {
    const request = req.body;

    // Use the agent router to analyze the request
    const route = agentRouter.analyzeRequest(request);

    if (!route) {
      return res.status(400).json({
        success: false,
        error: 'Could not determine appropriate agent for this request'
      });
    }

    // Validate the route
    const validation = agentRouter.validateRoute(route, request.payload);

    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: validation.message,
        missingFields: validation.missingFields
      });
    }

    // Execute the routed request
    const result = await orchestrator.routeRequest({
      agentId: route.agent,
      action: route.action,
      payload: request.payload
    });

    res.json({
      success: true,
      route,
      result
    });

  } catch (error) {
    console.error('[AGENT-API] Error routing request:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/agents/routes
 * Get all available routes
 */
router.get('/routes', (req, res) => {
  try {
    const routes = agentRouter.getAvailableRoutes();

    res.json({
      success: true,
      routes
    });

  } catch (error) {
    console.error('[AGENT-API] Error getting routes:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/agents/workflows
 * Get all available workflows
 */
router.get('/workflows', (req, res) => {
  try {
    const workflows = Object.entries(agentConfig.workflows || {}).map(([key, value]) => ({
      id: key,
      ...value
    }));

    res.json({
      success: true,
      workflows
    });

  } catch (error) {
    console.error('[AGENT-API] Error getting workflows:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/agents/config
 * Get agent configuration
 */
router.get('/config', (req, res) => {
  try {
    res.json({
      success: true,
      config: agentConfig
    });
  } catch (error) {
    console.error('[AGENT-API] Error getting config:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PUT /api/agents/config
 * Update agent configuration
 */
router.put('/config', async (req, res) => {
  try {
    const newConfig = req.body;

    // Validate configuration structure
    if (!newConfig.agents || !newConfig.workflows) {
      return res.status(400).json({
        success: false,
        error: 'Invalid configuration structure'
      });
    }

    // Update configuration
    agentConfig = newConfig;

    // Save to file
    await fs.writeJson(path.join(__dirname, '../agent-config.json'), agentConfig, { spaces: 2 });

    // Reinitialize orchestrator with new config
    await orchestrator.initialize(agentConfig.agents?.orchestrator || {});

    res.json({
      success: true,
      message: 'Agent configuration updated successfully'
    });

  } catch (error) {
    console.error('[AGENT-API] Error updating config:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = {
  router,
  initializeAgents
};