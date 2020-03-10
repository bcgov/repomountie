//
//
// Copyright © 2019, 2020 Province of British Columbia
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
import yaml from 'js-yaml';
import { Context } from 'probot';
import { COMMIT_FILE_NAMES, REPO_CONFIG_FILE } from '../constants';

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
 * Determine if a file exists on a given branch
 * The only way to check if a file exists is to attempt to fetch it;
 * This fn is a wrapper on this capability.
 * @param {Context} context The event context context
 * @param {string} fileName The name of the file to lookup
 * @param {string} ref The name of the branch (Default: master)
 * @returns A true if the file exists, false otherwise.
 */
export const checkIfFileExists = async (context, fileName, ref = 'master'): Promise<boolean> => {
  try {
    await fetchFile(context, fileName, ref);
    return true;
  } catch (err) {
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
        path: fileName,
        sha: ref,
      })
    );

    // Not sure if GH returns the results in sorted order.
    // Descending; newest commits are first.
    const lastCommit = commits.data.sort((a, b) => {
      return (new Date(b.commit.committer.date)).getTime() - (new Date(a.commit.committer.date)).getTime();
    }).shift();

    if (!lastCommit) {
      logger.info('Unable to find last commit.');
      return;
    }

    const response = await context.github.repos.getContents(
      context.repo({
        path: fileName,
        ref: lastCommit.sha,
      })
    );

    const data: any = response.data;

    if (data.content && data.type !== 'file') {
      logger.info('Unusable content type retrieved.');
      return;
    }

    return data;
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
      throw new Error('No content returned or wrong file type.');
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
 * @returns A `Promise` containing a `RepoCompliance` object
 */
export const fetchComplianceFile = async (context: Context): Promise<RepoCompliance> => {
  try {
    const content = await fetchFile(context, COMMIT_FILE_NAMES.COMPLIANCE);
    return yaml.safeLoad(content);
  } catch (err) {
    const message = 'Unable to fetch compliance file.';
    logger.error(`${message}, error = ${err.message}`);

    throw new Error(message);
  }
};

/**
 * Fetch the repo configuration file
 * The configuration file determines what, if any, cultural policies should
 * be enforced.
 * @param {Context} context The event context context
 * @returns A `Promise` containing a `RepoMountieConfig` object
 */
export const fetchConfigFile = async (context: Context): Promise<RepoMountieConfig> => {
  try {
    const content = await fetchFile(context, REPO_CONFIG_FILE);
    return JSON.parse(content);
  } catch (err) {
    const message = 'Unable to fetch config file.';
    logger.error(`${message}, error = ${err.message}`);

    throw new Error(message);
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

    const myMatches = result.data.filter((item) => item.name === labelName);
    return myMatches.length > 0;
  } catch (err) {
    const message = 'Unable to fetch repo labels';
    logger.error(`${message}, error = ${err.message}`);

    return false;
  }
};

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
        maintainer_can_modify: true, // maintainers can edit this PR
        title: prTitle,
      })
    );
  } catch (err) {
    const message = `Unable to add ${fileName} file to ${context.payload.repository.name}`;
    logger.error(`${message}, error = ${err.message}`);

    throw err;
  }
};

export const fetchCollaborators = async (context): Promise<any[]> => {
  try {
    const results = await context.github.repos.listCollaborators(
      context.repo()
    );

    if (!results && !results.data) {
      return [];
    }

    return results.data;
  } catch (err) {
    const message = `Unable to lookup collaborators in repo ${context.payload.repository.name}`;
    logger.error(`${message}, error = ${err.message}`);

    throw err;
  }
};

export const fetchPullRequests = async (
  context, state = 'all'
): Promise<any[]> => {
  try {
    const results = await context.github.pulls.list(
      context.repo({
        state,
      })
    );

    if (!results && !results.data) {
      return [];
    }

    return results.data;
  } catch (err) {
    const message = `Unable to lookup PRs in repo ${context.payload.repository.name}`;
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
    const results = await fetchPullRequests(context, state);

    if (results.filter((pr) => pr.title === title).length > 0) {
      return true;
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

/**
 * Update the contents of a file or create it if non-existent.
 * This fn updates the contents of a file by creating a commit
 * with the appropriate changes.
 * @param {Context} context The event context context
 * @param {string} fileName The name of the file to lookup
 * @returns undefined if successful, throws otherwise
 */
export const updateFileContent = async (
  context: Context, commitMessage: string, srcBranchName: string,
  fileName: string, fileData: string, fileSHA
) => {
  try {
    await context.github.repos.createOrUpdateFile(
      context.repo({
        branch: srcBranchName,
        content: Buffer.from(fileData).toString('base64'),
        message: commitMessage,
        path: fileName,
        sha: fileSHA,
      })
    );
  } catch (err) {
    const message = 'Unable to update file.';
    logger.error(`${message}, error = ${err.message}`);

    throw err;
  }
};

/**
 * Check if a user is member of an organization
 * This fn will check if the given user ID belongs to the
 * organization in the given context.
 * @param {Context} context The query context
 * @param {string} userID The GitHub ID of the user
 * @returns True if the user is a member, false otherwise
 */
export const isOrgMember = async (context: Context, userID: string): Promise<boolean> => {
  try {
    const response = await context.github.orgs.checkMembership({
      org: context.payload.organization.login,
      username: userID,
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
};

/**
 * Add a comment to an issue
 * This fn will add a comment to a given issue
 * @param {Context} context The query context
 * @param {string} body The comment body
 * @returns Undefined if successful, thrown error otherwise
 */
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

export const blarb = async (
  context: Context, fileName, ref = context.payload.repository.default_branch
) => {
  try {

    // const since = moment(new Date()).subtract(7, 'days').toISOString();
    // Not sure if GH returns the results in sorted order.
    // Descending; newest commits are first.
    const commits = (await context.github.repos.listCommits(
      context.repo({
        path: fileName,
        sha: ref,
        // since,
        // until YYYY-MM-DDTHH:MM:SSZ
      })
    ))
      .data
      .sort((a, b) => {
        return (new Date(b.commit.committer.date)).getTime() - (new Date(a.commit.committer.date)).getTime();
      })
      .slice(-2);

    if (commits.length <= 1) {
      // no change or they probably have not merged the initial the PR yet.
      // This status will be picked up a different way.
      return;
    }

    // a) if the last change is newer than our last known audit check (quarterly); OR
    // b) if the last commit was updated since the last scan (24h ago?).
    // then
    //   if STRA changed, get the previous and current state, as well as the
    //   date of the last commit.
    //   if PIA changed, get the previous and current state, as well as the
    //   date of the last commit.
    //     if the STRA and PIA previous and current state are equal
    //     exit (move along)
    //   send an event with this information.
  } catch (err) {
    const message = 'Unable to add comment to issue.';
    logger.error(`${message}, error = ${err.message}`);

    throw err;
  }
};
