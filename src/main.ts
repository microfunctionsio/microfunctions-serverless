import { NestFactory } from '@nestjs/core';
import { ServerlessModule } from './serverless/serverless.module';
import { Transport } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const serverlessModule = await NestFactory.create(ServerlessModule);
  const configService:ConfigService = serverlessModule.get(ConfigService)
  const guestUrls = [`amqp://${configService.get('RABBIT_USER')}:${configService.get('RABBITMQ_PASSWORD')}@${configService.get('RABBIT_HOST')}:5672`];
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
  if(process.env.NODE_ENV !== 'local')
  {
    await serverlessModule.listen(4000);
  }
  await serverlessModule.startAllMicroservicesAsync();
}
bootstrap();
