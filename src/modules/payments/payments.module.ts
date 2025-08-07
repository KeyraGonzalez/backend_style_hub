import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { Payment, PaymentSchema } from './entities/payment.entity';
import { Order, OrderSchema } from '@core/domain/entities/order.entity';
import { User, UserSchema } from '@core/domain/entities/user.entity';
import { OrdersModule } from '../orders/orders.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PatternsModule } from '@shared/patterns/patterns.module';

// PayPal Services
import { PayPalService } from './providers/paypal/paypal.service';
import { PayPalWebhookHandler } from './providers/paypal/paypal-webhook.handler';

// Stripe Services
import { StripeService } from './providers/stripe/stripe.service';
import { StripeWebhookHandler } from './providers/stripe/stripe-webhook.handler';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Payment.name, schema: PaymentSchema },
      { name: Order.name, schema: OrderSchema },
      { name: User.name, schema: UserSchema },
    ]),
    OrdersModule,
    NotificationsModule,
    PatternsModule,
  ],
  controllers: [PaymentsController],
  providers: [
    PaymentsService,
    // PayPal Services
    PayPalService,
    PayPalWebhookHandler,
    // Stripe Services
    StripeService,
    StripeWebhookHandler,
  ],
  exports: [PaymentsService, PayPalService, StripeService],
})
export class PaymentsModule {}
