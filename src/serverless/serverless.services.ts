import { HttpStatus, Injectable } from '@nestjs/common';
import { from, Observable, of } from 'rxjs';
import { map, mergeMap } from 'rxjs/operators';

import { Serverless } from '../classe/serverless';
import { ServerlessBuilder } from '../helper/Serverless.builder';
import { ServerlessDto } from '../dtos/serverlessDto';
import { ConfigService } from '@nestjs/config';
import { KubelessDeploy } from '../lib/deploy/kubelessDeploy';
import { createZipWithFiles } from '../helper/generate-zip';
import { JsTransform } from '../lib/transform/js.transform';
import { IResponse } from '../interfaces/response';

@Injectable()
export class ServerlessServices {


  constructor(private configService: ConfigService) {

  }

  deployFunction(functionDto: ServerlessDto): Observable<IResponse> {

    const serverless: Serverless = new ServerlessBuilder(functionDto.kubeConfig)
      .setName(functionDto.name)
      .setHost(functionDto.domain)
      .setExecutedName(functionDto.executedName)
      .setNamespace(functionDto.namespace)
      .setSourceCode(functionDto.sourceCode)
      .setRuntime(functionDto.runtime)
      .setMemory(functionDto.memory)
      .setReplicas(functionDto.replicas)
      .setDependencies(JSON.parse(functionDto.packageJson).dependencies)
      .setEnvironments(functionDto.environments)
      .builder();
    return this.prepareServerless(serverless).pipe(
      mergeMap((serverless$) => {
        return this.deployServerless(serverless$, serverless.kubeConfig).pipe(map((r) => {
          return {
            status: HttpStatus.CREATED
          }
        }));
      }),
    );
  }

  private prepareServerless(serverless: Serverless): Observable<any> {
    return of('prepareServerless').pipe(
      mergeMap(() => this.zipPkg(serverless)),
      mergeMap((zipPkg: any) => this.writeServerless(Object.assign(serverless, { zipPkg }))),
    );
  }

  private writeServerless(serverless: Serverless): Observable<any> {
    const yamlParser: any = {
      package: { },
      provider: {
      }
    } ;
    yamlParser.service = serverless.name;
    yamlParser.provider.hostname = serverless.host;
    yamlParser.provider.namespace = serverless.namespace;
    yamlParser.provider.runtime = serverless.runtime;
    yamlParser.provider.replicas = serverless.replicas;
    //  yamlParser.provider.memorySize = '32';
    //   yamlParser.provider.cpu = this.configService.get<string>('MAX_CPU'); //FORCE Limist cpu
    yamlParser.provider.ingress = {
      class: 'kong',
      additionalAnnotations: {
        'konghq.com/override': `${serverless.namespace}-apikey`,
        'cert-manager.io/cluster-issuer': 'letsencrypt-prod',
        'nginx.ingress.kubernetes.io/ssl-redirect': 'true',
        'service.beta.kubernetes.io/do-loadbalancer-hostname': serverless.host,
      },
      tls: true,
      tlsSecretName: 'microfunction-io-tls',
    };
    yamlParser.functions = {};
    yamlParser.functions[serverless.name] = {
      handler: `handler.${serverless.executedName}`,
      environment: serverless.parseEnv(),
      namespace: serverless.namespace,
      events: [
        {
          http: {
            method: 'any',
            path: `api/${serverless.name}`,
            cors: false,
          },
        },
      ],
    };
    yamlParser.package.individually = false;
    yamlParser.package.zipPkg = serverless.zipPkg;
    return  of(yamlParser);
  }

  private zipPkg(serverless: Serverless): Observable<any> {
    return new JsTransform('js').transform(serverless.sourceCode).pipe(mergeMap((transform: any) => {

      const zipPkg = createZipWithFiles({
        'handler.js': transform.code,
        'package.json': this.getDependencies(serverless),
      });
      return from(zipPkg);
    }));

  }

  private getDependencies(serverless: Serverless): string {
    const packageJson: any = {
      name: serverless.name,
      version: '1.0.0',
      description: ' functions microfunctions',
      dependencies: serverless.dependencies || {},
      scripts: {
        test: 'echo "Error: no test specified" && exit 1',
      },

    };
    return JSON.stringify(packageJson);
  }

  private deployServerless(serverless: any, kubeConfig: string): Observable<any> {
    return  of(serverless).pipe(mergeMap(() => {
      return from(new KubelessDeploy(serverless, kubeConfig).excludes().validate().deployFunction());
    }));
  }
}
