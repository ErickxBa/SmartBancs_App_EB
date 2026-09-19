import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TransactionsController } from './transactions.controller';
import { ProcessTransactionHandler } from './commands/process-transaction.handler';
import { Transaction } from './entities/transaction.entity';
import { Account } from '../accounts/entities/account.entity';

@Module({
    imports: [
        CqrsModule,
        TypeOrmModule.forFeature([Transaction, Account])
    ],
    controllers: [TransactionsController],
    providers: [ProcessTransactionHandler],
})
export class TransactionsModule {}
