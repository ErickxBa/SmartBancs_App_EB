import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Account } from './entities/account.entity';

@Injectable()
export class AccountsService {
    constructor(
        @InjectRepository(Account)
        private readonly accountsRepository: Repository<Account>,
    ) {}

    async createAccount(ownerName: string, initialBalance: number): Promise<Account> {
        const account = this.accountsRepository.create({
            ownerName: ownerName || "Usuario Sin Nombre",
            balance: initialBalance,
        });
        return await this.accountsRepository.save(account);
    }

    async getAllAccounts(): Promise<Account[]> {
        return await this.accountsRepository.find({
            order: { createdAt: 'DESC' }
        });
    }

    async deleteAccount(id: string): Promise<void> {
        await this.accountsRepository.delete(id);
    }
}
