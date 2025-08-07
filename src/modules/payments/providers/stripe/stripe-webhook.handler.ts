import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Payment, PaymentStatus } from '../../entities/payment.entity';
import {
  Order,
  PaymentStatus as OrderPaymentStatus,
} from '@core/domain/entities/order.entity';
import { NotificationsService } from '../../../notifications/notifications.service';
import { EventHandlerService } from '@shared/patterns/event-handler.service';

@Injectable()
export class StripeWebhookHandler {
  private readonly logger = new Logger(StripeWebhookHandler.name);

  constructor(
    @InjectModel(Payment.name) private paymentModel: Model<Payment>,
    @InjectModel(Order.name) private orderModel: Model<Order>,
    private notificationsService: NotificationsService,
    private eventHandlerService: EventHandlerService
  ) {}

  /**
   * Maneja todos los eventos de webhook de Stripe
   */
  async handleWebhookEvent(event: any): Promise<any> {
    const { type, data } = event;

    this.logger.log(`Procesando webhook Stripe: ${type}`);

    try {
      switch (type) {
        case 'payment_intent.succeeded':
          return await this.handlePaymentIntentSucceeded(data.object);

        case 'payment_intent.payment_failed':
          return await this.handlePaymentIntentFailed(data.object);

        case 'payment_intent.requires_action':
          return await this.handlePaymentIntentRequiresAction(data.object);

        case 'payment_intent.canceled':
          return await this.handlePaymentIntentCanceled(data.object);

        case 'charge.succeeded':
          return await this.handleChargeSucceeded(data.object);

        case 'charge.failed':
          return await this.handleChargeFailed(data.object);

        case 'charge.dispute.created':
          return await this.handleChargeDisputeCreated(data.object);

        case 'charge.dispute.updated':
          return await this.handleChargeDisputeUpdated(data.object);

        case 'refund.created':
          return await this.handleRefundCreated(data.object);

        case 'refund.updated':
          return await this.handleRefundUpdated(data.object);

        case 'invoice.payment_succeeded':
          return await this.handleInvoicePaymentSucceeded(data.object);

        case 'invoice.payment_failed':
          return await this.handleInvoicePaymentFailed(data.object);

        default:
          this.logger.log(`Evento Stripe no manejado: ${type}`);
          return { status: 'ignored', event_type: type };
      }
    } catch (error) {
      this.logger.error(`Error manejando webhook Stripe ${type}:`, error);
      throw error;
    }
  }

  /**
   * Maneja cuando un Payment Intent es exitoso
   */
  private async handlePaymentIntentSucceeded(paymentIntent: any): Promise<any> {
    const { id, amount } = paymentIntent;

    try {
      const payment = await this.paymentModel.findOne({ transactionId: id });

      if (!payment) {
        this.logger.warn(`Pago no encontrado para Payment Intent: ${id}`);
        return { status: 'payment_not_found', payment_intent_id: id };
      }

      if (payment.status !== PaymentStatus.COMPLETED) {
        payment.status = PaymentStatus.COMPLETED;
        payment.processedAt = new Date();
        payment.gatewayResponse = {
          ...payment.gatewayResponse,
          payment_intent_succeeded: paymentIntent,
        };
        await payment.save();

        // Actualizar estado de la orden
        await this.orderModel.findByIdAndUpdate(payment.orderId, {
          paymentStatus: OrderPaymentStatus.PAID,
          updatedAt: new Date(),
        });

        // Enviar notificación de pago exitoso
        await this.sendPaymentSuccessNotification(payment);

        // Emitir evento de pago completado
        this.eventHandlerService.emitPaymentProcessed({
          paymentId: payment.paymentId,
          orderId: payment.orderId.toString(),
          userId: payment.userId.toString(),
          success: true,
          amount: amount / 100, // Convertir de centavos
          currency: paymentIntent.currency?.toUpperCase() || 'USD',
        });

        this.logger.log(
          `Pago Stripe completado exitosamente: ${payment.paymentId}`
        );
      }

      return {
        status: 'processed',
        payment_id: payment.paymentId,
        payment_intent_id: id,
      };
    } catch (error) {
      this.logger.error('Error procesando Payment Intent exitoso:', error);
      throw error;
    }
  }

