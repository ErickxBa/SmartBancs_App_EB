import { IsUUID, IsPositive, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateTransactionDto {
    @IsUUID()
    accountFrom: string;

    @IsUUID()
    accountTo: string;

    @IsNumber({ maxDecimalPlaces: 2 })
    @IsPositive()
    amount: number;

    @IsOptional()
    @IsString()
    currency?: string = 'USD';
}