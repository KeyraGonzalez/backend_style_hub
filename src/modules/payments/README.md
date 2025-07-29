# Módulo de Pagos - Moda Elegante

Este módulo maneja todos los pagos de la aplicación usando PayPal y Stripe como proveedores de pago.

## Estructura del Módulo

```
payments/
├── providers/
│   ├── paypal/
│   │   ├── paypal.service.ts          # Servicio principal de PayPal
│   │   └── paypal-webhook.handler.ts  # Manejador de webhooks de PayPal
│   └── stripe/
│       ├── stripe.service.ts          # Servicio principal de Stripe
│       └── stripe-webhook.handler.ts  # Manejador de webhooks de Stripe
├── dto/
│   ├── process-payment.dto.ts         # DTO principal para procesar pagos
│   ├── paypal-payment.dto.ts          # DTO específico para PayPal
│   ├── stripe-payment.dto.ts          # DTO específico para Stripe
│   └── refund-payment.dto.ts          # DTO para reembolsos
├── entities/
│   └── payment.entity.ts             # Entidad de pago
├── payments.controller.ts             # Controlador principal
├── payments.service.ts                # Servicio principal
└── payments.module.ts                 # Módulo de pagos
```

## Configuración

### Variables de Entorno

```bash
# PayPal Configuration
PAYPAL_CLIENT_ID=your-paypal-client-id
PAYPAL_CLIENT_SECRET=your-paypal-client-secret
PAYPAL_API_URL=https://api-m.sandbox.paypal.com  # Para sandbox
PAYPAL_WEBHOOK_ID=your-paypal-webhook-id

# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_your-stripe-secret-key
STRIPE_PUBLISHABLE_KEY=pk_test_your-stripe-publishable-key
STRIPE_WEBHOOK_SECRET=whsec_your-stripe-webhook-secret

# Frontend URL
FRONTEND_URL=http://localhost:3001
```

### Para Producción

- PayPal: Cambiar `PAYPAL_API_URL` a `https://api-m.paypal.com`
- Stripe: Usar claves `sk_live_` y `pk_live_`

## Uso

### Procesar un Pago con PayPal

```typescript
// 1. Crear orden de PayPal (frontend)
const paypalOrder = await paypalService.createOrder({
  amount: 99.99,
  currency: 'USD',
  orderId: 'ORDER_123',
});

// 2. Usuario aprueba el pago en PayPal

// 3. Procesar el pago (backend)
const payment = await paymentsService.processPayment(userId, {
  orderId: 'ORDER_123',
  method: PaymentMethod.PAYPAL,
  paymentDetails: {
    paypalOrderId: 'PAYPAL_ORDER_ID',
    payerId: 'PAYER_ID',
  },
});
```

### Procesar un Pago con Stripe

```typescript
// 1. Crear Payment Intent y confirmar (frontend con Stripe Elements)

// 2. Procesar el pago (backend)
const payment = await paymentsService.processPayment(userId, {
  orderId: 'ORDER_123',
  method: PaymentMethod.STRIPE,
  paymentDetails: {
    paymentMethodId: 'pm_1234567890',
  },
});
```

### Procesar un Reembolso

```typescript
const refund = await paymentsService.refundPayment('PAY123456', {
  amount: 50.0, // Opcional, por defecto reembolsa el monto total
  reason: 'Cliente solicitó reembolso',
});
```

## Webhooks

### PayPal Webhooks

Los siguientes eventos son manejados automáticamente:

- `CHECKOUT.ORDER.APPROVED` - Orden aprobada
- `PAYMENT.CAPTURE.COMPLETED` - Pago completado
- `PAYMENT.CAPTURE.DENIED` - Pago denegado
- `PAYMENT.CAPTURE.PENDING` - Pago pendiente
- `PAYMENT.CAPTURE.REFUNDED` - Pago reembolsado
- `PAYMENT.CAPTURE.REVERSED` - Pago revertido (chargeback)

### Stripe Webhooks

Los siguientes eventos son manejados automáticamente:

- `payment_intent.succeeded` - Pago exitoso
- `payment_intent.payment_failed` - Pago fallido
- `payment_intent.requires_action` - Requiere acción adicional (3D Secure)
- `payment_intent.canceled` - Pago cancelado
- `charge.dispute.created` - Disputa creada
- `refund.created` - Reembolso creado

## Estados de Pago

```typescript
enum PaymentStatus {
  PENDING = 'pending', // Pago pendiente
  PROCESSING = 'processing', // Procesando pago
  COMPLETED = 'completed', // Pago completado
  FAILED = 'failed', // Pago fallido
  CANCELLED = 'cancelled', // Pago cancelado
  REFUNDED = 'refunded', // Pago reembolsado
}
```

## Notificaciones

El sistema envía automáticamente notificaciones por:

- Email
- SMS (si está configurado)
- Push notifications (si está configurado)

Para los siguientes eventos:

- Pago exitoso
- Pago fallido
- Reembolso procesado

## Seguridad

- Todas las comunicaciones con los proveedores de pago usan HTTPS
- Los webhooks son verificados usando las firmas proporcionadas por cada proveedor
- Los datos sensibles de pago no se almacenan en la base de datos
- Se implementa rate limiting en los endpoints de pago

## Testing

### PayPal Sandbox

- Usar `https://api-m.sandbox.paypal.com` como URL base
- Crear cuentas de prueba en PayPal Developer Dashboard
- Usar tarjetas de prueba proporcionadas por PayPal

### Stripe Test Mode

- Usar claves `sk_test_` y `pk_test_`
- Usar números de tarjeta de prueba de Stripe:
  - `4242424242424242` - Visa exitosa
  - `4000000000000002` - Tarjeta declinada
  - `4000000000003220` - Requiere 3D Secure

## Monitoreo

- Todos los eventos importantes se registran usando el Logger de NestJS
- Los errores se capturan y reportan apropiadamente
- Los webhooks incluyen manejo de errores robusto

## Soporte

Para problemas relacionados con pagos:

1. Verificar logs del servidor
2. Revisar configuración de variables de entorno
3. Verificar estado de webhooks en los dashboards de PayPal/Stripe
4. Consultar documentación oficial de los proveedores
