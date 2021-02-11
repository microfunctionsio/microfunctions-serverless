import { Environments } from '../classe/environments';
import { Runtime } from '../enums/runtime';

export class ServerlessDto {
  name: string;
  memory: string;
  idUser: string;
  idNamespace: string;
  executedName: string;
  runtime: Runtime;
  sourceCode: any;
  namespace: string;
  idFunctions: string;
  replicas: number;
  environments: Environments[];
  packageJson: any;
  domain: string;
  kubeConfig: string;

}
