import React, { useState, useEffect, useCallback } from 'react'
import {
  AISettings,
  AnalysisJobOptions,
  AnalysisJobProgress,
  AnalysisJobSummary,
  FileAnalysisRecord,
  SemanticCategory
} from '../../../shared/types'
import { AIDetailsModal } from './AIDetailsModal'
import {
  Brain,
  Sparkles,
  Pause,
  RefreshCw,
  Search,
  Settings,
  ShieldCheck,
  Eye,
  Key,
  Activity,
  FileQuestion
} from 'lucide-react'


function getCategoryColor(category: SemanticCategory): string {
  switch (category) {
    case 'University Notes':
    case 'Educational Materials':
      return 'var(--accent-cyan)'
    case 'Research Papers':
      return '#38bdf8'
    case 'Invoices and Receipts':
      return 'var(--accent-emerald)'
    case 'Personal Documents':
    case 'Administrative Documents':
      return 'var(--accent-blue)'
    case 'Source Code':
    case 'Software Project Assets':
      return '#a855f7'
    case 'Configuration Files':
      return 'var(--accent-purple)'
    case 'Datasets':
    case 'AI Models and Model Artifacts':
      return 'var(--accent-amber)'
    case 'Logs and Diagnostic Files':
      return 'var(--accent-rose)'
    default:
      return 'var(--text-secondary)'
  }
}

