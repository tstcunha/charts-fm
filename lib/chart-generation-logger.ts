// Logger for chart generation performance tracking
import { writeFile, appendFile, mkdir } from 'fs/promises'
import { join } from 'path'

interface LogEntry {
  timestamp: string
  step: string
  duration: number
  details?: string
}

class ChartGenerationLogger {
  private logs: LogEntry[] = []
  private startTime: number = Date.now()
  private logFile: string | null = null

  constructor(groupId: string) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    this.logFile = join(process.cwd(), 'logs', `chart-generation-${groupId}-${timestamp}.log`)
    this.startTime = Date.now()
  }

  private formatDuration(ms: number): string {
    if (ms < 1000) return `${ms.toFixed(2)}ms`
    return `${(ms / 1000).toFixed(2)}s`
  }

  async log(step: string, duration: number, details?: string) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      step,
      duration,
      details,
    }
    this.logs.push(entry)

    const message = `[${entry.timestamp}] ${step} - ${this.formatDuration(duration)}${details ? ` - ${details}` : ''}`
    
    // Console output
    console.log(message)

    // File output
    try {
      await mkdir(join(process.cwd(), 'logs'), { recursive: true })
      await appendFile(this.logFile!, message + '\n', 'utf-8')
    } catch (error) {
      // Silently fail if file writing fails
      console.error('Failed to write to log file:', error)
    }
  }

  async logStart(step: string, details?: string) {
    const start = Date.now()
    return {
      end: async (endDetails?: string) => {
        const duration = Date.now() - start
        await this.log(step, duration, endDetails || details)
        return duration
      },
    }
  }

  async logSummary() {
    const totalDuration = Date.now() - this.startTime
    const summary = [
      '\n=== CHART GENERATION SUMMARY ===',
      `Total Duration: ${this.formatDuration(totalDuration)}`,
      `Steps: ${this.logs.length}`,
      '\nBreakdown:',
      ...this.logs.map((log, idx) => 
        `${idx + 1}. ${log.step}: ${this.formatDuration(log.duration)}${log.details ? ` (${log.details})` : ''}`
      ),
      '================================\n',
    ].join('\n')

    console.log(summary)
    
    if (this.logFile) {
      try {
        await appendFile(this.logFile!, summary, 'utf-8')
        console.log(`\nFull log saved to: ${this.logFile}`)
      } catch (error) {
        console.error('Failed to write summary to log file:', error)
      }
    }
  }

  getLogs(): LogEntry[] {
    return this.logs
  }
}

export { ChartGenerationLogger }

