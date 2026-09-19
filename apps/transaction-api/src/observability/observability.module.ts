import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { PrometheusModule, makeCounterProvider, makeHistogramProvider, getToken } from '@willsoto/nestjs-prometheus';
import { TimeoutInterceptor } from './timeout.interceptor';

@Module({
  imports: [
    PrometheusModule.register({
      path: '/metrics',
      defaultMetrics: {
        enabled: true,
      },
    }),
  ],
  providers: [
    makeCounterProvider({
      name: 'smartbancs_transactions_total',
      help: 'Total de transacciones procesadas',
      labelNames: ['status'],
    }),
    makeHistogramProvider({
      name: 'smartbancs_transaction_duration_seconds',
      help: 'Duración de procesamiento',
      buckets: [0.1, 0.25, 0.5, 1.0, 1.5, 2.0, 5.0],
    }),
    {
      provide: APP_INTERCEPTOR,
      useClass: TimeoutInterceptor,
    },
  ],
  exports: [
    PrometheusModule,
    getToken('smartbancs_transactions_total'),
    getToken('smartbancs_transaction_duration_seconds'),
  ],
})
export class ObservabilityModule {}
