import React from 'react'
import { Folder, FolderOpen, ExternalLink, HardDrive } from 'lucide-react'
import { FolderStats } from '../../../shared/types'

interface FolderPickerProps {
  stats: FolderStats | null
  loading: boolean
  onSelectFolder: () => void
  onOpenExplorer: () => void
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}

export const FolderPicker: React.FC<FolderPickerProps> = ({
  stats,
  loading,
  onSelectFolder,
  onOpenExplorer
}) => {
  return (
    <div className="glass-card">
      <div className="card-header">
        <div className="card-title">
          <Folder size={18} color="var(--accent-cyan)" />
          <span>Active Target Directory</span>
        </div>
        <button
          className="btn btn-primary btn-sm"
          onClick={onSelectFolder}
          disabled={loading}
        >
          <FolderOpen size={14} />
          <span>{stats ? 'Change Folder' : 'Select Folder'}</span>
        </button>
      </div>

      {stats ? (
        <div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'rgba(0, 0, 0, 0.3)',
              padding: '10px 14px',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
              marginBottom: '14px'
            }}
          >
            <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginRight: '10px' }}>
              <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{stats.name}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                {stats.path}
              </div>
            </div>
            <button
              className="btn btn-secondary btn-sm"
              onClick={onOpenExplorer}
              title="Reveal in Native OS Explorer"
            >
              <ExternalLink size={14} />
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
            <div style={{ background: 'var(--bg-secondary)', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>FILES</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--accent-cyan)' }}>
                {stats.totalFiles.toLocaleString()}
              </div>
            </div>
            <div style={{ background: 'var(--bg-secondary)', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>SUBFOLDERS</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--accent-purple)' }}>
                {stats.totalDirs.toLocaleString()}
              </div>
            </div>
            <div style={{ background: 'var(--bg-secondary)', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>TOTAL SIZE</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--accent-emerald)' }}>
                {formatBytes(stats.totalSizeBytes)}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div
          style={{
            textAlign: 'center',
            padding: '24px 16px',
            border: '2px dashed var(--border-color)',
            borderRadius: '8px'
          }}
        >
          <HardDrive size={32} color="var(--text-muted)" style={{ margin: '0 auto 8px' }} />
          <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
            No directory selected yet.
          </p>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            Select a target folder to run scripts and inspect contents.
          </p>
        </div>
      )}
    </div>
  )
}
