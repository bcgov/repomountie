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
// Created by Jason Leach on 2018-02-14.
//

/* eslint-env es6 */

'use strict';

import { getJwtCertificate, logger } from '@bcgov/common-nodejs-utils';
import passport from 'passport';
import { ExtractJwt, Strategy as JwtStrategy } from 'passport-jwt';
import config from '../config';
import { ACCESS_CONTROL } from '../constants';

interface JwtStrategyConfig {
  jwtFromRequest: any;
  algorithms: [string];
  secretOrKey: string;
  passReqToCallback: boolean;
  ignoreExpiration?: boolean;
}

export const isAuthorized = (jwtPayload) => {
  // jwtPayload.azp - The client ID
  // jwtPayload.preferred_username - The preferred user name
  if (jwtPayload && jwtPayload.azp && ACCESS_CONTROL.allowedSsoClients.includes(jwtPayload.azp)) {
    return true;
  }

  return false;
};

export const verify = (req: any, jwtPayload: any, done: (err: any, user: any) => void) => {
  // At this point we know the JWT is from our server and is valid.
  if (jwtPayload) {
    if (!isAuthorized(jwtPayload)) {
      const message = 'This JWT does not have the proper role to use this service';
      logger.error(message);

      // Returning an `Error` as the first parameter to `done` does not have a meaningful
      // effect. Null returned in place.
      return done(null, null);
    }

    return done(null, {}); // OK.
  }

  const err = new Error('Unable to authenticate');
  // err.code = 401;

  return done(err, false);
};

// eslint-disable-next-line import/prefer-default-export
export const authmware = async (app) => {
  app.use(passport.initialize());
  app.use(passport.session());

  const { certificate, algorithm } = await getJwtCertificate(config.get('sso:certsUrl'));
  const opts: JwtStrategyConfig = {
    algorithms: [algorithm],
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    passReqToCallback: true,
    secretOrKey: certificate,
  };

  // For development purposes only ignore the expiration
  // time of tokens.
  if (config.get('environment') !== 'production') {
    opts.ignoreExpiration = true;
  }

  const jwtStrategy = new JwtStrategy(opts, verify);

  passport.use(jwtStrategy);
};
