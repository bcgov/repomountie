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
import { Context } from 'probot';
import { COMMANDS, PR_TITLES, TEXT_FILES } from '../constants';
import { PullState, RepoAffiliation } from './enums';
import { assignUsersToIssue, fetchCollaborators, fetchPullRequests, RepoMountieConfig } from './ghutils';
import { loadTemplate } from './utils';

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
export const addCollaboratorsToPullRequests = async (
  context: Context, owner: string, repo: string) => {

  try {
    // filter for PRs created by the bot that don't have any
    // assignees
    const pulls: any = (await fetchPullRequests(context, PullState.Open))
      .filter(p => p.assignees.length === 0)
      .filter(p => Object.values(PR_TITLES).includes(p.title.trim()));

    if (pulls.length === 0) {
      return;
    }

    // filter for collaborators who are admin or can write
    const assignees: any = (await fetchCollaborators(context, RepoAffiliation.Direct))
      .filter((c) => (c.permissions.admin === true ||
        c.permissions.push === true))
      .map((u) => u.login);

    if (assignees.length === 0) {
      return;
    }

    const promises = pulls.map(pr =>
      assignUsersToIssue(context, assignees, {
        issue_number: pr.number,
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
  if (commands.includes(COMMANDS.IGNORE)) {
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
  return Object.values(COMMANDS).filter((cmd) => body.includes(cmd));
};

/**
 * Validate the length of a pull request
 * The length of a PR is determined by adding the lines deleted and added
 * @param {Context} context The event context context
 * @param {RepoMountieConfig} config The repo config file
 * @returns True if the length is valid, False otherwise
 */
export const isValidPullRequestLength = (context: Context, config: RepoMountieConfig): boolean => {
  const commands = extractCommands(context.payload.pull_request.body);
  const linesChanged =
    context.payload.pull_request.additions + context.payload.pull_request.deletions;

  if (shouldIgnoredLengthCheck(commands) || linesChanged <= config.pullRequest.maxLinesChanged) {
    return true;
  }

  return false;
};

/**
 * Validate the PR against codified cultural policies
 * @param {Context} context The event context context
 */
export const validatePullRequestIfRequired = async (context: Context, config: RepoMountieConfig) => {
  if (!isValidPullRequestLength(context, config)) {
    return;
  }

  try {
    const rawMessageBody: string = await loadTemplate(TEXT_FILES.HOWTO_PR);
    const messageBody = rawMessageBody
      .replace('[USER_NAME]', context.payload.pull_request.user.login)
      .replace('[MAX_LINES]', `${config.pullRequest.maxLinesChanged}`);
    console.log('2');

    await context.github.issues.createComment(context.issue({ body: messageBody }));
  } catch (err) {
    console.log('3');

    const message = 'Unable to validate pull request.';
    logger.error(`${message}, error = ${err.message}`);
  }
};
