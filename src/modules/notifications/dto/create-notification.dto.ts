import { IsString, IsEnum, IsOptional, IsObject, IsDate } from 'class-validator';
import { Type } from 'class-transformer';
import {
  NotificationType,
  NotificationChannel,
} from '../entities/notification.entity';

export class CreateNotificationDto {
  @IsString()
  userId: string;

  @IsEnum(NotificationType)
  type: NotificationType;

  @IsEnum(NotificationChannel)
  channel: NotificationChannel;

  @IsString()
  title: string;

  @IsString()
  message: string;

  @IsOptional()
  @IsObject()
  data?: any;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  scheduledFor?: Date;
}