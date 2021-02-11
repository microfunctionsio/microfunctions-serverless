import { IsNotEmpty, IsString, Max, Min } from 'class-validator';

export class ServerlessDto {
  name: string;
  namespace: string;
}
