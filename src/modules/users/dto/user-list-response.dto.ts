import { ApiProperty } from '@nestjs/swagger';
import { UserResponseDto } from '../../auth/dto/user-response.dto';

export class UserListResponseDto {
  @ApiProperty({
    description: 'Lista de usuarios',
    type: [UserResponseDto],
  })
  users: UserResponseDto[];

  @ApiProperty({
    description: 'Información de paginación',
    example: {
      total: 100,
      page: 1,
      limit: 10,
      pages: 10,
    },
  })
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };

  @ApiProperty({
    description: 'Mensaje de respuesta',
    example: 'Usuarios obtenidos exitosamente',
  })
  message: string;

  @ApiProperty({
    description: 'Código de estado',
    example: 200,
  })
  statusCode: number;
}
