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
import { BRANCHES, COMMIT_FILE_NAMES, COMMIT_MESSAGES, HELP_DESK, PR_TITLES, REGEXP } from '../constants';
import { assignUsersToIssue, fetchContentsForFile } from './ghutils';

/**
 * Determine if help desk support is required
 * @param {Context} context The event context context
 * @returns True if support is required, false otherwise.
 */
export const helpDeskSupportRequired = (payload: any) => {
    // These are the accepted commands. They are case insensitive,
    // and require a leading `@re` to be accepted.
    // @${WHOAMI} help

    const re = new RegExp(REGEXP.help, 'gi');
    const comment = payload.comment.body;
    const isAssigned = payload.issue.assignees.some((e) =>
        HELP_DESK.SUPPORT_USERS.includes(e.login)
    );

    if (!isAssigned && re.test(comment)) {
        return true;
    }

    return false;
};

export const applyComplianceCommands = (comment: string, doc: any): any => {
    let result: RegExpExecArray | null;
    const re = new RegExp(REGEXP.compliance, 'gi');

    // tslint:disable-next-line:no-conditional-assignment
    while ((result = re.exec(comment)) !== null) {
        // sample result
        // [ '/update-pia completed',
        //   'pia',
        //   'completed',
        //   index: 0,
        //   input: '/update-pia completed',
        //   groups: undefined ]
        const items = doc.spec.filter((s) => s.name === result![1].toUpperCase());
        if (items.length === 0) {
            continue;
        }

        const item = items.pop();
        item.status = result![2];
        // Date.now() used to simplify mock in unit tests.
        item['last-updated'] = new Date(Date.now()).toISOString();
    }

    return doc;
};

export const handleLicenseCommands = async (context: Context) => {

    try {
        // For we just assign help desk willy-nilly, going forward we should
        // better identify the issue and assign users with surgical precision.
        if (helpDeskSupportRequired(context.payload)) {
            await assignUsersToIssue(context, HELP_DESK.SUPPORT_USERS);
        }
    } catch (err) {
        const message = 'Unable to process license commands';
        logger.error(`${message}, error = ${err.message}`);

        throw err;
    }
};

export const handleComplianceCommands = async (context: Context) => {
    // These are the accepted commands. They are case insensitive,
    // and require a leading `@re` to be accepted.
    // @${WHOAMI} update-pia STATUS
    // @${WHOAMI} update-stra STATUS
    const re = new RegExp(REGEXP.compliance, 'gi');
    const comment = context.payload.comment.body;

    try {
        // For we just assign help desk willy-nilly, going forward we should
        // better identify the issue and assign users with surgical precision.
        if (helpDeskSupportRequired(context.payload)) {
            await assignUsersToIssue(context, HELP_DESK.SUPPORT_USERS);
        }

        // check for appropriate bot commands
        if (!re.test(comment)) {
            return;
        }

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

        await context.github.repos.createOrUpdateFile(
            context.repo({
                branch: BRANCHES.ADD_COMPLIANCE,
                content: Buffer.from(yaml.safeDump(doc)).toString('base64'),
                message: COMMIT_MESSAGES.UPDATE_COMPLIANCE,
                path: COMMIT_FILE_NAMES.COMPLIANCE,
                sha: data.sha,
            })
        );
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
        switch (context.payload.issue.title) {
            case PR_TITLES.ADD_COMPLIANCE:
                await handleComplianceCommands(context);
                break;
            case PR_TITLES.ADD_LICENSE:
                await handleLicenseCommands(context);
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