  /**
   * Maneja cuando un Payment Intent falla
   */
  private async handlePaymentIntentFailed(paymentIntent: any): Promise<any> {
    const { id, last_payment_error } = paymentIntent;

    try {
      const payment = await this.paymentModel.findOne({ transactionId: id });

      if (!payment) {
        this.logger.warn(
          `Pago no encontrado para Payment Intent fallido: ${id}`
        );
        return { status: 'payment_not_found', payment_intent_id: id };
      }

      if (payment.status !== PaymentStatus.FAILED) {
        payment.status = PaymentStatus.FAILED;
        payment.failureReason =
          last_payment_error?.message || 'Pago fallido en Stripe';
        payment.gatewayResponse = {
          ...payment.gatewayResponse,
          payment_intent_failed: paymentIntent,
        };
        await payment.save();

        // Enviar notificación de pago fallido
        await this.sendPaymentFailedNotification(payment);

        // Emitir evento de pago fallido
        this.eventHandlerService.emitPaymentProcessed({
          paymentId: payment.paymentId,
          orderId: payment.orderId.toString(),
          userId: payment.userId.toString(),
          success: false,
          error: payment.failureReason,
        });

        this.logger.log(
          `Pago Stripe fallido: ${payment.paymentId} - ${payment.failureReason}`
        );
      }

      return {
        status: 'processed',
        payment_id: payment.paymentId,
        payment_intent_id: id,
      };
    } catch (error) {
      this.logger.error('Error procesando Payment Intent fallido:', error);
      throw error;
    }
  }

  /**
   * Maneja cuando un Payment Intent requiere acción adicional
   */
  private async handlePaymentIntentRequiresAction(
    paymentIntent: any
  ): Promise<any> {
    const { id, next_action } = paymentIntent;

    try {
      const payment = await this.paymentModel.findOne({ transactionId: id });

      if (payment && payment.status === PaymentStatus.PROCESSING) {
        payment.status = PaymentStatus.PENDING;
        payment.failureReason = 'Requiere autenticación adicional (3D Secure)';
        payment.gatewayResponse = {
          ...payment.gatewayResponse,
          requires_action: paymentIntent,
        };
        await payment.save();

        this.logger.log(
          `Pago Stripe requiere acción: ${payment.paymentId} - ${next_action?.type}`
        );
      }

      return {
        status: 'processed',
        payment_id: payment?.paymentId,
        payment_intent_id: id,
      };
    } catch (error) {
      this.logger.error(
        'Error procesando Payment Intent que requiere acción:',
        error
      );
      throw error;
    }
  }

  /**
   * Maneja cuando un Payment Intent es cancelado
   */
  private async handlePaymentIntentCanceled(paymentIntent: any): Promise<any> {
    const { id, cancellation_reason } = paymentIntent;

    try {
      const payment = await this.paymentModel.findOne({ transactionId: id });

      if (payment && payment.status !== PaymentStatus.CANCELLED) {
        payment.status = PaymentStatus.CANCELLED;
        payment.failureReason =
          cancellation_reason || 'Payment Intent cancelado';
        payment.gatewayResponse = {
          ...payment.gatewayResponse,
          payment_intent_canceled: paymentIntent,
        };
        await payment.save();

        this.logger.log(
          `Payment Intent Stripe cancelado: ${payment.paymentId}`
        );
      }

      return {
        status: 'processed',
        payment_id: payment?.paymentId,
        payment_intent_id: id,
      };
    } catch (error) {
      this.logger.error('Error procesando Payment Intent cancelado:', error);
      throw error;
    }
  }

  /**
   * Maneja cuando un cargo es exitoso
   */
  private async handleChargeSucceeded(charge: any): Promise<any> {
    const { id, payment_intent, amount } = charge;

    try {
      const payment = await this.paymentModel.findOne({
        transactionId: payment_intent,
      });

      if (payment) {
        // Actualizar información del cargo
        payment.gatewayResponse = {
          ...payment.gatewayResponse,
          charge_succeeded: charge,
        };
        await payment.save();

        this.logger.log(
          `Cargo Stripe exitoso: ${id} para pago ${payment.paymentId}`
        );
      }

      return {
        status: 'processed',
        charge_id: id,
        payment_intent_id: payment_intent,
      };
    } catch (error) {
      this.logger.error('Error procesando cargo exitoso:', error);
      throw error;
    }
  }

