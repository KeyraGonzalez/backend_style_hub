import { Injectable, NestMiddleware, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

@Injectable()
export class RateLimitingMiddleware implements NestMiddleware {
  private store: RateLimitStore = {};
  private readonly windowMs = 15 * 60 * 1000; // 15 minutes
  private readonly maxRequests = 100; // max requests per window

  use(req: Request, res: Response, next: NextFunction) {
    const key = this.generateKey(req);
    const now = Date.now();
    
    // Clean expired entries
    this.cleanExpiredEntries(now);
    
    if (!this.store[key]) {
      this.store[key] = {
        count: 1,
        resetTime: now + this.windowMs,
      };
    } else {
      if (now > this.store[key].resetTime) {
        // Reset window
        this.store[key] = {
          count: 1,
          resetTime: now + this.windowMs,
        };
      } else {
        this.store[key].count++;
      }
    }

    const { count, resetTime } = this.store[key];
    
    // Set rate limit headers
    res.set({
      'X-RateLimit-Limit': this.maxRequests.toString(),
      'X-RateLimit-Remaining': Math.max(0, this.maxRequests - count).toString(),
      'X-RateLimit-Reset': new Date(resetTime).toISOString(),
    });

    if (count > this.maxRequests) {
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: 'Too many requests, please try again later.',
          error: 'Too Many Requests',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    next();
  }

  private generateKey(req: Request): string {
    // Use IP address and user ID (if authenticated) for rate limiting
    const ip = req.ip || req.connection.remoteAddress;
    const userId = (req as any).user?.id;
    return userId ? `user:${userId}` : `ip:${ip}`;
  }

  private cleanExpiredEntries(now: number) {
    Object.keys(this.store).forEach(key => {
      if (now > this.store[key].resetTime) {
        delete this.store[key];
      }
    });
  }
}