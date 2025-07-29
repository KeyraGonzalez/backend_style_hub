import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { Notification, NotificationSchema } from './entities/notification.entity';
import { User, UserSchema } from '@core/domain/entities/user.entity';
import { EmailService } from '@shared/services/email.service';
import { SMSService } from '@shared/services/sms.service';
import { PushNotificationService } from '@shared/services/push-notification.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Notification.name, schema: NotificationSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    EmailService,
    SMSService,
    PushNotificationService,
  ],
  exports: [NotificationsService],
})
export class NotificationsModule {}