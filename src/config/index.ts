//
// SecureImage
//
// Copyright © 2018 Province of British Columbia
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//
// Created by Jason Leach on 2018-01-10.
//

/* eslint-env es6 */

'use strict';

import dotenv from 'dotenv';
import nconf from 'nconf';
import path from 'path';

const env = process.env.NODE_ENV || 'development';
const defaultPort = 3000;

if (env === 'development') {
  dotenv.config();
}

/**
 * These settings contain sensitive information and should not be
 * stored in the repo. They are extracted from environment variables
 * and added to the config.
 */

// overrides are always as defined
nconf.overrides({
  environment: env,
  githubAppID: process.env.APP_ID,
  host: process.env.HOST || '127.0.0.1',
  port: process.env.PORT || defaultPort,
  sso: {
    clientSecret: process.env.SSO_CLIENT_SECRET,
  },
});

// load other properties from file.
nconf
  .argv()
  .env()
  .file({ file: path.join(__dirname, `${env}.json`) });

// if nothing else is set, use defaults. This will be set if
// they do not exist in overrides or the config file.
nconf.defaults({
  appUrl: process.env.APP_URL || `http://localhost:${process.env.PORT}`,
});

export default nconf;
