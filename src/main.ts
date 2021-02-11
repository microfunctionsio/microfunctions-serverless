import { NestFactory } from '@nestjs/core';
import { ServerlessModule } from './serverless/serverless.module';
import { Transport } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const serverlessModule = await NestFactory.create(ServerlessModule);

  const guestUrls = serverlessModule.get(ConfigService).get<string>('AMQP_URL').split(',');
  serverlessModule.connectMicroservice({
    transport: Transport.RMQ,
    options: {
      urls: guestUrls,
      queue: 'microfunctions_serverless',
      queueOptions: {
        durable: true,
      },
    },
  });
  await serverlessModule.startAllMicroservicesAsync();
}
bootstrap();
