//
// Repo Mountie
//
// Copyright © 2019 Province of British Columbia
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
import yaml from 'js-yaml';
import { Context } from 'probot';
import util from 'util';
import { REPO_COMPLIANCE_FILE, REPO_CONFIG_FILE } from '../constants';
interface RepoMountiePullRequestConfig {
  maxLinesChanged: number;
}

interface RepoMountieStaleIssueConfig {
  maxDaysOld: number;
  applyLabel: string;
}

interface RepoCompliance {
  name?: string;
}

export interface RepoMountieConfig {
  pullRequest: RepoMountiePullRequestConfig;
  staleIssue?: RepoMountieStaleIssueConfig;
}

/**
 * Check if a string is valid JSON
 * This function will check if a string can be parsed into JSON
 * or not.
 * @param {string} aString The string to be evaluated
 * @returns A boolean of true if the string can be parsed, false otherwise.
 */
export const isJSON = (aString: string): boolean => {
  try {
    JSON.parse(aString);
    return true;
  } catch (err) {
    return false;
  }
}

/**
 * Check if a git ref exists
 * Check if a git reference exists; the call to GitHub will fail
 * if the reference does not exists.
 * @param {Context} context The event context context
 * @param {string} ref The ref to be looked up
 * @returns A boolean of true if the ref exists, false otherwise
 */
export const checkIfRefExists = async (context: Context, ref = context.payload.repository.default_branch): Promise<boolean> => {
  try {
    // If the repo does *not* have a master branch then we don't want to add one.
    // The dev team may be doing this off-line and when they go to push master it
    // will cause a conflict because there will be no common root commit.
    await context.github.git.getRef(
      context.repo({
        ref: `heads/${ref}`,
      })
    );

    return true;
  } catch (err) {
    logger.info(`No ref ${ref} exists in ${context.payload.repository.name}`);
    return false;
  }
};

/**
 * Fetch the contents of a file from GitHub
 * This function will fetch the contents of a file from the latest
 * commit in a ref. 
 * @param {Context} context The context of the repo
 * @param {string} fileName The name of the file to be fetched
 * @param {string} ref The ref containing the file (default master)
 * @returns A resolved promise with the `data`, thrown error otherwise.
 */
export const fetchContentsForFile = async (
  context, fileName, ref = context.payload.repository.default_branch
): Promise<any> => {
  try {
    const commits = await context.github.repos.listCommits(
      context.repo({
        sha: ref,
        path: fileName,
      })
    );

    // Not sure if GH returns the results in sorted order.
    // Descending; newest commits are first.
    const lastCommit = commits.data.sort((a, b) => {
      return (new Date(b.commit.committer.date)).getTime() - (new Date(a.commit.committer.date)).getTime();
    }).shift();

    if (!lastCommit) {
      logger.info('Unable to find last commit.')
      return;
    }

    const response = await context.github.repos.getContents(
      context.repo({
        ref: lastCommit.sha,
        path: fileName,
      })
    );

    const data: any = response.data;

    if (data.content && data.type !== 'file') {
      logger.info('Unusable content type retrieved.')
      return;
    };

    return data;
  } catch (err) {
    const message = `Unable to fetch ${fileName}`;
    logger.error(`${message}, error = ${err.message}`);

    throw new Error(message);
  }
}

/**
 * Fetch the repo compliance file
 * The compliance file determines what state any policy compliance
 * is currently in.
 * @param {Context} context The event context context
 * @param {string} fileName The name of the file to fetch
 * @param {string} ref The ref where the file exists
 * @returns A string containing the file data
 */
export const fetchFile = async (
  context, fileName, ref = context.payload.repository.default_branch
): Promise<string> => {
  try {
    const response = await context.github.repos.getContents(
      context.repo({
        branch: ref,
        path: fileName,
      })
    );

    const data: any = response.data;

    if (data.content && data.type !== 'file') {
      throw new Error('No content returned or wrong file type.')
    }

    return Buffer.from(data.content, 'base64').toString();
  } catch (err) {
    const message = `Unable to fetch ${fileName}`;
    logger.error(`${message}, error = ${err.message}`);

    throw new Error(message);
  }
};

/**
 * Fetch the repo compliance file
 * The compliance file determines what state any policy compliance
 * is currently in.
 * @param {Context} context The event context context
 * @returns A `RepoCompliance` object if one exists
 */
export const fetchComplianceFile = async (context: Context): Promise<RepoCompliance> => {
  try {
    const content = await fetchFile(context, REPO_COMPLIANCE_FILE);
    return yaml.safeLoad(content);
  } catch (err) {
    const message = 'Unable to process config file.';
    logger.error(`${message}, error = ${err.message}`);
    throw new Error(message);
  }
};

/**
 * Fetch the repo configuration file
 * The configuration file determines what, if any, cultural policies should
 * be enforced.
 * @param {Context} context The event context context
 * @returns A `RepoMountieConfig` object if one exists
 */
