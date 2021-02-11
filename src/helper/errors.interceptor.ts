import { ArgumentsHost, CallHandler, Catch, ExecutionContext, HttpStatus, Injectable, NestInterceptor, RpcExceptionFilter } from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { RpcException } from '@nestjs/microservices';

export enum MessageErrorCode {
  FNEXISTS = 11000,
  FN_NOT_EXISTS = 11001,
  NAMESPACEXISTS = 12000,
  QUOTAS_LIMIT = 13000,
  CLUSTER_ERROR = 13,
  SERVERLESS_ERROR = 15,
}

import { catchError } from 'rxjs/operators';

@Injectable()
@Catch(RpcException)
export class ExceptionFilter implements RpcExceptionFilter<RpcException> {
  catch(exception: RpcException, host: ArgumentsHost): Observable<any> {
    return throwError(exception.getError());
  }
}

@Injectable()
@Catch()
export class ErrorsInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {

    return next
      .handle()
      .pipe(
        catchError((err: any) => {

          if (err instanceof RpcException) {
            return throwError(err);
          }
          return throwError(new RpcException({
            status: HttpStatus.EXPECTATION_FAILED,
            code: MessageErrorCode.CLUSTER_ERROR,
            message: err.message,
          }));
        }),
      );
  }
}
