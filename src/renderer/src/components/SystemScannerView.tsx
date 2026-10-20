import React, { useState, useEffect, useCallback } from 'react'
import {
  ApplicationInspectionReport,
  DiscoveredRoot,
  DiscoveredVolume,
  FileInventoryRecord,
  InstalledApplication,
  ScanOptions,
  ScanProgressEvent,
  ScanScopePreset,
  ScanSummary
} from '../../../shared/types'
import { ApplicationReportModal } from './ApplicationReportModal'
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Database,
  Eye,
  FileSearch,
  HardDrive,
  Layers,
  Pause,
  Play,
  RefreshCw,
  Search
} from 'lucide-react'


function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}

export const SystemScannerView: React.FC = () => {
  // Scan Configuration State
  const [scopePreset, setScopePreset] = useState<ScanScopePreset>('user_profile')
  const [roots, setRoots] = useState<DiscoveredRoot[]>([])
  const [selectedRootPaths, setSelectedRootPaths] = useState<Set<string>>(new Set())
  const [volumes, setVolumes] = useState<DiscoveredVolume[]>([])
  const [includeHidden, setIncludeHidden] = useState<boolean>(true)
  const [loadingRoots, setLoadingRoots] = useState<boolean>(false)

  // Scan Runtime State
  const [isScanning, setIsScanning] = useState<boolean>(false)
  const [currentScanId, setCurrentScanId] = useState<string | null>(null)
  const [progress, setProgress] = useState<ScanProgressEvent | null>(null)
  const [lastSummary, setLastSummary] = useState<ScanSummary | null>(null)

  // Data Results State
  const [activeTab, setActiveTab] = useState<'apps' | 'files' | 'diagnostics'>('apps')
  const [applications, setApplications] = useState<InstalledApplication[]>([])
  const [appSearch, setAppSearch] = useState<string>('')
  const [appFilterType, setAppFilterType] = useState<'all' | 'third_party' | 'portable' | 'system'>('all')

  // File Inventory State
  const [files, setFiles] = useState<FileInventoryRecord[]>([])
  const [totalFilesCount, setTotalFilesCount] = useState<number>(0)
  const [fileSearch, setFileSearch] = useState<string>('')
  const [fileClassification, setFileClassification] = useState<string>('all')
  const [filePage, setFilePage] = useState<number>(0)

  // Inspection Report Modal
  const [selectedReport, setSelectedReport] = useState<ApplicationInspectionReport | null>(null)
  const [loadingReport, setLoadingReport] = useState<boolean>(false)

  // Load roots and volumes from Main process
  const loadRootsAndVolumes = useCallback(async (preset: ScanScopePreset) => {
    try {
      setLoadingRoots(true)
      const [fetchedRoots, fetchedVolumes] = await Promise.all([
        window.api.scanGetRoots(preset),
        window.api.scanGetVolumes()
      ])
      setRoots(fetchedRoots)
      setVolumes(fetchedVolumes)

      // Initialize selected roots based on defaults
      const defaults = new Set<string>()
      for (const r of fetchedRoots) {
        if (r.isDefaultSelected && r.isAccessible) {
          defaults.add(r.path)
        }
      }
      setSelectedRootPaths(defaults)
    } catch (err) {
      console.error('Failed to load scan roots:', err)
    } finally {
      setLoadingRoots(false)
    }
  }, [])

  useEffect(() => {
    loadRootsAndVolumes(scopePreset)
  }, [scopePreset, loadRootsAndVolumes])

  // Load applications and files when scan finishes or on mount
  const refreshScanResults = useCallback(async (scanId?: string) => {
    try {
      const [apps, fileData, summary] = await Promise.all([
        window.api.scanGetApplications(scanId),
        window.api.scanGetFiles(scanId, 0, 150),
        window.api.scanGetStatus(scanId)
      ])
      setApplications(apps)
      setFiles(fileData.items)
      setTotalFilesCount(fileData.total)
      if (summary) {
        setLastSummary(summary)
      }
    } catch (err) {
      console.error('Failed to refresh scan results:', err)
    }
  }, [])

  // Listen to live scan progress and completion events
  useEffect(() => {
    if (!window.api) return

    const unsubProgress = window.api.onScanProgress((payload) => {
      setProgress(payload)
      setIsScanning(!['completed', 'cancelled', 'failed'].includes(payload.state))
    })

    const unsubCompleted = window.api.onScanCompleted((summary) => {
      setIsScanning(false)
      setLastSummary(summary)
      refreshScanResults(summary.scanId)
    })

    return () => {
      unsubProgress()
      unsubCompleted()
    }
  }, [refreshScanResults])

  // Action: Start Scan
  const handleStartScan = async () => {
    const selectedPaths = Array.from(selectedRootPaths)
    if (selectedPaths.length === 0) {
      alert('Please select at least one accessible filesystem root to scan.')
      return
    }

    const options: ScanOptions = {
      scopePreset,
      rootPaths: selectedPaths,
      includeHidden,
      maxConcurrency: 12
    }

    try {
      setIsScanning(true)
      setProgress(null)
      const res = await window.api.scanStart(options)
      if (res.started) {
        setCurrentScanId(res.scanId)
      } else {
        setIsScanning(false)
        alert(res.error || 'Failed to start scan')
      }
    } catch (err) {
      setIsScanning(false)
      console.error('Scan start error:', err)
    }
  }

  // Action: Cancel Scan
  const handleCancelScan = async () => {
    if (currentScanId) {
      await window.api.scanCancel(currentScanId)
    }
  }

  // Action: Toggle root selection
  const handleToggleRoot = (rootPath: string) => {
    setSelectedRootPaths((prev) => {
      const next = new Set(prev)
      if (next.has(rootPath)) {
        next.delete(rootPath)
      } else {
        next.add(rootPath)
      }
      return next
    })
  }

  // Action: Open Application Inspection Report
  const handleInspectApp = async (appId: string) => {
    try {
      setLoadingReport(true)
      const report = await window.api.scanGetAppReport(appId, currentScanId || undefined)
      if (report) {
        setSelectedReport(report)
      }
    } catch (err) {
      console.error('Failed to inspect application:', err)
    } finally {
      setLoadingReport(false)
    }
  }

  // Action: Search file inventory with debounce or query update
  const handleSearchFiles = async (query: string, classification: string, page = 0) => {
    try {
      const data = await window.api.scanGetFiles(
        currentScanId || undefined,
        page * 100,
        100,
        query
      )
      let filtered = data.items
      if (classification !== 'all') {
        filtered = filtered.filter((f) => f.classification === classification)
      }
      setFiles(filtered)
      setTotalFilesCount(data.total)
      setFilePage(page)
    } catch (err) {
      console.error('File search error:', err)
    }
  }

  // Filtered applications view
  const filteredApps = applications.filter((app) => {
    const matchesSearch =
      !appSearch ||
      app.displayName.toLowerCase().includes(appSearch.toLowerCase()) ||
      app.publisher.toLowerCase().includes(appSearch.toLowerCase()) ||
      app.installLocation.toLowerCase().includes(appSearch.toLowerCase())

    if (!matchesSearch) return false

    if (appFilterType === 'third_party') return !app.isSystemComponent && !app.isPortable
    if (appFilterType === 'portable') return app.isPortable
    if (appFilterType === 'system') return app.isSystemComponent

    return true
  })

  return (
    <div className="scanner-container">
      {/* Top Scope & Controls Bar */}
      <div className="glass-card" style={{ padding: '16px 20px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, var(--accent-cyan), var(--accent-blue))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff'
              }}
            >
              <FileSearch size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff' }}>
                Full System Discovery & Application Intelligence Engine
              </h2>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Inspect filesystem roots, discover installed software, and evaluate evidence-based associations
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => loadRootsAndVolumes(scopePreset)}
              disabled={isScanning || loadingRoots}
              title="Refresh available drive letters and roots"
            >
              <RefreshCw size={14} className={loadingRoots ? 'spin' : ''} />
              <span>Refresh Roots</span>
            </button>

            {isScanning ? (
              <button className="btn btn-danger btn-sm" onClick={handleCancelScan}>
                <Pause size={14} />
                <span>Cancel Scan</span>
              </button>
            ) : (
              <button
                className="btn btn-primary btn-sm"
                onClick={handleStartScan}
                disabled={selectedRootPaths.size === 0}
              >
                <Play size={14} />
                <span>Start Discovery Scan</span>
              </button>
            )}
          </div>
        </div>

        {/* Scope Selector Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '14px' }}>
          {(
            [
              { id: 'user_profile', title: 'User Profile & Docs', desc: 'Desktop, Documents, Downloads, AppData' },
              { id: 'applications', title: 'App Installation Roots', desc: 'Program Files, ProgramData, AppData' },
              { id: 'system_drives', title: 'System Volumes', desc: 'Mounted Local Fixed Disks (C:\\)' },
              { id: 'custom', title: 'Custom Selection', desc: 'Select individual filesystem roots below' }
            ] as const
          ).map((preset) => (
            <div
              key={preset.id}
              onClick={() => !isScanning && setScopePreset(preset.id)}
              className={`preset-card ${scopePreset === preset.id ? 'active' : ''}`}
            >
              <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                {preset.title}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                {preset.desc}
              </div>
            </div>
          ))}
        </div>

        {/* Available Volumes Row */}

        {volumes.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Detected Volumes:
            </span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {volumes.map((vol) => (
                <div
                  key={vol.driveLetter}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '4px 10px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid var(--border-color)',
                    fontSize: '0.75rem'
                  }}
                >
                  <HardDrive size={13} color="var(--accent-cyan)" />
                  <span style={{ fontWeight: 600, color: '#fff' }}>{vol.driveLetter}</span>
                  <span style={{ color: 'var(--text-muted)' }}>
                    ({formatBytes(vol.freeSizeBytes)} free of {formatBytes(vol.totalSizeBytes)})
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Root Checkboxes & Hidden Toggle */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',

            background: 'rgba(0,0,0,0.2)',
            padding: '10px 14px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-color)',
            fontSize: '0.8rem'
          }}
        >
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
            <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Selected Roots:</span>
            {roots.map((root) => (
              <label
                key={root.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: root.isAccessible && !isScanning ? 'pointer' : 'not-allowed',
                  opacity: root.isAccessible ? 1 : 0.4
                }}
              >
                <input
                  type="checkbox"
                  checked={selectedRootPaths.has(root.path)}
                  disabled={!root.isAccessible || isScanning}
                  onChange={() => handleToggleRoot(root.path)}
                />
                <span style={{ color: root.isAccessible ? 'var(--text-primary)' : 'var(--accent-rose)' }}>
                  {root.name}
                </span>
              </label>
            ))}
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={includeHidden}
              disabled={isScanning}
              onChange={(e) => setIncludeHidden(e.target.checked)}
            />
            <span style={{ color: 'var(--text-secondary)' }}>Include Hidden Files</span>
          </label>
        </div>
      </div>

      {/* Live Scan Progress Card */}
      {(isScanning || progress || lastSummary) && (
        <div className="glass-card" style={{ padding: '16px 20px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Activity
                size={16}
                color={isScanning ? 'var(--accent-cyan)' : 'var(--accent-emerald)'}
                className={isScanning ? 'pulse' : ''}
              />
              <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                Status:{' '}
                <span
                  style={{
                    color: isScanning
                      ? 'var(--accent-cyan)'
                      : lastSummary?.state === 'cancelled'
                        ? 'var(--accent-amber)'
                        : 'var(--accent-emerald)',
                    textTransform: 'uppercase',
                    fontSize: '0.8rem',
                    fontFamily: 'var(--font-mono)'
                  }}
                >
                  {isScanning
                    ? progress?.state.replace(/_/g, ' ') || 'Running'
                    : lastSummary?.state.replace(/_/g, ' ') || 'Idle'}
                </span>
              </span>
              {lastSummary && (
                <span
                  className="badge"
                  style={{
                    fontSize: '0.68rem',
                    background:
                      lastSummary.coverageStatus === 'complete'
                        ? 'rgba(16, 185, 129, 0.15)'
                        : 'rgba(245, 158, 11, 0.15)',
                    color:
                      lastSummary.coverageStatus === 'complete'
                        ? 'var(--accent-emerald)'
                        : 'var(--accent-amber)'
                  }}
                >
                  {lastSummary.coverageStatus === 'complete' ? 'Complete Scope' : 'Partial Coverage'}
                </span>
              )}
            </div>

            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              {isScanning
                ? `Elapsed: ${((progress?.elapsedTimeMs || 0) / 1000).toFixed(1)}s`
                : `Duration: ${((lastSummary?.durationMs || 0) / 1000).toFixed(1)}s`}
            </div>
          </div>

          {/* Real-time Counters Row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px', marginBottom: '10px' }}>
            <div className="stat-card">
              <span className="stat-label">Files Traversed</span>
              <span className="stat-value" style={{ color: 'var(--accent-cyan)' }}>
                {isScanning ? progress?.scannedFilesCount || 0 : lastSummary?.totalFiles || totalFilesCount}
              </span>
            </div>
            <div className="stat-card">
              <span className="stat-label">Directories Visited</span>
              <span className="stat-value" style={{ color: 'var(--accent-blue)' }}>
                {isScanning ? progress?.scannedDirsCount || 0 : lastSummary?.totalDirs || 0}
              </span>
            </div>
            <div className="stat-card">
              <span className="stat-label">Total Volume</span>
              <span className="stat-value" style={{ color: 'var(--accent-emerald)' }}>
                {formatBytes(
                  isScanning
                    ? progress?.totalDiscoveredSizeBytes || 0
                    : lastSummary?.totalSizeBytes || 0
                )}
              </span>
            </div>
            <div className="stat-card">
              <span className="stat-label">Apps Discovered</span>
              <span className="stat-value" style={{ color: 'var(--accent-purple)' }}>
                {isScanning ? progress?.discoveredAppsCount || 0 : applications.length}
              </span>
            </div>
            <div className="stat-card">
              <span className="stat-label">Inaccessible Paths</span>
              <span
                className="stat-value"
                style={{
                  color:
                    (lastSummary?.diagnostics.inaccessiblePaths.length || 0) > 0
                      ? 'var(--accent-rose)'
                      : 'var(--text-muted)'
                }}
              >
                {lastSummary?.diagnostics.inaccessiblePaths.length || 0}
              </span>
            </div>
          </div>

          {/* Current Path Message */}
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
            {isScanning
              ? progress?.statusMessage || 'Initializing scan pipeline...'
              : lastSummary
                ? `Finished. Processed ${lastSummary.totalFiles} files across ${lastSummary.rootsSummary.scanned.length} scanned root locations.`
                : ''}
          </div>
        </div>
      )}

      {/* Main Tab Navigation */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
        <button
          className={`tab-btn ${activeTab === 'apps' ? 'active' : ''}`}
          onClick={() => setActiveTab('apps')}
        >
          <Database size={15} />
          <span>Installed Applications ({applications.length})</span>
        </button>
        <button
          className={`tab-btn ${activeTab === 'files' ? 'active' : ''}`}
          onClick={() => setActiveTab('files')}
        >
          <Layers size={15} />
          <span>File Inventory ({totalFilesCount})</span>
        </button>
        <button
          className={`tab-btn ${activeTab === 'diagnostics' ? 'active' : ''}`}
          onClick={() => setActiveTab('diagnostics')}
        >
          <AlertCircle size={15} />
          <span>
            Diagnostics & Coverage (
            {(lastSummary?.diagnostics.inaccessiblePaths.length || 0) +
              (lastSummary?.diagnostics.warnings.length || 0)}
            )
          </span>
        </button>
      </div>

      {/* Tab 1: Installed Applications */}
      {activeTab === 'apps' && (
        <div className="glass-card" style={{ padding: '16px' }}>
          {/* Filter Bar */}
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '14px' }}>
            <div style={{ flex: 1, position: 'relative' }}>
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
                placeholder="Search installed applications by name, publisher, or directory..."
                value={appSearch}
                onChange={(e) => setAppSearch(e.target.value)}
                className="search-input"
                style={{ paddingLeft: '36px' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '6px' }}>
              {(
                [
                  { id: 'all', label: 'All' },
                  { id: 'third_party', label: 'Third-Party' },
                  { id: 'portable', label: 'Portable' },
                  { id: 'system', label: 'System' }
                ] as const
              ).map((f) => (
                <button
                  key={f.id}
                  className={`btn btn-secondary btn-sm ${appFilterType === f.id ? 'active-filter' : ''}`}
                  onClick={() => setAppFilterType(f.id)}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {filteredApps.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
              {applications.length === 0
                ? 'No applications discovered yet. Run a Discovery Scan to inspect system registry and programs.'
                : 'No applications match your search query.'}
            </div>
          ) : (
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Application</th>
                    <th>Publisher & Version</th>
                    <th>Installation Location</th>
                    <th>Associated Files</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredApps.map((app) => (
                    <tr key={app.id}>
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                          {app.displayName}
                        </div>
                        <div style={{ display: 'flex', gap: '6px', marginTop: '2px' }}>
                          <span className="badge" style={{ fontSize: '0.65rem' }}>
                            {app.discoverySource}
                          </span>
                          {app.isPortable && (
                            <span
                              className="badge"
                              style={{
                                fontSize: '0.65rem',
                                color: 'var(--accent-amber)',
                                background: 'rgba(245, 158, 11, 0.1)'
                              }}
                            >
                              Portable
                            </span>
                          )}
                          {app.isSystemComponent && (
                            <span
                              className="badge"
                              style={{
                                fontSize: '0.65rem',
                                color: 'var(--text-muted)'
                              }}
                            >
                              OS Component
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          {app.publisher}
                        </div>
                        <div
                          style={{
                            fontSize: '0.74rem',
                            color: 'var(--text-muted)',
                            fontFamily: 'var(--font-mono)'
                          }}
                        >
                          v{app.displayVersion}
                        </div>
                      </td>
                      <td
                        style={{
                          fontSize: '0.78rem',
                          fontFamily: 'var(--font-mono)',
                          color: app.installLocation ? 'var(--text-secondary)' : 'var(--text-muted)'
                        }}
                      >
                        {app.installLocation || 'Not specified in registry'}
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--accent-cyan)' }}>
                          {app.associatedFileCount || 0} files
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          {formatBytes(app.totalSizeBytes || 0)}
                        </div>
                      </td>
                      <td>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleInspectApp(app.id)}
                          disabled={loadingReport}
                        >
                          <Eye size={13} />
                          <span>Inspect Report</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: File Inventory */}
      {activeTab === 'files' && (
        <div className="glass-card" style={{ padding: '16px' }}>
          {/* Search & Classification Filter */}
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '14px' }}>
            <div style={{ flex: 1, position: 'relative' }}>
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
                placeholder="Search discovered files by filename or path..."
                value={fileSearch}
                onChange={(e) => {
                  setFileSearch(e.target.value)
                  handleSearchFiles(e.target.value, fileClassification, 0)
                }}
                className="search-input"
                style={{ paddingLeft: '36px' }}
              />
            </div>

            <select
              className="select-dropdown"
              value={fileClassification}
              onChange={(e) => {
                setFileClassification(e.target.value)
                handleSearchFiles(fileSearch, e.target.value, 0)
              }}
            >
              <option value="all">All Classifications</option>
              <option value="executable">Executable (.exe, .cmd)</option>
              <option value="library">Library (.dll, .so)</option>
              <option value="configuration">Configuration (.json, .ini)</option>
              <option value="document">Document (.pdf, .docx)</option>
              <option value="data">Data (.db, .dat)</option>
              <option value="archive">Archive (.zip, .7z)</option>
              <option value="media">Media (.png, .mp4)</option>
              <option value="code">Source Code (.ts, .py)</option>
              <option value="log">Log (.log, .trace)</option>
            </select>
          </div>

          {files.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
              No files discovered. Start a scan to index the target filesystem roots.
            </div>
          ) : (
            <div>
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>File Name & Path</th>
                      <th>Classification</th>
                      <th>Size</th>
                      <th>Modified Date</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {files.map((file) => (
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
                          <span className="badge">{file.classification}</span>
                        </td>
                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
                          {formatBytes(file.sizeBytes)}
                        </td>
                        <td
                          style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: '0.75rem',
                            color: 'var(--text-muted)'
                          }}
                        >
                          {file.modifiedAt ? new Date(file.modifiedAt).toLocaleString() : 'N/A'}
                        </td>
                        <td>
                          {file.status === 'ok' ? (
                            <span
                              style={{
                                color: 'var(--accent-emerald)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontSize: '0.75rem'
                              }}
                            >
                              <CheckCircle2 size={13} />
                              <span>OK</span>
                            </span>
                          ) : (
                            <span
                              style={{
                                color: 'var(--accent-rose)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontSize: '0.75rem'
                              }}
                            >
                              <AlertTriangle size={13} />
                              <span>Failed</span>
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination controls */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginTop: '12px',
                  fontSize: '0.78rem',
                  color: 'var(--text-muted)'
                }}
              >
                <span>
                  Showing {files.length} records (Total: {totalFilesCount})
                </span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    className="btn btn-secondary btn-sm"
                    disabled={filePage === 0}
                    onClick={() => handleSearchFiles(fileSearch, fileClassification, filePage - 1)}
                  >
                    Previous
                  </button>
                  <button
                    className="btn btn-secondary btn-sm"
                    disabled={(filePage + 1) * 100 >= totalFilesCount}
                    onClick={() => handleSearchFiles(fileSearch, fileClassification, filePage + 1)}
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Diagnostics & Coverage */}
      {activeTab === 'diagnostics' && (
        <div className="glass-card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {/* Roots Scanned Summary */}
            <div>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '8px', color: '#fff' }}>
                Filesystem Roots Inspected
              </h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {(lastSummary?.rootsSummary.scanned || Array.from(selectedRootPaths)).map((p, i) => (
                  <span
                    key={i}
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.75rem',
                      padding: '4px 10px',
                      borderRadius: '4px',
                      background: 'rgba(0, 210, 255, 0.08)',
                      border: '1px solid rgba(0, 210, 255, 0.2)',
                      color: 'var(--accent-cyan)'
                    }}
                  >
                    {p}
                  </span>
                ))}
              </div>
            </div>

            {/* Inaccessible Paths Alert */}
            {(lastSummary?.diagnostics.inaccessiblePaths.length || 0) > 0 ? (
              <div>
                <h3
                  style={{
                    fontSize: '0.95rem',
                    fontWeight: 600,
                    marginBottom: '8px',
                    color: 'var(--accent-rose)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <AlertTriangle size={16} />
                  <span>
                    Inaccessible Directories Encountered ({lastSummary?.diagnostics.inaccessiblePaths.length})
                  </span>
                </h3>
                <div
                  style={{
                    maxHeight: '260px',
                    overflowY: 'auto',
                    border: '1px solid rgba(244, 63, 94, 0.2)',
                    borderRadius: 'var(--radius-md)',
                    background: 'rgba(244, 63, 94, 0.03)',
                    padding: '8px'
                  }}
                >
                  {lastSummary?.diagnostics.inaccessiblePaths.map((item, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '6px 10px',
                        fontSize: '0.76rem',
                        borderBottom: '1px solid rgba(255,255,255,0.04)'
                      }}
                    >
                      <div style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                        {item.path}
                      </div>
                      <div style={{ color: 'var(--accent-rose)' }}>{item.reason}</div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div
                style={{
                  padding: '12px',
                  borderRadius: '6px',
                  background: 'rgba(16, 185, 129, 0.08)',
                  border: '1px solid rgba(16, 185, 129, 0.2)',
                  color: 'var(--accent-emerald)',
                  fontSize: '0.8rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <CheckCircle2 size={16} />
                <span>Zero filesystem access errors encountered across selected roots.</span>
              </div>
            )}

            {/* Diagnostic Warnings */}
            {(lastSummary?.diagnostics.warnings.length || 0) > 0 && (
              <div>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '8px', color: 'var(--accent-amber)' }}>
                  Diagnostics Warnings
                </h3>
                <ul style={{ paddingLeft: '20px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  {lastSummary?.diagnostics.warnings.map((w, idx) => (
                    <li key={idx}>{w}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Application Inspection Report Modal */}
      {selectedReport && (
        <ApplicationReportModal
          report={selectedReport}
          onClose={() => setSelectedReport(null)}
        />
      )}
    </div>
  )
}
