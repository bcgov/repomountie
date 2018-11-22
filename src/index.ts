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
import createScheduler from '@bcgov/probot-scheduler';
import { Application, Context } from 'probot';
import { SCHEDULER_DELAY } from './constants';
import { created } from './libs/issue';
import { validatePullRequestIfRequired } from './libs/pullrequest';
import { addLicenseIfRequired } from './libs/repository';

process.env.TZ = 'UTC';

export = (app: Application) => {
  logger.info('Robot Loaded!!!');

  const scheduler = createScheduler(app, {
    delay: false, // !!process.env.DISABLE_DELAY, // delay is enabled on first run
    interval: SCHEDULER_DELAY,
  });

  app.on('pull_request.opened', pullRequestOpened);
  app.on('issue_comment.created', issueCommentCreated);
  app.on('schedule.repository', repositoryScheduled);
  app.on('repository.deleted', repositoryDelete);

  async function pullRequestOpened(context: Context) {
    logger.info(
      `Processing PR ${context.payload.pull_request.number} for repo ${
        context.payload.repository.name
      }`
    );

    try {
      // This can throw a `TypeError` during testing.
      if (context.isBot) {
        // Don't act crazy.
        return;
      }
    } catch (err) {
      logger.info('Unable to determine if the sender is a bot');
    }

    await validatePullRequestIfRequired(context);
  }

  async function issueCommentCreated(context: Context) {
    logger.info(`Processing issue ${context.payload.issue.id}`);

    try {
      // This can throw a `TypeError` during testing.
      if (context.isBot) {
        // Don't act crazy.
        return;
      }
    } catch (err) {
      logger.info('Unable to determine if the sender is a bot');
    }

    try {
      await created(context);
    } catch (err) {
      logger.error(`Unable to process issue ${context.payload.issue.id}`);
    }
  }

  async function repositoryDelete(context: Context) {
    scheduler.stop(context.payload.repository);
  }

  async function repositoryScheduled(context: Context) {
    logger.info(`Processing ${context.payload.repository.name}`);

    try {
      if (context.payload.repository.archived) {
        logger.warn(`The repo ${context.payload.repository.name} is archived. Skipping.`);
        return;
      }

      await addLicenseIfRequired(context, scheduler);
    } catch (err) {
      logger.error(`Unable to add license to ${context.payload.repository.name}`);
    }
  }
};
