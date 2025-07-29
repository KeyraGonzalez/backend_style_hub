import { Module } from '@nestjs/common';
import { PasswordService } from './password.service';
import { FileUploadService } from './file-upload.service';
import { EmailService } from '../services/email.service';

@Module({
  providers: [PasswordService, EmailService, FileUploadService],
  exports: [PasswordService, EmailService, FileUploadService],
})
export class UtilsModule {}
