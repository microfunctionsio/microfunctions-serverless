

export interface Serverless {
  provider: {
    image: string;
    name: string;
    namespace: string;
    hostname: string;
    defaultDNSResolution: string;
    ingress: Ingress;
    runtime: string;
    cpu: string;
    memorySize: string;
    affinity: any;
    tolerations: any;
    timeout: string;
    environment: any;
    replicas: number;
    servicePort:number;
  };
  service: string;
  package: {
    exclude: any[];
    artifact: string;
    path: string;
    individually: boolean;
    zipPkg: any;

  };
  functions: Functions[];
  cli: any;
  config: any;
}

export interface Functions {
  // tslint:disable-next-line:ban-types
  [index: string]: Function;

}

export interface Function {
  handler: string;
  environment: any;
  namespace: string;
  events: any
}

export interface Ingress {
  class: string;
  additionalAnnotations: AdditionalAnnotations;
  tls: boolean;
  tlsSecretName: string;
}

export interface AdditionalAnnotations {
  [index: string]: string;
}
