import { Injectable } from '@nestjs/common';
import { CacheStrategy } from './cache-strategy.interface';
import { CacheType, CacheFactoryProvider } from './cache-factory';
import {
  ProductCacheRepository,
  CartCacheRepository,
  SessionCacheRepository,
} from './cache-repository';

interface CacheItem {
  value: any;
  expiry: number;
}

@Injectable()
export class CacheService {
  private cacheStrategy: CacheStrategy;
  private cache = new Map<string, CacheItem>();
  private readonly defaultTTL = 5 * 60 * 1000; // 5 minutes

  // Repositories para diferentes tipos de datos
  private productRepository: ProductCacheRepository;
  private cartRepository: CartCacheRepository;
  private sessionRepository: SessionCacheRepository;

  constructor() {
    // Factory Method Pattern: Crear la estrategia de caché
    this.cacheStrategy = CacheFactoryProvider.createCache({
      type: CacheType.IN_MEMORY, // Se puede configurar externamente
      maxSize: 1000,
    });

    // Repository Pattern: Inicializar repositorios específicos
    this.productRepository = new ProductCacheRepository(this.cacheStrategy);
    this.cartRepository = new CartCacheRepository(this.cacheStrategy);
    this.sessionRepository = new SessionCacheRepository(this.cacheStrategy);
  }

  // Método para cambiar la estrategia de caché en tiempo de ejecución (Strategy Pattern)
  setStrategy(strategy: CacheStrategy): void {
    this.cacheStrategy = strategy;
    // Reinicializar repositorios con la nueva estrategia
    this.productRepository = new ProductCacheRepository(this.cacheStrategy);
    this.cartRepository = new CartCacheRepository(this.cacheStrategy);
    this.sessionRepository = new SessionCacheRepository(this.cacheStrategy);
  }

  // Métodos básicos que delegan a la estrategia
  set(key: string, value: any, ttl?: number): void {
    this.cacheStrategy.set(key, value, ttl);
  }

  get<T>(key: string): T | null {
    return this.cacheStrategy.get<T>(key);
  }

  delete(key: string): boolean {
    return this.cacheStrategy.delete(key);
  }

  clear(): void {
    this.cacheStrategy.clear();
  }

  has(key: string): boolean {
    return this.cacheStrategy.has(key);
  }

  keys(): string[] {
    return this.cacheStrategy.keys();
  }

  size(): number {
    return this.cacheStrategy.size();
  }

  // Getters para acceder a los repositorios específicos
  get products(): ProductCacheRepository {
    return this.productRepository;
  }

  get carts(): CartCacheRepository {
    return this.cartRepository;
  }

  get sessions(): SessionCacheRepository {
    return this.sessionRepository;
  }

  // Utility methods for common caching patterns
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const value = await factory();
    this.set(key, value, ttl);
    return value;
  }

  // Cache patterns for e-commerce (métodos legacy para compatibilidad hacia atrás)
  cacheProduct(productId: string, product: any, ttl = 10 * 60 * 1000): void {
    this.productRepository.save(productId, product, ttl);
  }

  getCachedProduct(productId: string): any | null {
    return this.productRepository.findByKey(productId);
  }

  cacheProductList(
    filters: string,
    products: any[],
    ttl = 5 * 60 * 1000
  ): void {
    this.set(`products:${filters}`, products, ttl);
  }

  getCachedProductList(filters: string): any[] | null {
    return this.get(`products:${filters}`);
  }

  cacheUserCart(userId: string, cart: any, ttl = 30 * 60 * 1000): void {
    this.cartRepository.save(userId, cart, ttl);
  }

  getCachedUserCart(userId: string): any | null {
    return this.cartRepository.findByKey(userId);
  }

  invalidateUserCart(userId: string): void {
    this.cartRepository.remove(userId);
  }

  cacheUserSession(sessionId: string, user: any, ttl = 60 * 60 * 1000): void {
    this.sessionRepository.save(sessionId, user, ttl);
  }

  getCachedUserSession(sessionId: string): any | null {
    return this.sessionRepository.findByKey(sessionId);
  }

  invalidateUserSession(sessionId: string): void {
    this.sessionRepository.remove(sessionId);
  }

  // Bulk operations
  setMultiple(items: Array<{ key: string; value: any; ttl?: number }>): void {
    items.forEach((item) => {
      this.set(item.key, item.value, item.ttl);
    });
  }

  getMultiple<T>(keys: string[]): Array<{ key: string; value: T | null }> {
    return keys.map((key) => ({
      key,
      value: this.get<T>(key),
    }));
  }

  deleteMultiple(keys: string[]): number {
    let deletedCount = 0;
    keys.forEach((key) => {
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
    const keys = this.keys();
    return {
      size: this.size(),
      keys: keys,
      memoryUsage: `${Math.round(JSON.stringify(keys).length / 1024)} KB`,
    };
  }

  // Métodos avanzados usando los repositorios
  getProductsByCategory(category: string): any[] {
    return this.productRepository.findByCategory(category);
  }

  getProductsByPriceRange(minPrice: number, maxPrice: number): any[] {
    return this.productRepository.findByPriceRange(minPrice, maxPrice);
  }

  getActiveCartsCount(): number {
    return this.cartRepository.findActiveCartsCount();
  }

  getTotalItemsInAllCarts(): number {
    return this.cartRepository.getTotalItemsInAllCarts();
  }

  getActiveSessionsCount(): number {
    return this.sessionRepository.getActiveSessionsCount();
  }

  getUserSessions(userId: string): any[] {
    return this.sessionRepository.findByUserId(userId);
  }
}
