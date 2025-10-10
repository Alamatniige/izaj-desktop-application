interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  keyGenerator?: (request: Request) => string;
}

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

// In-memory store (for production, use Redis or database)
const store: RateLimitStore = {};

export class RateLimiter {
  private config: RateLimitConfig;
  
  constructor(config: RateLimitConfig) {
    this.config = config;
  }
  
  private getKey(request: Request): string {
    if (this.config.keyGenerator) {
      return this.config.keyGenerator(request);
    }
    
    // Default: use IP address + User-Agent
    const ip = this.getClientIP(request);
    const userAgent = request.headers.get('user-agent') || 'unknown';
    return `${ip}:${userAgent}`;
  }
  
  private getClientIP(request: Request): string {
    // Check for forwarded IP (from proxy/load balancer)
    const forwarded = request.headers.get('x-forwarded-for');
    if (forwarded) {
      return forwarded.split(',')[0].trim();
    }
    
    // Check for real IP
    const realIP = request.headers.get('x-real-ip');
    if (realIP) {
      return realIP;
    }
    
    // Fallback to connection remote address
    return 'unknown';
  }
  
  private cleanup(): void {
    const now = Date.now();
    Object.keys(store).forEach(key => {
      if (store[key].resetTime < now) {
        delete store[key];
      }
    });
  }
  
  async check(request: Request): Promise<{
    allowed: boolean;
    remaining: number;
    resetTime: number;
    retryAfter?: number;
  }> {
    this.cleanup();
    
    const key = this.getKey(request);
    const now = Date.now();
    const windowStart = now - this.config.windowMs;
    
    // Get or create entry for this key
    let entry = store[key];
    if (!entry || entry.resetTime < windowStart) {
      entry = {
        count: 0,
        resetTime: now + this.config.windowMs
      };
      store[key] = entry;
    }
    
    // Increment counter
    entry.count++;
    
    const allowed = entry.count <= this.config.maxRequests;
    const remaining = Math.max(0, this.config.maxRequests - entry.count);
    
    return {
      allowed,
      remaining,
      resetTime: entry.resetTime,
      retryAfter: !allowed ? Math.ceil((entry.resetTime - now) / 1000) : undefined
    };
  }
}

// Pre-configured rate limiters
export const forgotPasswordLimiter = new RateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 3, // 3 requests per 15 minutes
  keyGenerator: (request) => {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';
    return `forgot-password:${ip}`;
  }
});

export const resetPasswordLimiter = new RateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 5, // 5 attempts per hour
  keyGenerator: (request) => {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';
    return `reset-password:${ip}`;
  }
});

export const generalAuthLimiter = new RateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 10, // 10 requests per 15 minutes
});

// OTP-specific rate limiters
export const otpSendLimiter = new RateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 3, // 3 OTP requests per 15 minutes
  keyGenerator: (request) => {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';
    return `otp-send:${ip}`;
  }
});

export const otpVerifyLimiter = new RateLimiter({
  windowMs: 10 * 60 * 1000, // 10 minutes
  maxRequests: 5, // 5 verification attempts per 10 minutes
  keyGenerator: (request) => {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';
    return `otp-verify:${ip}`;
  }
});

export const otpResetPasswordLimiter = new RateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 3, // 3 OTP-based password resets per hour
  keyGenerator: (request) => {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';
    return `otp-reset:${ip}`;
  }
});

// Helper function to create rate limit response
export function createRateLimitResponse(retryAfter: number) {
  return new Response(
    JSON.stringify({
      error: 'Too many requests',
      message: 'Please try again later',
      retryAfter
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': retryAfter.toString(),
        'X-RateLimit-Limit': '3',
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': new Date(Date.now() + retryAfter * 1000).toISOString()
      }
    }
  );
}
