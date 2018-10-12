// __mocks__/fs.js
'use strict';

const fs = jest.requireActual('fs');

function access(path, flag, cb) {
  if (path === 'no-file-access') {
    return cb(new Error('No access to this file - mock'));
  }

  return cb(undefined);
}

function readFile(path, options, cb) {
  if (path === 'no-file') {
    return cb(new Error('No such file - mock'), undefined);
  }

  return cb(undefined, Buffer.from('Hello World', 'utf8'));
}

fs.readFile = readFile;
fs.access = access;

module.exports = fs;
