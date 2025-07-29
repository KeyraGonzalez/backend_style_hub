import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DevController } from './dev.controller';
import { DevService } from './dev.service';
import { User, UserSchema } from '@core/domain/entities/user.entity';
import { Product, ProductSchema } from '@core/domain/entities/product.entity';
import { Order, OrderSchema } from '@core/domain/entities/order.entity';
import { Payment, PaymentSchema } from '../payments/entities/payment.entity';
import { Notification, NotificationSchema } from '../notifications/entities/notification.entity';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Product.name, schema: ProductSchema },
      { name: Order.name, schema: OrderSchema },
      { name: Payment.name, schema: PaymentSchema },
      { name: Notification.name, schema: NotificationSchema },
    ]),
    NotificationsModule,
  ],
  controllers: [DevController],
  providers: [DevService],
  exports: [DevService],
})
export class DevModule {}