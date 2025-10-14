/**
 * Agent Router
 * Handles intelligent routing of requests to appropriate agents
 */

interface RoutingRule {
  agent: string;
  action: string;
  requiredFields?: string[];
}

interface RouteResult {
  agent: string;
  action: string;
  requiredFields?: string[];
}

interface AnalyzeRequestInput {
  type?: string;
  intent?: string;
  context?: any;
  payload?: any;
}

interface ValidationResult {
  valid: boolean;
  missingFields?: string[];
  message?: string;
}

interface AvailableRoute {
  type: string;
  agent: string;
  action: string;
  requiredFields?: string[];
}

class AgentRouter {
  private routingRules: Map<string, RoutingRule>;

  constructor() {
    this.routingRules = new Map<string, RoutingRule>();
    this.initializeRoutingRules();
  }

  /**
   * Initialize routing rules for different request types
   */
  initializeRoutingRules(): void {
    // Document type routing
    this.routingRules.set('capability-analysis', {
      agent: 'requirements-analyzer',
      action: 'analyzeCapability',
      requiredFields: ['documentId', 'documentContent']
    });

    this.routingRules.set('enabler-analysis', {
      agent: 'requirements-analyzer',
      action: 'analyzeEnabler',
      requiredFields: ['documentId', 'documentContent']
    });

    // Design routing
    this.routingRules.set('system-design', {
      agent: 'design-architect',
      action: 'createSystemDesign',
      requiredFields: ['requirements', 'systemType']
    });

    this.routingRules.set('api-design', {
      agent: 'design-architect',
      action: 'createApiDesign',
      requiredFields: ['endpoints', 'dataModels']
    });

    // Code generation routing
    this.routingRules.set('generate-backend', {
      agent: 'code-generator',
      action: 'generateBackend',
      requiredFields: ['design', 'language', 'framework']
    });

    this.routingRules.set('generate-frontend', {
      agent: 'code-generator',
      action: 'generateFrontend',
      requiredFields: ['design', 'framework', 'components']
    });

    // Testing routing
    this.routingRules.set('generate-tests', {
      agent: 'test-automator',
      action: 'generateTests',
      requiredFields: ['code', 'testType', 'framework']
    });

    this.routingRules.set('validate-requirements', {
      agent: 'test-automator',
      action: 'validateAgainstRequirements',
      requiredFields: ['implementation', 'requirements']
    });

    // Documentation routing
    this.routingRules.set('generate-docs', {
      agent: 'documentation-generator',
      action: 'generateDocumentation',
      requiredFields: ['source', 'docType']
    });
  }

  /**
   * Analyze request and determine the best agent and action
   */
  analyzeRequest(request: AnalyzeRequestInput): RouteResult | null {
    const { type, intent, context, payload } = request;

    // Direct routing if type is specified
    if (type && this.routingRules.has(type)) {
      return this.routingRules.get(type)!;
    }

    // Intent-based routing
    if (intent) {
      return this.routeByIntent(intent, context);
    }

    // Content-based routing
    return this.routeByContent(payload);
  }

  /**
   * Route based on user intent
   */
  routeByIntent(intent: string, context?: any): RouteResult | null {
    const intentMap: Record<string, string | RouteResult> = {
      'analyze': this.determineAnalysisAgent(context),
      'design': this.determineDesignAgent(context),
      'implement': this.determineImplementationAgent(context),
      'test': 'test-automator',
      'document': 'documentation-generator'
    };

    const lowerIntent = intent.toLowerCase();

    for (const [key, value] of Object.entries(intentMap)) {
      if (lowerIntent.includes(key)) {
        return typeof value === 'string'
          ? { agent: value, action: 'process' }
          : value;
      }
    }

    return null;
  }

  /**
   * Route based on content analysis
   */
  routeByContent(payload?: any): RouteResult | null {
    if (!payload) return null;

    // Check for capability or enabler documents
    if (payload.documentType === 'Capability' || payload.metadata?.Type === 'Capability') {
      return {
        agent: 'requirements-analyzer',
        action: 'analyzeCapability'
      };
    }

    if (payload.documentType === 'Enabler' || payload.metadata?.Type === 'Enabler') {
      return {
        agent: 'requirements-analyzer',
        action: 'analyzeEnabler'
      };
    }

    // Check for code-related content
    if (payload.code || payload.sourceCode || payload.implementation) {
      if (payload.needsTests) {
        return {
          agent: 'test-automator',
          action: 'generateTests'
        };
      }
      return {
        agent: 'code-generator',
        action: 'enhance'
      };
    }

    // Check for design-related content
    if (payload.architecture || payload.systemDesign || payload.apiSpec) {
      return {
        agent: 'design-architect',
        action: 'process'
      };
    }

    return null;
  }

