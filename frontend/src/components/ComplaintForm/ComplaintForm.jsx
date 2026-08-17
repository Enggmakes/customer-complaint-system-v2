import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Sparkles, Copy, Check, Zap, AlertCircle, Briefcase, FileText, HelpCircle, ArrowRight } from 'lucide-react';
import { updateFormField, commitComplaint } from '../../store/complaintsSlice';
import { setRecordType } from '../../store/workspaceSlice';
import { addToast } from '../../store/uiSlice';

// ─── Dynamic Config per Record Type ──────────────────────────────────────────

const RECORD_TYPE_CONFIG = {
  issue: {
    id: 'issue',
    badge: 'Incident & Defect',
    color: '#ef4444',
    bg: 'rgba(239, 68, 68, 0.1)',
    border: 'rgba(239, 68, 68, 0.3)',
    title: 'Log Issue or Defect',
    sections: {
      s1: '1. Customer & Intake Channel',
      s2: '2. Defective Product / SKU & Batch Details',
      s3: '3. Originating Site & Impacted Components',
      s4: '4. Root Cause Analysis & Severity Triage',
      draftTitle: 'Customer Resolution & Apology Draft',
    },
    labels: {
      source: 'Intake Channel (e.g. Email, Portal, Call)',
      client: 'Customer / Client Name',
      item: 'Product / Item / SKU',
      tier: 'Variant / Model / Strength',
      id: 'Order # / Batch # / Ticket #',
      qty: 'Affected Quantity / Defect Units',
      date1: 'Purchase / Manufacturing Date',
      date2: 'Incident / Expiry Date',
      site: 'Manufacturing Site / Fulfillment Hub',
      npm: 'Impacted Packaging / Sub-Components',
      category: 'Defect / Failure Category',
      desc: 'Customer Problem Description',
      summary: 'Executive Defect Summary',
      evalLabel: 'AI Root Cause & Severity Assessment',
      actionLabel: 'Immediate Mitigation & CAPA Plan',
    },
    placeholders: {
      source: 'e.g. Support Portal, Customer Email...',
      client: 'e.g. Alex Rivera, Apollo Pharmacy...',
      item: 'e.g. Wireless Headphones, Amoxicillin 500mg...',
      tier: 'e.g. Pro Edition, Batch A-2...',
      id: 'e.g. ORD-99120, AMX240602...',
      qty: 'e.g. 1 unit, 12 capsules, 40 items...',
      date1: 'e.g. March 2026',
      date2: 'e.g. Within 14 Days, Feb 2028',
      site: 'e.g. Warehouse East, Block A Manufacturing...',
      npm: 'e.g. Primary packaging, Courier box...',
      category: 'e.g. Damaged in Transit, Particulate, Leak...',
      desc: 'Describe what broke, failed, or was reported defective...',
      summary: 'AI synthesis of the issue and impacted components...',
      eval: 'AI evaluation of severity, safety, and business risk...',
      action: 'e.g. Quarantine batch, issue immediate refund...',
      draft: 'AI will craft a courteous apology and resolution plan for the customer...',
    },
    commitLabel: 'Commit to Ledger as Operational Issue',
  },
  service_request: {
    id: 'service_request',
    badge: 'Service Request',
    color: '#3b82f6',
    bg: 'rgba(59, 130, 246, 0.1)',
    border: 'rgba(59, 130, 246, 0.3)',
    title: 'Log Service Request',
    sections: {
      s1: '1. Client & Requester Details',
      s2: '2. Requested Service, Budget & Timeline',
      s3: '3. Assigned Department & Core Deliverables',
      s4: '4. Scope Feasibility & SLA Evaluation',
      draftTitle: 'Service Scope & Next Steps Draft',
    },
    labels: {
      source: 'Service Request Channel',
      client: 'Client / Organization Name',
      item: 'Requested Service / Project Name',
      tier: 'Service Tier / Technology Stack',
      id: 'Work Order # / Ticket Ref #',
      qty: 'Allocated Budget / Estimated Hours',
      date1: 'Target Start / Kickoff Date',
      date2: 'Target Completion / Delivery Deadline',
      site: 'Assigned Engineering / Service Team',
      npm: 'Key Deliverables & Specifications',
      category: 'Service Category (e.g. Development, Maintenance)',
      desc: 'Detailed Client Service Brief & Requirements',
      summary: 'Service Scope Summary',
      evalLabel: 'AI Feasibility & Resource Assessment',
      actionLabel: 'Client Onboarding & Kickoff Steps',
    },
    placeholders: {
      source: 'e.g. Client Intake Form, Referral, Inbound...',
      client: 'e.g. Marcus Vance, Apex Studio Inc...',
      item: 'e.g. Full-Stack Web App, Cloud Migration...',
      tier: 'e.g. React + FastAPI, Enterprise Tier...',
      id: 'e.g. SR-4402, WO-2026-90...',
      qty: 'e.g. $4,500, 60 Estimated Hours...',
      date1: 'e.g. Next Monday, March 2026',
      date2: 'e.g. 3 Weeks, April 15 2026',
      site: 'e.g. Digital Engineering Studio, Team Alpha...',
      npm: 'e.g. UI Components, Stripe Billing, CI/CD...',
      category: 'e.g. Custom Web App, API Integration...',
      desc: 'Describe what features, integrations, or services the client requested...',
      summary: 'AI summary of scope, timeline, and milestone commitments...',
      eval: 'AI evaluation of technical feasibility, budget, and staffing...',
      action: 'e.g. Schedule discovery call, draft formal quote...',
      draft: 'AI will craft a clear project scope estimate and next-steps email...',
    },
    commitLabel: 'Commit to Ledger as Service Request',
  },
  proposal: {
    id: 'proposal',
    badge: 'Proposal & Quote',
    color: '#10b981',
    bg: 'rgba(16, 185, 129, 0.1)',
    border: 'rgba(16, 185, 129, 0.3)',
    title: 'Draft Project Proposal',
    sections: {
      s1: '1. Prospective Client & Business Lead',
      s2: '2. Project Specifications & Commercial Pricing',
      s3: '3. Delivery Studio & Milestone Roadmap',
      s4: '4. Commercial Feasibility & Terms Assessment',
      draftTitle: 'Executive Proposal Document Draft',
    },
    labels: {
      source: 'Lead / RFP Channel',
      client: 'Client / Enterprise Prospect',
      item: 'Project / Solution Name',
      tier: 'Engagement Model (Fixed / Retainer / T&M)',
      id: 'Proposal # / Quotation Ref #',
      qty: 'Total Contract Value / Estimated Cost',
      date1: 'Proposal Issue Date',
      date2: 'Proposal Validity / Milestone Due',
      site: 'Lead Delivery Studio / Unit',
      npm: 'Milestone Deliverables & Acceptance Criteria',
      category: 'Commercial Engagement Category',
      desc: 'Client RFP Requirements & Statement of Work',
      summary: 'Executive Proposal Scope',
      evalLabel: 'AI Commercial Viability & Margin Review',
      actionLabel: 'Contract Finalization & Signing Steps',
    },
    placeholders: {
      source: 'e.g. RFP Portal, Inbound Pitch...',
      client: 'e.g. Lumina Design, Horizon Corp...',
      item: 'e.g. Enterprise CRM Redesign, Mobile Suite...',
      tier: 'e.g. Fixed Price Milestone, Retainer...',
      id: 'e.g. PROP-8820, QT-2026-11...',
      qty: 'e.g. $12,500, 120 Total Hours...',
      date1: 'e.g. Today, March 2026',
      date2: 'e.g. Valid 30 Days, Q2 2026',
      site: 'e.g. Enterprise Solutions Division...',
      npm: 'e.g. Phase 1 Wireframes, Phase 2 MVP, Phase 3 Launch...',
      category: 'e.g. Fixed Scope Turnkey Project...',
      desc: 'Outline the commercial terms, key deliverables, and client goals...',
      summary: 'AI executive summary of proposal terms and deliverables...',
      eval: 'AI commercial assessment of margin, delivery risk, and timeline...',
      action: 'e.g. Deliver proposal deck, schedule contract signing...',
      draft: 'AI will craft a compelling commercial proposal and executive brief...',
    },
    commitLabel: 'Commit to Ledger as Commercial Proposal',
  },
  inquiry: {
    id: 'inquiry',
    badge: 'Inquiry & Advisory',
    color: '#8b5cf6',
    bg: 'rgba(139, 92, 246, 0.1)',
    border: 'rgba(139, 92, 246, 0.3)',
    title: 'Process Inquiry / Consultation',
    sections: {
      s1: '1. Inquirer & Communication Channel',
      s2: '2. Topic, Subject & Urgency Level',
      s3: '3. Routing Department & Knowledge Domain',
      s4: '4. AI Inquiry Triage & Advisory Analysis',
      draftTitle: 'Professional Advisory Response Draft',
    },
    color: '#8b5cf6',
    bg: 'rgba(139, 92, 246, 0.1)',
    border: 'rgba(139, 92, 246, 0.3)',
    title: 'Process Inquiry / Consultation',
    sections: {
      s1: '1. Inquirer & Communication Channel',
      s2: '2. Topic, Subject & Urgency Level',
      s3: '3. Routing Department & Knowledge Domain',
      s4: '4. AI Inquiry Triage & Advisory Analysis',
      draftTitle: 'Auto-Generated Professional Advisory Response Draft',
    },
    labels: {
      source: 'Inquiry Source (e.g. Contact Form, Chat)',
      client: 'Contact / Inquirer Name',
      item: 'Subject Matter / Topic of Interest',
      tier: 'Inquiry Urgency / Tier',
      id: 'Inquiry Case # / Reference ID',
      qty: 'Scope / Value / Units of Interest',
      date1: 'Inquiry Submission Date',
      date2: 'Target Response Date',
      site: 'Responsible Department / Specialist Unit',
      npm: 'Requested Information & Supporting Docs',
      category: 'Inquiry Category (Sales, Tech, Policy)',
      desc: 'Detailed Question or Information Request',
      summary: 'Inquiry Summary & Key Questions',
      evalLabel: 'AI Advisory Insight & Context Review',
      actionLabel: 'Recommended Follow-Up & Consultation Plan',
    },
    placeholders: {
      source: 'e.g. Website Contact Form, Live Chat...',
      client: 'e.g. Elena Gilbert, Dr. Robert Chen...',
      item: 'e.g. Enterprise Licensing, API Security Policy...',
      tier: 'e.g. High Priority, VIP Account...',
      id: 'e.g. INQ-1049, CS-9901...',
      qty: 'e.g. 50 Seats, 1 Site, General...',
      date1: 'e.g. Today, March 2026',
      date2: 'e.g. Within 24 Hours',
      site: 'e.g. Client Solutions, Technical Support...',
      npm: 'e.g. Security Whitepaper, Pricing Sheet...',
      category: 'e.g. Pricing & Custom Plan Inquiry...',
      desc: 'Detail the questions asked by the prospect or client...',
      summary: 'AI summary of the core question and needed answers...',
      eval: 'AI assessment of opportunity size, technical depth, and routing...',
      action: 'e.g. Send documentation, schedule sales demo...',
      draft: 'AI will draft a thorough, helpful, and professional advisory response...',
    },
    commitLabel: 'Commit to Ledger as Inquiry Record',
  },
};

