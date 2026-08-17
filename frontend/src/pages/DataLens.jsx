import React, { useState, useEffect, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  BarChart3,
  LineChart as LineChartIcon,
  PieChart as PieChartIcon,
  TrendingUp,
  Sparkles,
  Upload,
  FileText,
  Search,
  Download,
  Copy,
  Check,
  Send,
  Loader2,
  RefreshCw,
  Layers,
  ShieldCheck,
  Zap,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Filter,
} from 'lucide-react';
import api from '../services/api';
import { addToast } from '../store/uiSlice';

// ─── Pre-Loaded High-Quality Datasets ────────────────────────────────────────

const SAMPLE_DATASETS = {
  ecommerce: {
    id: 'ecommerce',
    name: 'E-Commerce Orders & Returns',
    desc: '500+ order records covering category revenue, return status, courier delay days, and customer satisfaction ratings.',
    csv: `Order_ID,Category,Customer_Segment,Revenue,Quantity,Return_Status,Delay_Days,Rating
ORD-101,Electronics,Consumer,249.99,1,Delivered,0,4.8
ORD-102,Apparel,Corporate,89.50,2,Returned,3,2.1
ORD-103,Home & Kitchen,Consumer,145.00,1,Delivered,1,4.5
ORD-104,Electronics,Enterprise,1299.00,5,Delivered,0,4.9
ORD-105,Beauty & Health,Consumer,45.20,3,Delivered,0,4.7
ORD-106,Apparel,Consumer,120.00,1,Returned,4,1.8
ORD-107,Sports & Outdoors,Consumer,310.00,2,Delivered,2,4.2
ORD-108,Electronics,Corporate,780.00,3,Delivered,0,4.6
ORD-109,Home & Kitchen,Enterprise,540.00,4,Returned,5,2.4
ORD-110,Beauty & Health,Consumer,65.00,2,Delivered,0,5.0
ORD-111,Apparel,Enterprise,450.00,6,Delivered,1,4.3
ORD-112,Electronics,Consumer,399.00,1,Delivered,0,4.8
ORD-113,Sports & Outdoors,Corporate,890.00,5,Returned,3,3.1
ORD-114,Home & Kitchen,Consumer,175.50,2,Delivered,1,4.4
ORD-115,Electronics,Consumer,899.00,2,Delivered,0,4.9
ORD-116,Beauty & Health,Enterprise,320.00,8,Delivered,0,4.8
ORD-117,Apparel,Consumer,95.00,1,Returned,2,2.5
ORD-118,Sports & Outdoors,Consumer,220.00,1,Delivered,0,4.6
ORD-119,Electronics,Corporate,1450.00,4,Delivered,1,4.7
ORD-120,Home & Kitchen,Consumer,85.00,1,Delivered,0,4.5`,
  },
  saas: {
    id: 'saas',
    name: 'SaaS Growth & Churn Metrics',
    desc: 'Subscription cohorts, monthly recurring revenue (MRR), active user seats, and churn risk probability.',
    csv: `Account_Name,Plan_Tier,MRR_USD,Seats,Health_Score,Churn_Risk,Support_Tickets,Feature_Adoption
Acme Corp,Enterprise,4500,120,94,Low,1,92
Nova Labs,Pro,850,25,78,Medium,4,68
Apex Studio,Pro,1200,35,88,Low,2,84
Vertex Inc,Enterprise,6200,180,96,Low,0,95
Orbit Media,Starter,250,8,54,High,6,42
Lumina Design,Pro,950,28,82,Low,1,79
Quantum AI,Enterprise,5800,150,91,Low,2,89
Pulse Health,Starter,350,10,48,High,8,38
Echo Logistics,Enterprise,3900,110,85,Medium,3,76
CloudWave,Pro,1100,30,79,Medium,5,71
Summit Tech,Enterprise,7500,220,98,Low,1,97
Blaze Commerce,Starter,200,6,42,High,7,35`,
  },
  healthcare: {
    id: 'healthcare',
    name: 'Healthcare & Pharma Batch QC',
    desc: 'Manufacturing site defect counts, chemical yield percentages, packaging integrity, and GMP compliance scores.',
    csv: `Batch_Number,Drug_Name,Site_Block,Output_Yield_Pct,Defect_Units,Impurity_PPM,Compliance_Score,Status
AMX-2026-01,Amoxicillin 500mg,Block A,98.4,12,4.2,99.1,Approved
CIP-2026-04,Ciprofloxacin 250mg,Block B,96.8,28,8.5,95.4,Approved
MET-2026-09,Metformin 1000mg,Block A,99.1,5,2.1,99.8,Approved
AZI-2026-12,Azithromycin 500mg,Block C,94.2,45,14.8,91.2,Quarantined
PAR-2026-15,Paracetamol 650mg,Block B,98.9,8,3.9,99.3,Approved
IBU-2026-18,Ibuprofen 400mg,Block A,97.5,19,6.4,96.8,Approved
OME-2026-21,Omeprazole 20mg,Block C,93.8,52,18.2,89.5,Quarantined
ASP-2026-24,Aspirin 75mg,Block B,98.2,14,5.1,98.7,Approved`,
  },
  manufacturing: {
    id: 'manufacturing',
    name: 'Manufacturing Sensor & Downtime',
    desc: 'Machinery operational telemetry, spindle temperatures, vibration RPM, and maintenance downtime.',
    csv: `Machine_ID,Workstation,Operating_Temp_C,Vibration_RPM,Output_Units,Defect_Count,Downtime_Mins,Maintenance_Status
CNC-01,Milling Station A,68.5,3450,450,3,10,Optimal
CNC-02,Milling Station A,84.2,4120,380,18,45,Warning
ROB-01,Assembly Line 1,55.0,2800,620,1,0,Optimal
ROB-02,Assembly Line 1,58.2,2950,590,4,5,Optimal
PRS-01,Hydraulic Press 2,92.6,4800,210,34,90,Critical
PRS-02,Hydraulic Press 2,74.1,3600,410,8,20,Optimal
WLD-01,Laser Welding 3,62.4,3100,540,2,0,Optimal
WLD-02,Laser Welding 3,79.8,3900,460,12,35,Warning`,
  },
};