export const fetchConfigFile = async (context: Context): Promise<RepoMountieConfig> => {
  try {
    const content = await fetchFile(context, REPO_CONFIG_FILE);
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
export const labelExists = async (
  context: Context, labelName: string
): Promise<boolean> => {
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

/**
 * Add a file to a repo via a pull request
 * Adds a file to a repo via a PR based of the
 * master branch.
 * @param {Context} context The event context context
 * @param {string} commitMessage The commit message for the file
 * @param {string} prTitle The title of the pull request
 * @param {string} prBody The message body of the pull request
 * @param {string} srcBranchName The source branch for the pull request
 * @param {string} fileName The name of the file to be added
 * @param {string} fileData The data of the file to be added
 */
export const addFileViaPullRequest = async (
  context: Context, commitMessage: string, prTitle: string,
  prBody: string, srcBranchName: string, fileName: string,
  fileData: string
) => {
  try {
    // If we don't have a main branch we won't have anywhere
    // to merge the PR.
    const mainbr = await context.github.git.getRef(
      context.repo({
        ref: `heads/${context.payload.repository.default_branch}`,
      })
    );

    // Create a branch to commit to commit the license file
    await context.github.git.createRef(
      context.repo({
        ref: `refs/heads/${srcBranchName}`,
        sha: mainbr.data.object.sha, // where we fork from.
      })
    );

    // Add the file to the new branch
    await context.github.repos.createFile(
      context.repo({
        branch: srcBranchName,
        content: Buffer.from(fileData).toString('base64'),
        message: commitMessage,
        path: fileName,
      })
    );

    // Create a PR to merge the licence ref into master
    await context.github.pulls.create(
      context.repo({
        base: context.payload.repository.default_branch,
        body: prBody,
        head: srcBranchName,
        maintainer_can_modify: true, // maintainers cat edit your this PR
        title: prTitle,
      })
    );
  } catch (err) {
    const message = `Unable to add ${fileName} file to ${context.payload.repository.name}`;
    logger.error(`${message}, error = ${err.message}`);

    throw err;
  }
};

/**
 * Check if a pull request exists
 * Check if pull requests exists with a given title
 * @param {Context} context The event context context
 * @param {string} title The title to look for
 * @param {string} state The state the PR must be in.
 * @returns `true` if if a PR exists, false otherwise.
 */
export const hasPullRequestWithTitle = async (
  context, title, state = 'all'
): Promise<boolean> => {
  try {
    const pulls = await context.github.pulls.list(
      context.repo({
        state,
      })
    );

    if (pulls && pulls.data) {
      return pulls.data.filter(pr => pr.title === title).length > 0;
    }

    return false;
  } catch (err) {
    const message = `Unable to lookup PRs in repo ${context.payload.repository.name}`;
    logger.error(`${message}, error = ${err.message}`);

    throw err;
  }
};

/**
 * Assign GitHub users to an issue
 * @param context The `Context` containing the GH issue.
 * @param assignees An `Array` of users to assign to the issue
 */
export const assignUsersToIssue = async (
  context: Context, assignees: string[]
) => {
  try {
    await context.github.issues.addAssignees(
      context.issue({
        assignees,
      })
    );
  } catch (err) {
    const message = 'Unable to assign user to issue.';
    logger.error(`${message}, error = ${err.message}`);

    throw err;
  }
};

export const updateFileContent = async (
  context: Context, commitMessage: string, srcBranchName: string,
  fileName: string, fileData: string, fileSHA
) => {
  try {
    await context.github.repos.createOrUpdateFile(
      context.repo({
        message: commitMessage,
        content: Buffer.from(fileData).toString('base64'),
        sha: fileSHA,
        branch: srcBranchName,
        path: fileName,
      })
    );
  } catch (err) {
    const message = 'Unable to update file.';
    logger.error(`${message}, error = ${err.message}`);

    throw err;
  }
};

export const isOrgMember = async (context: Context, userID: string): Promise<boolean> => {
  try {
    const response = await context.github.orgs.checkMembership({
      org: context.payload.organization.login,
      username: userID
    });

    if (response.status === 204 || response.status === 302) {
      // 204 No Content - The user is a member;
      // 302 Found      - TBD
      return true;
    }

    const message = 'Unexpected return code looking up user';
    logger.info(`${message}, code = ${response.status}`);

    return false;
  } catch (err) {
    // 404 Not Found  - The user is not a member of the org.
    if (err.code === 404) {
      return false;
    }

    const message = 'Unable to lookup user';
    logger.error(`${message}, error = ${err.message}`);

    throw err;
  }
}

export const addCommentToIssue = async (context: Context, body: string) => {
  try {
    await context.github.issues.createComment(
      context.issue({
        body,
      })
    );
  } catch (err) {
    const message = 'Unable to add comment to issue.';
    logger.error(`${message}, error = ${err.message}`);

    throw err;
  }
};