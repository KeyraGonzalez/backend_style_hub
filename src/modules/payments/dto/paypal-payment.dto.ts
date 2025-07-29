import { IsString, IsOptional, IsNotEmpty } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PayPalPaymentDto {
  @ApiProperty({
    description: 'ID de la orden de PayPal aprobada por el usuario',
    example: 'PAYPAL_ORDER_ID_123456789',
  })
  @IsString()
  @IsNotEmpty()
  paypalOrderId: string;

  @ApiPropertyOptional({
    description: 'ID del pagador en PayPal',
    example: 'PAYER_ID_123456789',
  })
  @IsOptional()
  @IsString()
  payerId?: string;

  @ApiPropertyOptional({
    description: 'Token de la transacción',
    example: 'EC-TOKEN123456789',
  })
  @IsOptional()
  @IsString()
  token?: string;
}
