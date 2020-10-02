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
import { flatten } from 'lodash';
import { Context } from 'probot';
import { REGEXP, TEXT_FILES } from '../constants';
import { isOrgMember, labelExists, RepoMountieConfig } from './ghutils';
import { handleBotCommand } from './robo';
import { loadTemplate } from './utils';

/**
 * Process an issue comment.
 * As per the GH docs, an Issue and PR are pretty much the same
 * thing when looking at the data structure.
 * @param {Context} context The event context context
 * @returns No return value
 */
export const created = async (context: Context) => {
  const re = new RegExp(REGEXP.command, 'gi');

  // TODO:(jl) Need to wrap in try/catch.

  if (!(await isOrgMember(context, context.payload.comment.user.login))) {
    return;
  }

  // check for and handle bot commands
  if (re.test(context.payload.comment.body)) {
    await handleBotCommand(context);
  }
};

// TODO:(jl) Should this should be moved to repo because its processing
// all the issues in a repo.
export const checkForStaleIssues = async (
  context: Context,
  config: RepoMountieConfig
) => {
  if (!config.staleIssue) {
    return;
  }

  const aDate = new Date(
    Date.now() - config.staleIssue.maxDaysOld * 24 * 60 * 60 * 1000
  );
  const timestamp = aDate.toISOString().replace(/\.\d{3}\w$/, '');
  const owner = context.payload.repository.owner.login;
  const repo = context.payload.repository.name;
  const query = `repo:${owner}/${repo} is:open updated:<${timestamp} -label:neverstale`;

  try {
    const response = await context.github.search.issuesAndPullRequests({
      order: 'desc',
      per_page: 100,
      q: query,
      sort: 'updated',
    });
    const totalCount = response.data.total_count
      ? response.data.total_count
      : 0;
    const items = response.data.items ? response.data.items : [];

    if (totalCount === 0) {
      return;
    }

    const regex = /\[MAX_DAYS_OLD\]/gi;
    const rawMessageBody: string = await loadTemplate(
      TEXT_FILES.STALE_ISSUE_COMMENT
    );
    const body = rawMessageBody.replace(
      regex,
      `${config.staleIssue.maxDaysOld}`
    );

    const labels: string[] = [];
    if (
      config.staleIssue.applyLabel &&
      (await labelExists(context, config.staleIssue.applyLabel))
    ) {
      labels.push(config.staleIssue.applyLabel);
    }

    const promises = items.map((item) => {
      // TODO:(jl) I think the probot framework includes the `number` parameter that is causing a
      // deprecation warning. I'm leaving it for now to see if they fix it in a near-term release.
      labels.concat(item.labels.map((l) => l.name));
      return [
        context.github.issues.createComment(
          context.issue({ body, issue_number: item.number })
        ),
        context.github.issues.addLabels(
          context.issue({ issue_number: item.number, labels })
        ),
        context.github.issues.update(
          context.issue({ state: 'closed', issue_number: item.number })
        ),
      ];
    });

    await Promise.all(flatten(promises));
  } catch (err) {
    const message = 'Unable to process stale issue';
    logger.error(`${message}, error = ${err.message}`);
  }
};
