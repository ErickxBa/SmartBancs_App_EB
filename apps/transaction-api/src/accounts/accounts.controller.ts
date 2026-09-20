import { Controller, Get, Post, Body, Delete, Param } from '@nestjs/common';
import { AccountsService } from './accounts.service';
import { IsString, IsNumber, IsNotEmpty } from 'class-validator';

class CreateAccountDto {
    @IsString()
    @IsNotEmpty()
    ownerName: string;

    @IsNumber()
    initialBalance: number;
}

@Controller('accounts')
export class AccountsController {
    constructor(private readonly accountsService: AccountsService) {}

    @Get()
    async getAllAccounts() {
        return await this.accountsService.getAllAccounts();
    }

    @Post()
    async createAccount(@Body() body: CreateAccountDto) {
        return await this.accountsService.createAccount(body.ownerName, body.initialBalance);
    }

    @Delete(':id')
    async deleteAccount(@Param('id') id: string) {
        return await this.accountsService.deleteAccount(id);
    }
}
