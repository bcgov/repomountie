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

import { logger } from '@bcgov/common-nodejs-utils';
import { Application, Context } from 'probot';
import createScheduler from 'probot-scheduler';
import { ALLOWED_INSTALLATIONS, SCHEDULER_DELAY } from './constants';
import { checkForStaleIssues, created } from './libs/issue';
import { validatePullRequestIfRequired } from './libs/pullrequest';
import { addLicenseIfRequired, addSecurityComplianceInfoIfRequired } from './libs/repository';
import { routes } from './libs/routes';
import { fetchConfigFile } from './libs/utils';

process.env.TZ = 'UTC';

if (['development', 'test'].includes(process.env.NODE_ENV || 'development')) {
  process.on('unhandledRejection', (reason, p) => {
    // @ts-ignore: `stack` does not exist on type
    logger.warn(`Unhandled rejection at promise = ${JSON.stringify(p)}, reason = ${reason.stack}`);
  });
}

export = (app: Application) => {
  logger.info('Robot Loaded!!!');

  routes(app);

  const scheduler = createScheduler(app, {
    delay: false, // !!process.env.DISABLE_DELAY, // delay is enabled on first run
    interval: SCHEDULER_DELAY,
  });

  app.on('pull_request.opened', pullRequestOpened);
  app.on('issue_comment.created', issueCommentCreated);
  app.on('schedule.repository', repositoryScheduled);
  app.on('repository.deleted', repositoryDelete);
  // app.on('repository_vulnerability_alert.create', blarb);

  async function pullRequestOpened(context: Context) {
    try {
      const owner = context.payload.installation.account.login;
      const isFromBot = context.isBot;

      if (!ALLOWED_INSTALLATIONS.includes(owner)) {
        logger.info(
          `Skipping PR ${context.payload.pull_request.number} for repo ${
          context.payload.repository.name
          } because its not from an allowed installation`
        );
        return;
      }

      // This can throw a `TypeError` during testing.
      if (isFromBot) {
        // Don't act crazy.
        logger.info(
          `Skipping PR ${context.payload.pull_request.number} for repo ${
          context.payload.repository.name
          } because its from a bot`
        );
        return;
      }
    } catch (err) {
      logger.info('Unable to determine if the sender is a bot');
    }

    logger.info(
      `Processing PR ${context.payload.pull_request.number} for repo ${
      context.payload.repository.name
      }`
    );

    const config = await fetchConfigFile(context);

    await validatePullRequestIfRequired(context, config);
  }

  async function issueCommentCreated(context: Context) {
    try {
      const owner = context.payload.installation.account.login;
      const isFromBot = context.isBot;

      if (!ALLOWED_INSTALLATIONS.includes(owner)) {
        logger.info(
          `Skipping issue ${context.payload.pull_request.number} for repo ${
          context.payload.repository.name
          } because its not from an allowed installation`
        );
        return;
      }

      // This can throw a `TypeError` during testing.
      if (isFromBot) {
        // Don't act crazy.
        logger.info(`Skipping issue ${context.payload.issue.id} because its from a bot`);
        return;
      }
    } catch (err) {
      logger.info('Unable to determine if the sender is a bot');
    }

    logger.info(`Processing issue ${context.payload.issue.id}`);

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
      const owner = context.payload.installation.account.login;
      if (!ALLOWED_INSTALLATIONS.includes(owner)) {
        logger.info(
          `Skipping scheduled repository ${
          context.payload.repository.name
          } because its not part of an allowed installation`
        );
        return;
      }

      if (context.payload.repository.archived) {
        logger.warn(`The repo ${context.payload.repository.name} is archived. Skipping.`);
        return;
      }

      console.log('0 **************************************************');

      await addLicenseIfRequired(context, scheduler);
      console.log('1 **************************************************');

      await addSecurityComplianceInfoIfRequired(context, scheduler);

      // Functionality below here requires a `config` file exist in the repo.

      console.log('2 **************************************************');
      try {
        const config = await fetchConfigFile(context);
        await checkForStaleIssues(context, config);
      } catch (err) {
        logger.info('No config file. Skipping.');
      }
    } catch (err) {
      const message = `Unable to process repository ${context.payload.repository.name}`;
      logger.error(`${message}, error = ${err.message}`);
    }
  }
};