  /**
   * Maneja cuando un cargo falla
   */
  private async handleChargeFailed(charge: any): Promise<any> {
    const { id, payment_intent, failure_message } = charge;

    try {
      const payment = await this.paymentModel.findOne({
        transactionId: payment_intent,
      });

      if (payment) {
        payment.gatewayResponse = {
          ...payment.gatewayResponse,
          charge_failed: charge,
        };
        if (failure_message && !payment.failureReason) {
          payment.failureReason = failure_message;
        }
        await payment.save();

        this.logger.log(`Cargo Stripe fallido: ${id} - ${failure_message}`);
      }

      return {
        status: 'processed',
        charge_id: id,
        payment_intent_id: payment_intent,
      };
    } catch (error) {
      this.logger.error('Error procesando cargo fallido:', error);
      throw error;
    }
  }

  /**
   * Maneja cuando se crea una disputa
   */
  private async handleChargeDisputeCreated(dispute: any): Promise<any> {
    const { id, charge, reason, amount } = dispute;

    try {
      // Buscar el pago por el ID del cargo
      const payment = await this.paymentModel.findOne({
        'gatewayResponse.charges.data.id': charge,
      });

      if (payment) {
        payment.status = PaymentStatus.FAILED;
        payment.failureReason = `Disputa creada: ${reason}`;
        payment.gatewayResponse = {
          ...payment.gatewayResponse,
          dispute_created: dispute,
        };
        await payment.save();

        // Actualizar estado de la orden
        await this.orderModel.findByIdAndUpdate(payment.orderId, {
          paymentStatus: OrderPaymentStatus.FAILED,
          updatedAt: new Date(),
        });

        this.logger.log(
          `Disputa Stripe creada: ${id} para pago ${payment.paymentId} - ${reason}`
        );
      }

      return { status: 'processed', dispute_id: id, charge_id: charge };
    } catch (error) {
      this.logger.error('Error procesando disputa creada:', error);
      throw error;
    }
  }

  /**
   * Maneja cuando se actualiza una disputa
   */
  private async handleChargeDisputeUpdated(dispute: any): Promise<any> {
    const { id, charge, status, reason } = dispute;

    try {
      const payment = await this.paymentModel.findOne({
        'gatewayResponse.charges.data.id': charge,
      });

      if (payment) {
        payment.gatewayResponse = {
          ...payment.gatewayResponse,
          dispute_updated: dispute,
        };

        // Si la disputa se resuelve a favor del comerciante
        if (status === 'won') {
          payment.status = PaymentStatus.COMPLETED;
          payment.failureReason = null;

          await this.orderModel.findByIdAndUpdate(payment.orderId, {
            paymentStatus: OrderPaymentStatus.PAID,
            updatedAt: new Date(),
          });
        }

        await payment.save();

        this.logger.log(`Disputa Stripe actualizada: ${id} - ${status}`);
      }

      return { status: 'processed', dispute_id: id, charge_id: charge };
    } catch (error) {
      this.logger.error('Error procesando actualización de disputa:', error);
      throw error;
    }
  }

  /**
   * Maneja cuando se crea un reembolso
   */
  private async handleRefundCreated(refund: any): Promise<any> {
    const { id, payment_intent, amount, status, reason } = refund;

    try {
      const payment = await this.paymentModel.findOne({
        transactionId: payment_intent,
      });

      if (!payment) {
        this.logger.warn(`Pago no encontrado para reembolso: ${id}`);
        return { status: 'payment_not_found', refund_id: id };
      }

      if (payment.status !== PaymentStatus.REFUNDED) {
        payment.status = PaymentStatus.REFUNDED;
        payment.refundId = id;
        payment.refundAmount = amount / 100; // Convertir de centavos
        payment.gatewayResponse = {
          ...payment.gatewayResponse,
          refund_created: refund,
        };
        await payment.save();

        // Actualizar estado de la orden
        await this.orderModel.findByIdAndUpdate(payment.orderId, {
          paymentStatus: OrderPaymentStatus.REFUNDED,
          updatedAt: new Date(),
        });

        // Enviar notificación de reembolso
        await this.sendRefundNotification(payment);

        this.logger.log(
          `Reembolso Stripe creado: ${id} para pago ${payment.paymentId} - ${status}`
        );
      }

      return {
        status: 'processed',
        payment_id: payment.paymentId,
        refund_id: id,
      };
    } catch (error) {
      this.logger.error('Error procesando reembolso creado:', error);
      throw error;
    }
  }

