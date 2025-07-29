import { Injectable } from '@nestjs/common';

interface CacheItem {
  value: any;
  expiry: number;
}

@Injectable()
export class CacheService {
  private cache = new Map<string, CacheItem>();
  private readonly defaultTTL = 5 * 60 * 1000; // 5 minutes

  set(key: string, value: any, ttl?: number): void {
    const expiry = Date.now() + (ttl || this.defaultTTL);
    this.cache.set(key, { value, expiry });
  }

  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    
    if (!item) {
      return null;
    }

    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }

    return item.value as T;
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  has(key: string): boolean {
    const item = this.cache.get(key);
    
    if (!item) {
      return false;
    }

    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  keys(): string[] {
    // Clean expired items first
    this.cleanExpired();
    return Array.from(this.cache.keys());
  }

  size(): number {
    this.cleanExpired();
    return this.cache.size;
  }

  private cleanExpired(): void {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiry) {
        this.cache.delete(key);
      }
    }
  }

  // Utility methods for common caching patterns
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttl?: number,
  ): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const value = await factory();
    this.set(key, value, ttl);
    return value;
  }

  // Cache patterns for e-commerce
  cacheProduct(productId: string, product: any, ttl = 10 * 60 * 1000): void {
    this.set(`product:${productId}`, product, ttl);
  }

  getCachedProduct(productId: string): any | null {
    return this.get(`product:${productId}`);
  }

  cacheProductList(filters: string, products: any[], ttl = 5 * 60 * 1000): void {
    this.set(`products:${filters}`, products, ttl);
  }

  getCachedProductList(filters: string): any[] | null {
    return this.get(`products:${filters}`);
  }

  cacheUserCart(userId: string, cart: any, ttl = 30 * 60 * 1000): void {
    this.set(`cart:${userId}`, cart, ttl);
  }

  getCachedUserCart(userId: string): any | null {
    return this.get(`cart:${userId}`);
  }

  invalidateUserCart(userId: string): void {
    this.delete(`cart:${userId}`);
  }

  cacheUserSession(sessionId: string, user: any, ttl = 60 * 60 * 1000): void {
    this.set(`session:${sessionId}`, user, ttl);
  }

  getCachedUserSession(sessionId: string): any | null {
    return this.get(`session:${sessionId}`);
  }

  invalidateUserSession(sessionId: string): void {
    this.delete(`session:${sessionId}`);
  }

  // Bulk operations
  setMultiple(items: Array<{ key: string; value: any; ttl?: number }>): void {
    items.forEach(item => {
      this.set(item.key, item.value, item.ttl);
    });
  }

  getMultiple<T>(keys: string[]): Array<{ key: string; value: T | null }> {
    return keys.map(key => ({
      key,
      value: this.get<T>(key),
    }));
  }

  deleteMultiple(keys: string[]): number {
    let deletedCount = 0;
    keys.forEach(key => {
      if (this.delete(key)) {
        deletedCount++;
      }
    });
    return deletedCount;
  }

  // Statistics
  getStats(): {
    size: number;
    keys: string[];
    memoryUsage: string;
  } {
    this.cleanExpired();
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
      memoryUsage: `${Math.round(JSON.stringify(Array.from(this.cache.entries())).length / 1024)} KB`,
    };
  }
}