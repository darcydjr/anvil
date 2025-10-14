/**
 * Requirements Analyzer Agent
 * Analyzes and validates capability and enabler specifications
 */

import { marked } from 'marked';

interface AnalyzerInput {
  documentId: string;
  documentContent: string;
  options?: AnalyzerOptions;
}

interface AnalyzerOptions {
  includeSuggestions?: boolean;
}

interface Enabler {
  id: string;
  name: string;
  description: string;
  status: string;
  priority: string;
}

interface Requirement {
  id: string;
  requirement: string;
  description: string;
  priority: string;
  status: string;
  approval: string;
}

interface NonFunctionalRequirement {
  id: string;
  type: string;
  requirement: string;
  description?: string;
  priority: string;
  status: string;
  approval: string;
}

interface Requirements {
  functional: Requirement[];
  nonFunctional: NonFunctionalRequirement[];
}

interface Dependency {
  type: 'internal' | 'external';
  description: string;
}

interface ValidationResult {
  isValid: boolean;
  issues: string[];
  warnings: string[];
  suggestions: string[];
}

interface Metrics {
  completeness: number;
  clarity: number;
  consistency?: number;
  testability?: number;
}

interface Suggestion {
  type: string;
  message: string;
  priority: string;
}

interface ImplementationPlan {
  tasks: Task[];
  hasApprovalGates: boolean;
}

interface Task {
  name: string;
  description: string;
}

interface CapabilityAnalysis {
  documentId: string;
  type: 'Capability';
  timestamp: string;
  metadata: Record<string, any>;
  enablers: Enabler[];
  requirements: Requirements;
  dependencies: Dependency[];
  validation: ValidationResult;
  metrics: Metrics;
  suggestions?: Suggestion[];
}

interface EnablerAnalysis {
  documentId: string;
  type: 'Enabler';
  timestamp: string;
  metadata: Record<string, any>;
  parentCapability: string | null;
  requirements: Requirements;
  implementationPlan: ImplementationPlan | null;
  dependencies: Dependency[];
  validation: ValidationResult;
  metrics: Metrics;
  suggestions?: Suggestion[];
}

interface AnalysisResult<T> {
  success: boolean;
  analysis?: T;
  error?: string;
}

interface ValidationInput {
  requirements: Requirement[];
  implementation: any;
  options?: Record<string, any>;
}

interface RequirementValidation {
  timestamp: string;
  totalRequirements: number;
  implemented: ImplementedRequirement[];
  notImplemented: NotImplementedRequirement[];
  partiallyImplemented: PartiallyImplementedRequirement[];
  coverage: number;
}

interface ImplementedRequirement {
  requirement: Requirement;
  evidence: string;
}

interface NotImplementedRequirement {
  requirement: Requirement;
  reason: string;
}

interface PartiallyImplementedRequirement {
  requirement: Requirement;
  evidence: string;
  missing: string;
}

interface ImplementationStatus {
  implemented?: boolean;
  partial?: boolean;
  evidence?: string;
  missing?: string;
  reason?: string;
}

class RequirementsAnalyzer {
  version: string;
  name: string;

  constructor() {
    this.version = '1.0.0';
    this.name = 'Requirements Analyzer';
  }

  /**
   * Get agent capabilities
   */
  getCapabilities(): string[] {
    return [
      'analyze-capability',
      'analyze-enabler',
      'validate-requirements',
      'check-dependencies',
      'suggest-improvements',
      'extract-metadata',
      'generate-traceability-matrix'
    ];
  }

