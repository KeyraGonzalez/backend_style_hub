import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  Delete,
  UseGuards,
  Request,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { SendNotificationDto } from './dto/send-notification.dto';

@ApiTags('notifications')
@Controller('notifications')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth('JWT-auth')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post()
  @ApiOperation({
    summary: 'Crear notificación',
    description: 'Crea una nueva notificación (solo administradores)',
  })
  @ApiBody({ type: CreateNotificationDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Notificación creada exitosamente',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Datos de notificación inválidos',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Token JWT inválido o expirado',
  })
  create(@Body() createNotificationDto: CreateNotificationDto) {
    return this.notificationsService.create(createNotificationDto);
  }

  @Post('send')
  @ApiOperation({
    summary: 'Enviar notificación',
    description: 'Envía una notificación a través de múltiples canales',
  })
  @ApiBody({ type: SendNotificationDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Notificación enviada exitosamente',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Datos de notificación inválidos',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Token JWT inválido o expirado',
  })
  sendNotification(@Body() sendNotificationDto: SendNotificationDto) {
    return this.notificationsService.sendNotification(sendNotificationDto);
  }

  @Get()
  @ApiOperation({
    summary: 'Obtener notificaciones del usuario',
    description: 'Obtiene todas las notificaciones del usuario autenticado',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Número de página',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Elementos por página',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Lista de notificaciones obtenida exitosamente',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Token JWT inválido o expirado',
  })
  findUserNotifications(
    @Request() req,
    @Query('page') page?: number,
    @Query('limit') limit?: number
  ) {
    return this.notificationsService.findUserNotifications(
      req.user.id,
      page,
      limit
    );
  }

  @Get('unread-count')
  @ApiOperation({
    summary: 'Obtener contador de notificaciones no leídas',
    description: 'Obtiene el número de notificaciones no leídas del usuario',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Contador obtenido exitosamente',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Token JWT inválido o expirado',
  })
  getUnreadCount(@Request() req) {
    return this.notificationsService.getUnreadCount(req.user.id);
  }

  @Patch(':id/read')
  @ApiOperation({
    summary: 'Marcar notificación como leída',
    description: 'Marca una notificación específica como leída',
  })
  @ApiParam({ name: 'id', description: 'ID de la notificación' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Notificación marcada como leída exitosamente',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Notificación no encontrada',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Token JWT inválido o expirado',
  })
  markAsRead(@Request() req, @Param('id') id: string) {
    return this.notificationsService.markAsRead(id, req.user.id);
  }

  @Patch('mark-all-read')
  @ApiOperation({
    summary: 'Marcar todas las notificaciones como leídas',
    description: 'Marca todas las notificaciones del usuario como leídas',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Todas las notificaciones marcadas como leídas',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Token JWT inválido o expirado',
  })
  markAllAsRead(@Request() req) {
    return this.notificationsService.markAllAsRead(req.user.id);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Eliminar notificación',
    description: 'Elimina una notificación específica del usuario',
  })
  @ApiParam({ name: 'id', description: 'ID de la notificación' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Notificación eliminada exitosamente',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Notificación no encontrada',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Token JWT inválido o expirado',
  })
  deleteNotification(@Request() req, @Param('id') id: string) {
    return this.notificationsService.deleteNotification(id, req.user.id);
  }

  @Get('stats')
  @ApiOperation({
    summary: 'Obtener estadísticas de notificaciones',
    description: 'Obtiene estadísticas de las notificaciones del usuario',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Estadísticas obtenidas exitosamente',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Token JWT inválido o expirado',
  })
  getNotificationStats(@Request() req) {
    return this.notificationsService.getNotificationStats(req.user.id);
  }
}
