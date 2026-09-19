import { CommandHandler, ICommandHandler, EventBus } from '@nestjs/cqrs';
import { ProcessTransactionCommand } from './process-transaction.command';
import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Account } from '../../accounts/entities/account.entity';
import { Transaction } from '../entities/transaction.entity';
import { TransactionCompletedEvent } from '../events/transaction-completed.event';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { Counter, Histogram } from 'prom-client';
import { RedisService } from '@liaoliaots/nestjs-redis';
import Redis from 'ioredis';

@Injectable()
@CommandHandler(ProcessTransactionCommand)
export class ProcessTransactionHandler implements ICommandHandler<ProcessTransactionCommand> {
    private readonly logger = new Logger(ProcessTransactionHandler.name);

    constructor(
        private readonly dataSource: DataSource,
        private readonly eventBus: EventBus,
        @InjectMetric('smartbancs_transactions_total') private readonly counter: Counter<string>,
        @InjectMetric('smartbancs_transaction_duration_seconds') private readonly histogram: Histogram<string>,
        private readonly redisService: RedisService,
    ) {}

    async execute(command: ProcessTransactionCommand): Promise<any> {
        const endTimer = this.histogram.startTimer();
        const { accountFrom, accountTo, amount, traceId } = command.payload;

        if (accountFrom === accountTo) {
            this.counter.inc({ status: 'bad_request' });
            endTimer();
            throw new BadRequestException('Las cuentas origen y destino deben ser distintas');
        }

        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            // Ordenamiento Canónico: Siempre bloquear el UUID "menor" primero
            // para evitar Deadlocks en PostgreSQL cuando hay transferencias cruzadas simultáneas.
            const [firstId, secondId] = [accountFrom, accountTo].sort();

            // Bloqueo pesimista: SELECT FOR UPDATE
            await queryRunner.query(
                `SELECT id, balance FROM accounts WHERE id = $1 FOR UPDATE`,
                [firstId]
            );
            await queryRunner.query(
                `SELECT id, balance FROM accounts WHERE id = $1 FOR UPDATE`,
                [secondId]
            );

            // Obtener datos frescos después del bloqueo
            const fromAccount = await queryRunner.manager.findOne(Account, { where: { id: accountFrom } });
            const toAccount = await queryRunner.manager.findOne(Account, { where: { id: accountTo } });

            if (!fromAccount || !toAccount) {
                throw new BadRequestException('One or both accounts do not exist');
            }

            if (Number(fromAccount.balance) < amount) {
                throw new BadRequestException('Insufficient funds');
            }

            // Actualizar saldos
            fromAccount.balance = Number(fromAccount.balance) - amount;
            toAccount.balance = Number(toAccount.balance) + amount;

            await queryRunner.manager.save(Account, fromAccount);
            await queryRunner.manager.save(Account, toAccount);

            // Registrar transacción
            const transaction = queryRunner.manager.create(Transaction, {
                accountFrom,
                accountTo,
                amount,
                traceId,
                status: 'COMPLETED',
            });
            await queryRunner.manager.save(Transaction, transaction);

            await queryRunner.commitTransaction();

            // Redis write-through (saldo en caché)
            try {
                const redisClient = this.redisService.getOrThrow();
                await Promise.all([
                    redisClient.decrby(`balance:${accountFrom}`, Math.round(amount * 100)),
                    redisClient.incrby(`balance:${accountTo}`, Math.round(amount * 100)),
                ]);
            } catch (redisErr) {
                this.logger.error(`Failed to update Redis cache: ${redisErr.message}`, redisErr.stack);
            }

            // Despachar evento asíncrono hacia el AI Worker (Fase 3)
            this.eventBus.publish(new TransactionCompletedEvent(
                transaction.id, 
                accountFrom, 
                amount, 
                traceId
            ));

            const result = {
                id: transaction.id,
                status: 'COMPLETED',
                traceId: traceId,
            };

            this.counter.inc({ status: 'success' });
            endTimer();
            return result;
        } catch (error) {
            await queryRunner.rollbackTransaction();
            this.logger.error(`Error procesando transacción [Trace: ${traceId}]: ${error.message}`);
            this.counter.inc({ status: 'error' });
            endTimer();
            if (error instanceof BadRequestException) {
                throw error;
            }
            throw new BadRequestException('Error interno al procesar la transacción');
        } finally {
            await queryRunner.release();
        }
    }
}
