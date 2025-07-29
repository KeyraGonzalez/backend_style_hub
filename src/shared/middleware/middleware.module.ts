import { Module } from '@nestjs/common';
import { LoggingMiddleware } from './logging.middleware';
import { CorsMiddleware } from './cors.middleware';

@Module({
  providers: [LoggingMiddleware, CorsMiddleware],
  exports: [LoggingMiddleware, CorsMiddleware],
})
export class MiddlewareModule {}