  /**
   * Determine the appropriate analysis agent based on context
   */
  determineAnalysisAgent(context?: any): RouteResult {
    if (!context) {
      return { agent: 'requirements-analyzer', action: 'analyze' };
    }

    if (context.documentType === 'Capability') {
      return {
        agent: 'requirements-analyzer',
        action: 'analyzeCapability'
      };
    }

    if (context.documentType === 'Enabler') {
      return {
        agent: 'requirements-analyzer',
        action: 'analyzeEnabler'
      };
    }

    if (context.type === 'requirements') {
      return {
        agent: 'requirements-analyzer',
        action: 'validateRequirements'
      };
    }

    return { agent: 'requirements-analyzer', action: 'analyze' };
  }

  /**
   * Determine the appropriate design agent based on context
   */
  determineDesignAgent(context?: any): RouteResult {
    if (!context) {
      return { agent: 'design-architect', action: 'design' };
    }

    if (context.type === 'system') {
      return {
        agent: 'design-architect',
        action: 'createSystemDesign'
      };
    }

    if (context.type === 'api') {
      return {
        agent: 'design-architect',
        action: 'createApiDesign'
      };
    }

    if (context.type === 'database') {
      return {
        agent: 'design-architect',
        action: 'createDatabaseSchema'
      };
    }

    return { agent: 'design-architect', action: 'design' };
  }

  /**
   * Determine the appropriate implementation agent based on context
   */
  determineImplementationAgent(context?: any): RouteResult {
    if (!context) {
      return { agent: 'code-generator', action: 'generate' };
    }

    if (context.target === 'backend') {
      return {
        agent: 'code-generator',
        action: 'generateBackend'
      };
    }

    if (context.target === 'frontend') {
      return {
        agent: 'code-generator',
        action: 'generateFrontend'
      };
    }

    if (context.target === 'api') {
      return {
        agent: 'code-generator',
        action: 'generateApi'
      };
    }

    return { agent: 'code-generator', action: 'generate' };
  }

  /**
   * Validate that required fields are present for a route
   */
  validateRoute(route: RouteResult, payload: any): ValidationResult {
    if (!route.requiredFields) {
      return { valid: true };
    }

    const missingFields: string[] = [];

    for (const field of route.requiredFields) {
      if (!this.hasNestedField(payload, field)) {
        missingFields.push(field);
      }
    }

    if (missingFields.length > 0) {
      return {
        valid: false,
        missingFields,
        message: `Missing required fields: ${missingFields.join(', ')}`
      };
    }

    return { valid: true };
  }

  /**
   * Check if a nested field exists in an object
   */
  hasNestedField(obj: any, field: string): boolean {
    const keys = field.split('.');
    let current = obj;

    for (const key of keys) {
      if (!current || !current.hasOwnProperty(key)) {
        return false;
      }
      current = current[key];
    }

    return true;
  }

  /**
   * Get recommended workflow based on document type and status
   */
  getRecommendedWorkflow(documentType: string, documentStatus: string): string[] {
    const workflows: Record<string, string[]> = {
      'Capability:Draft': ['analyze', 'validate', 'enhance'],
      'Capability:In Review': ['design', 'plan'],
      'Capability:Approved': ['implement', 'test', 'document'],
      'Enabler:Draft': ['analyze', 'validate', 'link'],
      'Enabler:Ready for Implementation': ['generate', 'test'],
      'Enabler:Implemented': ['document', 'validate']
    };

    const key = `${documentType}:${documentStatus}`;
    return workflows[key] || ['analyze'];
  }

  /**
   * Get all available routes
   */
  getAvailableRoutes(): AvailableRoute[] {
    return Array.from(this.routingRules.entries()).map(([key, value]) => ({
      type: key,
      ...value
    }));
  }
}

export = AgentRouter;
