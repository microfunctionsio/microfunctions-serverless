import _ = require('lodash');
import BbPromise = require('bluebird');
import fs = require('fs');
import JSZip = require('jszip');
import { Config } from '../config';
import { KubelessDeployStrategy } from '../strategy';
import { deploy } from '../deploy';
import { warnUnsupportedOptions } from '../helpers';
import { Serverless } from '../serverless';

export class KubelessDeploy {
  serverless: Serverless;
  options: any;
  hooks: any;
  loadZip: any;
  kubeConfig: any;

  constructor(serverless: Serverless, kubeConfig: string, options?: any) {
    this.serverless = serverless;
    this.serverless.provider.servicePort = 80
    this.serverless.cli = {
      log: console.log
    }
    this.options = options || {};
    // Store the result of loading the Zip file
    this.loadZip = _.memoize(JSZip.loadAsync);
    this.kubeConfig = kubeConfig;

  }

  excludes() {
    const exclude = this.serverless?.package?.exclude || [];
    exclude.push('node_modules/**');
    if (this.serverless?.package) {
      this.serverless.package.exclude = exclude;
    }

    return this;
  }

  validate() {
    const unsupportedOptions = ['stage', 'region'];
    warnUnsupportedOptions(
      unsupportedOptions,
      this.options,
      console.log,
    );
    return this;
  }

  getFileContent(zipPkg, relativePath) {
    return this.loadZip(zipPkg).then(
      (zip) => zip.file(relativePath).async('string')
    );
  }
  checkSize(pkg) {

    const pkgsize = pkg.toString().length;
    // Maximum size for a etcd entry is 1 MB and right now Kubeless is storing files as
    // etcd entries
    const oneMB = 1024 * 1024;
    if (pkgsize > oneMB) {
      this.serverless.cli.log(
        `WARNING! Function zip file is ${Math.round(pkgsize / oneMB)}MB. ` +
        'The maximum size allowed is 1MB: please use package.exclude directives to include ' +
        'only the required files',
      );
    }
  }

  getPkg(description, funcName) {
    const pkg = this.options?.package ||
      this.serverless.package?.path ||
      this.serverless.package?.artifact ||
      description.package?.artifact ||
      this.serverless.config?.serverless.artifact;

    // if using the package option and packaging inidividually
    // then we're expecting a directory where artifacts for all the finctions live
    if (this.options.package && this.serverless.package.individually) {
      if (fs.lstatSync(pkg).isDirectory()) {
        return `${pkg + funcName}.zip`;
      }
      const errMsg = 'Expecting the Paramater to be a directory ' +
        'for individualy packaged functions';
      this.serverless.cli.log(errMsg);
      throw new Error(errMsg);
    }
    return pkg;
  }

  deployFunction() {
    const runtime = this.serverless.provider.runtime;
    const populatedFunctions = [];
    const kubelessConfig = new Config(this.kubeConfig);
    return new BbPromise((resolve, reject) => {
      kubelessConfig.init().then(() => {
        _.each(this.serverless.functions, (description, name) => {
          const pkg = this.serverless.package.zipPkg;

          this.checkSize(pkg);

          if (description.handler) {
            const depFile = 'requirements';
            (new KubelessDeployStrategy(this.serverless)).factory().deploy(description, pkg)
              .catch(reject)
              .then(deployOptions => {
                this.getFileContent(pkg, depFile)
                  .catch(() => {
                    // No requirements found
                  })
                  .then((requirementsContent) => {
                    populatedFunctions.push(_.assign({}, description, deployOptions, {
                      id: name,
                      deps: requirementsContent,
                      image: description.image || this.serverless.provider.image,
                      events: _.map(description.events, (event) => {
                        const type = _.keys(event)[0];
                        if (type === 'trigger') {
                          return _.assign({ type }, { trigger: event[type] });
                        } else if (type === 'schedule') {
                          return _.assign({ type }, { schedule: event[type] });
                        }
                        return _.assign({ type }, event[type]);
                      }),
                    }));
                    if (populatedFunctions.length ===
                      _.keys(this.serverless.functions).length) {
                      resolve();
                    }
                  });
              });
          } else {
            populatedFunctions.push(_.assign({}, description, { id: name }));
            if (populatedFunctions.length === _.keys(this.serverless.functions).length) {
              resolve();
            }
          }
        });
      });
    }).then(() => deploy(
      populatedFunctions,
      runtime,
      this.serverless.service,
      {
        namespace: this.serverless.provider.namespace,
        hostname: this.serverless.provider.hostname,
        defaultDNSResolution: this.serverless.provider.defaultDNSResolution,
        ingress: this.serverless.provider.ingress,
        cpu: this.serverless.provider.cpu,
        memorySize: this.serverless.provider.memorySize,
        affinity: this.serverless.provider.affinity,
        tolerations: this.serverless.provider.tolerations,
        force: this.options.force,
        verbose: this.options.verbose,
        log: this.serverless.cli.log.bind(this.serverless.cli),
        timeout: this.serverless.provider.timeout,
        environment: this.serverless.provider.environment,
        replicas: this.serverless.provider.replicas,
      },
      this.kubeConfig,
    ));
  }
}


