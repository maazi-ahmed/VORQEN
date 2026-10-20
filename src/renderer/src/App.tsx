import React, { useState, useEffect, useCallback } from 'react'
import { FolderPicker } from './components/FolderPicker'
import { FolderItemsView } from './components/FolderItemsView'
import { ScriptCatalog } from './components/ScriptCatalog'
import { ConsoleOutput } from './components/ConsoleOutput'
import { SystemScannerView } from './components/SystemScannerView'
import { AIAnalysisView } from './components/AIAnalysisView'
import { FolderStats, ScriptExitPayload, ScriptLogPayload, ScriptRunRequest } from '../../shared/types'
import { FolderGit2, Cpu, FolderKanban, ShieldCheck, Brain } from 'lucide-react'

export const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<'workspace' | 'scanner' | 'ai'>('scanner')
  const [activeFolder, setActiveFolder] = useState<string | null>(null)
  const [folderStats, setFolderStats] = useState<FolderStats | null>(null)
  const [loadingFolder, setLoadingFolder] = useState<boolean>(false)



  const [isRunning, setIsRunning] = useState<boolean>(false)
  const [activeRunId, setActiveRunId] = useState<string | null>(null)
  const [logs, setLogs] = useState<ScriptLogPayload[]>([])
  const [lastExit, setLastExit] = useState<ScriptExitPayload | null>(null)

  const loadFolderStats = useCallback(async (path: string) => {
    try {
      setLoadingFolder(true)
      const stats = await window.api.getFolderStats(path)
      setFolderStats(stats)
    } catch (err) {
      console.error('Failed to inspect directory:', err)
    } finally {
      setLoadingFolder(false)
    }
  }, [])

  const handleSelectFolder = async () => {
    try {
      const selected = await window.api.selectFolder()
      if (selected) {
        setActiveFolder(selected)
        await loadFolderStats(selected)
      }
    } catch (err) {
      console.error('Folder selection failed:', err)
    }
  }

  const handleOpenExplorer = async () => {
    if (activeFolder) {
      await window.api.openFolderInExplorer(activeFolder)
    }
  }

  const handleRunScript = async (req: ScriptRunRequest) => {
    if (!activeFolder) return
    setIsRunning(true)
    setActiveRunId(req.id)
    setLastExit(null)

    try {
      const result = await window.api.runScript(req)
      if (!result.started && result.error) {
        setIsRunning(false)
        setActiveRunId(null)
        setLogs((prev) => [
          ...prev,
          {
            runId: req.id,
            type: 'stderr',
            message: `Launch error: ${result.error}`,
            timestamp: Date.now()
          }
        ])
      }
    } catch (err) {
      setIsRunning(false)
      setActiveRunId(null)
      console.error('Failed to run script:', err)
    }
  }

  const handleStopScript = async () => {
    if (activeRunId) {
      await window.api.stopScript(activeRunId)
    }
  }

  // Subscribe to IPC streaming logs & exit notifications
  useEffect(() => {
    if (!window.api) return

    const unsubLog = window.api.onScriptLog((payload) => {
      setLogs((prev) => [...prev, payload])
    })

    const unsubExit = window.api.onScriptExit((payload) => {
      setIsRunning(false)
      setActiveRunId(null)
      setLastExit(payload)

      // Refresh folder contents in case script added, changed or removed files
      if (activeFolder) {
        loadFolderStats(activeFolder)
      }
    })

    return () => {
      unsubLog()
      unsubExit()
    }
  }, [activeFolder, loadFolderStats])

  return (
    <div className="app-container">
      {/* Top Navbar */}
      <header className="top-nav">
        <div className="brand-section">
          <div className="brand-logo">
            <Cpu size={20} />
          </div>
          <div>
            <div className="brand-title">VORQEN</div>
            <div className="brand-subtitle">Smart Folder & Script Execution Workspace</div>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            className={`btn btn-sm ${currentView === 'scanner' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setCurrentView('scanner')}
          >
            <ShieldCheck size={14} />
            <span>System Discovery & Intelligence</span>
          </button>
          <button
            className={`btn btn-sm ${currentView === 'ai' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setCurrentView('ai')}
          >
            <Brain size={14} />
            <span>AI Understanding & Classification</span>
          </button>
          <button
            className={`btn btn-sm ${currentView === 'workspace' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setCurrentView('workspace')}
          >
            <FolderKanban size={14} />
            <span>Folder Workspace</span>
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.75rem',
              color: 'var(--text-muted)',
              background: 'rgba(255, 255, 255, 0.04)',
              padding: '4px 10px',
              borderRadius: '6px',
              border: '1px solid var(--border-color)'
            }}
          >
            Electron 33 + React 18 + TS
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      {currentView === 'scanner' ? (
        <main style={{ padding: '18px 24px', overflowY: 'auto', height: 'calc(100vh - 61px)' }}>
          <SystemScannerView />
        </main>
      ) : currentView === 'ai' ? (
        <main style={{ padding: '18px 24px', overflowY: 'auto', height: 'calc(100vh - 61px)' }}>
          <AIAnalysisView />
        </main>
      ) : (

        /* Original Workspace: Sidebar + Script Catalog + Console */
        <main className="main-grid">
          {/* Left Sidebar */}
          <aside className="sidebar-panel">
            <FolderPicker
              stats={folderStats}
              loading={loadingFolder}
              onSelectFolder={handleSelectFolder}
              onOpenExplorer={handleOpenExplorer}
            />

            {folderStats && (
              <div className="glass-card" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <div className="card-header">
                  <div className="card-title">
                    <FolderGit2 size={16} color="var(--accent-blue)" />
                    <span>Files in Directory</span>
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {folderStats.items.length} items
                  </span>
                </div>
                <FolderItemsView items={folderStats.items} />
              </div>
            )}
          </aside>

          {/* Workspace Content */}
          <section className="workspace-content">
            <ScriptCatalog
              activeFolder={activeFolder}
              isRunning={isRunning}
              onRunScript={handleRunScript}
              onStopScript={handleStopScript}
            />

            <ConsoleOutput
              logs={logs}
              isRunning={isRunning}
              lastExit={lastExit}
              onClearLogs={() => setLogs([])}
            />
          </section>
        </main>
      )}
    </div>

  )
}
export default App
