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
import { SCHEDULER_DELAY } from './constants';
import { issueCommentCreated, memberAddedOrEdited, pullRequestOpened, repositoryCreated, repositoryDeleted, repositoryScheduled } from './libs/handlers';
import { routes } from './libs/routes';

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

  app.on('schedule.repository', async (context: Context) =>
    await repositoryScheduled(context, scheduler));
  app.on('repository.created', repositoryCreated);
  app.on('pull_request.opened', pullRequestOpened);
  app.on('issue_comment.created', issueCommentCreated);
  app.on('repository.deleted', async (context: Context) =>
    await repositoryDeleted(context, scheduler));
  app.on('member.added', memberAddedOrEdited);
  app.on('member.edited', memberAddedOrEdited);

  // app.on('repository_vulnerability_alert.create', blarb);
};
