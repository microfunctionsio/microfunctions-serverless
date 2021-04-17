import { Environments } from '../classe/environments';
import {RuntimesType,TriggersType} from '@microfunctions/common';
export class ServerlessDto {
  name: string;
  allocated: boolean;
  memory: string;
  cpu: string;
  idUser: string;
  idNamespace: string;
  executedName: string;
  runtime: RuntimesType;
  trigger: TriggersType;
  crontab :string;
  sourceCode: any;
  namespace: string;
  idFunctions: string;
  replicas: number;
  environments: Environments[];
  dependencies: any;
  host: string;
  kubeConfig: string;

}
