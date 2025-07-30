import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  Product,
  ProductCategory,
  ProductGender,
  ProductImage,
} from '@core/domain/entities/product.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductFilterDto } from './dto/product-filter.dto';

@Injectable()
export class ProductsService {
  constructor(
    @InjectModel(Product.name) private productModel: Model<Product>
  ) {}

  async create(createProductDto: CreateProductDto): Promise<Product> {
    const product = new this.productModel(createProductDto);
    return product.save();
  }

  async findAll(filterDto: ProductFilterDto = {}) {
    const {
      category,
      gender,
      minPrice,
      maxPrice,
      size,
      color,
      brand,
      search,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = filterDto;

    const filter: any = { isActive: true, isDeleted: false };

    // Apply filters
    if (category) filter.category = category;
    if (gender) filter.gender = gender;
    if (brand) filter.brand = new RegExp(brand, 'i');
    if (size) filter.availableSizes = { $in: [size] };
    if (color) filter.colors = { $in: [color] };

    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = minPrice;
      if (maxPrice) filter.price.$lte = maxPrice;
    }

    if (search) {
      filter.$or = [
        { name: new RegExp(search, 'i') },
        { description: new RegExp(search, 'i') },
        { tags: { $in: [new RegExp(search, 'i')] } },
      ];
    }

    const skip = (page - 1) * limit;
    const sortObj: Record<string, 1 | -1> = {
      [sortBy]: sortOrder === 'desc' ? -1 : 1,
    };

    const [products, total] = await Promise.all([
      this.productModel
        .find(filter)
        .sort(sortObj)
        .skip(skip)
        .limit(limit)
        .exec(),
      this.productModel.countDocuments(filter),
    ]);

    return {
      products,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string): Promise<Product> {
    const product = await this.productModel.findById(id);
    if (!product || !product.isActive || product.isDeleted) {
      throw new NotFoundException('Product not found');
    }
    return product;
  }

  async findByCategory(category: ProductCategory): Promise<Product[]> {
    return this.productModel.find({
      category,
      isActive: true,
      isDeleted: false,
    });
  }

  async findFeatured(limit: number = 10): Promise<Product[]> {
    return this.productModel
      .find({ isActive: true, isDeleted: false })
      .sort({ rating: -1, reviewCount: -1 })
      .limit(limit);
  }

  async update(
    id: string,
    updateProductDto: UpdateProductDto
  ): Promise<Product> {
    const product = await this.productModel.findByIdAndUpdate(
      id,
      updateProductDto,
      { new: true }
    );
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    return product;
  }

  async remove(id: string): Promise<void> {
    const result = await this.productModel.findByIdAndUpdate(
      id,
      { isDeleted: true, isActive: false },
      { new: true }
    );
    if (!result) {
      throw new NotFoundException('Product not found');
    }
  }

  async updateStock(id: string, quantity: number): Promise<Product> {
    const product = await this.productModel.findByIdAndUpdate(
      id,
      { $inc: { stock: -quantity } },
      { new: true }
    );
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    return product;
  }

  async addImage(
    id: string,
    imageUrl: string,
    publicId: string
  ): Promise<Product> {
    const imageData = { url: imageUrl, publicId };
    const product = await this.productModel.findByIdAndUpdate(
      id,
      { $push: { images: imageData } },
      { new: true }
    );
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    return product;
  }

  async addImages(
    id: string,
    imageUrls: string[],
    publicIds: string[]
  ): Promise<Product> {
    if (imageUrls.length !== publicIds.length) {
      throw new Error(
        'Image URLs and public IDs arrays must have the same length'
      );
    }

    const imageData = imageUrls.map((url, index) => ({
      url,
      publicId: publicIds[index],
    }));

    const product = await this.productModel.findByIdAndUpdate(
      id,
      { $push: { images: { $each: imageData } } },
      { new: true }
    );
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    return product;
  }

  async removeImage(id: string, imageUrl: string): Promise<Product> {
    const product = await this.productModel.findByIdAndUpdate(
      id,
      { $pull: { images: { url: imageUrl } } },
      { new: true }
    );
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    return product;
  }

  async removeImageByPublicId(id: string, publicId: string): Promise<Product> {
    const product = await this.productModel.findByIdAndUpdate(
      id,
      { $pull: { images: { publicId } } },
      { new: true }
    );
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    return product;
  }
}
