import { getConnectionOptions, getKubernetesAPIURL, loadKubeConfig } from './helpers';
import _ = require('lodash');
import request = require('request');

export class Config {
  private namespace: string;
  private connectionOptions: any = {};
  private configMag: any = {};

  constructor(kubeConfig: string, options?: any) {
    const defaultNamespace = 'microfunctions';
    const opts = _.defaults({}, options, {
      namespace: defaultNamespace,
    });
    this.namespace = opts.namespace;
    const APIRootUrl = getKubernetesAPIURL(loadKubeConfig(kubeConfig));
    const url = `${APIRootUrl}/api/v1/namespaces/${opts.namespace}/configmaps/kubeless-config`;
    this.connectionOptions = Object.assign(
       getConnectionOptions(loadKubeConfig(kubeConfig)),
      { url, json: true },
    );
    this.configMag = {};
  }

  init() {
    const data = [];
    return new Promise((resolve, reject) => {

      request.get(this.connectionOptions)
        .on('error', err => {
          reject(err);
        })
        .on('data', (d) => {
          data.push(d);
        })
        .on('end', () => {

          const res = JSON.parse(Buffer.concat(data).toString());

          if (res.code && res.code !== 200) {
            reject(new Error(
              `Request returned: ${res.code} - ${res.message}` +
              `\n  Response: ${JSON.stringify(res)}\n` +
              `${res.code === 401 && '  Check if your token has expired.'}`,
            ));
          } else {
            this.configMag = res;
            resolve();
          }
        });
    });
  }

  get(key, opt) {
    if (opt && opt.parse) {
      return JSON.parse(this.configMag.data[key]);
    }
    return this.configMag.data[key];
  }
}
