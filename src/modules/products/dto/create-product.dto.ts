import {
  IsString,
  IsNumber,
  IsEnum,
  IsOptional,
  IsArray,
  IsBoolean,
  Min,
  IsNotEmpty,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProductCategory } from '@core/domain/entities/product.entity';

export class CreateProductDto {
  @ApiProperty({
    description: 'Nombre del producto',
    example: 'Camiseta Básica Premium',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'Descripción detallada del producto',
    example: 'Camiseta de algodón 100% premium, cómoda y duradera',
  })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({
    description: 'Precio del producto',
    example: 29.99,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return Number.parseFloat(value);
    }
    return value;
  })
  price: number;

  @ApiPropertyOptional({
    description: 'Precio con descuento',
    example: 24.99,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return Number.parseFloat(value);
    }
    return value;
  })
  discountPrice?: number;

  @ApiProperty({
    description: 'Categoría del producto',
    enum: ProductCategory,
    example: ProductCategory.SHIRTS,
  })
  @IsEnum(ProductCategory)
  category: ProductCategory;

  @ApiPropertyOptional({
    description: 'Marca del producto',
    example: 'Nike',
  })
  @IsOptional()
  @IsString()
  brand?: string;

  @ApiProperty({
    description: 'Cantidad en stock',
    example: 100,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return Number.parseInt(value, 10);
    }
    return value;
  })
  stock: number;

  @ApiPropertyOptional({
    description: 'Tallas disponibles',
    example: ['S', 'M', 'L', 'XL'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return [value];
    }
    if (Array.isArray(value)) {
      return value;
    }
    return [];
  })
  availableSizes?: string[];

  @ApiPropertyOptional({
    description: 'Colores disponibles',
    example: ['red', 'blue', 'black', 'white'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return [value];
    }
    if (Array.isArray(value)) {
      return value;
    }
    return [];
  })
  colors?: string[];

  @ApiPropertyOptional({
    description: 'Género objetivo',
    example: 'unisex',
    enum: ['men', 'women', 'unisex'],
  })
  @IsOptional()
  @IsString()
  gender?: string;

  @ApiPropertyOptional({
    description: 'URLs de imágenes del producto',
    example: [
      'https://ejemplo.com/imagen1.jpg',
      'https://ejemplo.com/imagen2.jpg',
    ],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @ApiPropertyOptional({
    description: 'Producto destacado',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value === 'true';
    }
    return value;
  })
  featured?: boolean;

  @ApiPropertyOptional({
    description: 'Etiquetas del producto',
    example: ['casual', 'comfortable', 'cotton'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return [value];
    }
    if (Array.isArray(value)) {
      return value;
    }
    return [];
  })
  tags?: string[];

  @ApiPropertyOptional({
    description: 'Material del producto',
    example: '100% Algodón',
  })
  @IsOptional()
  @IsString()
  material?: string;

  @ApiPropertyOptional({
    description: 'SKU del producto',
    example: 'SHIRT-001-M-BLUE',
  })
  @IsOptional()
  @IsString()
  sku?: string;

  @ApiPropertyOptional({
    description: 'Peso del producto en gramos',
    example: 200,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return Number.parseInt(value, 10);
    }
    return value;
  })
  weight?: number;

  @ApiPropertyOptional({
    description: 'Dimensiones del producto',
    type: 'object',
    properties: {
      length: { type: 'number', example: 30 },
      width: { type: 'number', example: 20 },
      height: { type: 'number', example: 2 },
    },
  })
  @IsOptional()
  dimensions?: {
    length: number;
    width: number;
    height: number;
  };
}
