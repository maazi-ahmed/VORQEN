import React, { useRef, useEffect } from 'react'
import { Terminal, Trash2, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import { ScriptExitPayload, ScriptLogPayload } from '../../../shared/types'

interface ConsoleOutputProps {
  logs: ScriptLogPayload[]
  isRunning: boolean
  lastExit: ScriptExitPayload | null
  onClearLogs: () => void
}

export const ConsoleOutput: React.FC<ConsoleOutputProps> = ({
  logs,
  isRunning,
  lastExit,
  onClearLogs
}) => {
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [logs])

  return (
    <div className="console-container">
      <div className="console-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Terminal size={16} color="var(--accent-cyan)" />
          <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>Terminal Output</span>

          {isRunning && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                fontSize: '0.72rem',
                color: 'var(--accent-cyan)',
                background: 'rgba(0, 210, 255, 0.1)',
                padding: '2px 8px',
                borderRadius: '4px'
              }}
            >
              <Loader2 size={12} className="spin" style={{ animation: 'spin 1s linear infinite' }} />
              Running...
            </span>
          )}

          {!isRunning && lastExit && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                fontSize: '0.72rem',
                color: lastExit.success ? 'var(--accent-emerald)' : 'var(--accent-rose)',
                background: lastExit.success ? 'rgba(16, 185, 129, 0.1)' : 'rgba(244, 63, 94, 0.1)',
                padding: '2px 8px',
                borderRadius: '4px'
              }}
            >
              {lastExit.success ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
              Exit code: {lastExit.exitCode ?? 0} ({lastExit.durationMs}ms)
            </span>
          )}
        </div>

        <button
          className="btn btn-secondary btn-sm"
          onClick={onClearLogs}
          disabled={logs.length === 0}
          title="Clear Terminal Output"
        >
          <Trash2 size={13} />
          <span>Clear</span>
        </button>
      </div>

      <div className="console-logs" ref={scrollRef}>
        {logs.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '40px 0' }}>
            No script output yet. Run a script above to view live terminal logs.
          </div>
        ) : (
          logs.map((log, index) => {
            const time = new Date(log.timestamp).toLocaleTimeString()
            const typeClass =
              log.type === 'stderr'
                ? 'log-stderr'
                : log.type === 'system'
                ? 'log-system'
                : 'log-stdout'

            return (
              <div key={index} className={`log-entry ${typeClass}`}>
                <span className="log-time">[{time}]</span>
                <span>{log.message}</span>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
