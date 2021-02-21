import {HttpStatus, Injectable} from '@nestjs/common';
import {from, Observable, of} from 'rxjs';
import {map, mergeMap} from 'rxjs/operators';

import {Serverless} from '../classe/serverless';
import {ServerlessBuilder} from '../helper/Serverless.builder';
import {ServerlessDto} from '../dtos/serverlessDto';
import {ConfigService} from '@nestjs/config';
import {KubelessDeploy} from '../lib/deploy/kubelessDeploy';
import {createZipWithFiles} from '../helper/generate-zip';
import {JsTransform} from '../lib/transform/js.transform';
import {IResponse} from '../interfaces/response';
import {TriggerEnums} from "../enums/trigger.enums";

@Injectable()
export class ServerlessServices {


    constructor(private configService: ConfigService) {

    }

    deployFunction(functionDto: ServerlessDto): Observable<IResponse> {

        const serverless: Serverless = new ServerlessBuilder(functionDto.kubeConfig)
            .setName(functionDto.name)
            .setHost(functionDto.host)
            .setExecutedName(functionDto.executedName)
            .setNamespace(functionDto.namespace)
            .setSourceCode(functionDto.sourceCode)
            .setRuntime(functionDto.runtime)
            .setTrigger(functionDto.trigger)
            .setCrontab(functionDto.crontab)
            .setAllocated(functionDto.allocated)
            .setMemory(functionDto.memory)
            .setCpu(functionDto.cpu)
            .setReplicas(functionDto.replicas)
            .setDependencies(functionDto.dependencies)
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
            mergeMap((zipPkg: any) => this.writeServerless(Object.assign(serverless, {zipPkg}))),
        );
    }

    private writeServerless(serverless: Serverless): Observable<any> {
        const yamlParser: any = {
            package: {},
            provider: {}
        };
        yamlParser.service = serverless.name;
        yamlParser.provider.hostname = serverless.host;
        yamlParser.provider.namespace = serverless.namespace;
        yamlParser.provider.runtime = serverless.runtime;
        yamlParser.provider.replicas = serverless.replicas;

        if (serverless.allocated) {
            yamlParser.provider.memorySize = serverless.memory;
            yamlParser.provider.cpu = `${serverless.cpu}m`;
        }
        yamlParser.servicePort = 80;
        yamlParser.provider.ingress = {
            class: 'kong',
            additionalAnnotations: {
                'konghq.com/override': `${serverless.namespace}-apikey`,
                'cert-manager.io/cluster-issuer': 'letsencrypt-prod-kong',
                'nginx.ingress.kubernetes.io/ssl-redirect': 'true',
            },
            tls: true,
            tlsSecretName: 'microfunctions-api-tls',
        };
        yamlParser.functions = {};
        yamlParser.functions[serverless.name] = {
            handler: `handler.${serverless.executedName}`,
            environment: serverless.parseEnv(),
            namespace: serverless.namespace,
            events: this.getEvents(serverless),
            servicePort: this.getServicePort(serverless),
        };
        yamlParser.package.individually = false;
        yamlParser.package.zipPkg = serverless.zipPkg;
        return of(yamlParser);
    }

    private getEvents(serverless: Serverless) {
        const events = [];
        if (serverless.trigger === TriggerEnums.HTTPS.toString()) {
            events.push({
                http: {
                    method: 'any',
                    path: `${serverless.namespace}/apis/${serverless.name}`,
                    cors: false,
                },
            })
        } else if (serverless.trigger === TriggerEnums.CRONJOB.toString()) {
            events.push({
                schedule: serverless.crontab
            })
        }
        return events;
    }

    private getServicePort(serverless: Serverless) {
        if (serverless.trigger === TriggerEnums.SERVICES.toString()) {
            return 80;
        }
    }

    private zipPkg(serverless: Serverless): Observable<any> {

        if (serverless.runtime.includes('nodejs')) {
            return new JsTransform('js').transform(serverless.sourceCode).pipe(
                mergeMap((transform: any) => {
                    const zipPkg = createZipWithFiles({
                        'handler.js': transform.code,
                        'requirements': this.getDependencies(serverless),
                    });
                    return from(zipPkg);
                }));
        } else if (serverless.runtime.includes('python')) {
            const zipPkg = createZipWithFiles({
                'handler.py': serverless.sourceCode,
                'requirements': this.getDependencies(serverless),
            });
            return from(zipPkg);
        } else if (serverless.runtime.includes('go')) {
            const zipPkg = createZipWithFiles({
                'handler.go': serverless.sourceCode,
                'requirements': this.getDependencies(serverless),
            });
            return from(zipPkg);
        }


    }

    private getDependencies(serverless: Serverless): string {
        if (serverless.runtime.includes('nodejs')) {
            const packageJson: any = {
                name: serverless.name,
                version: '1.0.0',
                description: ' functions microfunctions',
                dependencies: serverless.dependencies ? JSON.parse(serverless.dependencies) : {},
                scripts: {
                    test: 'echo "Error: no test specified" && exit 1',
                },

            };
            return JSON.stringify(packageJson);
        } else {
            return serverless.dependencies;
        }


    }

    private deployServerless(serverless: any, kubeConfig: string): Observable<any> {
        return of(serverless).pipe(mergeMap(() => {
            return from(new KubelessDeploy(serverless, kubeConfig).excludes().validate().deployFunction());
        }));
    }


}
