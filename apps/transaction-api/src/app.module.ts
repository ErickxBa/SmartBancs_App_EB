import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RedisModule } from '@liaoliaots/nestjs-redis';
import { TransactionsModule } from './transactions/transactions.module';
import { MessagingModule } from './messaging/messaging.module';
import { AccountsModule } from './accounts/accounts.module';
import { ObservabilityModule } from './observability/observability.module';

@Module({
    imports: [
        ConfigModule.forRoot({
            envFilePath: '../../.env',
            isGlobal: true,
        }),
        RedisModule.forRootAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (configService: ConfigService) => ({
                config: {
                    url: configService.get<string>('REDIS_URL') || 'redis://localhost:6379',
                },
            }),
        }),
        TypeOrmModule.forRoot({
            type: 'postgres',
            url: process.env.DATABASE_URL || 'postgres://app_user:app_password@localhost:5432/smartbancs',
            autoLoadEntities: true,
            synchronize: false, // Prod: El esquema se controla init.sql    
        }),
        AccountsModule,
        TransactionsModule,
        MessagingModule,
        ObservabilityModule,
    ],
})
export class AppModule { }