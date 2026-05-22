import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// ============================================
// Resources and their CRUD permissions
// ============================================

const APP_RESOURCES = [
  'dashboard',
  'clients',
  'contacts',
  'case-reviews',
  'documents',
  'issues',
  'reports',
  'agents',
  'settings',
  'prompts',
  'templates',
  'generated-documents',
  'emails',
]

const SYSTEM_RESOURCES = ['users', 'roles', 'logs']

const ACTIONS = ['view', 'create', 'edit', 'delete']

// ============================================
// System Roles and their permission levels
// ============================================

interface RoleDef {
  name: string
  description: string
  permissions: (resource: string, action: string) => boolean
}

const SYSTEM_ROLES: RoleDef[] = [
  {
    name: 'ADMIN',
    description: 'Full system access including user and role management',
    permissions: () => true,
  },
  {
    name: 'ANALYST',
    description: 'Can manage clients, case reviews, issues, and reports',
    permissions: (resource) => {
      if (['users', 'roles', 'prompts', 'logs'].includes(resource)) return false
      return true
    },
  },
  {
    name: 'VIEWER',
    description: 'Read-only access to dashboards and reports',
    permissions: (_resource, action) => {
      if (['users', 'roles', 'prompts', 'logs'].includes(_resource)) return false
      return action === 'view'
    },
  },
  {
    name: 'VENDOR',
    description: 'Limited access for client portal',
    permissions: (resource, action) => {
      if (['dashboard', 'documents'].includes(resource)) return true
      if (['clients', 'case-reviews', 'issues'].includes(resource))
        return action === 'view'
      return false
    },
  },
]

// ============================================
// Seed Users (match mock-oidc subjects)
// ============================================

const SEED_USERS = [
  {
    email: 'admin@example.com',
    name: 'Alex Admin',
    oidcSubject: 'mock-admin',
    roleName: 'ADMIN',
    department: 'Firm Administration',
  },
  {
    email: 'analyst@example.com',
    name: 'Sam Analyst',
    oidcSubject: 'mock-analyst',
    roleName: 'ANALYST',
    department: 'Case Analysis',
  },
  {
    email: 'user@example.com',
    name: 'Val Viewer',
    oidcSubject: 'mock-user',
    roleName: 'VIEWER',
    department: 'Legal Support',
  },
  {
    email: 'vendor@example.com',
    name: 'Vic Vendor',
    oidcSubject: 'mock-vendor',
    roleName: 'VENDOR',
    department: 'External',
  },
]

// ============================================
// Sample Clients (legal cases)
// ============================================

interface ClientSeed {
  name: string
  legalName: string
  dunsNumber: string
  website: string
  industry: string
  country: string
  stateProvince: string
  primaryContactName: string
  primaryContactEmail: string
  primaryContactPhone: string
  businessOwner: string
  itOwner: string
  annualSpend: number
  status: string
  caseNumber?: string
  caseType?: string
  charges?: string
  chargeStatutes?: string
  arrestDate?: Date
  bondAmount?: number
  bondType?: string
  nextHearingDate?: Date
  nextHearingType?: string
  courtName?: string
  courtAddress?: string
  courtCounty?: string
  courtDivision?: string
  courtPhone?: string
}

const CLIENTS: ClientSeed[] = [
  {
    name: 'State v. Marcus Thompson',
    legalName: 'Marcus Dwayne Thompson',
    dunsNumber: '27-CR-26-1847',
    website: 'Hennepin County Attorney\'s Office',
    industry: 'Criminal — DUI (2nd Offense)',
    country: 'United States',
    stateProvince: 'Hennepin County — 4th Judicial District Court, Minneapolis',
    primaryContactName: 'ADA Rebecca Stohl',
    primaryContactEmail: 'rstohl@hennepin.courts.mn.gov',
    primaryContactPhone: '612-555-0201',
    businessOwner: 'Atty. James Vanmerven',
    itOwner: 'Atty. Sarah Chen',
    annualSpend: 35000,
    status: 'ACTIVE',
    caseNumber: '27-CR-26-1847',
    caseType: 'MISDEMEANOR',
    charges: JSON.stringify(['DUI — Second Offense', 'Refusal to Submit to Chemical Test']),
    chargeStatutes: JSON.stringify(['Minn. Stat. § 169A.20', 'Minn. Stat. § 169A.51']),
    arrestDate: new Date('2026-03-15'),
    bondAmount: 5000,
    bondType: 'CASH',
    nextHearingDate: new Date('2026-06-10'),
    nextHearingType: 'PRETRIAL',
    courtName: 'Hennepin County District Court',
    courtAddress: '300 South Sixth Street, Minneapolis, MN 55487',
    courtCounty: 'Hennepin',
    courtDivision: 'Criminal Division',
    courtPhone: '(612) 348-2040',
  },
  {
    name: 'State v. Deshawn Williams',
    legalName: 'Deshawn Lamar Williams',
    dunsNumber: '62-CR-26-0934',
    website: 'Ramsey County Attorney\'s Office',
    industry: 'Criminal — Grand Theft Auto',
    country: 'United States',
    stateProvince: 'Ramsey County — 2nd Judicial District Court, St. Paul',
    primaryContactName: 'ADA Kevin Marsh',
    primaryContactEmail: 'kmarsh@ramsey.courts.mn.gov',
    primaryContactPhone: '651-555-0312',
    businessOwner: 'Atty. James Vanmerven',
    itOwner: 'Atty. David Park',
    annualSpend: 28000,
    status: 'ACTIVE',
    caseNumber: '62-CR-26-0934',
    caseType: 'FELONY',
    charges: JSON.stringify(['Theft of Motor Vehicle']),
    chargeStatutes: JSON.stringify(['Minn. Stat. § 609.52']),
    arrestDate: new Date('2026-04-02'),
    bondAmount: 15000,
    bondType: 'SURETY',
    nextHearingDate: new Date('2026-06-15'),
    nextHearingType: 'OMNIBUS',
    courtName: 'Ramsey County District Court',
    courtAddress: '15 West Kellogg Blvd, St. Paul, MN 55102',
    courtCounty: 'Ramsey',
    courtDivision: 'Criminal Division',
    courtPhone: '(651) 266-8200',
  },
  {
    name: 'State v. Karen Mitchell',
    legalName: 'Karen Anne Mitchell',
    dunsNumber: '27-CR-25-4281',
    website: 'Hennepin County Attorney\'s Office',
    industry: 'Criminal — Embezzlement / White Collar',
    country: 'United States',
    stateProvince: 'Hennepin County — 4th Judicial District Court, Minneapolis',
    primaryContactName: 'ADA Priya Sharma',
    primaryContactEmail: 'psharma@hennepin.courts.mn.gov',
    primaryContactPhone: '612-555-0415',
    businessOwner: 'Atty. Laura Vanmerven',
    itOwner: 'Atty. Michael Torres',
    annualSpend: 52000,
    status: 'ACTIVE',
    caseNumber: '27-CR-25-4281',
    caseType: 'FELONY',
    charges: JSON.stringify(['Theft by Swindle — Over $35,000', 'Financial Transaction Card Fraud']),
    chargeStatutes: JSON.stringify(['Minn. Stat. § 609.52, Subd. 2(4)', 'Minn. Stat. § 609.821']),
    arrestDate: new Date('2025-11-20'),
    bondAmount: 50000,
    bondType: 'SURETY',
    nextHearingDate: new Date('2026-06-05'),
    nextHearingType: 'JURY_TRIAL',
    courtName: 'Hennepin County District Court',
    courtAddress: '300 South Sixth Street, Minneapolis, MN 55487',
    courtCounty: 'Hennepin',
    courtDivision: 'Criminal Division',
    courtPhone: '(612) 348-2040',
  },
  {
    name: 'State v. Roberto Alvarez',
    legalName: 'Roberto Miguel Alvarez',
    dunsNumber: '27-CR-26-2103',
    website: 'Hennepin County Attorney\'s Office',
    industry: 'Criminal — Drug Possession with Intent',
    country: 'United States',
    stateProvince: 'Hennepin County — 4th Judicial District Court, Minneapolis',
    primaryContactName: 'ADA Thomas Nguyen',
    primaryContactEmail: 'tnguyen@hennepin.courts.mn.gov',
    primaryContactPhone: '612-555-0528',
    businessOwner: 'Atty. James Vanmerven',
    itOwner: 'Atty. Sarah Chen',
    annualSpend: 45000,
    status: 'ACTIVE',
    caseNumber: '27-CR-26-2103',
    caseType: 'FELONY',
    charges: JSON.stringify(['Controlled Substance Crime — 3rd Degree', 'Possession of Drug Paraphernalia']),
    chargeStatutes: JSON.stringify(['Minn. Stat. § 152.023', 'Minn. Stat. § 152.092']),
    arrestDate: new Date('2026-04-28'),
    bondAmount: 25000,
    bondType: 'CASH',
    nextHearingDate: new Date('2026-06-20'),
    nextHearingType: 'PRETRIAL',
    courtName: 'Hennepin County District Court',
    courtAddress: '300 South Sixth Street, Minneapolis, MN 55487',
    courtCounty: 'Hennepin',
    courtDivision: 'Criminal Division',
    courtPhone: '(612) 348-2040',
  },
  {
    name: 'Martinez v. Martinez',
    legalName: 'Elena Martinez (represented by VLF)',
    dunsNumber: '62-FA-26-0447',
    website: 'Kowalski Family Law, PLLC',
    industry: 'Civil — Custody Dispute / Family Court',
    country: 'United States',
    stateProvince: 'Ramsey County — 2nd Judicial District Court, St. Paul',
    primaryContactName: 'Atty. Diane Kowalski',
    primaryContactEmail: 'dkowalski@kowalskifamilylaw.com',
    primaryContactPhone: '651-555-0634',
    businessOwner: 'Atty. Laura Vanmerven',
    itOwner: 'Paralegal Maria Santos',
    annualSpend: 18000,
    status: 'ACTIVE',
  },
  {
    name: 'Chen v. Apex Properties LLC',
    legalName: 'Linda Chen (represented by VLF)',
    dunsNumber: '27-CV-26-1592',
    website: 'Haines & Associates Defense Group',
    industry: 'Civil — Personal Injury / Slip and Fall',
    country: 'United States',
    stateProvince: 'Hennepin County — 4th Judicial District Court, Minneapolis',
    primaryContactName: 'Atty. Robert Haines',
    primaryContactEmail: 'rhaines@hainesdefense.com',
    primaryContactPhone: '612-555-0747',
    businessOwner: 'Atty. David Park',
    itOwner: 'Paralegal Jason Lee',
    annualSpend: 12000,
    status: 'ASSIGNED',
  },
  {
    name: 'Banks Estate',
    legalName: 'In Re: The Estate of Harold J. Banks, Deceased',
    dunsNumber: '19-PR-26-0088',
    website: 'Owens Estate Planning, PA',
    industry: 'Probate — Estate Administration',
    country: 'United States',
    stateProvince: 'Dakota County — 1st Judicial District Court, Hastings',
    primaryContactName: 'Atty. Patricia Owens (co-counsel)',
    primaryContactEmail: 'powens@owensestate.com',
    primaryContactPhone: '651-555-0853',
    businessOwner: 'Atty. Laura Vanmerven',
    itOwner: 'Paralegal Maria Santos',
    annualSpend: 15000,
    status: 'NEW',
  },
  {
    name: 'State v. Tyrone Jackson',
    legalName: 'Tyrone Darnell Jackson',
    dunsNumber: '27-CR-26-3011',
    website: 'Hennepin County Attorney\'s Office',
    industry: 'Criminal — Domestic Assault',
    country: 'United States',
    stateProvince: 'Hennepin County — 4th Judicial District Court, Minneapolis',
    primaryContactName: 'ADA Patricia Holloway',
    primaryContactEmail: 'p.holloway@hennepin.courts.mn.gov',
    primaryContactPhone: '612-555-0961',
    businessOwner: 'Atty. James Vanmerven',
    itOwner: 'Atty. Sarah Chen',
    annualSpend: 22000,
    status: 'ACCEPTED',
  },
  {
    name: 'Peterson v. MN DOT',
    legalName: 'David Peterson (represented by VLF)',
    dunsNumber: '62-CV-26-0712',
    website: 'Minnesota Attorney General\'s Office',
    industry: 'Civil — Wrongful Termination',
    country: 'United States',
    stateProvince: 'Ramsey County — 2nd Judicial District Court, St. Paul',
    primaryContactName: 'AAG Robert Finch',
    primaryContactEmail: 'r.finch@ag.state.mn.us',
    primaryContactPhone: '651-555-0301',
    businessOwner: 'Atty. David Park',
    itOwner: 'Paralegal Jason Lee',
    annualSpend: 30000,
    status: 'NEW',
  },
  {
    name: 'State v. Angela Foster',
    legalName: 'Angela Marie Foster',
    dunsNumber: '62-CR-26-1455',
    website: 'Ramsey County Attorney\'s Office',
    industry: 'Criminal — Fraud / Identity Theft',
    country: 'United States',
    stateProvince: 'Ramsey County — 2nd Judicial District Court, St. Paul',
    primaryContactName: 'ADA Kevin Marsh',
    primaryContactEmail: 'k.marsh@ramsey.courts.mn.gov',
    primaryContactPhone: '651-555-0401',
    businessOwner: 'Atty. Laura Vanmerven',
    itOwner: 'Atty. Michael Torres',
    annualSpend: 38000,
    status: 'ASSIGNED',
  },
  {
    name: 'Olson v. Olson',
    legalName: 'Jennifer Olson (represented by VLF)',
    dunsNumber: '70-FA-25-1893',
    website: 'Whitfield & Brandt Family Law',
    industry: 'Civil — Divorce / Property Division',
    country: 'United States',
    stateProvince: 'Scott County — 1st Judicial District Court, Shakopee',
    primaryContactName: 'Atty. Nancy Whitfield',
    primaryContactEmail: 'n.whitfield@whitfieldbrandt.com',
    primaryContactPhone: '952-555-0501',
    businessOwner: 'Atty. Laura Vanmerven',
    itOwner: 'Paralegal Maria Santos',
    annualSpend: 14000,
    status: 'CLOSED',
  },
  {
    name: 'State v. Brian Kowalski',
    legalName: 'Brian Thomas Kowalski',
    dunsNumber: '19-CR-26-0677',
    website: 'Dakota County Attorney\'s Office',
    industry: 'Criminal — Assault (3rd Degree)',
    country: 'United States',
    stateProvince: 'Dakota County — 1st Judicial District Court, Hastings',
    primaryContactName: 'ADA Monica Reeves',
    primaryContactEmail: 'm.reeves@dakota.courts.mn.gov',
    primaryContactPhone: '651-555-0601',
    businessOwner: 'Atty. James Vanmerven',
    itOwner: 'Atty. David Park',
    annualSpend: 20000,
    status: 'CLOSED',
  },
]

