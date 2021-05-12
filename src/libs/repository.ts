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
// Created by Jason Leach on 2018-10-02.
//

import { logger } from '@bcgov/common-nodejs-utils';
import yaml from 'js-yaml';
import template from 'lodash/template';
import { Context } from 'probot';
import {
  BOT_NAME,
  BRANCHES,
  COMMIT_FILE_NAMES,
  COMMIT_MESSAGES,
  ONE_DAY,
  INACTIVE_DAYS,
  ISSUE_TITLES,
  MINISTRY_SHORT_CODES,
  REGEXP,
  REPO_README,
  TEMPLATES,
  TEXT_FILES,
} from '../constants';
import {
  addFileViaPullRequest,
  checkIfFileExists,
  checkIfRefExists,
  fetchFileContent,
  hasPullRequestWithTitle,
} from './ghutils';
import { extractMessage, getDaysPassed, loadTemplate } from './utils';

export const addWordsMatterIfRequire = async (
  context: Context,
  owner: string,
  repo: string
) => {
  try {
    if (!context.payload.repository.has_issues) {
      return;
    }

    // Check if the repo already has an issue created by me
    // about words matter.

    // This query looks for `is:open` on purpose; if the issue is closed but
    // the repo topics are not updated then it will re-create a new issue.
    const query = `repo:${owner}/${repo} is:open is:issue author:app/${BOT_NAME} "${ISSUE_TITLES.WORDS_MATTER}"`;
    const issuesResponse = await context.github.search.issuesAndPullRequests({
      order: 'desc',
      per_page: 100,
      q: query,
      sort: 'updated',
    });
    const totalCount = issuesResponse.data.total_count
      ? issuesResponse.data.total_count
      : 0;

    if (totalCount > 0) {
      return;
    }

    // Create an issue requesting that the proper topics are
    // added to the repo.

    const body: string = await loadTemplate(TEXT_FILES.WORDS_MATTER);

    await context.github.issues.create({
      body,
      owner,
      repo,
      title: ISSUE_TITLES.WORDS_MATTER,
    });
  } catch (err) {
    const message = extractMessage(err);
    if (message) {
      logger.error(
        `Error adding topic issue to ${context.payload.repository.name}`
      );
    } else {
      logger.error(err.message);
    }

    throw err;
  }
};

export const addMinistryTopicIfRequired = async (
  context: Context,
  owner: string,
  repo: string
) => {
  try {
    if (!context.payload.repository.has_issues) {
      return;
    }

    // Check if the repo has suitable topics.

    const listTopicsResponse = await context.github.repos.listTopics({
      owner,
      repo,
    });

    const topics = listTopicsResponse.data.names
      ? listTopicsResponse.data.names
      : [];

    if (
      topics.length !== 0 &&
      topics.some((r) => MINISTRY_SHORT_CODES.includes(r.toUpperCase()))
    ) {
      logger.info(
        `The repo ${context.payload.repository.name} has matching topics `
      );
      return;
    }

    // Check if the repo already has an issue created by me
    // requesting topics be added.

    // This query looks for `is:open` on purpose; if the issue is closed but
    // the repo topics are not updated then it will re-create a new issue.
    const query = `repo:${owner}/${repo} is:open is:issue author:app/${BOT_NAME} "${ISSUE_TITLES.ADD_TOPICS}"`;
    const issuesResponse = await context.github.search.issuesAndPullRequests({
      order: 'desc',
      per_page: 100,
      q: query,
      sort: 'updated',
    });
    const totalCount = issuesResponse.data.total_count
      ? issuesResponse.data.total_count
      : 0;

    if (totalCount > 0) {
      return;
    }

    // Create an issue requesting that the proper topics are
    // added to the repo.

    const body: string = await loadTemplate(TEXT_FILES.WHY_TOPICS);

    await context.github.issues.create({
      body,
      owner,
      repo,
      title: ISSUE_TITLES.ADD_TOPICS,
    });
  } catch (err) {
    const message = extractMessage(err);
    if (message) {
      logger.error(
        `Error adding topic issue to ${context.payload.repository.name}`
      );
    } else {
      logger.error(err.message);
    }

    throw err;
  }
};

