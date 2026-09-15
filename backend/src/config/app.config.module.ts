import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import appConfig from './app.config.js'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig],
      envFilePath: ['.env.local', '.env'],
    }),
  ],
  providers: [],
  exports: [],
})
export default class AppConfigModule {}
