import React, { useState } from 'react'
import { ApplicationInspectionReport, AssociationCategory } from '../../../shared/types'
import {
  X,
  ShieldCheck,
  AlertTriangle,
  FolderTree,
  FileCode,
  HardDrive,
  Info,
  Search
} from 'lucide-react'


interface ApplicationReportModalProps {
  report: ApplicationInspectionReport | null
  onClose: () => void
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}

function getCategoryColor(category: AssociationCategory): string {
  switch (category) {
    case 'direct_installation':
      return 'var(--accent-cyan)'
    case 'application_user_data':
      return 'var(--accent-blue)'
    case 'application_configuration':
      return 'var(--accent-purple)'
    case 'application_cache':
      return 'var(--accent-amber)'
    case 'log_diagnostic':
      return 'var(--accent-rose)'
    case 'dependency_or_shared_runtime':
      return '#a855f7'
    case 'potentially_related':
    case 'uncertain':
      return 'var(--text-muted)'
    default:
      return 'var(--accent-cyan)'
  }
}

export const ApplicationReportModal: React.FC<ApplicationReportModalProps> = ({
  report,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<'files' | 'directories' | 'diagnostics'>('files')
  const [fileSearch, setFileSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')

  if (!report) return null

  const { application: app } = report

  // Filter associated files
  const filteredFiles = report.associatedFiles.filter((item) => {
    const matchesCategory =
      selectedCategory === 'all' || item.association.category === selectedCategory
    const matchesSearch =
      !fileSearch ||
      item.name.toLowerCase().includes(fileSearch.toLowerCase()) ||
      item.path.toLowerCase().includes(fileSearch.toLowerCase())
    return matchesCategory && matchesSearch
  })

  return (
    <div className="modal-backdrop">
      <div className="modal-container">
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, rgba(0,210,255,0.2), rgba(121,40,202,0.2))',
                border: '1px solid rgba(0,210,255,0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--accent-cyan)'
              }}
            >
              <HardDrive size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fff' }}>
                  {app.displayName}
                </h2>
                <span
                  style={{
                    fontSize: '0.72rem',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    background:
                      report.coverageStatus === 'complete'
                        ? 'rgba(16, 185, 129, 0.15)'
                        : report.coverageStatus === 'partial'
                          ? 'rgba(245, 158, 11, 0.15)'
                          : 'rgba(244, 63, 94, 0.15)',
                    color:
                      report.coverageStatus === 'complete'
                        ? 'var(--accent-emerald)'
                        : report.coverageStatus === 'partial'
                          ? 'var(--accent-amber)'
                          : 'var(--accent-rose)',
                    border: `1px solid ${
                      report.coverageStatus === 'complete'
                        ? 'rgba(16, 185, 129, 0.3)'
                        : report.coverageStatus === 'partial'
                          ? 'rgba(245, 158, 11, 0.3)'
                          : 'rgba(244, 63, 94, 0.3)'
                    }`
                  }}
                >
                  {report.coverageStatus === 'complete'
                    ? 'Complete Coverage'
                    : report.coverageStatus === 'partial'
                      ? 'Partial Coverage'
                      : 'Incomplete Coverage'}
                </span>
              </div>
              <div
                style={{
                  fontSize: '0.8rem',
                  color: 'var(--text-secondary)',
                  marginTop: '2px',
                  display: 'flex',
                  gap: '14px'
                }}
              >
                <span>Publisher: {app.publisher}</span>
                <span>•</span>
                <span>Version: {app.displayVersion}</span>
                <span>•</span>
                <span>Source: {app.discoverySource}</span>
              </div>
            </div>
          </div>

          <button className="btn-icon" onClick={onClose} title="Close Report">
            <X size={18} />
          </button>
        </div>

        {/* App Install Path Banner */}
        {app.installLocation && (
          <div
            style={{
              padding: '10px 18px',
              background: 'rgba(255, 255, 255, 0.03)',
              borderBottom: '1px solid var(--border-color)',
              fontSize: '0.78rem',
              color: 'var(--text-secondary)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <FolderTree size={14} color="var(--accent-cyan)" />
            <span>Install Location:</span>
            <code
              style={{
                fontFamily: 'var(--font-mono)',
                color: 'var(--text-primary)',
                wordBreak: 'break-all'
              }}
            >
              {app.installLocation}
            </code>
          </div>
        )}

        {/* Key Metrics Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', padding: '16px 20px 0' }}>
          <div className="stat-card">
            <span className="stat-label">Total Associated Files</span>
            <span className="stat-value" style={{ color: 'var(--accent-cyan)' }}>
              {report.totalAssociatedFiles}
            </span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Discovered Disk Usage</span>
            <span className="stat-value" style={{ color: 'var(--accent-emerald)' }}>
              {formatBytes(report.totalAssociatedSizeBytes)}
            </span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Related Directories</span>
            <span className="stat-value" style={{ color: 'var(--accent-purple)' }}>
              {report.directorySummary.length}
            </span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Active Categories</span>
            <span className="stat-value" style={{ color: 'var(--accent-amber)' }}>
              {report.categoryBreakdown.length}
            </span>
          </div>
        </div>

        {/* Category Breakdown Chips */}
        <div style={{ padding: '14px 20px 0', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          <button
            className={`category-pill ${selectedCategory === 'all' ? 'active' : ''}`}
            onClick={() => setSelectedCategory('all')}
          >
            All Categories ({report.totalAssociatedFiles})
          </button>
          {report.categoryBreakdown.map((cat) => (
            <button
              key={cat.category}
              className={`category-pill ${selectedCategory === cat.category ? 'active' : ''}`}
              style={{ borderColor: getCategoryColor(cat.category) }}
              onClick={() => setSelectedCategory(cat.category)}
            >
              <span
                style={{
                  display: 'inline-block',
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: getCategoryColor(cat.category),
                  marginRight: '6px'
                }}
              />
              {cat.category.replace(/_/g, ' ')} ({cat.fileCount} • {formatBytes(cat.totalSizeBytes)})
            </button>
          ))}
        </div>

        {/* Modal Navigation Tabs */}
        <div className="modal-tabs">
          <button
            className={`tab-btn ${activeTab === 'files' ? 'active' : ''}`}
            onClick={() => setActiveTab('files')}
          >
            <FileCode size={15} />
            <span>Associated Files ({filteredFiles.length})</span>
          </button>
          <button
            className={`tab-btn ${activeTab === 'directories' ? 'active' : ''}`}
            onClick={() => setActiveTab('directories')}
          >
            <FolderTree size={15} />
            <span>Directories ({report.directorySummary.length})</span>
          </button>
          <button
            className={`tab-btn ${activeTab === 'diagnostics' ? 'active' : ''}`}
            onClick={() => setActiveTab('diagnostics')}
          >
            <Info size={15} />
            <span>Diagnostics & Evidence Limitations</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-body">
          {activeTab === 'files' && (
            <div>
              {/* Search Bar */}
              <div style={{ marginBottom: '12px', position: 'relative' }}>
                <Search
                  size={15}
                  style={{
                    position: 'absolute',
                    left: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-muted)'
                  }}
                />
                <input
                  type="text"
                  placeholder="Filter associated files by name or path..."
                  value={fileSearch}
                  onChange={(e) => setFileSearch(e.target.value)}
                  className="search-input"
                  style={{ paddingLeft: '36px' }}
                />
              </div>

              {filteredFiles.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  No associated files found matching criteria.
                </div>
              ) : (
                <div className="table-wrapper">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>File Name & Path</th>
                        <th>Category</th>
                        <th>Size</th>
                        <th>Evidence & Confidence</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredFiles.slice(0, 300).map((file) => (
                        <tr key={file.id}>
                          <td>
                            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                              {file.name}
                            </div>
                            <div
                              style={{
                                fontSize: '0.72rem',
                                color: 'var(--text-muted)',
                                wordBreak: 'break-all'
                              }}
                            >
                              {file.path}
                            </div>
                          </td>
                          <td>
                            <span
                              className="badge"
                              style={{
                                color: getCategoryColor(file.association.category),
                                background: 'rgba(255, 255, 255, 0.05)',
                                border: `1px solid ${getCategoryColor(file.association.category)}33`
                              }}
                            >
                              {file.association.category.replace(/_/g, ' ')}
                            </span>
                          </td>
                          <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
                            {formatBytes(file.sizeBytes)}
                          </td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span
                                style={{
                                  fontSize: '0.68rem',
                                  padding: '1px 5px',
                                  borderRadius: '3px',
                                  textTransform: 'uppercase',
                                  fontFamily: 'var(--font-mono)',
                                  background:
                                    file.association.confidenceTier === 'high'
                                      ? 'rgba(0, 210, 255, 0.15)'
                                      : file.association.confidenceTier === 'medium'
                                        ? 'rgba(245, 158, 11, 0.15)'
                                        : 'rgba(255, 255, 255, 0.08)',
                                  color:
                                    file.association.confidenceTier === 'high'
                                      ? 'var(--accent-cyan)'
                                      : file.association.confidenceTier === 'medium'
                                        ? 'var(--accent-amber)'
                                        : 'var(--text-muted)'
                                }}
                              >
                                {file.association.confidenceTier} ({file.association.relationship})
                              </span>
                            </div>
                            <div
                              style={{
                                fontSize: '0.73rem',
                                color: 'var(--text-secondary)',
                                marginTop: '3px'
                              }}
                            >
                              {file.association.explanation}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {filteredFiles.length > 300 && (
                    <div
                      style={{
                        padding: '12px',
                        textAlign: 'center',
                        fontSize: '0.78rem',
                        color: 'var(--text-muted)'
                      }}
                    >
                      Showing top 300 associated files.
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'directories' && (
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Directory Path</th>
                    <th>Files Count</th>
                    <th>Total Size</th>
                    <th>Primary Category</th>
                  </tr>
                </thead>
                <tbody>
                  {report.directorySummary.map((dir, idx) => (
                    <tr key={idx}>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}>
                        {dir.directoryPath}
                      </td>
                      <td>{dir.fileCount}</td>
                      <td style={{ fontFamily: 'var(--font-mono)' }}>{formatBytes(dir.totalSizeBytes)}</td>
                      <td>
                        <span
                          className="badge"
                          style={{
                            color: getCategoryColor(dir.category),
                            background: 'rgba(255, 255, 255, 0.05)',
                            border: `1px solid ${getCategoryColor(dir.category)}33`
                          }}
                        >
                          {dir.category.replace(/_/g, ' ')}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'diagnostics' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div
                style={{
                  padding: '14px',
                  borderRadius: '8px',
                  background: 'rgba(0, 210, 255, 0.05)',
                  border: '1px solid rgba(0, 210, 255, 0.2)'
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontWeight: 600,
                    marginBottom: '6px',
                    color: 'var(--accent-cyan)'
                  }}
                >
                  <ShieldCheck size={18} />
                  <span>Scan Coverage & Integrity</span>
                </div>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                  {report.diagnostics.scanCoverageNotes}
                </p>
              </div>

              {report.diagnostics.unresolvedLocations.length > 0 && (
                <div
                  style={{
                    padding: '14px',
                    borderRadius: '8px',
                    background: 'rgba(245, 158, 11, 0.05)',
                    border: '1px solid rgba(245, 158, 11, 0.2)'
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontWeight: 600,
                      marginBottom: '6px',
                      color: 'var(--accent-amber)'
                    }}
                  >
                    <AlertTriangle size={18} />
                    <span>Unresolved Locations</span>
                  </div>
                  <ul style={{ paddingLeft: '20px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    {report.diagnostics.unresolvedLocations.map((loc, i) => (
                      <li key={i}>{loc}</li>
                    ))}
                  </ul>
                </div>
              )}

              {report.inaccessibleLocations.length > 0 && (
                <div
                  style={{
                    padding: '14px',
                    borderRadius: '8px',
                    background: 'rgba(244, 63, 94, 0.05)',
                    border: '1px solid rgba(244, 63, 94, 0.2)'
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontWeight: 600,
                      marginBottom: '6px',
                      color: 'var(--accent-rose)'
                    }}
                  >
                    <AlertTriangle size={18} />
                    <span>Inaccessible Locations During Scan</span>
                  </div>
                  <ul style={{ paddingLeft: '20px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    {report.inaccessibleLocations.map((loc, i) => (
                      <li key={i}>{loc}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div
                style={{
                  padding: '14px',
                  borderRadius: '8px',
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid var(--border-color)',
                  fontSize: '0.8rem',
                  color: 'var(--text-muted)'
                }}
              >
                <div style={{ fontWeight: 600, marginBottom: '6px', color: 'var(--text-secondary)' }}>
                  Important Operating System Limitations
                </div>
                <p>
                  This report reflects physical filesystem entries discovered within the selected scan scope.
                  Some application state may exist inside embedded databases (e.g. SQLite, Registry, Cloud storage,
                  or Windows Services) that are not exposed as discrete files.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
