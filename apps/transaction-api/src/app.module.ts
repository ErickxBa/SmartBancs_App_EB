import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TransactionsModule } from './transactions/transactions.module';

@Module({
    imports: [
        TypeOrmModule.forRoot({
            type: 'postgres',
            url: process.env.DATABASE_URL || 'postgres://app_user:app_password@localhost:5432/smartbancs',
            autoLoadEntities: true,
            synchronize: false, // Prod: El esquema se controla init.sql    
        }),
        TransactionsModule,
    ],
})
export class AppModule { }