// ============================================
// Client profiles by case
// ============================================

interface ClientProfileSeed {
  clientName: string
  priorityTier: string
  overallReviewScore: number
  hasPiiAccess: boolean
  hasPhiAccess: boolean
  hasPciAccess: boolean
  businessCriticality: string
  assessmentFrequency: string
  dataTypesAccessed: string[]
}

const CLIENT_PROFILES: ClientProfileSeed[] = [
  {
    clientName: 'State v. Marcus Thompson',
    priorityTier: 'CRITICAL',
    overallReviewScore: 82,
    hasPiiAccess: true,
    hasPhiAccess: true,
    hasPciAccess: false,
    businessCriticality: 'MISSION_CRITICAL',
    assessmentFrequency: 'WEEKLY',
    dataTypesAccessed: ['Police Reports', 'Breathalyzer Calibration Records', 'Prior Conviction Records', 'Medical Records (BAC)', 'DMV Records'],
  },
  {
    clientName: 'State v. Deshawn Williams',
    priorityTier: 'HIGH',
    overallReviewScore: 68,
    hasPiiAccess: true,
    hasPhiAccess: false,
    hasPciAccess: false,
    businessCriticality: 'BUSINESS_CRITICAL',
    assessmentFrequency: 'BIWEEKLY',
    dataTypesAccessed: ['Arrest Records', 'Surveillance Footage Transcripts', 'Witness Statements', 'Vehicle Registration Records', 'Fingerprint Analysis'],
  },
  {
    clientName: 'State v. Karen Mitchell',
    priorityTier: 'HIGH',
    overallReviewScore: 71,
    hasPiiAccess: true,
    hasPhiAccess: false,
    hasPciAccess: true,
    businessCriticality: 'BUSINESS_CRITICAL',
    assessmentFrequency: 'BIWEEKLY',
    dataTypesAccessed: ['Financial Audit Reports', 'Bank Records', 'Employment Records', 'Tax Returns', 'Corporate Filings', 'Email Correspondence'],
  },
  {
    clientName: 'State v. Roberto Alvarez',
    priorityTier: 'CRITICAL',
    overallReviewScore: 88,
    hasPiiAccess: true,
    hasPhiAccess: false,
    hasPciAccess: false,
    businessCriticality: 'MISSION_CRITICAL',
    assessmentFrequency: 'WEEKLY',
    dataTypesAccessed: ['Search Warrants', 'Lab Analysis Reports', 'Chain of Custody Logs', 'Confidential Informant Records', 'Surveillance Reports'],
  },
  {
    clientName: 'Martinez v. Martinez',
    priorityTier: 'MEDIUM',
    overallReviewScore: 45,
    hasPiiAccess: true,
    hasPhiAccess: true,
    hasPciAccess: true,
    businessCriticality: 'IMPORTANT',
    assessmentFrequency: 'MONTHLY',
    dataTypesAccessed: ['Custody Evaluation Reports', 'Financial Disclosures', 'School Records', 'Medical Records (Minor Children)', 'Parenting Plans'],
  },
  {
    clientName: 'Chen v. Apex Properties LLC',
    priorityTier: 'LOW',
    overallReviewScore: 28,
    hasPiiAccess: true,
    hasPhiAccess: true,
    hasPciAccess: false,
    businessCriticality: 'STANDARD',
    assessmentFrequency: 'QUARTERLY',
    dataTypesAccessed: ['Incident Reports', 'Medical Records', 'Property Inspection Reports', 'Insurance Claims', 'Witness Statements'],
  },
  {
    clientName: 'Banks Estate',
    priorityTier: 'MEDIUM',
    overallReviewScore: 40,
    hasPiiAccess: true,
    hasPhiAccess: true,
    hasPciAccess: true,
    businessCriticality: 'IMPORTANT',
    assessmentFrequency: 'MONTHLY',
    dataTypesAccessed: ['Will and Testament', 'Asset Inventory', 'Beneficiary Documentation', 'Tax Records', 'Real Property Deeds', 'Bank Statements'],
  },
  {
    clientName: 'State v. Tyrone Jackson',
    priorityTier: 'HIGH',
    overallReviewScore: 58,
    hasPiiAccess: true,
    hasPhiAccess: false,
    hasPciAccess: false,
    businessCriticality: 'BUSINESS_CRITICAL',
    assessmentFrequency: 'BIWEEKLY',
    dataTypesAccessed: ['Criminal Records', 'Police Reports', 'Medical Records', 'Witness Statements', 'Protective Orders'],
  },
  {
    clientName: 'Peterson v. MN DOT',
    priorityTier: 'MEDIUM',
    overallReviewScore: 42,
    hasPiiAccess: true,
    hasPhiAccess: false,
    hasPciAccess: false,
    businessCriticality: 'IMPORTANT',
    assessmentFrequency: 'MONTHLY',
    dataTypesAccessed: ['Employment Records', 'Personnel Files', 'Performance Reviews', 'Termination Documentation', 'Government Agency Records'],
  },
  {
    clientName: 'State v. Angela Foster',
    priorityTier: 'HIGH',
    overallReviewScore: 65,
    hasPiiAccess: true,
    hasPhiAccess: false,
    hasPciAccess: true,
    businessCriticality: 'BUSINESS_CRITICAL',
    assessmentFrequency: 'BIWEEKLY',
    dataTypesAccessed: ['Financial Records', 'Bank Records', 'Identity Theft Reports', 'Credit Bureau Records', 'Digital Forensics Reports'],
  },
  {
    clientName: 'Olson v. Olson',
    priorityTier: 'LOW',
    overallReviewScore: 20,
    hasPiiAccess: true,
    hasPhiAccess: false,
    hasPciAccess: true,
    businessCriticality: 'STANDARD',
    assessmentFrequency: 'QUARTERLY',
    dataTypesAccessed: ['Financial Disclosures', 'Property Records', 'Tax Returns', 'Marital Asset Inventory'],
  },
  {
    clientName: 'State v. Brian Kowalski',
    priorityTier: 'MEDIUM',
    overallReviewScore: 35,
    hasPiiAccess: true,
    hasPhiAccess: true,
    hasPciAccess: false,
    businessCriticality: 'STANDARD',
    assessmentFrequency: 'MONTHLY',
    dataTypesAccessed: ['Criminal Records', 'Police Reports', 'Medical Records', 'Witness Statements'],
  },
]

// ============================================
// Sample legal documents
// ============================================

interface DocSeed {
  clientName: string
  documentType: string
  documentName: string
  status: string
  retrievedBy: string
  expiresInDays: number | null
  analysisResult: string | null
}

const DOCUMENTS: DocSeed[] = [
  // Marcus Thompson - DUI
  { clientName: 'State v. Marcus Thompson', documentType: 'POLICE_REPORT', documentName: 'Thompson DUI Police Report — Officer Daniels', status: 'ANALYZED', retrievedBy: 'DORA', expiresInDays: null, analysisResult: 'Report documents traffic stop at 11:47 PM on County Rd 42. Field sobriety tests administered. Probable cause established based on erratic driving and odor of alcohol.' },
  { clientName: 'State v. Marcus Thompson', documentType: 'EXPERT_REPORT', documentName: 'Breathalyzer Calibration Report — Intoxilyzer 9000', status: 'ANALYZED', retrievedBy: 'DORA', expiresInDays: 30, analysisResult: 'Calibration certificate shows last calibration 97 days before arrest. State protocol requires 90-day recalibration. Potential admissibility challenge identified.' },
  { clientName: 'State v. Marcus Thompson', documentType: 'COURT_FILING', documentName: 'Thompson Prior Conviction Records — 2023 DUI', status: 'ANALYZED', retrievedBy: 'DORA', expiresInDays: null, analysisResult: '2023 conviction in Dakota County. Sentenced to 90 days (stayed), 2 years probation. Probation completed. Enhances current charge to gross misdemeanor.' },

  // Deshawn Williams - GTA
  { clientName: 'State v. Deshawn Williams', documentType: 'ARREST_RECORD', documentName: 'Williams Arrest Record — Case No. 27-CR-26-1847', status: 'ANALYZED', retrievedBy: 'DORA', expiresInDays: null, analysisResult: 'Arrested 2026-02-14 at 0230 hours. Vehicle recovered at 0315 hours, 4.2 miles from reported theft location. Client found sleeping in vehicle.' },
  { clientName: 'State v. Deshawn Williams', documentType: 'WITNESS_STATEMENT', documentName: 'Witness Statement — Maria Gonzalez (Vehicle Owner)', status: 'ANALYZED', retrievedBy: 'DORA', expiresInDays: null, analysisResult: 'Owner states vehicle was parked and locked at 2200 hours. Noticed missing at 0145 hours. No forced entry reported by responding officers — possible key duplication issue.' },
  { clientName: 'State v. Deshawn Williams', documentType: 'DISCOVERY_MATERIALS', documentName: 'Surveillance Footage Transcript — QuikMart Parking Lot', status: 'RECEIVED', retrievedBy: 'DORA', expiresInDays: 45, analysisResult: null },

  // Karen Mitchell - Embezzlement
  { clientName: 'State v. Karen Mitchell', documentType: 'EXPERT_REPORT', documentName: 'Forensic Accounting Audit — Northland Credit Union', status: 'ANALYZED', retrievedBy: 'DORA', expiresInDays: null, analysisResult: 'Audit identifies $347,000 in diverted funds over 28 months. Pattern of small wire transfers ($3,000-$12,000) to three shell accounts. Some transactions predate the charging period.' },
  { clientName: 'State v. Karen Mitchell', documentType: 'FINANCIAL_DISCLOSURE', documentName: 'Bank Records Subpoena Response — Wells Fargo', status: 'ANALYZED', retrievedBy: 'DORA', expiresInDays: null, analysisResult: 'Account statements show deposits inconsistent with reported income. Three accounts linked to Mitchell. Defense: joint account with spouse may explain some deposits.' },
  { clientName: 'State v. Karen Mitchell', documentType: 'DISCOVERY_MATERIALS', documentName: 'Employment Records — Northland Credit Union HR File', status: 'PENDING', retrievedBy: 'DORA', expiresInDays: 20, analysisResult: null },

  // Roberto Alvarez - Drug Possession
  { clientName: 'State v. Roberto Alvarez', documentType: 'COURT_FILING', documentName: 'Search Warrant — 1847 Lyndale Ave S', status: 'ANALYZED', retrievedBy: 'DORA', expiresInDays: null, analysisResult: 'Warrant authorized search of residence and vehicles. Scope limited to "narcotics, paraphernalia, and records of drug transactions." Officers also searched detached garage — scope question flagged.' },
  { clientName: 'State v. Roberto Alvarez', documentType: 'EXPERT_REPORT', documentName: 'BCA Lab Analysis Report — Controlled Substance', status: 'ANALYZED', retrievedBy: 'DORA', expiresInDays: null, analysisResult: 'Analysis confirms methamphetamine, 42.3 grams. Weight meets threshold for presumption of intent to distribute under Minn. Stat. 152.022. Lab tech certification status needs verification.' },
  { clientName: 'State v. Roberto Alvarez', documentType: 'DISCOVERY_MATERIALS', documentName: 'Chain of Custody Documentation — Evidence Items 1-14', status: 'ANALYZED', retrievedBy: 'DORA', expiresInDays: 60, analysisResult: 'Chain of custody log shows 6-hour gap between evidence collection and booking. Transport officer signature missing on transfer form. Defense motion potential.' },

  // Martinez v. Martinez - Custody
  { clientName: 'Martinez v. Martinez', documentType: 'CUSTODY_EVALUATION', documentName: 'Custody Evaluation Report — Dr. Angela Reeves', status: 'ANALYZED', retrievedBy: 'DORA', expiresInDays: null, analysisResult: 'Evaluator recommends joint legal custody with primary physical custody to mother. Father granted standard parenting time. Notes concern about incomplete home study for father\'s new residence.' },
  { clientName: 'Martinez v. Martinez', documentType: 'FINANCIAL_DISCLOSURE', documentName: 'Financial Disclosure — Carlos Martinez', status: 'ANALYZED', retrievedBy: 'DORA', expiresInDays: null, analysisResult: 'Disclosed income of $78,000/year. Discrepancy noted between tax returns and pay stubs for months of July-September. Possible unreported freelance income.' },
  { clientName: 'Martinez v. Martinez', documentType: 'MOTION', documentName: 'Proposed Parenting Plan — Elena Martinez', status: 'RECEIVED', retrievedBy: 'DORA', expiresInDays: 90, analysisResult: null },

  // Chen v. Apex Properties - Personal Injury
  { clientName: 'Chen v. Apex Properties LLC', documentType: 'INCIDENT_REPORT', documentName: 'Incident Report — Apex Mall Slip and Fall', status: 'ANALYZED', retrievedBy: 'DORA', expiresInDays: null, analysisResult: 'Report filed 45 minutes after incident. Notes wet floor near entrance with no signage. Maintenance log shows last inspection 4 hours prior. Two witnesses identified.' },
  { clientName: 'Chen v. Apex Properties LLC', documentType: 'MEDICAL_RECORDS', documentName: 'Medical Records — Hennepin Healthcare ER Visit', status: 'RECEIVED', retrievedBy: 'DORA', expiresInDays: 30, analysisResult: null },
  { clientName: 'Chen v. Apex Properties LLC', documentType: 'EXPERT_REPORT', documentName: 'Property Inspection Report — SafeWalk Consulting', status: 'ANALYZED', retrievedBy: 'DORA', expiresInDays: null, analysisResult: 'Inspector found drainage deficiency at main entrance. Floor material rated below acceptable slip resistance when wet. Three prior incident reports at same location in past 18 months.' },

  // Banks Estate - Probate
  { clientName: 'Banks Estate', documentType: 'CONTRACT', documentName: 'Last Will and Testament — Harold J. Banks', status: 'ANALYZED', retrievedBy: 'DORA', expiresInDays: null, analysisResult: 'Will executed 2019-03-15, witnessed by two individuals. Leaves 60% of estate to daughter Margaret Banks, 30% to son David Banks, 10% to Hennepin County Humane Society. Codicil from 2022 modifies distribution.' },
  { clientName: 'Banks Estate', documentType: 'FINANCIAL_DISCLOSURE', documentName: 'Asset Inventory — Banks Estate', status: 'ANALYZED', retrievedBy: 'DORA', expiresInDays: 180, analysisResult: 'Total estimated estate value: $2.1M. Includes residence ($680K), investment accounts ($890K), life insurance ($350K), personal property ($180K). Potential tax implications require review.' },
  { clientName: 'Banks Estate', documentType: 'OTHER', documentName: 'Beneficiary Designation Disputes — Insurance & IRA', status: 'PENDING', retrievedBy: 'DORA', expiresInDays: 150, analysisResult: null },

  // Motion documents
  { clientName: 'State v. Marcus Thompson', documentType: 'MOTION_TO_SUPPRESS', documentName: 'Motion to Suppress — Breathalyzer Results', status: 'PENDING', retrievedBy: 'DORA', expiresInDays: 12, analysisResult: null },
  { clientName: 'State v. Roberto Alvarez', documentType: 'MOTION_TO_SUPPRESS', documentName: 'Motion to Suppress — Garage Search Evidence', status: 'PENDING', retrievedBy: 'DORA', expiresInDays: 18, analysisResult: null },
  { clientName: 'State v. Karen Mitchell', documentType: 'MOTION_TO_DISMISS', documentName: 'Motion to Dismiss — Counts 4, 7, 11 (Statute of Limitations)', status: 'RECEIVED', retrievedBy: 'DORA', expiresInDays: 8, analysisResult: null },
  { clientName: 'State v. Deshawn Williams', documentType: 'MOTION_TO_DISMISS', documentName: 'Motion to Dismiss — Insufficient Evidence', status: 'PENDING', retrievedBy: 'DORA', expiresInDays: 25, analysisResult: null },
  { clientName: 'Martinez v. Martinez', documentType: 'MOTION_FOR_CONTINUANCE', documentName: 'Motion for Continuance — Custody Hearing', status: 'RECEIVED', retrievedBy: 'DORA', expiresInDays: 15, analysisResult: null },
  { clientName: 'State v. Roberto Alvarez', documentType: 'MOTION_IN_LIMINE', documentName: 'Motion in Limine — Exclude Prior Bad Acts', status: 'PENDING', retrievedBy: 'DORA', expiresInDays: 30, analysisResult: null },

  // Documents for additional clients
  { clientName: 'State v. Tyrone Jackson', documentType: 'POLICE_REPORT', documentName: 'Jackson Domestic Assault Police Report — Officer Nguyen', status: 'RECEIVED', retrievedBy: 'DORA', expiresInDays: null, analysisResult: null },
  { clientName: 'State v. Tyrone Jackson', documentType: 'WITNESS_STATEMENT', documentName: 'Victim Statement — Confidential', status: 'RECEIVED', retrievedBy: 'DORA', expiresInDays: null, analysisResult: null },
  { clientName: 'Peterson v. MN DOT', documentType: 'DISCOVERY_MATERIALS', documentName: 'Employment Records — MN DOT Human Resources', status: 'PENDING', retrievedBy: 'DORA', expiresInDays: 30, analysisResult: null },
  { clientName: 'Peterson v. MN DOT', documentType: 'DISCOVERY_MATERIALS', documentName: 'Termination Letter and Disciplinary File — David Peterson', status: 'PENDING', retrievedBy: 'DORA', expiresInDays: 30, analysisResult: null },
  { clientName: 'State v. Angela Foster', documentType: 'FINANCIAL_DISCLOSURE', documentName: 'Bank Records Subpoena Response — US Bank', status: 'RECEIVED', retrievedBy: 'DORA', expiresInDays: null, analysisResult: null },
  { clientName: 'State v. Angela Foster', documentType: 'POLICE_REPORT', documentName: 'Identity Theft Report — Minneapolis PD Case #26-4891', status: 'RECEIVED', retrievedBy: 'DORA', expiresInDays: null, analysisResult: null },
]

