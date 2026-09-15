import { Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common'
import { Request, Response } from 'express'

interface ValidationError {
  property: string
  constraints: Record<string, string>
}

@Catch()
export class HttpExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse<Response>()
    const request = ctx.getRequest<Request>()

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR

    let message = 'Erreur interne du serveur'
    let errors: ValidationError[] | undefined

    if (exception instanceof HttpException) {
      const exceptionResponse = exception.getResponse()
      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse
      } else if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        message = (exceptionResponse as { message?: string }).message ?? message
        const validationErrors = (exceptionResponse as { errors?: ValidationError[] }).errors
        if (validationErrors) {
          errors = validationErrors
        }
      }
    } else if (exception instanceof Error) {
      message = exception.message
    }

    response.status(status).json({
      statusCode: status,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
      ...(errors && { errors }),
    })
  }
}
