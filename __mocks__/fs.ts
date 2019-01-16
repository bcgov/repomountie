// __mocks__/fs.js
'use strict';

const fs = require.requireActual('fs');

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
  const text = 'Hello World';
  return cb(undefined, typeof options === 'undefined' ? Buffer.from(text, 'utf8') : text);
}

fs.readFile = readFile;
fs.access = access;

module.exports = fs;
