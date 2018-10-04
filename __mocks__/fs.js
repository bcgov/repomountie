// __mocks__/fs.js
'use strict';

const fs = jest.genMockFromModule('fs');

function access(path, flag, cb) {
  cb(undefined);
}

function readFile(path, encoding, cb) {
  cb(undefined, Buffer.from('Hello World'));
}

fs.readFile = readFile;
fs.access = access;

module.exports = fs;
