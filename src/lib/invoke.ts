import _ = require('lodash');
const Api = require('kubernetes-client');
import BbPromise = require('bluebird');
import crypto = require('crypto');
import fs = require('fs');
import path = require('path');
import request = require('request');
import helpers = require('../lib/helpers');
import { getConnectionOptions, getDefaultNamespace, loadKubeConfig } from './helpers';

function getData(data, options) {
  const opts = _.defaults({}, options, {
    path: null,
  });
  let result = null;
  try {
    if (!_.isEmpty(data)) {
      if (_.isPlainObject(data)) {
        result = data;
      } else {
        try {
          // Try to parse data as JSON
          JSON.parse(data);
          result = {
            body: data,
            json: true,
          };
        } catch (e) {
          // Assume data is a string
          result = {
            body: data,
          };
        }
      }
    } else if (opts.path) {
      if (!path.isAbsolute(opts.path)) {
        throw new Error('Data path should be absolute');
      }
      if (!fs.existsSync(opts.path)) {
        throw new Error('The file you provided does not exist.');
      }
      result = {
        body: fs.readFileSync(opts.path, 'utf-8'),
        json: true,
      };
    }
  } catch (e) {
    throw new Error(
        `Unable to parse data given in the arguments: \n${e.message}`,
    );
  }
  return result;
}

function invoke(func, data, funcsDesc, options, kubconfig) {
  const opts = _.defaults({}, options, {
    namespace: null,
    path: null,
  });
  const config = loadKubeConfig(kubconfig);
  const APIRootUrl = helpers.getKubernetesAPIURL(config);
  const desc = _.find(funcsDesc, d => d.id === func);
  const namespace = desc.namespace ||
        opts.namespace ||
        getDefaultNamespace(config);
  const connectionOptions = getConnectionOptions(loadKubeConfig(kubconfig));
  const core = new Api.Core(connectionOptions);
  const requestData = getData(data, {
    path: opts.path,
  });
  if (desc.sequence) {
    let promise = null;
    _.each(desc.sequence.slice(), sequenceFunction => {
      if (promise) {
        promise = promise.then(
          result => invoke(sequenceFunction, result.body, funcsDesc, opts, kubconfig),
        );
      } else {
        promise = invoke(sequenceFunction, requestData, funcsDesc, opts, kubconfig);
      }
    });
    return new BbPromise((resolve, reject) => promise.then(
        response => resolve(response),
        err => reject(err),
    ));
  }
  return new BbPromise((resolve, reject) => {
    const parseReponse = (err, response) => {
      if (err) {
        reject(new Error(err.message));
      } else {
        if (response.statusCode !== 200) {
          reject(new Error(response.statusMessage));
        }
        resolve(response);
      }
    };
    core.ns.services.get((err, servicesInfo) => {
      if (err) {
        reject(err);
      } else {
        const functionService = _.find(
          servicesInfo.items,
          (service) => (
            service.metadata.labels &&
            service.metadata.labels.function === func
          ),
        );
        if (_.isEmpty(functionService)) {
          opts.log(`Not found any information about the function "${func}"`);
        }
        const port = functionService.spec.ports[0].name || functionService.spec.ports[0].port;
        const url = `${APIRootUrl}/api/v1/namespaces/${namespace}/services/${func}:${port}/proxy/`;
        const invokeConnectionOptions = Object.assign(
        connectionOptions, {
          url,
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'event-id': `sls-cli-${crypto.randomBytes(6).toString('hex')}`,
            'event-time': new Date().toISOString(),
            'event-type': 'application/x-www-form-urlencoded',
            'event-namespace': 'serverless.kubeless.io',
          },
        },
      );
        if (_.isEmpty(requestData)) {
        // There is no data to send, sending a GET request
          request.get(invokeConnectionOptions, parseReponse);
        } else {
        // Sending request data with a POST
          request.post(
          Object.assign(
            invokeConnectionOptions,
            requestData,
          ),
          parseReponse,
        );
        }
      }
    });
  });
}

module.exports = invoke;
