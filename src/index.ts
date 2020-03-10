//
// Copyright © 2018, 2019, 2020 Province of British Columbia
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
import { ACCESS_CONTROL, SCHEDULER_DELAY } from './constants';
import { connect } from './db';
import { assignUsersToIssue, fetchCollaborators, fetchComplianceFile, fetchConfigFile } from './libs/ghutils';
import { checkForStaleIssues, created } from './libs/issue';
import { validatePullRequestIfRequired } from './libs/pullrequest';
import { addLicenseIfRequired, addSecurityComplianceInfoIfRequired } from './libs/repository';
import { routes } from './libs/routes';
import { extractComplianceStatus } from './libs/utils';

process.env.TZ = 'UTC';

if (['development', 'test'].includes(process.env.NODE_ENV || 'development')) {
  process.on('unhandledRejection', (reason, p) => {
    // @ts-ignore: `stack` does not exist on type
    const stack = typeof (reason) !== 'undefined' ? reason.stack : 'unknown';
    // Token decode errors are OK in test because we use a faux token for
    // mock objects.
    if (stack.includes('HttpError: A JSON web token could not be decoded')) {
      return;
    }

    logger.warn(`Unhandled rejection at promise = ${JSON.stringify(p)}, reason = ${stack}`);
  });
}

export = async (app: Application) => {
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

  try {
    await connect();
  } catch (err) {
    const message = `Unable to open database connection`;
    throw new Error(`${message}, error = ${err.message}`);
  }

  async function pullRequestOpened(context: Context) {
    try {
      const owner = context.payload.organization.login;
      const isFromBot = context.isBot;

      if (!ACCESS_CONTROL.allowedInstallations.includes(owner)) {
        logger.info(
          `Skipping PR ${context.payload.pull_request.number} for repo ${
          context.payload.repository.name
          } because its not from an allowed installation`
        );
        return;
      }

      if (isFromBot) {
        if (context.payload.pull_request.assignees.length === 0) {
          const collaborators = await fetchCollaborators(context);
          const admins = collaborators.filter((c) => c.permissions.admin === true)
            .map((u) => u.login);
          if (admins.length > 0) {
            await assignUsersToIssue(context, admins);
          }
        }

        return;
      }
    } catch (err) {
      logger.info(`Unable to handle pull request, err = ${err.message}`);
    }

    logger.info(
      `Processing PR ${context.payload.pull_request.number} for repo ${
      context.payload.repository.name
      }`
    );

    const rmconfig = await fetchConfigFile(context);

    await validatePullRequestIfRequired(context, rmconfig);
  }

  async function issueCommentCreated(context: Context) {
    try {
      const owner = context.payload.organization.login;
      const isFromBot = context.isBot;

      if (!ACCESS_CONTROL.allowedInstallations.includes(owner)) {
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
      logger.info(`Unable to process issue comment, err = ${err.message}`);
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

    const owner = context.payload.installation.account.login;
    if (!ACCESS_CONTROL.allowedInstallations.includes(owner)) {
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

    let requiresComplianceFile = false;
    try {
      const data = await fetchComplianceFile(context);
      const doc = extractComplianceStatus(context.payload.repository.name,
        context.payload.installation.account.login, data);

      await doc.save();
    } catch (err) {
      const message = `Unable to check compliance in repository ${context.payload.repository.name}`;
      logger.error(`${message}, error = ${err.message}`);

      requiresComplianceFile = true;
    }

    try {
      if (requiresComplianceFile) {
        await addSecurityComplianceInfoIfRequired(context, scheduler);
      }
      await addLicenseIfRequired(context, scheduler);

      // Functionality below here requires a `config` file exist in the repo.

      try {
        const rmconfig = await fetchConfigFile(context);
        await checkForStaleIssues(context, rmconfig);
      } catch (err) {
        logger.info('No config file. Skipping.');
      }
    } catch (err) {
      const message = `Unable to process repository ${context.payload.repository.name}`;
      logger.error(`${message}, error = ${err.message}`);
    }
  }
};
