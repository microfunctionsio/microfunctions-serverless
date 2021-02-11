import crypto = require('crypto');
import fs = require('fs');
import BbPromise = require('bluebird');

export class Base64ZipContent {
  strategy: any;
  options: any;

  constructor(strategy, options) {
    this.strategy = strategy;
    this.options = options;
  }

  deploy(description, artifact) {
    return new BbPromise((resolve) => {
      const shasum = crypto.createHash('sha256');
      const content = artifact;

      shasum.update(content);

      resolve({
        content: content.toString('base64'),
        checksum: `sha256:${shasum.digest('hex')}`,
        contentType: 'base64+zip',
      });
    });
  }
}
