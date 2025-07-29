import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { BaseEntity } from './base.entity';

export enum ProductCategory {
  SHIRTS = 'shirts',
  PANTS = 'pants',
  DRESSES = 'dresses',
  SHOES = 'shoes',
  ACCESSORIES = 'accessories',
  JACKETS = 'jackets',
  UNDERWEAR = 'underwear',
}

export enum ProductSize {
  XS = 'XS',
  S = 'S',
  M = 'M',
  L = 'L',
  XL = 'XL',
  XXL = 'XXL',
}

export enum ProductGender {
  MEN = 'men',
  WOMEN = 'women',
  UNISEX = 'unisex',
}

@Schema({ collection: 'products' })
export class Product extends BaseEntity {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  description: string;

  @Prop({ required: true })
  price: number;

  @Prop({ default: 0 })
  discountPrice?: number;

  @Prop({ required: true })
  sku: string;

  @Prop({ type: String, enum: ProductCategory, required: true })
  category: ProductCategory;

  @Prop({ type: String, enum: ProductGender, required: true })
  gender: ProductGender;

  @Prop({ type: [String], enum: ProductSize })
  availableSizes: ProductSize[];

  @Prop({ type: [String] })
  colors: string[];

  @Prop({ type: [String] })
  images: string[];

  @Prop({ required: true, min: 0 })
  stock: number;

  @Prop({ type: [String] })
  tags: string[];

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: 0 })
  rating: number;

  @Prop({ default: 0 })
  reviewCount: number;

  @Prop()
  brand?: string;

  @Prop()
  material?: string;
}

export const ProductSchema = SchemaFactory.createForClass(Product);