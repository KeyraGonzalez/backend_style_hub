# Patrones de Diseño en CacheService

Este proyecto implementa varios patrones de diseño clásicos para crear un sistema de caché robusto y escalable. A continuación se detallan los patrones utilizados:

## 📋 Patrones Implementados

### 1. 🏭 Factory Method Pattern

**Ubicación**: `cache-factory.ts`

**Propósito**: Crear diferentes tipos de estrategias de caché sin exponer la lógica de creación.

**Implementación**:

- `CacheFactory`: Clase abstracta que define el método de creación
- `BasicCacheFactory`: Factory concreto para estrategias básicas
- `ECommerceCacheFactory`: Factory especializado para e-commerce
- `CacheFactoryProvider`: Singleton factory con método estático

**Uso**:

```typescript
const cacheStrategy = CacheFactoryProvider.createCache({
  type: CacheType.LRU,
  maxSize: 1000,
});
```

### 2. 🎯 Strategy Pattern

**Ubicación**: `cache-strategy.interface.ts`

**Propósito**: Permitir cambiar algoritmos de caché en tiempo de ejecución.

**Estrategias Implementadas**:

- `InMemoryCacheStrategy`: Caché básico en memoria con TTL
- `LRUCacheStrategy`: Caché con algoritmo Least Recently Used
- `NoOpCacheStrategy`: Estrategia nula para testing/desactivación

**Uso**:

```typescript
// Cambiar estrategia dinámicamente
const lruStrategy = new LRUCacheStrategy(500);
cacheService.setStrategy(lruStrategy);
```

### 3. 🗄️ Repository Pattern

**Ubicación**: `cache-repository.ts`

**Propósito**: Abstraer las operaciones de almacenamiento y proporcionar una interfaz específica para cada tipo de dato.

**Repositorios Implementados**:

- `ProductCacheRepository`: Operaciones específicas para productos
- `CartCacheRepository`: Gestión de carritos de compra
- `SessionCacheRepository`: Manejo de sesiones de usuario
- `BaseCacheRepository<T>`: Clase base genérica

**Uso**:

```typescript
// Acceso a través de repositorios específicos
cacheService.products.save('123', product);
cacheService.carts.save('user1', cart);
cacheService.sessions.save('sessionId', user);

// Métodos especializados
const electronics = cacheService.products.findByCategory('electronics');
const activeCarts = cacheService.carts.findActiveCartsCount();
```

### 4. 🔄 Singleton Pattern

**Ubicación**: `cache.service.ts`

**Propósito**: Garantizar una única instancia del servicio de caché en toda la aplicación.

**Implementación**:

- Utiliza el decorador `@Injectable()` de NestJS
- NestJS gestiona automáticamente el ciclo de vida como singleton
- Una sola instancia compartida en todo el contenedor de dependencias

### 5. 🏗️ Template Method Pattern

**Ubicación**: `cache.service.ts` (método `getOrSet`)

**Propósito**: Definir el esqueleto de un algoritmo permitiendo que las subclases redefinan ciertos pasos.

**Implementación**:

```typescript
async getOrSet<T>(
  key: string,
  factory: () => Promise<T>,
  ttl?: number,
): Promise<T> {
  // 1. Intentar obtener del caché
  const cached = this.get<T>(key);
  if (cached !== null) {
    return cached;
  }

  // 2. Ejecutar factory para obtener valor
  const value = await factory();

  // 3. Almacenar en caché
  this.set(key, value, ttl);

  // 4. Retornar valor
  return value;
}
```

## 🏗️ Arquitectura del Sistema

```
CacheService (Singleton)
├── CacheStrategy (Strategy Pattern)
│   ├── InMemoryCacheStrategy
│   ├── LRUCacheStrategy
│   └── NoOpCacheStrategy
├── CacheFactory (Factory Method)
│   ├── BasicCacheFactory
│   └── ECommerceCacheFactory
└── Repositories (Repository Pattern)
    ├── ProductCacheRepository
    ├── CartCacheRepository
    └── SessionCacheRepository
```

## 💡 Ventajas de esta Implementación

### Flexibilidad

- **Strategy**: Cambio de algoritmos de caché en tiempo de ejecución
- **Factory**: Fácil adición de nuevos tipos de caché
- **Repository**: Operaciones específicas por tipo de dato

### Mantenibilidad

- **Separación de responsabilidades**: Cada patrón tiene un propósito específico
- **Código reutilizable**: Repositories y strategies pueden reutilizarse
- **Fácil testing**: Strategy NoOp para pruebas, repositories aislados

### Escalabilidad

- **Singleton**: Gestión eficiente de memoria
- **LRU Strategy**: Manejo automático de memoria limitada
- **Repository**: Consultas optimizadas por tipo de dato

### Extensibilidad

- **Nuevas estrategias**: Implementar `CacheStrategy`
- **Nuevos repositories**: Extender `BaseCacheRepository<T>`
- **Nuevas factories**: Implementar `CacheFactory`

## 🚀 Uso Básico

```typescript
// Inyectar el servicio (Singleton)
constructor(private cacheService: CacheService) {}

// Usar Factory para configurar estrategia
const strategy = CacheFactoryProvider.createCache({
  type: CacheType.LRU,
  maxSize: 1000
});
this.cacheService.setStrategy(strategy);

// Usar Repository para operaciones específicas
this.cacheService.products.save('123', product);
const electronics = this.cacheService.products.findByCategory('electronics');

// Usar Strategy implícitamente
this.cacheService.set('key', 'value'); // Usa la estrategia configurada
```

## 📊 Métricas y Estadísticas

El servicio proporciona métodos para obtener estadísticas:

```typescript
const stats = cacheService.getStats();
console.log(`Elementos: ${stats.size}`);
console.log(`Memoria: ${stats.memoryUsage}`);
console.log(`Carritos activos: ${cacheService.getActiveCartsCount()}`);
```

## 🧪 Testing

La implementación facilita el testing:

```typescript
// Usar NoOpStrategy para tests que no requieren caché
cacheService.setStrategy(new NoOpCacheStrategy());

// Usar InMemoryStrategy con TTL bajo para tests de expiración
const strategy = new InMemoryCacheStrategy();
cacheService.setStrategy(strategy);
```

Este diseño proporciona una base sólida y extensible para el sistema de caché, siguiendo las mejores prácticas de ingeniería de software y patrones de diseño.
