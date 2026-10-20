import React from 'react'
import { Folder, FileText, FileCode, Archive, Image, File } from 'lucide-react'
import { FolderItem } from '../../../shared/types'

interface FolderItemsViewProps {
  items: FolderItem[]
}

function getFileIcon(item: FolderItem) {
  if (item.isDir) {
    return <Folder size={15} color="var(--accent-cyan)" />
  }

  const ext = item.extension.toLowerCase()
  if (['.js', '.ts', '.tsx', '.jsx', '.py', '.json', '.html', '.css', '.sh', '.ps1'].includes(ext)) {
    return <FileCode size={15} color="var(--accent-purple)" />
  }
  if (['.zip', '.tar', '.gz', '.7z', '.rar'].includes(ext)) {
    return <Archive size={15} color="var(--accent-amber)" />
  }
  if (['.png', '.jpg', '.jpeg', '.svg', '.webp', '.gif'].includes(ext)) {
    return <Image size={15} color="var(--accent-emerald)" />
  }
  if (['.md', '.txt', '.doc', '.pdf'].includes(ext)) {
    return <FileText size={15} color="var(--accent-blue)" />
  }

  return <File size={15} color="var(--text-muted)" />
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '-'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

export const FolderItemsView: React.FC<FolderItemsViewProps> = ({ items }) => {
  if (items.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
        Directory is empty.
      </div>
    )
  }

  return (
    <div style={{ maxHeight: '280px', overflowY: 'auto' }}>
      {items.map((item) => (
        <div key={item.path} className="file-list-item">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
            {getFileIcon(item)}
            <span
              style={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                color: item.isDir ? 'var(--text-primary)' : 'var(--text-secondary)'
              }}
            >
              {item.name}
            </span>
          </div>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            {item.isDir ? 'folder' : formatBytes(item.sizeBytes)}
          </span>
        </div>
      ))}
    </div>
  )
}