export const AIAnalysisView: React.FC = () => {
  // Settings & Configuration State
  const [settings, setSettings] = useState<AISettings>({
    provider: 'openrouter',
    apiKeyConfigured: false,
    model: 'google/gemma-4-31b-it:free',
    consentGranted: false
  })
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false)
  const [inputApiKey, setInputApiKey] = useState<string>('')
  const [selectedModel, setSelectedModel] = useState<string>('google/gemma-4-31b-it:free')
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null)
  const [isTesting, setIsTesting] = useState<boolean>(false)

  // Options State
  const [generateSummaries, setGenerateSummaries] = useState<boolean>(true)
  const [forceReanalyze, setForceReanalyze] = useState<boolean>(false)
  const [userConsent, setUserConsent] = useState<boolean>(false)

  // Execution State
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false)
  const [currentJobId, setCurrentJobId] = useState<string | null>(null)
  const [progress, setProgress] = useState<AnalysisJobProgress | null>(null)
  const [lastSummary, setLastSummary] = useState<AnalysisJobSummary | null>(null)

  // Results State
  const [results, setResults] = useState<FileAnalysisRecord[]>([])
  const [totalResults, setTotalResults] = useState<number>(0)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [activeModalRecord, setActiveModalRecord] = useState<FileAnalysisRecord | null>(null)

  // Load Settings and Results
  const loadSettings = useCallback(async () => {
    try {
      const s = await window.api.aiGetSettings()
      setSettings(s)
      setSelectedModel(s.model)
      setUserConsent(s.consentGranted)
    } catch (err) {
      console.error('Failed to load AI settings:', err)
    }
  }, [])

  const loadResults = useCallback(async (category = 'all', query = '') => {
    try {
      const data = await window.api.aiGetResults(0, 150, category, query)
      setResults(data.items)
      setTotalResults(data.total)
    } catch (err) {
      console.error('Failed to load analysis results:', err)
    }
  }, [])

  useEffect(() => {
    loadSettings()
    loadResults(selectedCategory, searchQuery)
  }, [loadSettings, loadResults, selectedCategory, searchQuery])

  // Subscribe to live progress and completion events
  useEffect(() => {
    if (!window.api) return

    const unsubProgress = window.api.onAIProgress((p) => {
      setProgress(p)
      setIsAnalyzing(!['completed', 'cancelled', 'failed'].includes(p.state))
    })

    const unsubCompleted = window.api.onAICompleted((summary) => {
      setIsAnalyzing(false)
      setLastSummary(summary)
      loadResults(selectedCategory, searchQuery)
    })

    return () => {
      unsubProgress()
      unsubCompleted()
    }
  }, [loadResults, selectedCategory, searchQuery])

  // Action: Start Analysis
  const handleStartAnalysis = async () => {
    if (!settings.apiKeyConfigured) {
      setShowSettingsModal(true)
      return
    }

    if (!userConsent) {
      alert('Please grant informed consent before sending document text for AI analysis.')
      return
    }

    const options: AnalysisJobOptions = {
      generateSummaries,
      forceReanalyze,
      maxConcurrency: 3,
      userConsentGiven: true
    }

    try {
      setIsAnalyzing(true)
      setProgress(null)
      const res = await window.api.aiStartAnalysis(options)
      if (res.started) {
        setCurrentJobId(res.jobId)
      } else {
        setIsAnalyzing(false)
        alert(res.error || 'Failed to start AI analysis')
      }
    } catch (err) {
      setIsAnalyzing(false)
      console.error('Start analysis error:', err)
    }
  }

  // Action: Cancel Analysis
  const handleCancelAnalysis = async () => {
    if (currentJobId) {
      await window.api.aiCancelAnalysis(currentJobId)
    }
  }

  // Action: Test Connection
  const handleTestConnection = async () => {
    setIsTesting(true)
    setTestResult(null)
    try {
      const res = await window.api.aiTestConnection()
      setTestResult(res)
    } catch (err) {
      setTestResult({
        ok: false,
        message: err instanceof Error ? err.message : 'Connection test failed'
      })
    } finally {
      setIsTesting(false)
    }
  }

  // Action: Save Settings
  const handleSaveSettings = async () => {
    try {
      await window.api.aiUpdateSettings({
        apiKey: inputApiKey || undefined,
        model: selectedModel,
        consentGranted: userConsent
      })
      setInputApiKey('')
      setShowSettingsModal(false)
      await loadSettings()
    } catch (err) {
      console.error('Failed to update AI settings:', err)
    }
  }

  return (
    <div className="scanner-container">
      {/* Top Banner & AI Model Bar */}
      <div className="glass-card" style={{ padding: '16px 20px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, var(--accent-purple), var(--accent-cyan))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff'
              }}
            >
              <Brain size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff' }}>
                AI File Understanding & Semantic Classification
              </h2>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Deep document content extraction, purpose classification, and automated summarization via Google Gemini
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setShowSettingsModal(true)}
              title="Configure API Key and Model"
            >
              <Settings size={14} />
              <span>AI Settings ({settings.apiKeyConfigured ? 'Key Configured' : 'No Key'})</span>
            </button>

            {isAnalyzing ? (
              <button className="btn btn-danger btn-sm" onClick={handleCancelAnalysis}>
                <Pause size={14} />
                <span>Cancel Analysis</span>
              </button>
            ) : (
              <button
                className="btn btn-primary btn-sm"
                onClick={handleStartAnalysis}
                disabled={!userConsent}
              >
                <Sparkles size={14} />
                <span>Start AI Analysis</span>
              </button>
            )}
          </div>
        </div>

        {/* Informed Consent & Options Row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'rgba(0, 0, 0, 0.25)',
            padding: '12px 16px',
            borderRadius: 'var(--radius-md)',
            border: userConsent ? '1px solid rgba(0, 210, 255, 0.2)' : '1px solid rgba(245, 158, 11, 0.3)',
            fontSize: '0.8rem'
          }}
        >
          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={userConsent}
              onChange={(e) => {
                setUserConsent(e.target.checked)
                window.api.aiUpdateSettings({ consentGranted: e.target.checked })
              }}
            />
            <span style={{ color: userConsent ? 'var(--text-primary)' : 'var(--accent-amber)', fontWeight: 500 }}>
              <ShieldCheck size={14} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'text-bottom' }} />
              I consent to sending selected document text snippets to Google AI for semantic analysis & summarization.
            </span>
          </label>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={generateSummaries}
                onChange={(e) => setGenerateSummaries(e.target.checked)}
              />
              <span style={{ color: 'var(--text-secondary)' }}>Generate Summaries</span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={forceReanalyze}
                onChange={(e) => setForceReanalyze(e.target.checked)}
              />
              <span style={{ color: 'var(--text-secondary)' }}>Force Reanalyze</span>
            </label>
          </div>
        </div>
      </div>

      {/* Live Analysis Progress Card */}
      {(isAnalyzing || progress || lastSummary) && (
        <div className="glass-card" style={{ padding: '16px 20px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Activity
                size={16}
                color={isAnalyzing ? 'var(--accent-cyan)' : 'var(--accent-emerald)'}
                className={isAnalyzing ? 'pulse' : ''}
              />
              <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                AI Job Status:{' '}
                <span
                  style={{
                    color: isAnalyzing
                      ? 'var(--accent-cyan)'
                      : lastSummary?.state === 'cancelled'
                        ? 'var(--accent-amber)'
                        : 'var(--accent-emerald)',
                    textTransform: 'uppercase',
                    fontSize: '0.8rem',
                    fontFamily: 'var(--font-mono)'
                  }}
                >
                  {isAnalyzing
                    ? progress?.state.toUpperCase() || 'RUNNING'
                    : lastSummary?.state.toUpperCase() || 'COMPLETED'}
                </span>
              </span>
            </div>

            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              {isAnalyzing
                ? `Elapsed: ${((progress?.elapsedMs || 0) / 1000).toFixed(1)}s`
                : `Duration: ${((lastSummary?.durationMs || 0) / 1000).toFixed(1)}s`}
            </div>
          </div>

          {/* Counters Row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px', marginBottom: '10px' }}>
            <div className="stat-card">
              <span className="stat-label">Eligible Files</span>
              <span className="stat-value" style={{ color: 'var(--accent-cyan)' }}>
                {isAnalyzing ? progress?.totalEligible || 0 : lastSummary?.totalEligible || totalResults}
              </span>
            </div>
            <div className="stat-card">
              <span className="stat-label">Processed</span>
              <span className="stat-value" style={{ color: 'var(--accent-blue)' }}>
                {isAnalyzing ? progress?.processedCount || 0 : totalResults}
              </span>
            </div>
            <div className="stat-card">
              <span className="stat-label">Successfully Classified</span>
              <span className="stat-value" style={{ color: 'var(--accent-emerald)' }}>
                {isAnalyzing ? progress?.successCount || 0 : lastSummary?.successCount || totalResults}
              </span>
            </div>
            <div className="stat-card">
              <span className="stat-label">Failed / Errors</span>
              <span
                className="stat-value"
                style={{
                  color: (lastSummary?.failedCount || 0) > 0 ? 'var(--accent-rose)' : 'var(--text-muted)'
                }}
              >
                {isAnalyzing ? progress?.failedCount || 0 : lastSummary?.failedCount || 0}
              </span>
            </div>
            <div className="stat-card">
              <span className="stat-label">Skipped (Cached)</span>
              <span className="stat-value" style={{ color: 'var(--accent-purple)' }}>
                {isAnalyzing ? progress?.skippedCount || 0 : lastSummary?.skippedCount || 0}
              </span>
            </div>
          </div>

          {/* Current Stage Ticker */}
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.74rem',
              color: 'var(--text-muted)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}
          >
            {isAnalyzing
              ? progress?.currentStage || 'Extracting and analyzing...'
              : lastSummary
                ? `Done. Successfully classified ${lastSummary.successCount} files.`
                : ''}
          </div>
        </div>
      )}

      {/* Results Explorer Card */}
      <div className="glass-card" style={{ padding: '16px' }}>
        {/* Search & Category Filter */}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '14px' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <Search
              size={15}
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50)',
                color: 'var(--text-muted)'
              }}
            />
            <input
              type="text"
              placeholder="Search classified documents by name, purpose, or summary..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
              style={{ paddingLeft: '36px' }}
            />
          </div>

          <button
            className="btn btn-secondary btn-sm"
            onClick={() => loadResults(selectedCategory, searchQuery)}
            title="Reload records"
          >
            <RefreshCw size={13} />
            <span>Reload</span>
          </button>
        </div>

        {/* Category Pills */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '14px' }}>
          <button
            className={`category-pill ${selectedCategory === 'all' ? 'active' : ''}`}
            onClick={() => setSelectedCategory('all')}
          >
            All Categories ({totalResults})
          </button>
          {[
            'University Notes',
            'Research Papers',
            'Educational Materials',
            'Invoices and Receipts',
            'Personal Documents',
            'Source Code',
            'Configuration Files',
            'Datasets',
            'Logs and Diagnostic Files',
            'Other'
          ].map((cat) => (
            <button
              key={cat}
              className={`category-pill ${selectedCategory === cat ? 'active' : ''}`}
              style={{ borderColor: getCategoryColor(cat as SemanticCategory) }}
              onClick={() => setSelectedCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Results Table */}
        {results.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
            <FileQuestion size={32} style={{ margin: '0 auto 8px', opacity: 0.5 }} />
            <div>No analysis records found.</div>
            <div style={{ fontSize: '0.78rem', marginTop: '4px' }}>
              Run a System Discovery scan first, then click &quot;Start AI Analysis&quot; to classify your files.
            </div>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Document Name & Path</th>
                  <th>Semantic Category</th>
                  <th>Confidence</th>
                  <th>AI Summary / Description</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {results.map((rec) => (
                  <tr key={rec.fileId}>
                    <td style={{ maxWidth: '320px' }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                        {rec.fileName}
                      </div>
                      <div
                        style={{
                          fontSize: '0.72rem',
                          color: 'var(--text-muted)',
                          wordBreak: 'break-all'
                        }}
                      >
                        {rec.filePath}
                      </div>
                    </td>
                    <td>
                      <span
                        className="badge"
                        style={{
                          color: getCategoryColor(rec.primaryCategory),
                          background: `${getCategoryColor(rec.primaryCategory)}15`,
                          border: `1px solid ${getCategoryColor(rec.primaryCategory)}33`
                        }}
                      >
                        {rec.primaryCategory}
                      </span>
                    </td>
                    <td>
                      <span
                        style={{
                          fontSize: '0.72rem',
                          fontFamily: 'var(--font-mono)',
                          color:
                            rec.confidence >= 0.8
                              ? 'var(--accent-cyan)'
                              : rec.confidence >= 0.5
                                ? 'var(--accent-amber)'
                                : 'var(--text-muted)'
                        }}
                      >
                        {(rec.confidence * 100).toFixed(0)}% ({rec.confidenceLabel})
                      </span>
                    </td>
                    <td style={{ maxWidth: '380px' }}>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-primary)' }}>
                        {rec.summary || rec.description}
                      </div>
                    </td>
                    <td>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => setActiveModalRecord(rec)}
                      >
                        <Eye size={13} />
                        <span>Inspect</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Settings Modal */}
      {showSettingsModal && (
        <div className="modal-backdrop">
          <div className="modal-container" style={{ maxWidth: '580px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, color: '#fff' }}>
                <Key size={18} color="var(--accent-cyan)" />
                <span>AI / LLM Settings (OpenRouter / Google AI)</span>
              </div>
              <button className="btn-icon" onClick={() => setShowSettingsModal(false)}>
                &times;
              </button>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                  AI API Key (OpenRouter or Google AI)
                </label>
                <input
                  type="password"
                  placeholder={settings.apiKeyConfigured ? '•••••••••••••••••••••••• (configured & active)' : 'Enter OpenRouter (sk-or-...) or Google AI Key'}
                  value={inputApiKey}
                  onChange={(e) => setInputApiKey(e.target.value)}
                  className="search-input"
                />
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px', display: 'block' }}>
                  Supports OpenRouter (sk-or-...) for free Gemma 4 / Mixtral or Google AI keys. Never exposed to renderer.
                </span>
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                  AI / LLM Model
                </label>
                <select
                  className="select-dropdown"
                  style={{ width: '100%' }}
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                >
                  <option value="google/gemma-4-31b-it:free">Google: Gemma 4 31B (free) — OpenRouter</option>
                  <option value="google/gemma-4-26b-a4b-it:free">Google: Gemma 4 26B (free) — OpenRouter</option>
                  <option value="minimax/minimax-m3.1-flash:free">MiniMax M3.1 Flash (free) — OpenRouter</option>
                  <option value="nvidia/nemotron-3.5-lightning:free">NVIDIA Nemotron 3.5 (free) — OpenRouter</option>
                  <option value="gemma-4-31b-it">gemma-4-31b-it (Google AI Studio Direct)</option>
                  <option value="gemini-2.5-flash">gemini-2.5-flash (Google AI Studio Direct)</option>
                </select>
              </div>

              {/* Test Connection Button */}
              <div>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={handleTestConnection}
                  disabled={isTesting}
                >
                  <Activity size={14} className={isTesting ? 'spin' : ''} />
                  <span>{isTesting ? 'Testing API...' : 'Test Connection'}</span>
                </button>
              </div>

              {testResult && (
                <div
                  style={{
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-md)',
                    background: testResult.ok ? 'rgba(16, 185, 129, 0.1)' : 'rgba(244, 63, 94, 0.1)',
                    border: `1px solid ${testResult.ok ? 'rgba(16, 185, 129, 0.3)' : 'rgba(244, 63, 94, 0.3)'}`,
                    color: testResult.ok ? 'var(--accent-emerald)' : 'var(--accent-rose)',
                    fontSize: '0.78rem'
                  }}
                >
                  {testResult.message}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button className="btn btn-secondary btn-sm" onClick={() => setShowSettingsModal(false)}>
                  Cancel
                </button>
                <button className="btn btn-primary btn-sm" onClick={handleSaveSettings}>
                  Save Settings
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* File Details Modal */}
      {activeModalRecord && (
        <AIDetailsModal
          record={activeModalRecord}
          onClose={() => setActiveModalRecord(null)}
        />
      )}
    </div>
  )
}
