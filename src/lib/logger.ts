export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export interface LogEntry {
  timestamp: string
  level: LogLevel
  message: string
  context?: Record<string, any>
  error?: {
    message: string
    stack?: string
    code?: string
  }
}

class Logger {
  private isDev = import.meta.env.DEV

  private formatLog(entry: LogEntry): string {
    const { timestamp, level, message, context } = entry
    const contextStr = context ? ` ${JSON.stringify(context)}` : ''
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${contextStr}`
  }

  private async sendToServer(entry: LogEntry): Promise<void> {
    if (typeof window === 'undefined') return

    try {
      await fetch('/api/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry),
      }).catch(() => {})
    } catch (err) {
      // Fail silently - don't let logging errors break the app
    }
  }

  private createEntry(level: LogLevel, message: string, context?: Record<string, any>, error?: Error): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      error: error ? {
        message: error.message,
        stack: error.stack,
        code: (error as any).code,
      } : undefined,
    }
  }

  debug(message: string, context?: Record<string, any>): void {
    const entry = this.createEntry('debug', message, context)
    if (this.isDev) console.debug(this.formatLog(entry))
  }

  info(message: string, context?: Record<string, any>): void {
    const entry = this.createEntry('info', message, context)
    console.info(this.formatLog(entry))
    this.sendToServer(entry)
  }

  warn(message: string, context?: Record<string, any>, error?: Error): void {
    const entry = this.createEntry('warn', message, context, error)
    console.warn(this.formatLog(entry))
    this.sendToServer(entry)
  }

  error(message: string, error?: Error, context?: Record<string, any>): void {
    const entry = this.createEntry('error', message, context, error)
    console.error(this.formatLog(entry))
    this.sendToServer(entry)
  }

  // Convenience methods for common scenarios
  challengeSubmitted(teamName: string, challengeId: string, isCorrect: boolean): void {
    this.info('Challenge submission', {
      team: teamName,
      challenge: challengeId,
      correct: isCorrect,
      event: 'challenge_submit',
    })
  }

  authEvent(event: string, userId?: string, context?: Record<string, any>): void {
    this.info(`Auth: ${event}`, {
      user_id: userId,
      event,
      ...context,
    })
  }

  performanceMetric(name: string, duration: number, metadata?: Record<string, any>): void {
    this.debug(`Performance: ${name}`, {
      duration_ms: duration,
      ...metadata,
    })
  }

  securityEvent(event: string, severity: 'low' | 'medium' | 'high', context?: Record<string, any>): void {
    this.warn(`Security: ${event}`, {
      severity,
      event,
      ...context,
    })
  }
}

export const logger = new Logger()
