/**
 * AI Agents Index
 *
 * Export all Document AI Platform agents and orchestrator
 */

// Individual Agents
export { lexa, LEXAAgent } from './vera'
export { clara, CLARAAgent } from './cara'
export { dora, DORAAgent } from './dora'
export { aria, ARIAAgent } from './sara'
export { rita, RITAAgent } from './rita'
export { atlas, ATLASAgent } from './mars'
export { aura, AURAAgent } from './aura'
export { sage, SAGEAgent } from './sage'

// Orchestrator
export { orchestrator, AgentOrchestrator } from './orchestrator'

// Types
export * from './types'

// Base Agent (for extension)
export { BaseAgent } from './base-agent'

/**
 * Agent Summary:
 *
 * LEXA - Legal Examination & Assessment Agent
 *   - Collects party information
 *   - Determines review profile and priority tier
 *   - Sets review frequency
 *
 * CLARA - Comprehensive Legal Analysis & Review Agent
 *   - Deep-dive reviews for Critical/High parties
 *   - Multi-dimensional scoring
 *   - Detailed recommendations
 *
 * DORA - Documentation & Outreach Retrieval Agent
 *   - Requests documents from parties
 *   - Tracks document status
 *   - Manages document inventory
 *
 * ARIA - Automated Review, Identification & Analysis Agent
 *   - Analyzes legal documents
 *   - Identifies issues and gaps
 *   - Maps to VLF review framework
 *
 * RITA - Report Intelligence & Threat Assessment Agent
 *   - Generates review reports
 *   - Creates dashboards and metrics
 *   - Trend analysis
 *
 * ATLAS - Action Tracking & Legal Advisory System Agent
 *   - Creates action plans
 *   - Tracks progress and escalates
 *   - Manages risk acceptance
 *
 * AURA - Automated Upload & Recognition Agent
 *   - Extracts party info from uploaded documents
 *   - Classifies document types and assesses priority
 *   - Compares document similarity for deduplication
 *
 * SAGE - Structured Assembly & Generation Engine
 *   - Generates court documents from templates
 *   - Resolves merge fields from case data
 *   - Manages attorney approval workflow
 */
