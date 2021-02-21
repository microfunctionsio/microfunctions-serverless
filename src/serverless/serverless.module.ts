import {Module} from '@nestjs/common';
import {ServerlessServices} from './serverless.services';
import {ServerlessController} from './serverless.controller';
import {ConfigModule} from '@nestjs/config';
import { HealthModule } from 'src/health/health.module';

@Module({
  imports: [
    HealthModule,
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `./config.${process.env.NODE_ENV}.env`,
    }),
  ],
  providers: [ServerlessServices],
  controllers: [ServerlessController],
  exports: [ServerlessServices],
})
export class ServerlessModule  {

}
