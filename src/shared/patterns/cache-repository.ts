// Repository Pattern - Para abstraer las operaciones de caché

export interface CacheRepository<T> {
  save(key: string, entity: T, ttl?: number): void;
  findByKey(key: string): T | null;
  findAll(): Array<{ key: string; value: T }>;
  remove(key: string): boolean;
  removeAll(): void;
  exists(key: string): boolean;
  count(): number;
}

// Repositorio base genérico
export abstract class BaseCacheRepository<T> implements CacheRepository<T> {
  protected abstract getKeyPrefix(): string;

  abstract save(key: string, entity: T, ttl?: number): void;
  abstract findByKey(key: string): T | null;
  abstract findAll(): Array<{ key: string; value: T }>;
  abstract remove(key: string): boolean;
  abstract removeAll(): void;
  abstract exists(key: string): boolean;
  abstract count(): number;

  protected buildKey(key: string): string {
    return `${this.getKeyPrefix()}:${key}`;
  }
}

// Repositorio específico para productos
export class ProductCacheRepository extends BaseCacheRepository<any> {
  constructor(private cacheStrategy: any) {
    super();
  }

  protected getKeyPrefix(): string {
    return 'product';
  }

  save(productId: string, product: any, ttl = 10 * 60 * 1000): void {
    const key = this.buildKey(productId);
    this.cacheStrategy.set(key, product, ttl);
  }

  findByKey(productId: string): any | null {
    const key = this.buildKey(productId);
    return this.cacheStrategy.get(key);
  }

  findAll(): Array<{ key: string; value: any }> {
    const prefix = this.getKeyPrefix();
    const keys = this.cacheStrategy
      .keys()
      .filter((key) => key.startsWith(`${prefix}:`));

    return keys
      .map((key) => ({
        key: key.replace(`${prefix}:`, ''),
        value: this.cacheStrategy.get(key),
      }))
      .filter((item) => item.value !== null);
  }

  remove(productId: string): boolean {
    const key = this.buildKey(productId);
    return this.cacheStrategy.delete(key);
  }

  removeAll(): void {
    const prefix = this.getKeyPrefix();
    const keys = this.cacheStrategy
      .keys()
      .filter((key) => key.startsWith(`${prefix}:`));
    keys.forEach((key) => this.cacheStrategy.delete(key));
  }

  exists(productId: string): boolean {
    const key = this.buildKey(productId);
    return this.cacheStrategy.has(key);
  }

  count(): number {
    const prefix = this.getKeyPrefix();
    return this.cacheStrategy
      .keys()
      .filter((key) => key.startsWith(`${prefix}:`)).length;
  }

  // Métodos específicos para productos
  findByCategory(category: string): any[] {
    return this.findAll()
      .filter((item) => item.value.category === category)
      .map((item) => item.value);
  }

  findByPriceRange(minPrice: number, maxPrice: number): any[] {
    return this.findAll()
      .filter((item) => {
        const price = item.value.price;
        return price >= minPrice && price <= maxPrice;
      })
      .map((item) => item.value);
  }
}

// Repositorio específico para carritos de usuario
export class CartCacheRepository extends BaseCacheRepository<any> {
  constructor(private cacheStrategy: any) {
    super();
  }

  protected getKeyPrefix(): string {
    return 'cart';
  }

  save(userId: string, cart: any, ttl = 30 * 60 * 1000): void {
    const key = this.buildKey(userId);
    this.cacheStrategy.set(key, cart, ttl);
  }

  findByKey(userId: string): any | null {
    const key = this.buildKey(userId);
    return this.cacheStrategy.get(key);
  }

  findAll(): Array<{ key: string; value: any }> {
    const prefix = this.getKeyPrefix();
    const keys = this.cacheStrategy
      .keys()
      .filter((key) => key.startsWith(`${prefix}:`));

    return keys
      .map((key) => ({
        key: key.replace(`${prefix}:`, ''),
        value: this.cacheStrategy.get(key),
      }))
      .filter((item) => item.value !== null);
  }

  remove(userId: string): boolean {
    const key = this.buildKey(userId);
    return this.cacheStrategy.delete(key);
  }

  removeAll(): void {
    const prefix = this.getKeyPrefix();
    const keys = this.cacheStrategy
      .keys()
      .filter((key) => key.startsWith(`${prefix}:`));
    keys.forEach((key) => this.cacheStrategy.delete(key));
  }

  exists(userId: string): boolean {
    const key = this.buildKey(userId);
    return this.cacheStrategy.has(key);
  }

  count(): number {
    const prefix = this.getKeyPrefix();
    return this.cacheStrategy
      .keys()
      .filter((key) => key.startsWith(`${prefix}:`)).length;
  }

  // Métodos específicos para carritos
  findActiveCartsCount(): number {
    return this.findAll().filter(
      (cart) => cart.value.items && cart.value.items.length > 0
    ).length;
  }

  getTotalItemsInAllCarts(): number {
    return this.findAll().reduce((total, cart) => {
      return total + (cart.value.items ? cart.value.items.length : 0);
    }, 0);
  }
}

// Repositorio específico para sesiones de usuario
export class SessionCacheRepository extends BaseCacheRepository<any> {
  constructor(private cacheStrategy: any) {
    super();
  }

  protected getKeyPrefix(): string {
    return 'session';
  }

  save(sessionId: string, user: any, ttl = 60 * 60 * 1000): void {
    const key = this.buildKey(sessionId);
    this.cacheStrategy.set(key, user, ttl);
  }

  findByKey(sessionId: string): any | null {
    const key = this.buildKey(sessionId);
    return this.cacheStrategy.get(key);
  }

  findAll(): Array<{ key: string; value: any }> {
    const prefix = this.getKeyPrefix();
    const keys = this.cacheStrategy
      .keys()
      .filter((key) => key.startsWith(`${prefix}:`));

    return keys
      .map((key) => ({
        key: key.replace(`${prefix}:`, ''),
        value: this.cacheStrategy.get(key),
      }))
      .filter((item) => item.value !== null);
  }

  remove(sessionId: string): boolean {
    const key = this.buildKey(sessionId);
    return this.cacheStrategy.delete(key);
  }

  removeAll(): void {
    const prefix = this.getKeyPrefix();
    const keys = this.cacheStrategy
      .keys()
      .filter((key) => key.startsWith(`${prefix}:`));
    keys.forEach((key) => this.cacheStrategy.delete(key));
  }

  exists(sessionId: string): boolean {
    const key = this.buildKey(sessionId);
    return this.cacheStrategy.has(key);
  }

  count(): number {
    const prefix = this.getKeyPrefix();
    return this.cacheStrategy
      .keys()
      .filter((key) => key.startsWith(`${prefix}:`)).length;
  }

  // Métodos específicos para sesiones
  findByUserId(userId: string): any[] {
    return this.findAll()
      .filter((session) => session.value.id === userId)
      .map((session) => session.value);
  }

  getActiveSessionsCount(): number {
    return this.count();
  }
}