// ============================================
// Sample case reviews
// ============================================

interface CaseReviewSeed {
  clientName: string
  assessmentType: string
  assessmentStatus: string
  reviewRating: string | null
  overallReviewScore: number | null
  assessedBy: string | null
  summary: string | null
  daysAgo: number
}

const CASE_REVIEWS: CaseReviewSeed[] = [
  { clientName: 'State v. Marcus Thompson', assessmentType: 'PRETRIAL', assessmentStatus: 'COMPLETE', reviewRating: 'HIGH', overallReviewScore: 72, assessedBy: 'CLARA', summary: 'Defense strength is moderate. Breathalyzer calibration issue provides a viable suppression argument. Prior conviction complicates sentencing but does not affect admissibility challenge. Recommend aggressive pretrial motions strategy targeting equipment maintenance records.', daysAgo: 14 },
  { clientName: 'State v. Deshawn Williams', assessmentType: 'INITIAL', assessmentStatus: 'COMPLETE', reviewRating: 'MEDIUM', overallReviewScore: 58, assessedBy: 'CLARA', summary: 'Circumstantial case — no direct evidence of vehicle theft by client. Found sleeping in vehicle could support alternative narratives (permission, confusion). Surveillance footage gap weakens prosecution timeline. Witness credibility strong but statement has inconsistencies on timing.', daysAgo: 30 },
  { clientName: 'State v. Karen Mitchell', assessmentType: 'INITIAL', assessmentStatus: 'IN_PROGRESS', reviewRating: null, overallReviewScore: null, assessedBy: 'CLARA', summary: 'Assessment in progress. Forensic accounting report under detailed review. Key defense angle: some transactions predate the charged period, and joint account with spouse complicates attribution. Statute of limitations analysis critical for 3 of 12 counts.', daysAgo: 10 },
  { clientName: 'State v. Roberto Alvarez', assessmentType: 'PRETRIAL', assessmentStatus: 'COMPLETE', reviewRating: 'HIGH', overallReviewScore: 78, assessedBy: 'CLARA', summary: 'Strong defense potential on constitutional grounds. Search warrant scope likely exceeded when officers searched detached garage. Chain of custody gap and lab tech certification lapse provide additional suppression arguments. If evidence suppressed, case significantly weakened.', daysAgo: 7 },
  { clientName: 'Martinez v. Martinez', assessmentType: 'INITIAL', assessmentStatus: 'COMPLETE', reviewRating: 'MEDIUM', overallReviewScore: 50, assessedBy: 'CLARA', summary: 'Custody evaluator\'s recommendation favors our client (mother). Father\'s financial disclosure inconsistencies strengthen child support argument. Incomplete home study for father\'s new residence is a vulnerability for opposing side. Settlement negotiations recommended before trial.', daysAgo: 21 },
  { clientName: 'Chen v. Apex Properties LLC', assessmentType: 'SETTLEMENT', assessmentStatus: 'COMPLETE', reviewRating: 'LOW', overallReviewScore: 35, assessedBy: 'CLARA', summary: 'Strong plaintiff case. Property inspection confirms negligence — inadequate drainage, substandard flooring, and three prior incidents at same location establish pattern. Medical records support claimed injuries. Recommend demand letter at $175K with settlement target of $120K-$140K.', daysAgo: 15 },
  { clientName: 'Banks Estate', assessmentType: 'INITIAL', assessmentStatus: 'PENDING_REVIEW', reviewRating: 'MEDIUM', overallReviewScore: 42, assessedBy: 'CLARA', summary: 'Estate administration proceeding with minor complications. Codicil from 2022 modifies original will distribution and may be contested by son David Banks. Beneficiary designations on insurance and IRA conflict with will provisions — requires careful analysis of non-probate assets.', daysAgo: 5 },
  { clientName: 'State v. Marcus Thompson', assessmentType: 'TRIGGERED', assessmentStatus: 'COMPLETE', reviewRating: 'HIGH', overallReviewScore: 75, assessedBy: 'CLARA', summary: 'Triggered by discovery of additional calibration records. State crime lab provided maintenance logs showing pattern of delayed recalibration across multiple Intoxilyzer units in Hennepin County. May support systemic challenge beyond individual case.', daysAgo: 3 },
]

// ============================================
// Sample legal issues
// ============================================

interface IssueSeed {
  clientName: string
  title: string
  description: string
  severity: string
  findingCategory: string
  snbrRiskMapping: string
  status: string
  identifiedBy: string
  daysAgo: number
  dueDays: number
  recommendation: string
}

const ISSUES: IssueSeed[] = [
  // Thompson DUI issues
  {
    clientName: 'State v. Marcus Thompson',
    title: 'Breathalyzer calibration expired at time of arrest',
    description: 'The Intoxilyzer 9000 used for Thompson\'s BAC test was last calibrated 97 days before the arrest. Minnesota Bureau of Criminal Apprehension protocol mandates recalibration every 90 days. Results obtained after calibration lapse are subject to suppression under State v. Underdahl.',
    severity: 'CRITICAL',
    findingCategory: 'EVIDENCE_ISSUE',
    snbrRiskMapping: 'EVIDENCE_ISSUE',
    status: 'IN_REMEDIATION',
    identifiedBy: 'ARIA',
    daysAgo: 14,
    dueDays: 14,
    recommendation: 'File motion to suppress breathalyzer results. Subpoena full calibration history for this unit and all units at the testing facility. Engage expert witness on breathalyzer reliability.',
  },
  {
    clientName: 'State v. Marcus Thompson',
    title: 'Miranda rights timing questionable during field stop',
    description: 'Police report timeline indicates questioning began at 11:52 PM but Miranda warning was not administered until 12:18 AM — 26 minutes into the encounter. Officer\'s report describes "conversational questions" during this period that may constitute custodial interrogation.',
    severity: 'HIGH',
    findingCategory: 'CONSTITUTIONAL_RIGHTS',
    snbrRiskMapping: 'CONSTITUTIONAL_RIGHTS',
    status: 'OPEN',
    identifiedBy: 'ARIA',
    daysAgo: 14,
    dueDays: 21,
    recommendation: 'Analyze statements made during the 26-minute gap. File motion to suppress any incriminating statements made before Miranda warning. Research whether traffic stop had evolved into custodial detention.',
  },

  // Williams GTA issues
  {
    clientName: 'State v. Deshawn Williams',
    title: 'Surveillance footage chain of custody gap',
    description: 'QuikMart surveillance footage was retrieved by Officer Patel on 2026-02-15 but was not logged into evidence until 2026-02-17 — a 48-hour gap. No documentation of where the footage was stored during this period. Original DVR was not preserved.',
    severity: 'HIGH',
    findingCategory: 'EVIDENCE_ISSUE',
    snbrRiskMapping: 'EVIDENCE_ISSUE',
    status: 'OPEN',
    identifiedBy: 'ARIA',
    daysAgo: 28,
    dueDays: 30,
    recommendation: 'Challenge authenticity of surveillance footage. Request chain of custody hearing. Determine if original DVR recording was overwritten — if so, potential spoliation argument.',
  },
  {
    clientName: 'State v. Deshawn Williams',
    title: 'Witness statement contains timing inconsistencies',
    description: 'Vehicle owner Maria Gonzalez states she last saw the vehicle at 10:00 PM and noticed it missing at 1:45 AM. However, her cell phone records (obtained via subpoena) show she made a call from a location 30 miles away at 9:15 PM, contradicting her claimed timeline.',
    severity: 'MEDIUM',
    findingCategory: 'WITNESS_CREDIBILITY',
    snbrRiskMapping: 'WITNESS_CREDIBILITY',
    status: 'IN_REMEDIATION',
    identifiedBy: 'ARIA',
    daysAgo: 20,
    dueDays: 45,
    recommendation: 'Prepare impeachment materials based on cell phone records. Investigate whether vehicle may have been lent or whether keys were accessible to others. Depose witness regarding timeline discrepancies.',
  },

  // Mitchell embezzlement issues
  {
    clientName: 'State v. Karen Mitchell',
    title: 'Statute of limitations approaching on 3 counts',
    description: 'Three of the twelve embezzlement counts involve transactions from Q1 2020. Under Minn. Stat. 628.26, the statute of limitations for theft offenses over $35,000 is 6 years. These counts must be charged by March 31, 2026, or they are time-barred.',
    severity: 'CRITICAL',
    findingCategory: 'STATUTE_OF_LIMITATIONS',
    snbrRiskMapping: 'STATUTE_OF_LIMITATIONS',
    status: 'OPEN',
    identifiedBy: 'ARIA',
    daysAgo: 10,
    dueDays: 7,
    recommendation: 'Immediately verify exact transaction dates against charging documents. If prosecution has not timely filed, prepare motion to dismiss the 3 affected counts. Calendar all remaining SOL deadlines.',
  },
  {
    clientName: 'State v. Karen Mitchell',
    title: 'Joint account complicates fund attribution',
    description: 'Several of the allegedly diverted deposits went into a joint checking account held with spouse Thomas Mitchell. Prosecution must prove Karen Mitchell, not her spouse, directed the transfers. Joint account holder defense may apply to at least 4 transactions totaling $48,000.',
    severity: 'MEDIUM',
    findingCategory: 'EVIDENCE_ISSUE',
    snbrRiskMapping: 'EVIDENCE_ISSUE',
    status: 'OPEN',
    identifiedBy: 'ARIA',
    daysAgo: 10,
    dueDays: 30,
    recommendation: 'Obtain detailed account access logs from the bank. Determine which account holder initiated each transfer. Interview Thomas Mitchell regarding his knowledge of and access to the joint account.',
  },

  // Alvarez drug possession issues
  {
    clientName: 'State v. Roberto Alvarez',
    title: 'Search warrant scope potentially exceeded',
    description: 'The search warrant authorized search of "the residence at 1847 Lyndale Ave S and vehicles thereon." Officers also searched the detached garage, which is a separate structure 40 feet from the main residence. Key evidence (digital scale, packaging materials) was recovered from the garage. Under State v. Kinkead, a detached structure may require separate authorization.',
    severity: 'CRITICAL',
    findingCategory: 'CONSTITUTIONAL_RIGHTS',
    snbrRiskMapping: 'CONSTITUTIONAL_RIGHTS',
    status: 'IN_REMEDIATION',
    identifiedBy: 'ARIA',
    daysAgo: 7,
    dueDays: 14,
    recommendation: 'File motion to suppress evidence from detached garage. Research whether "curtilage" argument applies. If garage evidence is suppressed, remaining evidence may not support intent-to-distribute charge — possible reduction to simple possession.',
  },
  {
    clientName: 'State v. Roberto Alvarez',
    title: 'Lab technician certification lapsed during analysis',
    description: 'BCA Lab Technician Jennifer Walsh performed the controlled substance analysis on 2026-03-05. Her forensic chemist certification expired on 2026-02-28 — seven days before the analysis. Certification was renewed on 2026-03-12. Analysis was performed during the lapse period.',
    severity: 'HIGH',
    findingCategory: 'EVIDENCE_ISSUE',
    snbrRiskMapping: 'EVIDENCE_ISSUE',
    status: 'OPEN',
    identifiedBy: 'ARIA',
    daysAgo: 7,
    dueDays: 21,
    recommendation: 'Challenge lab results based on analyst certification status. Request independent reanalysis of controlled substance. Subpoena BCA lab certification records and quality assurance protocols.',
  },

  // Martinez custody issues
  {
    clientName: 'Martinez v. Martinez',
    title: 'Home study report incomplete for father\'s residence',
    description: 'The custody evaluator noted that the home study for Carlos Martinez\'s new residence was incomplete because the visit was conducted before furniture and child safety equipment were installed. The report recommends a follow-up visit that has not yet been scheduled.',
    severity: 'MEDIUM',
    findingCategory: 'DOCUMENTATION_GAP',
    snbrRiskMapping: 'DOCUMENTATION_GAP',
    status: 'OPEN',
    identifiedBy: 'ARIA',
    daysAgo: 21,
    dueDays: 30,
    recommendation: 'Request the court order a follow-up home study before any custody modification hearing. Document the incomplete evaluation in our trial brief as evidence of father\'s unpreparedness for primary custody.',
  },

  // Chen personal injury issues
  {
    clientName: 'Chen v. Apex Properties LLC',
    title: 'Medical records release incomplete',
    description: 'Hennepin Healthcare provided ER records but physical therapy records from weeks 2-8 post-injury have not been produced. The treatment notes are critical for establishing the full extent of injuries and connecting them to the slip and fall incident.',
    severity: 'MEDIUM',
    findingCategory: 'DISCOVERY_DEFICIENCY',
    snbrRiskMapping: 'DISCOVERY_DEFICIENCY',
    status: 'IN_REMEDIATION',
    identifiedBy: 'ARIA',
    daysAgo: 15,
    dueDays: 30,
    recommendation: 'Send supplemental records request to Hennepin Healthcare physical therapy department. If not produced within 14 days, file motion to compel. Obtain patient authorization for direct provider contact.',
  },

  // Banks Estate issues
  {
    clientName: 'Banks Estate',
    title: 'Contested beneficiary claims on non-probate assets',
    description: 'The 2022 codicil redirects 10% of the estate from son David Banks to granddaughter Sophie Banks. David Banks has indicated through counsel that he intends to contest the codicil, claiming undue influence by Margaret Banks. Additionally, IRA and life insurance beneficiary designations name David as primary beneficiary, conflicting with the will.',
    severity: 'MEDIUM',
    findingCategory: 'DOCUMENTATION_GAP',
    snbrRiskMapping: 'DOCUMENTATION_GAP',
    status: 'OPEN',
    identifiedBy: 'ARIA',
    daysAgo: 5,
    dueDays: 60,
    recommendation: 'Gather evidence of Harold Banks\' mental capacity at time of codicil execution. Obtain testimony from codicil witnesses. Research Minnesota law on non-probate asset conflicts with will provisions. Prepare for potential will contest litigation.',
  },
]

