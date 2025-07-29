import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
  Headers,
  RawBodyRequest,
  Req,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiParam,
  ApiExcludeEndpoint,
} from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { ProcessPaymentDto } from './dto/process-payment.dto';
import { RefundPaymentDto } from './dto/refund-payment.dto';

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  private readonly logger = new Logger(PaymentsController.name);

  constructor(private readonly paymentsService: PaymentsService) {}

  // Protected routes (require authentication)
  @Post('process')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Procesar pago',
    description: 'Procesa un pago para un pedido específico',
  })
  @ApiBody({ type: ProcessPaymentDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Pago procesado exitosamente',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Datos de pago inválidos',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Token JWT inválido o expirado',
  })
  @ApiResponse({
    status: HttpStatus.PAYMENT_REQUIRED,
    description: 'Error en el procesamiento del pago',
  })
  processPayment(@Request() req, @Body() processPaymentDto: ProcessPaymentDto) {
    return this.paymentsService.processPayment(req.user.id, processPaymentDto);
  }

  @Post(':paymentId/refund')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Reembolsar pago',
    description: 'Procesa un reembolso para un pago específico',
  })
  @ApiParam({ name: 'paymentId', description: 'ID del pago a reembolsar' })
  @ApiBody({ type: RefundPaymentDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Reembolso procesado exitosamente',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Datos de reembolso inválidos',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Pago no encontrado',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Token JWT inválido o expirado',
  })
  refundPayment(
    @Param('paymentId') paymentId: string,
    @Body() refundPaymentDto: RefundPaymentDto
  ) {
    return this.paymentsService.refundPayment(paymentId, refundPaymentDto);
  }

  @Get()
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Obtener pagos del usuario',
    description:
      'Obtiene todos los pagos realizados por el usuario autenticado',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Lista de pagos obtenida exitosamente',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Token JWT inválido o expirado',
  })
  findUserPayments(@Request() req) {
    return this.paymentsService.findPaymentsByUser(req.user.id);
  }

  @Get('order/:orderId')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Obtener pago por pedido',
    description: 'Obtiene el pago asociado a un pedido específico',
  })
  @ApiParam({ name: 'orderId', description: 'ID del pedido' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Pago obtenido exitosamente',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Pago no encontrado para el pedido especificado',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Token JWT inválido o expirado',
  })
  findPaymentByOrder(@Param('orderId') orderId: string) {
    return this.paymentsService.findPaymentByOrder(orderId);
  }

  // Webhook routes (no authentication required)
  @Post('webhook/paypal')
  @HttpCode(HttpStatus.OK)
  @ApiExcludeEndpoint()
  async handlePayPalWebhook(
    @Body() payload: any,
    @Headers() headers: Record<string, string>,
    @Req() req: RawBodyRequest<Request>
  ) {
    this.logger.log('PayPal webhook received');

    try {
      // Verify PayPal webhook signature
      const isValid = await this.paymentsService.verifyPayPalWebhook(
        payload,
        headers,
        req.rawBody
      );

      if (!isValid) {
        this.logger.error('Invalid PayPal webhook signature');
        return { status: 'error', message: 'Invalid signature' };
      }

      // Process PayPal webhook event
      const result = await this.paymentsService.handlePayPalWebhook(payload);

      this.logger.log(`PayPal webhook processed: ${payload.event_type}`);
      return { status: 'success', data: result };
    } catch (error) {
      this.logger.error('PayPal webhook error:', error);
      return { status: 'error', message: error.message };
    }
  }

  @Post('webhook/stripe')
  @HttpCode(HttpStatus.OK)
  async handleStripeWebhook(
    @Body() payload: any,
    @Headers('stripe-signature') signature: string,
    @Req() req: RawBodyRequest<Request>
  ) {
    this.logger.log('Stripe webhook received');

    try {
      // Verify Stripe webhook signature
      const event = await this.paymentsService.verifyStripeWebhook(
        req.rawBody,
        signature
      );

      // Process Stripe webhook event
      const result = await this.paymentsService.handleStripeWebhook(event);

      this.logger.log(`Stripe webhook processed: ${event.type}`);
      return { status: 'success', data: result };
    } catch (error) {
      this.logger.error('Stripe webhook error:', error);
      return { status: 'error', message: error.message };
    }
  }

  // PayPal specific endpoints
  @Post('paypal/create-order')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Crear orden de PayPal',
    description: 'Crea una orden de pago en PayPal para un pedido específico',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Orden de PayPal creada exitosamente',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Error al crear la orden de PayPal',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Token JWT inválido o expirado',
  })
  async createPayPalOrder(@Request() req, @Body() body: { orderId: string }) {
    // Aquí podrías implementar la lógica para crear una orden de PayPal
    // sin procesar el pago inmediatamente
    return { message: 'PayPal order creation endpoint' };
  }

  // Health check for webhooks
  @Get('webhook/health')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Health check para webhooks',
    description: 'Verifica el estado de los endpoints de webhook',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Estado de webhooks obtenido exitosamente',
  })
  webhookHealthCheck() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      webhooks: {
        paypal: '/api/payments/webhook/paypal',
        stripe: '/api/payments/webhook/stripe',
      },
      environment: process.env.NODE_ENV || 'development',
    };
  }
}
