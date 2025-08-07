// Ejemplo de uso de los patrones implementados en el CacheService

import { CacheService } from './cache.service';
import {
  CacheType,
  CacheFactoryProvider,
  BasicCacheFactory,
} from './cache-factory';
import {
  LRUCacheStrategy,
  NoOpCacheStrategy,
} from './cache-strategy.interface';

// Ejemplo de uso del servicio con todos los patrones

export class CacheUsageExample {
  private cacheService: CacheService;

  constructor() {
    this.cacheService = new CacheService();
  }

  // Ejemplo de Factory Method Pattern
  demonstrateFactoryMethod() {
    console.log('=== Factory Method Pattern ===');

    // Cambiar a estrategia LRU
    const lruStrategy = CacheFactoryProvider.createCache({
      type: CacheType.LRU,
      maxSize: 500,
    });
    this.cacheService.setStrategy(lruStrategy);
    console.log('Estrategia cambiada a LRU con límite de 500 elementos');

    // Cambiar a estrategia No-Op (útil para testing)
    const noOpStrategy = CacheFactoryProvider.createCache({
      type: CacheType.NO_OP,
    });
    this.cacheService.setStrategy(noOpStrategy);
    console.log('Estrategia cambiada a No-Op (no almacena nada)');

    // Volver a estrategia en memoria
    const memoryStrategy = CacheFactoryProvider.createCache({
      type: CacheType.IN_MEMORY,
    });
    this.cacheService.setStrategy(memoryStrategy);
    console.log('Estrategia cambiada a In-Memory');
  }

  // Ejemplo de Strategy Pattern
  demonstrateStrategyPattern() {
    console.log('=== Strategy Pattern ===');

    // Usando estrategia LRU directamente
    const lruStrategy = new LRUCacheStrategy(100);
    this.cacheService.setStrategy(lruStrategy);

    // Agregar muchos elementos para ver el comportamiento LRU
    for (let i = 0; i < 150; i++) {
      this.cacheService.set(`item${i}`, { data: `valor ${i}` });
    }

    console.log(
      `Elementos en caché después de agregar 150: ${this.cacheService.size()}`
    );
    console.log('El LRU mantuvo solo 100 elementos (los más recientes)');

    // Acceder a algunos elementos para actualizar su "último uso"
    this.cacheService.get('item10');
    this.cacheService.get('item20');

    // Agregar más elementos
    for (let i = 150; i < 160; i++) {
      this.cacheService.set(`item${i}`, { data: `valor ${i}` });
    }

    console.log(`Item10 existe: ${this.cacheService.has('item10')}`);
    console.log(`Item20 existe: ${this.cacheService.has('item20')}`);
    console.log('Los elementos accedidos recientemente se mantuvieron');
  }

  // Ejemplo de Repository Pattern
  demonstrateRepositoryPattern() {
    console.log('=== Repository Pattern ===');

    // Usando el repositorio de productos
    const product1 = {
      id: '1',
      name: 'Laptop',
      price: 1000,
      category: 'electronics',
    };
    const product2 = {
      id: '2',
      name: 'Mouse',
      price: 25,
      category: 'electronics',
    };
    const product3 = { id: '3', name: 'Book', price: 15, category: 'books' };

    this.cacheService.products.save('1', product1);
    this.cacheService.products.save('2', product2);
    this.cacheService.products.save('3', product3);

    console.log('Productos guardados en caché');
    console.log(`Total productos: ${this.cacheService.products.count()}`);

    // Buscar por categoría
    const electronics =
      this.cacheService.products.findByCategory('electronics');
    console.log(`Productos electrónicos: ${electronics.length}`);

    // Buscar por rango de precio
    const cheapItems = this.cacheService.products.findByPriceRange(0, 30);
    console.log(`Productos baratos (≤$30): ${cheapItems.length}`);

    // Usando el repositorio de carritos
    const cart1 = { userId: 'user1', items: [product1, product2], total: 1025 };
    const cart2 = { userId: 'user2', items: [product3], total: 15 };

    this.cacheService.carts.save('user1', cart1);
    this.cacheService.carts.save('user2', cart2);

    console.log(
      `Carritos activos: ${this.cacheService.carts.findActiveCartsCount()}`
    );
    console.log(
      `Total items en todos los carritos: ${this.cacheService.carts.getTotalItemsInAllCarts()}`
    );

    // Usando el repositorio de sesiones
    const user1 = { id: 'user1', name: 'Juan', role: 'customer' };
    const user2 = { id: 'user2', name: 'Ana', role: 'admin' };

    this.cacheService.sessions.save('session1', user1);
    this.cacheService.sessions.save('session2', user2);

    console.log(
      `Sesiones activas: ${this.cacheService.sessions.getActiveSessionsCount()}`
    );

    const userSessions = this.cacheService.sessions.findByUserId('user1');
    console.log(`Sesiones de user1: ${userSessions.length}`);
  }

  // Ejemplo de Singleton Pattern (implícito con @Injectable)
  demonstrateSingletonPattern() {
    console.log('=== Singleton Pattern ===');
    console.log(
      'El CacheService usa el patrón Singleton implícitamente a través de @Injectable de NestJS'
    );
    console.log('Una sola instancia es compartida en toda la aplicación');

    // Los datos se mantienen entre diferentes usos del servicio
    this.cacheService.set('singleton-test', 'Este valor persiste');

    // Simular otro punto de la aplicación usando el mismo servicio
    const sameValue = this.cacheService.get('singleton-test');
    console.log(`Valor recuperado: ${sameValue}`);
  }

  // Ejemplo completo combinando todos los patrones
  demonstrateCompleteExample() {
    console.log('=== Ejemplo Completo ===');

    // 1. Factory Method: Configurar estrategia óptima
    const strategy = CacheFactoryProvider.createCache({
      type: CacheType.LRU,
      maxSize: 1000,
    });
    this.cacheService.setStrategy(strategy);
    console.log('✓ Estrategia LRU configurada');

    // 2. Repository: Almacenar datos estructurados
    const products = [
      { id: '1', name: 'iPhone', price: 999, category: 'electronics' },
      { id: '2', name: 'MacBook', price: 1299, category: 'electronics' },
      { id: '3', name: 'Novel', price: 12, category: 'books' },
    ];

    products.forEach((product) => {
      this.cacheService.products.save(product.id, product);
    });
    console.log('✓ Productos almacenados usando Repository');

    // 3. Strategy: El comportamiento LRU gestiona automáticamente la memoria
    // 4. Singleton: Una sola instancia gestiona todo el caché

    // Usar métodos avanzados
    const expensiveProducts = this.cacheService.getProductsByPriceRange(
      500,
      2000
    );
    console.log(`✓ Productos caros encontrados: ${expensiveProducts.length}`);

    // Estadísticas generales
    const stats = this.cacheService.getStats();
    console.log(
      `✓ Estadísticas: ${stats.size} elementos, ${stats.memoryUsage}`
    );

    console.log('🎉 Todos los patrones funcionando juntos correctamente!');
  }

  // Método principal para ejecutar todos los ejemplos
  runAllExamples() {
    this.demonstrateFactoryMethod();
    console.log('');

    this.demonstrateStrategyPattern();
    console.log('');

    this.demonstrateRepositoryPattern();
    console.log('');

    this.demonstrateSingletonPattern();
    console.log('');

    this.demonstrateCompleteExample();
  }
}

// Para usar en testing o desarrollo:
// const example = new CacheUsageExample();
// example.runAllExamples();
