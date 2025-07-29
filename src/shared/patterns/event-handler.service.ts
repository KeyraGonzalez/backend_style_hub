import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';

export interface OrderCreatedEvent {
  orderId: string;
  userId: string;
  orderData: any;
  deviceToken?: string;
}

export interface OrderShippedEvent {
  orderId: string;
  userId: string;
  orderData: any;
  trackingNumber?: string;
  deviceToken?: string;
}

export interface OrderDeliveredEvent {
  orderId: string;
  userId: string;
  orderData: any;
  deviceToken?: string;
}

export interface PaymentProcessedEvent {
  paymentId: string;
  orderId: string;
  userId: string;
  success: boolean;
  amount?: number;
  currency?: string;
  error?: string;
  paymentData?: any;
}

export interface UserRegisteredEvent {
  userId: string;
  userData: any;
}

export interface ProductStockUpdatedEvent {
  productId: string;
  previousStock: number;
  currentStock: number;
  productData: any;
}

export interface ProductBackInStockEvent {
  productId: string;
  productData: any;
}

@Injectable()
export class EventHandlerService {
  private readonly logger = new Logger(EventHandlerService.name);

  constructor(private eventEmitter: EventEmitter2) {}

  // Event emitters
  emitOrderCreated(event: OrderCreatedEvent): void {
    try {
      this.eventEmitter.emit('order.created', event);
      this.logger.log(`Evento orden creada emitido: ${event.orderId}`);
    } catch (error) {
      this.logger.error('Error emitiendo evento orden creada:', error);
    }
  }

  emitOrderShipped(event: OrderShippedEvent): void {
    try {
      this.eventEmitter.emit('order.shipped', event);
      this.logger.log(`Evento orden enviada emitido: ${event.orderId}`);
    } catch (error) {
      this.logger.error('Error emitiendo evento orden enviada:', error);
    }
  }

  emitOrderDelivered(event: OrderDeliveredEvent): void {
    try {
      this.eventEmitter.emit('order.delivered', event);
      this.logger.log(`Evento orden entregada emitido: ${event.orderId}`);
    } catch (error) {
      this.logger.error('Error emitiendo evento orden entregada:', error);
    }
  }

  emitPaymentProcessed(event: PaymentProcessedEvent): void {
    try {
      this.eventEmitter.emit('payment.processed', event);
      this.logger.log(
        `Evento pago procesado emitido: ${event.paymentId} - ${event.success ? 'Exitoso' : 'Fallido'}`
      );
    } catch (error) {
      this.logger.error('Error emitiendo evento pago procesado:', error);
    }
  }

  emitUserRegistered(event: UserRegisteredEvent): void {
    try {
      this.eventEmitter.emit('user.registered', event);
      this.logger.log(`Evento usuario registrado emitido: ${event.userId}`);
    } catch (error) {
      this.logger.error('Error emitiendo evento usuario registrado:', error);
    }
  }

  emitProductStockUpdated(event: ProductStockUpdatedEvent): void {
    try {
      this.eventEmitter.emit('product.stock.updated', event);
      this.logger.log(
        `Evento stock actualizado emitido: ${event.productId} - Stock: ${event.currentStock}`
      );
    } catch (error) {
      this.logger.error('Error emitiendo evento stock actualizado:', error);
    }
  }

  emitProductBackInStock(event: ProductBackInStockEvent): void {
    try {
      this.eventEmitter.emit('product.back.in.stock', event);
      this.logger.log(`Evento producto disponible emitido: ${event.productId}`);
    } catch (error) {
      this.logger.error('Error emitiendo evento producto disponible:', error);
    }
  }

  // Event listeners
  @OnEvent('order.created')
  async handleOrderCreated(event: OrderCreatedEvent): Promise<void> {
    this.logger.log(`Evento orden creada recibido: ${event.orderId}`);
    // Este evento será manejado por NotificationsService
  }

  @OnEvent('order.shipped')
  async handleOrderShipped(event: OrderShippedEvent): Promise<void> {
    this.logger.log(`Evento orden enviada recibido: ${event.orderId}`);
    // Este evento será manejado por NotificationsService
  }

  @OnEvent('order.delivered')
  async handleOrderDelivered(event: OrderDeliveredEvent): Promise<void> {
    this.logger.log(`Evento orden entregada recibido: ${event.orderId}`);
    // Este evento será manejado por NotificationsService
  }

  @OnEvent('payment.processed')
  async handlePaymentProcessed(event: PaymentProcessedEvent): Promise<void> {
    this.logger.log(
      `Evento pago procesado recibido: ${event.paymentId}, Exitoso: ${event.success}`
    );
    // Este evento será manejado por NotificationsService
  }

  @OnEvent('user.registered')
  async handleUserRegistered(event: UserRegisteredEvent): Promise<void> {
    this.logger.log(`Evento usuario registrado recibido: ${event.userId}`);
    // Este evento será manejado por NotificationsService
  }

  @OnEvent('product.stock.updated')
  async handleProductStockUpdated(
    event: ProductStockUpdatedEvent
  ): Promise<void> {
    this.logger.log(
      `Stock de producto actualizado: ${event.productId}, Stock: ${event.currentStock}`
    );

    // Si el producto estaba agotado y ahora tiene stock, notificar a usuarios interesados
    if (event.previousStock === 0 && event.currentStock > 0) {
      this.emitProductBackInStock({
        productId: event.productId,
        productData: event.productData,
      });
    }
  }

  @OnEvent('product.back.in.stock')
  async handleProductBackInStock(
    event: ProductBackInStockEvent
  ): Promise<void> {
    this.logger.log(`Producto disponible nuevamente: ${event.productId}`);
    // Este evento será manejado por NotificationsService para notificar a usuarios en espera
  }
}
