import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
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
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';

@ApiTags('orders')
@Controller('orders')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth('JWT-auth')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @ApiOperation({
    summary: 'Crear nuevo pedido',
    description: 'Crea un nuevo pedido basado en el carrito del usuario',
  })
  @ApiBody({ type: CreateOrderDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Pedido creado exitosamente',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Datos del pedido inválidos',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Token JWT inválido o expirado',
  })
  createOrder(@Request() req, @Body() createOrderDto: CreateOrderDto) {
    return this.ordersService.createOrder(req.user.id, createOrderDto);
  }

  @Get()
  @ApiOperation({
    summary: 'Obtener pedidos del usuario',
    description: 'Obtiene todos los pedidos del usuario autenticado',
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
    description: 'Lista de pedidos obtenida exitosamente',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Token JWT inválido o expirado',
  })
  findUserOrders(
    @Request() req,
    @Query('page') page?: number,
    @Query('limit') limit?: number
  ) {
    return this.ordersService.findUserOrders(req.user.id, page, limit);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Obtener pedido por ID',
    description: 'Obtiene un pedido específico del usuario',
  })
  @ApiParam({ name: 'id', description: 'ID del pedido' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Pedido obtenido exitosamente',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Pedido no encontrado',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Token JWT inválido o expirado',
  })
  findOne(@Request() req, @Param('id') id: string) {
    return this.ordersService.findOne(id, req.user.id);
  }

  @Patch(':id/status')
  @ApiOperation({
    summary: 'Actualizar estado del pedido',
    description: 'Actualiza el estado de un pedido (solo administradores)',
  })
  @ApiParam({ name: 'id', description: 'ID del pedido' })
  @ApiBody({ type: UpdateOrderStatusDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Estado del pedido actualizado exitosamente',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Datos de actualización inválidos',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Pedido no encontrado',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Token JWT inválido o expirado',
  })
  updateOrderStatus(
    @Param('id') id: string,
    @Body() updateOrderStatusDto: UpdateOrderStatusDto
  ) {
    return this.ordersService.updateOrderStatus(id, updateOrderStatusDto);
  }

  @Delete(':id/cancel')
  @ApiOperation({
    summary: 'Cancelar pedido',
    description: 'Cancela un pedido del usuario',
  })
  @ApiParam({ name: 'id', description: 'ID del pedido a cancelar' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Pedido cancelado exitosamente',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'El pedido no puede ser cancelado',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Pedido no encontrado',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Token JWT inválido o expirado',
  })
  cancelOrder(@Request() req, @Param('id') id: string) {
    return this.ordersService.cancelOrder(id, req.user.id);
  }
}