  /**
   * Maneja cuando se actualiza un reembolso
   */
  private async handleRefundUpdated(refund: any): Promise<any> {
    const { id, payment_intent, status } = refund;

    try {
      const payment = await this.paymentModel.findOne({
        transactionId: payment_intent,
        refundId: id,
      });

      if (payment) {
        payment.gatewayResponse = {
          ...payment.gatewayResponse,
          refund_updated: refund,
        };

        // Si el reembolso falla, revertir el estado
        if (status === 'failed') {
          payment.status = PaymentStatus.COMPLETED;
          payment.refundId = null;
          payment.refundAmount = null;

          await this.orderModel.findByIdAndUpdate(payment.orderId, {
            paymentStatus: OrderPaymentStatus.PAID,
            updatedAt: new Date(),
          });
        }

        await payment.save();

        this.logger.log(`Reembolso Stripe actualizado: ${id} - ${status}`);
      }

      return { status: 'processed', refund_id: id };
    } catch (error) {
      this.logger.error('Error procesando actualización de reembolso:', error);
      throw error;
    }
  }

  /**
   * Maneja pagos de factura exitosos (para suscripciones)
   */
  private async handleInvoicePaymentSucceeded(invoice: any): Promise<any> {
    const { id, subscription, customer } = invoice;

    this.logger.log(`Pago de factura Stripe exitoso: ${id}`);

    // Aquí podrías manejar lógica específica para suscripciones
    // Por ahora solo lo registramos
    return { status: 'logged', invoice_id: id };
  }

  /**
   * Maneja pagos de factura fallidos
   */
  private async handleInvoicePaymentFailed(invoice: any): Promise<any> {
    const { id, subscription, customer, attempt_count } = invoice;

    this.logger.log(
      `Pago de factura Stripe fallido: ${id} - Intento ${attempt_count}`
    );

    // Aquí podrías manejar lógica específica para suscripciones fallidas
    return { status: 'logged', invoice_id: id };
  }

  /**
   * Envía notificación de pago exitoso
   */
  private async sendPaymentSuccessNotification(
    payment: Payment
  ): Promise<void> {
    try {
      const order = await this.orderModel
        .findById(payment.orderId)
        .populate('userId');

      if (order && order.userId) {
        await this.notificationsService.sendPaymentSuccess(
          payment.userId.toString(),
          {
            paymentId: payment.paymentId,
            orderId: payment.orderId,
            amount: payment.amount,
            orderNumber: (order as any).orderNumber,
            customerName: `${(order.userId as any).firstName} ${(order.userId as any).lastName}`,
            customerEmail: (order.userId as any).email,
          }
        );
      }
    } catch (error) {
      this.logger.error('Error enviando notificación de pago exitoso:', error);
    }
  }

  /**
   * Envía notificación de pago fallido
   */
  private async sendPaymentFailedNotification(payment: Payment): Promise<void> {
    try {
      const order = await this.orderModel
        .findById(payment.orderId)
        .populate('userId');

      if (order && order.userId) {
        await this.notificationsService.sendPaymentFailed(
          payment.userId.toString(),
          {
            paymentId: payment.paymentId,
            orderId: payment.orderId,
            amount: payment.amount,
            orderNumber: (order as any).orderNumber,
            customerName: `${(order.userId as any).firstName} ${(order.userId as any).lastName}`,
            customerEmail: (order.userId as any).email,
            reason: payment.failureReason,
          }
        );
      }
    } catch (error) {
      this.logger.error('Error enviando notificación de pago fallido:', error);
    }
  }

  /**
   * Envía notificación de reembolso
   */
  private async sendRefundNotification(payment: Payment): Promise<void> {
    try {
      const order = await this.orderModel
        .findById(payment.orderId)
        .populate('userId');

      if (order && order.userId) {
        // Aquí podrías implementar una notificación específica para reembolsos
        this.logger.log(
          `Reembolso procesado para usuario ${payment.userId}: ${payment.refundAmount}`
        );
      }
    } catch (error) {
      this.logger.error('Error enviando notificación de reembolso:', error);
    }
  }
}
