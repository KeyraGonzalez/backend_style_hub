import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Order, OrderStatus, PaymentStatus } from '@core/domain/entities/order.entity';
import { Cart } from '@core/domain/entities/cart.entity';
import { Product } from '@core/domain/entities/product.entity';
import { User } from '@core/domain/entities/user.entity';
import { CartService } from '../cart/cart.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { EventHandlerService } from '@shared/patterns/event-handler.service';

@Injectable()
export class OrdersService {
  constructor(
    @InjectModel(Order.name) private orderModel: Model<Order>,
    @InjectModel(Cart.name) private cartModel: Model<Cart>,
    @InjectModel(Product.name) private productModel: Model<Product>,
    @InjectModel(User.name) private userModel: Model<User>,
    private cartService: CartService,
    private notificationsService: NotificationsService,
    private eventHandlerService: EventHandlerService,
  ) {}

  async createOrder(userId: string, createOrderDto: CreateOrderDto): Promise<Order> {
    const cart = await this.cartModel
      .findOne({ userId })
      .populate('items.productId')
      .exec();

    if (!cart || cart.items.length === 0) {
      throw new BadRequestException('Cart is empty');
    }

    for (const item of cart.items) {
      const product = await this.productModel.findById(item.productId);
      if (!product || product.stock < item.quantity) {
        throw new BadRequestException(
          `Insufficient stock for product: ${product?.name || 'Unknown'}`,
        );
      }
    }

    const orderNumber = await this.generateOrderNumber();

    const subtotal = cart.totalAmount;
    const tax = subtotal * 0.1; // 10% tax
    const shippingCost = subtotal > 100 ? 0 : 10; // Free shipping over $100
    const totalAmount = subtotal + tax + shippingCost;

    const orderItems = cart.items.map((item: any) => ({
      productId: item.productId._id,
      productName: item.productId.name,
      quantity: item.quantity,
      size: item.size,
      color: item.color,
      unitPrice: item.price,
      totalPrice: item.price * item.quantity,
    }));

    // Create order
    const order = new this.orderModel({
      orderNumber,
      userId,
      items: orderItems,
      subtotal,
      tax,
      shippingCost,
      totalAmount,
      shippingAddress: createOrderDto.shippingAddress,
      notes: createOrderDto.notes,
    });

    await order.save();

    // Get user data for notifications
    const user = await this.userModel.findById(userId);

    // Send order confirmation notifications
    try {
      const orderData = {
        ...order.toObject(),
        customerName: user ? `${user.firstName} ${user.lastName}` : 'Customer',
        customerEmail: user?.email,
        customerPhone: user?.phone,
      };

      await this.notificationsService.sendOrderConfirmation(userId, orderData);

      // Emit order created event
      this.eventHandlerService.emitOrderCreated({
        orderId: order._id.toString(),
        userId,
        orderData,
      });
    } catch (error) {
      console.error('Failed to send order confirmation notification:', error);
      // Don't fail order creation if notification fails
    }

    // Update product stock
    for (const item of cart.items) {
      await this.productModel.findByIdAndUpdate(
        item.productId,
        { $inc: { stock: -item.quantity } },
      );
    }

    // Clear cart
    await this.cartService.clearCart(userId);

    return order;
  }

  async findUserOrders(userId: string, page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      this.orderModel
        .find({ userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.orderModel.countDocuments({ userId }),
    ]);

    return {
      orders,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string, userId?: string): Promise<Order> {
    const filter: any = { _id: id };
    if (userId) {
      filter.userId = userId;
    }

    const order = await this.orderModel.findOne(filter);
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return order;
  }

  async updateOrderStatus(
    id: string,
    updateOrderStatusDto: UpdateOrderStatusDto,
  ): Promise<Order> {
    const order = await this.orderModel.findByIdAndUpdate(
      id,
      updateOrderStatusDto,
      { new: true },
    );

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return order;
  }

  async cancelOrder(id: string, userId: string): Promise<Order> {
    const order = await this.orderModel.findOne({ _id: id, userId });
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.status !== OrderStatus.PENDING && order.status !== OrderStatus.CONFIRMED) {
      throw new BadRequestException('Order cannot be cancelled');
    }

    // Restore product stock
    for (const item of order.items) {
      await this.productModel.findByIdAndUpdate(
        item.productId,
        { $inc: { stock: item.quantity } },
      );
    }

    order.status = OrderStatus.CANCELLED;
    await order.save();

    return order;
  }

  private async generateOrderNumber(): Promise<string> {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    
    const count = await this.orderModel.countDocuments({
      createdAt: {
        $gte: new Date(date.getFullYear(), date.getMonth(), date.getDate()),
        $lt: new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1),
      },
    });

    const orderNumber = `ORD${year}${month}${day}${(count + 1).toString().padStart(4, '0')}`;
    return orderNumber;
  }
}