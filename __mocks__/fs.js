// __mocks__/fs.js
'use strict';

const fs = jest.requireActual('fs');

function access(path, flag, cb) {
  cb(undefined);
}

function readFile(path, options, cb) {
  cb(undefined, Buffer.from('Hello World', 'utf8'));
  // cb(undefined, 'Hello World');
}

fs.readFile = readFile;
fs.access = access;

module.exports = fs;
