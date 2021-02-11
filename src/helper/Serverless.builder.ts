import { Serverless } from '../classe/serverless';
import moment = require('moment');
import { Environments } from '../classe/environments';

const path = require('path');

export class ServerlessBuilder {
  private serverless: Serverless;

  constructor(kubeConfig: string) {
    this.serverless = new Serverless(kubeConfig);

    let cwd: string = process.env.NODE_ENV === 'production' ? path.join('serverless') : path.join('/tmp/serverless');
    this.serverless.id = moment()
      .valueOf()
      .toString();
    this.serverless.cwd = path.join(cwd, this.serverless.id);
  }

  setName(name: string) {
    this.serverless.name = name;
    return this;
  }
  setHost(host: string) {
    this.serverless.host = host;
    return this;
  }
  setExecutedName(executedName: string) {
    this.serverless.executedName = executedName;
    return this;
  }

  setSourceCode(sourceCode: string) {
    this.serverless.sourceCode = sourceCode;
    return this;
  }

  setNamespace(namespace: string) {
    this.serverless.namespace = namespace;
    return this;
  }

  setRuntime(runtime: string) {
    this.serverless.runtime = runtime;
    return this;
  }
  setMemory(memory: string) {
    this.serverless.memory = memory;
    return this;
  }
  setReplicas(replicas: number) {
    this.serverless.replicas = replicas;
    return this;
  }
  setDependencies(dependencies: string) {
    this.serverless.dependencies = dependencies;
    return this;
  }
  setEnvironments(environments: Environments[]) {
    this.serverless.environments = environments;
    return this;
  }
  builder() {
    return this.serverless;
  }
}
