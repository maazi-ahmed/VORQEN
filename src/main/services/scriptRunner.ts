import { spawn, ChildProcess } from 'child_process'
import { BrowserWindow } from 'electron'
import { IPC_CHANNELS } from '../../shared/ipc-channels'
import { ScriptExitPayload, ScriptLogPayload, ScriptRunRequest } from '../../shared/types'

class ScriptRunnerManager {
  private activeProcesses = new Map<string, ChildProcess>()

  public runScript(
    window: BrowserWindow,
    request: ScriptRunRequest
  ): { started: boolean; error?: string } {
    const { id, command, scriptType, targetDirectory } = request

    if (this.activeProcesses.has(id)) {
      return { started: false, error: 'A script with this ID is already running.' }
    }

    const startTime = Date.now()

    this.emitLog(window, {
      runId: id,
      type: 'system',
      message: `[VORQEN] Starting script (${scriptType}) in: ${targetDirectory}`,
      timestamp: startTime
    })

    let executable: string
    let args: string[]

    const isWindows = process.platform === 'win32'

    switch (scriptType) {
      case 'powershell':
        executable = isWindows ? 'powershell.exe' : 'pwsh'
        args = ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', command]
        break
      case 'cmd':
        executable = 'cmd.exe'
        args = ['/c', command]
        break
      case 'bash':
        executable = isWindows ? 'bash.exe' : 'bash'
        args = ['-c', command]
        break
      case 'node':
        executable = 'node'
        args = ['-e', command]
        break
      case 'python':
        executable = isWindows ? 'python' : 'python3'
        args = ['-c', command]
        break
      default:
        executable = isWindows ? 'powershell.exe' : 'bash'
        args = isWindows
          ? ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', command]
          : ['-c', command]
    }

    let childProc: ChildProcess

    try {
      childProc = spawn(executable, args, {
        cwd: targetDirectory,
        shell: false,
        env: { ...process.env }
      })
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err)
      this.emitLog(window, {
        runId: id,
        type: 'stderr',
        message: `Failed to spawn process: ${errorMsg}`,
        timestamp: Date.now()
      })
      return { started: false, error: errorMsg }
    }

    this.activeProcesses.set(id, childProc)

    childProc.stdout?.on('data', (chunk: Buffer) => {
      this.emitLog(window, {
        runId: id,
        type: 'stdout',
        message: chunk.toString(),
        timestamp: Date.now()
      })
    })

    childProc.stderr?.on('data', (chunk: Buffer) => {
      this.emitLog(window, {
        runId: id,
        type: 'stderr',
        message: chunk.toString(),
        timestamp: Date.now()
      })
    })

    childProc.on('error', (err) => {
      this.emitLog(window, {
        runId: id,
        type: 'stderr',
        message: `Process error: ${err.message}`,
        timestamp: Date.now()
      })
    })

    childProc.on('close', (code, signal) => {
      this.activeProcesses.delete(id)
      const durationMs = Date.now() - startTime
      const success = code === 0

      this.emitLog(window, {
        runId: id,
        type: 'system',
        message: `[VORQEN] Finished with code ${code ?? 'null'} in ${durationMs}ms`,
        timestamp: Date.now()
      })

      const exitPayload: ScriptExitPayload = {
        runId: id,
        exitCode: code,
        signal,
        durationMs,
        success
      }

      if (!window.isDestroyed()) {
        window.webContents.send(IPC_CHANNELS.ON_SCRIPT_EXIT, exitPayload)
      }
    })

    return { started: true }
  }

  public stopScript(id: string): { stopped: boolean } {
    const proc = this.activeProcesses.get(id)
    if (!proc) {
      return { stopped: false }
    }

    try {
      proc.kill()
      this.activeProcesses.delete(id)
      return { stopped: true }
    } catch {
      return { stopped: false }
    }
  }

  private emitLog(window: BrowserWindow, payload: ScriptLogPayload): void {
    if (!window.isDestroyed()) {
      window.webContents.send(IPC_CHANNELS.ON_SCRIPT_LOG, payload)
    }
  }
}

export const scriptRunner = new ScriptRunnerManager()