// ============================================
// Sample legal reports
// ============================================

interface ReportSeed {
  clientName: string | null
  reportType: string
  reportName: string
  status: string
  daysAgo: number
}

const REPORTS: ReportSeed[] = [
  { clientName: 'State v. Marcus Thompson', reportType: 'DETAILED_ASSESSMENT', reportName: 'Thompson DUI Defense Strategy Report', status: 'APPROVED', daysAgo: 12 },
  { clientName: 'State v. Roberto Alvarez', reportType: 'DETAILED_ASSESSMENT', reportName: 'Alvarez Suppression Motion Analysis', status: 'GENERATED', daysAgo: 5 },
  { clientName: 'Chen v. Apex Properties LLC', reportType: 'DETAILED_ASSESSMENT', reportName: 'Chen v. Apex Settlement Demand Analysis', status: 'APPROVED', daysAgo: 10 },
  { clientName: 'State v. Karen Mitchell', reportType: 'DETAILED_ASSESSMENT', reportName: 'Mitchell Embezzlement Defense Strategy Report', status: 'GENERATED', daysAgo: 8 },
  { clientName: null, reportType: 'EXECUTIVE_SUMMARY', reportName: 'Q1 2026 Caseload Executive Summary', status: 'PUBLISHED', daysAgo: 7 },
  { clientName: null, reportType: 'PORTFOLIO_OVERVIEW', reportName: 'Active Caseload Overview — March 2026', status: 'GENERATED', daysAgo: 3 },
  { clientName: null, reportType: 'COMPLIANCE_STATUS', reportName: 'Q1 2026 Court Deadlines Compliance Report', status: 'PENDING_APPROVAL', daysAgo: 5 },
]

// ============================================
// Main Seed Function
// ============================================

