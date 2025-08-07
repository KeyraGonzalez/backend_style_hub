import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Cart } from '@core/domain/entities/cart.entity';
import { Product } from '@core/domain/entities/product.entity';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';

@Injectable()
export class CartService {
  constructor(
    @InjectModel(Cart.name) private cartModel: Model<Cart>,
    @InjectModel(Product.name) private productModel: Model<Product>
  ) {}

  async getCart(userId: string): Promise<Cart> {
    let cart = await this.cartModel
      .findOne({ userId })
      .populate(
        'items.productId',
        'name price images imageUrls stock category brand'
      )
      .exec();

    if (!cart) {
      cart = new this.cartModel({
        userId,
        items: [],
        totalAmount: 0,
        totalItems: 0,
      });
      await cart.save();
    }

    return cart;
  }

  async addToCart(userId: string, addToCartDto: AddToCartDto): Promise<Cart> {
    const { productId, quantity, size, color } = addToCartDto;

    const product = await this.productModel.findById(productId);
    if (!product || !product.isActive) {
      throw new NotFoundException('Product not found');
    }

    if (product.stock < quantity) {
      throw new BadRequestException('Insufficient stock');
    }

    let cart = await this.cartModel.findOne({ userId });
    if (!cart) {
      cart = new this.cartModel({
        userId,
        items: [],
        totalAmount: 0,
        totalItems: 0,
      });
    }

    const existingItemIndex = cart.items.findIndex(
      (item) =>
        item.productId.toString() === productId &&
        (item.size || null) === (size || null) &&
        (item.color || null) === (color || null)
    );

    if (existingItemIndex > -1) {
      cart.items[existingItemIndex].quantity += quantity;
    } else {
      // Crear el item con _id explícito
      const newItem = {
        _id: new Types.ObjectId(),
        productId: product._id,
        quantity,
        size: size || undefined,
        color: color || undefined,
        price: product.discountPrice || product.price,
      };
      cart.items.push(newItem);
    }

    await this.recalculateCart(cart);
    await cart.save();

    return this.getCart(userId);
  }

  async updateCartItem(
    userId: string,
    itemId: string,
    updateCartItemDto: UpdateCartItemDto
  ): Promise<Cart> {
    console.log('=== DEBUG updateCartItem ===');
    console.log('userId:', userId);
    console.log('itemId:', itemId);
    console.log('updateCartItemDto:', updateCartItemDto);

    const cart = await this.cartModel.findOne({ userId });
    if (!cart) {
      throw new NotFoundException('Cart not found');
    }

    console.log('Cart found, items count:', cart.items.length);
    console.log(
      'Cart items:',
      cart.items.map((item) => ({
        _id: item._id?.toString(),
        productId: item.productId.toString(),
        quantity: item.quantity,
      }))
    );

    const itemIndex = cart.items.findIndex(
      (item) => item._id?.toString() === itemId
    );

    console.log('Item index found:', itemIndex);

    if (itemIndex === -1) {
      console.log('Item not found! Looking for itemId:', itemId);
      console.log(
        'Available item IDs:',
        cart.items.map((item) => item._id?.toString())
      );
      throw new NotFoundException('Item not found in cart');
    }

    if (updateCartItemDto.quantity) {
      const product = await this.productModel.findById(
        cart.items[itemIndex].productId
      );
      if (product.stock < updateCartItemDto.quantity) {
        throw new BadRequestException('Insufficient stock');
      }
      cart.items[itemIndex].quantity = updateCartItemDto.quantity;
    }

    if (updateCartItemDto.size) {
      cart.items[itemIndex].size = updateCartItemDto.size;
    }

    if (updateCartItemDto.color) {
      cart.items[itemIndex].color = updateCartItemDto.color;
    }

    await this.recalculateCart(cart);
    await cart.save();

    return this.getCart(userId);
  }

  async removeFromCart(userId: string, itemId: string): Promise<Cart> {
    const cart = await this.cartModel.findOne({ userId });
    if (!cart) {
      throw new NotFoundException('Cart not found');
    }

    cart.items = cart.items.filter((item) => item._id?.toString() !== itemId);

    await this.recalculateCart(cart);
    await cart.save();

    return this.getCart(userId);
  }

  async clearCart(userId: string): Promise<Cart> {
    const cart = await this.cartModel.findOne({ userId });
    if (!cart) {
      throw new NotFoundException('Cart not found');
    }

    cart.items = [];
    cart.totalAmount = 0;
    cart.totalItems = 0;

    await cart.save();
    return cart;
  }

  private async recalculateCart(cart: Cart): Promise<void> {
    let totalAmount = 0;
    let totalItems = 0;

    for (const item of cart.items) {
      totalAmount += item.price * item.quantity;
      totalItems += item.quantity;
    }

    cart.totalAmount = totalAmount;
    cart.totalItems = totalItems;
  }
}