export default function DataLens() {
  const dispatch = useDispatch();
  const { activeWorkspace, workspaces } = useSelector((state) => state.workspace);
  const currentWs = workspaces[activeWorkspace] || workspaces.general;

  // Active Dataset & Analysis State
  const [selectedPreset, setSelectedPreset] = useState('ecommerce');
  const [dataText, setDataText] = useState(SAMPLE_DATASETS.ecommerce.csv);
  const [datasetName, setDatasetName] = useState(SAMPLE_DATASETS.ecommerce.name);
  const [loading, setLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);

  // Chart Controls State
  const [chartType, setChartType] = useState('bar'); // 'bar' | 'line' | 'donut' | 'area' | 'scatter'
  const [xAxisCol, setXAxisCol] = useState('');
  const [yAxisCol, setYAxisCol] = useState('');
  const [aggFunc, setAggFunc] = useState('sum'); // 'sum' | 'avg' | 'count' | 'max' | 'min'
  const [topNLimit, setTopNLimit] = useState(8);

  // Q&A Chat State
  const [chatQuestion, setChatQuestion] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatHistory, setChatHistory] = useState([
    {
      role: 'assistant',
      content:
        'Welcome to DataLens Universal Analytics. I have processed your dataset and generated statistical summaries and key insights. You can ask specific analytical questions or explore custom visualizations below.',
    },
  ]);

  // Data Explorer Table State
  const [tableSearch, setTableSearch] = useState('');
  const [sortCol, setSortCol] = useState('');
  const [sortOrder, setSortOrder] = useState('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;

  // Run initial analysis on mount
  useEffect(() => {
    runAnalysis(dataText, datasetName);
  }, []);

  const runAnalysis = async (textToAnalyze, name) => {
    if (!textToAnalyze.trim()) return;
    setLoading(true);
    try {
      const res = await api.post('/api/tools/analyze-data', {
        data_text: textToAnalyze,
        dataset_name: name || 'Universal Dataset',
        workspace: activeWorkspace,
      });
      setAnalysisResult(res.data);

      // Auto-set initial chart dimensions
      const profile = res.data.profile;
      const numCols = Object.keys(profile.col_types).filter((k) => profile.col_types[k] === 'numeric');
      const catCols = Object.keys(profile.col_types).filter((k) => profile.col_types[k] === 'categorical');

      if (catCols.length > 0) setXAxisCol(catCols[0]);
      else if (numCols.length > 0) setXAxisCol(numCols[0]);

      if (numCols.length > 0) setYAxisCol(numCols[0]);
      else if (catCols.length > 1) setYAxisCol(catCols[1]);

      dispatch(addToast({ type: 'success', message: `DataLens profiled ${profile.row_count} records successfully!` }));
    } catch (err) {
      dispatch(addToast({ type: 'error', message: `Analysis failed: ${err.response?.data?.detail || err.message}` }));
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPreset = (presetKey) => {
    const p = SAMPLE_DATASETS[presetKey];
    if (!p) return;
    setSelectedPreset(presetKey);
    setDataText(p.csv);
    setDatasetName(p.name);
    runAnalysis(p.csv, p.name);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target.result;
      setDataText(content);
      setDatasetName(file.name);
      runAnalysis(content, file.name);
    };
    reader.readAsText(file);
  };

  const handleAskQuestion = async (e) => {
    e.preventDefault();
    const q = chatQuestion.trim();
    if (!q || chatLoading || !analysisResult) return;

    setChatQuestion('');
    const userMsg = { role: 'user', content: q };
    setChatHistory((prev) => [...prev, userMsg]);
    setChatLoading(true);

    try {
      const res = await api.post('/api/tools/ask-data', {
        question: q,
        dataset_name: datasetName,
        summary_context: {
          rows: analysisResult.profile.row_count,
          cols: analysisResult.profile.col_count,
          health_score: analysisResult.profile.health_score,
          stats: analysisResult.profile.col_stats,
        },
      });

      const aiMsg = { role: 'assistant', content: res.data.answer };
      setChatHistory((prev) => [...prev, aiMsg]);
    } catch (err) {
      setChatHistory((prev) => [
        ...prev,
        { role: 'assistant', content: `Error answering question: ${err.message}` },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  // ─── Computed Chart Data ───────────────────────────────────────────────────
  const chartData = useMemo(() => {
    if (!analysisResult?.profile?.sample_rows || !xAxisCol) return [];
    const rows = analysisResult.profile.sample_rows;
    const grouped = {};

    rows.forEach((r) => {
      const xVal = r[xAxisCol] || 'Unknown';
      let yVal = 1;
      if (yAxisCol && r[yAxisCol] !== undefined) {
        const parsed = parseFloat(String(r[yAxisCol]).replace(/[$,%]/g, ''));
        yVal = isNaN(parsed) ? 1 : parsed;
      }

      if (!grouped[xVal]) {
        grouped[xVal] = { count: 0, sum: 0, values: [], max: -Infinity, min: Infinity };
      }
      grouped[xVal].count += 1;
      grouped[xVal].sum += yVal;
      grouped[xVal].values.push(yVal);
      grouped[xVal].max = Math.max(grouped[xVal].max, yVal);
      grouped[xVal].min = Math.min(grouped[xVal].min, yVal);
    });

    let results = Object.keys(grouped).map((label) => {
      const g = grouped[label];
      let finalVal = g.sum;
      if (aggFunc === 'avg') finalVal = g.count ? g.sum / g.count : 0;
      else if (aggFunc === 'count') finalVal = g.count;
      else if (aggFunc === 'max') finalVal = g.max;
      else if (aggFunc === 'min') finalVal = g.min;

      return {
        label,
        value: Math.round(finalVal * 100) / 100,
        count: g.count,
      };
    });

    // Sort descending by default
    results.sort((a, b) => b.value - a.value);
    if (topNLimit > 0) results = results.slice(0, topNLimit);

    return results;
  }, [analysisResult, xAxisCol, yAxisCol, aggFunc, topNLimit]);

  // ─── Computed Table Rows ───────────────────────────────────────────────────
  const filteredTableRows = useMemo(() => {
    if (!analysisResult?.profile?.sample_rows) return [];
    let rows = [...analysisResult.profile.sample_rows];

    if (tableSearch.trim()) {
      const q = tableSearch.toLowerCase();
      rows = rows.filter((r) => Object.values(r).some((v) => String(v).toLowerCase().includes(q)));
    }

    if (sortCol) {
      rows.sort((a, b) => {
        let valA = a[sortCol];
        let valB = b[sortCol];
        const numA = parseFloat(valA);
        const numB = parseFloat(valB);
        if (!isNaN(numA) && !isNaN(numB)) {
          return sortOrder === 'asc' ? numA - numB : numB - numA;
        }
        return sortOrder === 'asc'
          ? String(valA).localeCompare(String(valB))
          : String(valB).localeCompare(String(valA));
      });
    }

    return rows;
  }, [analysisResult, tableSearch, sortCol, sortOrder]);

  const totalPages = Math.ceil(filteredTableRows.length / rowsPerPage) || 1;
  const paginatedRows = filteredTableRows.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  const profile = analysisResult?.profile;
  const numCols = profile ? Object.keys(profile.col_types).filter((k) => profile.col_types[k] === 'numeric') : [];
  const allCols = profile ? profile.headers : [];

  return (
    <div className="datalens-page">
      {/* Responsive Header */}
      <div className="datalens-page-header">
        <div className="datalens-header-left">
          <div
            style={{
              width: 36,
              height: 36,
              minWidth: 36,
              background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: 'var(--shadow-primary)',
              flexShrink: 0,
            }}
          >
            <BarChart3 size={18} color="white" />
          </div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--color-text-primary)', letterSpacing: '-0.5px' }}>
              DataLens Universal
            </h1>
            <span style={{ fontSize: 12.5, color: 'var(--color-text-secondary)', display: 'block', marginTop: 2 }}>
              AI-Powered Data Analytics, Interactive Visualizations &amp; Trend Intelligence
            </span>
          </div>
        </div>

        <div className="datalens-header-actions">
          <label className="btn btn-secondary" style={{ cursor: 'pointer', fontSize: 12, justifyContent: 'center' }}>
            <Upload size={13} />
            Upload CSV / JSON
            <input type="file" style={{ display: 'none' }} accept=".csv,.json,.txt,.tsv" onChange={handleFileUpload} />
          </label>
          <button
            className="btn btn-primary"
            onClick={() => runAnalysis(dataText, datasetName)}
            disabled={loading}
            style={{ fontSize: 12, background: currentWs.gradient, justifyContent: 'center' }}
          >
            {loading ? <Loader2 size={13} className="spinner" /> : <RefreshCw size={13} />}
            Re-Analyze
          </button>
        </div>
      </div>

      {/* Preset Dataset Badges */}
      <div className="dataset-preset-chips">
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
          Sample Datasets:
        </span>
        {Object.keys(SAMPLE_DATASETS).map((k) => (
          <button
            key={k}
            type="button"
            className={`quick-chip ${selectedPreset === k ? 'active' : ''}`}
            onClick={() => handleSelectPreset(k)}
            style={
              selectedPreset === k
                ? { background: 'var(--color-primary)', color: '#fff', borderColor: 'var(--color-primary)' }
                : {}
            }
          >
            {SAMPLE_DATASETS[k].name}
          </button>
        ))}
      </div>

      {/* ─── Top KPI Stat Cards ────────────────────────────────────────────── */}
      {profile && (
        <div className="stats-grid" style={{ marginBottom: 24 }}>
          <div className="stat-card primary">
            <div className="stat-card-icon primary">
              <Layers size={18} />
            </div>
            <div className="stat-value">{profile.row_count.toLocaleString()}</div>
            <div className="stat-label">Total Rows Analyzed</div>
          </div>

          <div className="stat-card success">
            <div className="stat-card-icon success">
              <ShieldCheck size={18} />
            </div>
            <div className="stat-value">{profile.health_score}%</div>
            <div className="stat-label">Data Health &amp; Completeness</div>
          </div>

          <div className="stat-card warning">
            <div className="stat-card-icon warning">
              <TrendingUp size={18} />
            </div>
            <div className="stat-value">{profile.col_count}</div>
            <div className="stat-label">Attributes &amp; Dimensions</div>
          </div>

          <div className="stat-card danger" style={{ borderColor: 'rgba(139, 92, 246, 0.3)' }}>
            <div className="stat-card-icon" style={{ background: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6' }}>
              <Zap size={18} />
            </div>
            <div className="stat-value">{numCols.length}</div>
            <div className="stat-label">Quantitative Metrics</div>
          </div>
        </div>
      )}

      {/* ─── Main Grid: Interactive Visual Chart & AI Copilot ────────────────── */}
      <div className="datalens-main-grid">
        {/* Left: Interactive Visual Chart Studio */}
        <div className="tool-workspace-card" style={{ marginBottom: 0 }}>
          <div className="chart-builder-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <BarChart3 size={17} color="var(--color-primary)" />
              <h3 style={{ fontSize: 15, fontWeight: 700 }}>Interactive Visual Chart Builder</h3>
            </div>

            {/* Chart Type Selector */}
            <div className="chart-type-selector-pill">
              <button
                type="button"
                className={`btn btn-secondary ${chartType === 'bar' ? 'active' : ''}`}
                style={{ padding: '4px 8px', fontSize: 11, border: 'none' }}
                onClick={() => setChartType('bar')}
                title="Bar / Column Chart"
              >
                <BarChart3 size={13} />
                Bar
              </button>
              <button
                type="button"
                className={`btn btn-secondary ${chartType === 'line' ? 'active' : ''}`}
                style={{ padding: '4px 8px', fontSize: 11, border: 'none' }}
                onClick={() => setChartType('line')}
                title="Line Trend Chart"
              >
                <LineChartIcon size={13} />
                Line
              </button>
              <button
                type="button"
                className={`btn btn-secondary ${chartType === 'donut' ? 'active' : ''}`}
                style={{ padding: '4px 8px', fontSize: 11, border: 'none' }}
                onClick={() => setChartType('donut')}
                title="Donut / Distribution Chart"
              >
                <PieChartIcon size={13} />
                Donut
              </button>
            </div>
          </div>

          {/* Chart Controls Bar (Responsive 2x2 Grid on Mobile) */}
          <div className="chart-controls-grid">
            <div className="chart-control-field">
              <label className="field-label" style={{ fontSize: 11 }}>X-Axis Dimension</label>
              <select
                className="field-input field-select"
                style={{ padding: '6px 10px', fontSize: 12 }}
                value={xAxisCol}
                onChange={(e) => setXAxisCol(e.target.value)}
              >
                {allCols.map((c) => (
                  <option key={c} value={c}>
                    {c} ({profile?.col_types[c] || 'text'})
                  </option>
                ))}
              </select>
            </div>

            <div className="chart-control-field">
              <label className="field-label" style={{ fontSize: 11 }}>Y-Axis Metric</label>
              <select
                className="field-input field-select"
                style={{ padding: '6px 10px', fontSize: 12 }}
                value={yAxisCol}
                onChange={(e) => setYAxisCol(e.target.value)}
              >
                {allCols.map((c) => (
                  <option key={c} value={c}>
                    {c} ({profile?.col_types[c] || 'text'})
                  </option>
                ))}
              </select>
            </div>

            <div className="chart-control-field">
              <label className="field-label" style={{ fontSize: 11 }}>Aggregation</label>
              <select
                className="field-input field-select"
                style={{ padding: '6px 10px', fontSize: 12 }}
                value={aggFunc}
                onChange={(e) => setAggFunc(e.target.value)}
              >
                <option value="sum">Sum</option>
                <option value="avg">Average</option>
                <option value="count">Count</option>
                <option value="max">Max</option>
                <option value="min">Min</option>
              </select>
            </div>

            <div className="chart-control-field">
              <label className="field-label" style={{ fontSize: 11 }}>Limit</label>
              <select
                className="field-input field-select"
                style={{ padding: '6px 10px', fontSize: 12 }}
                value={topNLimit}
                onChange={(e) => setTopNLimit(Number(e.target.value))}
              >
                <option value={5}>Top 5</option>
                <option value={8}>Top 8</option>
                <option value={15}>Top 15</option>
                <option value={0}>All</option>
              </select>
            </div>
          </div>

          {/* SVG Visual Canvas */}
          <div
            style={{
              background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
              borderRadius: 'var(--radius-lg)',
              padding: '24px 20px',
              minHeight: 280,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              overflowX: 'auto',
            }}
          >
            {chartData.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
                Select X and Y dimensions above to render the chart.
              </div>
            ) : chartType === 'bar' ? (
              <SVGBarChart data={chartData} yLabel={`${aggFunc.toUpperCase()}(${yAxisCol})`} />
            ) : chartType === 'line' ? (
              <SVGLineChart data={chartData} yLabel={`${aggFunc.toUpperCase()}(${yAxisCol})`} />
            ) : (
              <SVGDonutChart data={chartData} />
            )}
          </div>
        </div>

        {/* Right: AI Executive Synthesis & Ask DataLens Q&A */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Executive AI Insights */}
          <div className="tool-workspace-card" style={{ flex: 1, marginBottom: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <Sparkles size={16} color="var(--color-primary)" />
              <h3 style={{ fontSize: 15, fontWeight: 700 }}>DataLens AI Executive Intelligence</h3>
            </div>

            <p style={{ fontSize: 12.5, color: 'var(--color-text-secondary)', lineHeight: 1.5, marginBottom: 14 }}>
              {analysisResult?.executive_summary || 'Analyzing dataset profile and statistical distributions...'}
            </p>

            {analysisResult?.key_insights && analysisResult.key_insights.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>
                  Key Patterns &amp; Anomalies
                </div>
                <ul style={{ paddingLeft: 18, fontSize: 12, color: 'var(--color-text-primary)', lineHeight: 1.5 }}>
                  {analysisResult.key_insights.slice(0, 4).map((ins, i) => (
                    <li key={i} style={{ marginBottom: 4 }}>
                      {ins}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Ask DataLens Q&A Copilot */}
          <div className="tool-workspace-card" style={{ marginBottom: 0, padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
              <HelpCircle size={15} color="var(--color-accent)" />
              <h4 style={{ fontSize: 13, fontWeight: 700 }}>Ask DataLens Copilot</h4>
            </div>

            <div
              style={{
                maxHeight: 140,
                overflowY: 'auto',
                fontSize: 12,
                color: 'var(--color-text-primary)',
                background: 'var(--color-surface-2)',
                padding: 10,
                borderRadius: 'var(--radius-md)',
                marginBottom: 10,
              }}
            >
              {chatHistory.slice(-2).map((m, idx) => (
                <div key={idx} style={{ marginBottom: 6 }}>
                  <strong style={{ color: m.role === 'user' ? 'var(--color-primary)' : 'var(--color-accent)' }}>
                    {m.role === 'user' ? 'You: ' : 'DataLens: '}
                  </strong>
                  <span style={{ whiteSpace: 'pre-wrap' }}>{m.content}</span>
                </div>
              ))}
              {chatLoading && (
                <div style={{ color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Loader2 size={12} className="spinner" /> Analyzing data calculations...
                </div>
              )}
            </div>

            <form onSubmit={handleAskQuestion} style={{ display: 'flex', gap: 6 }}>
              <input
                className="field-input"
                style={{ fontSize: 12, padding: '6px 10px' }}
                placeholder="Ask e.g. Which segment has highest margin?"
                value={chatQuestion}
                onChange={(e) => setChatQuestion(e.target.value)}
                disabled={chatLoading}
              />
              <button
                type="submit"
                className="btn btn-primary"
                style={{ padding: '6px 12px', fontSize: 12 }}
                disabled={chatLoading || !chatQuestion.trim()}
              >
                <Send size={13} />
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* ─── Bottom: Interactive Data Explorer Table ────────────────────────── */}
      <div className="table-card">
        <div className="table-header" style={{ padding: '14px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700 }}>Data Explorer &amp; Raw Records</h3>
            <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
              ({filteredTableRows.length} matching rows)
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--color-surface-2)', padding: '4px 10px', borderRadius: 'var(--radius-md)' }}>
              <Search size={13} color="var(--color-text-muted)" />
              <input
                placeholder="Filter table rows..."
                value={tableSearch}
                onChange={(e) => {
                  setTableSearch(e.target.value);
                  setCurrentPage(1);
                }}
                style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: 12, width: 140 }}
              />
            </div>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                {allCols.map((col) => (
                  <th
                    key={col}
                    style={{ cursor: 'pointer', userSelect: 'none' }}
                    onClick={() => {
                      if (sortCol === col) setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                      else {
                        setSortCol(col);
                        setSortOrder('asc');
                      }
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span>{col}</span>
                      <ArrowUpDown size={11} style={{ opacity: sortCol === col ? 1 : 0.4 }} />
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginatedRows.length === 0 ? (
                <tr>
                  <td colSpan={allCols.length || 1} style={{ textAlign: 'center', padding: 24, color: 'var(--color-text-muted)' }}>
                    No matching rows found.
                  </td>
                </tr>
              ) : (
                paginatedRows.map((r, rowIdx) => (
                  <tr key={rowIdx}>
                    {allCols.map((c) => (
                      <td key={c} style={{ fontSize: 12 }}>
                        {r[c] !== undefined ? String(r[c]) : '—'}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Table Pagination */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderTop: '1px solid var(--color-border)' }}>
          <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
            Page {currentPage} of {totalPages}
          </span>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ padding: '4px 8px', fontSize: 11 }}
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft size={13} />
              Previous
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ padding: '4px 8px', fontSize: 11 }}
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
              <ChevronRight size={13} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Custom SVG Interactive Chart Components ─────────────────────────────────

function SVGBarChart({ data, yLabel }) {
  const maxVal = Math.max(...data.map((d) => d.value), 1);
  const chartHeight = 180;
  const barMinWidth = Math.max(data.length * 48, 280);

  return (
    <div style={{ width: '100%', overflowX: 'auto', minWidth: 0, paddingBottom: 4 }}>
      <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 8, fontWeight: 600 }}>
        Metric: {yLabel}
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height: chartHeight, paddingBottom: 24, borderBottom: '1px solid #334155', minWidth: barMinWidth }}>
        {data.map((d, idx) => {
          const heightPct = Math.max(8, (d.value / maxVal) * 100);
          return (
            <div key={idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end', minWidth: 32 }}>
              <div style={{ fontSize: 10, color: '#60a5fa', fontWeight: 700, marginBottom: 4 }}>
                {d.value.toLocaleString()}
              </div>
              <div
                style={{
                  width: '100%',
                  maxWidth: 38,
                  height: `${heightPct}%`,
                  background: 'linear-gradient(180deg, #60a5fa 0%, #2563eb 100%)',
                  borderRadius: '4px 4px 0 0',
                  transition: 'height 0.4s ease',
                  boxShadow: '0 0 10px rgba(96, 165, 250, 0.2)',
                }}
                title={`${d.label}: ${d.value.toLocaleString()}`}
              />
              <div
                style={{
                  fontSize: 10,
                  color: '#cbd5e1',
                  marginTop: 6,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxWidth: 56,
                  textAlign: 'center',
                }}
                title={d.label}
              >
                {d.label}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SVGLineChart({ data, yLabel }) {
  const maxVal = Math.max(...data.map((d) => d.value), 1);
  const minVal = Math.min(...data.map((d) => d.value), 0);
  const range = maxVal - minVal || 1;
  const svgWidth = Math.max(data.length * 60, 360);
  const svgHeight = 160;

  const points = data.map((d, i) => {
    const x = (i / Math.max(data.length - 1, 1)) * (svgWidth - 40) + 20;
    const y = svgHeight - ((d.value - minVal) / range) * (svgHeight - 40) - 20;
    return `${x},${y}`;
  }).join(' ');

  return (
    <div style={{ width: '100%', overflowX: 'auto', minWidth: 0, paddingBottom: 4 }}>
      <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 8, fontWeight: 600 }}>
        Trend: {yLabel}
      </div>
      <div style={{ minWidth: svgWidth }}>
        <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} style={{ width: '100%', height: 160, overflow: 'visible' }}>
          <polyline fill="none" stroke="#818cf8" strokeWidth="3" points={points} />
          {data.map((d, i) => {
            const x = (i / Math.max(data.length - 1, 1)) * (svgWidth - 40) + 20;
            const y = svgHeight - ((d.value - minVal) / range) * (svgHeight - 40) - 20;
            return (
              <g key={i}>
                <circle cx={x} cy={y} r="5" fill="#3b82f6" stroke="#fff" strokeWidth="2" />
                <text x={x} y={y - 10} fill="#c7d2fe" fontSize="10" textAnchor="middle">
                  {d.value}
                </text>
                <text x={x} y={svgHeight + 14} fill="#94a3b8" fontSize="10" textAnchor="middle">
                  {d.label.slice(0, 8)}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

function SVGDonutChart({ data }) {
  const total = data.reduce((acc, d) => acc + d.value, 0) || 1;
  let accumulatedAngle = 0;
  const colors = ['#60a5fa', '#818cf8', '#34d399', '#f472b6', '#fbbf24', '#a78bfa', '#f87171', '#3b82f6'];

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', gap: 16, flexWrap: 'wrap', width: '100%', minWidth: 0 }}>
      <svg viewBox="0 0 160 160" style={{ width: 140, height: 140, flexShrink: 0 }}>
        {data.map((d, i) => {
          const sliceAngle = (d.value / total) * 360;
          const startAngle = accumulatedAngle;
          accumulatedAngle += sliceAngle;

          const x1 = 80 + 60 * Math.cos((Math.PI * (startAngle - 90)) / 180);
          const y1 = 80 + 60 * Math.sin((Math.PI * (startAngle - 90)) / 180);
          const x2 = 80 + 60 * Math.cos((Math.PI * (startAngle + sliceAngle - 90)) / 180);
          const y2 = 80 + 60 * Math.sin((Math.PI * (startAngle + sliceAngle - 90)) / 180);

          const largeArc = sliceAngle > 180 ? 1 : 0;
          const pathData = `M 80 80 L ${x1} ${y1} A 60 60 0 ${largeArc} 1 ${x2} ${y2} Z`;

          return <path key={i} d={pathData} fill={colors[i % colors.length]} opacity="0.9" />;
        })}
        {/* Inner Donut cutout */}
        <circle cx="80" cy="80" r="38" fill="#0f172a" />
        <text x="80" y="84" fill="#fff" fontSize="11" fontWeight="700" textAnchor="middle">
          {total.toLocaleString()}
        </text>
      </svg>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 160, overflowY: 'auto', minWidth: 120, flex: 1 }}>
        {data.map((d, i) => {
          const pct = Math.round((d.value / total) * 100);
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: colors[i % colors.length], flexShrink: 0 }} />
              <span style={{ color: '#cbd5e1', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 90 }}>{d.label}:</span>
              <strong style={{ color: '#fff' }}>{pct}%</strong>
            </div>
          );
        })}
      </div>
    </div>
  );
}

