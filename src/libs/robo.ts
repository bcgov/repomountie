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
// Created by Jason Leach on 2019-12-04.
//

import { logger } from '@bcgov/common-nodejs-utils';
import { Context } from 'probot';
import { BRANCHES, COMMENT_TRIGGER_WORD, COMMIT_FILE_NAMES, COMMIT_MESSAGES, GITHUB_ID, HELP_DESK, PR_TITLES, TEMPLATES } from '../constants';
import { assignUsersToIssue, loadTemplate, updateFile } from './utils';

/**
 * Determine if help desk support is required
 * @param {Context} context The event context context
 * @returns True if support is required, false otherwise.
 */
export const helpDeskSupportRequired = (payload: any) => {
    const triggerWord = COMMENT_TRIGGER_WORD;
    const noHelpRequired = payload.comment.body.search(triggerWord) === -1;
    const isAssigned = payload.issue.assignees.some(e =>
        HELP_DESK.SUPPORT_USERS.includes(e.login)
    );

    // early return
    if (isAssigned || noHelpRequired) {
        return false;
    }

    return true;
};

export const handleComplianceCommands = async (context: Context) => {
    // These are the accepted commands. They are case insensitive,
    // and require a leading `/` to be accepted.
    // /update-pia ${STATUS}
    // /update-stra ${STATUS}

    try {
        const body = context.payload.comment.body;
        const re = /\/update-(pia|stra)\s(in-progress|completed|TBD|exempt)/gi;
        let data: string = (await loadTemplate(TEMPLATES.COMPLIANCE))
            .split('[TODAY]').join(new Date().toISOString());

        let result: RegExpExecArray | null;
        let updateRequested = false;
        while ((result = re.exec(body)) !== null) {
            updateRequested = true;
            const token = `[${result[1].toUpperCase()}_STATUS]`;
            const value = result[2];
            data = data.split(token).join(value);
        }

        if (updateRequested) {
            await updateFile(context, COMMIT_MESSAGES.UPDATE_COMPLIANCE,
                BRANCHES.ADD_COMPLIANCE, COMMIT_FILE_NAMES.COMPLIANCE,
                data);
        }
    } catch (err) {
        const message = 'Unable to process compliance commands';
        logger.error(`${message}, error = ${err.message}`);

        throw err;
    }
};

export const handleBotCommand = async (context: Context) => {
    if (context.payload.issue.user.login === `${GITHUB_ID} [bot]`) {
        return; // not interested
    }

    try {
        // For we just assign help desk willynilly, going forward we should
        // better identify the issue and assign users with surgical precision.
        if (helpDeskSupportRequired(context.payload)) {
            await assignUsersToIssue(context, HELP_DESK.SUPPORT_USERS)
            return;
        }

        switch (context.payload.issue.title) {
            case PR_TITLES.ADD_COMPLIANCE:
                handleComplianceCommands(context);
                break;
            default:
                break;
        }
    } catch (err) {
        const message = 'Unable to process commands';
        logger.error(`${message}, error = ${err.message}`);

        throw err;
    }
};
