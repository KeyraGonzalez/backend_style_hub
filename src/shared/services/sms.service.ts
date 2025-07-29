import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Twilio } from 'twilio';

export interface SMSOptions {
  to: string;
  message: string;
}

@Injectable()
export class SMSService {
  private readonly logger = new Logger(SMSService.name);
  private twilioClient: Twilio | null = null;
  private fromNumber: string;
  private isConfigured: boolean = false;

  constructor(private configService: ConfigService) {
    const accountSid = this.configService.get<string>('TWILIO_ACCOUNT_SID');
    const authToken = this.configService.get<string>('TWILIO_AUTH_TOKEN');
    this.fromNumber =
      this.configService.get<string>('TWILIO_PHONE_NUMBER') || '';

    // Verificar que las credenciales estén configuradas y sean válidas
    if (
      accountSid &&
      authToken &&
      accountSid.startsWith('AC') &&
      this.fromNumber
    ) {
      try {
        this.twilioClient = new Twilio(accountSid, authToken);
        this.isConfigured = true;
        this.logger.log('Servicio SMS de Twilio configurado exitosamente');
      } catch (error) {
        this.logger.warn('Error inicializando cliente Twilio:', error.message);
        this.isConfigured = false;
      }
    } else {
      this.logger.warn(
        'Servicio SMS de Twilio no configurado - credenciales faltantes o inválidas'
      );
      this.isConfigured = false;
    }
  }

  async sendSMS(options: SMSOptions): Promise<boolean> {
    if (!this.isConfigured || !this.twilioClient) {
      this.logger.error('Cliente Twilio no inicializado');
      return false;
    }

    try {
      // Validar formato del número de teléfono
      const phoneNumber = this.formatPhoneNumber(options.to);
      if (!phoneNumber) {
        this.logger.error(`Número de teléfono inválido: ${options.to}`);
        return false;
      }

      const message = await this.twilioClient.messages.create({
        body: options.message,
        from: this.fromNumber,
        to: phoneNumber,
      });

      this.logger.log(
        `SMS enviado exitosamente a ${phoneNumber}, SID: ${message.sid}`
      );
      return true;
    } catch (error) {
      this.logger.error(`Error enviando SMS a ${options.to}:`, error);
      return false;
    }
  }

  async sendOrderConfirmationSMS(
    phone: string,
    orderData: any
  ): Promise<boolean> {
    const customerName = orderData.customerName || 'Cliente';
    const orderNumber = orderData.orderNumber || 'N/A';
    const totalAmount = orderData.totalAmount
      ? `$${orderData.totalAmount.toFixed(2)}`
      : '$0.00';

    const message = `¡Hola ${customerName}! Tu pedido #${orderNumber} ha sido confirmado. Total: ${totalAmount}. Te notificaremos cuando sea enviado. - Moda Elegante`;

    return this.sendSMS({
      to: phone,
      message,
    });
  }

  async sendOrderShippedSMS(phone: string, orderData: any): Promise<boolean> {
    const orderNumber = orderData.orderNumber || 'N/A';
    const trackingNumber =
      orderData.trackingNumber || 'Se proporcionará pronto';

    const message = `¡Excelentes noticias! Tu pedido #${orderNumber} ha sido enviado. Seguimiento: ${trackingNumber}. Entrega estimada: 3-5 días hábiles. - Moda Elegante`;

    return this.sendSMS({
      to: phone,
      message,
    });
  }

  async sendOrderDeliveredSMS(phone: string, orderData: any): Promise<boolean> {
    const orderNumber = orderData.orderNumber || 'N/A';
    const customerName = orderData.customerName || 'Cliente';

    const message = `¡${customerName}, tu pedido #${orderNumber} ha sido entregado! Gracias por elegir Moda Elegante. ¿Cómo fue tu experiencia? - Moda Elegante`;

    return this.sendSMS({
      to: phone,
      message,
    });
  }

  async sendPaymentSuccessSMS(
    phone: string,
    paymentData: any
  ): Promise<boolean> {
    const formattedAmount =
      paymentData.formattedAmount ||
      `$${paymentData.amount?.toFixed(2)}` ||
      '$0.00';
    const orderNumber = paymentData.orderNumber || 'N/A';
    const customerName = paymentData.customerName || 'Cliente';

    const message = `¡Hola ${customerName}! Tu pago de ${formattedAmount} para el pedido #${orderNumber} fue procesado exitosamente. ¡Gracias por tu compra! - Moda Elegante`;

    return this.sendSMS({
      to: phone,
      message,
    });
  }

