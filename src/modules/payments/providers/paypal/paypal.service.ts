import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import axios from 'axios';
import * as crypto from 'crypto';

export interface PayPalPaymentData {
  amount: number;
  currency: string;
  orderId: string;
  description?: string;
  returnUrl?: string;
  cancelUrl?: string;
}

export interface PayPalRefundData {
  captureId: string;
  amount: number;
  currency: string;
  reason?: string;
}

export interface PayPalWebhookData {
  payload: any;
  headers: Record<string, string>;
  rawBody: Buffer;
}

@Injectable()
export class PayPalService {
  private readonly logger = new Logger(PayPalService.name);
  private readonly baseUrl: string;
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly webhookId: string;

  constructor() {
    this.baseUrl =
      process.env.PAYPAL_API_URL || 'https://api-m.sandbox.paypal.com';
    this.clientId = process.env.PAYPAL_CLIENT_ID;
    this.clientSecret = process.env.PAYPAL_CLIENT_SECRET;
    this.webhookId = process.env.PAYPAL_WEBHOOK_ID;

    if (!this.clientId || !this.clientSecret) {
      this.logger.error('PayPal credentials not configured');
      throw new Error('PayPal credentials missing');
    }
  }

  /**
   * Obtiene un token de acceso de PayPal
   */
  async getAccessToken(): Promise<string> {
    try {
      const auth = Buffer.from(
        `${this.clientId}:${this.clientSecret}`
      ).toString('base64');

      const response = await axios.post(
        `${this.baseUrl}/v1/oauth2/token`,
        'grant_type=client_credentials',
        {
          headers: {
            Authorization: `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      return response.data.access_token;
    } catch (error) {
      this.logger.error(
        'Error obteniendo token de PayPal:',
        error.response?.data || error.message
      );
      throw new BadRequestException(
        'No se pudo obtener el token de acceso de PayPal'
      );
    }
  }

  /**
   * Crea una orden de pago en PayPal
   */
  async createOrder(paymentData: PayPalPaymentData): Promise<any> {
    try {
      const accessToken = await this.getAccessToken();
      const { amount, currency, orderId, description, returnUrl, cancelUrl } =
        paymentData;

      const orderRequest = {
        intent: 'CAPTURE',
        purchase_units: [
          {
            reference_id: orderId,
            amount: {
              currency_code: currency || 'USD',
              value: amount.toFixed(2),
            },
            description: description || `Pago para pedido ${orderId}`,
          },
        ],
        application_context: {
          brand_name: 'Moda Elegante',
          locale: 'es-ES',
          landing_page: 'BILLING',
          shipping_preference: 'NO_SHIPPING',
          user_action: 'PAY_NOW',
          return_url:
            returnUrl || `${process.env.FRONTEND_URL}/payment/success`,
          cancel_url: cancelUrl || `${process.env.FRONTEND_URL}/payment/cancel`,
        },
      };

      const response = await axios.post(
        `${this.baseUrl}/v2/checkout/orders`,
        orderRequest,
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
            'PayPal-Request-Id': this.generateRequestId(),
          },
        }
      );

      this.logger.log(`Orden PayPal creada: ${response.data.id}`);
      return {
        success: true,
        orderId: response.data.id,
        approvalUrl: response.data.links.find((link) => link.rel === 'approve')
          ?.href,
        data: response.data,
      };
    } catch (error) {
      this.logger.error(
        'Error creando orden PayPal:',
        error.response?.data || error.message
      );
      return {
        success: false,
        error:
          error.response?.data?.details?.[0]?.description ||
          'Error al crear la orden de PayPal',
        data: error.response?.data,
      };
    }
  }

  /**
   * Captura el pago de una orden aprobada
   */
  async captureOrder(orderId: string): Promise<any> {
    try {
      const accessToken = await this.getAccessToken();

      const response = await axios.post(
        `${this.baseUrl}/v2/checkout/orders/${orderId}/capture`,
        {},
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
            'PayPal-Request-Id': this.generateRequestId(),
          },
        }
      );

      const isCompleted = response.data.status === 'COMPLETED';
      const captureId =
        response.data.purchase_units?.[0]?.payments?.captures?.[0]?.id;

      this.logger.log(
        `Pago PayPal ${isCompleted ? 'capturado' : 'falló'}: ${orderId}`
      );

      return {
        success: isCompleted,
        captureId,
        transactionId: orderId,
        status: response.data.status,
        data: response.data,
        error: !isCompleted ? 'La captura del pago falló' : null,
      };
    } catch (error) {
      this.logger.error(
        'Error capturando pago PayPal:',
        error.response?.data || error.message
      );
      return {
        success: false,
        error:
          error.response?.data?.details?.[0]?.description ||
          'Error al capturar el pago de PayPal',
        data: error.response?.data,
      };
    }
  }

  /**
   * Procesa un reembolso
   */
  async refundCapture(refundData: PayPalRefundData): Promise<any> {
    try {
      const accessToken = await this.getAccessToken();
      const { captureId, amount, currency, reason } = refundData;

      const refundRequest = {
        amount: {
          value: amount.toFixed(2),
          currency_code: currency || 'USD',
        },
        note_to_payer: reason || 'Reembolso procesado por Moda Elegante',
      };

      const response = await axios.post(
        `${this.baseUrl}/v2/payments/captures/${captureId}/refund`,
        refundRequest,
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
            'PayPal-Request-Id': this.generateRequestId(),
          },
        }
      );

      const isCompleted = response.data.status === 'COMPLETED';

      this.logger.log(
        `Reembolso PayPal ${isCompleted ? 'completado' : 'falló'}: ${response.data.id}`
      );

      return {
        success: isCompleted,
        refundId: response.data.id,
        status: response.data.status,
        data: response.data,
        error: !isCompleted ? 'El reembolso falló' : null,
      };
    } catch (error) {
      this.logger.error(
        'Error procesando reembolso PayPal:',
        error.response?.data || error.message
      );
      return {
        success: false,
        error:
          error.response?.data?.details?.[0]?.description ||
          'Error al procesar el reembolso de PayPal',
        data: error.response?.data,
      };
    }
  }

  /**
   * Verifica la autenticidad de un webhook de PayPal
   */
  async verifyWebhook(webhookData: PayPalWebhookData): Promise<boolean> {
    try {
      if (!this.webhookId) {
        this.logger.warn('PayPal Webhook ID no configurado');
        return false;
      }

      const { payload, headers } = webhookData;
      const accessToken = await this.getAccessToken();

      const verificationRequest = {
        auth_algo: headers['paypal-auth-algo'],
        cert_id: headers['paypal-cert-id'],
        transmission_id: headers['paypal-transmission-id'],
        transmission_sig: headers['paypal-transmission-sig'],
        transmission_time: headers['paypal-transmission-time'],
        webhook_id: this.webhookId,
        webhook_event: payload,
      };

      const response = await axios.post(
        `${this.baseUrl}/v1/notifications/verify-webhook-signature`,
        verificationRequest,
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      const isValid = response.data.verification_status === 'SUCCESS';
      this.logger.log(
        `Verificación webhook PayPal: ${isValid ? 'válido' : 'inválido'}`
      );

      return isValid;
    } catch (error) {
      this.logger.error(
        'Error verificando webhook PayPal:',
        error.response?.data || error.message
      );
      return false;
    }
  }

  /**
   * Obtiene los detalles de una orden
   */
  async getOrderDetails(orderId: string): Promise<any> {
    try {
      const accessToken = await this.getAccessToken();

      const response = await axios.get(
        `${this.baseUrl}/v2/checkout/orders/${orderId}`,
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      this.logger.error(
        'Error obteniendo detalles de orden PayPal:',
        error.response?.data || error.message
      );
      return {
        success: false,
        error:
          error.response?.data?.details?.[0]?.description ||
          'Error al obtener detalles de la orden',
        data: error.response?.data,
      };
    }
  }

  /**
   * Obtiene los detalles de una captura
   */
  async getCaptureDetails(captureId: string): Promise<any> {
    try {
      const accessToken = await this.getAccessToken();

      const response = await axios.get(
        `${this.baseUrl}/v2/payments/captures/${captureId}`,
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      this.logger.error(
        'Error obteniendo detalles de captura PayPal:',
        error.response?.data || error.message
      );
      return {
        success: false,
        error:
          error.response?.data?.details?.[0]?.description ||
          'Error al obtener detalles de la captura',
        data: error.response?.data,
      };
    }
  }

  /**
   * Genera un ID único para las peticiones
   */
  private generateRequestId(): string {
    return crypto.randomUUID();
  }
}
