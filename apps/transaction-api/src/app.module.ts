import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { TransactionsModule } from './transactions/transactions.module';
import { MessagingModule } from './messaging/messaging.module';
import { AccountsModule } from './accounts/accounts.module';

@Module({
    imports: [
        ConfigModule.forRoot({
            envFilePath: '../../.env',
            isGlobal: true,
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
    ],
})
export class AppModule { }