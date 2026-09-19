export class TransactionCompletedEvent {
    constructor(
        public readonly transactionId: string,
        public readonly amount: number,
        public readonly timestamp: Date,
    ) {}
}
