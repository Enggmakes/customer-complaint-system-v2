import { createSlice } from '@reduxjs/toolkit';

export const WORKSPACES = {
  ecommerce: {
    id: 'ecommerce',
    name: 'E-Commerce & Retail',
    tagline: 'Order returns, damaged goods, delivery tracking, customer support & refunds',
    color: '#2563eb',
    gradient: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)',
    badge: 'Retail & E-Commerce',
    iconKey: 'ShoppingBag',
    labels: {
      client: 'Customer / Buyer Name',
      item: 'Product / Item Name',
      id: 'Order # / Tracking ID',
      qty: 'Quantity / Units',
      date1: 'Order / Purchase Date',
      date2: 'Delivery / Return Deadline',
      category: 'Support Category',
      site: 'Fulfillment Center / Warehouse',
      npm: 'Packaging & Courier Carrier',
      summary: 'Issue / Return Summary',
      eval: 'Impact & Refund Assessment',
      action: 'Next Action & Resolution',
    },
    samplePrompts: [
      {
        type: 'issue',
        title: 'Damaged Product in Transit',
        text: 'Customer Alex Rivera reported receiving a shattered Ceramic Espresso Set from Order #AMZ-99410. Package arrived crushed with box torn. Please log high priority replacement request.',
      },
      {
        type: 'service_request',
        title: 'VIP Return & Store Credit Request',
        text: 'Client Sophia Chen requesting an expedited size exchange & return label for Nordic Wool Coat (Size M to L), Order #NO-88210. Expedited 2-day delivery needed.',
      },
    ],
  },
  tech_saas: {
    id: 'tech_saas',
    name: 'Tech, IT & SaaS',
    tagline: 'Bug reports, crash logs, API latency, feature requests & SLA support',
    color: '#4f46e5',
    gradient: 'linear-gradient(135deg, #312e81 0%, #4338ca 100%)',
    badge: 'Tech & SaaS',
    iconKey: 'Laptop',
    labels: {
      client: 'Client / User / Organization',
      item: 'Software / Module / Microservice',
      id: 'Ticket # / PR / Error Code',
      qty: 'Affected Users / Workloads',
      date1: 'Incident / Deployment Date',
      date2: 'SLA Target Resolution',
      category: 'Incident Category',
      site: 'Cluster / Server Region',
      npm: 'Tech Stack / Dependencies',
      summary: 'Technical Scope & RCA',
      eval: 'Severity & SLA Risk Assessment',
      action: 'Engineering Mitigation Plan',
    },
    samplePrompts: [
      {
        type: 'issue',
        title: 'Production API 500 Spike',
        text: 'SaaS Client Stripe Connect webhook throwing 500 Internal Server Errors for user auth on us-east-1 cluster. Ticket #INC-4402. Affecting ~450 active enterprise sessions.',
      },
      {
        type: 'service_request',
        title: 'Custom Single Sign-On (SSO) Integration',
        text: 'Enterprise Client Acme Corp requesting Okta SAML 2.0 SSO integration and role-based access audit for 1,200 seats. Target completion within 10 business days.',
      },
    ],
  },
  services_freelance: {
    id: 'services_freelance',
    name: 'Services & Freelance Agency',
    tagline: 'Client proposals, project scope briefs, quotations, work orders & contracts',
    color: '#059669',
    gradient: 'linear-gradient(135deg, #064e3b 0%, #059669 100%)',
    badge: 'Agency & Services',
    iconKey: 'Briefcase',
    labels: {
      client: 'Client / Business Name',
      item: 'Project / Service Offering',
      id: 'Proposal # / Contract Ref',
      qty: 'Estimated Hours / Budget',
      date1: 'Project Kickoff Date',
      date2: 'Final Delivery Deadline',
      category: 'Service / Engagement Type',
      site: 'Assigned Creative / Tech Unit',
      npm: 'Key Deliverables & Milestones',
      summary: 'Scope of Work Summary',
      eval: 'Feasibility & Commercial Review',
      action: 'Client Onboarding & Next Steps',
    },
    samplePrompts: [
      {
        type: 'service_request',
        title: 'Full-Stack Web App Development Quote',
        text: 'Client Marcus Vance from Apex Studio wants a full-stack React + FastAPI dashboard with Stripe subscription billing, responsive mobile UI, and AI chat copilot. Budget $4,500 with delivery in 3 weeks.',
      },
      {
        type: 'issue',
        title: 'Scope Creep & Milestone Revision',
        text: 'Client Lumina Design added 6 new unbudgeted page revisions to Contract #PRJ-8092. Requesting formal change order and revised milestone schedule.',
      },
    ],
  },
  healthcare_pharma: {
    id: 'healthcare_pharma',
    name: 'Healthcare & Pharma QMS',
    tagline: 'Batch defects, adverse events, patient feedback, clinic orders & GMP compliance',
    color: '#0284c7',
    gradient: 'linear-gradient(135deg, #075985 0%, #0284c7 100%)',
    badge: 'Pharma & Healthcare',
    iconKey: 'Activity',
    labels: {
      client: 'Pharmacy / Hospital / Patient',
      item: 'Drug / Medical Product',
      id: 'Batch / Lot Number',
      qty: 'Affected Quantity',
      date1: 'Manufacturing Date',
      date2: 'Expiry Date',
      category: 'Defect / Event Category',
      site: 'Manufacturing Site / Block',
      npm: 'Impacted Packaging (NPM)',
      summary: 'Formal QMS Defect Summary',
      eval: 'Initial Risk Assessment',
      action: 'QA Action & CAPA Plan',
    },
    samplePrompts: [
      {
        type: 'issue',
        title: 'Discolored Capsules Defect',
        text: 'Apollo Pharmacy reported discolored capsules in Amoxicillin Capsules 500 mg. Batch number AMX240602. Mfg date March 2026. Expiry date February 2028. 12 capsules affected in a sealed bottle.',
      },
      {
        type: 'service_request',
        title: 'Bulk Clinic Supply & Quality Certificate',
        text: 'City Health Clinic requesting bulk procurement of 500 vials of Ciprofloxacin Infusion with batch certificate of analysis (CoA) and cold-chain temperature logs.',
      },
    ],
  },
  manufacturing: {
    id: 'manufacturing',
    name: 'Manufacturing & Supply Chain',
    tagline: 'Assembly line breakdowns, raw material defects, vendor audits & maintenance',
    color: '#b45309',
    gradient: 'linear-gradient(135deg, #78350f 0%, #b45309 100%)',
    badge: 'Manufacturing & Plants',
    iconKey: 'Factory',
    labels: {
      client: 'Supplier / Plant / Customer',
      item: 'Component / Material / SKU',
      id: 'Batch # / Work Order #',
      qty: 'Defective Units / Tonnage',
      date1: 'Production Run Date',
      date2: 'Delivery / Inspection Due',
      category: 'Failure / Defect Mode',
      site: 'Plant / Line / Workstation',
      npm: 'Sub-Assembly / Sensor / Material',
      summary: 'Industrial Defect Summary',
      eval: 'Operational & Safety Impact',
      action: 'Corrective Action Plan',
    },
    samplePrompts: [
      {
        type: 'issue',
        title: 'Hydraulic Seal Failure on Line 2',
        text: 'Plant Supervisor reported hydraulic oil leakage on CNC Milling Station (Line 2). Batch #MFG-7719. 40 aluminum casing units contaminated. Requires immediate maintenance dispatch.',
      },
      {
        type: 'service_request',
        title: 'Preventative Maintenance & Calibration',
        text: 'Automotive Supplier requesting quarterly precision sensor calibration and robotic arm torque audit for Assembly Station 4 before next high-volume shift.',
      },
    ],
  },
  general: {
    id: 'general',
    name: 'Universal Business Operations',
    tagline: 'General business tasks, multi-purpose inquiries, contract reviews & automation',
    color: '#4f46e5',
    gradient: 'linear-gradient(135deg, #312e81 0%, #4338ca 100%)',
    badge: 'Universal Operations',
    iconKey: 'Globe',
    labels: {
      client: 'Contact / Stakeholder Name',
      item: 'Subject / Project / Topic',
      id: 'Reference / Invoice / ID',
      qty: 'Scope / Value / Units',
      date1: 'Start / Incident Date',
      date2: 'Deadline / Due Date',
      category: 'Topic / Category',
      site: 'Department / Location',
      npm: 'Deliverables & Resources',
      summary: 'Executive Summary',
      eval: 'Strategic Evaluation',
      action: 'Recommended Action',
    },
    samplePrompts: [
      {
        type: 'service_request',
        title: 'Contract Review & Summary',
        text: 'Client Elena Gilbert provided Master Services Agreement #MSA-2026-90 for SaaS marketing licensing. Requesting executive summary of liability clauses and SLA commitments.',
      },
      {
        type: 'issue',
        title: 'Billing Dispute & Rate Adjustment',
        text: 'Customer Jonathan Gray reported invoice discrepancy on monthly consulting statement #INV-3321. Requesting credit note adjustment of $400 for rescheduled sessions.',
      },
    ],
  },
};

const savedWorkspace = localStorage.getItem('omniflow_active_workspace') || 'general';
const savedRecordType = localStorage.getItem('omniflow_active_record_type') || 'issue';

const initialState = {
  activeWorkspace: WORKSPACES[savedWorkspace] ? savedWorkspace : 'general',
  activeRecordType: savedRecordType, // 'issue' | 'service_request' | 'proposal' | 'inquiry'
  workspaces: WORKSPACES,
};

const workspaceSlice = createSlice({
  name: 'workspace',
  initialState,
  reducers: {
    setWorkspace: (state, action) => {
      if (state.workspaces[action.payload]) {
        state.activeWorkspace = action.payload;
        localStorage.setItem('omniflow_active_workspace', action.payload);
      }
    },
    setRecordType: (state, action) => {
      state.activeRecordType = action.payload;
      localStorage.setItem('omniflow_active_record_type', action.payload);
    },
  },
});

export const { setWorkspace, setRecordType } = workspaceSlice.actions;
export default workspaceSlice.reducer;
