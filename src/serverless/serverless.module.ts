import { Injectable, Module, OnModuleInit } from '@nestjs/common';
import { ServerlessServices } from './serverless.services';
import { ServerlessController } from './serverless.controller';
import { ConfigModule } from '@nestjs/config';

const environment = 'local';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `./config.${process.env.NODE_ENV || environment}.env`,
    }),
  ],
  providers: [ServerlessServices],
  controllers: [ServerlessController],
  exports: [ServerlessServices],
})
export class ServerlessModule  {

}
