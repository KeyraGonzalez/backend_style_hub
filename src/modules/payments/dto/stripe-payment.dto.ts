import { IsString, IsOptional, IsNotEmpty } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class StripePaymentDto {
  @ApiProperty({
    description: 'ID del método de pago de Stripe',
    example: 'pm_1234567890abcdef',
  })
  @IsString()
  @IsNotEmpty()
  paymentMethodId: string;

  @ApiPropertyOptional({
    description: 'ID del cliente en Stripe (si existe)',
    example: 'cus_1234567890abcdef',
  })
  @IsOptional()
  @IsString()
  customerId?: string;

  @ApiPropertyOptional({
    description: 'Indica si se debe guardar el método de pago para uso futuro',
    example: false,
  })
  @IsOptional()
  savePaymentMethod?: boolean;
}
