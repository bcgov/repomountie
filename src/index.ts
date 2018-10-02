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
// Created by Jason Leach on 2018-10-01.
//

import { logger } from '@bcgov/nodejs-common-utils';
import { Application, Context } from 'probot';
import createScheduler from 'probot-scheduler';
import { BRANCHES, SCHEDULER_DELAY, VALID_LICENSES } from './constants';
import { addLicense } from './libs/content';

export = (app: Application) => {
  logger.info('Loaded!!!');

  const scheduler = createScheduler(app, {
    delay: false, // !!process.env.DISABLE_DELAY, // delay is enabled on first run
    interval: SCHEDULER_DELAY,
  });

  app.on('repository.deleted', async (context: Context) => {
    scheduler.stop(context.payload.repository);
  });

  app.on('schedule.repository', async (context: Context) => {
    // writeEvent(context);
    try {
      // Currently we only have one cultural rule, a repo must have a licence. If this
      // is true then we can safely disable the bot for the particular repo.
      if (
        context.payload.repository.license &&
        Object.values(VALID_LICENSES).includes(context.payload.repository.license)
      ) {
        scheduler.stop(context.payload.repository);
        return;
      }

      // If the repo does *not* have a master branch then we don't want to add one.
      // The dev team may be doing this off-line and when they go to push master it
      // will cause a conflict because there will be no common root commit.
      const master = await context.github.gitdata.getReference(
        context.repo({
          ref: 'heads/master',
        })
      );

      // fs.writeFileSync(`./master.json`, Buffer.from(JSON.stringify(master)));
      if (!master) {
        return;
      }

      if (!context.payload.repository.license) {
        // Check if we have already created a branch for licencing. If we have then
        // move along, otherwise add one.
        const licenseBranch = await context.github.gitdata.getReference(
          context.repo({
            ref: BRANCHES.LICENSE,
          })
        );

        if (licenseBranch) {
          return;
        }

        // Add a license via a PR
        addLicense(context);
      }
    } catch (error) {
      logger.error(error.message);
    }
  });
};
