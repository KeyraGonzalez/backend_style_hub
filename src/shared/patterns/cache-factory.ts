// Factory Method Pattern - Para crear diferentes tipos de caché

import {
  CacheStrategy,
  InMemoryCacheStrategy,
  LRUCacheStrategy,
  NoOpCacheStrategy,
} from './cache-strategy.interface';

export enum CacheType {
  IN_MEMORY = 'in-memory',
  LRU = 'lru',
  NO_OP = 'no-op',
}

export interface CacheConfig {
  type: CacheType;
  maxSize?: number;
  defaultTTL?: number;
}

// Abstract Factory
export abstract class CacheFactory {
  abstract createCache(config: CacheConfig): CacheStrategy;
}

// Concrete Factory para caché básico
export class BasicCacheFactory extends CacheFactory {
  createCache(config: CacheConfig): CacheStrategy {
    switch (config.type) {
      case CacheType.IN_MEMORY:
        return new InMemoryCacheStrategy();

      case CacheType.LRU:
        return new LRUCacheStrategy(config.maxSize || 1000);

      case CacheType.NO_OP:
        return new NoOpCacheStrategy();

      default:
        throw new Error(`Unknown cache type: ${config.type}`);
    }
  }
}

// Factory específico para e-commerce
export class ECommerceCacheFactory extends CacheFactory {
  createCache(config: CacheConfig): CacheStrategy {
    const baseFactory = new BasicCacheFactory();
    const strategy = baseFactory.createCache(config);

    // Aquí podríamos agregar configuraciones específicas para e-commerce
    // como TTL específicos para productos, carritos, etc.

    return strategy;
  }
}

// Factory Method estático para facilidad de uso
export class CacheFactoryProvider {
  private static instance: CacheFactory;

  static getInstance(): CacheFactory {
    if (!this.instance) {
      this.instance = new ECommerceCacheFactory();
    }
    return this.instance;
  }

  static setFactory(factory: CacheFactory): void {
    this.instance = factory;
  }

  static createCache(config: CacheConfig): CacheStrategy {
    return this.getInstance().createCache(config);
  }
}
