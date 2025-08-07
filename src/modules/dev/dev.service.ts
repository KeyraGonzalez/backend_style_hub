import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { User } from '@core/domain/entities/user.entity';
import { Product } from '@core/domain/entities/product.entity';
import { Order } from '@core/domain/entities/order.entity';
import { Payment } from '../payments/entities/payment.entity';
import { Notification } from '../notifications/entities/notification.entity';
import { TEST_USERS } from '../auth/dto/test-user.dto';
import { TEST_PRODUCTS } from '../products/dto/test-products.dto';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class DevService {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Product.name) private productModel: Model<Product>,
    @InjectModel(Order.name) private orderModel: Model<Order>,
    @InjectModel(Payment.name) private paymentModel: Model<Payment>,
    @InjectModel(Notification.name) private notificationModel: Model<Notification>,
    private notificationsService: NotificationsService,
  ) {}

  async seedUsers() {
    const existingUsers = await this.userModel.find();
    if (existingUsers.length > 0) {
      console.log('Users already exist, skipping seed');
      return existingUsers;
    }

    const users = [];
    for (const userData of TEST_USERS) {
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      
      const user = new this.userModel({
        ...userData,
        password: hashedPassword,
      });
      
      await user.save();
      users.push(user);
      
      console.log(`Created user: ${userData.email}`);
    }

    return users;
  }

  async seedProducts() {
    const existingProducts = await this.productModel.find();
    if (existingProducts.length > 0) {
      console.log('Products already exist, skipping seed');
      return existingProducts;
    }

    const products = [];
    for (const productData of TEST_PRODUCTS) {
      const product = new this.productModel(productData);
      await product.save();
      products.push(product);
      
      console.log(`Created product: ${productData.name}`);
    }

    return products;
  }

  async getStats() {
    const [
      userCount,
      productCount,
      orderCount,
      paymentCount,
      notificationCount,
    ] = await Promise.all([
      this.userModel.countDocuments(),
      this.productModel.countDocuments(),
      this.orderModel.countDocuments(),
      this.paymentModel.countDocuments(),
      this.notificationModel.countDocuments(),
    ]);

    const recentUsers = await this.userModel
      .find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('-password');

    const recentProducts = await this.productModel
      .find()
      .sort({ createdAt: -1 })
      .limit(5);

    const recentOrders = await this.orderModel
      .find()
      .sort({ createdAt: -1 })
      .limit(5);

    return {
      counts: {
        users: userCount,
        products: productCount,
        orders: orderCount,
        payments: paymentCount,
        notifications: notificationCount,
      },
      recent: {
        users: recentUsers,
        products: recentProducts,
        orders: recentOrders,
      },
      timestamp: new Date().toISOString(),
    };
  }

  async testNotifications() {
    // Find a test user
    const testUser = await this.userModel.findOne({ email: 'customer@demo.com' });
    if (!testUser) {
      throw new Error('Test user not found. Please seed users first.');
    }

    const results = [];

    try {
      // Test welcome notification
      await this.notificationsService.sendWelcomeNotification(testUser._id.toString(), {
        firstName: testUser.firstName,
        lastName: testUser.lastName,
        email: testUser.email,
      });
      results.push({ type: 'welcome', status: 'sent' });
    } catch (error) {
      results.push({ type: 'welcome', status: 'failed', error: error.message });
    }

    try {
      // Test order confirmation
      const mockOrderData = {
        orderNumber: 'TEST-ORDER-001',
        totalAmount: 99.99,
        items: [
          {
            productName: 'Test Product',
            quantity: 1,
            unitPrice: 99.99,
            size: 'M',
            color: 'Blue',
          },
        ],
        shippingAddress: {
          firstName: testUser.firstName,
          lastName: testUser.lastName,
          street: '123 Test St',
          city: 'Test City',
          state: 'TS',
          zipCode: '12345',
          country: 'USA',
        },
        customerName: `${testUser.firstName} ${testUser.lastName}`,
        createdAt: new Date(),
      };

      await this.notificationsService.sendOrderConfirmation(testUser._id.toString(), mockOrderData);
      results.push({ type: 'order_confirmation', status: 'sent' });
    } catch (error) {
      results.push({ type: 'order_confirmation', status: 'failed', error: error.message });
    }

    try {
      // Test payment success
      const mockPaymentData = {
        paymentId: 'TEST-PAY-001',
        amount: 99.99,
        orderNumber: 'TEST-ORDER-001',
      };

      await this.notificationsService.sendPaymentSuccess(testUser._id.toString(), mockPaymentData);
      results.push({ type: 'payment_success', status: 'sent' });
    } catch (error) {
      results.push({ type: 'payment_success', status: 'failed', error: error.message });
    }

    return results;
  }
}