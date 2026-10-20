import React, { useState } from 'react'
import { Play, Square, Terminal, Code2, Sparkles } from 'lucide-react'
import { ScriptDefinition, ScriptRunRequest, ScriptType } from '../../../shared/types'

interface ScriptCatalogProps {
  activeFolder: string | null
  isRunning: boolean
  onRunScript: (req: ScriptRunRequest) => void
  onStopScript: () => void
}

const PRESET_SCRIPTS: ScriptDefinition[] = [
  {
    id: 'top-files',
    name: 'Find 10 Largest Files',
    description: 'Scans directory and prints the top 10 largest files with size',
    category: 'analysis',
    scriptType: 'powershell',
    commandTemplate: `Get-ChildItem -File -Recurse -ErrorAction SilentlyContinue | Sort-Object Length -Descending | Select-Object -First 10 -Property @{Name="Size (MB)";Expression={[math]::round($_.Length / 1MB, 2)}}, FullName | Format-Table -AutoSize`
  },
  {
    id: 'extension-stats',
    name: 'File Type Breakdown',
    description: 'Groups all files in folder by extension and counts occurrences',
    category: 'analysis',
    scriptType: 'powershell',
    commandTemplate: `Get-ChildItem -File -Recurse -ErrorAction SilentlyContinue | Group-Object Extension | Sort-Object Count -Descending | Select-Object Count, Name | Format-Table -AutoSize`
  },
  {
    id: 'empty-dirs',
    name: 'Find Empty Subfolders',
    description: 'Detects any empty subdirectories inside this folder',
    category: 'cleanup',
    scriptType: 'powershell',
    commandTemplate: `Get-ChildItem -Directory -Recurse | Where-Object { (Get-ChildItem $_.FullName -Force).Count -eq 0 } | Select-Object FullName`
  },
  {
    id: 'dir-tree',
    name: 'Directory Tree Map',
    description: 'Generates a clean visual tree view of subfolders',
    category: 'organization',
    scriptType: 'cmd',
    commandTemplate: `tree /a /f`
  },
  {
    id: 'node-inspect',
    name: 'Node.js Package Audit',
    description: 'Runs Node script to check if package.json or node_modules exist and prints version metadata',
    category: 'analysis',
    scriptType: 'node',
    commandTemplate: `const fs = require('fs'); if (fs.existsSync('package.json')) { const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8')); console.log('Package:', pkg.name, '@', pkg.version, '| Deps:', Object.keys(pkg.dependencies || {}).length); } else { console.log('No package.json found in this directory.'); }`
  }
]

export const ScriptCatalog: React.FC<ScriptCatalogProps> = ({
  activeFolder,
  isRunning,
  onRunScript,
  onStopScript
}) => {
  const [selectedScriptId, setSelectedScriptId] = useState<string>(PRESET_SCRIPTS[0].id)
  const [customCommand, setCustomCommand] = useState<string>('Get-ChildItem | Select-Object Name, Length')
  const [customType, setCustomType] = useState<ScriptType>('powershell')
  const [isCustomMode, setIsCustomMode] = useState<boolean>(false)

  const activePreset = PRESET_SCRIPTS.find((s) => s.id === selectedScriptId)

  const handleExecute = () => {
    if (!activeFolder) return

    if (isCustomMode) {
      onRunScript({
        id: `custom-${Date.now()}`,
        command: customCommand,
        scriptType: customType,
        targetDirectory: activeFolder
      })
    } else if (activePreset) {
      onRunScript({
        id: `${activePreset.id}-${Date.now()}`,
        command: activePreset.commandTemplate,
        scriptType: activePreset.scriptType,
        targetDirectory: activeFolder
      })
    }
  }

  return (
    <div className="glass-card" style={{ display: 'flex', flexDirection: 'column' }}>
      <div className="card-header">
        <div className="card-title">
          <Terminal size={18} color="var(--accent-purple)" />
          <span>Script Executor</span>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            className={`btn btn-sm ${!isCustomMode ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setIsCustomMode(false)}
          >
            <Sparkles size={13} />
            <span>Presets</span>
          </button>
          <button
            className={`btn btn-sm ${isCustomMode ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setIsCustomMode(true)}
          >
            <Code2 size={13} />
            <span>Custom Script</span>
          </button>
        </div>
      </div>

      {!isCustomMode ? (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '10px' }}>
            {PRESET_SCRIPTS.map((script) => {
              const isSelected = selectedScriptId === script.id
              return (
                <div
                  key={script.id}
                  className={`script-card ${isSelected ? 'active' : ''}`}
                  onClick={() => setSelectedScriptId(script.id)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.88rem' }}>{script.name}</span>
                    <span className="script-badge">{script.scriptType}</span>
                  </div>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    {script.description}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Engine:</span>
            <select
              value={customType}
              onChange={(e) => setCustomType(e.target.value as ScriptType)}
              style={{
                background: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
                padding: '6px 10px',
                fontSize: '0.8rem',
                fontFamily: 'var(--font-mono)'
              }}
            >
              <option value="powershell">PowerShell</option>
              <option value="cmd">Windows Command (CMD)</option>
              <option value="bash">Bash / Git Bash</option>
              <option value="node">Node.js (inline -e)</option>
              <option value="python">Python (-c)</option>
            </select>
          </div>

          <textarea
            value={customCommand}
            onChange={(e) => setCustomCommand(e.target.value)}
            placeholder="Type your script command here..."
            rows={4}
            style={{
              width: '100%',
              background: '#06090e',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              color: '#f8fafc',
              padding: '10px',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.82rem',
              resize: 'vertical'
            }}
          />
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
        {isRunning ? (
          <button className="btn btn-danger" onClick={onStopScript}>
            <Square size={14} />
            <span>Stop Execution</span>
          </button>
        ) : (
          <button
            className="btn btn-primary"
            onClick={handleExecute}
            disabled={!activeFolder}
            title={!activeFolder ? 'Please select a folder first' : 'Run script in target folder'}
          >
            <Play size={14} />
            <span>Run in Selected Folder</span>
          </button>
        )}
      </div>
    </div>
  )
}
