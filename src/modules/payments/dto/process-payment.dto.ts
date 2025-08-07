import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsEnum,
  IsOptional,
  IsNotEmpty,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PayPalPaymentDto } from './paypal-payment.dto';
import { StripePaymentDto } from './stripe-payment.dto';

export enum PaymentMethod {
  PAYPAL = 'paypal',
  STRIPE = 'stripe',
}

export class ProcessPaymentDto {
  @ApiProperty({
    description: 'ID del pedido a pagar',
    example: '507f1f77bcf86cd799439011',
  })
  @IsString()
  @IsNotEmpty()
  orderId: string;

  @ApiProperty({
    description: 'Método de pago',
    enum: PaymentMethod,
    example: PaymentMethod.STRIPE,
  })
  @IsEnum(PaymentMethod)
  method: PaymentMethod;

  @ApiPropertyOptional({
    description: 'Detalles específicos del pago según el método seleccionado',
    oneOf: [
      { $ref: '#/components/schemas/PayPalPaymentDto' },
      { $ref: '#/components/schemas/StripePaymentDto' },
    ],
  })
  @IsOptional()
  paymentDetails?: PayPalPaymentDto | StripePaymentDto | any;
}
