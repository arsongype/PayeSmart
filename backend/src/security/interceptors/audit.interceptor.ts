import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common'
import { Observable } from 'rxjs'
import { tap } from 'rxjs/operators'
import { AuditService } from '../services/audit.service.js'

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private auditService: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest()
    const response = context.switchToHttp().getResponse()
    const start = Date.now()
    const shouldRecord = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)
    if (!shouldRecord) return next.handle()

    return next.handle().pipe(
      tap(() => {
        void this.auditService.record({
          userId: Number.isNaN(Number(request.user?.sub)) ? null : Number(request.user.sub),
          method: request.method,
          path: request.originalUrl ?? request.url,
          action: `${request.method} ${request.route?.path ?? request.url}`,
          ipAddress: request.ip ?? request.socket?.remoteAddress ?? null,
          userAgent: request.get('user-agent') ?? null,
          statusCode: response.statusCode,
          responseTimeMs: Date.now() - start,
        }).catch(() => undefined)
      }),
    )
  }
}