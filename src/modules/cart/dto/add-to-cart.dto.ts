import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, Min } from 'class-validator';

export class AddToCartDto {
  @ApiProperty({
    description: 'ID del producto a agregar al carrito',
    example: '507f1f77bcf86cd799439011',
  })
  @IsString()
  productId: string;

  @ApiProperty({
    description: 'Cantidad del producto',
    example: 2,
    minimum: 1,
  })
  @IsNumber()
  @Min(1)
  quantity: number;

  @ApiProperty({
    description: 'Talla seleccionada del producto',
    example: 'M',
    required: false,
  })
  @IsOptional()
  @IsString()
  size?: string;

  @ApiProperty({
    description: 'Color seleccionado del producto',
    example: 'Azul',
    required: false,
  })
  @IsOptional()
  @IsString()
  color?: string;
}