export default function ComplaintForm() {
  const dispatch = useDispatch();
  const form = useSelector((state) => state.complaints.currentForm);
  const formStatus = useSelector((state) => state.complaints.formStatus);
  const commitStatus = useSelector((state) => state.complaints.commitStatus);
  const session_id = useSelector((state) => state.chat.session_id);

  const { activeWorkspace, activeRecordType, workspaces } = useSelector((state) => state.workspace);
  const currentWs = workspaces[activeWorkspace] || workspaces.general;

  // Active record type configuration
  const currentTypeKey = form.record_type || activeRecordType || 'issue';
  const typeConfig = RECORD_TYPE_CONFIG[currentTypeKey] || RECORD_TYPE_CONFIG.issue;
  const labels = typeConfig.labels;
  const placeholders = typeConfig.placeholders;
  const sections = typeConfig.sections;

  const [copiedDraft, setCopiedDraft] = useState(false);

  const handleChange = (field) => (e) => {
    dispatch(updateFormField({ field, value: e.target.value }));
  };

  const handleTypeChange = (type) => {
    dispatch(setRecordType(type));
    dispatch(updateFormField({ field: 'record_type', value: type }));
    const cfg = RECORD_TYPE_CONFIG[type];
    dispatch(addToast({
      type: 'info',
      message: `Switched form mode to ${cfg ? cfg.badge : type}`,
    }));
  };

  const handleCopyDraft = () => {
    if (!form.response_draft) return;
    navigator.clipboard.writeText(form.response_draft);
    setCopiedDraft(true);
    dispatch(addToast({ type: 'success', message: 'Response draft copied to clipboard!' }));
    setTimeout(() => setCopiedDraft(false), 2000);
  };

  const isAIFilled = (val) => val && val !== '' && !val.includes('Awaiting');

  const getSeverityClass = (severity) => {
    if (!severity) return '';
    return severity.toLowerCase();
  };

  const handleCommit = async () => {
    if (!session_id) {
      dispatch(addToast({ type: 'error', message: 'No active session. Please submit details first.' }));
      return;
    }
    try {
      const payload = {
        ...form,
        workspace: activeWorkspace,
        record_type: currentTypeKey,
      };
      await dispatch(commitComplaint({ session_id, complaint_data: payload })).unwrap();
      dispatch(addToast({ type: 'success', message: `Committed to Universal Ledger as ${typeConfig.badge}!` }));
    } catch (err) {
      dispatch(addToast({ type: 'error', message: `Commit failed: ${err}` }));
    }
  };

  const isReady = formStatus === 'ready_to_commit';
  const isCommitted = formStatus === 'committed';

  return (
    <div className="form-panel">
      {/* Workspace Banner & Record Type Selector */}
      <div
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-xl)',
          padding: '16px',
          marginBottom: '16px',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span
              className="workspace-banner-pill"
              style={{ background: currentWs.gradient }}
            >
              {currentWs.badge}
            </span>
            <span style={{ fontSize: 12, color: 'var(--color-text-secondary)', fontWeight: 500 }}>
              {currentWs.tagline}
            </span>
          </div>

          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              padding: '3px 8px',
              borderRadius: '6px',
              background: typeConfig.bg,
              color: typeConfig.color,
              border: `1px solid ${typeConfig.border}`,
            }}
          >
            {typeConfig.badge}
          </span>
        </div>

        {/* Record Type Segmented Toggle */}
        <div className="record-type-toggle-group">
          <button
            type="button"
            className={`record-type-pill ${currentTypeKey === 'issue' ? 'active' : ''}`}
            onClick={() => handleTypeChange('issue')}
            style={currentTypeKey === 'issue' ? { color: '#ef4444', borderColor: '#ef4444' } : {}}
          >
            <AlertCircle size={13} color={currentTypeKey === 'issue' ? '#ef4444' : 'currentColor'} />
            Issue / Complaint
          </button>
          <button
            type="button"
            className={`record-type-pill ${currentTypeKey === 'service_request' ? 'active' : ''}`}
            onClick={() => handleTypeChange('service_request')}
            style={currentTypeKey === 'service_request' ? { color: '#3b82f6', borderColor: '#3b82f6' } : {}}
          >
            <Briefcase size={13} color={currentTypeKey === 'service_request' ? '#3b82f6' : 'currentColor'} />
            Service Request
          </button>
          <button
            type="button"
            className={`record-type-pill ${currentTypeKey === 'proposal' ? 'active' : ''}`}
            onClick={() => handleTypeChange('proposal')}
            style={currentTypeKey === 'proposal' ? { color: '#10b981', borderColor: '#10b981' } : {}}
          >
            <FileText size={13} color={currentTypeKey === 'proposal' ? '#10b981' : 'currentColor'} />
            Proposal / Quote
          </button>
          <button
            type="button"
            className={`record-type-pill ${currentTypeKey === 'inquiry' ? 'active' : ''}`}
            onClick={() => handleTypeChange('inquiry')}
            style={currentTypeKey === 'inquiry' ? { color: '#8b5cf6', borderColor: '#8b5cf6' } : {}}
          >
            <HelpCircle size={13} color={currentTypeKey === 'inquiry' ? '#8b5cf6' : 'currentColor'} />
            Inquiry
          </button>
        </div>
      </div>

      {/* Section 1: Client & Channel Details */}
      <div className="form-card">
        <div className="section-label" style={{ color: typeConfig.color }}>
          {sections.s1}
        </div>
        <div className="form-grid">
          <div className="field-group">
            <label className="field-label">{labels.source}</label>
            <input
              id="field-complaint-source"
              className={`field-input ${isAIFilled(form.complaint_source) ? 'ai-filled' : ''}`}
              value={form.complaint_source || ''}
              onChange={handleChange('complaint_source')}
              placeholder={placeholders.source}
            />
          </div>
          <div className="field-group">
            <label className="field-label">{labels.client}</label>
            <input
              id="field-customer-name"
              className={`field-input ${isAIFilled(form.customer_name) ? 'ai-filled' : ''}`}
              value={form.customer_name || ''}
              onChange={handleChange('customer_name')}
              placeholder={placeholders.client}
            />
          </div>
        </div>
      </div>

      {/* Section 2: Item / Service Identification */}
      <div className="form-card">
        <div className="section-label" style={{ color: typeConfig.color }}>
          {sections.s2}
        </div>
        <div className="form-grid">
          <div className="field-group">
            <label className="field-label">{labels.item}</label>
            <input
              id="field-product-name"
              className={`field-input ${isAIFilled(form.product_name) ? 'ai-filled' : ''}`}
              value={form.product_name || ''}
              onChange={handleChange('product_name')}
              placeholder={placeholders.item}
            />
          </div>
          <div className="field-group">
            <label className="field-label">{labels.tier}</label>
            <input
              id="field-product-strength"
              className={`field-input ${isAIFilled(form.product_strength) ? 'ai-filled' : ''}`}
              value={form.product_strength || ''}
              onChange={handleChange('product_strength')}
              placeholder={placeholders.tier}
            />
          </div>
          <div className="field-group">
            <label className="field-label">{labels.id}</label>
            <input
              id="field-batch-lot"
              className={`field-input ${isAIFilled(form.batch_lot_number) ? 'ai-filled' : ''}`}
              value={form.batch_lot_number || ''}
              onChange={handleChange('batch_lot_number')}
              placeholder={placeholders.id}
            />
          </div>
          <div className="field-group">
            <label className="field-label">{labels.qty}</label>
            <input
              id="field-affected-qty"
              className={`field-input ${isAIFilled(form.affected_quantity) ? 'ai-filled' : ''}`}
              value={form.affected_quantity || ''}
              onChange={handleChange('affected_quantity')}
              placeholder={placeholders.qty}
            />
          </div>
          <div className="field-group">
            <label className="field-label">{labels.date1}</label>
            <input
              id="field-mfg-date"
              className={`field-input ${isAIFilled(form.manufacturing_date) ? 'ai-filled' : ''}`}
              value={form.manufacturing_date || ''}
              onChange={handleChange('manufacturing_date')}
              placeholder={placeholders.date1}
            />
          </div>
          <div className="field-group">
            <label className="field-label">{labels.date2}</label>
            <input
              id="field-expiry-date"
              className={`field-input ${isAIFilled(form.expiry_date) ? 'ai-filled' : ''}`}
              value={form.expiry_date || ''}
              onChange={handleChange('expiry_date')}
              placeholder={placeholders.date2}
            />
          </div>
        </div>
      </div>

      {/* Section 3: Facility / Dept & Deliverables Impact */}
      <div className="form-card">
        <div className="section-label" style={{ color: typeConfig.color }}>
          {sections.s3}
        </div>
        <div className="form-grid">
          <div className="field-group">
            <label className="field-label">{labels.site}</label>
            <input
              id="field-originating-site"
              className={`field-input ${isAIFilled(form.originating_site) ? 'ai-filled' : ''}`}
              value={form.originating_site || ''}
              onChange={handleChange('originating_site')}
              placeholder={placeholders.site}
            />
          </div>
          <div className="field-group">
            <label className="field-label">{labels.npm}</label>
            <input
              id="field-npm"
              className={`field-input ${isAIFilled(form.impacted_npm) ? 'ai-filled' : ''}`}
              value={form.impacted_npm || ''}
              onChange={handleChange('impacted_npm')}
              placeholder={placeholders.npm}
            />
          </div>
        </div>
      </div>

      {/* Section 4: Operational Analysis & AI Assessment */}
      <div className="form-card">
        <div className="section-label" style={{ color: typeConfig.color }}>
          {sections.s4}
        </div>
        <div className="form-grid full" style={{ marginBottom: 16 }}>
          <div className="field-group">
            <label className="field-label">{labels.category}</label>
            <input
              id="field-complaint-category"
              className={`field-input ${isAIFilled(form.complaint_category) ? 'ai-filled' : ''}`}
              value={form.complaint_category || ''}
              onChange={handleChange('complaint_category')}
              placeholder={placeholders.category}
            />
          </div>
        </div>
        <div className="form-grid full" style={{ marginBottom: 16 }}>
          <div className="field-group">
            <label className="field-label">{labels.desc}</label>
            <textarea
              id="field-complaint-description"
              className={`field-input field-textarea ${isAIFilled(form.complaint_description) ? 'ai-filled' : ''}`}
              value={form.complaint_description || ''}
              onChange={handleChange('complaint_description')}
              placeholder={placeholders.desc}
              rows={3}
            />
          </div>
        </div>
        <div className="form-grid full">
          <div className="field-group">
            <label className="field-label">{labels.summary}</label>
            <textarea
              id="field-defect-summary"
              className={`field-input field-textarea ${isAIFilled(form.defect_summary) ? 'ai-filled' : ''}`}
              value={form.defect_summary || ''}
              onChange={handleChange('defect_summary')}
              placeholder={placeholders.summary}
              rows={3}
            />
          </div>
        </div>

        {/* AI Strategic Assessment Card */}
        <div className="ai-assessment-card">
          <div className="ai-assessment-header">
            <Sparkles size={15} color={typeConfig.color} />
            <h4 style={{ color: typeConfig.color }}>AI Copilot Strategic Assessment</h4>
          </div>

          <div className="ai-grid">
            <div>
              <div className="ai-field-label">Priority / Severity Level</div>
              {form.severity ? (
                <span className={`severity-badge ${getSeverityClass(form.severity)}`}>
                  {form.severity}
                </span>
              ) : (
                <input
                  className="field-input"
                  value=""
                  placeholder="Awaiting AI..."
                  readOnly
                  style={{ fontSize: 12 }}
                />
              )}
            </div>
            <div>
              <div className="ai-field-label">{labels.actionLabel}</div>
              <input
                id="field-suggested-action"
                className={`field-input ${isAIFilled(form.suggested_action) ? 'ai-filled' : ''}`}
                value={form.suggested_action || ''}
                onChange={handleChange('suggested_action')}
                placeholder={placeholders.action}
                style={{ fontSize: 12 }}
              />
            </div>
          </div>

          <div>
            <div className="ai-field-label">{labels.evalLabel}</div>
            <textarea
              id="field-risk-assessment"
              className={`field-input field-textarea ${isAIFilled(form.initial_risk_assessment) ? 'ai-filled' : ''}`}
              value={form.initial_risk_assessment || ''}
              onChange={handleChange('initial_risk_assessment')}
              placeholder={placeholders.eval}
              rows={4}
              style={{ fontSize: 12, minHeight: 80, resize: 'vertical' }}
            />
          </div>
        </div>

        {/* AI Auto-Generated Response Draft */}
        <div className="response-draft-card" style={{ borderLeft: `4px solid ${typeConfig.color}` }}>
          <div className="draft-header">
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                <Sparkles size={14} color={typeConfig.color} />
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-primary)' }}>
                  {sections.draftTitle}
                </span>
              </div>
              <p style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                Client-ready communication draft generated from AI analysis.
              </p>
            </div>
            {form.response_draft && (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleCopyDraft}
                style={{ padding: '6px 12px', fontSize: 11.5 }}
                title="Copy full text to clipboard"
              >
                {copiedDraft ? <Check size={13} color="#10b981" /> : <Copy size={13} />}
                {copiedDraft ? 'Copied' : 'Copy Draft'}
              </button>
            )}
          </div>
          <div className="draft-textarea-wrapper">
            <textarea
              className="draft-textarea"
              value={form.response_draft || ''}
              onChange={handleChange('response_draft')}
              placeholder={placeholders.draft}
              rows={6}
            />
            {form.response_draft && (
              <div className="draft-footer-hint">
                <span>{form.response_draft.length} characters</span>
                <span>Editable response draft</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Commit Button */}
      <button
        id="btn-commit-qms"
        className="btn-commit"
        style={{
          background: typeConfig.color === '#ef4444' ? 'linear-gradient(135deg, #b91c1c 0%, #ef4444 100%)' :
                      typeConfig.color === '#3b82f6' ? 'linear-gradient(135deg, #1d4ed8 0%, #3b82f6 100%)' :
                      typeConfig.color === '#10b981' ? 'linear-gradient(135deg, #047857 0%, #10b981 100%)' :
                      'linear-gradient(135deg, #6d28d9 0%, #8b5cf6 100%)',
          boxShadow: `0 4px 14px ${typeConfig.color}40`,
        }}
        onClick={handleCommit}
        disabled={!isReady || commitStatus === 'loading' || isCommitted}
      >
        {commitStatus === 'loading' ? (
          <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <span className="spinner" />
            Committing to Ledger...
          </span>
        ) : isCommitted ? (
          '✓ Committed to Universal Ledger'
        ) : (
          typeConfig.commitLabel
        )}
      </button>
    </div>
  );
}
