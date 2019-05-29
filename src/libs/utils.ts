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
import fs from 'fs';
import { Context } from 'probot';
import util from 'util';
import { REPO_CONFIG_FILE } from '../constants';

interface RepoMountiePullRequestConfig {
  maxLinesChanged: number;
}

interface RepoMountieStaleIssueConfig {
  maxDaysOld: number;
  applyLabel: string;
}

export interface RepoMountieConfig {
  pullRequest: RepoMountiePullRequestConfig;
  staleIssue?: RepoMountieStaleIssueConfig;
}

export const isJSON = (aString: string): boolean => {
  try {
    JSON.parse(aString);
    return true;
  } catch (err) {
    return false;
  }
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
 * Load a template file file and return the contents.
 *
 * @param {string} path The path to the template file
 * @returns {Promise<string>} Resolved with contents, rejected otherwise
 */
export const loadTemplate = async (path: string): Promise<string> => {
  const access = util.promisify(fs.access);
  const read = util.promisify(fs.readFile);

  try {
    await access(path, fs.constants.R_OK);
    return read(path, 'utf8');
  } catch (err) {
    const message = `Unable to load template ${path}`;
    throw new Error(`${message}, error = ${err.message}`);
  }
};

/**
 * Extract and return and API response message
 * The errors received from using the github API via Probot
 * will return an Error message with a JSON encoded string in the
 * message property.
 * @param {Error} error The error from which to extract the message
 * @returns Undefined if unparsable, a resolved promise containing the results otherwise
 */
export const extractMessage = async (error: Error): Promise<string> => {
  try {
    if (isJSON(error.message)) {
      const data = JSON.parse(error.message);
      return data.message;
    }

    return error.message;
  } catch (err) {
    const message = 'Unable to extract message from error';
    return message;
  }
};

/**
 * Check if a label exists in a given context
 * Check if a given label exists in the repo specified by
 * the `context` argument.
 * @param {Context} context The event context context
 * @param {string} labelName The label name to be checked
 * @returns `true` if the label exists, false otherwise.
 */
export const labelExists = async (context: Context, labelName: string): Promise<boolean> => {
  try {
    const result = await context.github.issues.listLabelsForRepo(context.issue());
    if (!result.data) {
      return false;
    }

    const myMatches = result.data.filter(item => item.name === labelName);
    return myMatches.length > 0;
  } catch (err) {
    const message = 'Unable to fetch repo labels';
    logger.error(`${message}, error = ${err.message}`);

    return false
  }
}
