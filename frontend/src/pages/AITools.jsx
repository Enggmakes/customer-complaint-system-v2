import React, { useState, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  Mail,
  FileSearch,
  Sparkles,
  Copy,
  Check,
  Download,
  ArrowRight,
  Send,
  Loader2,
  DollarSign,
  Clock,
  Layers,
  Upload,
  CheckCircle2,
  Zap,
  Briefcase,
  TrendingUp,
  BarChart3,
  ExternalLink,
  ShieldAlert,
  Building2,
  Calendar,
  CreditCard,
  ListChecks,
  Rocket,
  Smartphone,
  Bot,
  User,
  Tag,
  Share2,
} from 'lucide-react';
import api from '../services/api';
import { addToast } from '../store/uiSlice';

// ─── 1-Click Project Templates (Clean Vector Icons) ──────────────────────────

const PROPOSAL_TEMPLATES = [
  {
    id: 'saas',
    icon: Rocket,
    title: 'SaaS Platform MVP',
    client: 'Apex Studio Inc.',
    budget: '$4,500 - $6,500',
    timeline: '3-4 Weeks',
    deliverables: 'React Dashboard, FastAPI Backend, Groq LLM Copilot, Stripe Billing, CI/CD Cloud Deploy',
    desc: 'Full-stack multi-tenant web application with AI workflow automation, authentication, and subscription payments.',
  },
  {
    id: 'mobile',
    icon: Smartphone,
    title: 'Mobile App Suite',
    client: 'Hyperion Health',
    budget: '$8,000 - $12,000',
    timeline: '6-8 Weeks',
    deliverables: 'React Native iOS/Android App, GraphQL API, Push Notifications, Offline Sync, App Store Publishing',
    desc: 'High-performance mobile application with biometric login, real-time sync, and compliance telemetry.',
  },
  {
    id: 'ai_agent',
    icon: Bot,
    title: 'Custom AI Agent Workflow',
    client: 'Novatech Enterprise',
    budget: '$5,500 - $8,000',
    timeline: '3-4 Weeks',
    deliverables: 'Multi-Agent LangGraph Pipeline, Document OCR Extraction, Vector Search, Slack/Teams Bot',
    desc: 'Autonomous agentic pipeline capable of triaging customer service requests, evaluating risk, and drafting proposals.',
  },
  {
    id: 'retainer',
    icon: TrendingUp,
    title: 'Growth & Optimization Retainer',
    client: 'Lumina Global',
    budget: '$2,500 / Month',
    timeline: 'Ongoing (3-Month Initial)',
    deliverables: 'Technical Performance Audit, Conversion Rate Optimization, Bi-Weekly Reporting',
    desc: 'Comprehensive inbound customer acquisition and operational funnel optimization.',
  },
];

