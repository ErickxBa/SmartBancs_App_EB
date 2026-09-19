import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CqrsModule } from '@nestjs/cqrs';
import { TransactionsController } from './transactions.controller';
import { ProcessTransactionHandler } from './commands/process-transaction.handler';
import { Transaction } from './entities/transaction.entity';
import { Account } from '../accounts/entities/account.entity';
import { ObservabilityModule } from '../observability/observability.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Transaction, Account]),
    CqrsModule,
    ObservabilityModule,
  ],
    controllers: [TransactionsController],
    providers: [ProcessTransactionHandler],
})
export class TransactionsModule {}
