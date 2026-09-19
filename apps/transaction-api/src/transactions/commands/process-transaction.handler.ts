import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ProcessTransactionCommand } from './process-transaction.command';
import { Injectable, BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Account } from '../../accounts/entities/account.entity';
import { Transaction } from '../entities/transaction.entity';

@Injectable()
@CommandHandler(ProcessTransactionCommand)
export class ProcessTransactionHandler implements ICommandHandler<ProcessTransactionCommand> {
    constructor(private readonly dataSource: DataSource) {}

    async execute(command: ProcessTransactionCommand): Promise<any> {
        const { accountFrom, accountTo, amount, traceId } = command.payload;

        if (accountFrom === accountTo) {
            throw new BadRequestException('Cannot transfer to the same account');
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

            // TODO Fase 3: Despachar Evento TransactionCompletedEvent aquí antes del commit final
            // o inmediatamente después, dependiendo del diseño. Lo ideal es usar el Outbox o emitir después.

            await queryRunner.commitTransaction();

            return transaction;
        } catch (err) {
            await queryRunner.rollbackTransaction();
            throw err;
        } finally {
            await queryRunner.release();
        }
    }
}
