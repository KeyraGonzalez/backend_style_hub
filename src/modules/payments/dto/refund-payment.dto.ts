import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class RefundPaymentDto {
  @ApiProperty({
    description: 'Monto a reembolsar (opcional, por defecto el monto total)',
    example: 50.0,
    minimum: 0.01,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  amount?: number;

  @ApiProperty({
    description: 'Razón del reembolso',
    example: 'Producto defectuoso',
  })
  @IsString()
  reason: string;

  @ApiProperty({
    description: 'Notas adicionales sobre el reembolso',
    example: 'Cliente reportó problema con la calidad del producto',
    required: false,
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
