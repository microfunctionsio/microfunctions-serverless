import { Environments } from './environments';

const _ = require('lodash');

export class Serverless {
  constructor(kubeConfig: string) {
    this.kubeConfig = kubeConfig;
  }
  host: string;
  name: string;
  namespace: string;
  id: string;
  cwd: string;
  sourceCode: any;
  dependencies: any;
  executedName: string;
  runtime: string;
  memory: string;
  replicas: number;
  environments: Environments[];
  kubeConfig: string;
  zipPkg:any;
  parseEnv() {
    const res = {};
    _.each(this.environments, (v, k) => {
      res[v.name] = v.value;
    });
    return res;
  }
}
