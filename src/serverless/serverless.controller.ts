import { Controller, UseFilters, UseInterceptors } from '@nestjs/common';
import { ServerlessServices } from './serverless.services';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { ServerlessDto } from '../dtos/serverlessDto';
import { ErrorsInterceptor, ExceptionFilter } from '../helper/errors.interceptor';

@Controller()
@UseFilters(new ExceptionFilter())
@UseInterceptors(new ErrorsInterceptor())
export class ServerlessController {
  constructor(private serverlessServices: ServerlessServices) {}

  @MessagePattern({ cmd: 'deployFunction' })
  getNamespace(@Payload() functionDto: ServerlessDto) {
    return this.serverlessServices.deployFunction(functionDto);
  }
}