export const fixDeprecatedComplianceStatus = async (
  context: Context,
  owner: string,
  repo: string
) => {
  try {
    if (
      !(await checkIfRefExists(
        context,
        context.payload.repository.default_branch
      ))
    ) {
      logger.info(
        `This repo has no main branch ${context.payload.repository.name}`
      );
      return;
    }

    if (await checkIfRefExists(context, BRANCHES.RENAME_STATUS)) {
      logger.info(
        `This repo already has this branch ${context.payload.repository.name}`
      );
      return;
    }

    // will throw if the file does not exists
    const data: any = await fetchFileContent(
      context,
      COMMIT_FILE_NAMES.COMPLIANCE
    );
    const doc = yaml.safeLoad(Buffer.from(data.content, 'base64').toString());
    let didUpdate = false;

    doc.spec.forEach((item) => {
      if (item.status === 'exempt') {
        item.status = 'not-required';
        item['last-updated'] = new Date(Date.now()).toISOString();
        didUpdate = true;
      }
    });

    if (!didUpdate) {
      return;
    }

    // Add the updated file via a PR
    const prMessageBody: string = await loadTemplate(
      TEXT_FILES.WHY_RENAME_STATUS
    );

    await addFileViaPullRequest(
      context,
      owner,
      repo,
      COMMIT_MESSAGES.CHANGE_STATUS,
      ISSUE_TITLES.RENAME_STATUS,
      prMessageBody,
      BRANCHES.RENAME_STATUS,
      COMMIT_FILE_NAMES.COMPLIANCE,
      yaml.safeDump(doc),
      data.sha
    );
  } catch (err) {
    const message = extractMessage(err);
    if (message) {
      logger.error(
        `Unable to update compliance file ${context.payload.repository.name}`
      );
    } else {
      logger.error(err.message);
    }
  }
};

export const addSecurityComplianceInfoIfRequired = async (
  context: Context,
  owner: string,
  repo: string
) => {
  try {
    if (
      !(await checkIfRefExists(
        context,
        context.payload.repository.default_branch
      ))
    ) {
      logger.info(
        `This repo has no main branch ${context.payload.repository.name}`
      );
      return;
    }

    if (await hasPullRequestWithTitle(context, ISSUE_TITLES.ADD_COMPLIANCE)) {
      logger.info(`Compliance PR exists in ${context.payload.repository.name}`);
      return;
    }

    if (await checkIfFileExists(context, COMMIT_FILE_NAMES.COMPLIANCE)) {
      logger.info(
        `Compliance file exists in ${context.payload.repository.name}`
      );
      return;
    }

    // Add a license via a PR
    const prMessageBody: string = await loadTemplate(TEXT_FILES.WHY_COMPLY);
    const data: string = (await loadTemplate(TEMPLATES.COMPLIANCE))
      .split('[TODAY]')
      .join(new Date().toISOString());

    await addFileViaPullRequest(
      context,
      owner,
      repo,
      COMMIT_MESSAGES.ADD_COMPLIANCE,
      ISSUE_TITLES.ADD_COMPLIANCE,
      prMessageBody,
      BRANCHES.ADD_COMPLIANCE,
      COMMIT_FILE_NAMES.COMPLIANCE,
      data
    );
  } catch (err) {
    const message = extractMessage(err);
    if (message) {
      logger.error(
        `Error adding compliance to ${context.payload.repository.name}`
      );
    } else {
      logger.error(err.message);
    }

    throw err;
  }
};

export const addLicenseIfRequired = async (
  context: Context,
  owner: string,
  repo: string
) => {
  if (context.payload.repository.license) {
    // we have a license already
    return;
  }

  try {
    if (
      !(await checkIfRefExists(
        context,
        context.payload.repository.default_branch
      ))
    ) {
      logger.info(
        `This repo has no main branch ${context.payload.repository.name}`
      );
      return;
    }

    if (await hasPullRequestWithTitle(context, ISSUE_TITLES.ADD_LICENSE)) {
      logger.info(`Licencing PR exists in ${context.payload.repository.name}`);
      return;
    }

    // Add a license via a PR
    const prMessageBody: string = await loadTemplate(TEXT_FILES.WHY_LICENSE);
    const licenseData: string = await loadTemplate(TEMPLATES.LICENSE);

    await addFileViaPullRequest(
      context,
      owner,
      repo,
      COMMIT_MESSAGES.ADD_LICENSE,
      ISSUE_TITLES.ADD_LICENSE,
      prMessageBody,
      BRANCHES.ADD_LICENSE,
      COMMIT_FILE_NAMES.LICENSE,
      licenseData
    );
  } catch (err) {
    const message = extractMessage(err);
    if (message) {
      logger.error(
        `Unable to add license to ${context.payload.repository.name}`
      );
    } else {
      logger.error(err.message);
    }

    throw err;
  }
};

