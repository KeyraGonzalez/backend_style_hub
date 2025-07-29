import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as sgMail from '@sendgrid/mail';

export interface EmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  templateId?: string;
  dynamicTemplateData?: any;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private isConfigured: boolean = false;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('SENDGRID_API_KEY');
    if (apiKey) {
      sgMail.setApiKey(apiKey);
      this.isConfigured = true;
      this.logger.log('SendGrid configurado exitosamente');
    } else {
      this.logger.warn('SendGrid API key no configurada');
      this.isConfigured = false;
    }
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    if (!this.isConfigured) {
      this.logger.error('SendGrid no está configurado');
      return false;
    }

    try {
      const msg = {
        to: options.to,
        from: {
          email:
            this.configService.get<string>('FROM_EMAIL') ||
            'noreply@modaelegante.com',
          name: this.configService.get<string>('FROM_NAME') || 'Moda Elegante',
        },
        subject: options.subject,
        text: options.text,
        html: options.html,
        templateId: options.templateId,
        dynamicTemplateData: options.dynamicTemplateData,
      };

      await sgMail.send(msg);
      this.logger.log(`Email enviado exitosamente a ${options.to}`);
      return true;
    } catch (error) {
      this.logger.error(`Error enviando email a ${options.to}:`, error);
      return false;
    }
  }

  async sendOrderConfirmationEmail(
    email: string,
    orderData: any
  ): Promise<boolean> {
    const html = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Confirmación de Pedido</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8f9fa;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 300;">Moda Elegante</h1>
            <p style="color: #ffffff; margin: 10px 0 0 0; opacity: 0.9;">Tu estilo, nuestra pasión</p>
          </div>

          <!-- Content -->
          <div style="padding: 40px 30px;">
            <h2 style="color: #2c3e50; margin: 0 0 20px 0; font-size: 24px; font-weight: 600;">¡Pedido Confirmado!</h2>
            
            <p style="color: #34495e; font-size: 16px; line-height: 1.6; margin: 0 0 25px 0;">
              Estimado/a <strong>${orderData.customerName || 'Cliente'}</strong>,
            </p>
            
            <p style="color: #34495e; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
              ¡Gracias por tu pedido! Hemos recibido tu solicitud y está siendo procesada por nuestro equipo. 
              Te mantendremos informado sobre el estado de tu pedido.
            </p>

            <!-- Order Details -->
            <div style="background-color: #f8f9fa; border-radius: 8px; padding: 25px; margin: 30px 0;">
              <h3 style="color: #2c3e50; margin: 0 0 20px 0; font-size: 18px; font-weight: 600;">Detalles del Pedido</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #7f8c8d; font-weight: 500;">Número de Pedido:</td>
                  <td style="padding: 8px 0; color: #2c3e50; font-weight: 600;">${orderData.orderNumber}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #7f8c8d; font-weight: 500;">Monto Total:</td>
                  <td style="padding: 8px 0; color: #27ae60; font-weight: 600; font-size: 18px;">$${orderData.totalAmount?.toFixed(2) || '0.00'}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #7f8c8d; font-weight: 500;">Fecha del Pedido:</td>
                  <td style="padding: 8px 0; color: #2c3e50; font-weight: 600;">${new Date(
                    orderData.createdAt || Date.now()
                  ).toLocaleDateString('es-ES', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}</td>
                </tr>
              </table>
            </div>

            ${
              orderData.items && orderData.items.length > 0
                ? `
            <!-- Items -->
            <div style="margin: 30px 0;">
              <h3 style="color: #2c3e50; margin: 0 0 20px 0; font-size: 18px; font-weight: 600;">Artículos Pedidos</h3>
              ${orderData.items
                .map(
                  (item: any) => `
                <div style="border-bottom: 1px solid #ecf0f1; padding: 15px 0;">
                  <div style="display: flex; justify-content: space-between; align-items: start;">
                    <div>
                      <p style="margin: 0 0 5px 0; color: #2c3e50; font-weight: 600; font-size: 16px;">${item.productName || item.name}</p>
                      <p style="margin: 0; color: #7f8c8d; font-size: 14px;">
                        Cantidad: ${item.quantity} | Precio unitario: $${item.unitPrice?.toFixed(2) || item.price?.toFixed(2) || '0.00'}
                      </p>
                      ${item.size ? `<p style="margin: 5px 0 0 0; color: #7f8c8d; font-size: 14px;">Talla: ${item.size}</p>` : ''}
                      ${item.color ? `<p style="margin: 5px 0 0 0; color: #7f8c8d; font-size: 14px;">Color: ${item.color}</p>` : ''}
                    </div>
                    <div style="text-align: right;">
                      <p style="margin: 0; color: #27ae60; font-weight: 600; font-size: 16px;">
                        $${((item.quantity || 1) * (item.unitPrice || item.price || 0)).toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              `
                )
                .join('')}
            </div>
            `
                : ''
            }

            ${
              orderData.shippingAddress
                ? `
            <!-- Shipping Address -->
            <div style="background-color: #e8f4fd; border-radius: 8px; padding: 25px; margin: 30px 0;">
              <h3 style="color: #2c3e50; margin: 0 0 15px 0; font-size: 18px; font-weight: 600;">Dirección de Envío</h3>
              <div style="color: #34495e; line-height: 1.6;">
                <p style="margin: 0 0 5px 0; font-weight: 600;">${orderData.shippingAddress.firstName} ${orderData.shippingAddress.lastName}</p>
                <p style="margin: 0 0 5px 0;">${orderData.shippingAddress.street}</p>
                <p style="margin: 0 0 5px 0;">${orderData.shippingAddress.city}, ${orderData.shippingAddress.state} ${orderData.shippingAddress.zipCode}</p>
                <p style="margin: 0;">${orderData.shippingAddress.country}</p>
                ${orderData.shippingAddress.phone ? `<p style="margin: 10px 0 0 0; color: #7f8c8d;">Tel: ${orderData.shippingAddress.phone}</p>` : ''}
              </div>
            </div>
            `
                : ''
            }

            <!-- Next Steps -->
            <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 20px; margin: 30px 0;">
              <h4 style="color: #856404; margin: 0 0 10px 0; font-size: 16px;">¿Qué sigue?</h4>
              <ul style="color: #856404; margin: 0; padding-left: 20px;">
                <li style="margin-bottom: 5px;">Procesaremos tu pedido en las próximas 24 horas</li>
                <li style="margin-bottom: 5px;">Te enviaremos un email cuando tu pedido sea enviado</li>
                <li style="margin-bottom: 5px;">Podrás rastrear tu pedido con el número de seguimiento</li>
                <li>Tiempo estimado de entrega: 3-5 días hábiles</li>
              </ul>
            </div>

            <p style="color: #34495e; font-size: 16px; line-height: 1.6; margin: 30px 0 0 0;">
              ¡Gracias por elegir Moda Elegante! Si tienes alguna pregunta sobre tu pedido, 
              no dudes en contactarnos.
            </p>
          </div>

          <!-- Footer -->
          <div style="background-color: #2c3e50; padding: 30px; text-align: center;">
            <p style="color: #bdc3c7; margin: 0 0 10px 0; font-size: 14px;">
              © 2024 Moda Elegante. Todos los derechos reservados.
            </p>
            <p style="color: #95a5a6; margin: 0; font-size: 12px;">
              Este es un email automático, por favor no respondas a este mensaje.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: email,
      subject: `✅ Pedido Confirmado #${orderData.orderNumber} - Moda Elegante`,
      html,
    });
  }

  async sendOrderShippedEmail(email: string, orderData: any): Promise<boolean> {
    const html = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Pedido Enviado</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8f9fa;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%); padding: 30px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 300;">📦 ¡Tu pedido está en camino!</h1>
            <p style="color: #ffffff; margin: 10px 0 0 0; opacity: 0.9;">Moda Elegante</p>
          </div>

          <!-- Content -->
          <div style="padding: 40px 30px;">
            <h2 style="color: #2c3e50; margin: 0 0 20px 0; font-size: 24px; font-weight: 600;">¡Excelentes noticias!</h2>
            
            <p style="color: #34495e; font-size: 16px; line-height: 1.6; margin: 0 0 25px 0;">
              Estimado/a <strong>${orderData.customerName || 'Cliente'}</strong>,
            </p>
            
            <p style="color: #34495e; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
              Tu pedido ha sido enviado y está en camino hacia ti. Podrás rastrearlo usando 
              la información de seguimiento que encontrarás a continuación.
            </p>

            <!-- Shipping Details -->
            <div style="background-color: #d4edda; border-radius: 8px; padding: 25px; margin: 30px 0; border-left: 4px solid #28a745;">
              <h3 style="color: #155724; margin: 0 0 20px 0; font-size: 18px; font-weight: 600;">Información de Envío</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #155724; font-weight: 500;">Número de Pedido:</td>
                  <td style="padding: 8px 0; color: #155724; font-weight: 600;">${orderData.orderNumber}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #155724; font-weight: 500;">Número de Seguimiento:</td>
                  <td style="padding: 8px 0; color: #155724; font-weight: 600; font-size: 16px;">${orderData.trackingNumber || 'Se proporcionará pronto'}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #155724; font-weight: 500;">Fecha de Envío:</td>
                  <td style="padding: 8px 0; color: #155724; font-weight: 600;">${new Date().toLocaleDateString(
                    'es-ES',
                    {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    }
                  )}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #155724; font-weight: 500;">Entrega Estimada:</td>
                  <td style="padding: 8px 0; color: #155724; font-weight: 600;">3-5 días hábiles</td>
                </tr>
              </table>
            </div>

            ${
              orderData.trackingNumber
                ? `
            <!-- Tracking Button -->
            <div style="text-align: center; margin: 30px 0;">
              <a href="#" style="display: inline-block; background-color: #28a745; color: #ffffff; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: 600; font-size: 16px;">
                Rastrear mi Pedido
              </a>
            </div>
            `
                : ''
            }

            <!-- Instructions -->
            <div style="background-color: #f8f9fa; border-radius: 8px; padding: 25px; margin: 30px 0;">
              <h4 style="color: #2c3e50; margin: 0 0 15px 0; font-size: 16px;">Instrucciones de Entrega</h4>
              <ul style="color: #34495e; margin: 0; padding-left: 20px; line-height: 1.6;">
                <li style="margin-bottom: 8px;">Asegúrate de que alguien esté disponible para recibir el paquete</li>
                <li style="margin-bottom: 8px;">Si no estás en casa, el paquete se dejará en un lugar seguro</li>
                <li style="margin-bottom: 8px;">Revisa tu paquete inmediatamente al recibirlo</li>
                <li>Contacta nuestro servicio al cliente si hay algún problema</li>
              </ul>
            </div>

            <p style="color: #34495e; font-size: 16px; line-height: 1.6; margin: 30px 0 0 0;">
              ¡Esperamos que disfrutes tu nueva compra! Gracias por elegir Moda Elegante.
            </p>
          </div>

          <!-- Footer -->
          <div style="background-color: #2c3e50; padding: 30px; text-align: center;">
            <p style="color: #bdc3c7; margin: 0 0 10px 0; font-size: 14px;">
              © 2024 Moda Elegante. Todos los derechos reservados.
            </p>
            <p style="color: #95a5a6; margin: 0; font-size: 12px;">
              Este es un email automático, por favor no respondas a este mensaje.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: email,
      subject: `🚚 Tu pedido #${orderData.orderNumber} ha sido enviado - Moda Elegante`,
      html,
    });
  }

  async sendWelcomeEmail(email: string, userData: any): Promise<boolean> {
    const html = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Bienvenido a Moda Elegante</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8f9fa;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 32px; font-weight: 300;">¡Bienvenido/a!</h1>
            <p style="color: #ffffff; margin: 15px 0 0 0; font-size: 18px; opacity: 0.9;">Moda Elegante</p>
          </div>

          <!-- Content -->
          <div style="padding: 40px 30px;">
            <h2 style="color: #2c3e50; margin: 0 0 20px 0; font-size: 24px; font-weight: 600;">
              ¡Hola ${userData.firstName || 'Cliente'}! 👋
            </h2>
            
            <p style="color: #34495e; font-size: 16px; line-height: 1.6; margin: 0 0 25px 0;">
              ¡Bienvenido/a a nuestra comunidad de moda! Estamos emocionados de tenerte con nosotros 
              y esperamos ayudarte a descubrir tu estilo único.
            </p>

            <!-- Benefits -->
            <div style="background-color: #f8f9fa; border-radius: 8px; padding: 25px; margin: 30px 0;">
              <h3 style="color: #2c3e50; margin: 0 0 20px 0; font-size: 18px; font-weight: 600;">¿Qué puedes hacer ahora?</h3>
              <div style="display: flex; flex-direction: column; gap: 15px;">
                <div style="display: flex; align-items: center;">
                  <span style="color: #28a745; font-size: 20px; margin-right: 15px;">🛍️</span>
                  <span style="color: #34495e; font-size: 16px;">Explora nuestras últimas colecciones</span>
                </div>
                <div style="display: flex; align-items: center;">
                  <span style="color: #28a745; font-size: 20px; margin-right: 15px;">💰</span>
                  <span style="color: #34495e; font-size: 16px;">Obtén descuentos exclusivos para miembros</span>
                </div>
                <div style="display: flex; align-items: center;">
                  <span style="color: #28a745; font-size: 20px; margin-right: 15px;">🚚</span>
                  <span style="color: #34495e; font-size: 16px;">Disfruta envío gratis en compras mayores a $100</span>
                </div>
                <div style="display: flex; align-items: center;">
                  <span style="color: #28a745; font-size: 20px; margin-right: 15px;">📱</span>
                  <span style="color: #34495e; font-size: 16px;">Mantente al día con las últimas tendencias</span>
                </div>
              </div>
            </div>

            <!-- CTA Button -->
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL || '#'}" style="display: inline-block; background-color: #667eea; color: #ffffff; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: 600; font-size: 16px;">
                Comenzar a Comprar
              </a>
            </div>

            <!-- Welcome Offer -->
            <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 20px; margin: 30px 0;">
              <h4 style="color: #856404; margin: 0 0 10px 0; font-size: 16px;">🎉 Oferta de Bienvenida</h4>
              <p style="color: #856404; margin: 0; font-size: 14px;">
                Como nuevo miembro, obtén <strong>15% de descuento</strong> en tu primera compra. 
                Usa el código: <strong>BIENVENIDO15</strong>
              </p>
            </div>

            <p style="color: #34495e; font-size: 16px; line-height: 1.6; margin: 30px 0 0 0;">
              Si tienes alguna pregunta o necesitas ayuda, nuestro equipo de atención al cliente 
              está aquí para ayudarte. ¡Esperamos verte pronto!
            </p>
          </div>

          <!-- Footer -->
          <div style="background-color: #2c3e50; padding: 30px; text-align: center;">
            <p style="color: #bdc3c7; margin: 0 0 10px 0; font-size: 14px;">
              © 2024 Moda Elegante. Todos los derechos reservados.
            </p>
            <p style="color: #95a5a6; margin: 0; font-size: 12px;">
              Este es un email automático, por favor no respondas a este mensaje.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: email,
      subject: `🎉 ¡Bienvenido/a a Moda Elegante, ${userData.firstName || 'Cliente'}!`,
      html,
    });
  }

  async sendPaymentSuccessEmail(
    email: string,
    paymentData: any
  ): Promise<boolean> {
    const html = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Pago Exitoso</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8f9fa;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%); padding: 30px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 300;">💳 ¡Pago Exitoso!</h1>
            <p style="color: #ffffff; margin: 10px 0 0 0; opacity: 0.9;">Moda Elegante</p>
          </div>

          <!-- Content -->
          <div style="padding: 40px 30px;">
            <h2 style="color: #2c3e50; margin: 0 0 20px 0; font-size: 24px; font-weight: 600;">¡Gracias por tu pago!</h2>
            
            <p style="color: #34495e; font-size: 16px; line-height: 1.6; margin: 0 0 25px 0;">
              Estimado/a <strong>${paymentData.customerName || 'Cliente'}</strong>,
            </p>
            
            <p style="color: #34495e; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
              Tu pago ha sido procesado exitosamente. A continuación encontrarás los detalles 
              de tu transacción para tus registros.
            </p>

            <!-- Payment Details -->
            <div style="background-color: #d4edda; border-radius: 8px; padding: 25px; margin: 30px 0; border-left: 4px solid #28a745;">
              <h3 style="color: #155724; margin: 0 0 20px 0; font-size: 18px; font-weight: 600;">Detalles del Pago</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #155724; font-weight: 500;">Monto Pagado:</td>
                  <td style="padding: 8px 0; color: #155724; font-weight: 600; font-size: 18px;">${paymentData.formattedAmount || `$${paymentData.amount?.toFixed(2)}` || '$0.00'}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #155724; font-weight: 500;">Número de Pedido:</td>
                  <td style="padding: 8px 0; color: #155724; font-weight: 600;">${paymentData.orderNumber}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #155724; font-weight: 500;">ID de Transacción:</td>
                  <td style="padding: 8px 0; color: #155724; font-weight: 600; font-family: monospace;">${paymentData.paymentId}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #155724; font-weight: 500;">Fecha y Hora:</td>
                  <td style="padding: 8px 0; color: #155724; font-weight: 600;">${new Date().toLocaleString(
                    'es-ES',
                    {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    }
                  )}</td>
                </tr>
              </table>
            </div>

            <!-- Next Steps -->
            <div style="background-color: #f8f9fa; border-radius: 8px; padding: 25px; margin: 30px 0;">
              <h4 style="color: #2c3e50; margin: 0 0 15px 0; font-size: 16px;">¿Qué sigue ahora?</h4>
              <ul style="color: #34495e; margin: 0; padding-left: 20px; line-height: 1.6;">
                <li style="margin-bottom: 8px;">Tu pedido está siendo procesado por nuestro equipo</li>
                <li style="margin-bottom: 8px;">Recibirás una notificación cuando tu pedido sea enviado</li>
                <li style="margin-bottom: 8px;">Podrás rastrear tu pedido en tiempo real</li>
                <li>Tiempo estimado de entrega: 3-5 días hábiles</li>
              </ul>
            </div>

            <!-- Receipt Note -->
            <div style="background-color: #e2e3e5; border-radius: 8px; padding: 20px; margin: 30px 0;">
              <p style="color: #495057; margin: 0; font-size: 14px; text-align: center;">
                📧 <strong>Recibo:</strong> Guarda este email como comprobante de tu pago. 
                También puedes descargar tu factura desde tu cuenta.
              </p>
            </div>

            <p style="color: #34495e; font-size: 16px; line-height: 1.6; margin: 30px 0 0 0;">
              ¡Gracias por elegir Moda Elegante! Si tienes alguna pregunta sobre tu pago o pedido, 
              no dudes en contactarnos.
            </p>
          </div>

          <!-- Footer -->
          <div style="background-color: #2c3e50; padding: 30px; text-align: center;">
            <p style="color: #bdc3c7; margin: 0 0 10px 0; font-size: 14px;">
              © 2024 Moda Elegante. Todos los derechos reservados.
            </p>
            <p style="color: #95a5a6; margin: 0; font-size: 12px;">
              Este es un email automático, por favor no respondas a este mensaje.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: email,
      subject: `✅ Pago Exitoso - Pedido #${paymentData.orderNumber} - Moda Elegante`,
      html,
    });
  }

  async sendPaymentFailedEmail(
    email: string,
    paymentData: any
  ): Promise<boolean> {
    const html = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Error en el Pago</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8f9fa;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #dc3545 0%, #c82333 100%); padding: 30px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 300;">❌ Error en el Pago</h1>
            <p style="color: #ffffff; margin: 10px 0 0 0; opacity: 0.9;">Moda Elegante</p>
          </div>

          <!-- Content -->
          <div style="padding: 40px 30px;">
            <h2 style="color: #2c3e50; margin: 0 0 20px 0; font-size: 24px; font-weight: 600;">Necesitamos tu atención</h2>
            
            <p style="color: #34495e; font-size: 16px; line-height: 1.6; margin: 0 0 25px 0;">
              Estimado/a <strong>${paymentData.customerName || 'Cliente'}</strong>,
            </p>
            
            <p style="color: #34495e; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
              Lamentablemente, no pudimos procesar tu pago para el pedido especificado. 
              No te preocupes, tu pedido sigue reservado y puedes intentar nuevamente.
            </p>

            <!-- Payment Details -->
            <div style="background-color: #f8d7da; border-radius: 8px; padding: 25px; margin: 30px 0; border-left: 4px solid #dc3545;">
              <h3 style="color: #721c24; margin: 0 0 20px 0; font-size: 18px; font-weight: 600;">Detalles del Error</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #721c24; font-weight: 500;">Monto:</td>
                  <td style="padding: 8px 0; color: #721c24; font-weight: 600; font-size: 18px;">${paymentData.formattedAmount || `$${paymentData.amount?.toFixed(2)}` || '$0.00'}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #721c24; font-weight: 500;">Número de Pedido:</td>
                  <td style="padding: 8px 0; color: #721c24; font-weight: 600;">${paymentData.orderNumber}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #721c24; font-weight: 500;">Motivo:</td>
                  <td style="padding: 8px 0; color: #721c24; font-weight: 600;">${paymentData.reason || 'Error en el procesamiento del pago'}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #721c24; font-weight: 500;">Fecha y Hora:</td>
                  <td style="padding: 8px 0; color: #721c24; font-weight: 600;">${new Date().toLocaleString(
                    'es-ES',
                    {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    }
                  )}</td>
                </tr>
              </table>
            </div>

            <!-- Solutions -->
            <div style="background-color: #fff3cd; border-radius: 8px; padding: 25px; margin: 30px 0; border-left: 4px solid #ffc107;">
              <h4 style="color: #856404; margin: 0 0 15px 0; font-size: 16px;">💡 ¿Cómo solucionarlo?</h4>
              <ul style="color: #856404; margin: 0; padding-left: 20px; line-height: 1.6;">
                <li style="margin-bottom: 8px;">Verifica que los datos de tu tarjeta sean correctos</li>
                <li style="margin-bottom: 8px;">Asegúrate de tener fondos suficientes en tu cuenta</li>
                <li style="margin-bottom: 8px;">Intenta con un método de pago diferente</li>
                <li style="margin-bottom: 8px;">Contacta a tu banco si el problema persiste</li>
                <li>Nuestro equipo de soporte está disponible para ayudarte</li>
              </ul>
            </div>

            <!-- CTA Button -->
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL}/checkout" style="display: inline-block; background-color: #dc3545; color: #ffffff; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: 600; font-size: 16px;">
                Intentar Nuevamente
              </a>
            </div>

            <!-- Reservation Note -->
            <div style="background-color: #d1ecf1; border-radius: 8px; padding: 20px; margin: 30px 0; border-left: 4px solid #17a2b8;">
              <p style="color: #0c5460; margin: 0; font-size: 14px;">
                ⏰ <strong>Tu pedido está reservado por 24 horas.</strong> 
                Tienes tiempo suficiente para completar tu pago sin perder los artículos seleccionados.
              </p>
            </div>

            <p style="color: #34495e; font-size: 16px; line-height: 1.6; margin: 30px 0 0 0;">
              Si continúas teniendo problemas o necesitas ayuda, no dudes en contactar nuestro 
              equipo de atención al cliente. Estamos aquí para ayudarte.
            </p>
          </div>

          <!-- Footer -->
          <div style="background-color: #2c3e50; padding: 30px; text-align: center;">
            <p style="color: #bdc3c7; margin: 0 0 10px 0; font-size: 14px;">
              © 2024 Moda Elegante. Todos los derechos reservados.
            </p>
            <p style="color: #95a5a6; margin: 0; font-size: 12px;">
              Este es un email automático, por favor no respondas a este mensaje.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: email,
      subject: `⚠️ Error en el Pago - Pedido #${paymentData.orderNumber} - Moda Elegante`,
      html,
    });
  }

  async sendPaymentRefundedEmail(
    email: string,
    paymentData: any
  ): Promise<boolean> {
    const html = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reembolso Procesado</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8f9fa;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #17a2b8 0%, #138496 100%); padding: 30px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 300;">💰 Reembolso Procesado</h1>
            <p style="color: #ffffff; margin: 10px 0 0 0; opacity: 0.9;">Moda Elegante</p>
          </div>

          <!-- Content -->
          <div style="padding: 40px 30px;">
            <h2 style="color: #2c3e50; margin: 0 0 20px 0; font-size: 24px; font-weight: 600;">Tu reembolso está en camino</h2>
            
            <p style="color: #34495e; font-size: 16px; line-height: 1.6; margin: 0 0 25px 0;">
              Estimado/a <strong>${paymentData.customerName || 'Cliente'}</strong>,
            </p>
            
            <p style="color: #34495e; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
              Tu solicitud de reembolso ha sido procesada exitosamente. El dinero será devuelto 
              a tu método de pago original en los próximos días hábiles.
            </p>

            <!-- Refund Details -->
            <div style="background-color: #d1ecf1; border-radius: 8px; padding: 25px; margin: 30px 0; border-left: 4px solid #17a2b8;">
              <h3 style="color: #0c5460; margin: 0 0 20px 0; font-size: 18px; font-weight: 600;">Detalles del Reembolso</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #0c5460; font-weight: 500;">Monto Reembolsado:</td>
                  <td style="padding: 8px 0; color: #0c5460; font-weight: 600; font-size: 18px;">${paymentData.formattedAmount || `$${paymentData.refundAmount?.toFixed(2)}` || `$${paymentData.amount?.toFixed(2)}` || '$0.00'}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #0c5460; font-weight: 500;">Número de Pedido:</td>
                  <td style="padding: 8px 0; color: #0c5460; font-weight: 600;">${paymentData.orderNumber}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #0c5460; font-weight: 500;">ID de Reembolso:</td>
                  <td style="padding: 8px 0; color: #0c5460; font-weight: 600; font-family: monospace;">${paymentData.refundId}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #0c5460; font-weight: 500;">Fecha de Procesamiento:</td>
                  <td style="padding: 8px 0; color: #0c5460; font-weight: 600;">${new Date().toLocaleString(
                    'es-ES',
                    {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    }
                  )}</td>
                </tr>
              </table>
            </div>

            <!-- Timeline -->
            <div style="background-color: #f8f9fa; border-radius: 8px; padding: 25px; margin: 30px 0;">
              <h4 style="color: #2c3e50; margin: 0 0 15px 0; font-size: 16px;">⏰ Cronograma de Reembolso</h4>
              <div style="color: #34495e; line-height: 1.6;">
                <div style="margin-bottom: 10px; padding-left: 20px; position: relative;">
                  <span style="position: absolute; left: 0; color: #28a745;">✅</span>
                  <strong>Hoy:</strong> Reembolso procesado y aprobado
                </div>
                <div style="margin-bottom: 10px; padding-left: 20px; position: relative;">
                  <span style="position: absolute; left: 0; color: #ffc107;">⏳</span>
                  <strong>1-2 días hábiles:</strong> Procesamiento por parte del banco
                </div>
                <div style="margin-bottom: 10px; padding-left: 20px; position: relative;">
                  <span style="position: absolute; left: 0; color: #6c757d;">⏳</span>
                  <strong>3-5 días hábiles:</strong> Dinero disponible en tu cuenta
                </div>
              </div>
            </div>

            <!-- Important Note -->
            <div style="background-color: #fff3cd; border-radius: 8px; padding: 20px; margin: 30px 0; border-left: 4px solid #ffc107;">
              <h4 style="color: #856404; margin: 0 0 10px 0; font-size: 16px;">📋 Información Importante</h4>
              <ul style="color: #856404; margin: 0; padding-left: 20px; line-height: 1.6; font-size: 14px;">
                <li style="margin-bottom: 5px;">El tiempo de procesamiento puede variar según tu banco</li>
                <li style="margin-bottom: 5px;">El reembolso aparecerá en el mismo método de pago utilizado</li>
                <li style="margin-bottom: 5px;">Recibirás una notificación cuando el dinero esté disponible</li>
                <li>Si no ves el reembolso después de 7 días, contacta tu banco</li>
              </ul>
            </div>

            <p style="color: #34495e; font-size: 16px; line-height: 1.6; margin: 30px 0 0 0;">
              Lamentamos que no hayas quedado completamente satisfecho/a con tu compra. 
              Si tienes alguna pregunta sobre este reembolso, no dudes en contactarnos.
            </p>
          </div>

          <!-- Footer -->
          <div style="background-color: #2c3e50; padding: 30px; text-align: center;">
            <p style="color: #bdc3c7; margin: 0 0 10px 0; font-size: 14px;">
              © 2024 Moda Elegante. Todos los derechos reservados.
            </p>
            <p style="color: #95a5a6; margin: 0; font-size: 12px;">
              Este es un email automático, por favor no respondas a este mensaje.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: email,
      subject: `💰 Reembolso Procesado - Pedido #${paymentData.orderNumber} - Moda Elegante`,
      html,
    });
  }

  // Método para verificar si el servicio está configurado
  isServiceConfigured(): boolean {
    return this.isConfigured;
  }

  // Método para obtener información del servicio
  getServiceInfo(): any {
    return {
      configured: this.isConfigured,
      provider: 'SendGrid',
      fromEmail: this.configService.get<string>('FROM_EMAIL'),
      fromName: this.configService.get<string>('FROM_NAME'),
    };
  }
}
