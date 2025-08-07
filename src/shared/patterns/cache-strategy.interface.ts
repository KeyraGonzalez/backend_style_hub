// Strategy Pattern - Interface para diferentes estrategias de caché
export interface CacheStrategy {
  set(key: string, value: any, ttl?: number): void;
  get<T>(key: string): T | null;
  delete(key: string): boolean;
  clear(): void;
  has(key: string): boolean;
  keys(): string[];
  size(): number;
}

// Estrategia de caché en memoria
export class InMemoryCacheStrategy implements CacheStrategy {
  private cache = new Map<string, { value: any; expiry: number }>();
  private readonly defaultTTL = 5 * 60 * 1000;

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
}

// Estrategia de caché LRU (Least Recently Used)
export class LRUCacheStrategy implements CacheStrategy {
  private cache = new Map<
    string,
    { value: any; expiry: number; lastAccessed: number }
  >();
  private readonly maxSize: number;
  private readonly defaultTTL = 5 * 60 * 1000;

  constructor(maxSize: number = 1000) {
    this.maxSize = maxSize;
  }

  set(key: string, value: any, ttl?: number): void {
    const expiry = Date.now() + (ttl || this.defaultTTL);
    const lastAccessed = Date.now();

    // Si ya existe, lo actualizamos
    if (this.cache.has(key)) {
      this.cache.set(key, { value, expiry, lastAccessed });
      return;
    }

    // Si hemos alcanzado el límite, eliminamos el menos usado
    if (this.cache.size >= this.maxSize) {
      this.evictLeastRecentlyUsed();
    }

    this.cache.set(key, { value, expiry, lastAccessed });
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

    // Actualizamos el tiempo de último acceso
    item.lastAccessed = Date.now();
    this.cache.set(key, item);

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
    this.cleanExpired();
    return Array.from(this.cache.keys());
  }

  size(): number {
    this.cleanExpired();
    return this.cache.size;
  }

  private evictLeastRecentlyUsed(): void {
    let oldestKey = '';
    let oldestTime = Date.now();

    for (const [key, item] of this.cache.entries()) {
      if (item.lastAccessed < oldestTime) {
        oldestTime = item.lastAccessed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  private cleanExpired(): void {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiry) {
        this.cache.delete(key);
      }
    }
  }
}

// Estrategia de caché que no hace nada (Null Object Pattern)
export class NoOpCacheStrategy implements CacheStrategy {
  set(key: string, value: any, ttl?: number): void {
    // No hace nada
  }

  get<T>(key: string): T | null {
    return null;
  }

  delete(key: string): boolean {
    return false;
  }

  clear(): void {
    // No hace nada
  }

  has(key: string): boolean {
    return false;
  }

  keys(): string[] {
    return [];
  }

  size(): number {
    return 0;
  }
}
