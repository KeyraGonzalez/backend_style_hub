import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  Payment,
  PaymentMethod,
  PaymentStatus,
} from './entities/payment.entity';
import {
  Order,
  PaymentStatus as OrderPaymentStatus,
} from '@core/domain/entities/order.entity';
import { User } from '@core/domain/entities/user.entity';
import { ProcessPaymentDto } from './dto/process-payment.dto';
import { RefundPaymentDto } from './dto/refund-payment.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { EventHandlerService } from '@shared/patterns/event-handler.service';
import { PayPalService } from './providers/paypal/paypal.service';
import { StripeService } from './providers/stripe/stripe.service';
import { PayPalWebhookHandler } from './providers/paypal/paypal-webhook.handler';
import { StripeWebhookHandler } from './providers/stripe/stripe-webhook.handler';
import * as crypto from 'crypto';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    @InjectModel(Payment.name) private paymentModel: Model<Payment>,
    @InjectModel(Order.name) private orderModel: Model<Order>,
    @InjectModel(User.name) private userModel: Model<User>,
    private notificationsService: NotificationsService,
    private eventHandlerService: EventHandlerService,
    private paypalService: PayPalService,
    private stripeService: StripeService,
    private paypalWebhookHandler: PayPalWebhookHandler,
    private stripeWebhookHandler: StripeWebhookHandler
  ) {}

  /**
   * Procesa un pago usando el método especificado
   */
  async processPayment(
    userId: string,
    processPaymentDto: ProcessPaymentDto
  ): Promise<Payment> {
    const { orderId, method, paymentDetails } = processPaymentDto;

    // Validar que la orden existe y pertenece al usuario
    const order = await this.orderModel.findOne({ _id: orderId, userId });
    if (!order) {
      throw new NotFoundException('Orden no encontrada');
    }

    if (order.paymentStatus === OrderPaymentStatus.PAID) {
      throw new BadRequestException('La orden ya está pagada');
    }

    // Generar ID único para el pago
    const paymentId = await this.generatePaymentId();

    // Crear registro de pago
    const payment = new this.paymentModel({
      paymentId,
      orderId,
      userId,
      amount: order.totalAmount,
      method,
      status: PaymentStatus.PROCESSING,
      createdAt: new Date(),
    });

    try {
      let result;

      // Procesar pago según el método
      switch (method) {
        case PaymentMethod.PAYPAL:
          result = await this.processPayPalPayment(order, paymentDetails);
          break;
        case PaymentMethod.STRIPE:
          result = await this.processStripePayment(order, paymentDetails);
          break;
        default:
          throw new BadRequestException('Método de pago no soportado');
      }

      // Actualizar el pago con los resultados
      payment.transactionId = result.transactionId;
      payment.gatewayResponse = result.data;
      payment.status = result.success
        ? PaymentStatus.COMPLETED
        : PaymentStatus.FAILED;
      payment.processedAt = new Date();

      if (!result.success) {
        payment.failureReason = result.error;
      }

      await payment.save();

      // Obtener datos del usuario para notificaciones
      const user = await this.userModel.findById(userId);

      // Enviar notificaciones
      try {
        const paymentData = {
          ...payment.toObject(),
          orderNumber: order.orderNumber,
          customerName: user ? `${user.firstName} ${user.lastName}` : 'Cliente',
          customerEmail: user?.email,
        };

        if (result.success) {
          await this.notificationsService.sendPaymentSuccess(
            userId,
            paymentData
          );

          // Actualizar estado de la orden
          await this.orderModel.findByIdAndUpdate(orderId, {
            paymentStatus: OrderPaymentStatus.PAID,
            paymentId: payment.paymentId,
            updatedAt: new Date(),
          });
        } else {
          await this.notificationsService.sendPaymentFailed(
            userId,
            paymentData
          );
        }

        // Emitir evento de pago procesado
        this.eventHandlerService.emitPaymentProcessed({
          paymentId: payment.paymentId,
          orderId: orderId.toString(),
          userId,
          success: result.success,
          amount: payment.amount,
          currency: 'USD',
          error: result.error,
          paymentData,
        });
      } catch (notificationError) {
        this.logger.error(
          'Error enviando notificaciones de pago:',
          notificationError
        );
        // No fallar el pago si las notificaciones fallan
      }

      return payment;
    } catch (error) {
      payment.status = PaymentStatus.FAILED;
      payment.failureReason = error.message;
      await payment.save();
      throw error;
    }
  }

  /**
   * Procesa un pago con PayPal
   */
  private async processPayPalPayment(
    order: any,
    paymentDetails: any
  ): Promise<any> {
    try {
      const paymentData = {
        amount: order.totalAmount,
        currency: 'USD',
        orderId: order.orderNumber,
        description: `Pago para pedido ${order.orderNumber}`,
      };

      // Si se proporciona un orderId de PayPal aprobado, capturarlo
      if (paymentDetails.paypalOrderId) {
        const result = await this.paypalService.captureOrder(
          paymentDetails.paypalOrderId
        );
        return {
          success: result.success,
          transactionId: result.transactionId,
          data: result.data,
          error: result.error,
        };
      }

      // Si no, crear una nueva orden
      const result = await this.paypalService.createOrder(paymentData);
      return {
        success: false, // La orden se crea pero no se completa hasta la captura
        transactionId: result.orderId,
        data: result.data,
        error: result.error,
        approvalUrl: result.approvalUrl,
      };
    } catch (error) {
      this.logger.error('Error procesando pago PayPal:', error);
      return {
        success: false,
        transactionId: null,
        data: null,
        error: error.message || 'Error al procesar pago con PayPal',
      };
    }
  }

  /**
   * Procesa un pago con Stripe
   */
  private async processStripePayment(
    order: any,
    paymentDetails: any
  ): Promise<any> {
    try {
      const user = await this.userModel.findById(order.userId);

      const paymentData = {
        amount: order.totalAmount,
        currency: 'USD',
        orderId: order.orderNumber,
        paymentMethodId: paymentDetails.paymentMethodId,
        customerEmail: user?.email,
        description: `Pago para pedido ${order.orderNumber}`,
        metadata: {
          order_id: order._id.toString(),
          user_id: order.userId.toString(),
        },
      };

      const result = await this.stripeService.createPaymentIntent(paymentData);

      return {
        success: result.success,
        transactionId: result.paymentIntentId,
        data: result.data,
        error: result.error,
        requiresAction: result.requiresAction,
        clientSecret: result.clientSecret,
      };
    } catch (error) {
      this.logger.error('Error procesando pago Stripe:', error);
      return {
        success: false,
        transactionId: null,
        data: null,
        error: error.message || 'Error al procesar pago con Stripe',
      };
    }
  }

  /**
   * Procesa un reembolso
   */
  async refundPayment(
    paymentId: string,
    refundPaymentDto: RefundPaymentDto
  ): Promise<Payment> {
    const payment = await this.paymentModel.findOne({ paymentId });
    if (!payment) {
      throw new NotFoundException('Pago no encontrado');
    }

    if (payment.status !== PaymentStatus.COMPLETED) {
      throw new BadRequestException('El pago no puede ser reembolsado');
    }

    const { amount, reason } = refundPaymentDto;
    const refundAmount = amount || payment.amount;

    try {
      let result;

      // Procesar reembolso según el método original
      switch (payment.method) {
        case PaymentMethod.PAYPAL:
          result = await this.processPayPalRefund(
            payment,
            refundAmount,
            reason
          );
          break;
        case PaymentMethod.STRIPE:
          result = await this.processStripeRefund(
            payment,
            refundAmount,
            reason
          );
          break;
        default:
          throw new BadRequestException('Método de reembolso no soportado');
      }

      if (result.success) {
        // Actualizar registro de pago
        payment.refundId = result.refundId;
        payment.refundAmount = refundAmount;
        payment.status = PaymentStatus.REFUNDED;
        await payment.save();

        // Actualizar estado de la orden
        await this.orderModel.findByIdAndUpdate(payment.orderId, {
          paymentStatus: OrderPaymentStatus.REFUNDED,
          updatedAt: new Date(),
        });

        this.logger.log(
          `Reembolso procesado exitosamente: ${payment.paymentId}`
        );
      }

      return payment;
    } catch (error) {
      this.logger.error('Error procesando reembolso:', error);
      throw new BadRequestException(`Reembolso falló: ${error.message}`);
    }
  }

  /**
   * Procesa un reembolso de PayPal
   */
  private async processPayPalRefund(
    payment: Payment,
    amount: number,
    reason?: string
  ): Promise<any> {
    try {
      // Obtener el capture ID del gateway response
      const captureId =
        payment.gatewayResponse?.purchase_units?.[0]?.payments?.captures?.[0]
          ?.id || payment.gatewayResponse?.id;

      if (!captureId) {
        throw new Error('ID de captura no encontrado para el reembolso');
      }

      const refundData = {
        captureId,
        amount,
        currency: 'USD',
        reason: reason || 'Reembolso solicitado por el cliente',
      };

      return await this.paypalService.refundCapture(refundData);
    } catch (error) {
      this.logger.error('Error en reembolso PayPal:', error);
      throw error;
    }
  }

  /**
   * Procesa un reembolso de Stripe
   */
  private async processStripeRefund(
    payment: Payment,
    amount: number,
    reason?: string
  ): Promise<any> {
    try {
      const refundData = {
        paymentIntentId: payment.transactionId,
        amount,
        reason: reason || 'requested_by_customer',
        metadata: {
          original_payment_id: payment.paymentId,
        },
      };

      return await this.stripeService.createRefund(refundData);
    } catch (error) {
      this.logger.error('Error en reembolso Stripe:', error);
      throw error;
    }
  }

  /**
   * Obtiene los pagos de un usuario
   */
  async findPaymentsByUser(userId: string): Promise<any[]> {
    const payments = await this.paymentModel
      .find({ userId })
      .populate('orderId', 'orderNumber totalAmount')
      .sort({ createdAt: -1 });

    return payments.map((payment) => {
      const paymentObj = payment.toObject() as any;
      if (paymentObj.orderId && typeof paymentObj.orderId === 'object') {
        paymentObj.order = {
          orderNumber: paymentObj.orderId.orderNumber,
          totalAmount: paymentObj.orderId.totalAmount,
        };
        paymentObj.orderId = paymentObj.orderId._id;
      }
      return paymentObj;
    });
  }

  /**
   * Obtiene un pago por orden
   */
  async findPaymentByOrder(orderId: string): Promise<Payment> {
    return this.paymentModel.findOne({ orderId });
  }

  /**
   * Verifica webhook de PayPal
   */
  async verifyPayPalWebhook(
    payload: any,
    headers: Record<string, string>,
    rawBody: Buffer
  ): Promise<boolean> {
    return this.paypalService.verifyWebhook({ payload, headers, rawBody });
  }

  /**
   * Verifica webhook de Stripe
   */
  async verifyStripeWebhook(rawBody: Buffer, signature: string): Promise<any> {
    return this.stripeService.verifyWebhook({ rawBody, signature });
  }

  /**
   * Maneja webhook de PayPal
   */
  async handlePayPalWebhook(payload: any): Promise<any> {
    return this.paypalWebhookHandler.handleWebhookEvent(payload);
  }

  /**
   * Maneja webhook de Stripe
   */
  async handleStripeWebhook(event: any): Promise<any> {
    return this.stripeWebhookHandler.handleWebhookEvent(event);
  }

  /**
   * Genera un ID único para el pago
   */
  private async generatePaymentId(): Promise<string> {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `PAY${timestamp}${random}`;
  }
}
