import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '@shared/decorators/roles.decorator';
import { UserRole } from '@core/domain/entities/user.entity';

@Controller()
export class ApiGatewayController {
  @Get()
  getApiInfo() {
    return {
      message: 'Fashion Store E-commerce API Gateway',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      endpoints: {
        auth: {
          login: 'POST /api/auth/login',
          register: 'POST /api/auth/register',
          profile: 'GET /api/auth/profile',
        },
        products: {
          list: 'GET /api/products',
          details: 'GET /api/products/:id',
          featured: 'GET /api/products/featured',
          category: 'GET /api/products/category/:category',
        },
        cart: {
          get: 'GET /api/cart',
          add: 'POST /api/cart/add',
          update: 'PATCH /api/cart/item/:itemId',
          remove: 'DELETE /api/cart/item/:itemId',
        },
        orders: {
          create: 'POST /api/orders',
          list: 'GET /api/orders',
          details: 'GET /api/orders/:id',
        },
        payments: {
          process: 'POST /api/payments/process',
          refund: 'POST /api/payments/:paymentId/refund',
        },
        notifications: {
          list: 'GET /api/notifications',
          markRead: 'PATCH /api/notifications/:id/read',
        },
      },
    };
  }

  @Get('health')
  healthCheck() {
    return {
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: process.version,
    };
  }

  @Get('protected-health')
  @UseGuards(AuthGuard('jwt'))
  protectedHealthCheck(@Request() req) {
    return {
      status: 'OK - Authenticated',
      user: req.user,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('admin-health')
  @UseGuards(AuthGuard('jwt'))
  @Roles(UserRole.ADMIN)
  adminHealthCheck(@Request() req) {
    return {
      status: 'OK - Admin Access',
      user: req.user,
      timestamp: new Date().toISOString(),
      systemInfo: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        version: process.version,
        platform: process.platform,
      },
    };
  }

  @Get('stats')
  @UseGuards(AuthGuard('jwt'))
  @Roles(UserRole.ADMIN)
  async getSystemStats() {
    return {
      timestamp: new Date().toISOString(),
      system: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        cpuUsage: process.cpuUsage(),
        version: process.version,
        platform: process.platform,
      },
      api: {
        version: '1.0.0',
        environment: process.env.NODE_ENV,
        rateLimit: {
          windowMs: 15 * 60 * 1000, // 15 minutes
          maxRequests: 100,
        },
      },
    };
  }
}