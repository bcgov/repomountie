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
import { Application } from 'probot';
import createScheduler from 'probot-scheduler';
import { BRANCHES, SCHEDULER_DELAY, VALID_LICENSES } from './constants';
import { addLicense } from './lib/content';

export = (app: Application) => {
  logger.info('Loaded!!!');

  const scheduler = createScheduler(app, {
    delay: false, // !!process.env.DISABLE_DELAY, // delay is enabled on first run
    interval: SCHEDULER_DELAY,
  });

  app.on('repository.deleted', async context => {
    scheduler.stop(context.payload.repository);
  });

  app.on('schedule.repository', async context => {
    try {
      const master = await context.github.gitdata.getReference(
        context.repo({
          ref: 'heads/master',
        })
      );

      if (
        context.payload.repository.license &&
        Object.values(VALID_LICENSES).includes(context.payload.repository.license)
      ) {
        scheduler.stop(context.payload.repository);
        return;
      }

      if (!context.payload.repository.license && master) {
        const licenseBranch = await context.github.gitdata.getReference(
          context.repo({
            ref: BRANCHES.LICENSE,
          })
        );

        if (licenseBranch) {
          return;
        }

        addLicense(context);
      }
    } catch (error) {
      logger.error(error.message);
    }
  });
};