/**
 *
 * @param {string} reg Regular expression to be used
 * @param {string} teststring String to be tested against
 * @returns True if there is a match, false otherwise
 */
export const doesContentHaveLifecycleBadge = (teststring: string): boolean => {
  const re = new RegExp(REGEXP.lifecycle_badge);
  return re.test(teststring);
};

/**
 * If a repo doesn't have a project lifecycle badge,
 * create an issue requesting that a project lifecycle badge is
 * added to the repo.
 * @param context The event context context
 * @param owner The organization name
 * @param repo The repo name
 */
export const requestLifecycleBadgeIfRequired = async (
  context: Context,
  owner: string,
  repo: string
) => {
  try {
    const readmeData = await fetchFileContent(context, REPO_README);

    if (!readmeData) {
      logger.info(
        `README file does not exist in ${context.payload.repository.name}`
      );
      return;
    }

    // readmeData.content is base64 encoded
    const decodedContent = Buffer.from(readmeData.content, 'base64').toString();

    // Check if README has project badges
    const re = doesContentHaveLifecycleBadge(decodedContent);
    if (re) {
      return;
    }

    // If there is an open project lifecycle badge issue,
    // do not create another project lifecycle badge issue.
    const query = `repo:${owner}/${repo} is:open is:issue author:app/${BOT_NAME} "${ISSUE_TITLES.LIFECYCLE_BADGES}"`;
    const issuesResponse = await context.github.search.issuesAndPullRequests({
      order: 'desc',
      per_page: 100,
      q: query,
      sort: 'updated',
    });
    const totalCount = issuesResponse.data.total_count
      ? issuesResponse.data.total_count
      : 0;

    if (totalCount > 0) {
      return;
    }

    // Create an issue requesting that a project lifecycle badge is
    // added to the repo.
    const body: string = await loadTemplate(TEXT_FILES.LIFECYCLE_BADGES);

    await context.github.issues.create({
      body,
      owner,
      repo,
      title: ISSUE_TITLES.LIFECYCLE_BADGES,
    });
  } catch (err) {
    const message = extractMessage(err);
    if (message) {
      logger.error(
        `Unable to check project lifecycle badge in ${context.payload.repository.name}`
      );
    } else {
      logger.error(err.message);
    }
    throw err;
  }
};

/**
 * If a repo has been inactive for certain period,
 * create an issue reminding it.
 * @param context The event context context
 * @param owner The organization name
 * @param repo The repo name
 */
export const remindInactiveRepository = async (
  context: Context,
  owner: string,
  repo: string
) => {
  try {
    const updatedAt = context.payload.repository.updated_at;
    const daysInactive = getDaysPassed(updatedAt);
    const isConsideredAsInactive = INACTIVE_DAYS < daysInactive;

    // If the repo is actively maintained, do not create an issue.
    if (!isConsideredAsInactive) {
      return;
    }

    // see https://docs.github.com/en/github/searching-for-information-on-github/searching-issues-and-pull-requests#search-by-when-an-issue-or-pull-request-was-created-or-last-updated
    const timeSearchFrom = new Date().getTime() - ONE_DAY * INACTIVE_DAYS;
    const timeSearchFromAsISO = new Date(timeSearchFrom).toISOString();

    // If there is an open/closed dormant repo issue, do not create another one.
    // The query makes sure that it only checkes the issues created within the "inactive period".
    const query = `repo:${owner}/${repo} is:issue author:app/${BOT_NAME} created:>${timeSearchFromAsISO} "${ISSUE_TITLES.INACTIVE_REPO}"`;
    const issuesResponse = await context.github.search.issuesAndPullRequests({
      order: 'desc',
      per_page: 100,
      q: query,
      sort: 'updated',
    });

    const totalCount = issuesResponse.data.total_count
      ? issuesResponse.data.total_count
      : 0;

    if (totalCount > 0) {
      return;
    }

    // Create an issue reminding the repository is inactive
    const text: string = await loadTemplate(TEXT_FILES.INACTIVE_REPO);

    await context.github.issues.create({
      body: template(text)({
        daysInactive: Math.round(daysInactive),
        daysInactiveLimit: INACTIVE_DAYS,
      }),
      owner,
      repo,
      title: ISSUE_TITLES.INACTIVE_REPO,
    });
  } catch (err) {
    const message = extractMessage(err);
    if (message) {
      logger.error(
        `Unable to check repository activities in ${context.payload.repository.name}`
      );
    } else {
      logger.error(err.message);
    }
    throw err;
  }
};
