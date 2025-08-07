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
export class PayPalWebhookHandler {
  private readonly logger = new Logger(PayPalWebhookHandler.name);

  constructor(
    @InjectModel(Payment.name) private paymentModel: Model<Payment>,
    @InjectModel(Order.name) private orderModel: Model<Order>,
    private notificationsService: NotificationsService,
    private eventHandlerService: EventHandlerService
  ) {}

  /**
   * Maneja todos los eventos de webhook de PayPal
   */
  async handleWebhookEvent(payload: any): Promise<any> {
    const { event_type, resource } = payload;

    this.logger.log(`Procesando webhook PayPal: ${event_type}`);

    try {
      switch (event_type) {
        case 'CHECKOUT.ORDER.APPROVED':
          return await this.handleOrderApproved(resource);

        case 'PAYMENT.CAPTURE.COMPLETED':
          return await this.handlePaymentCaptureCompleted(resource);

        case 'PAYMENT.CAPTURE.DENIED':
          return await this.handlePaymentCaptureDenied(resource);

        case 'PAYMENT.CAPTURE.PENDING':
          return await this.handlePaymentCapturePending(resource);

        case 'PAYMENT.CAPTURE.REFUNDED':
          return await this.handlePaymentCaptureRefunded(resource);

        case 'PAYMENT.CAPTURE.REVERSED':
          return await this.handlePaymentCaptureReversed(resource);

        case 'CHECKOUT.ORDER.COMPLETED':
          return await this.handleOrderCompleted(resource);

        case 'CHECKOUT.ORDER.VOIDED':
          return await this.handleOrderVoided(resource);

        default:
          this.logger.log(`Evento PayPal no manejado: ${event_type}`);
          return { status: 'ignored', event_type };
      }
    } catch (error) {
      this.logger.error(`Error manejando webhook PayPal ${event_type}:`, error);
      throw error;
    }
  }

  /**
   * Maneja cuando una orden es aprobada por el usuario
   */
  private async handleOrderApproved(resource: any): Promise<any> {
    const { id: orderId } = resource;

    this.logger.log(`Orden PayPal aprobada: ${orderId}`);

    // Buscar el pago por transaction ID
    const payment = await this.paymentModel.findOne({ transactionId: orderId });

    if (payment && payment.status === PaymentStatus.PROCESSING) {
      payment.status = PaymentStatus.PENDING;
      payment.gatewayResponse = {
        ...payment.gatewayResponse,
        approved_event: resource,
      };
      await payment.save();

      this.logger.log(`Pago actualizado a PENDING: ${payment.paymentId}`);
    }

    return { status: 'processed', order_id: orderId };
  }

