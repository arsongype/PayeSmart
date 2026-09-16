import { NestFactory } from '@nestjs/core'
import { ValidationPipe, ClassSerializerInterceptor } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { NestExpressApplication } from '@nestjs/platform-express'
import { AppModule } from './app.module.js'
import { HttpExceptionFilter } from './common/filters/http-exception.filter.js'
import { LoggingInterceptor } from './common/interceptors/logging.interceptor.js'
import { ConfigService } from '@nestjs/config'
import net from 'node:net'

const isPortInUse = (port: number): Promise<boolean> => new Promise((resolve) => {
  const probe = net.createConnection({ host: '127.0.0.1', port })
  probe.once('connect', () => {
    probe.destroy()
    resolve(true)
  })
  probe.once('error', () => resolve(false))
})

async function bootstrap() {
  const port = Number(process.env.PORT ?? 3000)
  if (await isPortInUse(port)) {
    console.log(`Le backend est déjà démarré sur http://localhost:${port}`)
    return
  }

  const app = await NestFactory.create<NestExpressApplication>(AppModule)

  const configService = app.get(ConfigService)

  app.enableCors({
    origin: configService.get<string[]>('cors.origin'),
    credentials: true,
  })

  app.setGlobalPrefix('api/v1')

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  )

  app.useGlobalInterceptors(new ClassSerializerInterceptor(new Reflector()))

  app.useGlobalFilters(new HttpExceptionFilter())
  app.useGlobalInterceptors(new LoggingInterceptor())

  const configuredPort = configService.get<number>('port', port)
  await app.listen(configuredPort)
  console.log(`🚀 Server running on http://localhost:${configuredPort}`)
}
bootstrap()
