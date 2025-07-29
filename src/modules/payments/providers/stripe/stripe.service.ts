import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import axios from 'axios';
import * as crypto from 'crypto';

export interface StripePaymentData {
  amount: number;
  currency: string;
  orderId: string;
  paymentMethodId?: string;
  customerEmail?: string;
  description?: string;
  metadata?: Record<string, string>;
}

export interface StripeRefundData {
  paymentIntentId: string;
  amount?: number;
  reason?: string;
  metadata?: Record<string, string>;
}

export interface StripeWebhookData {
  rawBody: Buffer;
  signature: string;
}

@Injectable()
export class StripeService {
  private readonly logger = new Logger(StripeService.name);
  private readonly secretKey: string;
  private readonly webhookSecret: string;
  private readonly baseUrl = 'https://api.stripe.com/v1';

  constructor() {
    this.secretKey = process.env.STRIPE_SECRET_KEY;
    this.webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!this.secretKey) {
      this.logger.error('Stripe secret key no configurada');
      throw new Error('Credenciales de Stripe faltantes');
    }
  }

  /**
   * Crea un Payment Intent en Stripe
   */
  async createPaymentIntent(paymentData: StripePaymentData): Promise<any> {
    try {
      const {
        amount,
        currency,
        orderId,
        paymentMethodId,
        customerEmail,
        description,
        metadata,
      } = paymentData;

      const paymentIntentData = {
        amount: Math.round(amount * 100).toString(), // Stripe espera centavos
        currency: (currency || 'usd').toLowerCase(),
        description: description || `Pago para pedido ${orderId}`,
        metadata: {
          order_id: orderId,
          ...metadata,
        },
        receipt_email: customerEmail,
      };

      // Si se proporciona un método de pago, confirmar inmediatamente
      if (paymentMethodId) {
        paymentIntentData['payment_method'] = paymentMethodId;
        paymentIntentData['confirmation_method'] = 'manual';
        paymentIntentData['confirm'] = 'true';
        paymentIntentData['return_url'] =
          `${process.env.FRONTEND_URL}/payment/success`;
      }

      const response = await axios.post(
        `${this.baseUrl}/payment_intents`,
        new URLSearchParams(this.flattenObject(paymentIntentData)).toString(),
        {
          headers: {
            Authorization: `Bearer ${this.secretKey}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      const paymentIntent = response.data;
      const isSucceeded = paymentIntent.status === 'succeeded';

      this.logger.log(
        `Payment Intent Stripe ${isSucceeded ? 'exitoso' : 'creado'}: ${paymentIntent.id}`
      );

      return {
        success: isSucceeded,
        paymentIntentId: paymentIntent.id,
        clientSecret: paymentIntent.client_secret,
        status: paymentIntent.status,
        requiresAction: paymentIntent.status === 'requires_action',
        nextAction: paymentIntent.next_action,
        data: paymentIntent,
        error: !isSucceeded && paymentIntent.last_payment_error?.message,
      };
    } catch (error) {
      this.logger.error(
        'Error creando Payment Intent Stripe:',
        error.response?.data || error.message
      );
      return {
        success: false,
        error:
          error.response?.data?.error?.message ||
          'Error al crear el pago con Stripe',
        data: error.response?.data,
      };
    }
  }

  /**
   * Confirma un Payment Intent
   */
  async confirmPaymentIntent(
    paymentIntentId: string,
    paymentMethodId?: string
  ): Promise<any> {
    try {
      const confirmData = {};
      if (paymentMethodId) {
        confirmData['payment_method'] = paymentMethodId;
      }

      const response = await axios.post(
        `${this.baseUrl}/payment_intents/${paymentIntentId}/confirm`,
        new URLSearchParams(confirmData).toString(),
        {
          headers: {
            Authorization: `Bearer ${this.secretKey}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      const paymentIntent = response.data;
      const isSucceeded = paymentIntent.status === 'succeeded';

      this.logger.log(
        `Payment Intent confirmado: ${paymentIntentId} - ${paymentIntent.status}`
      );

      return {
        success: isSucceeded,
        status: paymentIntent.status,
        requiresAction: paymentIntent.status === 'requires_action',
        nextAction: paymentIntent.next_action,
        data: paymentIntent,
        error: !isSucceeded && paymentIntent.last_payment_error?.message,
      };
    } catch (error) {
      this.logger.error(
        'Error confirmando Payment Intent:',
        error.response?.data || error.message
      );
      return {
        success: false,
        error:
          error.response?.data?.error?.message || 'Error al confirmar el pago',
        data: error.response?.data,
      };
    }
  }

  /**
   * Procesa un reembolso
   */
  async createRefund(refundData: StripeRefundData): Promise<any> {
    try {
      const { paymentIntentId, amount, reason, metadata } = refundData;

      const refundRequest = {
        payment_intent: paymentIntentId,
        reason: reason || 'requested_by_customer',
        metadata: metadata || {},
      };

      if (amount) {
        refundRequest['amount'] = Math.round(amount * 100).toString();
      }

      const response = await axios.post(
        `${this.baseUrl}/refunds`,
        new URLSearchParams(this.flattenObject(refundRequest)).toString(),
        {
          headers: {
            Authorization: `Bearer ${this.secretKey}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      const refund = response.data;
      const isSucceeded = refund.status === 'succeeded';

      this.logger.log(
        `Reembolso Stripe ${isSucceeded ? 'exitoso' : 'procesando'}: ${refund.id}`
      );

      return {
        success: isSucceeded,
        refundId: refund.id,
        status: refund.status,
        amount: refund.amount / 100, // Convertir de centavos a unidades
        data: refund,
        error: !isSucceeded ? 'El reembolso está siendo procesado' : null,
      };
    } catch (error) {
      this.logger.error(
        'Error procesando reembolso Stripe:',
        error.response?.data || error.message
      );
      return {
        success: false,
        error:
          error.response?.data?.error?.message ||
          'Error al procesar el reembolso',
        data: error.response?.data,
      };
    }
  }

  /**
   * Verifica la autenticidad de un webhook de Stripe
   */
  verifyWebhook(webhookData: StripeWebhookData): any {
    try {
      if (!this.webhookSecret) {
        throw new BadRequestException('Stripe webhook secret no configurado');
      }

      const { rawBody, signature } = webhookData;

      // Parsear la firma
      const elements = signature.split(',');
      const signatureElements = {};

      for (const element of elements) {
        const [key, value] = element.split('=');
        signatureElements[key] = value;
      }

      const timestamp = signatureElements['t'];
      const signatures = [signatureElements['v1']];

      if (!timestamp || !signatures[0]) {
        throw new BadRequestException('Formato de firma inválido');
      }

      // Crear la firma esperada
      const payload = timestamp + '.' + rawBody.toString();
      const expectedSignature = crypto
        .createHmac('sha256', this.webhookSecret)
        .update(payload, 'utf8')
        .digest('hex');

      // Comparar firmas
      const isValid = signatures.some((sig) =>
        crypto.timingSafeEqual(
          Buffer.from(expectedSignature, 'hex'),
          Buffer.from(sig, 'hex')
        )
      );

      if (!isValid) {
        throw new BadRequestException('Firma inválida');
      }

      // Verificar timestamp (no más de 5 minutos de antigüedad)
      const timestampNumber = parseInt(timestamp, 10);
      const currentTime = Math.floor(Date.now() / 1000);
      const timeDifference = currentTime - timestampNumber;

      if (timeDifference > 300) {
        // 5 minutos
        throw new BadRequestException('Webhook demasiado antiguo');
      }

      const event = JSON.parse(rawBody.toString());
      this.logger.log(`Webhook Stripe verificado: ${event.type}`);

      return event;
    } catch (error) {
      this.logger.error('Error verificando webhook Stripe:', error.message);
      throw new BadRequestException('Verificación de webhook falló');
    }
  }

  /**
   * Obtiene los detalles de un Payment Intent
   */
  async getPaymentIntent(paymentIntentId: string): Promise<any> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/payment_intents/${paymentIntentId}`,
        {
          headers: {
            Authorization: `Bearer ${this.secretKey}`,
          },
        }
      );

      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      this.logger.error(
        'Error obteniendo Payment Intent:',
        error.response?.data || error.message
      );
      return {
        success: false,
        error:
          error.response?.data?.error?.message ||
          'Error al obtener detalles del pago',
        data: error.response?.data,
      };
    }
  }

  /**
   * Obtiene los detalles de un reembolso
   */
  async getRefund(refundId: string): Promise<any> {
    try {
      const response = await axios.get(`${this.baseUrl}/refunds/${refundId}`, {
        headers: {
          Authorization: `Bearer ${this.secretKey}`,
        },
      });

      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      this.logger.error(
        'Error obteniendo reembolso:',
        error.response?.data || error.message
      );
      return {
        success: false,
        error:
          error.response?.data?.error?.message ||
          'Error al obtener detalles del reembolso',
        data: error.response?.data,
      };
    }
  }

  /**
   * Crea un cliente en Stripe
   */
  async createCustomer(customerData: {
    email: string;
    name?: string;
    metadata?: Record<string, string>;
  }): Promise<any> {
    try {
      const { email, name, metadata } = customerData;

      const customerRequest = {
        email,
        name: name || '',
        metadata: metadata || {},
      };

      const response = await axios.post(
        `${this.baseUrl}/customers`,
        new URLSearchParams(this.flattenObject(customerRequest)).toString(),
        {
          headers: {
            Authorization: `Bearer ${this.secretKey}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      this.logger.log(`Cliente Stripe creado: ${response.data.id}`);

      return {
        success: true,
        customerId: response.data.id,
        data: response.data,
      };
    } catch (error) {
      this.logger.error(
        'Error creando cliente Stripe:',
        error.response?.data || error.message
      );
      return {
        success: false,
        error: error.response?.data?.error?.message || 'Error al crear cliente',
        data: error.response?.data,
      };
    }
  }

  /**
   * Aplana un objeto para el formato de Stripe
   */
  private flattenObject(obj: any, prefix = ''): any {
    const flattened = {};

    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const newKey = prefix ? `${prefix}[${key}]` : key;

        if (
          typeof obj[key] === 'object' &&
          obj[key] !== null &&
          !Array.isArray(obj[key])
        ) {
          Object.assign(flattened, this.flattenObject(obj[key], newKey));
        } else {
          flattened[newKey] = obj[key];
        }
      }
    }

    return flattened;
  }
}
