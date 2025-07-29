import {
  IsEmail,
  IsString,
  IsEnum,
  IsOptional,
  IsBoolean,
  MinLength,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '@core/domain/entities/user.entity';

export class UpdateUserDto {
  @ApiPropertyOptional({
    description: 'Correo electrónico del usuario',
    example: 'usuario@ejemplo.com',
    format: 'email',
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({
    description: 'Nueva contraseña del usuario (mínimo 6 caracteres)',
    example: 'nuevaContraseña123',
    minLength: 6,
  })
  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;

  @ApiPropertyOptional({
    description: 'Nombre del usuario',
    example: 'Juan',
  })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional({
    description: 'Apellido del usuario',
    example: 'Pérez',
  })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiPropertyOptional({
    description: 'Rol del usuario en el sistema',
    enum: UserRole,
    example: UserRole.CUSTOMER,
  })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @ApiPropertyOptional({
    description: 'Número de teléfono del usuario',
    example: '+1234567890',
  })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({
    description: 'Dirección del usuario',
    type: 'object',
    properties: {
      street: { type: 'string', example: 'Calle Principal 123' },
      city: { type: 'string', example: 'Madrid' },
      state: { type: 'string', example: 'Madrid' },
      zipCode: { type: 'string', example: '28001' },
      country: { type: 'string', example: 'España' },
    },
  })
  @IsOptional()
  address?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };

  @ApiPropertyOptional({
    description: 'Estado activo del usuario',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
