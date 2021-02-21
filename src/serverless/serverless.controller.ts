import { Controller, UseFilters, UseInterceptors } from '@nestjs/common';
import { ServerlessServices } from './serverless.services';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { ServerlessDto } from '../dtos/serverlessDto';
import {ErrorsMicroFunctionInterceptor} from "../interceptors/errors.interceptor";

@Controller()
@UseInterceptors(new ErrorsMicroFunctionInterceptor())
export class ServerlessController {
  constructor(private serverlessServices: ServerlessServices) {}

  @MessagePattern({ cmd: 'deployFunction' })
  deployFunction(@Payload() functionDto: ServerlessDto) {
    return this.serverlessServices.deployFunction(functionDto);
  }
}
