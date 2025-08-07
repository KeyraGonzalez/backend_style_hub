import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { OnEvent } from '@nestjs/event-emitter';
import {
  Notification,
  NotificationType,
  NotificationChannel,
  NotificationStatus,
} from './entities/notification.entity';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { SendNotificationDto } from './dto/send-notification.dto';
import { EmailService } from '@shared/services/email.service';
import { SMSService } from '@shared/services/sms.service';
import { PushNotificationService } from '@shared/services/push-notification.service';
import { User } from '@core/domain/entities/user.entity';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectModel(Notification.name)
    private notificationModel: Model<Notification>,
    @InjectModel(User.name) private userModel: Model<User>,
    private emailService: EmailService,
    private smsService: SMSService,
    private pushNotificationService: PushNotificationService
  ) {}

  /**
   * Crea una nueva notificación
   */
  async create(
    createNotificationDto: CreateNotificationDto
  ): Promise<Notification> {
    const notification = new this.notificationModel(createNotificationDto);
    return notification.save();
  }

  /**
   * Envía una notificación por el canal especificado
   */
  async sendNotification(
    sendNotificationDto: SendNotificationDto
  ): Promise<Notification> {
    const notification = await this.create(sendNotificationDto);

    try {
      await this.sendByChannel(notification);

      notification.status = NotificationStatus.SENT;
      notification.sentAt = new Date();
    } catch (error) {
      this.logger.error(
        `Error enviando notificación ${notification._id}:`,
        error
      );
      notification.status = NotificationStatus.FAILED;
      notification.errorMessage = error.message;
      notification.retryCount += 1;
    }

    await notification.save();
    return notification;
  }

  // ==================== MÉTODOS DE PAGOS ====================

  /**
   * Envía notificación de pago exitoso
   */
  async sendPaymentSuccess(userId: string, paymentData: any): Promise<void> {
    const user = await this.userModel.findById(userId);
    if (!user) return;

    const enhancedPaymentData = {
      ...paymentData,
      customerName: `${user.firstName} ${user.lastName}`,
      formattedAmount: `$${paymentData.amount?.toFixed(2) || '0.00'}`,
    };

    // Email notification
    await this.sendNotification({
      userId,
      type: NotificationType.PAYMENT_SUCCESS,
      channel: NotificationChannel.EMAIL,
      title: 'Pago Exitoso - Moda Elegante',
      message: `Tu pago de ${enhancedPaymentData.formattedAmount} ha sido procesado exitosamente para el pedido #${paymentData.orderNumber}.`,
      data: enhancedPaymentData,
    });

    // SMS notification
    if (user.phone) {
      await this.sendNotification({
        userId,
        type: NotificationType.PAYMENT_SUCCESS,
        channel: NotificationChannel.SMS,
        title: 'Pago Exitoso',
        message: `¡Hola ${user.firstName}! Tu pago de ${enhancedPaymentData.formattedAmount} fue procesado exitosamente.`,
        data: enhancedPaymentData,
      });
    }

    // Push notification
    if (paymentData.deviceToken) {
      await this.sendNotification({
        userId,
        type: NotificationType.PAYMENT_SUCCESS,
        channel: NotificationChannel.PUSH,
        title: 'Pago Exitoso',
        message: `Pago de ${enhancedPaymentData.formattedAmount} procesado`,
        data: { ...enhancedPaymentData, deviceToken: paymentData.deviceToken },
      });
    }

    // In-app notification
    await this.sendNotification({
      userId,
      type: NotificationType.PAYMENT_SUCCESS,
      channel: NotificationChannel.IN_APP,
      title: 'Pago Exitoso',
      message: `Tu pago de ${enhancedPaymentData.formattedAmount} ha sido procesado exitosamente.`,
      data: enhancedPaymentData,
    });
  }

  /**
   * Envía notificación de pago fallido
   */
  async sendPaymentFailed(userId: string, paymentData: any): Promise<void> {
    const user = await this.userModel.findById(userId);
    if (!user) return;

    const enhancedPaymentData = {
      ...paymentData,
      customerName: `${user.firstName} ${user.lastName}`,
      formattedAmount: `$${paymentData.amount?.toFixed(2) || '0.00'}`,
      reason: paymentData.reason || 'Error en el procesamiento',
    };

    // Email notification
    await this.sendNotification({
      userId,
      type: NotificationType.PAYMENT_FAILED,
      channel: NotificationChannel.EMAIL,
      title: 'Error en el Pago - Moda Elegante',
      message: `Tu pago de ${enhancedPaymentData.formattedAmount} no pudo ser procesado. Motivo: ${enhancedPaymentData.reason}`,
      data: enhancedPaymentData,
    });

    // SMS notification
    if (user.phone) {
      await this.sendNotification({
        userId,
        type: NotificationType.PAYMENT_FAILED,
        channel: NotificationChannel.SMS,
        title: 'Error en el Pago',
        message: `${user.firstName}, tu pago de ${enhancedPaymentData.formattedAmount} falló. Por favor intenta nuevamente.`,
        data: enhancedPaymentData,
      });
    }

    // Push notification
    if (paymentData.deviceToken) {
      await this.sendNotification({
        userId,
        type: NotificationType.PAYMENT_FAILED,
        channel: NotificationChannel.PUSH,
        title: 'Error en el Pago',
        message: `Pago de ${enhancedPaymentData.formattedAmount} falló`,
        data: { ...enhancedPaymentData, deviceToken: paymentData.deviceToken },
      });
    }

    // In-app notification
    await this.sendNotification({
      userId,
      type: NotificationType.PAYMENT_FAILED,
      channel: NotificationChannel.IN_APP,
      title: 'Error en el Pago',
      message: `Tu pago de ${enhancedPaymentData.formattedAmount} no pudo ser procesado. Por favor intenta nuevamente.`,
      data: enhancedPaymentData,
    });
  }

  /**
   * Envía notificación de reembolso procesado
   */
  async sendPaymentRefunded(userId: string, paymentData: any): Promise<void> {
    const user = await this.userModel.findById(userId);
    if (!user) return;

    const enhancedPaymentData = {
      ...paymentData,
      customerName: `${user.firstName} ${user.lastName}`,
      formattedAmount: `$${paymentData.refundAmount?.toFixed(2) || paymentData.amount?.toFixed(2) || '0.00'}`,
    };

    // Email notification
    await this.sendNotification({
      userId,
      type: NotificationType.PAYMENT_REFUNDED,
      channel: NotificationChannel.EMAIL,
      title: 'Reembolso Procesado - Moda Elegante',
      message: `Tu reembolso de ${enhancedPaymentData.formattedAmount} ha sido procesado y será reflejado en tu método de pago original en 3-5 días hábiles.`,
      data: enhancedPaymentData,
    });

    // SMS notification
    if (user.phone) {
      await this.sendNotification({
        userId,
        type: NotificationType.PAYMENT_REFUNDED,
        channel: NotificationChannel.SMS,
        title: 'Reembolso Procesado',
        message: `${user.firstName}, tu reembolso de ${enhancedPaymentData.formattedAmount} ha sido procesado.`,
        data: enhancedPaymentData,
      });
    }

    // In-app notification
    await this.sendNotification({
      userId,
      type: NotificationType.PAYMENT_REFUNDED,
      channel: NotificationChannel.IN_APP,
      title: 'Reembolso Procesado',
      message: `Tu reembolso de ${enhancedPaymentData.formattedAmount} ha sido procesado exitosamente.`,
      data: enhancedPaymentData,
    });
  }

  // ==================== MÉTODOS DE ÓRDENES ====================

  /**
   * Envía notificación de orden confirmada
   */
  async sendOrderConfirmation(userId: string, orderData: any): Promise<void> {
    const user = await this.userModel.findById(userId);
    if (!user) return;

    const enhancedOrderData = {
      ...orderData,
      customerName: `${user.firstName} ${user.lastName}`,
    };

    // Email notification
    await this.sendNotification({
      userId,
      type: NotificationType.ORDER_CONFIRMED,
      channel: NotificationChannel.EMAIL,
      title: 'Pedido Confirmado - Moda Elegante',
      message: `Tu pedido #${orderData.orderNumber} ha sido confirmado y está siendo procesado.`,
      data: enhancedOrderData,
    });

    // SMS notification
    if (user.phone) {
      await this.sendNotification({
        userId,
        type: NotificationType.ORDER_CONFIRMED,
        channel: NotificationChannel.SMS,
        title: 'Pedido Confirmado',
        message: `¡Hola ${user.firstName}! Tu pedido ${orderData.orderNumber} ha sido confirmado.`,
        data: enhancedOrderData,
      });
    }

    // Push notification
    if (orderData.deviceToken) {
      await this.sendNotification({
        userId,
        type: NotificationType.ORDER_CONFIRMED,
        channel: NotificationChannel.PUSH,
        title: 'Pedido Confirmado',
        message: `Pedido #${orderData.orderNumber} confirmado`,
        data: { ...enhancedOrderData, deviceToken: orderData.deviceToken },
      });
    }

    // In-app notification
    await this.sendNotification({
      userId,
      type: NotificationType.ORDER_CONFIRMED,
      channel: NotificationChannel.IN_APP,
      title: 'Pedido Confirmado',
      message: `Pedido #${orderData.orderNumber} confirmado`,
      data: enhancedOrderData,
    });
  }

  /**
   * Envía notificación de orden enviada
   */
  async sendOrderShipped(userId: string, orderData: any): Promise<void> {
    const user = await this.userModel.findById(userId);
    if (!user) return;

    const enhancedOrderData = {
      ...orderData,
      customerName: `${user.firstName} ${user.lastName}`,
    };

    // Email notification
    await this.sendNotification({
      userId,
      type: NotificationType.ORDER_SHIPPED,
      channel: NotificationChannel.EMAIL,
      title: 'Pedido Enviado - Moda Elegante',
      message: `Tu pedido #${orderData.orderNumber} ha sido enviado. Número de seguimiento: ${orderData.trackingNumber}`,
      data: enhancedOrderData,
    });

    // SMS notification
    if (user.phone) {
      await this.sendNotification({
        userId,
        type: NotificationType.ORDER_SHIPPED,
        channel: NotificationChannel.SMS,
        title: 'Pedido Enviado',
        message: `¡Tu pedido ${orderData.orderNumber} ha sido enviado!`,
        data: enhancedOrderData,
      });
    }

    // Push notification
    if (orderData.deviceToken) {
      await this.sendNotification({
        userId,
        type: NotificationType.ORDER_SHIPPED,
        channel: NotificationChannel.PUSH,
        title: 'Pedido Enviado',
        message: `Pedido #${orderData.orderNumber} enviado`,
        data: { ...enhancedOrderData, deviceToken: orderData.deviceToken },
      });
    }

    // In-app notification
    await this.sendNotification({
      userId,
      type: NotificationType.ORDER_SHIPPED,
      channel: NotificationChannel.IN_APP,
      title: 'Pedido Enviado',
      message: `Pedido #${orderData.orderNumber} enviado - Seguimiento: ${orderData.trackingNumber}`,
      data: enhancedOrderData,
    });
  }

  /**
   * Envía notificación de orden entregada
   */
  async sendOrderDelivered(userId: string, orderData: any): Promise<void> {
    const user = await this.userModel.findById(userId);
    if (!user) return;

    const enhancedOrderData = {
      ...orderData,
      customerName: `${user.firstName} ${user.lastName}`,
    };

    // Email notification
    await this.sendNotification({
      userId,
      type: NotificationType.ORDER_DELIVERED,
      channel: NotificationChannel.EMAIL,
      title: 'Pedido Entregado - Moda Elegante',
      message: `¡Tu pedido #${orderData.orderNumber} ha sido entregado exitosamente! Esperamos que disfrutes tu compra.`,
      data: enhancedOrderData,
    });

    // SMS notification
    if (user.phone) {
      await this.sendNotification({
        userId,
        type: NotificationType.ORDER_DELIVERED,
        channel: NotificationChannel.SMS,
        title: 'Pedido Entregado',
        message: `¡${user.firstName}, tu pedido ${orderData.orderNumber} ha sido entregado!`,
        data: enhancedOrderData,
      });
    }

    // Push notification
    if (orderData.deviceToken) {
      await this.sendNotification({
        userId,
        type: NotificationType.ORDER_DELIVERED,
        channel: NotificationChannel.PUSH,
        title: 'Pedido Entregado',
        message: `Pedido #${orderData.orderNumber} entregado`,
        data: { ...enhancedOrderData, deviceToken: orderData.deviceToken },
      });
    }

    // In-app notification
    await this.sendNotification({
      userId,
      type: NotificationType.ORDER_DELIVERED,
      channel: NotificationChannel.IN_APP,
      title: 'Pedido Entregado',
      message: `Tu pedido #${orderData.orderNumber} ha sido entregado exitosamente.`,
      data: enhancedOrderData,
    });
  }

  /**
   * Envía notificación de orden cancelada
   */
  async sendOrderCancelled(userId: string, orderData: any): Promise<void> {
    const user = await this.userModel.findById(userId);
    if (!user) return;

    const enhancedOrderData = {
      ...orderData,
      customerName: `${user.firstName} ${user.lastName}`,
      reason: orderData.cancellationReason || 'Cancelado por el usuario',
    };

    // Email notification
    await this.sendNotification({
      userId,
      type: NotificationType.ORDER_CANCELLED,
      channel: NotificationChannel.EMAIL,
      title: 'Pedido Cancelado - Moda Elegante',
      message: `Tu pedido #${orderData.orderNumber} ha sido cancelado. ${enhancedOrderData.reason}`,
      data: enhancedOrderData,
    });

    // SMS notification
    if (user.phone) {
      await this.sendNotification({
        userId,
        type: NotificationType.ORDER_CANCELLED,
        channel: NotificationChannel.SMS,
        title: 'Pedido Cancelado',
        message: `${user.firstName}, tu pedido ${orderData.orderNumber} ha sido cancelado.`,
        data: enhancedOrderData,
      });
    }

    // In-app notification
    await this.sendNotification({
      userId,
      type: NotificationType.ORDER_CANCELLED,
      channel: NotificationChannel.IN_APP,
      title: 'Pedido Cancelado',
      message: `Tu pedido #${orderData.orderNumber} ha sido cancelado.`,
      data: enhancedOrderData,
    });
  }

  // ==================== OTROS MÉTODOS ====================

  /**
   * Envía notificación de bienvenida
   */
  async sendWelcomeNotification(userId: string, userData: any): Promise<void> {
    const user = await this.userModel.findById(userId);
    if (!user) return;

    // Email notification
    await this.sendNotification({
      userId,
      type: NotificationType.WELCOME,
      channel: NotificationChannel.EMAIL,
      title: '¡Bienvenido a Moda Elegante!',
      message: `¡Bienvenido ${userData.firstName}! Gracias por unirte a nuestra comunidad de moda.`,
      data: userData,
    });

    // In-app notification
    await this.sendNotification({
      userId,
      type: NotificationType.WELCOME,
      channel: NotificationChannel.IN_APP,
      title: '¡Bienvenido!',
      message: `¡Hola ${userData.firstName}! Bienvenido a Moda Elegante.`,
      data: userData,
    });
  }

  /**
   * Envía notificación de producto disponible
   */
  async sendProductBackInStock(
    userId: string,
    productData: any
  ): Promise<void> {
    const user = await this.userModel.findById(userId);
    if (!user) return;

    const enhancedProductData = {
      ...productData,
      customerName: `${user.firstName} ${user.lastName}`,
    };

    // Email notification
    await this.sendNotification({
      userId,
      type: NotificationType.PRODUCT_BACK_IN_STOCK,
      channel: NotificationChannel.EMAIL,
      title: 'Producto Disponible - Moda Elegante',
      message: `¡Buenas noticias! El producto "${productData.productName}" que estabas esperando ya está disponible nuevamente.`,
      data: enhancedProductData,
    });

    // Push notification
    if (productData.deviceToken) {
      await this.sendNotification({
        userId,
        type: NotificationType.PRODUCT_BACK_IN_STOCK,
        channel: NotificationChannel.PUSH,
        title: 'Producto Disponible',
        message: `"${productData.productName}" está disponible`,
        data: { ...enhancedProductData, deviceToken: productData.deviceToken },
      });
    }

    // In-app notification
    await this.sendNotification({
      userId,
      type: NotificationType.PRODUCT_BACK_IN_STOCK,
      channel: NotificationChannel.IN_APP,
      title: 'Producto Disponible',
      message: `El producto "${productData.productName}" ya está disponible nuevamente.`,
      data: enhancedProductData,
    });
  }

  /**
   * Envía notificación promocional
   */
  async sendPromotionalNotification(
    userId: string,
    promotionData: any
  ): Promise<void> {
    const user = await this.userModel.findById(userId);
    if (!user) return;

    const enhancedPromotionData = {
      ...promotionData,
      customerName: `${user.firstName} ${user.lastName}`,
    };

    // Email notification
    await this.sendNotification({
      userId,
      type: NotificationType.PROMOTION,
      channel: NotificationChannel.EMAIL,
      title: `Oferta Especial - Moda Elegante`,
      message:
        promotionData.message || '¡No te pierdas nuestras ofertas especiales!',
      data: enhancedPromotionData,
    });

    // SMS notification (only if user opted in)

    // Push notification
    if (promotionData.deviceToken) {
      await this.sendNotification({
        userId,
        type: NotificationType.PROMOTION,
        channel: NotificationChannel.PUSH,
        title: 'Oferta Especial',
        message: promotionData.shortMessage || 'Nueva oferta disponible',
        data: {
          ...enhancedPromotionData,
          deviceToken: promotionData.deviceToken,
        },
      });
    }

    // In-app notification
    await this.sendNotification({
      userId,
      type: NotificationType.PROMOTION,
      channel: NotificationChannel.IN_APP,
      title: 'Oferta Especial',
      message:
        promotionData.message || '¡No te pierdas nuestras ofertas especiales!',
      data: enhancedPromotionData,
    });
  }

  // ==================== EVENT LISTENERS ====================

  @OnEvent('user.registered')
  async handleUserRegistered(payload: any): Promise<void> {
    try {
      await this.sendWelcomeNotification(payload.userId, payload.userData);
    } catch (error) {
      this.logger.error('Error manejando evento usuario registrado:', error);
    }
  }

  @OnEvent('order.created')
  async handleOrderCreated(payload: any): Promise<void> {
    try {
      await this.sendOrderConfirmation(payload.userId, payload.orderData);
    } catch (error) {
      this.logger.error('Error manejando evento orden creada:', error);
    }
  }

  @OnEvent('order.shipped')
  async handleOrderShipped(payload: any): Promise<void> {
    try {
      await this.sendOrderShipped(payload.userId, payload.orderData);
    } catch (error) {
      this.logger.error('Error manejando evento orden enviada:', error);
    }
  }

  @OnEvent('order.delivered')
  async handleOrderDelivered(payload: any): Promise<void> {
    try {
      await this.sendOrderDelivered(payload.userId, payload.orderData);
    } catch (error) {
      this.logger.error('Error manejando evento orden entregada:', error);
    }
  }

  @OnEvent('payment.processed')
  async handlePaymentProcessed(payload: any): Promise<void> {
    try {
      if (payload.success) {
        await this.sendPaymentSuccess(payload.userId, payload);
      } else {
        await this.sendPaymentFailed(payload.userId, payload);
      }
    } catch (error) {
      this.logger.error('Error manejando evento pago procesado:', error);
    }
  }

  @OnEvent('product.back.in.stock')
  async handleProductBackInStock(payload: any): Promise<void> {
    try {
      // Aquí podrías obtener una lista de usuarios interesados en el producto
      // Por ahora, es un placeholder
      this.logger.log(`Producto disponible nuevamente: ${payload.productId}`);
    } catch (error) {
      this.logger.error('Error manejando evento producto disponible:', error);
    }
  }

  // ==================== MÉTODOS DE CONSULTA ====================

  /**
   * Obtiene las notificaciones de un usuario
   */
  async findUserNotifications(
    userId: string,
    page: number = 1,
    limit: number = 20
  ) {
    const skip = (page - 1) * limit;

    const [notifications, total] = await Promise.all([
      this.notificationModel
        .find({ userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.notificationModel.countDocuments({ userId }),
    ]);

    return {
      notifications,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Marca una notificación como leída
   */
  async markAsRead(id: string, userId: string): Promise<Notification> {
    const notification = await this.notificationModel.findOneAndUpdate(
      { _id: id, userId },
      { status: NotificationStatus.READ, readAt: new Date() },
      { new: true }
    );

    if (!notification) {
      throw new NotFoundException('Notificación no encontrada');
    }

    return notification;
  }

  /**
   * Marca todas las notificaciones como leídas
   */
  async markAllAsRead(userId: string): Promise<void> {
    await this.notificationModel.updateMany(
      { userId, status: { $ne: NotificationStatus.READ } },
      { status: NotificationStatus.READ, readAt: new Date() }
    );
  }

  /**
   * Obtiene el contador de notificaciones no leídas
   */
  async getUnreadCount(userId: string): Promise<number> {
    return this.notificationModel.countDocuments({
      userId,
      status: { $ne: NotificationStatus.READ },
    });
  }

  // ==================== MÉTODOS PRIVADOS ====================

  /**
   * Envía notificación por el canal especificado
   */
  private async sendByChannel(notification: Notification): Promise<void> {
    switch (notification.channel) {
      case NotificationChannel.EMAIL:
        await this.sendEmail(notification);
        break;
      case NotificationChannel.SMS:
        await this.sendSMS(notification);
        break;
      case NotificationChannel.PUSH:
        await this.sendPushNotification(notification);
        break;
      case NotificationChannel.IN_APP:
        // Las notificaciones in-app solo se almacenan en la base de datos
        break;
      default:
        throw new Error('Canal de notificación no soportado');
    }
  }

  /**
   * Envía email
   */
  private async sendEmail(notification: Notification): Promise<void> {
    const user = await this.userModel.findById(notification.userId);
    if (!user) throw new Error('Usuario no encontrado');

    let success = false;

    switch (notification.type) {
      case NotificationType.ORDER_CONFIRMED:
        success = await this.emailService.sendOrderConfirmationEmail(
          user.email,
          notification.data
        );
        break;
      case NotificationType.ORDER_SHIPPED:
        success = await this.emailService.sendOrderShippedEmail(
          user.email,
          notification.data
        );
        break;
      case NotificationType.WELCOME:
        success = await this.emailService.sendWelcomeEmail(
          user.email,
          notification.data
        );
        break;
      case NotificationType.PAYMENT_SUCCESS:
        success = await this.emailService.sendPaymentSuccessEmail(
          user.email,
          notification.data
        );
        break;
      case NotificationType.PAYMENT_FAILED:
        success = await this.emailService.sendPaymentFailedEmail(
          user.email,
          notification.data
        );
        break;
      case NotificationType.PAYMENT_REFUNDED:
        success = await this.emailService.sendPaymentRefundedEmail(
          user.email,
          notification.data
        );
        break;
      default:
        // Email genérico para otros tipos
        success = await this.emailService.sendEmail({
          to: user.email,
          subject: notification.title,
          html: `<p>${notification.message}</p>`,
        });
    }

    if (!success) {
      throw new Error('Error enviando email');
    }
  }

  /**
   * Envía SMS
   */
  private async sendSMS(notification: Notification): Promise<void> {
    const user = await this.userModel.findById(notification.userId);
    if (!user || !user.phone)
      throw new Error('Teléfono del usuario no encontrado');

    let success = false;

    switch (notification.type) {
      case NotificationType.ORDER_CONFIRMED:
        success = await this.smsService.sendOrderConfirmationSMS(
          user.phone,
          notification.data
        );
        break;
      case NotificationType.ORDER_SHIPPED:
        success = await this.smsService.sendOrderShippedSMS(
          user.phone,
          notification.data
        );
        break;
      case NotificationType.ORDER_DELIVERED:
        success = await this.smsService.sendOrderDeliveredSMS(
          user.phone,
          notification.data
        );
        break;
      case NotificationType.PAYMENT_SUCCESS:
        success = await this.smsService.sendPaymentSuccessSMS(
          user.phone,
          notification.data
        );
        break;
      case NotificationType.PAYMENT_FAILED:
        success = await this.smsService.sendPaymentFailedSMS(
          user.phone,
          notification.data
        );
        break;
      case NotificationType.PROMOTION:
        success = await this.smsService.sendPromotionalSMS(
          user.phone,
          notification.data
        );
        break;
      default:
        // SMS genérico para otros tipos
        success = await this.smsService.sendSMS({
          to: user.phone,
          message: notification.message,
        });
    }

    if (!success) {
      throw new Error('Error enviando SMS');
    }
  }

  /**
   * Envía push notification
   */
  private async sendPushNotification(
    notification: Notification
  ): Promise<void> {
    const deviceToken = notification.data?.deviceToken;
    if (!deviceToken) throw new Error('Token de dispositivo no encontrado');

    let success = false;

    switch (notification.type) {
      case NotificationType.ORDER_CONFIRMED:
        success = await this.pushNotificationService.sendOrderConfirmationPush(
          deviceToken,
          notification.data
        );
        break;
      case NotificationType.ORDER_SHIPPED:
        success = await this.pushNotificationService.sendOrderShippedPush(
          deviceToken,
          notification.data
        );
        break;
      case NotificationType.ORDER_DELIVERED:
        success = await this.pushNotificationService.sendOrderDeliveredPush(
          deviceToken,
          notification.data
        );
        break;
      case NotificationType.PAYMENT_SUCCESS:
        success = await this.pushNotificationService.sendPaymentSuccessPush(
          deviceToken,
          notification.data
        );
        break;
      case NotificationType.PAYMENT_FAILED:
        success = await this.pushNotificationService.sendPaymentFailedPush(
          deviceToken,
          notification.data
        );
        break;
      case NotificationType.PRODUCT_BACK_IN_STOCK:
        success = await this.pushNotificationService.sendProductBackInStockPush(
          deviceToken,
          notification.data
        );
        break;
      default:
        // Push notification genérica para otros tipos
        success = await this.pushNotificationService.sendPushNotification({
          token: deviceToken,
          title: notification.title,
          body: notification.message,
          data: notification.data,
        });
    }

    if (!success) {
      throw new Error('Error enviando push notification');
    }
  }

  /**
   * Elimina una notificación específica del usuario
   */
  async deleteNotification(
    notificationId: string,
    userId: string
  ): Promise<{ success: boolean; message: string }> {
    const notification = await this.notificationModel.findOne({
      _id: notificationId,
      userId: userId,
    });

    if (!notification) {
      throw new NotFoundException('Notificación no encontrada');
    }

    await this.notificationModel.findByIdAndDelete(notificationId);

    return {
      success: true,
      message: 'Notificación eliminada exitosamente',
    };
  }

  /**
   * Obtiene estadísticas de notificaciones del usuario
   */
  async getNotificationStats(userId: string): Promise<{
    total: number;
    unread: number;
    byType: Record<string, number>;
    byPriority: Record<string, number>;
  }> {
    const [totalCount, unreadCount, typeStats, priorityStats] =
      await Promise.all([
        // Total de notificaciones
        this.notificationModel.countDocuments({ userId }),

        // Notificaciones no leídas
        this.notificationModel.countDocuments({
          userId,
          status: { $ne: NotificationStatus.READ },
        }),

        // Estadísticas por tipo
        this.notificationModel.aggregate([
          { $match: { userId } },
          { $group: { _id: '$type', count: { $sum: 1 } } },
        ]),

        // Estadísticas por prioridad
        this.notificationModel.aggregate([
          { $match: { userId } },
          { $group: { _id: '$priority', count: { $sum: 1 } } },
        ]),
      ]);

    // Convertir arrays de agregación a objetos
    const byType: Record<string, number> = {};
    typeStats.forEach((stat) => {
      byType[stat._id] = stat.count;
    });

    const byPriority: Record<string, number> = {};
    priorityStats.forEach((stat) => {
      byPriority[stat._id] = stat.count;
    });

    return {
      total: totalCount,
      unread: unreadCount,
      byType,
      byPriority,
    };
  }
}
