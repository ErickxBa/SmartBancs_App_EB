import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('transactions')
export class Transaction {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column('uuid', { name: 'account_from' })
    accountFrom: string;

    @Column('uuid', { name: 'account_to' })
    accountTo: string;

    @Column({ type: 'numeric', precision: 15, scale: 2 })
    amount: number;

    @Column({ default: 'PENDING' })
    status: string;

    @Column({ name: 'trace_id', nullable: true })
    traceId: string;

    @Column({ type: 'text', nullable: true })
    recommendation: string;

    @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
}