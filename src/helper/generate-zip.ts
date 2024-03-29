import type * as JSZip from 'jszip';

/**
 * A list of filenames and their contents as a string.
 */
type FileList = { [filename: string]: string };

/**
 * Given a series of filename/content pairs, creates a .zip file.
 *
 * For create a .kmp file, do the following:
 *
 *  let kmpFile = async createZipWithFiles({
 *      [`${modelID}.model.js`]: compiledModelCode,
 *      "kmp.json": JSON.stringify(modelInfo)
 *  })
 */
export function createZipWithFiles(files: FileList): Promise<ArrayBuffer> {
  const zip = createJSZip();
  for (const [filename, contents] of Object.entries(files)) {
    zip.file(filename, contents);
  }

  return zip.generateAsync({ type: "nodebuffer" });
}

////////////////////////////////// Helpers ///////////////////////////////////

type JSZipConstructor = new () => JSZip;

/**
 * This pile of hacks tries to load the JSZip library, whether in Node.JS or
 * in the WebWorker context.
 *
 * In the WebWorker context, it is assumed that JSZip was loaded globally, and
 * is accessible as self.JSZip.
 *
 * In Node.JS, you require() it like any other module.
 */
function createJSZip(): JSZip {
  let Constructor: JSZipConstructor;

  Constructor = require("jszip");
  return new Constructor();
}

