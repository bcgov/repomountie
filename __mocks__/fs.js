// __mocks__/fs.js
'use strict';

const fs = jest.genMockFromModule('fs');

// This is a custom function that our tests can use during setup to specify
// what the files on the "mock" filesystem should look like when any of the
// `fs` APIs are used.

// let mockFiles = Object.create(null);
// function __setMockFiles(newMockFiles) {
//   mockFiles = Object.create(null);
//   for (const file in newMockFiles) {
//     const dir = path.dirname(file);

//     if (!mockFiles[dir]) {
//       mockFiles[dir] = [];
//     }
//     mockFiles[dir].push(path.basename(file));
//   }
// }

// A custom version of `readdirSync` that reads from the special mocked out
// file list set via __setMockFiles

function access(path, flag, cb) {
  cb(undefined);
}

function readFile(path, encoding, cb) {
  cb(undefined, Buffer.from('Hello World'));
}

// fs.__setMockFiles = __setMockFiles;
fs.readFile = readFile;
fs.access = access;

module.exports = fs;
