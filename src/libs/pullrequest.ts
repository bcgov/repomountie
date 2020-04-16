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
import moment from 'moment';
import { Context } from 'probot';
import config from '../config';
import { BOT_NAME, COMMANDS, TEXT_FILES } from '../constants';
import { RepoAffiliation } from './enums';
import { assignUsersToIssue, fetchCollaborators, RepoMountieConfig } from './ghutils';
import { loadTemplate } from './utils';

/**
 * Add comment to stale PRs
 * This func will add a comment to pull request that are
 * older than a threshold of days, and that were originally
 * created by the bot.
 *
 * @param {Context} context The event context context
 * @param {string} owner The organization name
 * @param {string} repo The repo name
 * @returns A void promise, rejection for failure
 */
export const requestUpdateForMyIssues = async (
  context: Context, owner: string, repo: string): Promise<void> => {

  const maxDaysOld = config.get('staleIssueMaxDaysOld');
  const aDate = new Date(Date.now() - (maxDaysOld * 24 * 60 * 60 * 1000));
  const timestamp = (aDate).toISOString().replace(/\.\d{3}\w$/, '');
  const query = `repo:${owner}/${repo} is:open updated:<${timestamp} author:app/${BOT_NAME}`;

  try {
    const response = await context.github.search.issuesAndPullRequests({
      order: 'desc',
      per_page: 100,
      q: query,
      sort: 'updated',
    });

    if (response.data.items.length === 0) {
      return;
    }

    const rawMessageBody: string = await loadTemplate(TEXT_FILES.STALE_PR_COMMENT);
    const regex = /\[DAYS_OLD\]/gi;
    const promises = response.data.items.map(i => {
      const now = moment(Date.now());
      const diffInDays = now.diff(moment(i.updated_at), 'days');
      const body = rawMessageBody
        .replace(regex, `${diffInDays}`);

      context.github.issues.createComment({
        issue_number: i.number,
        owner,
        repo,
        body,
      });
    });

    await Promise.all(promises);
  } catch (err) {
    const message = `Unable to request PR update`;
    logger.error(`${message}, error = ${err.message}`);
  }
};

/**
 * Add collaborators to pull requests
 * This func will assign repo collaborators with `admin` and
 * `push` permission to all the pull requests in the repo. The
 * pull request must be one that was created by the bot and
 * not have any existing assignees.
 *
 * @param {Context} context The event context context
 * @returns True if the PR should be ignored, False otherwise
 */
export const addCollaboratorsToMyIssues = async (
  context: Context, owner: string, repo: string) => {

  try {
    // filter for issues created by the bot that don't have any
    // assignees

    const query = `repo:${owner}/${repo} is:open is:pr no:assignee author:app/${BOT_NAME}`;
    const response = await context.github.search.issuesAndPullRequests({
      order: 'desc',
      per_page: 100,
      q: query,
      sort: 'updated',
    });
    const totalCount = response.data.total_count ? response.data.total_count : 0;

    if (totalCount === 0) {
      return;
    }

    // filter for collaborators who are admin or can write

    const assignees: any = (await fetchCollaborators(context, RepoAffiliation.Direct))
      .filter((c) => c.permissions.admin === true)
      .map((u) => u.login);

    if (assignees.length === 0) {
      return;
    }

    // add assignees to the issue

    const promises = response.data.items.map(i =>
      assignUsersToIssue(context, assignees, {
        issue_number: i.number,
        owner,
        repo,
      }));

    await Promise.all(promises);
  } catch (err) {
    const message = `Unable to assign users to PR`;
    logger.error(`${message}, error = ${err.message}`);
  }
}

/**
 * Check to see if a pull request (PR) contains the command for ignore.
 *
 * @param {string} body The body of the PR
 * @returns True if the PR should be ignored, False otherwise
 */
export const shouldIgnoredLengthCheck = (commands: string[]): boolean => {
  if (commands && commands.includes(COMMANDS.IGNORE)) {
    return true;
  }

  return false;
};

/**
 * Extract all commands from the body of a PR
 *
 * @param {string} body The body of the PR
 * @returns An `string[]` any commands used
 */
export const extractCommands = (body: string): any[] => {
  if (!body) {
    return [];
  }

  return Object.values(COMMANDS).filter((cmd) => body.includes(cmd));
};

/**
 * Validate the length of a pull request
 * The length of a PR is determined by adding the lines deleted and added
 * @param {Context} context The event context context
 * @param {RepoMountieConfig} config The repo config file
 * @returns True if the length is valid, False otherwise
 */
export const isValidPullRequestLength = (context: Context, rmConfig: RepoMountieConfig): boolean => {
  const commands = extractCommands(context.payload.pull_request.body);
  const linesChanged =
    context.payload.pull_request.additions + context.payload.pull_request.deletions;

  if (shouldIgnoredLengthCheck(commands) || linesChanged <= rmConfig.pullRequest.maxLinesChanged) {
    return true;
  }

  return false;
};

/**
 * Validate the PR against codified cultural policies
 * @param {Context} context The event context context
 */
export const validatePullRequestIfRequired = async (context: Context, rmConfig: RepoMountieConfig) => {
  if (isValidPullRequestLength(context, rmConfig)) {
    return;
  }

  try {
    const rawMessageBody: string = await loadTemplate(TEXT_FILES.HOWTO_PR);
    const messageBody = rawMessageBody
      .replace('[USER_NAME]', context.payload.pull_request.user.login)
      .replace('[MAX_LINES]', `${rmConfig.pullRequest.maxLinesChanged}`);

    await context.github.issues.createComment(context.issue({ body: messageBody }));
  } catch (err) {
    const message = 'Unable to validate pull request.';
    logger.error(`${message}, error = ${err.message}`);
  }
};
