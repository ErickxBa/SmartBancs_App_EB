export class ProcessTransactionCommand {
    constructor(
        public readonly payload: {
            accountFrom: string;
            accountTo: string;
            amount: number;
            traceId: string;
        }
    ) { }
}