  /**
   * Analyze a capability document
   */
  async analyzeCapability(input: AnalyzerInput): Promise<AnalysisResult<CapabilityAnalysis>> {
    const { documentId, documentContent, options = {} } = input;

    try {
      const analysis: CapabilityAnalysis = {
        documentId,
        type: 'Capability',
        timestamp: new Date().toISOString(),
        metadata: {},
        enablers: [],
        requirements: {
          functional: [],
          nonFunctional: []
        },
        dependencies: [],
        validation: {
          isValid: true,
          issues: [],
          warnings: [],
          suggestions: []
        },
        metrics: {
          completeness: 0,
          clarity: 0,
          consistency: 0
        }
      };

      // Extract metadata
      analysis.metadata = this.extractMetadata(documentContent);

      // Extract enablers
      analysis.enablers = this.extractEnablers(documentContent);

      // Extract requirements
      analysis.requirements = this.extractRequirements(documentContent);

      // Extract dependencies
      analysis.dependencies = this.extractDependencies(documentContent);

      // Validate the capability
      analysis.validation = this.validateCapability(analysis);

      // Calculate metrics
      analysis.metrics = this.calculateMetrics(analysis);

      // Generate suggestions
      if (options.includeSuggestions) {
        analysis.suggestions = this.generateSuggestions(analysis);
      }

      return {
        success: true,
        analysis
      };

    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Analyze an enabler document
   */
  async analyzeEnabler(input: AnalyzerInput): Promise<AnalysisResult<EnablerAnalysis>> {
    const { documentId, documentContent, options = {} } = input;

    try {
      const analysis: EnablerAnalysis = {
        documentId,
        type: 'Enabler',
        timestamp: new Date().toISOString(),
        metadata: {},
        parentCapability: null,
        requirements: {
          functional: [],
          nonFunctional: []
        },
        implementationPlan: null,
        dependencies: [],
        validation: {
          isValid: true,
          issues: [],
          warnings: [],
          suggestions: []
        },
        metrics: {
          completeness: 0,
          clarity: 0,
          testability: 0
        }
      };

      // Extract metadata
      analysis.metadata = this.extractMetadata(documentContent);

      // Extract parent capability
      analysis.parentCapability = analysis.metadata['Capability ID'] || null;

      // Extract requirements
      analysis.requirements = this.extractRequirements(documentContent);

      // Extract implementation plan
      analysis.implementationPlan = this.extractImplementationPlan(documentContent);

      // Extract dependencies
      analysis.dependencies = this.extractDependencies(documentContent);

      // Validate the enabler
      analysis.validation = this.validateEnabler(analysis);

      // Calculate metrics
      analysis.metrics = this.calculateEnablerMetrics(analysis);

      // Generate suggestions
      if (options.includeSuggestions) {
        analysis.suggestions = this.generateEnablerSuggestions(analysis);
      }

      return {
        success: true,
        analysis
      };

    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Extract metadata from document content
   */
  extractMetadata(content: string): Record<string, any> {
    const metadata: Record<string, any> = {};
    const metadataSection = content.match(/## Metadata\n([\s\S]*?)(?=\n##|$)/);

    if (metadataSection) {
      const lines = metadataSection[1].split('\n');
      for (const line of lines) {
        const match = line.match(/- \*\*(.+?)\*\*:\s*(.+)/);
        if (match) {
          metadata[match[1]] = match[2];
        }
      }
    }

    return metadata;
  }

  /**
   * Extract enablers from capability document
   */
  extractEnablers(content: string): Enabler[] {
    const enablers: Enabler[] = [];
    const enablerSection = content.match(/## Enablers\n([\s\S]*?)(?=\n##|$)/);

    if (enablerSection) {
      // Parse table format
      const tableMatch = enablerSection[1].match(/\|[\s\S]+?\|/g);
      if (tableMatch) {
        const rows = enablerSection[1].split('\n').filter(line => line.includes('|'));
        // Skip header and separator rows
        for (let i = 2; i < rows.length; i++) {
          const columns = rows[i].split('|').map(col => col.trim()).filter(col => col);
          if (columns.length >= 3) {
            enablers.push({
              id: columns[0],
              name: columns[1],
              description: columns[2],
              status: columns[3] || 'Unknown',
              priority: columns[4] || 'Medium'
            });
          }
        }
      }
    }

    return enablers;
  }

  /**
   * Extract requirements from document
   */
  extractRequirements(content: string): Requirements {
    const requirements: Requirements = {
      functional: [],
      nonFunctional: []
    };

    // Extract functional requirements
    const funcSection = content.match(/## Functional Requirements\n([\s\S]*?)(?=\n##|$)/);
    if (funcSection) {
      requirements.functional = this.parseRequirementTable(funcSection[1]);
    }

    // Extract non-functional requirements
    const nonFuncSection = content.match(/## Non-Functional Requirements\n([\s\S]*?)(?=\n##|$)/);
    if (nonFuncSection) {
      requirements.nonFunctional = this.parseNonFunctionalTable(nonFuncSection[1]);
    }

    return requirements;
  }

  /**
   * Parse requirement table
   */
  parseRequirementTable(tableContent: string): Requirement[] {
    const requirements: Requirement[] = [];
    const rows = tableContent.split('\n').filter(line => line.includes('|'));

    for (let i = 2; i < rows.length; i++) {
      const columns = rows[i].split('|').map(col => col.trim()).filter(col => col);
      if (columns.length >= 3) {
        requirements.push({
          id: columns[0],
          requirement: columns[1],
          description: columns[2],
          priority: columns[3] || 'Medium',
          status: columns[4] || 'Draft',
          approval: columns[5] || 'Not Approved'
        });
      }
    }

    return requirements;
  }

  /**
   * Parse non-functional requirement table
   */
  parseNonFunctionalTable(tableContent: string): NonFunctionalRequirement[] {
    const requirements: NonFunctionalRequirement[] = [];
    const rows = tableContent.split('\n').filter(line => line.includes('|'));

    for (let i = 2; i < rows.length; i++) {
      const columns = rows[i].split('|').map(col => col.trim()).filter(col => col);
      if (columns.length >= 3) {
        requirements.push({
          id: columns[0],
          type: columns[1],
          requirement: columns[2],
          priority: columns[3] || 'Medium',
          status: columns[4] || 'Draft',
          approval: columns[5] || 'Not Approved'
        });
      }
    }

    return requirements;
  }

  /**
   * Extract dependencies from document
   */
  extractDependencies(content: string): Dependency[] {
    const dependencies: Dependency[] = [];

    // Look for internal dependencies
    const internalSection = content.match(/### Internal Dependencies\n([\s\S]*?)(?=\n###|\n##|$)/);
    if (internalSection) {
      const depLines = internalSection[1].split('\n').filter(line => line.startsWith('-'));
      dependencies.push(...depLines.map(line => ({
        type: 'internal' as const,
        description: line.replace(/^-\s*/, '')
      })));
    }

    // Look for external dependencies
    const externalSection = content.match(/### External Dependencies\n([\s\S]*?)(?=\n###|\n##|$)/);
    if (externalSection) {
      const depLines = externalSection[1].split('\n').filter(line => line.startsWith('-'));
      dependencies.push(...depLines.map(line => ({
        type: 'external' as const,
        description: line.replace(/^-\s*/, '')
      })));
    }

    return dependencies;
  }

  /**
   * Extract implementation plan
   */
  extractImplementationPlan(content: string): ImplementationPlan | null {
    const planSection = content.match(/## Implementation Plan\n([\s\S]*?)(?=\n##|$)/);

    if (planSection) {
      const tasks: Task[] = [];
      const taskMatches = planSection[1].matchAll(/### Task \d+: (.+?)\n([\s\S]*?)(?=\n###|\n##|$)/g);

      for (const match of taskMatches) {
        tasks.push({
          name: match[1],
          description: match[2].trim()
        });
      }

      return {
        tasks,
        hasApprovalGates: planSection[1].includes('Approval')
      };
    }

    return null;
  }

  /**
   * Validate capability document
   */
  validateCapability(analysis: CapabilityAnalysis): ValidationResult {
    const validation: ValidationResult = {
      isValid: true,
      issues: [],
      warnings: [],
      suggestions: []
    };

    // Check required metadata
    const requiredFields = ['Type', 'ID', 'Status', 'Priority'];
    for (const field of requiredFields) {
      if (!analysis.metadata[field]) {
        validation.issues.push(`Missing required metadata field: ${field}`);
        validation.isValid = false;
      }
    }

    // Check enablers
    if (analysis.enablers.length === 0) {
      validation.warnings.push('No enablers defined for this capability');
    }

    // Check for orphaned enablers
    for (const enabler of analysis.enablers) {
      if (!enabler.id || !enabler.name) {
        validation.issues.push(`Enabler missing required fields: ${JSON.stringify(enabler)}`);
        validation.isValid = false;
      }
    }

    // Check dependencies
    if (analysis.dependencies.length === 0) {
      validation.warnings.push('No dependencies defined');
    }

    return validation;
  }

  /**
   * Validate enabler document
   */
  validateEnabler(analysis: EnablerAnalysis): ValidationResult {
    const validation: ValidationResult = {
      isValid: true,
      issues: [],
      warnings: [],
      suggestions: []
    };

    // Check required metadata
    const requiredFields = ['Type', 'ID', 'Status', 'Capability ID'];
    for (const field of requiredFields) {
      if (!analysis.metadata[field]) {
        validation.issues.push(`Missing required metadata field: ${field}`);
        validation.isValid = false;
      }
    }

    // Check requirements
    if (analysis.requirements.functional.length === 0) {
      validation.warnings.push('No functional requirements defined');
    }

    // Check implementation plan
    if (!analysis.implementationPlan || analysis.implementationPlan.tasks.length === 0) {
      validation.warnings.push('No implementation plan defined');
    }

    // Validate requirement IDs are unique
    const reqIds = new Set<string>();
    for (const req of [...analysis.requirements.functional, ...analysis.requirements.nonFunctional]) {
      if (reqIds.has(req.id)) {
        validation.issues.push(`Duplicate requirement ID: ${req.id}`);
        validation.isValid = false;
      }
      reqIds.add(req.id);
    }

    return validation;
  }

  /**
   * Calculate metrics for capability
   */
  calculateMetrics(analysis: CapabilityAnalysis): Metrics {
    const metrics: Metrics = {
      completeness: 0,
      clarity: 0,
      consistency: 0
    };

    // Completeness score
    let completeItems = 0;
    const totalItems = 10; // Base items to check

    if (analysis.metadata.ID) completeItems++;
    if (analysis.metadata.Status) completeItems++;
    if (analysis.metadata.Description) completeItems++;
    if (analysis.metadata.Owner) completeItems++;
    if (analysis.enablers.length > 0) completeItems += 2;
    if (analysis.requirements.functional.length > 0) completeItems += 2;
    if (analysis.dependencies.length > 0) completeItems++;
    if (analysis.validation.isValid) completeItems++;

    metrics.completeness = Math.round((completeItems / totalItems) * 100);

    // Clarity score (based on description lengths)
    let clarityScore = 0;
    if (analysis.metadata.Description && analysis.metadata.Description.length > 20) {
      clarityScore += 30;
    }

    for (const enabler of analysis.enablers) {
      if (enabler.description && enabler.description.length > 10) {
        clarityScore += 10;
      }
    }

    metrics.clarity = Math.min(100, clarityScore);

    // Consistency score
    metrics.consistency = analysis.validation.issues.length === 0 ? 100 :
                         Math.max(0, 100 - (analysis.validation.issues.length * 20));

    return metrics;
  }

  /**
   * Calculate metrics for enabler
   */
  calculateEnablerMetrics(analysis: EnablerAnalysis): Metrics {
    const metrics: Metrics = {
      completeness: 0,
      clarity: 0,
      testability: 0
    };

    // Completeness score
    let completeItems = 0;
    const totalItems = 8;

    if (analysis.metadata.ID) completeItems++;
    if (analysis.metadata['Capability ID']) completeItems++;
    if (analysis.requirements.functional.length > 0) completeItems += 2;
    if (analysis.requirements.nonFunctional.length > 0) completeItems++;
    if (analysis.implementationPlan) completeItems += 2;
    if (analysis.validation.isValid) completeItems++;

    metrics.completeness = Math.round((completeItems / totalItems) * 100);

    // Clarity score
    metrics.clarity = analysis.validation.warnings.length === 0 ? 100 :
                     Math.max(0, 100 - (analysis.validation.warnings.length * 15));

    // Testability score (based on requirement specificity)
    let testableReqs = 0;
    const totalReqs = analysis.requirements.functional.length + analysis.requirements.nonFunctional.length;

    for (const req of [...analysis.requirements.functional, ...analysis.requirements.nonFunctional]) {
      if (req.description && req.description.length > 20) {
        testableReqs++;
      }
    }

    metrics.testability = totalReqs > 0 ? Math.round((testableReqs / totalReqs) * 100) : 0;

    return metrics;
  }

  /**
   * Generate suggestions for capability improvement
   */
  generateSuggestions(analysis: CapabilityAnalysis): Suggestion[] {
    const suggestions: Suggestion[] = [];

    if (analysis.metrics.completeness < 70) {
      suggestions.push({
        type: 'completeness',
        message: 'Consider adding more detail to improve document completeness',
        priority: 'high'
      });
    }

    if (analysis.enablers.length === 0) {
      suggestions.push({
        type: 'structure',
        message: 'Add enablers to break down this capability into implementable components',
        priority: 'high'
      });
    }

    if (!analysis.metadata.Owner) {
      suggestions.push({
        type: 'ownership',
        message: 'Assign an owner to this capability for accountability',
        priority: 'medium'
      });
    }

    return suggestions;
  }

  /**
   * Generate suggestions for enabler improvement
   */
  generateEnablerSuggestions(analysis: EnablerAnalysis): Suggestion[] {
    const suggestions: Suggestion[] = [];

    if (analysis.requirements.functional.length < 3) {
      suggestions.push({
        type: 'requirements',
        message: 'Consider adding more functional requirements for better coverage',
        priority: 'medium'
      });
    }

    if (!analysis.implementationPlan) {
      suggestions.push({
        type: 'planning',
        message: 'Add an implementation plan with clear tasks and milestones',
        priority: 'high'
      });
    }

    if (analysis.metrics.testability !== undefined && analysis.metrics.testability < 60) {
      suggestions.push({
        type: 'testability',
        message: 'Make requirements more specific and measurable for better testability',
        priority: 'medium'
      });
    }

    return suggestions;
  }

  /**
   * Validate requirements against implementation
   */
  async validateRequirements(input: ValidationInput): Promise<AnalysisResult<RequirementValidation>> {
    const { requirements, implementation, options = {} } = input;

    try {
      const validation: RequirementValidation = {
        timestamp: new Date().toISOString(),
        totalRequirements: requirements.length,
        implemented: [],
        notImplemented: [],
        partiallyImplemented: [],
        coverage: 0
      };

      // Analyze each requirement
      for (const req of requirements) {
        const implStatus = this.checkRequirementImplementation(req, implementation);

        if (implStatus.implemented) {
          validation.implemented.push({
            requirement: req,
            evidence: implStatus.evidence!
          });
        } else if (implStatus.partial) {
          validation.partiallyImplemented.push({
            requirement: req,
            evidence: implStatus.evidence!,
            missing: implStatus.missing!
          });
        } else {
          validation.notImplemented.push({
            requirement: req,
            reason: implStatus.reason!
          });
        }
      }

      // Calculate coverage
      validation.coverage = Math.round(
        ((validation.implemented.length + validation.partiallyImplemented.length * 0.5) /
         validation.totalRequirements) * 100
      );

      return {
        success: true,
        analysis: validation
      };

    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Check if a requirement is implemented
   */
  checkRequirementImplementation(requirement: Requirement, implementation: any): ImplementationStatus {
    // This is a simplified check - in reality, this would use more sophisticated analysis
    const reqKeywords = requirement.requirement.toLowerCase().split(' ');
    const implContent = JSON.stringify(implementation).toLowerCase();

    let matchCount = 0;
    const evidence: string[] = [];

    for (const keyword of reqKeywords) {
      if (keyword.length > 3 && implContent.includes(keyword)) {
        matchCount++;
        evidence.push(keyword);
      }
    }

    const matchPercentage = (matchCount / reqKeywords.length) * 100;

    if (matchPercentage > 70) {
      return {
        implemented: true,
        evidence: evidence.join(', ')
      };
    } else if (matchPercentage > 30) {
      return {
        partial: true,
        evidence: evidence.join(', '),
        missing: reqKeywords.filter(k => !evidence.includes(k)).join(', ')
      };
    } else {
      return {
        implemented: false,
        reason: 'No matching implementation found'
      };
    }
  }
}

export = RequirementsAnalyzer;
