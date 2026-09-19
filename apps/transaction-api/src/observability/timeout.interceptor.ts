import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable, throwError, TimeoutError } from 'rxjs';
import { timeout, catchError } from 'rxjs/operators';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { Counter } from 'prom-client';

@Injectable()
export class TimeoutInterceptor implements NestInterceptor {
  private readonly logger = new Logger(TimeoutInterceptor.name);

  constructor(
    @InjectMetric('smartbancs_transactions_total') public counter: Counter<string>,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      // The requirement states a strict 2-second threshold.
      // We set the timeout at 1800ms (1.8s) to have a buffer before the hard limit.
      timeout(1800),
      catchError(err => {
        if (err instanceof TimeoutError) {
          // Registrar para diagnóstico de incidente (Fase Operación/Incidente)
          this.logger.error('request.timeout', { threshold_ms: 1800, url: context.switchToHttp().getRequest().url });
          this.counter.inc({ status: 'timeout' });
        }
        return throwError(() => err);
      })
    );
  }
}
