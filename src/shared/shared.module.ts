import { Module } from '@nestjs/common';
import { MiddlewareModule } from './middleware/middleware.module';
import { UtilsModule } from './utils/utils.module';
import { PatternsModule } from './patterns/patterns.module';

@Module({
  imports: [MiddlewareModule, UtilsModule, PatternsModule],
  exports: [MiddlewareModule, UtilsModule, PatternsModule],
})
export class SharedModule {}