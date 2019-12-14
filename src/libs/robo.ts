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
import yaml from 'js-yaml';
import { Context } from 'probot';
import { BRANCHES, COMMENT_TRIGGER_WORD, COMMIT_FILE_NAMES, COMMIT_MESSAGES, HELP_DESK, PR_TITLES } from '../constants';
import { assignUsersToIssue, fetchContentsForFile, updateFileContent } from './utils';

const re = /\/update-(pia|stra)\s(in-progress|completed|TBD|exempt)/gi;

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


export const applyComplianceCommands = (comment: string, doc: any): any => {
    let result: RegExpExecArray | null;
    re.lastIndex = 0; // reset

    while ((result = re.exec(comment)) !== null) {
        // sample result 
        // [ '/update-pia completed',
        //   'pia',
        //   'completed',
        //   index: 0,
        //   input: '/update-pia completed',
        //   groups: undefined ] 
        const items = doc.spec.filter(s => s.name === result![1].toUpperCase());
        if (items.length === 0) {
            continue;
        }

        const item = items.pop();
        item['status'] = result![2];
        // Date.now() used to simplify mock in unit tests.
        item['last-updated'] = new Date(Date.now()).toISOString();
    }

    return doc;
};

export const handleComplianceCommands = async (context: Context) => {
    // These are the accepted commands. They are case insensitive,
    // and require a leading `/` to be accepted.
    // /update-pia ${STATUS}
    // /update-stra ${STATUS}

    const comment = context.payload.comment.body;

    if (!re.test(comment)) {
        return; // no commands in comment
    }

    try {
        // Fetch the file from the repo in case any updates have
        // been made to it.
        const data = await fetchContentsForFile(context,
            COMMIT_FILE_NAMES.COMPLIANCE, BRANCHES.ADD_COMPLIANCE);

        if (!data) {
            logger.info(`Unable to fetch ${COMMIT_FILE_NAMES.COMPLIANCE} in ref ${BRANCHES.ADD_COMPLIANCE}`);
            return;
        }

        let doc = yaml.safeLoad(Buffer.from(data.content, 'base64').toString());
        doc = applyComplianceCommands(comment, doc);

        await updateFileContent(context, COMMIT_MESSAGES.UPDATE_COMPLIANCE,
            BRANCHES.ADD_COMPLIANCE, COMMIT_FILE_NAMES.COMPLIANCE,
            yaml.safeDump(doc), data.sha);

    } catch (err) {
        const message = 'Unable to process compliance commands';
        logger.error(`${message}, error = ${err.message}`);

        throw err;
    }
};

export const handleBotCommand = async (context: Context) => {

    if (context.isBot) {
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
