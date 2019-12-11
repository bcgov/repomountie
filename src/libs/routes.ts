//
// Repo Mountie
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
// Created by Jason Leach on 2018-10-15.
//

import express from 'express'; // tslint:disable-line
import { Application } from 'probot';
import { authmware } from './authmware';

export const routes = (app: Application) => {
  const exp = express();

  // This middleware will get called before each route.
  exp.use(async (req, res, next) => {
    req.app = app;
    next();
  });

  authmware(exp);

  // // Error handleing middleware. This needs to be last in or it will
  // // not get called.
  // // eslint-disable-next-line no-unused-vars
  // exp.use((err, req, res, next) => {
  //   logger.error(err.message);
  //   const code = err.code ? err.code : 500;
  //   const message = err.message ? err.message : 'Internal Server Error';

  //   res.status(code).json({ error: message, success: false });
  // });

  app.router.use(exp);

  // Get an express router to expose new HTTP endpoints
  const router = app.route('/bot');

  // Add a new route for health and liveliness probes.
  router.get('/ehlo', (req: any, res: any) => res.status(200).end());

  // router.get(
  //   '/github/membership',
  //   passport.authenticate('jwt', { session: false }),
  //   async (req: any, res: any) => {
  //     const myAppId = config.get('githubAppID');
  //     const myApp = req.app;
  //     const { userId } = req.query;

  //     if (!userId) {
  //       // throw errorWithCode('You are not able to download this artifact', 400);
  //       res.status(400).json({ message: 'You must supply a valid github user ID' });
  //       return;
  //     }

  //     try {
  //       // Authenticate with no installation ID grants access to the `apps` API only. This is enough
  //       // to lookup the correct installation ID. If you know it already you can skip this part.
  //       const installations = (await (await myApp.auth()).apps.listInstallations()).data;
  //       const myInstallation = installations.filter(i => i.app_id === myAppId);
  //       const checks = myInstallation.map(async i => {
  //         // Create a new GitHub client authentication as the installation.
  //         const github = await myApp.auth(i.id);
  //         try {
  //           // 204 No Content - The user is a member;
  //           // 404 Not Found  - The user is not a member of the org.
  //           // 302 Found      - TBD

  //           const response = await github.orgs.checkMembership({
  //             org: i.account.login,
  //             username: userId,
  //           });

  //           if (response.status === 204) {
  //             return true;
  //           }

  //           return false;
  //         } catch (checkMembershipApiCallError) {
  //           return false;
  //         }
  //       });

  //       const status = await Promise.all(checks);
  //       const results = myInstallation.map((item, index) => {
  //         return { org: item.account.login, membership: status[index] };
  //       });

  //       res.status(200).json(results);
  //     } catch (err) {
  //       logger.error(err.message);
  //       res.status(500).end();
  //     }
  //   }
  // );
};
