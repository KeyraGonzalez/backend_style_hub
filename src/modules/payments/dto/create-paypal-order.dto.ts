import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePayPalOrderDto {
  @ApiProperty({
    description: 'ID de la orden para crear la orden de PayPal',
    example: '507f1f77bcf86cd799439011',
  })
  @IsString()
  @IsNotEmpty()
  orderId: string;
}
