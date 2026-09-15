import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common'
import { Observable } from 'rxjs'
import { tap } from 'rxjs/operators'

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest()
    const method = request.method
    const url = request.url
    const startTime = Date.now()

    return next.handle().pipe(
      tap(() => {
        const responseTime = Date.now() - startTime
        console.log(`${method} ${url} ${responseTime}ms`)
      }),
    )
  }
}
