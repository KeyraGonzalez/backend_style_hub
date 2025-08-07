import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
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
} from '@nestjs/swagger';
import { CartService } from './cart.service';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';

@ApiTags('cart')
@Controller('cart')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth('JWT-auth')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  @ApiOperation({
    summary: 'Obtener carrito del usuario',
    description: 'Obtiene el carrito de compras del usuario autenticado',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Carrito obtenido exitosamente',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Token JWT inválido o expirado',
  })
  async getCart(@Request() req) {
    const cart = await this.cartService.getCart(req.user.id);
    return {
      success: true,
      data: cart,
    };
  }

  @Post('add')
  @ApiOperation({
    summary: 'Agregar producto al carrito',
    description: 'Agrega un producto al carrito del usuario autenticado',
  })
  @ApiBody({ type: AddToCartDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Producto agregado al carrito exitosamente',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Datos del producto inválidos',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Producto no encontrado',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Token JWT inválido o expirado',
  })
  async addToCart(@Request() req, @Body() addToCartDto: AddToCartDto) {
    const cart = await this.cartService.addToCart(req.user.id, addToCartDto);
    return {
      success: true,
      data: cart,
    };
  }

  @Patch('item/:itemId')
  @ApiOperation({
    summary: 'Actualizar item del carrito',
    description: 'Actualiza la cantidad de un item específico en el carrito',
  })
  @ApiParam({ name: 'itemId', description: 'ID del item en el carrito' })
  @ApiBody({ type: UpdateCartItemDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Item del carrito actualizado exitosamente',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Datos de actualización inválidos',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Item no encontrado en el carrito',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Token JWT inválido o expirado',
  })
  async updateCartItem(
    @Request() req,
    @Param('itemId') itemId: string,
    @Body() updateCartItemDto: UpdateCartItemDto
  ) {
    const cart = await this.cartService.updateCartItem(
      req.user.id,
      itemId,
      updateCartItemDto
    );
    return {
      success: true,
      data: cart,
    };
  }

  @Delete('item/:itemId')
  @ApiOperation({
    summary: 'Eliminar item del carrito',
    description: 'Elimina un item específico del carrito',
  })
  @ApiParam({ name: 'itemId', description: 'ID del item en el carrito' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Item eliminado del carrito exitosamente',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Item no encontrado en el carrito',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Token JWT inválido o expirado',
  })
  async removeFromCart(@Request() req, @Param('itemId') itemId: string) {
    const cart = await this.cartService.removeFromCart(req.user.id, itemId);
    return {
      success: true,
      data: cart,
    };
  }

  @Delete('clear')
  @ApiOperation({
    summary: 'Vaciar carrito',
    description: 'Elimina todos los items del carrito del usuario',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Carrito vaciado exitosamente',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Token JWT inválido o expirado',
  })
  async clearCart(@Request() req) {
    const cart = await this.cartService.clearCart(req.user.id);
    return {
      success: true,
      data: cart,
    };
  }

  @Get('debug')
  @ApiOperation({
    summary: 'Debug carrito',
    description: 'Información de depuración del carrito del usuario',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Información de debug obtenida',
  })
  async debugCart(@Request() req) {
    const cart = await this.cartService.getCart(req.user.id);
    return {
      success: true,
      data: {
        userId: req.user.id,
        cartId: cart._id,
        itemsCount: cart.items.length,
        totalAmount: cart.totalAmount,
        totalItems: cart.totalItems,
        items: cart.items.map((item) => ({
          _id: item._id,
          productId: item.productId,
          quantity: item.quantity,
          price: item.price,
          size: item.size,
          color: item.color,
        })),
        isEmpty: cart.items.length === 0,
      },
    };
  }
}
