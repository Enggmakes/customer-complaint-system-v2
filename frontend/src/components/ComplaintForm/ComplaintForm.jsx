import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Shield, Zap } from 'lucide-react';
import { updateFormField } from '../../store/complaintsSlice';
import { commitComplaint } from '../../store/complaintsSlice';
import { addToast } from '../../store/uiSlice';

const SITE_OPTIONS = [
  'Awaiting AI classification...',
  'Block A - Primary Manufacturing',
  'Block B - Secondary Packaging',
  'Block C - API Synthesis',
  'Block D - Formulation',
  'Block E - Quality Control Lab',
  'Block F - Warehouse & Distribution',
  'Unknown',
];

const CATEGORY_OPTIONS = [
  'Product Defect - Discoloration',
  'Product Defect - Particulate',
  'Product Defect - Packaging',
  'Product Defect - Odor',
  'Efficacy Complaint',
  'Adverse Event',
  'Label/Documentation Error',
  'Shortage',
  'Other',
];

export default function ComplaintForm() {
  const dispatch = useDispatch();
  const form = useSelector((state) => state.complaints.currentForm);
  const formStatus = useSelector((state) => state.complaints.formStatus);
  const commitStatus = useSelector((state) => state.complaints.commitStatus);
  const session_id = useSelector((state) => state.chat.session_id);

  const handleChange = (field) => (e) => {
    dispatch(updateFormField({ field, value: e.target.value }));
  };

  const isAIFilled = (val) => val && val !== '' && val !== 'Awaiting AI extraction...' && val !== 'Awaiting AI classification...';

  const getSeverityClass = (severity) => {
    if (!severity) return '';
    return severity.toLowerCase();
  };

  const handleCommit = async () => {
    if (!session_id) {
      dispatch(addToast({ type: 'error', message: 'No active session. Please paste a complaint first.' }));
      return;
    }
    try {
      await dispatch(commitComplaint({ session_id, complaint_data: form })).unwrap();
      dispatch(addToast({ type: 'success', message: 'Complaint committed to QMS Ledger successfully!' }));
    } catch (err) {
      dispatch(addToast({ type: 'error', message: `Commit failed: ${err}` }));
    }
  };

  const isReady = formStatus === 'ready_to_commit';
  const isCommitted = formStatus === 'committed';

  return (
    <div className="form-panel">
      {/* Section 1: Origin & Customer Details */}
      <div className="form-card">
        <div className="section-label">1. Origin &amp; Customer Details</div>
        <div className="form-grid">
          <div className="field-group">
            <label className="field-label">Complaint Source</label>
            <input
              id="field-complaint-source"
              className={`field-input ${isAIFilled(form.complaint_source) ? 'ai-filled' : ''}`}
              value={form.complaint_source || ''}
              onChange={handleChange('complaint_source')}
              placeholder="Awaiting AI extraction..."
            />
          </div>
          <div className="field-group">
            <label className="field-label">Customer Name</label>
            <input
              id="field-customer-name"
              className={`field-input ${isAIFilled(form.customer_name) ? 'ai-filled' : ''}`}
              value={form.customer_name || ''}
              onChange={handleChange('customer_name')}
              placeholder="Awaiting AI extraction..."
            />
          </div>
        </div>
      </div>

      {/* Section 2: Product & Batch Identification */}
      <div className="form-card">
        <div className="section-label">2. Product &amp; Batch Identification</div>
        <div className="form-grid">
          <div className="field-group">
            <label className="field-label">Product Name (API/FDF)</label>
            <input
              id="field-product-name"
              className={`field-input ${isAIFilled(form.product_name) ? 'ai-filled' : ''}`}
              value={form.product_name || ''}
              onChange={handleChange('product_name')}
              placeholder="Awaiting AI extraction..."
            />
          </div>
          <div className="field-group">
            <label className="field-label">Product Strength</label>
            <input
              id="field-product-strength"
              className={`field-input ${isAIFilled(form.product_strength) ? 'ai-filled' : ''}`}
              value={form.product_strength || ''}
              onChange={handleChange('product_strength')}
              placeholder="Awaiting AI extraction..."
            />
          </div>
          <div className="field-group">
            <label className="field-label">Batch / Lot Number</label>
            <input
              id="field-batch-lot"
              className={`field-input ${isAIFilled(form.batch_lot_number) ? 'ai-filled' : ''}`}
              value={form.batch_lot_number || ''}
              onChange={handleChange('batch_lot_number')}
              placeholder="Awaiting AI extraction..."
            />
          </div>
          <div className="field-group">
            <label className="field-label">Affected Quantity</label>
            <input
              id="field-affected-qty"
              className={`field-input ${isAIFilled(form.affected_quantity) ? 'ai-filled' : ''}`}
              value={form.affected_quantity || ''}
              onChange={handleChange('affected_quantity')}
              placeholder="Awaiting AI extraction..."
            />
          </div>
          <div className="field-group">
            <label className="field-label">Manufacturing Date</label>
            <input
              id="field-mfg-date"
              className={`field-input ${isAIFilled(form.manufacturing_date) ? 'ai-filled' : ''}`}
              value={form.manufacturing_date || ''}
              onChange={handleChange('manufacturing_date')}
              placeholder="Awaiting AI extraction..."
            />
          </div>
          <div className="field-group">
            <label className="field-label">Expiry Date</label>
            <input
              id="field-expiry-date"
              className={`field-input ${isAIFilled(form.expiry_date) ? 'ai-filled' : ''}`}
              value={form.expiry_date || ''}
              onChange={handleChange('expiry_date')}
              placeholder="Awaiting AI extraction..."
            />
          </div>
        </div>
      </div>

      {/* Section 3: Facility & Material Impact */}
      <div className="form-card">
        <div className="section-label">3. Facility &amp; Material Impact</div>
        <div className="form-grid">
          <div className="field-group">
            <label className="field-label">Originating Site Block</label>
            <select
              id="field-originating-site"
              className={`field-input field-select ${isAIFilled(form.originating_site) ? 'ai-filled' : ''}`}
              value={form.originating_site || ''}
              onChange={handleChange('originating_site')}
            >
              <option value="">Awaiting AI classification...</option>
              {SITE_OPTIONS.filter(o => !o.includes('Awaiting')).map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          </div>
          <div className="field-group">
            <label className="field-label">Impacted Non-Product Materials (NPM)</label>
            <input
              id="field-npm"
              className={`field-input ${isAIFilled(form.impacted_npm) ? 'ai-filled' : ''}`}
              value={form.impacted_npm || ''}
              onChange={handleChange('impacted_npm')}
              placeholder="e.g., Primary packaging..."
            />
          </div>
        </div>
      </div>

      {/* Section 4: Defect Analysis */}
      <div className="form-card">
        <div className="section-label">4. Defect Analysis</div>
        <div className="form-grid full" style={{ marginBottom: 16 }}>
          <div className="field-group">
            <label className="field-label">Complaint Category</label>
            <select
              id="field-complaint-category"
              className={`field-input field-select ${isAIFilled(form.complaint_category) ? 'ai-filled' : ''}`}
              value={form.complaint_category || ''}
              onChange={handleChange('complaint_category')}
            >
              <option value="">Select category...</option>
              {CATEGORY_OPTIONS.map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="form-grid full" style={{ marginBottom: 16 }}>
          <div className="field-group">
            <label className="field-label">Complaint Description</label>
            <textarea
              id="field-complaint-description"
              className={`field-input field-textarea ${isAIFilled(form.complaint_description) ? 'ai-filled' : ''}`}
              value={form.complaint_description || ''}
              onChange={handleChange('complaint_description')}
              placeholder="AI will extract a concise complaint description..."
              rows={3}
            />
          </div>
        </div>
        <div className="form-grid full">
          <div className="field-group">
            <label className="field-label">Structured Defect Summary</label>
            <textarea
              id="field-defect-summary"
              className={`field-input field-textarea ${isAIFilled(form.defect_summary) ? 'ai-filled' : ''}`}
              value={form.defect_summary || ''}
              onChange={handleChange('defect_summary')}
              placeholder="AI will synthesize the complaint into a formal QMS description..."
              rows={3}
            />
          </div>
        </div>

        {/* AI Risk Assessment Card */}
        <div className="ai-assessment-card">
          <div className="ai-assessment-header">
            <Shield size={15} color="#5b5bd6" />
            <h4>AI Copilot Risk Assessment</h4>
          </div>

          <div className="ai-grid">
            <div>
              <div className="ai-field-label">Severity (Suggested)</div>
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
              <div className="ai-field-label">Suggested Next Action</div>
              <input
                id="field-suggested-action"
                className={`field-input ${isAIFilled(form.suggested_action) ? 'ai-filled' : ''}`}
                value={form.suggested_action || ''}
                onChange={handleChange('suggested_action')}
                placeholder="Awaiting AI assessment..."
                style={{ fontSize: 12 }}
              />
            </div>
          </div>

          <div>
            <div className="ai-field-label">Initial Risk Assessment</div>
            <textarea
              id="field-risk-assessment"
              className={`field-input field-textarea ${isAIFilled(form.initial_risk_assessment) ? 'ai-filled' : ''}`}
              value={form.initial_risk_assessment || ''}
              onChange={handleChange('initial_risk_assessment')}
              placeholder="AI will generate an initial risk narrative..."
              rows={4}
              style={{ fontSize: 12, minHeight: 90, resize: 'vertical' }}
            />
          </div>
        </div>
      </div>

      {/* Commit Button */}
      <button
        id="btn-commit-qms"
        className="btn-commit"
        onClick={handleCommit}
        disabled={!isReady || commitStatus === 'loading' || isCommitted}
      >
        {commitStatus === 'loading' ? (
          <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <span className="spinner" />
            Committing to QMS...
          </span>
        ) : isCommitted ? (
          '✓ Committed to QMS Ledger'
        ) : (
          'Commit to QMS Ledger'
        )}
      </button>
    </div>
  );
}
