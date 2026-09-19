import { Module } from '@nestjs/common';
import { RabbitMQModule } from '@golevelup/nestjs-rabbitmq';
import { PublishToRabbitMQHandler } from './rabbitmq-event.handler';
import { CqrsModule } from '@nestjs/cqrs';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    CqrsModule,
    RabbitMQModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        exchanges: [
          {
            name: 'smartbancs',
            type: 'topic',
          },
        ],
        uri: configService.get<string>('RABBITMQ_URL') || 'amqp://localhost:5672',
        connectionInitOptions: { wait: false },
      }),
    }),
  ],
  providers: [PublishToRabbitMQHandler],
  exports: [RabbitMQModule],
})
export class MessagingModule {}