  async sendPaymentFailedSMS(
    phone: string,
    paymentData: any
  ): Promise<boolean> {
    const formattedAmount =
      paymentData.formattedAmount ||
      `$${paymentData.amount?.toFixed(2)}` ||
      '$0.00';
    const orderNumber = paymentData.orderNumber || 'N/A';
    const customerName = paymentData.customerName || 'Cliente';

    const message = `${customerName}, tu pago de ${formattedAmount} para el pedido #${orderNumber} no pudo procesarse. Por favor intenta nuevamente o contacta soporte. - Moda Elegante`;

    return this.sendSMS({
      to: phone,
      message,
    });
  }

  async sendPaymentRefundedSMS(
    phone: string,
    paymentData: any
  ): Promise<boolean> {
    const formattedAmount =
      paymentData.formattedAmount ||
      `$${paymentData.refundAmount?.toFixed(2)}` ||
      `$${paymentData.amount?.toFixed(2)}` ||
      '$0.00';
    const orderNumber = paymentData.orderNumber || 'N/A';
    const customerName = paymentData.customerName || 'Cliente';

    const message = `${customerName}, tu reembolso de ${formattedAmount} para el pedido #${orderNumber} ha sido procesado. Será reflejado en tu cuenta en 3-5 días hábiles. - Moda Elegante`;

    return this.sendSMS({
      to: phone,
      message,
    });
  }

  async sendPromotionalSMS(phone: string, promoData: any): Promise<boolean> {
    const title = promoData.title || 'Oferta Especial';
    const description = promoData.description || 'Nueva promoción disponible';
    const code = promoData.code || '';
    const discount = promoData.discount || '';

    let message = `🛍️ ${title}: ${description}`;

    if (code) {
      message += ` Código: ${code}`;
    }

    if (discount) {
      message += ` ${discount}% OFF`;
    }

    if (promoData.expiryDate) {
      message += ` Válido hasta ${promoData.expiryDate}`;
    }

    message += '. ¡Compra ahora! - Moda Elegante';

    return this.sendSMS({
      to: phone,
      message,
    });
  }

  async sendSecurityAlertSMS(
    phone: string,
    securityData: any
  ): Promise<boolean> {
    const activity = securityData.activity || 'actividad sospechosa';
    const customerName = securityData.customerName || 'Cliente';

    const message = `🔒 ${customerName}, alerta de seguridad: ${activity} detectada en tu cuenta. Si no fuiste tú, cambia tu contraseña inmediatamente y contacta soporte. - Moda Elegante`;

    return this.sendSMS({
      to: phone,
      message,
    });
  }

  async sendPasswordResetSMS(phone: string, resetData: any): Promise<boolean> {
    const customerName = resetData.customerName || 'Cliente';

    const message = `🔑 ${customerName}, se solicitó restablecer tu contraseña en Moda Elegante. Si no fuiste tú, ignora este mensaje o contacta soporte inmediatamente. - Moda Elegante`;

    return this.sendSMS({
      to: phone,
      message,
    });
  }

  async sendOrderCancelledSMS(phone: string, orderData: any): Promise<boolean> {
    const orderNumber = orderData.orderNumber || 'N/A';
    const customerName = orderData.customerName || 'Cliente';
    const reason = orderData.reason || orderData.cancellationReason || '';

    let message = `${customerName}, tu pedido #${orderNumber} ha sido cancelado`;

    if (reason) {
      message += `. Motivo: ${reason}`;
    }

    message +=
      '. Si tienes preguntas, contacta nuestro soporte. - Moda Elegante';

    return this.sendSMS({
      to: phone,
      message,
    });
  }

  async sendProductBackInStockSMS(
    phone: string,
    productData: any
  ): Promise<boolean> {
    const productName =
      productData.productName || productData.name || 'Producto';
    const customerName = productData.customerName || 'Cliente';

    const message = `🔥 ¡${customerName}, buenas noticias! "${productName}" ya está disponible nuevamente. ¡No te lo pierdas y compra ahora antes de que se agote! - Moda Elegante`;

    return this.sendSMS({
      to: phone,
      message,
    });
  }

  async sendWelcomeSMS(phone: string, userData: any): Promise<boolean> {
    const firstName = userData.firstName || 'Cliente';

    const message = `¡Bienvenido/a ${firstName} a Moda Elegante! 🎉 Descubre las últimas tendencias y obtén 15% OFF en tu primera compra con código BIENVENIDO15. ¡Empezar a comprar! - Moda Elegante`;

    return this.sendSMS({
      to: phone,
      message,
    });
  }

