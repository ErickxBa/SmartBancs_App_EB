import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { TransactionCompletedEvent } from '../transactions/events/transaction-completed.event';
import { Logger } from '@nestjs/common';

@EventsHandler(TransactionCompletedEvent)
export class PublishToRabbitMQHandler implements IEventHandler<TransactionCompletedEvent> {
  private readonly logger = new Logger(PublishToRabbitMQHandler.name);

  constructor(private readonly amqp: AmqpConnection) {}

  async handle(event: TransactionCompletedEvent) {
    try {
      await this.amqp.publish(
        'smartbancs',        // exchange
        'tx.completed',      // routing key
        {
          transactionId: event.transactionId,
          accountId:     event.accountId,
          amount:        event.amount,
          traceId:       event.traceId,
        }
      );
      this.logger.log(`Evento publicado a RabbitMQ: tx.completed [${event.transactionId}]`);
    } catch (err: any) {
      this.logger.error(`Error publicando evento a RabbitMQ: ${err.message}`, err.stack);
    }
  }
}
