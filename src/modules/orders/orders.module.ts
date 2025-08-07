import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { Order, OrderSchema } from '@core/domain/entities/order.entity';
import { Cart, CartSchema } from '@core/domain/entities/cart.entity';
import { Product, ProductSchema } from '@core/domain/entities/product.entity';
import { User, UserSchema } from '@core/domain/entities/user.entity';
import { CartModule } from '../cart/cart.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PatternsModule } from '@shared/patterns/patterns.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Order.name, schema: OrderSchema },
      { name: Cart.name, schema: CartSchema },
      { name: Product.name, schema: ProductSchema },
      { name: User.name, schema: UserSchema },
    ]),
    CartModule,
    NotificationsModule,
    PatternsModule,
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}