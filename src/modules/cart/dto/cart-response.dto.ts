import { ApiProperty } from '@nestjs/swagger';

export class CartItemResponseDto {
  @ApiProperty({
    description: 'ID del item en el carrito',
    example: '507f1f77bcf86cd799439011',
  })
  _id: string;

  @ApiProperty({
    description: 'ID del producto',
    example: '507f1f77bcf86cd799439012',
  })
  productId: string;

  @ApiProperty({
    description: 'Nombre del producto',
    example: 'Camiseta Básica',
  })
  name: string;

  @ApiProperty({
    description: 'Precio del producto',
    example: 29.99,
  })
  price: number;

  @ApiProperty({
    description: 'Cantidad del producto en el carrito',
    example: 2,
  })
  quantity: number;

  @ApiProperty({
    description: 'Talla seleccionada',
    example: 'M',
    required: false,
  })
  size?: string;

  @ApiProperty({
    description: 'Color seleccionado',
    example: 'Azul',
    required: false,
  })
  color?: string;
}

export class CartResponseDto {
  @ApiProperty({
    description: 'ID del carrito',
    example: '507f1f77bcf86cd799439013',
  })
  _id: string;

  @ApiProperty({
    description: 'ID del usuario propietario del carrito',
    example: '507f1f77bcf86cd799439014',
  })
  userId: string;

  @ApiProperty({
    description: 'Items en el carrito',
    type: [CartItemResponseDto],
  })
  items: CartItemResponseDto[];

  @ApiProperty({
    description: 'Cantidad total de items',
    example: 3,
  })
  totalItems: number;

  @ApiProperty({
    description: 'Precio total del carrito',
    example: 89.97,
  })
  totalPrice: number;

  @ApiProperty({
    description: 'Fecha de creación del carrito',
    example: '2024-01-15T10:30:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Fecha de última actualización',
    example: '2024-01-15T10:30:00.000Z',
  })
  updatedAt: Date;
}
