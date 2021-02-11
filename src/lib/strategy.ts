
import _ = require('lodash');

import {Base64ZipContent} from './strategy/base64_zip_content';
import { Serverless } from './serverless';


const strategies = {
  Base64ZipContent,
};

export class KubelessDeployStrategy {
  serverless: any;
  constructor(serverless: Serverless) {
    this.serverless = serverless;
  }

  factory() {
    const deploy = _.defaults({}, this.serverless.provider.deploy, {
      strategy: 'Base64ZipContent',
      options: {},
    });

    return new Base64ZipContent (this, deploy.options);

    throw new Error(`Unknown deploy strategy "${deploy.strategy}"`);
  }
}

