import { ApiProperty } from '@nestjs/swagger';

export class AuthResponseDto {
  @ApiProperty({
    description: 'Token JWT para autenticación',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  access_token: string;

  @ApiProperty({
    description: 'Información del usuario autenticado',
    type: 'object',
  })
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
  };

  @ApiProperty({
    description: 'Mensaje de respuesta',
    example: 'Login exitoso',
  })
  message: string;

  @ApiProperty({
    description: 'Código de estado',
    example: 200,
  })
  statusCode: number;
}
