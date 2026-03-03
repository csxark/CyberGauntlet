/**
 * Rate Limiting Utility for Challenge Flag Validation
 * 
 * Implements multi-layer rate limiting with exponential backoff:
 * - Tracks failed attempts per team
 * - Progressive lockout with exponential duration increase
 * - Automatic reset on success or timeout
 * - Logging for abuse detection
 */

interface RateLimitStatus {
  isLocked: boolean;
  remainingSeconds: number;
  failedAttempts: number;
  lockoutLevel: number;
  nextLockoutDuration: number; // seconds until next level
}

interface RateLimitConfig {
  maxFailedAttempts: number;      // Threshold before lockout (default: 5)
  initialLockoutSeconds: number;  // First lockout duration (default: 30)
  backoffMultiplier: number;      // Exponential multiplier (default: 2)
  maxLockoutSeconds: number;      // Maximum lockout duration (default: 28800 = 8 hours)
  resetAfterSeconds: number;      // Reset counter after inactivity (default: 86400 = 24 hours)
}

const DEFAULT_CONFIG: RateLimitConfig = {
  maxFailedAttempts: 5,
  initialLockoutSeconds: 30,
  backoffMultiplier: 2,
  maxLockoutSeconds: 28800,     // 8 hours
  resetAfterSeconds: 86400,     // 24 hours
};

/**
 * Check if a team is currently rate limited
 */
export function checkRateLimit(
  session: any,
  config: RateLimitConfig = DEFAULT_CONFIG
): RateLimitStatus {
  const now = new Date();
  const lockedUntil = session.rate_limit_locked_until 
    ? new Date(session.rate_limit_locked_until)
    : null;
  
  const isLocked = lockedUntil && lockedUntil > now;
  
  let remainingSeconds = 0;
  if (isLocked && lockedUntil) {
    remainingSeconds = Math.ceil((lockedUntil.getTime() - now.getTime()) / 1000);
  }

  // Calculate next lockout duration based on current level
  const nextLevel = (session.rate_limit_level || 0) + 1;
  const nextLockoutDuration = Math.min(
    config.initialLockoutSeconds * Math.pow(config.backoffMultiplier, nextLevel - 1),
    config.maxLockoutSeconds
  );

  return {
    isLocked: isLocked || false,
    remainingSeconds,
    failedAttempts: session.failed_attempts || 0,
    lockoutLevel: session.rate_limit_level || 0,
    nextLockoutDuration: Math.ceil(nextLockoutDuration),
  };
}

/**
 * Calculate new lockout duration based on exponential backoff
 */
export function calculateLockoutDuration(
  currentLevel: number,
  config: RateLimitConfig = DEFAULT_CONFIG
): number {
  const duration = config.initialLockoutSeconds * 
    Math.pow(config.backoffMultiplier, currentLevel);
  
  return Math.min(duration, config.maxLockoutSeconds);
}

/**
 * Format rate limit status for response
 */
export function formatRateLimitResponse(status: RateLimitStatus): object {
  return {
    rate_limited: status.isLocked,
    remaining_seconds: status.remainingSeconds,
    failed_attempts: status.failedAttempts,
    lockout_level: status.lockoutLevel,
  };
}

/**
 * Generate exploit pattern detection data
 */
export function detectAbusePattern(
  teamName: string,
  status: RateLimitStatus,
  ipAddress?: string
): object {
  const now = new Date().toISOString();
  
  return {
    timestamp: now,
    team_name: teamName,
    ip_address: ipAddress || 'unknown',
    abuse_indicators: {
      high_failed_attempts: status.failedAttempts >= 5,
      locked_out: status.isLocked,
      repeated_lockouts: status.lockoutLevel > 3,
      rapid_attacks: status.failedAttempts > 10,
    },
    severity: calculateAbuseSeverity(status),
    recommended_action: recommendAction(status),
  };
}

/**
 * Calculate abuse severity level
 */
function calculateAbuseSeverity(status: RateLimitStatus): 'low' | 'medium' | 'high' | 'critical' {
  if (status.lockoutLevel > 5 || status.failedAttempts > 20) return 'critical';
  if (status.lockoutLevel > 3 || status.failedAttempts > 15) return 'high';
  if (status.isLocked || status.failedAttempts > 7) return 'medium';
  return 'low';
}

/**
 * Recommend action based on pattern
 */
function recommendAction(status: RateLimitStatus): string {
  if (status.lockoutLevel > 5) {
    return 'ALERT: Potential brute force attack - consider blocking team IP';
  }
  if (status.isLocked && status.lockoutLevel > 2) {
    return 'WARN: Team experiencing repeated lockouts - monitor activity';
  }
  if (status.failedAttempts >= 5) {
    return 'INFO: Team reaching lockout threshold - normal rate limiting in effect';
  }
  return 'OK: No suspicious activity detected';
}

/**
 * Generate analytics data for rate limiting
 */
export function generateAnalytics(status: RateLimitStatus): object {
  return {
    rate_limit_metrics: {
      is_currently_limited: status.isLocked,
      attempt_count: status.failedAttempts,
      backoff_level: status.lockoutLevel,
      lockout_duration_seconds: status.remainingSeconds,
      estimated_unlock_time: status.remainingSeconds > 0 
        ? new Date(Date.now() + status.remainingSeconds * 1000).toISOString()
        : null,
    },
  };
}

export default {
  checkRateLimit,
  calculateLockoutDuration,
  formatRateLimitResponse,
  detectAbusePattern,
  generateAnalytics,
  DEFAULT_CONFIG,
};
