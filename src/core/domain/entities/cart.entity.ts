import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { BaseEntity } from './base.entity';
import { ProductSize } from './product.entity';

@Schema()
export class CartItem {
  _id?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Product', required: true })
  productId: Types.ObjectId;

  @Prop({ required: true, min: 1 })
  quantity: number;

  @Prop({
    type: String,
    required: false,
  })
  size?: string;

  @Prop()
  color?: string;

  @Prop({ required: true })
  price: number;
}

export const CartItemSchema = SchemaFactory.createForClass(CartItem);

@Schema({ collection: 'carts' })
export class Cart extends BaseEntity {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ type: [CartItemSchema], default: [] })
  items: CartItem[];

  @Prop({ default: 0 })
  totalAmount: number;

  @Prop({ default: 0 })
  totalItems: number;
}

export const CartSchema = SchemaFactory.createForClass(Cart);
