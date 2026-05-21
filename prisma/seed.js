const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
    console.log('Starting database seed...');

    // Create Articulate Global vendor
    const vendor = await prisma.vendor.upsert({
        where: { id: 'articulate-global-001' },
        update: {},
        create: {
            id: 'articulate-global-001',
            name: 'Articulate Global',
            legalName: 'Articulate Global, Inc.',
            website: 'https://articulate.com',
            industry: 'Software / E-Learning',
            country: 'United States',
            stateProvince: 'NY',
            businessOwner: 'Sleep Number L&D',
            status: 'ACTIVE'
        }
    });
    console.log('Created vendor:', vendor.name);

    // Create Risk Profile
    const riskProfile = await prisma.riskProfile.upsert({
        where: { id: 'articulate-risk-profile-001' },
        update: {},
        create: {
            id: 'articulate-risk-profile-001',
            vendorId: vendor.id,
            riskTier: 'MEDIUM',
            overallRiskScore: 68,
            dataSensitivityLevel: 'Moderate',
            dataTypesAccessed: JSON.stringify(['Employee Training Records', 'Course Completion Data', 'User Authentication Data']),
            systemIntegrations: JSON.stringify(['SSO/SAML', 'SCORM/xAPI LMS Integration']),
            hasPiiAccess: true,
            hasPhiAccess: false,
            hasPciAccess: false,
            businessCriticality: 'IMPORTANT',
            assessmentFrequency: 'Annual',
            calculatedBy: 'VERA'
        }
    });
    console.log('Created risk profile');

    // Create Risk Assessment
    const assessment = await prisma.riskAssessment.upsert({
        where: { id: 'articulate-assessment-2026' },
        update: {},
        create: {
            id: 'articulate-assessment-2026',
            vendorId: vendor.id,
            riskProfileId: riskProfile.id,
            assessmentType: 'ANNUAL',
            assessmentStatus: 'COMPLETE',
            assessedBy: 'AI TPRM Machine (CARA)',
            assessmentDate: new Date('2026-03-05'),
            securityRiskScore: 3,
            operationalRiskScore: 2,
            complianceRiskScore: 2,
            financialRiskScore: 2,
            reputationalRiskScore: 2,
            overallAssessmentScore: 68,
            riskRating: 'MEDIUM',
            summary: 'Articulate Global demonstrates strong security posture with SOC 2 Type 2 certification and comprehensive penetration testing. Minor gaps identified in BC/DR and IR test documentation.',
            recommendations: 'Conditional approval recommended pending receipt of BC/DR test results and IR testing evidence within 30 days.'
        }
    });
    console.log('Created risk assessment');

    // Create Documents
    const documents = [
        {
            id: 'doc-soc2-2025',
            vendorId: vendor.id,
            documentType: 'SOC2_TYPE2',
            documentName: 'Articulate SOC 2 Type 2 Report 2025',
            documentDate: new Date('2025-08-01'),
            expirationDate: new Date('2026-08-01'),
            status: 'ANALYZED',
            retrievedBy: 'DORA',
            analysisResult: 'Unqualified opinion with no exceptions noted'
        },
        {
            id: 'doc-pentest-2025',
            vendorId: vendor.id,
            documentType: 'PENTEST',
            documentName: 'Mandiant Penetration Test Report 2025',
            documentDate: new Date('2025-05-15'),
            status: 'ANALYZED',
            retrievedBy: 'DORA',
            analysisResult: 'No open Critical or High findings; 2 informational findings outstanding'
        },
        {
            id: 'doc-bridgeletter-2025',
            vendorId: vendor.id,
            documentType: 'OTHER',
            documentName: 'SOC 2 Bridge Letter',
            documentDate: new Date('2025-12-01'),
            status: 'ANALYZED',
            retrievedBy: 'DORA',
            analysisResult: 'Bridge letter provides gap coverage between SOC 2 reporting periods'
        }
    ];

    for (const doc of documents) {
        await prisma.document.upsert({
            where: { id: doc.id },
            update: {},
            create: doc
        });
    }
    console.log('Created documents');

    // Create Risk Findings
    const findings = [
        {
            id: 'finding-ag-2026-001',
            findingId: 'AG-2026-001',
            vendorId: vendor.id,
            assessmentId: assessment.id,
            findingCategory: 'Data Security',
            severity: 'MEDIUM',
            title: 'Multiple AI Service Integrations',
            description: 'Integration with OpenAI and DeepL AI services may expose sensitive data',
            recommendation: 'Verify data handling agreements and ensure no PII/PHI is processed by AI services',
            identifiedBy: 'AI TPRM Machine (CARA)',
            identifiedDate: new Date('2026-03-05'),
            status: 'OPEN'
        },
        {
            id: 'finding-ag-2026-002',
            findingId: 'AG-2026-002',
            vendorId: vendor.id,
            assessmentId: assessment.id,
            findingCategory: 'Operational',
            severity: 'LOW',
            title: 'Complex Multi-Cloud Architecture',
            description: 'AWS primary with GCP integration increases operational complexity',
            recommendation: 'Request cloud governance documentation and disaster recovery procedures',
            identifiedBy: 'AI TPRM Machine (CARA)',
            identifiedDate: new Date('2026-03-05'),
            status: 'OPEN'
        },
        {
            id: 'finding-ag-2026-003',
            findingId: 'AG-2026-003',
            vendorId: vendor.id,
            assessmentId: assessment.id,
            findingCategory: 'Supply Chain',
            severity: 'MEDIUM',
            title: 'Extensive Third-Party Integration Ecosystem',
            description: 'Large number of integrated services (Stripe, Salesforce, Snowflake, etc.) increases supply chain risk',
            recommendation: "Request vendor's third-party risk management program documentation",
            identifiedBy: 'AI TPRM Machine (CARA)',
            identifiedDate: new Date('2026-03-05'),
            status: 'OPEN'
        },
        {
            id: 'finding-ag-2026-004',
            findingId: 'AG-2026-004',
            vendorId: vendor.id,
            assessmentId: assessment.id,
            findingCategory: 'Compliance',
            severity: 'INFORMATIONAL',
            title: 'Bridge Letter Gap Coverage',
            description: 'Bridge letter is available for gap coverage between SOC 2 reporting periods. The most recent SOC 2 Type 2 report received an unqualified opinion with no exceptions noted.',
            recommendation: 'Continue annual SOC 2 review; bridge letter provides adequate coverage for any gap periods',
            identifiedBy: 'AI TPRM Machine (CARA)',
            identifiedDate: new Date('2026-03-05'),
            status: 'CLOSED'
        },
        {
            id: 'finding-ag-2026-005',
            findingId: 'AG-2026-005',
            vendorId: vendor.id,
            assessmentId: assessment.id,
            findingCategory: 'Application Security',
            severity: 'INFORMATIONAL',
            title: 'Historical Critical XSS Vulnerability (Remediated)',
            description: 'Mandiant identified a critical Cross-Site Scripting vulnerability (CVSS 8.8) in March-April 2025 that could enable full account takeover with a single malicious link click.',
            recommendation: 'Continue to monitor for regression; request evidence of secure development lifecycle practices',
            identifiedBy: 'AI TPRM Machine (CARA)',
            identifiedDate: new Date('2026-03-05'),
            status: 'CLOSED'
        },
        {
            id: 'finding-ag-2026-006',
            findingId: 'AG-2026-006',
            vendorId: vendor.id,
            assessmentId: assessment.id,
            findingCategory: 'Application Security',
            severity: 'LOW',
            title: 'Informational Pentest Findings Outstanding',
            description: 'Two informational findings remain open: Unauthenticated API Endpoint (WEB-I-02) and Outdated JavaScript Libraries (WEB-I-03)',
            recommendation: 'Request remediation timeline and evidence of closure',
            identifiedBy: 'AI TPRM Machine (CARA)',
            identifiedDate: new Date('2026-03-05'),
            status: 'OPEN'
        },
        {
            id: 'finding-ag-2026-007',
            findingId: 'AG-2026-007',
            vendorId: vendor.id,
            assessmentId: assessment.id,
            findingCategory: 'Business Continuity / Disaster Recovery',
            severity: 'MEDIUM',
            title: 'BC/DR Test Results Not Provided',
            description: 'No Business Continuity or Disaster Recovery test results were provided as part of this assessment. Evidence of actual test execution was not included in the documentation package.',
            recommendation: 'Request BC/DR test report (or executive summary) with date of execution, test methodology, RTO/RPO targets achieved, and remediation status within 30 days',
            identifiedBy: 'AI TPRM Machine (CARA)',
            identifiedDate: new Date('2026-03-05'),
            status: 'OPEN',
            dueDate: new Date('2026-04-05')
        },
        {
            id: 'finding-ag-2026-008',
            findingId: 'AG-2026-008',
            vendorId: vendor.id,
            assessmentId: assessment.id,
            findingCategory: 'Security Operations / Incident Response',
            severity: 'MEDIUM',
            title: 'Incident Response Testing Evidence Not Provided',
            description: 'No evidence of Incident Response (IR) testing was provided as part of this assessment. No documentation of IR Plan, tabletop exercises, drill results, or MTTD/MTTR metrics.',
            recommendation: 'Request IR test results (or executive summary) with IR plan summary, test scenarios, and MTTD/MTTR metrics within 30 days',
            identifiedBy: 'AI TPRM Machine (CARA)',
            identifiedDate: new Date('2026-03-05'),
            status: 'OPEN',
            dueDate: new Date('2026-04-05')
        }
    ];

    for (const finding of findings) {
        await prisma.riskFinding.upsert({
            where: { id: finding.id },
            update: {},
            create: finding
        });
    }
    console.log('Created', findings.length, 'findings');

    // Create Report record
    await prisma.report.upsert({
        where: { id: 'report-articulate-2026' },
        update: {},
        create: {
            id: 'report-articulate-2026',
            vendorId: vendor.id,
            assessmentId: assessment.id,
            reportType: 'DETAILED_ASSESSMENT',
            reportName: 'Articulate Global TPRM Assessment Report - March 2026',
            generatedBy: 'AI TPRM Machine (RITA)',
            generatedDate: new Date('2026-03-05'),
            filePath: 'reports/Articulate-Global-TPRM-Assessment.docx',
            status: 'APPROVED'
        }
    });

    await prisma.report.upsert({
        where: { id: 'report-articulate-exec-2026' },
        update: {},
        create: {
            id: 'report-articulate-exec-2026',
            vendorId: vendor.id,
            assessmentId: assessment.id,
            reportType: 'EXECUTIVE_SUMMARY',
            reportName: 'Articulate Global Executive Summary - March 2026',
            generatedBy: 'AI TPRM Machine (RITA)',
            generatedDate: new Date('2026-03-05'),
            filePath: 'reports/Articulate-Global-Executive-Summary.docx',
            status: 'APPROVED'
        }
    });
    console.log('Created reports');

    console.log('Database seed completed successfully!');
}

main()
    .catch((e) => {
        console.error('Error seeding database:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
