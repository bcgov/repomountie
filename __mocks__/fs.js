// __mocks__/fs.js
'use strict';

const fs = jest.requireActual('fs');

function access(path, flag, cb) {
  cb(undefined);
}

function readFile(path, options, cb) {
  if (path === 'no-file') {
    return cb(new Error('Message'), undefined);
  }

  return cb(undefined, Buffer.from('Hello World', 'utf8'));
}

fs.readFile = readFile;
fs.access = access;

module.exports = fs;
