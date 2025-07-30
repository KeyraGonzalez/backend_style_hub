import { Module } from '@nestjs/common';
import { MiddlewareModule } from './middleware/middleware.module';
import { UtilsModule } from './utils/utils.module';
import { PatternsModule } from './patterns/patterns.module';
import { CloudinaryService } from './services/cloudinary.service';
import { CloudinaryProvider } from './providers/cloudinary.provider';

@Module({
  imports: [MiddlewareModule, UtilsModule, PatternsModule],
  providers: [CloudinaryService, CloudinaryProvider],
  exports: [MiddlewareModule, UtilsModule, PatternsModule, CloudinaryService],
})
export class SharedModule {}
