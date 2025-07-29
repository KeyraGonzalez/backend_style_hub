import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class UpdateCartItemDto {
  @ApiProperty({
    description: 'Nueva cantidad del producto',
    example: 3,
    minimum: 1,
  })
  @IsNumber()
  @Min(1)
  quantity: number;

  @ApiProperty({
    description: 'Nueva talla del producto',
    example: 'L',
    required: false,
  })
  @IsOptional()
  @IsString()
  size?: string;

  @ApiProperty({
    description: 'Nuevo color del producto',
    example: 'Rojo',
    required: false,
  })
  @IsOptional()
  @IsString()
  color?: string;
}