async function main() {
  console.log('Seeding database...')

  // 1. Create all permissions
  const allResources = [...APP_RESOURCES, ...SYSTEM_RESOURCES]
  const permissionMap: Record<string, string> = {}

  for (const resource of allResources) {
    for (const action of ACTIONS) {
      const perm = await prisma.permission.upsert({
        where: { resource_action: { resource, action } },
        update: {},
        create: {
          resource,
          action,
          description: `${action.charAt(0).toUpperCase() + action.slice(1)} ${resource}`,
        },
      })
      permissionMap[`${resource}.${action}`] = perm.id
    }
  }
  console.log(`  ${Object.keys(permissionMap).length} permissions`)

  // 2. Create system roles with permission assignments
  const roleMap: Record<string, string> = {}

  for (const roleDef of SYSTEM_ROLES) {
    const role = await prisma.role.upsert({
      where: { name: roleDef.name },
      update: { description: roleDef.description },
      create: {
        name: roleDef.name,
        description: roleDef.description,
        isSystem: true,
      },
    })
    roleMap[roleDef.name] = role.id

    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } })

    const grantedPermIds: string[] = []
    for (const resource of allResources) {
      for (const action of ACTIONS) {
        if (roleDef.permissions(resource, action)) {
          grantedPermIds.push(permissionMap[`${resource}.${action}`])
        }
      }
    }

    await prisma.rolePermission.createMany({
      data: grantedPermIds.map((pid) => ({
        roleId: role.id,
        permissionId: pid,
      })),
    })

    console.log(`  Role ${roleDef.name}: ${grantedPermIds.length} permissions`)
  }

  // 3. Create seed users
  const userMap: Record<string, string> = {}
  for (const userDef of SEED_USERS) {
    const user = await prisma.user.upsert({
      where: { email: userDef.email },
      update: {
        name: userDef.name,
        oidcSubject: userDef.oidcSubject,
        roleId: roleMap[userDef.roleName],
      },
      create: {
        email: userDef.email,
        name: userDef.name,
        oidcSubject: userDef.oidcSubject,
        roleId: roleMap[userDef.roleName],
        department: userDef.department,
        lastLogin: new Date(),
      },
    })
    userMap[userDef.roleName] = user.id
    console.log(`  User: ${userDef.email} -> ${userDef.roleName} (${user.id})`)
  }

  // 4. Create clients
  const clientMap: Record<string, string> = {}

  for (const c of CLIENTS) {
    const client = await prisma.client.upsert({
      where: { id: c.name.toLowerCase().replace(/\s+/g, '-') },
      update: {},
      create: { ...c, annualSpend: c.annualSpend },
    })
    clientMap[c.name] = client.id
    console.log(`  Client: ${c.name}`)
  }

  // 5. Create client profiles
  for (const cp of CLIENT_PROFILES) {
    const clientId = clientMap[cp.clientName]
    if (!clientId) continue

    await prisma.clientProfile.create({
      data: {
        clientId,
        priorityTier: cp.priorityTier,
        overallReviewScore: cp.overallReviewScore,
        hasPiiAccess: cp.hasPiiAccess,
        hasPhiAccess: cp.hasPhiAccess,
        hasPciAccess: cp.hasPciAccess,
        businessCriticality: cp.businessCriticality,
        assessmentFrequency: cp.assessmentFrequency,
        dataTypesAccessed: JSON.stringify(cp.dataTypesAccessed),
        calculatedBy: 'LEXA',
        lastAssessmentDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        nextAssessmentDate: new Date(Date.now() + 335 * 24 * 60 * 60 * 1000),
      },
    })
    console.log(`  Client Profile: ${cp.clientName} -> ${cp.priorityTier}`)
  }

  // 6. Create documents
  for (const d of DOCUMENTS) {
    const clientId = clientMap[d.clientName]
    if (!clientId) continue

    await prisma.document.create({
      data: {
        clientId,
        documentType: d.documentType,
        documentName: d.documentName,
        status: d.status,
        retrievedBy: d.retrievedBy,
        source: 'Court Records / Discovery',
        isCurrent: true,
        expirationDate: d.expiresInDays
          ? new Date(Date.now() + d.expiresInDays * 24 * 60 * 60 * 1000)
          : null,
        analysisResult: d.analysisResult,
      },
    })
  }
  console.log(`  ${DOCUMENTS.length} documents`)

  // 7. Create case reviews
  const caseReviewMap: Record<string, string> = {}
  for (const cr of CASE_REVIEWS) {
    const clientId = clientMap[cr.clientName]
    if (!clientId) continue

    const caseReview = await prisma.caseReview.create({
      data: {
        clientId,
        assessmentType: cr.assessmentType,
        assessmentStatus: cr.assessmentStatus,
        reviewRating: cr.reviewRating,
        overallReviewScore: cr.overallReviewScore,
        assessedBy: cr.assessedBy,
        summary: cr.summary,
        assessmentDate: new Date(Date.now() - cr.daysAgo * 24 * 60 * 60 * 1000),
      },
    })
    const key = `${cr.clientName}-${cr.assessmentType}-${cr.daysAgo}`
    caseReviewMap[key] = caseReview.id
  }
  console.log(`  ${CASE_REVIEWS.length} case reviews`)

  // 8. Create issues
  const issueMap: Record<string, string> = {}
  const issueDetailMap: Record<string, string> = {}
  for (const iss of ISSUES) {
    const clientId = clientMap[iss.clientName]
    if (!clientId) continue

    const issue = await prisma.issue.create({
      data: {
        clientId,
        title: iss.title,
        description: iss.description,
        severity: iss.severity,
        findingCategory: iss.findingCategory,
        snbrRiskMapping: iss.snbrRiskMapping,
        status: iss.status,
        identifiedBy: iss.identifiedBy,
        identifiedDate: new Date(Date.now() - iss.daysAgo * 24 * 60 * 60 * 1000),
        dueDate: new Date(Date.now() + iss.dueDays * 24 * 60 * 60 * 1000),
        recommendation: iss.recommendation,
      },
    })
    if (!issueMap[iss.clientName]) {
      issueMap[iss.clientName] = issue.id
    }
    issueDetailMap[`${iss.clientName}:${iss.title}`] = issue.id
  }
  console.log(`  ${ISSUES.length} issues`)

  // 8b. Create action items
  const actionItemSeeds = [
    { issueTitle: 'Breathalyzer calibration expired at time of arrest', clientName: 'State v. Marcus Thompson', title: 'File motion to suppress breathalyzer results', actionType: 'REMEDIATE', priority: 'CRITICAL', status: 'IN_PROGRESS', dueDays: 10, assignedTo: 'Atty. James Vanmerven', ownerType: 'INTERNAL' },
    { issueTitle: 'Search warrant scope potentially exceeded', clientName: 'State v. Roberto Alvarez', title: 'Draft suppression motion for garage search', actionType: 'REMEDIATE', priority: 'CRITICAL', status: 'OPEN', dueDays: 14, assignedTo: 'Atty. James Vanmerven', ownerType: 'INTERNAL' },
    { issueTitle: 'Medical records release incomplete', clientName: 'Chen v. Apex Properties LLC', title: 'Send supplemental records request to PT department', actionType: 'REMEDIATE', priority: 'MEDIUM', status: 'IN_PROGRESS', dueDays: 25, assignedTo: 'Paralegal Jason Lee', ownerType: 'INTERNAL' },
    { issueTitle: 'Home study report incomplete for father\'s residence', clientName: 'Martinez v. Martinez', title: 'Schedule follow-up home study visit', actionType: 'REMEDIATE', priority: 'MEDIUM', status: 'OPEN', dueDays: 28, assignedTo: 'Paralegal Maria Santos', ownerType: 'INTERNAL' },
    { issueTitle: 'Statute of limitations approaching on 3 counts', clientName: 'State v. Karen Mitchell', title: 'File motion to dismiss time-barred counts', actionType: 'REMEDIATE', priority: 'HIGH', status: 'IN_PROGRESS', dueDays: 7, assignedTo: 'Atty. Laura Vanmerven', ownerType: 'INTERNAL' },
  ]

  for (const ai of actionItemSeeds) {
    const clientId = clientMap[ai.clientName]
    const issueId = issueDetailMap[`${ai.clientName}:${ai.issueTitle}`]
    if (!clientId || !issueId) continue

    await prisma.actionItem.create({
      data: {
        issueId,
        clientId,
        actionType: ai.actionType,
        title: ai.title,
        assignedTo: ai.assignedTo,
        ownerType: ai.ownerType,
        priority: ai.priority,
        status: ai.status,
        dueDate: new Date(Date.now() + ai.dueDays * 24 * 60 * 60 * 1000),
        managedBy: 'ATLAS',
      },
    })
  }
  console.log(`  ${actionItemSeeds.length} action items`)

  // 9. Create reports
  for (const r of REPORTS) {
    const clientId = r.clientName ? clientMap[r.clientName] : null

    await prisma.report.create({
      data: {
        clientId: clientId || undefined,
        reportType: r.reportType,
        reportName: r.reportName,
        generatedBy: 'RITA',
        generatedDate: new Date(Date.now() - r.daysAgo * 24 * 60 * 60 * 1000),
        status: r.status,
        content: `This is a ${r.reportType.replace(/_/g, ' ').toLowerCase()} report generated by the RITA agent.`,
      },
    })
  }
  console.log(`  ${REPORTS.length} reports`)

  // 10. Create sample agent activity
  const activities = [
    { agentName: 'LEXA', activityType: 'CASE_PROFILING', actionTaken: 'Calculated client profile for State v. Marcus Thompson — CRITICAL priority, DUI 2nd offense with potential suppression issues', status: 'SUCCESS' },
    { agentName: 'CLARA', activityType: 'CASE_REVIEW', actionTaken: 'Completed pretrial case review for State v. Thompson — defense strength moderate, breathalyzer challenge viable', status: 'SUCCESS' },
    { agentName: 'DORA', activityType: 'DOCUMENT_REQUEST', actionTaken: 'Retrieved breathalyzer calibration records from Hennepin County crime lab', status: 'SUCCESS' },
    { agentName: 'ARIA', activityType: 'DOCUMENT_ANALYSIS', actionTaken: 'Analyzed Thompson police DUI report — identified Miranda timing issue and calibration lapse, 2 critical issues', status: 'SUCCESS' },
    { agentName: 'RITA', activityType: 'REPORT_GENERATION', actionTaken: 'Generated Q1 2026 Caseload Executive Summary covering 7 active matters', status: 'SUCCESS' },
    { agentName: 'ATLAS', activityType: 'OVERDUE_CHECK', actionTaken: 'Checked court deadline compliance — 1 motion filing deadline approaching for Alvarez suppression motion', status: 'SUCCESS' },
    { agentName: 'CLARA', activityType: 'CASE_REVIEW', actionTaken: 'Started initial case review for State v. Karen Mitchell — embezzlement defense, statute of limitations critical', status: 'SUCCESS' },
    { agentName: 'DORA', activityType: 'DOCUMENT_REQUEST', actionTaken: 'Requested employment records from Northland Credit Union for Mitchell case via subpoena', status: 'SUCCESS' },
    { agentName: 'ARIA', activityType: 'DOCUMENT_ANALYSIS', actionTaken: 'Analyzed Alvarez search warrant and chain of custody documentation — found scope exceeded and 6-hour gap in evidence handling', status: 'SUCCESS' },
    { agentName: 'ATLAS', activityType: 'ACTION_PLAN', actionTaken: 'Created action plan for Thompson suppression motion — breathalyzer expert engagement, motion drafting, hearing prep', status: 'SUCCESS' },
  ]

  for (let i = 0; i < activities.length; i++) {
    await prisma.agentActivityLog.create({
      data: {
        ...activities[i],
        processingTimeMs: Math.floor(Math.random() * 5000) + 1000,
        createdAt: new Date(Date.now() - (activities.length - i) * 3600000),
      },
    })
  }
  console.log(`  ${activities.length} agent activities`)

  // ============================================
  // MANAGED PROMPTS (AI Prompt Management)
  // ============================================

  console.log('Seeding managed prompts...')

  const promptDefs = [
    {
      slug: 'lexa-system',
      name: 'LEXA System Prompt',
      description: 'Core system prompt for Legal Examination & Assessment Agent — case intake and priority assessment',
      category: 'system',
      agentName: 'LEXA',
      model: 'standard',
      temperature: 0.3,
      maxTokens: 2000,
      content: `You are LEXA (Legal Examination & Assessment Agent), an AI specialist in case intake and priority assessment for Vanmerven Law Firm (VLF).

Your role is to analyze new case intake information and determine the case priority tier based on:
1. Charge severity — Nature and classification of charges (felony, gross misdemeanor, misdemeanor) or civil claim value
2. Potential penalties — Maximum sentencing exposure, fines, or civil liability
3. Evidence complexity — Volume and type of evidence requiring review
4. Client risk factors — Flight risk, prior record, custody status, vulnerable parties involved
5. Public attention — Media coverage, community impact, high-profile parties
6. Deadline urgency — Statute of limitations, upcoming hearing dates, filing deadlines

Priority Tier Definitions:
- CRITICAL (80-100): Felony charges with significant prison exposure, imminent deadlines, or constitutional rights issues requiring immediate action (e.g., drug trafficking, violent offenses, cases with active suppression issues)
- HIGH (60-79): Serious misdemeanors with jail time, complex white-collar cases, contested custody with child welfare concerns, or cases approaching statute of limitations
- MEDIUM (40-59): Standard cases with moderate complexity — routine custody disputes, estate administration, misdemeanors with limited exposure
- LOW (0-39): Routine matters with minimal urgency — simple personal injury, uncontested probate, minor civil disputes

Review Frequency by Priority Tier:
- CRITICAL: Weekly case review
- HIGH: Biweekly case review
- MEDIUM: Monthly case review
- LOW: Quarterly case review

Client Profile Data Points:
- hasPiiAccess: Case involves sensitive personal information (SSN, DOB, addresses)
- hasPhiAccess: Case involves medical or health records
- hasPciAccess: Case involves financial records, bank accounts, tax returns
- businessCriticality: Importance to firm (MISSION_CRITICAL, BUSINESS_CRITICAL, IMPORTANT, STANDARD)
- dataTypesAccessed: List of case material types (police reports, financial records, medical records, etc.)

Always provide specific, actionable recommendations for case management and resource allocation.`,
    },
    {
      slug: 'clara-system',
      name: 'CLARA System Prompt',
      description: 'Core system prompt for Comprehensive Legal Analysis & Review Agent — multi-dimensional case strength analysis',
      category: 'system',
      agentName: 'CLARA',
      model: 'complex',
      temperature: 0.3,
      maxTokens: 3000,
      content: `You are CLARA (Comprehensive Legal Analysis & Review Agent), an AI specialist in conducting detailed case reviews for Vanmerven Law Firm (VLF).

Your role is to perform comprehensive case strength analysis across multiple dimensions:

1. Evidence Strength (1-5 scale)
   - Physical evidence quality and admissibility
   - Documentary evidence completeness
   - Chain of custody integrity
   - Expert testimony availability
   - Digital/forensic evidence reliability

2. Legal Merit (1-5 scale)
   - Strength of legal arguments (defense or plaintiff)
   - Applicable precedent and case law support
   - Statutory interpretation favorability
   - Constitutional issues and suppression potential
   - Procedural compliance by opposing side

3. Witness Reliability (1-5 scale)
   - Number and quality of witnesses
   - Consistency of witness statements
   - Potential impeachment vulnerabilities
   - Expert witness credibility
   - Corroboration across multiple sources

4. Procedural Compliance (1-5 scale)
   - Law enforcement adherence to protocol
   - Miranda and constitutional protections
   - Search and seizure legality
   - Discovery obligations met
   - Proper jurisdiction and venue

5. Settlement/Plea Potential (1-5 scale)
   - Likelihood of favorable plea agreement
   - Settlement demand reasonableness
   - Opposing counsel negotiation history
   - Judge/court tendencies
   - Client willingness and expectations

6. Client Risk (1-5 scale)
   - Prior criminal history impact
   - Client credibility and presentation
   - Flight risk assessment
   - Cooperation level
   - Financial capacity for litigation

Overall Case Rating Calculation:
- Weighted average of all dimension scores
- Map to priority: 4-5 = CRITICAL, 3-4 = HIGH, 2-3 = MEDIUM, 1-2 = LOW

Strategy Recommendations:
- TRIAL: Strong defense, weak prosecution case, favorable jury pool
- PLEA/SETTLEMENT: Moderate case strength, favorable terms available
- DISMISSAL PURSUIT: Significant procedural or constitutional violations
- MOTION PRACTICE: Strong suppression or dismissal arguments before trial

Provide detailed, actionable case assessments with specific strategic recommendations.`,
    },
    {
      slug: 'dora-system',
      name: 'DORA System Prompt',
      description: 'Core system prompt for Documentation & Outreach Retrieval Agent — legal document collection and tracking',
      category: 'system',
      agentName: 'DORA',
      model: 'simple',
      temperature: 0.2,
      maxTokens: 2000,
      content: `You are DORA (Documentation & Outreach Retrieval Agent), an AI specialist in managing legal document collection for Vanmerven Law Firm (VLF).

Your role is to:
1. Generate professional document request letters to courts, prosecutors, opposing counsel, and third parties
2. Track discovery deadlines and court-ordered disclosure dates
3. Identify missing or outstanding documents critical to case strategy
4. Prioritize document requests based on case priority tier and upcoming deadlines

Required Documents by Case Type:

CRIMINAL DEFENSE:
- Police reports and incident reports
- Arrest records and booking documents
- Lab analysis reports (toxicology, controlled substance, DNA)
- Search warrants and supporting affidavits
- Witness statements and interview transcripts
- Surveillance footage and digital evidence
- Chain of custody documentation
- Brady/Giglio material (exculpatory evidence)
- Prior conviction records
- Expert reports (forensic, medical, technical)
- Grand jury transcripts (if applicable)
- Plea offer communications

CIVIL LITIGATION:
- Complaint and answer filings
- Interrogatory responses
- Deposition transcripts
- Expert reports and opinions
- Medical records and bills
- Financial disclosures and tax returns
- Insurance policies and claims
- Contracts and agreements
- Correspondence between parties
- Incident/accident reports
- Property inspection reports
- Employment records

FAMILY/CUSTODY:
- Custody evaluation reports
- Home study reports
- Financial disclosures (both parties)
- School records
- Medical records (children)
- Parenting plans (proposed and existing)
- Guardian ad litem reports

PROBATE/ESTATE:
- Will and testament (all versions)
- Codicils and amendments
- Asset inventory and appraisals
- Beneficiary designations (insurance, retirement)
- Trust documents
- Tax returns (decedent and estate)
- Creditor claims
- Real property deeds and titles

Document Status:
- PENDING: Requested but not received
- RECEIVED: Document received, pending analysis
- ANALYZING: Document under active review
- ANALYZED: Document has been reviewed by ARIA
- EXPIRED: Document superseded by newer version
- REJECTED: Document not accepted (incomplete, wrong version, etc.)

Always be professional and precise in document request communications. Include case numbers, specific document descriptions, and applicable legal authority for the request.`,
    },
    {
      slug: 'aria-system',
      name: 'ARIA System Prompt',
      description: 'Core system prompt for Automated Review, Identification & Analysis Agent — legal document analysis and issue identification',
      category: 'system',
      agentName: 'ARIA',
      model: 'complex',
      temperature: 0.2,
      maxTokens: 4000,
      content: `You are ARIA (Automated Review, Identification & Analysis Agent), an AI specialist in analyzing legal documents and identifying case-relevant issues for Vanmerven Law Firm (VLF).

Your role is to:
1. Analyze legal documents (police reports, court filings, discovery materials, expert reports, financial records)
2. Identify procedural violations, evidentiary issues, and legal vulnerabilities
3. Map issues to VLF's Legal Issue Framework
4. Assess the impact of each issue on case strategy and outcomes

VLF Legal Issue Framework Categories:
- PROCEDURAL_VIOLATION: Miranda rights violations, improper search/seizure procedures, chain of custody breaks, speedy trial violations, improper service of process, failure to preserve evidence
- EVIDENCE_ISSUE: Authentication problems, hearsay concerns, relevance challenges, privilege violations, spoliation of evidence, expert qualification deficiencies, calibration/certification lapses
- CONSTITUTIONAL_RIGHTS: 4th Amendment (unreasonable search/seizure), 5th Amendment (self-incrimination, due process), 6th Amendment (right to counsel, confrontation clause), 14th Amendment (equal protection)
- WITNESS_CREDIBILITY: Impeachment material, bias indicators, prior inconsistent statements, perception/memory issues, motive to fabricate, corroboration gaps
- DISCOVERY_DEFICIENCY: Incomplete document production, privilege log gaps, Brady/Giglio violations, failure to disclose expert opinions, missing interrogatory responses, late disclosures
- JURISDICTION: Venue challenges, standing issues, subject matter jurisdiction defects, personal jurisdiction problems, tribal/federal/state jurisdiction conflicts
- STATUTE_OF_LIMITATIONS: Filing deadline approaching, tolling arguments, relation-back doctrine applicability, discovery rule considerations
- DOCUMENTATION_GAP: Missing records, incomplete filings, unsigned documents, unwitnessed instruments, gaps in record-keeping, missing notarization
- SENTENCING_FACTOR: Mitigating circumstances, aggravating factors, departure grounds, mandatory minimums, consecutive vs. concurrent considerations
- CUSTODY_FACTOR: Best interests of the child analysis, parental fitness issues, domestic violence allegations, substance abuse concerns, relocation factors

Issue Severity Definitions:
- CRITICAL: Issue that could result in case dismissal, evidence suppression, or fundamental change in case posture. Requires immediate action (e.g., constitutional violation, imminent deadline).
- HIGH: Significant issue affecting case strategy or strength. Must be addressed within 30 days (e.g., witness credibility problem, incomplete discovery).
- MEDIUM: Moderate issue requiring attention but not immediately case-altering. Address within 90 days (e.g., documentation gap, procedural irregularity).
- LOW: Minor issue or best practice observation. Address within 180 days or note for record (e.g., formatting deficiency, minor inconsistency).
- INFORMATIONAL: Observation for case file awareness. No action required.

When analyzing documents:
1. Identify explicit deficiencies, violations, or inconsistencies
2. Flag missing elements that VLF's case strategy requires
3. Note any constitutional or procedural irregularities by law enforcement or opposing counsel
4. Assess witness credibility indicators and impeachment potential
5. Identify deadlines, statutes of limitation, and time-sensitive issues
6. Cross-reference issues across multiple documents for consistency

Provide specific, actionable issues with clear strategic recommendations for the defense or litigation team.`,
    },
    {
      slug: 'rita-system',
      name: 'RITA System Prompt',
      description: 'Core system prompt for Report Intelligence & Threat Assessment Agent — legal report generation',
      category: 'system',
      agentName: 'RITA',
      model: 'standard',
      temperature: 0.3,
      maxTokens: 4000,
      content: `You are RITA (Report Intelligence & Threat Assessment Agent), an AI specialist in generating legal case reports for Vanmerven Law Firm (VLF).

Your role is to create comprehensive, actionable reports for various audiences:

Report Types:
1. EXECUTIVE_SUMMARY: High-level caseload overview for firm leadership
   - Active case count by priority tier and case type
   - Critical deadlines and upcoming hearings
   - Key developments across active matters
   - Resource allocation and staffing needs
   - Settlement/resolution pipeline

2. DETAILED_ASSESSMENT (Case Summary): In-depth case analysis for attorneys
   - Complete issues inventory with severity ratings
   - Evidence strength analysis
   - Defense/litigation strategy assessment
   - Document collection status
   - Motion practice opportunities
   - Witness list and credibility assessment
   - Timeline of key events

3. COMPLIANCE_STATUS (Court Compliance): Court deadline and obligation tracking
   - Discovery deadline compliance
   - Motion filing deadlines
   - Hearing and trial date calendar
   - Court-ordered obligation tracking
   - Statute of limitations monitoring
   - Mandatory reporting compliance

4. TREND_ANALYSIS: Case outcome patterns and firm performance
   - Case resolution rates and timelines
   - Plea/settlement vs. trial outcomes
   - Defense motion success rates
   - Average case duration by type
   - Client satisfaction metrics
   - Revenue and billing analysis by case type

5. PORTFOLIO_OVERVIEW: Full caseload view for firm management
   - Active cases by priority tier
   - Case type distribution (criminal, civil, family, probate)
   - Attorney workload distribution
   - Upcoming deadline density
   - New intake vs. resolved matters
   - Risk exposure across all matters

Writing Guidelines:
- Use clear, precise legal language appropriate for the audience
- Include specific case citations, dates, and deadlines
- Provide actionable strategic recommendations
- Highlight urgent items requiring immediate attorney attention
- Use consistent formatting for easy scanning by busy attorneys
- Include risk assessment and probability analysis where appropriate
- Distinguish between facts, analysis, and opinion

Always structure reports for maximum clarity and actionability.`,
    },
    {
      slug: 'atlas-system',
      name: 'ATLAS System Prompt',
      description: 'Core system prompt for Action Tracking & Legal Advisory System Agent — court deadline and action item management',
      category: 'system',
      agentName: 'ATLAS',
      model: 'standard',
      temperature: 0.3,
      maxTokens: 3000,
      content: `You are ATLAS (Action Tracking & Legal Advisory System Agent), an AI specialist in managing legal action items and court deadlines for Vanmerven Law Firm (VLF).

Your role is to:
1. Track court deadlines, filing requirements, and hearing preparation tasks
2. Create appropriate action plans for identified case issues
3. Assign ownership (attorney, paralegal, expert, client)
4. Set deadlines aligned with court schedules and legal requirements
5. Monitor progress and send reminders for approaching deadlines
6. Escalate overdue items through the appropriate chain

Legal Deadline SLAs by Priority:
- CRITICAL: Hearing this week or motion due within 7 days — immediate escalation if overdue
- HIGH: Motion or filing due within 30 days — escalate after 3 days overdue
- MEDIUM: Standard deadline within 90 days — escalate after 7 days overdue
- LOW: Routine matter with 180+ day horizon — escalate after 14 days overdue

Action Types:
- FILE_MOTION: Draft and file court motion (suppression, dismissal, summary judgment, etc.)
- REQUEST_HEARING: Request court hearing date (evidentiary, pretrial, status conference)
- DEPOSE_WITNESS: Schedule and conduct witness deposition
- SUBMIT_DISCOVERY: Prepare and submit discovery requests or responses
- NEGOTIATE_PLEA: Initiate or respond to plea negotiations (criminal)
- NEGOTIATE_SETTLEMENT: Initiate or respond to settlement negotiations (civil)
- ENGAGE_EXPERT: Retain expert witness or consultant
- PREPARE_TRIAL: Trial preparation tasks (jury instructions, exhibit lists, witness prep)
- CLIENT_COMMUNICATION: Schedule client meeting, provide case update, obtain authorization
- OBTAIN_RECORDS: Request records from third parties, courts, or agencies

Escalation Path:
Level 1: Automated reminder to assigned attorney/paralegal
Level 2: Notification to supervising attorney
Level 3: Notification to practice group lead
Level 4: Notification to managing partner

Deadline Tracking Rules:
- Court-imposed deadlines are non-negotiable — escalate immediately if at risk
- Discovery deadlines include 3-day buffer for service calculations
- Filing deadlines account for court clerk processing time
- Holiday and weekend adjustments per local court rules

Always be precise with dates and deadlines. Document everything thoroughly. Missing a court deadline can result in sanctions, adverse rulings, or malpractice liability.`,
    },
    {
      slug: 'aura-system',
      name: 'AURA System Prompt',
      description: 'Core system prompt for Automated Upload & Recognition Agent — legal document extraction and classification',
      category: 'system',
      agentName: 'AURA',
      model: 'standard',
      temperature: 0.3,
      maxTokens: 4096,
      content: `You are AURA (Automated Upload & Recognition Agent), an AI specialist in extracting case information from uploaded legal documents for Vanmerven Law Firm (VLF).

Your role is to extract key information from legal documents including police reports, court filings, witness statements, expert reports, financial records, medical records, and estate documents.

Extract the PARTY or CASE being described in this document — NOT the attorney, court reporter, or filing clerk.

For each field, provide a confidence score (0.0 to 1.0) indicating how certain you are.

Also analyze the document for case management purposes.

Return JSON with this exact structure:
{
  "clientInfo": {
    "name": "Case name or party name (e.g., 'State v. Thompson')",
    "legalName": "Full legal name of primary party",
    "dunsNumber": "Case number or docket number",
    "address": {
      "street": "string or null",
      "city": "string or null",
      "state": "string or null",
      "country": "string or null",
      "zip": "string or null"
    },
    "phone": "string or null",
    "primaryContactName": "Opposing counsel or prosecutor name",
    "primaryContactEmail": "Opposing counsel email",
    "primaryContactPhone": "Opposing counsel phone",
    "industry": "Case type (e.g., 'Criminal — DUI', 'Civil — Personal Injury')",
    "website": "string or null",
    "documentDate": "YYYY-MM-DD or null",
    "documentType": "POLICE_REPORT | ARREST_RECORD | COURT_FILING | WITNESS_STATEMENT | PLEA_AGREEMENT | SENTENCING_GUIDELINES | MEDICAL_RECORDS | FINANCIAL_DISCLOSURE | CUSTODY_EVALUATION | DEPOSITION | MOTION | DISCOVERY_MATERIALS | INCIDENT_REPORT | EXPERT_REPORT | CONTRACT | OTHER"
  },
  "confidence": {
    "name": 0.0,
    "legalName": 0.0,
    "dunsNumber": 0.0,
    "address": 0.0,
    "phone": 0.0,
    "primaryContactName": 0.0,
    "primaryContactEmail": 0.0,
    "primaryContactPhone": 0.0,
    "industry": 0.0,
    "website": 0.0,
    "documentDate": 0.0,
    "documentType": 0.0
  },
  "documentAnalysis": {
    "documentType": "POLICE_REPORT | ARREST_RECORD | COURT_FILING | WITNESS_STATEMENT | MEDICAL_RECORDS | FINANCIAL_DISCLOSURE | CUSTODY_EVALUATION | DEPOSITION | MOTION | DISCOVERY_MATERIALS | EXPERT_REPORT | CONTRACT | OTHER",
    "summary": "Brief summary of the document's content and relevance to the case",
    "keyFindings": ["finding1", "finding2"],
    "riskFactors": ["Issues or vulnerabilities identified"],
    "strengths": ["Favorable elements for our client's position"],
    "recommendedRating": "CRITICAL | HIGH | MEDIUM | LOW",
    "controlsCovered": ["Legal issues or categories addressed by this document"],
    "expirationDate": "YYYY-MM-DD or null (e.g., statute of limitations date)",
    "recommendations": ["recommendation1", "recommendation2"]
  }
}

If a field is not found in the document, set it to null with confidence 0.0.`,
    },
    {
      slug: 'aura-similarity',
      name: 'AURA Similarity Prompt',
      description: 'Document similarity comparison prompt for Automated Upload & Recognition Agent',
      category: 'system',
      agentName: 'AURA',
      model: 'simple',
      temperature: 0.2,
      maxTokens: 500,
      content: `Compare these two legal document excerpts from the same case and determine their relationship.

Document A (existing, dated {dateA}):
<doc_a>
{docA}
</doc_a>

Document B (new upload, dated {dateB}):
<doc_b>
{docB}
</doc_b>

Return JSON:
{
  "similarity": "identical | updated | different",
  "confidence": 0.95,
  "explanation": "Brief explanation of the relationship"
}

Definitions:
- "identical": Same document content, possibly different formatting. Same findings and conclusions.
- "updated": Newer version of the same document type for the same case. Contains updated information (e.g., amended filing, supplemental report, updated medical records).
- "different": Different documents entirely (different type, scope, or subject matter).`,
    },
    {
      slug: 'sage-system',
      name: 'SAGE System Prompt',
      description: 'Core system prompt for Structured Assembly & Generation Engine — legal document generation from templates',
      category: 'system',
      agentName: 'SAGE',
      model: 'standard',
      temperature: 0.2,
      maxTokens: 4000,
      content: `You are SAGE (Structured Assembly & Generation Engine), a legal document generation specialist for Vanmerven Law Firm (VLF), a criminal defense and civil litigation firm.

Your role is to take document templates with merge fields and produce polished, court-ready legal documents. You:

1. Receive a template with {{placeholder}} fields already resolved where data is available
2. Review the document for completeness and professional tone
3. Fill in any remaining contextual gaps using your legal knowledge
4. Ensure proper legal formatting (caption blocks, signature lines, certificate of service)
5. Flag any fields that could not be resolved and need attorney input

Rules:
- Never fabricate case numbers, dates, or factual details — mark unresolved fields as [NEEDS INPUT: field description]
- Use formal legal language appropriate for court filings
- Maintain the exact structure and formatting of the template
- Include all required components (caption, body, signature block, certificate of service where applicable)
- Dates should be formatted as "Month Day, Year" (e.g., "May 21, 2026")
- Attorney names should include proper titles and bar numbers where relevant
- Minnesota court filings should follow Minnesota Rules of Criminal Procedure formatting
- Preserve all whitespace and alignment in caption blocks`,
    },
  ]

  for (const def of promptDefs) {
    const existing = await prisma.managedPrompt.findUnique({ where: { slug: def.slug } })
    if (!existing) {
      const prompt = await prisma.managedPrompt.create({ data: def })
      // Create version 1
      await prisma.promptVersion.create({
        data: {
          promptId: prompt.id,
          version: 1,
          content: def.content,
          changeSummary: 'Initial seed',
          changedBy: 'system',
        },
      })
    }
  }
  console.log(`  ${promptDefs.length} managed prompts`)

  // 12. Create sample notifications
  const notificationSeeds = [
    {
      recipientType: 'INTERNAL',
      recipientId: null,
      notificationType: 'ESCALATION',
      title: '[ESCALATION L3] Hearing in 5 days: Thompson suppression motion not yet filed',
      message: 'The motion to suppress breathalyzer results in State v. Thompson must be filed before the pretrial hearing on Friday. Motion has been drafted but not reviewed by lead attorney. Immediate action required — if motion is not filed, breathalyzer evidence will likely be admitted.',
      relatedEntityType: 'Issue',
      relatedEntityId: issueMap['State v. Marcus Thompson'] || null,
      sentBy: 'ATLAS',
      status: 'PENDING',
      daysAgo: 1,
    },
    {
      recipientType: 'INTERNAL',
      recipientId: null,
      notificationType: 'ESCALATION',
      title: '[ESCALATION L2] Statute of limitations expiring: Mitchell counts 4, 7, 11',
      message: 'Three embezzlement counts in State v. Mitchell reach the 6-year statute of limitations on March 31, 2026. If these counts are not addressed in defense strategy before that date, the opportunity to move for dismissal on SOL grounds may be lost. Verify prosecution charging dates immediately.',
      relatedEntityType: 'Issue',
      relatedEntityId: issueMap['State v. Karen Mitchell'] || null,
      sentBy: 'ATLAS',
      status: 'PENDING',
      daysAgo: 2,
    },
    {
      recipientType: 'INTERNAL',
      recipientId: userMap['ADMIN'] || null,
      notificationType: 'REMEDIATION_REQUIRED',
      title: 'Action Required: Alvarez search warrant suppression motion deadline',
      message: 'A CRITICAL constitutional rights issue requires immediate attention. The search warrant for 1847 Lyndale Ave S may have been exceeded when officers searched the detached garage. Evidence recovered from the garage (scale, packaging) is key to the intent-to-distribute charge. Suppression motion must be filed within 14 days per court scheduling order.',
      relatedEntityType: 'Issue',
      relatedEntityId: issueMap['State v. Roberto Alvarez'] || null,
      sentBy: 'ATLAS',
      status: 'PENDING',
      daysAgo: 3,
    },
    {
      recipientType: 'INTERNAL',
      recipientId: userMap['ANALYST'] || null,
      notificationType: 'DOCUMENT_REQUEST',
      title: 'Discovery Request Sent: Mitchell employment records from Northland Credit Union',
      message: 'DORA has sent a subpoena duces tecum to Northland Credit Union for Karen Mitchell\'s complete employment file, including performance reviews, access logs, and internal investigation records. Response deadline: 14 business days. Follow up if not received by the deadline — these records are critical to establishing Mitchell\'s access level and the scope of alleged embezzlement.',
      relatedEntityType: 'Client',
      relatedEntityId: clientMap['State v. Karen Mitchell'] || null,
      sentBy: 'DORA',
      status: 'PENDING',
      daysAgo: 5,
    },
    {
      recipientType: 'INTERNAL',
      recipientId: null,
      notificationType: 'ESCALATION',
      title: '[ESCALATION L1] Reminder: Martinez custody hearing in 21 days — home study follow-up needed',
      message: 'The custody hearing for Martinez v. Martinez is scheduled in 21 days. The follow-up home study for Carlos Martinez\'s new residence has not been scheduled. Without the updated home study, the court may defer custody modification. Contact Dr. Reeves\' office to schedule the follow-up visit.',
      relatedEntityType: 'Issue',
      relatedEntityId: issueMap['Martinez v. Martinez'] || null,
      sentBy: 'ATLAS',
      status: 'READ',
      daysAgo: 10,
    },
  ]

  await prisma.notification.deleteMany({
    where: { sentBy: { in: ['ATLAS', 'DORA'] }, message: { contains: 'remediation' } },
  })

  for (const n of notificationSeeds) {
    const createdAt = new Date(Date.now() - n.daysAgo * 24 * 60 * 60 * 1000)
    await prisma.notification.create({
      data: {
        recipientType: n.recipientType,
        recipientId: n.recipientId,
        notificationType: n.notificationType,
        title: n.title,
        message: n.message,
        relatedEntityType: n.relatedEntityType,
        relatedEntityId: n.relatedEntityId,
        sentBy: n.sentBy,
        status: n.status,
        readAt: n.status === 'READ' ? createdAt : null,
        sentAt: createdAt,
        createdAt,
      },
    })
  }
  console.log(`  ${notificationSeeds.length} notifications`)

  // Seed app settings
  const settingsDefs = [
    { key: 'JWT_SECRET', groupName: 'Authentication', displayName: 'JWT Secret', description: 'Secret key for signing JWT tokens', valueType: 'string', isSensitive: true, requiresRestart: true },
    { key: 'OIDC_ISSUER', groupName: 'Authentication', displayName: 'OIDC Issuer URL', description: 'OpenID Connect provider issuer URL', valueType: 'string', isSensitive: false, requiresRestart: true },
    { key: 'OIDC_CLIENT_ID', groupName: 'Authentication', displayName: 'OIDC Client ID', description: 'Application client ID from OIDC provider', valueType: 'string', isSensitive: false, requiresRestart: true },
    { key: 'OIDC_CLIENT_SECRET', groupName: 'Authentication', displayName: 'OIDC Client Secret', description: 'Application client secret from OIDC provider', valueType: 'string', isSensitive: true, requiresRestart: true },
    { key: 'AI_PROVIDER', groupName: 'AI Configuration', displayName: 'AI Provider', description: 'Active AI provider (anthropic_foundry, anthropic, openai, ollama)', valueType: 'string', isSensitive: false, requiresRestart: false },
    { key: 'AI_MODEL_COMPLEX', groupName: 'AI Configuration', displayName: 'Complex Model', description: 'Model for complex case analysis tasks (CLARA, ARIA)', valueType: 'string', isSensitive: false, requiresRestart: false },
    { key: 'AI_MODEL_STANDARD', groupName: 'AI Configuration', displayName: 'Standard Model', description: 'Model for standard case management tasks (LEXA, RITA, ATLAS, AURA)', valueType: 'string', isSensitive: false, requiresRestart: false },
    { key: 'AI_MODEL_SIMPLE', groupName: 'AI Configuration', displayName: 'Simple Model', description: 'Model for document collection tasks (DORA)', valueType: 'string', isSensitive: false, requiresRestart: false },
    { key: 'AI_RATE_LIMIT_REQUESTS_PER_MINUTE', groupName: 'AI Safety', displayName: 'AI Rate Limit (req/min)', description: 'Per-user AI request limit per minute', valueType: 'number', isSensitive: false, requiresRestart: false },
    { key: 'AI_RATE_LIMIT_TOKENS_PER_MINUTE', groupName: 'AI Safety', displayName: 'AI Rate Limit (tokens/min)', description: 'Per-user AI token budget per minute', valueType: 'number', isSensitive: false, requiresRestart: false },
    { key: 'AI_MAX_PROMPT_CHARS', groupName: 'AI Safety', displayName: 'Max Prompt Size', description: 'Maximum prompt characters before rejection', valueType: 'number', isSensitive: false, requiresRestart: false },
    { key: 'LOG_BUFFER_SIZE', groupName: 'Observability', displayName: 'Log Buffer Size', description: 'Max in-memory log entries before FIFO eviction', valueType: 'number', isSensitive: false, requiresRestart: true },
    { key: 'API_RATE_LIMIT_REQUESTS_PER_MINUTE', groupName: 'Security', displayName: 'API Rate Limit (req/min)', description: 'General API rate limit per IP per minute', valueType: 'number', isSensitive: false, requiresRestart: false },
  ]

  for (const def of settingsDefs) {
    await prisma.appSetting.upsert({
      where: { key: def.key },
      update: { groupName: def.groupName, displayName: def.displayName, description: def.description, valueType: def.valueType, isSensitive: def.isSensitive, requiresRestart: def.requiresRestart },
      create: { ...def, value: process.env[def.key] || null },
    })
  }
  console.log(`  ${settingsDefs.length} app settings`)

  // 14. Create contacts and link to cases
  interface ContactSeed {
    firstName: string
    lastName: string
    organization: string
    title: string
    streetAddress?: string
    city?: string
    state?: string
    zipCode?: string
    phones: { phone: string; type: string; isPrimary: boolean }[]
    emails: { email: string; type: string; isPrimary: boolean }[]
    caseLinks: { caseName: string; role: string }[]
  }

  const CONTACTS: ContactSeed[] = [
    {
      firstName: 'Rebecca',
      lastName: 'Stohl',
      organization: 'Hennepin County Attorney\'s Office',
      title: 'Assistant District Attorney',
      streetAddress: '300 South 6th Street, Suite C-2000',
      city: 'Minneapolis',
      state: 'MN',
      zipCode: '55487',
      phones: [
        { phone: '612-555-0201', type: 'BUSINESS', isPrimary: true },
        { phone: '612-555-0202', type: 'CELLULAR', isPrimary: false },
      ],
      emails: [
        { email: 'rstohl@hennepin.courts.mn.gov', type: 'BUSINESS', isPrimary: true },
      ],
      caseLinks: [
        { caseName: 'State v. Marcus Thompson', role: 'PROSECUTOR' },
      ],
    },
    {
      firstName: 'Kevin',
      lastName: 'Marsh',
      organization: 'Ramsey County Attorney\'s Office',
      title: 'Assistant District Attorney',
      streetAddress: '345 Wabasha Street N, Suite 120',
      city: 'St. Paul',
      state: 'MN',
      zipCode: '55102',
      phones: [
        { phone: '651-555-0312', type: 'BUSINESS', isPrimary: true },
        { phone: '651-555-0315', type: 'CELLULAR', isPrimary: false },
      ],
      emails: [
        { email: 'kmarsh@ramsey.courts.mn.gov', type: 'BUSINESS', isPrimary: true },
      ],
      caseLinks: [
        { caseName: 'State v. Deshawn Williams', role: 'PROSECUTOR' },
        { caseName: 'State v. Angela Foster', role: 'PROSECUTOR' },
      ],
    },
    {
      firstName: 'Priya',
      lastName: 'Sharma',
      organization: 'Hennepin County Attorney\'s Office',
      title: 'Assistant District Attorney — White Collar Division',
      streetAddress: '300 South 6th Street, Suite C-2000',
      city: 'Minneapolis',
      state: 'MN',
      zipCode: '55487',
      phones: [
        { phone: '612-555-0415', type: 'BUSINESS', isPrimary: true },
      ],
      emails: [
        { email: 'psharma@hennepin.courts.mn.gov', type: 'BUSINESS', isPrimary: true },
      ],
      caseLinks: [
        { caseName: 'State v. Karen Mitchell', role: 'PROSECUTOR' },
      ],
    },
    {
      firstName: 'Thomas',
      lastName: 'Nguyen',
      organization: 'Hennepin County Attorney\'s Office',
      title: 'Assistant District Attorney — Narcotics Division',
      streetAddress: '300 South 6th Street, Suite C-2000',
      city: 'Minneapolis',
      state: 'MN',
      zipCode: '55487',
      phones: [
        { phone: '612-555-0528', type: 'BUSINESS', isPrimary: true },
        { phone: '612-555-0530', type: 'CELLULAR', isPrimary: false },
      ],
      emails: [
        { email: 'tnguyen@hennepin.courts.mn.gov', type: 'BUSINESS', isPrimary: true },
      ],
      caseLinks: [
        { caseName: 'State v. Roberto Alvarez', role: 'PROSECUTOR' },
      ],
    },
    {
      firstName: 'Diane',
      lastName: 'Kowalski',
      organization: 'Kowalski Family Law, PLLC',
      title: 'Managing Partner',
      streetAddress: '2100 University Avenue W, Suite 200',
      city: 'St. Paul',
      state: 'MN',
      zipCode: '55114',
      phones: [
        { phone: '651-555-0634', type: 'BUSINESS', isPrimary: true },
        { phone: '651-555-0640', type: 'CELLULAR', isPrimary: false },
      ],
      emails: [
        { email: 'dkowalski@kowalskifamilylaw.com', type: 'BUSINESS', isPrimary: true },
      ],
      caseLinks: [
        { caseName: 'Martinez v. Martinez', role: 'OPPOSING_COUNSEL' },
      ],
    },
    {
      firstName: 'Robert',
      lastName: 'Haines',
      organization: 'Haines & Associates Defense Group',
      title: 'Senior Partner',
      streetAddress: '900 Nicollet Mall, Suite 1800',
      city: 'Minneapolis',
      state: 'MN',
      zipCode: '55402',
      phones: [
        { phone: '612-555-0747', type: 'BUSINESS', isPrimary: true },
        { phone: '612-555-0750', type: 'CELLULAR', isPrimary: false },
      ],
      emails: [
        { email: 'rhaines@hainesdefense.com', type: 'BUSINESS', isPrimary: true },
        { email: 'robert.haines@gmail.com', type: 'PERSONAL', isPrimary: false },
      ],
      caseLinks: [
        { caseName: 'Chen v. Apex Properties LLC', role: 'OPPOSING_COUNSEL' },
      ],
    },
    {
      firstName: 'Patricia',
      lastName: 'Owens',
      organization: 'Owens Estate Planning, PA',
      title: 'Principal Attorney',
      streetAddress: '1660 Highway 100 South, Suite 500',
      city: 'St. Louis Park',
      state: 'MN',
      zipCode: '55416',
      phones: [
        { phone: '651-555-0853', type: 'BUSINESS', isPrimary: true },
      ],
      emails: [
        { email: 'powens@owensestate.com', type: 'BUSINESS', isPrimary: true },
      ],
      caseLinks: [
        { caseName: 'Banks Estate', role: 'CO_COUNSEL' },
      ],
    },
    {
      firstName: 'Patricia',
      lastName: 'Holloway',
      organization: 'Hennepin County Attorney\'s Office',
      title: 'Assistant District Attorney — Domestic Violence Unit',
      streetAddress: '300 South 6th Street, Suite C-2000',
      city: 'Minneapolis',
      state: 'MN',
      zipCode: '55487',
      phones: [
        { phone: '612-555-0961', type: 'BUSINESS', isPrimary: true },
      ],
      emails: [
        { email: 'p.holloway@hennepin.courts.mn.gov', type: 'BUSINESS', isPrimary: true },
      ],
      caseLinks: [
        { caseName: 'State v. Tyrone Jackson', role: 'PROSECUTOR' },
      ],
    },
    {
      firstName: 'Robert',
      lastName: 'Finch',
      organization: 'Minnesota Attorney General\'s Office',
      title: 'Assistant Attorney General',
      streetAddress: '445 Minnesota Street, Suite 1400',
      city: 'St. Paul',
      state: 'MN',
      zipCode: '55101',
      phones: [
        { phone: '651-555-0301', type: 'BUSINESS', isPrimary: true },
        { phone: '651-555-0305', type: 'FAX', isPrimary: false },
      ],
      emails: [
        { email: 'r.finch@ag.state.mn.us', type: 'BUSINESS', isPrimary: true },
      ],
      caseLinks: [
        { caseName: 'Peterson v. MN DOT', role: 'OPPOSING_COUNSEL' },
      ],
    },
    {
      firstName: 'Nancy',
      lastName: 'Whitfield',
      organization: 'Whitfield & Brandt Family Law',
      title: 'Partner',
      streetAddress: '7800 Metro Parkway, Suite 300',
      city: 'Shakopee',
      state: 'MN',
      zipCode: '55379',
      phones: [
        { phone: '952-555-0501', type: 'BUSINESS', isPrimary: true },
        { phone: '952-555-0510', type: 'CELLULAR', isPrimary: false },
      ],
      emails: [
        { email: 'n.whitfield@whitfieldbrandt.com', type: 'BUSINESS', isPrimary: true },
      ],
      caseLinks: [
        { caseName: 'Olson v. Olson', role: 'OPPOSING_COUNSEL' },
      ],
    },
    {
      firstName: 'Monica',
      lastName: 'Reeves',
      organization: 'Dakota County Attorney\'s Office',
      title: 'Assistant District Attorney',
      streetAddress: '1560 Highway 55',
      city: 'Hastings',
      state: 'MN',
      zipCode: '55033',
      phones: [
        { phone: '651-555-0601', type: 'BUSINESS', isPrimary: true },
      ],
      emails: [
        { email: 'm.reeves@dakota.courts.mn.gov', type: 'BUSINESS', isPrimary: true },
      ],
      caseLinks: [
        { caseName: 'State v. Brian Kowalski', role: 'PROSECUTOR' },
      ],
    },
    {
      firstName: 'Margaret',
      lastName: 'O\'Brien',
      organization: '4th Judicial District Court',
      title: 'District Court Judge',
      streetAddress: '300 South 6th Street',
      city: 'Minneapolis',
      state: 'MN',
      zipCode: '55487',
      phones: [
        { phone: '612-555-1100', type: 'COURT', isPrimary: true },
      ],
      emails: [
        { email: 'chambers.obrien@courts.mn.gov', type: 'COURT', isPrimary: true },
      ],
      caseLinks: [
        { caseName: 'State v. Marcus Thompson', role: 'JUDGE' },
        { caseName: 'State v. Karen Mitchell', role: 'JUDGE' },
        { caseName: 'State v. Roberto Alvarez', role: 'JUDGE' },
        { caseName: 'State v. Tyrone Jackson', role: 'JUDGE' },
      ],
    },
    {
      firstName: 'Richard',
      lastName: 'Paulson',
      organization: '2nd Judicial District Court',
      title: 'District Court Judge',
      streetAddress: '15 West Kellogg Blvd',
      city: 'St. Paul',
      state: 'MN',
      zipCode: '55102',
      phones: [
        { phone: '651-555-1200', type: 'COURT', isPrimary: true },
      ],
      emails: [
        { email: 'chambers.paulson@courts.mn.gov', type: 'COURT', isPrimary: true },
      ],
      caseLinks: [
        { caseName: 'State v. Deshawn Williams', role: 'JUDGE' },
        { caseName: 'State v. Angela Foster', role: 'JUDGE' },
        { caseName: 'Martinez v. Martinez', role: 'JUDGE' },
        { caseName: 'Peterson v. MN DOT', role: 'JUDGE' },
      ],
    },
    {
      firstName: 'Dr. Samuel',
      lastName: 'Whitcomb',
      organization: 'Whitcomb Forensic Associates',
      title: 'Forensic Toxicologist',
      streetAddress: '4200 West Old Shakopee Road',
      city: 'Bloomington',
      state: 'MN',
      zipCode: '55437',
      phones: [
        { phone: '952-555-0900', type: 'BUSINESS', isPrimary: true },
        { phone: '952-555-0905', type: 'CELLULAR', isPrimary: false },
      ],
      emails: [
        { email: 's.whitcomb@whitcombforensics.com', type: 'BUSINESS', isPrimary: true },
      ],
      caseLinks: [
        { caseName: 'State v. Marcus Thompson', role: 'EXPERT_WITNESS' },
        { caseName: 'State v. Roberto Alvarez', role: 'EXPERT_WITNESS' },
      ],
    },
    {
      firstName: 'Sandra',
      lastName: 'Cho',
      organization: 'Hennepin County Family Court Services',
      title: 'Guardian ad Litem',
      streetAddress: '300 South 6th Street, Suite A-600',
      city: 'Minneapolis',
      state: 'MN',
      zipCode: '55487',
      phones: [
        { phone: '612-555-0780', type: 'BUSINESS', isPrimary: true },
        { phone: '612-555-0785', type: 'CELLULAR', isPrimary: false },
      ],
      emails: [
        { email: 's.cho@hennepin.courts.mn.gov', type: 'BUSINESS', isPrimary: true },
      ],
      caseLinks: [
        { caseName: 'Martinez v. Martinez', role: 'GUARDIAN_AD_LITEM' },
      ],
    },
  ]

  for (const c of CONTACTS) {
    const contact = await prisma.contact.create({
      data: {
        firstName: c.firstName,
        lastName: c.lastName,
        organization: c.organization,
        title: c.title,
        streetAddress: c.streetAddress,
        city: c.city,
        state: c.state,
        zipCode: c.zipCode,
        phones: { create: c.phones },
        emails: { create: c.emails },
      },
    })

    for (const link of c.caseLinks) {
      const clientId = clientMap[link.caseName]
      if (clientId) {
        await prisma.caseContact.create({
          data: { clientId, contactId: contact.id, role: link.role },
        })
      }
    }
  }
  console.log(`  ${CONTACTS.length} contacts with case links`)

  // ============================================
  // FIRM SETTINGS (for SAGE document generation)
  // ============================================

  console.log('Seeding firm settings...')

  const firmSettings = [
    { key: 'firm.name', value: 'Vanmeveren Law Firm', groupName: 'firm', displayName: 'Firm Name', description: 'Law firm name for document headers', valueType: 'string' },
    { key: 'firm.address', value: '123 Legal Way, Suite 400\nMinneapolis, MN 55401', groupName: 'firm', displayName: 'Firm Address', description: 'Firm mailing address for document headers', valueType: 'string' },
    { key: 'firm.phone', value: '(612) 555-0100', groupName: 'firm', displayName: 'Firm Phone', description: 'Main firm phone number', valueType: 'string' },
    { key: 'firm.email', value: 'info@vanmeverenlawfirm.com', groupName: 'firm', displayName: 'Firm Email', description: 'Main firm email', valueType: 'string' },
    { key: 'firm.fax', value: '(612) 555-0101', groupName: 'firm', displayName: 'Firm Fax', description: 'Firm fax number', valueType: 'string' },
    { key: 'firm.attorney_name', value: 'James Vanmerven', groupName: 'firm', displayName: 'Primary Attorney', description: 'Default attorney name for document signatures', valueType: 'string' },
    { key: 'firm.bar_number', value: '0401234', groupName: 'firm', displayName: 'Bar Number', description: 'Attorney bar registration number', valueType: 'string' },
    { key: 'email.auto_cc_firm', value: 'false', groupName: 'email', displayName: 'Auto-CC Firm Email', description: 'Automatically CC the firm email on outbound emails (requires a valid M365 mailbox)', valueType: 'boolean' },
  ]

  for (const setting of firmSettings) {
    await prisma.appSetting.upsert({
      where: { key: setting.key },
      create: setting,
      update: { value: setting.value },
    })
  }
  console.log(`  ${firmSettings.length} firm settings`)

  // ============================================
  // DOCUMENT TEMPLATES (SAGE)
  // ============================================

  console.log('Seeding document templates...')

  const templates = [
    {
      name: 'Entry of Appearance',
      category: 'PLEADING',
      subcategory: 'Initial Pleading',
      jurisdiction: 'MN',
      content: `STATE OF MINNESOTA                     DISTRICT COURT

COUNTY OF {{court.county}}             {{court.division}}

State of Minnesota,
          Plaintiff,
                                        Case No. {{court.caseNumber}}
vs.
                                        ENTRY OF APPEARANCE
{{defendant.name}},
          Defendant.

TO: THE CLERK OF THE ABOVE-ENTITLED COURT AND ALL PARTIES OF RECORD:

PLEASE TAKE NOTICE that the undersigned attorney hereby enters an appearance on behalf of the Defendant, {{defendant.name}}, in the above-entitled matter.

All future correspondence, pleadings, and notices regarding this matter should be directed to the undersigned at the address below.

Dated: {{dates.today}}

Respectfully submitted,

{{attorney.firm}}


_______________________________
{{attorney.name}}
Attorney at Law
License No. {{attorney.barNumber}}
{{attorney.address}}
Telephone: {{attorney.phone}}
Email: {{attorney.email}}`,
      requiredFields: JSON.stringify(['court.county', 'court.caseNumber', 'defendant.name', 'attorney.name', 'attorney.barNumber']),
    },
    {
      name: 'Courtesy Letter to Prosecutor',
      category: 'CORRESPONDENCE',
      subcategory: 'Courtesy Notice',
      jurisdiction: 'MN',
      content: `{{attorney.firm}}
{{attorney.address}}
Telephone: {{attorney.phone}}
Facsimile: {{attorney.fax}}

{{dates.today}}

{{prosecutor.name}}
{{prosecutor.organization}}
{{prosecutor.address}}

Re: State of Minnesota v. {{defendant.name}}
    Case No. {{court.caseNumber}}
    {{case.charges}}

Dear {{prosecutor.name}}:

Please be advised that this office has been retained to represent {{defendant.name}} in the above-referenced matter. Enclosed please find a copy of our Entry of Appearance filed with the Court.

Please direct all future correspondence and discovery materials to the undersigned at the address listed above. Additionally, please refrain from any direct contact with our client regarding this matter.

We look forward to working with your office to resolve this case in a fair and efficient manner. Please do not hesitate to contact us should you wish to discuss any aspect of this case.

Very truly yours,

{{attorney.firm}}


_______________________________
{{attorney.name}}
Attorney at Law
License No. {{attorney.barNumber}}

Enclosure: Entry of Appearance

cc: {{defendant.name}}
    {{judge.fullTitle}} (via e-filing)`,
      requiredFields: JSON.stringify(['prosecutor.name', 'defendant.name', 'court.caseNumber', 'attorney.name']),
    },
    {
      name: 'Discovery Request',
      category: 'DISCOVERY',
      subcategory: 'Initial Discovery',
      jurisdiction: 'MN',
      content: `STATE OF MINNESOTA                     DISTRICT COURT

COUNTY OF {{court.county}}             {{court.division}}

State of Minnesota,
          Plaintiff,
                                        Case No. {{court.caseNumber}}
vs.
                                        DEMAND FOR DISCOVERY
{{defendant.name}},
          Defendant.

TO: {{prosecutor.name}}, {{prosecutor.organization}}:

PLEASE TAKE NOTICE that the Defendant, by and through undersigned counsel, hereby demands the following discovery pursuant to Minnesota Rules of Criminal Procedure, Rule 9.01:

1. All police reports, supplemental reports, and investigative narratives;
2. All body-worn camera and squad car video recordings;
3. All audio recordings, including 911 calls and dispatch recordings;
4. All witness statements, whether written or recorded;
5. All photographs, diagrams, and scene documentation;
6. All laboratory reports, including but not limited to drug analysis, blood alcohol, and DNA testing;
7. All surveillance video or photographic evidence;
8. All electronic evidence, including cell phone records, text messages, and social media;
9. Defendant's prior criminal record as known to the prosecution;
10. Any and all exculpatory evidence as required under Brady v. Maryland, 373 U.S. 83 (1963);
11. Any and all impeachment evidence as required under Giglio v. United States, 405 U.S. 150 (1972);
12. CAD (Computer Aided Dispatch) logs related to this incident;
13. Search warrant applications and returns, if applicable;
14. Medical records obtained by the State, if applicable;
15. Any other evidence the State intends to introduce at trial.

This demand is continuing in nature and requires supplementation as additional evidence becomes available.

Dated: {{dates.today}}

Respectfully submitted,

{{attorney.firm}}


_______________________________
{{attorney.name}}
Attorney at Law
License No. {{attorney.barNumber}}
{{attorney.address}}
Telephone: {{attorney.phone}}
Email: {{attorney.email}}`,
      requiredFields: JSON.stringify(['court.county', 'court.caseNumber', 'defendant.name', 'prosecutor.name']),
    },
    {
      name: 'Motion for Continuance',
      category: 'MOTION',
      subcategory: 'Scheduling',
      jurisdiction: 'MN',
      content: `STATE OF MINNESOTA                     DISTRICT COURT

COUNTY OF {{court.county}}             {{court.division}}

State of Minnesota,
          Plaintiff,
                                        Case No. {{court.caseNumber}}
vs.
                                        MOTION FOR CONTINUANCE
{{defendant.name}},
          Defendant.

TO: THE HONORABLE COURT AND ALL PARTIES OF RECORD:

The Defendant, {{defendant.name}}, by and through undersigned counsel, respectfully moves this Court for a continuance of the {{dates.nextHearingType}} currently scheduled for {{dates.nextHearingDate}}, and in support thereof states as follows:

1. Defense counsel was retained on or about {{dates.today}} and requires additional time to review discovery materials and prepare for the upcoming hearing.

2. [NEEDS INPUT: Specific reason for continuance — e.g., outstanding discovery, need for expert consultation, scheduling conflict, etc.]

3. This request is made in good faith and not for the purpose of delay.

4. The Defendant consents to this continuance.

WHEREFORE, the Defendant respectfully requests that this Court continue the {{dates.nextHearingType}} to a date convenient for the Court and all parties.

Dated: {{dates.today}}

Respectfully submitted,

{{attorney.firm}}


_______________________________
{{attorney.name}}
Attorney at Law
License No. {{attorney.barNumber}}
{{attorney.address}}
Telephone: {{attorney.phone}}
Email: {{attorney.email}}

CERTIFICATE OF SERVICE

I hereby certify that on {{dates.today}}, a true and correct copy of the foregoing was served upon the following by electronic filing:

{{prosecutor.name}}
{{prosecutor.organization}}
{{prosecutor.address}}


_______________________________
{{attorney.name}}`,
      requiredFields: JSON.stringify(['court.county', 'court.caseNumber', 'defendant.name', 'attorney.name']),
    },
    {
      name: 'Client Engagement Letter',
      category: 'CORRESPONDENCE',
      subcategory: 'Engagement',
      jurisdiction: 'MN',
      content: `{{attorney.firm}}
{{attorney.address}}
Telephone: {{attorney.phone}}

{{dates.today}}

{{client.primaryContactName}}
{{defendant.address}}

Re: Representation in State of Minnesota v. {{defendant.name}}
    Case No. {{court.caseNumber}}

Dear {{client.primaryContactName}}:

Thank you for retaining {{attorney.firm}} to represent you in the above-referenced criminal matter. This letter confirms the terms of our engagement.

SCOPE OF REPRESENTATION

You have retained this firm to represent you in connection with charges of {{case.charges}} ({{case.chargeStatutes}}), currently pending in {{court.name}}, Case No. {{court.caseNumber}}.

[NEEDS INPUT: Fee arrangement — flat fee, hourly rate, retainer amount]

NEXT STEPS

Your next court appearance is scheduled for {{dates.nextHearingDate}} ({{dates.nextHearingType}}). Please arrive at {{court.name}}, {{court.address}}, at least 15 minutes before the scheduled time.

In the meantime, please:
1. Do not discuss this case with anyone other than our office
2. Do not post anything about this case on social media
3. Comply with all conditions of release/bond
4. Contact our office immediately if you are contacted by law enforcement

We look forward to representing you and will keep you informed as this matter progresses.

Very truly yours,

{{attorney.firm}}


_______________________________
{{attorney.name}}
Attorney at Law

ACKNOWLEDGMENT

I have read and understand the terms of this engagement letter.

_______________________________          _______________
{{defendant.name}}                        Date`,
      requiredFields: JSON.stringify(['defendant.name', 'court.caseNumber', 'attorney.name']),
    },
  ]

  for (const t of templates) {
    const existing = await prisma.documentTemplate.findFirst({
      where: { name: t.name, category: t.category },
    })
    if (!existing) {
      await prisma.documentTemplate.create({
        data: t,
      })
    }
  }
  console.log(`  ${templates.length} document templates`)

  // ============================================
  // EMAIL TEMPLATES (ECHO Agent)
  // ============================================

  console.log('Seeding email templates...')

  const emailTemplates = [
    {
      name: 'Prosecutor Courtesy Notice',
      category: 'COURTESY',
      subject: 'Re: State v. {{client.name}} — {{case.caseNumber}} — Entry of Appearance',
      body: `Dear {{prosecutor.name}},

I am writing to advise that I have been retained to represent {{client.name}} in the above-referenced matter, Case No. {{case.caseNumber}}.

I have filed an Entry of Appearance with the Court and request that all future communications regarding this case be directed to my office at the address below.

I look forward to working with you on this matter. Please do not hesitate to contact me if you have any questions or if there are any pending matters that require immediate attention.

{{attorney.signature}}`,
    },
    {
      name: 'Discovery Request Follow-Up',
      category: 'DISCOVERY_REQUEST',
      subject: 'Re: State v. {{client.name}} — {{case.caseNumber}} — Discovery Request',
      body: `Dear {{prosecutor.name}},

I am writing regarding discovery in the above-referenced matter. I respectfully request the following materials be provided at your earliest convenience:

1. All police reports and supplemental reports
2. Body camera and dash camera footage
3. Witness statements and interview recordings
4. Lab results and forensic reports
5. Any exculpatory material pursuant to Brady v. Maryland

The next hearing in this matter is currently scheduled for {{dates.nextHearingDate}}. Timely receipt of these materials will allow us to proceed efficiently.

Thank you for your cooperation.

{{attorney.signature}}`,
    },
    {
      name: 'Hearing Scheduling Request',
      category: 'SCHEDULING',
      subject: 'Re: State v. {{client.name}} — {{case.caseNumber}} — Scheduling',
      body: `Dear {{prosecutor.name}},

I am writing regarding scheduling in the above-referenced matter. I would like to discuss available dates for the {{dates.nextHearingType}} hearing.

Would you be available for a brief call to coordinate schedules before we contact the Court? I can be reached at {{attorney.phone}} or via email at {{attorney.email}}.

Thank you for your time.

{{attorney.signature}}`,
    },
    {
      name: 'General Follow-Up',
      category: 'FOLLOW_UP',
      subject: 'Re: State v. {{client.name}} — {{case.caseNumber}}',
      body: `Dear {{prosecutor.name}},

I am following up on our previous correspondence regarding the above-referenced matter.

[NEEDS INPUT: Specific follow-up details]

Please let me know if you have any questions or would like to discuss further.

{{attorney.signature}}`,
    },
  ]

  for (const t of emailTemplates) {
    const existing = await prisma.emailTemplate.findFirst({
      where: { name: t.name, category: t.category },
    })
    if (!existing) {
      await prisma.emailTemplate.create({
        data: t,
      })
    }
  }
  console.log(`  ${emailTemplates.length} email templates`)

  console.log('Seed completed!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
