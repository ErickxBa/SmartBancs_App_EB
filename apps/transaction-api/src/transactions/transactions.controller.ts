import { Controller, Post, Body, HttpCode, HttpStatus, Get } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { ProcessTransactionCommand } from './commands/process-transaction.command';
import { Transaction } from './entities/transaction.entity';
import { v4 as uuidv4 } from 'uuid';

@Controller('transactions')
export class TransactionsController {
    constructor(
        private readonly commandBus: CommandBus,
        @InjectRepository(Transaction)
        private readonly transactionRepo: Repository<Transaction>
    ) {}

    @Get()
    async getRecentTransactions() {
        return await this.transactionRepo.find({
            order: { createdAt: 'DESC' },
            take: 20
        });
    }

    @Post()
    @HttpCode(HttpStatus.OK)
    async create(@Body() createTransactionDto: CreateTransactionDto) {
        const traceId = uuidv4();
        
        // Fase 3 exigirá no hacer await a todo el proceso si queremos asegurar 200 OK super rápido,
        // pero por ahora esperamos a que termine la DB (que debería ser < 50ms)
        const result = await this.commandBus.execute(
            new ProcessTransactionCommand({
                accountFrom: createTransactionDto.accountFrom,
                accountTo: createTransactionDto.accountTo,
                amount: createTransactionDto.amount,
                traceId,
            })
        );

        return {
            status: 'ACCEPTED',
            traceId,
            transactionId: result.id,
            timestamp: new Date().toISOString()
        };
    }
}
