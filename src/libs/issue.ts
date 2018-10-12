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
import { HELP_DESK } from '../constants';

/**
 * Determine if help desk support is required
 * @param {Context} context The event context context
 * @returns True if support is required, false otherwise.
 */
export const helpDeskSupportRequired = (issue: any) => {
  const triggerWord = 'help';
  const noHelpRequired = issue.comment.body.search(triggerWord) === -1;
  const isAssigned = issue.issue.assignees.some(e => HELP_DESK.LICENSE_SUPPORT_USERS.includes(e));

  // early return
  if (isAssigned || noHelpRequired) {
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
    await context.github.issues.addAssigneesToIssue(
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
    assignHelpDeskMembers(context);
    return;
  }
};
