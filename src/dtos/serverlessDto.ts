import { Environments } from '../classe/environments';
import { RuntimeEnums } from '../enums/runtime.enums';
import {TriggerEnums} from "../enums/trigger.enums";

export class ServerlessDto {
  name: string;
  allocated: boolean;
  memory: string;
  cpu: string;
  idUser: string;
  idNamespace: string;
  executedName: string;
  runtime: RuntimeEnums;
  trigger: TriggerEnums;
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
