import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Check } from 'typeorm';

@Entity('accounts')
@Check('"balance" >= 0')
export class Account {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'owner_name', length: 200 })
    ownerName: string;

    @Column({ type: 'numeric', precision: 15, scale: 2, default: 0 })
    balance: number;

    @Column({ length: 3, default: 'USD' })
    currency: string;

    @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
    @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;
}