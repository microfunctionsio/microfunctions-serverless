import BbPromise = require('bluebird');
import * as babelCore from '@babel/core';
import stripIndent = require('strip-indent');
import { from, of } from 'rxjs';

const babelTransformEs2015 = [
  require('babel-plugin-transform-block-scope-to-iife'),
  require('@babel/plugin-transform-template-literals'),
  require('@babel/plugin-transform-literals'),
  require('@babel/plugin-transform-function-name'),
  require('@babel/plugin-transform-arrow-functions'),
  require('@babel/plugin-transform-block-scoped-functions'),
  require('@babel/plugin-transform-classes'),
  require('@babel/plugin-transform-object-super'),
  require('@babel/plugin-transform-shorthand-properties'),
  require('@babel/plugin-transform-duplicate-keys'),
  require('@babel/plugin-transform-computed-properties'),
  require('@babel/plugin-transform-for-of'),
  require('@babel/plugin-transform-sticky-regex'),
  require('@babel/plugin-transform-unicode-regex'),
  require('@babel/plugin-transform-spread'),
  require('@babel/plugin-transform-parameters'),
  require('@babel/plugin-transform-destructuring'),
  require('@babel/plugin-transform-block-scoping'),
  require('@babel/plugin-transform-typeof-symbol'),
  require('@babel/plugin-transform-instanceof'),
];

const babelTransformEs2016 = [
  require('@babel/plugin-transform-exponentiation-operator'),
];

const babelTransformEs2017 = [
  require('@babel/plugin-transform-async-to-generator'),
];

const babelTransformEs2018 = [
  require('@babel/plugin-proposal-object-rest-spread'),
  require('@babel/plugin-proposal-async-generator-functions'),
];

// Loading this plugin removes inlined Babel helpers.
const babelExternalHelpersPlugin = require('@babel/plugin-external-helpers');

// We enumerate syntax plugins that would automatically be loaded by our
// transform plugins because we need to support the configuration where we
// minify but don't compile, and don't want Babel to error when it encounters
// syntax that we support when compiling.
const babelSyntaxPlugins = [
  // ES2017 and below syntax plugins are included by default.
  // ES2018 (partial)
  require('@babel/plugin-syntax-object-rest-spread'),
  require('@babel/plugin-syntax-async-generators'),
  // Future
  // require('@babel/plugin-syntax-export-extensions'),
  require('@babel/plugin-syntax-dynamic-import'),
  require('@babel/plugin-syntax-import-meta'),
];
const babelPresetMinify = require('babel-preset-minify')({}, {

  // Disable this or you get `{ err: 'Couldn\'t find intersection' }` now.
  // https://github.com/babel/minify/issues/904
  builtIns: false,

  // Disable the minify-constant-folding plugin because it has a bug relating
  // to invalid substitution of constant values into export specifiers:
  // https://github.com/babel/minify/issues/820
  evaluate: false,

  // TODO(aomarks) Find out why we disabled this plugin.
  simplifyComparisons: false,

  // Prevent removal of things that babel thinks are unreachable, but sometimes
  // gets wrong: https://github.com/Polymer/tools/issues/724
  deadcode: false,

  // Prevents this `isPure` on null problem from blowing up minification.
  // https://github.com/babel/minify/issues/790
  removeUndefined: false,

  // Disable the simplify plugin because it can eat some statements preceeding
  // loops. https://github.com/babel/minify/issues/824
  simplify: false,

  // This is breaking ES6 output. https://github.com/Polymer/tools/issues/261
  mangle: false,
});
const babelPresetEnv = [require('@babel/preset-env'), { targets: {
         esmodules: true,
  } }];
export type JsCompileTarget = 'es5' | 'es2015' | 'es2016' | 'es2017' | 'es2018';
export type ModuleResolutionStrategy = 'none' | 'node';

/**
 * Options for jsTransform.
 */
export interface JsTransformOptions {
  // Whether to compile JavaScript to ES5.
  compile?: boolean | JsCompileTarget;

  // If true, do not include Babel helper functions in the output. Otherwise,
  // any Babel helper functions that were required by this transform (e.g. ES5
  // compilation or AMD module transformation) will be automatically included
  // inline with this output. If you set this option, you must provide those
  // required Babel helpers by some other means.
  externalHelpers?: boolean;

  // Whether to minify JavaScript.
  minify?: boolean;

  // What kind of ES module resolution/remapping to apply.
  moduleResolution?: ModuleResolutionStrategy;

  // The path of the file being transformed, used for module resolution.
  // Must be an absolute filesystem path.
  filePath?: string;

  // The package name of the file being transformed, required when
  // `isComponentRequest` is true.
  packageName?: string;

  // For Polyserve or other servers with similar component directory mounting
  // behavior. Whether this is a request for a package in node_modules/.
  isComponentRequest?: boolean;

  // The component directory to use when rewriting bare specifiers to relative
  // paths. A resolved path that begins with the component directory will be
  // rewritten to be relative to the root.
  componentDir?: string;

  // The root directory of the package containing the component directory.
  // Must be an absolute filesystem path.
  rootDir?: string;

  // Whether to replace ES modules with AMD modules. If `auto`, run the
  // transform if the script contains any ES module import/export syntax.
  transformModulesToAmd?: boolean | 'auto';

  // If true, parsing of invalid JavaScript will not throw an exception.
  // Instead, a console error will be logged, and the original JavaScript will
  // be returned with no changes. Use with caution!
  softSyntaxError?: boolean;
}

export class JsTransform {
  language: any;
  options: JsTransformOptions;

  constructor(language, options?: JsTransformOptions) {
    this.options = options;
    this.language = language;
    this.options = {
      compile: 'es5',
      minify:true,
    };
  }

  transform(content) {
    return from(this.jsTransform(stripIndent(content), this.options));
  }

  /**
   * Transform some JavaScript according to the given options.
   */
  private jsTransform(js: string, options: JsTransformOptions): any {
    // Even with no transform plugins, parsing and serializing with Babel will
    // make some minor formatting changes to the code. Skip Babel altogether
    // if we have no meaningful changes to make.
    let doBabelTransform = false;

    // Note that Babel plugins run in this order:
    // 1) plugins, first to last
    // 2) presets, last to first
    const plugins = [...babelSyntaxPlugins];
    const presets: any[] = [babelPresetEnv];

    if (options.externalHelpers) {
      plugins.push(babelExternalHelpersPlugin);
    }
    if (options.minify) {
      doBabelTransform = true;
      // Minify last, so push first.
      presets.push(babelPresetMinify);
    }
    if (options.compile === true || options.compile === 'es5') {
      doBabelTransform = true;
      plugins.push(...babelTransformEs2015);
  //    plugins.push(...babelTransformEs2016);
  //    plugins.push(...babelTransformEs2017);
  //    plugins.push(...babelTransformEs2018);
    } else if (options.compile === 'es2015') {
      doBabelTransform = true;
      plugins.push(...babelTransformEs2016);
      plugins.push(...babelTransformEs2017);
      plugins.push(...babelTransformEs2018);
    } else if (options.compile === 'es2016') {
      doBabelTransform = true;
      plugins.push(...babelTransformEs2017);
      plugins.push(...babelTransformEs2018);
    } else if (options.compile === 'es2017') {
      doBabelTransform = true;
      plugins.push(...babelTransformEs2018);
    }
    const result = babelCore.transformAsync( js, {presets, plugins});
    return result;

  }
}

