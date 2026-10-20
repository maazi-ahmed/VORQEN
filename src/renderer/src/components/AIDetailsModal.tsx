import React from 'react'
import { FileAnalysisRecord, SemanticCategory } from '../../../shared/types'
import {
  X,
  FileText,
  Brain,
  ShieldCheck,
  AlertTriangle,
  Sparkles,
  FileCode
} from 'lucide-react'


interface AIDetailsModalProps {
  record: FileAnalysisRecord | null
  onClose: () => void
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}

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

export const AIDetailsModal: React.FC<AIDetailsModalProps> = ({ record, onClose }) => {
  if (!record) return null

  return (
    <div className="modal-backdrop">
      <div className="modal-container" style={{ maxWidth: '850px' }}>
        {/* Modal Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, rgba(168,85,247,0.2), rgba(0,210,255,0.2))',
                border: '1px solid rgba(168,85,247,0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--accent-cyan)'
              }}
            >
              <Brain size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff' }}>
                  {record.fileName}
                </h2>
                <span
                  style={{
                    fontSize: '0.72rem',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontWeight: 600,
                    color: getCategoryColor(record.primaryCategory),
                    background: `${getCategoryColor(record.primaryCategory)}18`,
                    border: `1px solid ${getCategoryColor(record.primaryCategory)}40`
                  }}
                >
                  {record.primaryCategory}
                </span>
                <span
                  style={{
                    fontSize: '0.68rem',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    background:
                      record.analysisStatus === 'success'
                        ? 'rgba(16, 185, 129, 0.15)'
                        : 'rgba(244, 63, 94, 0.15)',
                    color:
                      record.analysisStatus === 'success'
                        ? 'var(--accent-emerald)'
                        : 'var(--accent-rose)',
                    border: `1px solid ${
                      record.analysisStatus === 'success'
                        ? 'rgba(16, 185, 129, 0.3)'
                        : 'rgba(244, 63, 94, 0.3)'
                    }`
                  }}
                >
                  {record.analysisStatus === 'success' ? 'Analysis Success' : 'Analysis Failed'}
                </span>
              </div>
              <div
                style={{
                  fontSize: '0.78rem',
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--text-muted)',
                  marginTop: '3px',
                  wordBreak: 'break-all'
                }}
              >
                {record.filePath}
              </div>
            </div>
          </div>

          <button className="btn-icon" onClick={onClose} title="Close">
            <X size={18} />
          </button>
        </div>

        {/* Modal Content */}
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Metadata Row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
            <div className="stat-card">
              <span className="stat-label">File Size</span>
              <span className="stat-value" style={{ fontSize: '0.95rem' }}>
                {formatBytes(record.fileSizeBytes)}
              </span>
            </div>
            <div className="stat-card">
              <span className="stat-label">Confidence</span>
              <span className="stat-value" style={{ fontSize: '0.95rem', color: 'var(--accent-cyan)' }}>
                {(record.confidence * 100).toFixed(0)}% ({record.confidenceLabel})
              </span>
            </div>
            <div className="stat-card">
              <span className="stat-label">Language</span>
              <span className="stat-value" style={{ fontSize: '0.95rem' }}>
                {record.detectedLanguage || 'Auto / English'}
              </span>
            </div>
            <div className="stat-card">
              <span className="stat-label">Model Used</span>
              <span className="stat-value" style={{ fontSize: '0.85rem', color: 'var(--accent-purple)' }}>
                {record.modelUsed}
              </span>
            </div>
          </div>

          {/* Description Card */}
          <div
            style={{
              padding: '14px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid var(--border-color)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px', fontWeight: 600, color: '#fff' }}>
              <Sparkles size={16} color="var(--accent-cyan)" />
              <span>Semantic Description</span>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              {record.description}
            </p>
          </div>

          {/* AI Summary Card (If available) */}
          {record.summary && (
            <div
              style={{
                padding: '14px',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(0, 210, 255, 0.04)',
                border: '1px solid rgba(0, 210, 255, 0.2)'
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '6px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, color: 'var(--accent-cyan)' }}>
                  <FileText size={16} />
                  <span>AI Document Summary</span>
                </div>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                  Generated from extracted document text
                </span>
              </div>
              <p style={{ fontSize: '0.84rem', color: 'var(--text-primary)', lineHeight: 1.6 }}>
                {record.summary}
              </p>
            </div>
          )}

          {/* Factual Evidence Supporting Classification */}
          {record.evidence && record.evidence.length > 0 && (
            <div
              style={{
                padding: '14px',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid var(--border-color)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', fontWeight: 600, color: 'var(--text-primary)' }}>
                <ShieldCheck size={16} color="var(--accent-emerald)" />
                <span>Supporting Evidence & Quotes</span>
              </div>
              <ul style={{ paddingLeft: '20px', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                {record.evidence.map((ev, i) => (
                  <li key={i} style={{ marginBottom: '4px' }}>
                    {ev}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Extracted Text Snippet */}
          {record.extractedSnippet && (
            <div
              style={{
                padding: '14px',
                borderRadius: 'var(--radius-md)',
                background: '#06090e',
                border: '1px solid var(--border-color)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                <FileCode size={14} />
                <span>Extracted Content Preview (First 300 characters)</span>
              </div>
              <pre
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.76rem',
                  color: 'var(--text-secondary)',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-all'
                }}
              >
                {record.extractedSnippet}
              </pre>
            </div>
          )}

          {/* Error Message (If Failed) */}
          {record.errorMessage && (
            <div
              style={{
                padding: '12px 14px',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(244, 63, 94, 0.08)',
                border: '1px solid rgba(244, 63, 94, 0.3)',
                color: 'var(--accent-rose)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '0.82rem'
              }}
            >
              <AlertTriangle size={16} />
              <span>Failure reason: {record.errorMessage}</span>
            </div>
          )}

          {/* Technical Diagnostics Footer */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '0.72rem',
              color: 'var(--text-muted)',
              borderTop: '1px solid var(--border-color)',
              paddingTop: '10px'
            }}
          >
            <span>Analyzed at: {new Date(record.analyzedAt).toLocaleString()}</span>
            <span>Prompt Version: {record.promptVersion}</span>
            {record.tokensUsed && (
              <span>
                Tokens: {record.tokensUsed.input} input / {record.tokensUsed.output} output
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
