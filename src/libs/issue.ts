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
import { COMMENT_TRIGGER_WORD, GITHUB_ID, HELP_DESK, TEXT_FILES } from '../constants';
import { labelExists, loadTemplate, RepoMountieConfig } from '../libs/utils';

/**
 * Determine if help desk support is required
 * @param {Context} context The event context context
 * @returns True if support is required, false otherwise.
 */
export const helpDeskSupportRequired = (issue: any) => {
  const triggerWord = COMMENT_TRIGGER_WORD;
  const notMyIssue = issue.issue.user.login !== `${GITHUB_ID}[bot]`;
  const noHelpRequired = issue.comment.body.search(triggerWord) === -1;
  const isAssigned = issue.issue.assignees.some(e =>
    HELP_DESK.LICENSE_SUPPORT_USERS.includes(e.login)
  );

  // early return
  if (isAssigned || noHelpRequired || notMyIssue) {
    return false;
  }

  return true;
};

/**
 * Assign members to a given issue
 * @param {Context} context The event context context
 * @returns No return value
 */
export const assignHelpDeskMembers = async (context: Context) => {
  try {
    // Assign our help desk license specialists ;)
    await context.github.issues.addAssignees(
      context.issue({
        assignees: HELP_DESK.LICENSE_SUPPORT_USERS,
      })
    );
  } catch (err) {
    const message = 'Unable to assign user to issue.';
    logger.error(`${message}, error = ${err.message}`);
  }
};

/**
 * Process an issue comment.
 * As per the GH docs, an Issue and PR are pretty much the same
 * thing when looking at the data structure.
 * @param {Context} context The event context context
 * @returns No return value
 */
export const created = async (context: Context) => {
  // For we just assign help desk willynilly, going forward we should
  // better identify the issue and assign users with surgical precision.

  if (helpDeskSupportRequired(context.payload)) {
    await assignHelpDeskMembers(context);
    return;
  }
};

export const checkForStaleIssues = async (context: Context, config: RepoMountieConfig) => {
  if (!config.staleIssue) {
    return;
  }

  const aDate = new Date(Date.now() - (config.staleIssue.maxDaysOld * 24 * 60 * 60 * 1000));
  const timestamp = (aDate).toISOString().replace(/\.\d{3}\w$/, '');
  const owner = context.payload.repository.owner.login;
  const repo = context.payload.repository.name;
  const query = `repo:${owner}/${repo} is:open updated:<${timestamp}`

  // get all the old PRs.
  // if we have some old ones,
  // add a comment,
  // add a label if it exists
  // update the issue as closed.

  try {
    const response = await context.github.search.issuesAndPullRequests({
      q: query,
      sort: 'updated',
      order: 'desc',
      per_page: 100
    });
    const totalCount = response.data.total_count;
    const items = response.data.items;

    if (totalCount === 0) {
      return;
    }

    const regex = /\[MAX_DAYS_OLD\]/gi;
    const rawMessageBody: string = await loadTemplate(TEXT_FILES.STALE_COMMENT);
    const body = rawMessageBody
      .replace(regex, `${config.staleIssue.maxDaysOld}`);

    let labels: Array<string> = [];
    if (config.staleIssue && config.staleIssue.applyLabel && (await labelExists(context, config.staleIssue.applyLabel))) {
      labels.push(config.staleIssue.applyLabel)
    }

    const promises = items.map(item => {
      // TODO:(jl) I think the probot framework includes the `number` parameter that is causing a
      // deprecation warning. I'm leaving it for now to see if they fix it in a near-term release.
      labels.concat(item.labels.map(l => l.name));
      return [
        context.github.issues.createComment(context.issue({ body, issue_number: item.number })),
        context.github.issues.addLabels(context.issue({ issue_number: item.number, labels })),
        context.github.issues.update(context.issue({ state: 'closed', issue_number: item.number }))
      ]
    });

    await Promise.all(flatten(promises));
  } catch (err) {
    const message = 'Unable to process stale issue';
    logger.error(`${message}, error = ${err.message}`);
  }
}
