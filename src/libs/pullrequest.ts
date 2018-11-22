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
import { Context } from 'probot';
import { REPO_CONFIG_FILE, TEXT_FILES } from '../constants';
import { loadTemplate } from '../libs/utils';

interface RepoMountiePullRequestConfig {
  maxLinesChanged: number;
}

interface RepoMountieConfig {
  pullRequest: RepoMountiePullRequestConfig;
}

/**
 * Fetch the repo configuration file
 * The configuration file determines what, if any, cultural policies should
 * be enforced.
 * @param {Context} context The event context context
 * @returns A `RepoMountieConfig` object if one exists
 */
export const fetchRepoMountieConfig = async (context: Context): Promise<RepoMountieConfig> => {
  try {
    const response = await context.github.repos.getContents(
      context.repo({
        branch: 'master',
        path: REPO_CONFIG_FILE,
      })
    );

    const content = Buffer.from(response.data.content, 'base64').toString();
    return JSON.parse(content);
  } catch (err) {
    const message = 'Unable to process config file.';
    logger.error(`${message}, error = ${err.message}`);
    throw new Error(message);
  }
};

/**
 * Validate the length of a pull request
 * The length of a PR is determined by adding the lines deleted and added
 * @param {Context} context The event context context
 * @param {RepoMountieConfig} config The repo config file
 * @returns True if the length is valid, False otherwise
 */
export const isValidPullRequestLength = (context: Context, config: RepoMountieConfig): boolean => {
  const linesChanged =
    context.payload.pull_request.additions + context.payload.pull_request.deletions;

  if (linesChanged <= config.pullRequest.maxLinesChanged) {
    return true;
  }

  return false;
};

/**
 * Validate the PR against codified cultural policies
 * @param {Context} context The event context context
 */
export const validatePullRequestIfRequired = async (context: Context) => {
  try {
    const config = await fetchRepoMountieConfig(context);

    if (!isValidPullRequestLength(context, config)) {
      const rawMessageBody: string = await loadTemplate(TEXT_FILES.HOWTO_PR);
      const messageBody = rawMessageBody
        .replace('[USER_NAME]', context.payload.pull_request.user.login)
        .replace('[MAX_LINES]', `${config.pullRequest.maxLinesChanged}`);

      await context.github.issues.createComment(context.issue({ body: messageBody }));
    }
  } catch (err) {
    const message = 'Unable to validate pull request.';
    logger.error(`${message}, error = ${err.message}`);
  }
};