export default function AITools() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { activeWorkspace, workspaces } = useSelector((state) => state.workspace);
  const currentWs = workspaces[activeWorkspace] || workspaces.general;

  const [activeTab, setActiveTab] = useState('proposal'); // 'proposal' | 'email' | 'ocr'

  // Proposal Studio State
  const [proposalForm, setProposalForm] = useState({
    service_title: 'Custom AI Agent & Workflow Solution',
    client_name: 'Novatech Enterprise',
    budget_range: '$5,500 - $8,000',
    target_timeline: '3-4 Weeks',
    service_description: 'Autonomous agentic pipeline capable of triaging customer service requests, evaluating risk, and drafting proposals with multi-workspace support.',
    deliverables: 'Multi-Agent LangGraph Architecture, Document OCR Extraction, Vector Search, Slack/Teams Bot',
  });
  const [proposalLoading, setProposalLoading] = useState(false);
  const [generatedProposal, setGeneratedProposal] = useState(null);
  const [copiedProposal, setCopiedProposal] = useState(false);
  const proposalPreviewRef = useRef(null);

  // Email Studio State
  const [emailForm, setEmailForm] = useState({
    recipient_name: 'Marcus Vance',
    recipient_role: 'Chief Executive Officer',
    context_type: 'service_quote',
    subject_matter: 'Custom AI Agent Scope & Quotation',
    tone: 'executive_formal',
    key_points: 'Finalized scope blueprint; Estimated delivery in 3 weeks; Attached complete milestone quotation',
  });
  const [emailLoading, setEmailLoading] = useState(false);
  const [generatedEmail, setGeneratedEmail] = useState(null);
  const [copiedEmail, setCopiedEmail] = useState(false);

  // DocuMind Scanner State
  const [ocrFile, setOcrFile] = useState(null);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrResult, setOcrResult] = useState(null);

  // ─── Proposal Generator Handlers ───────────────────────────────────────────

  const handleApplyTemplate = (tpl) => {
    setProposalForm({
      service_title: tpl.title,
      client_name: tpl.client,
      budget_range: tpl.budget,
      target_timeline: tpl.timeline,
      deliverables: tpl.deliverables,
      service_description: tpl.desc,
    });
    dispatch(addToast({ type: 'info', message: `Loaded ${tpl.title} template.` }));
  };

  const handleGenerateProposal = async (e) => {
    e.preventDefault();
    setProposalLoading(true);
    try {
      const deliverablesList = proposalForm.deliverables
        .split(',')
        .map((d) => d.trim())
        .filter(Boolean);

      const res = await api.post('/api/tools/generate-proposal', {
        ...proposalForm,
        deliverables: deliverablesList,
        workspace: activeWorkspace,
      });

      setGeneratedProposal(res.data);
      dispatch(addToast({ type: 'success', message: 'Structured Commercial Proposal generated!' }));
      setTimeout(() => {
        proposalPreviewRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    } catch (err) {
      dispatch(addToast({ type: 'error', message: `Generation failed: ${err.message}` }));
    } finally {
      setProposalLoading(false);
    }
  };

  const handleCopyProposal = () => {
    if (!generatedProposal) return;
    const cleanText = `PROPOSAL: ${generatedProposal.proposal_title}\nPrepared for: ${proposalForm.client_name}\nInvestment: ${generatedProposal.estimated_pricing}\nTimeline: ${generatedProposal.estimated_timeline}\nPayment Terms: ${generatedProposal.payment_terms}\n\n1. EXECUTIVE SUMMARY\n${generatedProposal.executive_summary}\n\n2. TECHNICAL APPROACH\n${generatedProposal.technical_approach || 'Standard agile methodology.'}\n\n3. PHASED ROADMAP\n${generatedProposal.deliverables?.map((d) => `${d.phase} (${d.duration}): ${d.scope}`).join('\n')}\n\n4. MILESTONES\n${generatedProposal.key_milestones?.join('\n')}`;

    navigator.clipboard.writeText(cleanText);
    setCopiedProposal(true);
    dispatch(addToast({ type: 'success', message: 'Proposal document copied to clipboard.' }));
    setTimeout(() => setCopiedProposal(false), 2000);
  };

  const handleDownloadProposal = () => {
    if (!generatedProposal) return;
    const cleanText = `# ${generatedProposal.proposal_title}\n\n**Prepared for:** ${proposalForm.client_name}  \n**Estimated Investment:** ${generatedProposal.estimated_pricing}  \n**Target Delivery:** ${generatedProposal.estimated_timeline}  \n**Payment Terms:** ${generatedProposal.payment_terms}  \n\n---\n\n## 1. Executive Summary\n${generatedProposal.executive_summary}\n\n## 2. Technical Approach\n${generatedProposal.technical_approach || 'Standard agile methodology.'}\n\n## 3. Phased Execution Roadmap\n${generatedProposal.deliverables?.map((d) => `### ${d.phase} (${d.duration})\n${d.scope}`).join('\n\n')}\n\n## 4. Key Project Milestones\n${generatedProposal.key_milestones?.map((m) => `* ${m}`).join('\n')}\n`;

    const blob = new Blob([cleanText], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${proposalForm.service_title.replace(/\s+/g, '_')}_Proposal.md`;
    a.click();
    URL.revokeObjectURL(url);
    dispatch(addToast({ type: 'success', message: 'Proposal document downloaded.' }));
  };

  // ─── Email Studio Handlers ─────────────────────────────────────────────────

  const handleGenerateEmail = async (e) => {
    e.preventDefault();
    setEmailLoading(true);
    try {
      const pointsList = emailForm.key_points
        .split(';')
        .map((p) => p.trim())
        .filter(Boolean);

      const res = await api.post('/api/tools/draft-email', {
        ...emailForm,
        key_points: pointsList,
        workspace: activeWorkspace,
      });

      setGeneratedEmail(res.data);
      dispatch(addToast({ type: 'success', message: 'Personalized Client Email drafted.' }));
    } catch (err) {
      dispatch(addToast({ type: 'error', message: `Email drafting failed: ${err.message}` }));
    } finally {
      setEmailLoading(false);
    }
  };

  const handleCopyEmail = () => {
    if (!generatedEmail?.email_body) return;
    const fullText = `Subject: ${generatedEmail.subject_line}\n\n${generatedEmail.email_body}`;
    navigator.clipboard.writeText(fullText);
    setCopiedEmail(true);
    dispatch(addToast({ type: 'success', message: 'Subject and Email body copied.' }));
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  // ─── DocuMind Scanner Handlers ─────────────────────────────────────────────

  const handleOcrUpload = async (file) => {
    if (!file) return;
    setOcrFile(file);
    setOcrLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('workspace', activeWorkspace);
      formData.append('session_id', `ocr_${Date.now()}`);

      const res = await api.post('/api/chat/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setOcrResult(res.data);
      dispatch(addToast({ type: 'success', message: `Scanned ${file.name} successfully.` }));
    } catch (err) {
      dispatch(addToast({ type: 'error', message: `Scan error: ${err.message}` }));
    } finally {
      setOcrLoading(false);
    }
  };

  return (
    <div className="ai-tools-page">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                background: currentWs.gradient || 'linear-gradient(135deg, #4f46e5 0%, #06b6d4 100%)',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: 'var(--shadow-primary)',
              }}
            >
              <Sparkles size={18} color="white" />
            </div>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--color-text-primary)', letterSpacing: '-0.5px' }}>
                ahsi AI Studio &amp; Services
              </h1>
              <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginTop: 2 }}>
                Multi-functional AI generators for high-converting proposals, executive client communications, and OCR document intelligence.
              </p>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            className="btn btn-secondary"
            onClick={() => navigate('/datalens')}
            style={{ fontSize: 12 }}
          >
            <BarChart3 size={14} color="var(--color-primary)" />
            Open DataLens Analytics
          </button>
        </div>
      </div>

      {/* Studio Tabs */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <button
          type="button"
          className={`btn ${activeTab === 'proposal' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('proposal')}
          style={{ padding: '9px 16px', fontSize: 13 }}
        >
          <FileText size={15} />
          AI Proposal &amp; Quotation Studio
        </button>
        <button
          type="button"
          className={`btn ${activeTab === 'email' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('email')}
          style={{ padding: '9px 16px', fontSize: 13 }}
        >
          <Mail size={15} />
          Smart Client Email Studio
        </button>
        <button
          type="button"
          className={`btn ${activeTab === 'ocr' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('ocr')}
          style={{ padding: '9px 16px', fontSize: 13 }}
        >
          <FileSearch size={15} />
          DocuMind File &amp; PDF Scanner
        </button>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          TAB 1: AI PROPOSAL & QUOTATION STUDIO
         ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'proposal' && (
        <div className="studio-grid">
          {/* Left Column: Form & Preset Templates */}
          <div className="tool-workspace-card" style={{ marginBottom: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Sparkles size={16} color="var(--color-primary)" />
                <h3 style={{ fontSize: 15, fontWeight: 700 }}>Generate Structured Proposal &amp; Scope</h3>
              </div>
            </div>

            {/* Clickable Preset Templates */}
            <div style={{ marginBottom: 16 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>
                1-Click Project Templates:
              </span>
              <div className="template-grid">
                {PROPOSAL_TEMPLATES.map((tpl) => {
                  const TplIcon = tpl.icon;
                  return (
                    <div
                      key={tpl.id}
                      className="template-card"
                      onClick={() => handleApplyTemplate(tpl)}
                      title="Click to auto-fill form with this template"
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                        <TplIcon size={14} color="var(--color-primary)" />
                        <div className="template-card-title">{tpl.title}</div>
                      </div>
                      <div className="template-card-desc">{tpl.budget} • {tpl.timeline}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            <form onSubmit={handleGenerateProposal}>
              <div className="form-grid" style={{ marginBottom: 14 }}>
                <div className="field-group">
                  <label className="field-label">Service / Project Title</label>
                  <input
                    className="field-input"
                    value={proposalForm.service_title}
                    onChange={(e) => setProposalForm({ ...proposalForm, service_title: e.target.value })}
                    required
                  />
                </div>
                <div className="field-group">
                  <label className="field-label">Client / Company Name</label>
                  <input
                    className="field-input"
                    value={proposalForm.client_name}
                    onChange={(e) => setProposalForm({ ...proposalForm, client_name: e.target.value })}
                    required
                  />
                </div>
                <div className="field-group">
                  <label className="field-label">Estimated Budget Guidance</label>
                  <input
                    className="field-input"
                    value={proposalForm.budget_range}
                    onChange={(e) => setProposalForm({ ...proposalForm, budget_range: e.target.value })}
                    placeholder="e.g. $4,500 - $6,500"
                  />
                </div>
                <div className="field-group">
                  <label className="field-label">Target Delivery Timeline</label>
                  <input
                    className="field-input"
                    value={proposalForm.target_timeline}
                    onChange={(e) => setProposalForm({ ...proposalForm, target_timeline: e.target.value })}
                    placeholder="e.g. 3-4 Weeks"
                  />
                </div>
              </div>

              <div className="field-group">
                <label className="field-label">Key Deliverables (comma-separated)</label>
                <input
                  className="field-input"
                  value={proposalForm.deliverables}
                  onChange={(e) => setProposalForm({ ...proposalForm, deliverables: e.target.value })}
                  placeholder="UI Components, API Integration, Stripe Billing, CI/CD Deploy"
                />
              </div>

              <div className="field-group">
                <label className="field-label">Detailed Scope &amp; Client Requirements</label>
                <textarea
                  className="field-input field-textarea"
                  rows={4}
                  value={proposalForm.service_description}
                  onChange={(e) => setProposalForm({ ...proposalForm, service_description: e.target.value })}
                  required
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                style={{ width: '100%', padding: '12px', fontSize: 14 }}
                disabled={proposalLoading}
              >
                {proposalLoading ? (
                  <>
                    <Loader2 size={16} className="spinner" />
                    Generating Structured Proposal with AI...
                  </>
                ) : (
                  <>
                    <Sparkles size={16} />
                    Generate Structured Proposal
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Right Column: Executive Proposal Document Sheet (Flawless Formatting) */}
          <div
            ref={proposalPreviewRef}
            style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-lg)',
              padding: '24px',
              boxShadow: 'var(--shadow-md)',
            }}
          >
            {/* Document Header & Action Toolbar */}
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                paddingBottom: 14,
                borderBottom: '2px solid var(--color-border)',
                marginBottom: 16,
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <Building2 size={14} color="var(--color-primary)" />
                  <span
                    style={{
                      fontSize: 10.5,
                      fontWeight: 800,
                      letterSpacing: '0.6px',
                      textTransform: 'uppercase',
                      color: 'var(--color-primary)',
                    }}
                  >
                    Commercial Proposal Specification
                  </span>
                </div>
                <h3 style={{ fontSize: 17, fontWeight: 800, color: 'var(--color-text-primary)', lineHeight: 1.3 }}>
                  {generatedProposal ? generatedProposal.proposal_title : 'Executive Proposal Specification'}
                </h3>
                {proposalForm.client_name && (
                  <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>
                    Prepared for: <strong style={{ color: 'var(--color-text-secondary)' }}>{proposalForm.client_name}</strong>
                  </div>
                )}
              </div>

              {generatedProposal && (
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={handleCopyProposal}
                    style={{ padding: '5px 9px', fontSize: 11 }}
                    title="Copy Document Text"
                  >
                    {copiedProposal ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
                    {copiedProposal ? 'Copied' : 'Copy'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={handleDownloadProposal}
                    style={{ padding: '5px 9px', fontSize: 11 }}
                    title="Download Document"
                  >
                    <Download size={12} />
                    Export
                  </button>
                </div>
              )}
            </div>

            {generatedProposal ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {/* 3-Column Key Commercial Terms Ribbon */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: 10,
                    background: 'var(--color-surface-2)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                    padding: '12px 14px',
                    marginBottom: 16,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                    <div style={{ padding: 6, background: 'rgba(79, 70, 229, 0.1)', borderRadius: 6 }}>
                      <DollarSign size={14} color="var(--color-primary)" />
                    </div>
                    <div>
                      <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
                        Investment
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--color-primary)', marginTop: 2 }}>
                        {generatedProposal.estimated_pricing}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                    <div style={{ padding: 6, background: 'rgba(245, 158, 11, 0.1)', borderRadius: 6 }}>
                      <Clock size={14} color="#f59e0b" />
                    </div>
                    <div>
                      <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
                        Timeline
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--color-text-primary)', marginTop: 2 }}>
                        {generatedProposal.estimated_timeline}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                    <div style={{ padding: 6, background: 'rgba(16, 185, 129, 0.1)', borderRadius: 6 }}>
                      <CreditCard size={14} color="#10b981" />
                    </div>
                    <div>
                      <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
                        Payment Terms
                      </div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-secondary)', marginTop: 2, lineHeight: 1.3 }}>
                        {generatedProposal.payment_terms}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section 1: Executive Summary */}
                <div
                  style={{
                    background: 'var(--color-surface-2)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                    padding: '14px 16px',
                    marginBottom: 14,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                    <FileText size={14} color="var(--color-primary)" />
                    <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--color-text-primary)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                      1. Executive Summary &amp; Objectives
                    </span>
                  </div>
                  <p style={{ fontSize: 13, color: 'var(--color-text-primary)', lineHeight: 1.6 }}>
                    {generatedProposal.executive_summary}
                  </p>
                </div>

                {/* Section 2: Technical Approach */}
                {generatedProposal.technical_approach && (
                  <div
                    style={{
                      background: 'var(--color-surface-2)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-md)',
                      padding: '14px 16px',
                      marginBottom: 14,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                      <Layers size={14} color="var(--color-primary)" />
                      <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--color-text-primary)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                        2. Technical Approach &amp; Architecture
                      </span>
                    </div>
                    <p style={{ fontSize: 13, color: 'var(--color-text-primary)', lineHeight: 1.6 }}>
                      {generatedProposal.technical_approach}
                    </p>
                  </div>
                )}

                {/* Section 3: Phased Execution Roadmap */}
                {generatedProposal.deliverables && generatedProposal.deliverables.length > 0 && (
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                      <ListChecks size={14} color="var(--color-primary)" />
                      <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--color-text-primary)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                        3. Phased Execution Roadmap
                      </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {generatedProposal.deliverables.map((del, idx) => (
                        <div
                          key={idx}
                          style={{
                            background: 'var(--color-surface-2)',
                            border: '1px solid var(--color-border)',
                            borderLeft: '4px solid var(--color-primary)',
                            borderRadius: 'var(--radius-sm)',
                            padding: '10px 14px',
                            boxShadow: 'var(--shadow-sm)',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                            <strong style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--color-text-primary)' }}>
                              {del.phase}
                            </strong>
                            <span
                              style={{
                                fontSize: 10.5,
                                fontWeight: 700,
                                padding: '2px 8px',
                                borderRadius: 'var(--radius-full)',
                                background: 'var(--color-primary-50)',
                                color: 'var(--color-primary)',
                              }}
                            >
                              {del.duration}
                            </span>
                          </div>
                          <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                            {del.scope}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Section 4: Key Milestones Checklist */}
                {generatedProposal.key_milestones && generatedProposal.key_milestones.length > 0 && (
                  <div
                    style={{
                      background: 'var(--color-surface-2)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-md)',
                      padding: '14px 16px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                      <CheckCircle2 size={14} color="#10b981" />
                      <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--color-text-primary)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                        4. Key Milestones &amp; Acceptance
                      </span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {generatedProposal.key_milestones.map((m, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: 'var(--color-text-primary)' }}>
                          <CheckCircle2 size={13} color="#10b981" />
                          <span>{m}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--color-text-muted)' }}>
                <FileText size={36} style={{ opacity: 0.3, marginBottom: 12 }} />
                <h4 style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                  Awaiting Proposal Generation
                </h4>
                <p style={{ fontSize: 12, marginTop: 4 }}>
                  Fill out the project scope on the left or select a 1-click template to generate a complete commercial proposal document.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          TAB 2: SMART CLIENT EMAIL STUDIO
         ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'email' && (
        <div className="studio-grid">
          {/* Left Column: Email Configuration Form */}
          <div className="tool-workspace-card" style={{ marginBottom: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <Mail size={16} color="var(--color-primary)" />
              <h3 style={{ fontSize: 15, fontWeight: 700 }}>Client Email &amp; Communications Studio</h3>
            </div>

            {/* Tone Selector */}
            <div style={{ marginBottom: 14 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
                Communication Tone:
              </span>
              <div className="tone-chip-group">
                {[
                  { id: 'executive_formal', label: 'Executive Formal' },
                  { id: 'direct_actionable', label: 'Direct & Actionable' },
                  { id: 'empathetic_warm', label: 'Empathetic & Warm' },
                  { id: 'urgent_escalation', label: 'Urgent Escalation' },
                  { id: 'high_converting_sales', label: 'Commercial Sales' },
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    className={`tone-chip ${emailForm.tone === t.id ? 'active' : ''}`}
                    onClick={() => setEmailForm({ ...emailForm, tone: t.id })}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleGenerateEmail}>
              <div className="form-grid" style={{ marginBottom: 14 }}>
                <div className="field-group">
                  <label className="field-label">Recipient Name</label>
                  <input
                    className="field-input"
                    value={emailForm.recipient_name}
                    onChange={(e) => setEmailForm({ ...emailForm, recipient_name: e.target.value })}
                    required
                  />
                </div>
                <div className="field-group">
                  <label className="field-label">Recipient Role / Title</label>
                  <input
                    className="field-input"
                    value={emailForm.recipient_role}
                    onChange={(e) => setEmailForm({ ...emailForm, recipient_role: e.target.value })}
                  />
                </div>
                <div className="field-group">
                  <label className="field-label">Context Scenario</label>
                  <select
                    className="field-input field-select"
                    value={emailForm.context_type}
                    onChange={(e) => setEmailForm({ ...emailForm, context_type: e.target.value })}
                  >
                    <option value="service_quote">Commercial Quote &amp; Scope Follow-up</option>
                    <option value="complaint_resolution">Issue Resolution &amp; Apology</option>
                    <option value="client_kickoff">Project Milestone Kickoff</option>
                    <option value="status_update">Executive Progress Update</option>
                  </select>
                </div>
                <div className="field-group">
                  <label className="field-label">Subject Matter</label>
                  <input
                    className="field-input"
                    value={emailForm.subject_matter}
                    onChange={(e) => setEmailForm({ ...emailForm, subject_matter: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="field-group">
                <label className="field-label">Key Talking Points (separated by semicolon ';')</label>
                <textarea
                  className="field-input field-textarea"
                  rows={3}
                  value={emailForm.key_points}
                  onChange={(e) => setEmailForm({ ...emailForm, key_points: e.target.value })}
                  placeholder="Point 1; Point 2; Point 3"
                  required
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                style={{ width: '100%', padding: '12px', fontSize: 14 }}
                disabled={emailLoading}
              >
                {emailLoading ? (
                  <>
                    <Loader2 size={16} className="spinner" />
                    Drafting Personalized Client Email...
                  </>
                ) : (
                  <>
                    <Send size={16} />
                    Draft Executive Email
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Right Column: Clean Email Preview Card */}
          <div
            style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-lg)',
              padding: '24px',
              boxShadow: 'var(--shadow-md)',
              position: 'sticky',
              top: 20,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingBottom: 14,
                borderBottom: '2px solid var(--color-border)',
                marginBottom: 16,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Mail size={16} color="var(--color-primary)" />
                <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text-primary)' }}>
                  Email Client Preview
                </h3>
              </div>

              {generatedEmail && (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleCopyEmail}
                  style={{ padding: '5px 9px', fontSize: 11 }}
                >
                  {copiedEmail ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
                  {copiedEmail ? 'Copied' : 'Copy All'}
                </button>
              )}
            </div>

            {generatedEmail ? (
              <div>
                {/* Email Subject Line Header */}
                <div
                  style={{
                    background: 'var(--color-surface-2)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                    padding: '10px 14px',
                    marginBottom: 14,
                  }}
                >
                  <div style={{ fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 600, marginBottom: 2 }}>
                    To: {emailForm.recipient_name} &lt;{emailForm.recipient_name.toLowerCase().replace(/\s+/g, '.')}@client.com&gt;
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-primary)' }}>
                    Subject: {generatedEmail.subject_line}
                  </div>
                </div>

                {/* Email Body */}
                <div
                  style={{
                    background: 'var(--color-surface-2)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                    padding: '16px',
                    fontSize: 13,
                    color: 'var(--color-text-primary)',
                    whiteSpace: 'pre-wrap',
                    lineHeight: 1.6,
                    minHeight: 240,
                  }}
                >
                  {generatedEmail.email_body}
                </div>

                {/* Recommended Action Footer */}
                <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 11.5, color: 'var(--color-text-secondary)' }}>
                    Suggested Follow-up: <strong>Within {generatedEmail.suggested_followup_days || 3} days</strong>
                  </span>
                  <a
                    href={`mailto:?subject=${encodeURIComponent(generatedEmail.subject_line)}&body=${encodeURIComponent(generatedEmail.email_body)}`}
                    className="btn btn-secondary"
                    style={{ fontSize: 11.5, padding: '5px 10px' }}
                  >
                    <ExternalLink size={12} />
                    Open in Mail App
                  </a>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--color-text-muted)' }}>
                <Mail size={36} style={{ opacity: 0.3, marginBottom: 12 }} />
                <h4 style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                  Awaiting Email Generation
                </h4>
                <p style={{ fontSize: 12, marginTop: 4 }}>
                  Select your recipient, scenario, and tone to generate an executive email draft.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          TAB 3: DOCUMIND OCR & FILE SCANNER
         ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'ocr' && (
        <div className="studio-grid">
          {/* Left Column: Dropzone & File Details */}
          <div className="tool-workspace-card" style={{ marginBottom: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <FileSearch size={16} color="var(--color-primary)" />
              <h3 style={{ fontSize: 15, fontWeight: 700 }}>DocuMind Document &amp; Image OCR Scanner</h3>
            </div>

            <p style={{ fontSize: 12.5, color: 'var(--color-text-secondary)', lineHeight: 1.5, marginBottom: 16 }}>
              Upload any PDF document, invoice, receipt, lab test sheet, crash log, or scanned image.
              DocuMind extracts structured data, identifies key entities, and evaluates operational risk.
            </p>

            {/* Drop Zone */}
            <label
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '36px 20px',
                border: '2px dashed var(--color-primary-100)',
                borderRadius: 'var(--radius-lg)',
                background: 'var(--color-primary-50)',
                cursor: 'pointer',
                transition: 'all var(--transition)',
                marginBottom: 16,
              }}
            >
              <Upload size={32} color="var(--color-primary)" style={{ marginBottom: 10 }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-primary)' }}>
                {ocrFile ? ocrFile.name : 'Click to Upload or Drag & Drop Document'}
              </span>
              <span style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 4 }}>
                Supports PDF, PNG, JPG, JPEG, TXT, CSV, JSON, LOG
              </span>
              <input
                type="file"
                style={{ display: 'none' }}
                accept=".pdf,.png,.jpg,.jpeg,.txt,.csv,.json,.log"
                onChange={(e) => handleOcrUpload(e.target.files?.[0])}
              />
            </label>

            {ocrLoading && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 14, color: 'var(--color-primary)' }}>
                <Loader2 size={16} className="spinner" />
                <span>Running DocuMind Optical OCR &amp; Entity Extraction...</span>
              </div>
            )}
          </div>

          {/* Right Column: Scan Extraction Results */}
          <div
            style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-lg)',
              padding: '24px',
              boxShadow: 'var(--shadow-md)',
              position: 'sticky',
              top: 20,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingBottom: 14,
                borderBottom: '2px solid var(--color-border)',
                marginBottom: 16,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <CheckCircle2 size={16} color="#10b981" />
                <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text-primary)' }}>
                  Extracted Entities &amp; Analysis
                </h3>
              </div>
            </div>

            {ocrResult ? (
              <div>
                <div style={{ marginBottom: 14 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: 6, display: 'block' }}>
                    AI Summary
                  </span>
                  <p style={{ fontSize: 12.5, color: 'var(--color-text-primary)', lineHeight: 1.5 }}>
                    {ocrResult.ai_response}
                  </p>
                </div>

                {ocrResult.extracted_data && (
                  <div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: 6, display: 'block' }}>
                      Structured Field Extraction
                    </span>
                    <div
                      style={{
                        background: 'var(--color-surface-2)',
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-md)',
                        padding: '12px',
                        maxHeight: 300,
                        overflowY: 'auto',
                      }}
                    >
                      <pre style={{ fontSize: 11.5, color: 'var(--color-text-primary)' }}>
                        {JSON.stringify(ocrResult.extracted_data, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--color-text-muted)' }}>
                <FileSearch size={36} style={{ opacity: 0.3, marginBottom: 12 }} />
                <h4 style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                  No Document Scanned Yet
                </h4>
                <p style={{ fontSize: 12, marginTop: 4 }}>
                  Upload a PDF or image file on the left to view extracted entities and structured data.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
