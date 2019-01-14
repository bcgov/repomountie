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
// import { ACCESS_CONTROL } from '../constants';

interface JwtStrategyConfig {
  jwtFromRequest: any;
  algorithms: [string];
  secretOrKey: string;
  passReqToCallback: boolean;
  ignoreExpiration?: boolean;
}

export const isAuthorized = jwtPayload => {
  // if (
  //   jwtPayload.azp === ACCESS_CONTROL.AGENT_CLIENT_ID &&
  //   jwtPayload.preferred_username === ACCESS_CONTROL.AGENT_USER
  // ) {
  //   return true;
  // }

  return true;
};

export const verify = (req: any, jwtPayload: any, done: (err: any, user: any) => void) => {
  if (jwtPayload) {
    // if (!isAuthorized(jwtPayload)) {
    //   const err = new Error('You do not have the proper role for signing');
    //   err.code = 401;

    //   return done(err, null);
    // }

    return done(null, {}); // OK
  }

  const err = new Error('Unable to authenticate');
  // err.code = 401;

  return done(err, false);
};

// eslint-disable-next-line import/prefer-default-export
export const authmware = async app => {
  // app.use(session(sessionOptions));
  app.use(passport.initialize());
  app.use(passport.session());

  // We don't store any user information.
  passport.serializeUser((user, done) => {
    logger.info('serialize');
    done(null, {});
  });

  // We don't load any addtional user information.
  passport.deserializeUser((id, done) => {
    logger.info('deserialize');
    done(null, {});
  });

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
