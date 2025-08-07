import { Controller, Post, Get, UseGuards, HttpStatus } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiExcludeEndpoint,
} from '@nestjs/swagger';
import { DevService } from './dev.service';
import { Roles } from '@shared/decorators/roles.decorator';
import { UserRole } from '@core/domain/entities/user.entity';

@ApiTags('dev')
@Controller('dev')
export class DevController {
  constructor(private readonly devService: DevService) {}

  @Post('seed-users')
  async seedUsers() {
    if (process.env.NODE_ENV === 'production') {
      return { message: 'Seeding is disabled in production' };
    }

    const result = await this.devService.seedUsers();
    return {
      message: 'Users seeded successfully',
      data: result,
    };
  }

  @Post('seed-products')
  async seedProducts() {
    if (process.env.NODE_ENV === 'production') {
      return { message: 'Seeding is disabled in production' };
    }

    const result = await this.devService.seedProducts();
    return {
      message: 'Products seeded successfully',
      data: result,
    };
  }

  @Post('seed-all')
  async seedAll() {
    if (process.env.NODE_ENV === 'production') {
      return { message: 'Seeding is disabled in production' };
    }

    const users = await this.devService.seedUsers();
    const products = await this.devService.seedProducts();

    return {
      message: 'All data seeded successfully',
      data: {
        users: users.length,
        products: products.length,
      },
    };
  }

  @Get('stats')
  @UseGuards(AuthGuard('jwt'))
  @Roles(UserRole.ADMIN)
  async getStats() {
    return this.devService.getStats();
  }

  @Post('test-notification')
  @UseGuards(AuthGuard('jwt'))
  async testNotification() {
    if (process.env.NODE_ENV === 'production') {
      return { message: 'Test notifications disabled in production' };
    }

    const result = await this.devService.testNotifications();
    return {
      message: 'Test notifications sent',
      data: result,
    };
  }
}
