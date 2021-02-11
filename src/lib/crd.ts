import _ = require('lodash');
import BbPromise = require('bluebird');
import request = require('request');
import { getConnectionOptions, getKubernetesAPIURL, IConnectionOptions, loadKubeConfig } from './helpers';

export class Crd {
  connectionOptions: IConnectionOptions ;
  namespace: string;
  constructor(group, version, namespace, item, kubconfig) {
    this.namespace = namespace;
    const APIRootUrl = getKubernetesAPIURL(loadKubeConfig(kubconfig));
    const fullUrl = `${APIRootUrl}/${group}/${version}/namespaces/${namespace}/${item}/`;
    this.connectionOptions = Object.assign(
        getConnectionOptions(loadKubeConfig(kubconfig)),
        { url: fullUrl, json: true }
    );
  }
  getItem(id) {
    const data = [];
    return new BbPromise((resolve, reject) => {
      request.get(_.assign({}, this.connectionOptions, {
        url: `${this.connectionOptions.url}${id}`,
      }))
        .on('error', err => {
          reject(err);
        })
        .on('data', (d) => {
          data.push(d);
        })
        .on('end', () => {
          const res = Buffer.concat(data).toString();
          resolve(JSON.parse(res));
        });
    });
  }
  list() {
    const data = [];
    return new BbPromise((resolve, reject) => {
      request.get(this.connectionOptions.url)
        .on('error', err => {
          reject(err);
        })
        .on('data', (d) => {
          data.push(d);
        })
        .on('end', () => {
          const res = Buffer.concat(data).toString();
          resolve(JSON.parse(res));
        });
    });
  }
  post(body) {
    const data = [];
    return new Promise((resolve, reject) => {
      request.post(_.assign(body, this.connectionOptions))
        .on('error', err => {
          reject(err);
        })
        .on('data', (d) => {
          data.push(d);
        })
        .on('end', () => {
          const res = Buffer.concat(data).toString();
          resolve(JSON.parse(res));
        });
    });
  }
  put(resourceID, body) {
    const data = [];
    return new BbPromise((resolve, reject) => {
      request.patch(_.assign({}, body, this.connectionOptions, {
        url: `${this.connectionOptions.url}${resourceID}`,
        headers: {
          'Content-Type': 'application/merge-patch+json',
        },
      }))
        .on('error', err => {
          reject(err);
        })
        .on('data', (d) => {
          data.push(d);
        })
        .on('end', () => {
          const res = Buffer.concat(data).toString();
          resolve(JSON.parse(res));
        });
    });
  }
  delete(resourceID) {
    const data = [];
    return new BbPromise((resolve, reject) => {
      request.delete(_.assign({}, this.connectionOptions, {
        url: `${this.connectionOptions.url}${resourceID}`,
      }))
        .on('error', err => {
          reject(err);
        })
        .on('data', (d) => {
          data.push(d);
        })
        .on('end', () => {
          const res = Buffer.concat(data).toString();
          resolve(JSON.parse(res));
        });
    });
  }
}
