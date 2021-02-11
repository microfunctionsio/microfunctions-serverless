import _ = require('lodash');
import fs = require('fs');
import moment = require('moment');
import path = require('path');
import yaml = require('js-yaml');
import proc = require('child_process');

export interface IConnectionOptions {
  ca?: any;
  insecureSkipTlsVerify?: any;
  strictSSL?: any;
  auth?: any;
  group?: any;
  url?: any;
  namespace?: any;

}

export const loadKubeConfig = (kubeConfig: string) => {
  const config = yaml.safeLoad(kubeConfig);
  return config;
};

function getContextName(config) {
  return process.env.KUBECONTEXT || config['current-context'];
}

function getContextInfo(config, context) {
  const contextInfo = _.find(config.contexts, c => c.name === context);
  if (!contextInfo) {
    throw new Error(`Unable to find configuration of context ${context}`);
  }
  return contextInfo.context;
}

function getClusterInfo(config, context) {
  const clusterName = getContextInfo(config, context).cluster;
  const clusterInfo = _.find(config.clusters, c => c.name === clusterName);
  if (!clusterInfo) {
    throw new Error(`Unable to find cluster information for context ${context}`);
  }
  return clusterInfo;
}

function getUserInfo(config, context) {
  const userName = getContextInfo(config, context).user;
  const userInfo = _.find(config.users, u => u.name === userName);
  if (!userInfo) {
    throw new Error(`Unable to find user information for context ${context}`);
  }
  return userInfo;
}

function getToken(userInfo) {
  const token = _.get(userInfo, 'user.token') ||
    _.get(userInfo, 'user.auth-provider.config.id-token');
  const accessToken = _.get(userInfo, 'user.auth-provider.config.access-token');
  let cmd = _.get(userInfo, 'user.exec.command');
  const awsClis = ['aws', 'aws-iam-authenticator'];
  if (token) {
    return token;
  } else if (accessToken) {
    // Access tokens may expire so we better check the expire date
    if (userInfo.user['auth-provider'].config.expiry) {
      const expiry = moment(userInfo.user['auth-provider'].config.expiry);
      if (expiry < moment()) {
        throw new Error(
          'The access token has expired. Make sure you can access your cluster and try again',
        );
      }
    }
    return accessToken;
  } else { // @ts-ignore
    if (cmd && awsClis.includes(cmd) !== -1) {
      const args = _.get(userInfo, 'user.exec.args');
      if (args) {
        cmd = `${cmd} ${args.join(' ')}`;
      }
      const env = _.get(userInfo, 'user.exec.env', []);
      const envvars = Object.assign({}, process.env);
      if (env) {
        for (const envvar of env) {
          envvars[envvar.name] = envvar.value || '';
        }
      }
      let output = {};
      try {
        output = proc.execSync(cmd, { env: envvars });
      } catch (err) {
        throw new Error(`Failed to refresh token: ${err.message}`);
      }
      if (typeof output === 'string') {
        const resultObj = JSON.parse(output);
        const execToken = _.get(resultObj, 'status.token');
        if (execToken) {
          return execToken;
        }
      }

    }
  }
  return null;
}

export const getKubernetesAPIURL = (config) => {
  const currentContext = getContextName(config);
  const clusterInfo = getClusterInfo(config, currentContext);
  // Remove trailing '/' of the URL in case it exists
  let clusterURL = clusterInfo.cluster.server.replace(/\/$/, '');
  // Add protocol if missing
  clusterURL = _.startsWith(clusterURL, 'http') ? clusterURL : `http://${clusterURL}`;
  return clusterURL;
};

function getPropertyText(property, info) {
  // Data could be pointing to a file or be base64 encoded
  let result = null;
  if (!_.isEmpty(info[property])) {
    result = fs.readFileSync(info[property]);
  } else if (!_.isEmpty(info[`${property}-data`])) {
    result = Buffer.from(info[`${property}-data`], 'base64');
  }
  return result;
}

export function getDefaultNamespace(config) {
  const currentContext = getContextName(config);
  return getContextInfo(config, currentContext).namespace || 'default';
}

export function getConnectionOptions(config, modif?:any ) {
  const currentContext = getContextName(config);
  const userInfo = getUserInfo(config, currentContext);
  const clusterInfo = getClusterInfo(config, currentContext);

  const connectionOptions: IConnectionOptions = {
    group: 'k8s.io',
    url: getKubernetesAPIURL(config),
    namespace: getDefaultNamespace(config),
  };
  // Config certificate-authority
  const ca = getPropertyText('certificate-authority', clusterInfo.cluster);
  if (ca) {
    connectionOptions.ca = ca;
  } else {
    // No certificate-authority found
    connectionOptions.insecureSkipTlsVerify = true;
    connectionOptions.strictSSL = false;
  }
  // Config authentication
  const token = getToken(userInfo);
  if (token) {
    connectionOptions.auth = {
      bearer: token,
    };
  } else {
    // If there is not a valid token we can authenticate either using
    // username and password or a certificate and a key
    const user = _.get(userInfo, 'user.username');
    const password = _.get(userInfo, 'user.password');
    if (!_.isEmpty(user) && !_.isEmpty(password)) {
      connectionOptions.auth = { user, password };
    } else {
      const properties = {
        cert: 'client-certificate',
        key: 'client-key',
      };
      _.each(properties, (property, key) => {
        connectionOptions[key] = getPropertyText(property, userInfo.user);
        if (!connectionOptions[key]) {
          console.log(
            'Unable to find required information for authenticating against the cluster',
          );
        }
      });
    }
  }
  return _.defaults({}, modif, connectionOptions);
}

export function warnUnsupportedOptions(unsupportedOptions, definedOptions, logFunction) {
  unsupportedOptions.forEach((opt) => {
    if (!_.isUndefined(definedOptions[opt])) {
      logFunction(`Warning: Option ${opt} is not supported for the kubeless plugin`);
    }
  });
}

export function getRuntimeDepfile(runtime, configMap) {
  const runtimesInfo = configMap.get('runtime-images', { parse: true });
  let depFile = null;
  _.each(runtimesInfo, r => {
    if (runtime.match(r.ID)) {
      depFile = r.depName;
    }
  });
  return depFile;
}

export function checkFinished(counter, max, errors, resolve, reject, options?: any) {
  const opts = _.defaults({}, options, {
    onSuccess: () => new Promise(r => r()),
  });
  if (counter === max) {
    if (_.isEmpty(errors)) {
      opts.onSuccess().then(resolve);
    } else {
      reject(new Error(
        'Found errors while processing the given functions:\n' +
        `${errors.join('\n')}`,
      ));
    }
  }
}

export  function getDeployableItemsNumber(functions) {
  return _.sum([_.keys(functions).length].concat(_.map(functions, f => _.size(f.events))));
}

export function setExponentialInterval(targetFunction, initialDelay, maxDelay) {
  let delay = initialDelay;
  let timer;
  const timerWrapper = () => {
    try {
      targetFunction();
    } catch (ex) {
      console.error(ex);
    }
    if (timer) {
      delay = Math.round(delay * 1.2);
      if (delay > maxDelay) {
        delay = maxDelay;
      }
      timer = setTimeout(timerWrapper, delay);
    }
  };
  timer = setTimeout(timerWrapper, delay);
  return {
    clearInterval: () => {
      clearTimeout(timer);
      timer = null;
    },
  };
}