  /**
   * Maneja cuando un pago es capturado exitosamente
   */
  private async handlePaymentCaptureCompleted(resource: any): Promise<any> {
    const { id: captureId, amount, custom_id } = resource;

    try {
      // Buscar el pago por transaction ID o custom ID
      const payment = await this.paymentModel.findOne({
        $or: [
          { transactionId: resource.supplementary_data?.related_ids?.order_id },
          { paymentId: custom_id },
          { 'gatewayResponse.id': captureId },
        ],
      });

      if (!payment) {
        this.logger.warn(`Pago no encontrado para captura: ${captureId}`);
        return { status: 'payment_not_found', capture_id: captureId };
      }

      if (payment.status !== PaymentStatus.COMPLETED) {
        payment.status = PaymentStatus.COMPLETED;
        payment.processedAt = new Date();
        payment.gatewayResponse = {
          ...payment.gatewayResponse,
          capture_completed: resource,
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
          amount: parseFloat(amount?.value || '0'),
          currency: amount?.currency_code || 'USD',
        });

        this.logger.log(
          `Pago PayPal completado exitosamente: ${payment.paymentId}`
        );
      }

      return {
        status: 'processed',
        payment_id: payment.paymentId,
        capture_id: captureId,
      };
    } catch (error) {
      this.logger.error('Error procesando captura completada:', error);
      throw error;
    }
  }

  /**
   * Maneja cuando un pago es denegado
   */
  private async handlePaymentCaptureDenied(resource: any): Promise<any> {
    const { id: captureId, status_details } = resource;

    try {
      const payment = await this.paymentModel.findOne({
        $or: [
          { transactionId: resource.supplementary_data?.related_ids?.order_id },
          { 'gatewayResponse.id': captureId },
        ],
      });

      if (!payment) {
        this.logger.warn(
          `Pago no encontrado para captura denegada: ${captureId}`
        );
        return { status: 'payment_not_found', capture_id: captureId };
      }

      if (payment.status !== PaymentStatus.FAILED) {
        payment.status = PaymentStatus.FAILED;
        payment.failureReason =
          status_details?.reason || 'Pago denegado por PayPal';
        payment.gatewayResponse = {
          ...payment.gatewayResponse,
          capture_denied: resource,
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

        this.logger.log(`Pago PayPal denegado: ${payment.paymentId}`);
      }

      return {
        status: 'processed',
        payment_id: payment.paymentId,
        capture_id: captureId,
      };
    } catch (error) {
      this.logger.error('Error procesando captura denegada:', error);
      throw error;
    }
  }

  /**
   * Maneja cuando un pago está pendiente
   */
  private async handlePaymentCapturePending(resource: any): Promise<any> {
    const { id: captureId, status_details } = resource;

    try {
      const payment = await this.paymentModel.findOne({
        $or: [
          { transactionId: resource.supplementary_data?.related_ids?.order_id },
          { 'gatewayResponse.id': captureId },
        ],
      });

      if (payment && payment.status === PaymentStatus.PROCESSING) {
        payment.status = PaymentStatus.PENDING;
        payment.failureReason =
          status_details?.reason || 'Pago pendiente de revisión';
        payment.gatewayResponse = {
          ...payment.gatewayResponse,
          capture_pending: resource,
        };
        await payment.save();

        this.logger.log(
          `Pago PayPal pendiente: ${payment.paymentId} - ${status_details?.reason}`
        );
      }

      return {
        status: 'processed',
        payment_id: payment?.paymentId,
        capture_id: captureId,
      };
    } catch (error) {
      this.logger.error('Error procesando captura pendiente:', error);
      throw error;
    }
  }

  /**
   * Maneja cuando un pago es reembolsado
   */
  private async handlePaymentCaptureRefunded(resource: any): Promise<any> {
    const { id: refundId, amount, status } = resource;

    try {
      // El resource contiene información del reembolso, necesitamos encontrar el pago original
      const payment = await this.paymentModel.findOne({
        'gatewayResponse.purchase_units.payments.captures.id': resource.links
          ?.find((link) => link.rel === 'up')
          ?.href?.split('/')
          .pop(),
      });

      if (!payment) {
        this.logger.warn(`Pago no encontrado para reembolso: ${refundId}`);
        return { status: 'payment_not_found', refund_id: refundId };
      }

      if (payment.status !== PaymentStatus.REFUNDED) {
        payment.status = PaymentStatus.REFUNDED;
        payment.refundId = refundId;
        payment.refundAmount = parseFloat(amount.value);
        payment.gatewayResponse = {
          ...payment.gatewayResponse,
          refund: resource,
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
          `Reembolso PayPal procesado: ${payment.paymentId} - ${refundId}`
        );
      }

      return {
        status: 'processed',
        payment_id: payment.paymentId,
        refund_id: refundId,
      };
    } catch (error) {
      this.logger.error('Error procesando reembolso:', error);
      throw error;
    }
  }

  /**
   * Maneja cuando un pago es revertido (chargeback)
   */
  private async handlePaymentCaptureReversed(resource: any): Promise<any> {
    const { id: captureId } = resource;

    try {
      const payment = await this.paymentModel.findOne({
        'gatewayResponse.purchase_units.payments.captures.id': captureId,
      });

      if (payment) {
        payment.status = PaymentStatus.FAILED;
        payment.failureReason = 'Pago revertido por PayPal (chargeback)';
        payment.gatewayResponse = {
          ...payment.gatewayResponse,
          capture_reversed: resource,
        };
        await payment.save();

        // Actualizar estado de la orden
        await this.orderModel.findByIdAndUpdate(payment.orderId, {
          paymentStatus: OrderPaymentStatus.FAILED,
          updatedAt: new Date(),
        });

        this.logger.log(`Pago PayPal revertido: ${payment.paymentId}`);
      }

      return {
        status: 'processed',
        payment_id: payment?.paymentId,
        capture_id: captureId,
      };
    } catch (error) {
      this.logger.error('Error procesando reversión de pago:', error);
      throw error;
    }
  }

  /**
   * Maneja cuando una orden es completada
   */
  private async handleOrderCompleted(resource: any): Promise<any> {
    const { id: orderId } = resource;

    this.logger.log(`Orden PayPal completada: ${orderId}`);

    // Este evento generalmente viene después de la captura
    // Principalmente para logging y auditoría
    return { status: 'logged', order_id: orderId };
  }

  /**
   * Maneja cuando una orden es anulada
   */
  private async handleOrderVoided(resource: any): Promise<any> {
    const { id: orderId } = resource;

    try {
      const payment = await this.paymentModel.findOne({
        transactionId: orderId,
      });

      if (payment && payment.status !== PaymentStatus.CANCELLED) {
        payment.status = PaymentStatus.CANCELLED;
        payment.failureReason = 'Orden anulada';
        payment.gatewayResponse = {
          ...payment.gatewayResponse,
          order_voided: resource,
        };
        await payment.save();

        this.logger.log(`Orden PayPal anulada: ${payment.paymentId}`);
      }

      return {
        status: 'processed',
        payment_id: payment?.paymentId,
        order_id: orderId,
      };
    } catch (error) {
      this.logger.error('Error procesando orden anulada:', error);
      throw error;
    }
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