  async sendLowStockAlertSMS(
    phone: string,
    productData: any
  ): Promise<boolean> {
    const productName =
      productData.productName || productData.name || 'Producto';
    const stock = productData.stock || 0;

    const message = `⚠️ ¡Últimas unidades! Solo quedan ${stock} unidades de "${productName}". ¡Compra ahora antes de que se agote! - Moda Elegante`;

    return this.sendSMS({
      to: phone,
      message,
    });
  }

  async sendAbandonedCartSMS(phone: string, cartData: any): Promise<boolean> {
    const customerName = cartData.customerName || 'Cliente';
    const itemCount = cartData.itemCount || cartData.items?.length || 0;

    const message = `🛒 ${customerName}, ¿olvidaste algo? Tienes ${itemCount} artículo${itemCount !== 1 ? 's' : ''} esperándote en tu carrito. ¡Completa tu compra ahora! - Moda Elegante`;

    return this.sendSMS({
      to: phone,
      message,
    });
  }

  async sendFlashSaleSMS(phone: string, saleData: any): Promise<boolean> {
    const discount = saleData.discount || 0;
    const endTime = saleData.endTime || 'tiempo limitado';

    const message = `⚡ ¡OFERTA FLASH! ${discount}% de descuento en productos seleccionados por ${endTime}. ¡No te lo pierdas, compra ahora! - Moda Elegante`;

    return this.sendSMS({
      to: phone,
      message,
    });
  }

  async sendReviewReminderSMS(phone: string, orderData: any): Promise<boolean> {
    const customerName = orderData.customerName || 'Cliente';
    const orderNumber = orderData.orderNumber || 'N/A';

    const message = `⭐ ${customerName}, ¿cómo estuvo tu experiencia con el pedido #${orderNumber}? Tu opinión es muy importante para nosotros. ¡Déjanos tu reseña! - Moda Elegante`;

    return this.sendSMS({
      to: phone,
      message,
    });
  }

  // Métodos utilitarios

  /**
   * Formatea el número de teléfono para Twilio
   */
  private formatPhoneNumber(phone: string): string | null {
    if (!phone) return null;

    // Remover espacios y caracteres especiales
    let cleanPhone = phone.replace(/[\s\-\(\)\.]/g, '');

    // Si no empieza con +, agregar código de país por defecto (+1 para US/CA)
    if (!cleanPhone.startsWith('+')) {
      // Si empieza con 1, agregar +
      if (cleanPhone.startsWith('1') && cleanPhone.length === 11) {
        cleanPhone = '+' + cleanPhone;
      }
      // Si no tiene código de país, agregar +1
      else if (cleanPhone.length === 10) {
        cleanPhone = '+1' + cleanPhone;
      }
      // Para otros países, agregar + si no lo tiene
      else {
        cleanPhone = '+' + cleanPhone;
      }
    }

    // Validar formato básico
    if (cleanPhone.length < 10 || cleanPhone.length > 15) {
      return null;
    }

    return cleanPhone;
  }

  /**
   * Trunca el mensaje si es muy largo para SMS
   */
  private truncateMessage(message: string, maxLength: number = 160): string {
    if (message.length <= maxLength) {
      return message;
    }

    return message.substring(0, maxLength - 3) + '...';
  }

  /**
   * Verifica si el servicio está configurado
   */
  isServiceConfigured(): boolean {
    return this.isConfigured;
  }

  /**
   * Obtiene información del servicio
   */
  getServiceInfo(): any {
    return {
      configured: this.isConfigured,
      fromNumber: this.fromNumber,
      provider: 'Twilio',
      maxMessageLength: 160,
    };
  }

  /**
   * Obtiene estadísticas del servicio (si está disponible)
   */
  async getServiceStats(): Promise<any> {
    if (!this.isConfigured || !this.twilioClient) {
      return {
        configured: false,
        error: 'Servicio no configurado',
      };
    }

    try {
      // Obtener información básica de la cuenta
      const account = await this.twilioClient.api.accounts.list({ limit: 1 });

      return {
        configured: true,
        accountSid: account[0]?.sid || 'N/A',
        status: account[0]?.status || 'unknown',
        provider: 'Twilio',
      };
    } catch (error) {
      this.logger.error(
        'Error obteniendo estadísticas del servicio SMS:',
        error
      );
      return {
        configured: true,
        error: 'No se pudieron obtener estadísticas',
      };
    }
  }
}
