//
//
// Copyright © 2020 Province of British Columbia
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
// Created by Jason Leach on 2020-03-31.
//

'use strict'

import { logger } from '@bcgov/common-nodejs-utils';
import { Context } from 'probot';
import { ACCESS_CONTROL } from '../constants';
import { fetchConfigFile } from './ghutils';
import { checkForStaleIssues, created } from './issue';
import { addCollaboratorsToMyIssues, requestUpdateForMyIssues, validatePullRequestIfRequired } from './pullrequest';
import { fetchComplianceMetrics } from './reporting';
import { addLicenseIfRequired, addMinistryTopicIfRequired, addSecurityComplianceInfoIfRequired, addWordsMatterIfRequire } from './repository';

export const memberAddedOrEdited = async (context: Context): Promise<void> => {
    const owner = context.payload.organization.login;
    const repo = context.payload.repository.name;

    try {
        await addCollaboratorsToMyIssues(context, owner, repo);
    } catch (err) {
        const message = 'Unable to handel member event';
        logger.error(`${message}, error = ${err.message}`);
    }
}

export const pullRequestOpened = async (context: Context): Promise<void> => {
    const owner = context.payload.organization.login;
    const repo = context.payload.repository.name;
    const isFromBot = context.isBot;

    if (!ACCESS_CONTROL.allowedInstallations.includes(owner)) {
        logger.info(
            `Skipping PR ${context.payload.pull_request.number} for repo ${
            context.payload.repository.name
            } because its not from an allowed installation`
        );

        return;
    }

    if (isFromBot) {
        try {
            await addCollaboratorsToMyIssues(context, owner, repo);
        } catch (err) {
            const message = `Unable to assign collaborators in ${repo}`;
            logger.error(`${message}, error = ${err.message}`);
        }

        return;
    }

    logger.info(
        `Processing PR ${context.payload.pull_request.number} for repo ${
        context.payload.repository.name
        }`
    );

    try {
        const rmconfig = await fetchConfigFile(context);

        await validatePullRequestIfRequired(context, rmconfig);
    } catch (err) {
        logger.info(`Unable to handle pull request, err = ${err.message}`);
    }
}

export const issueCommentCreated = async (context: Context): Promise<void> => {
    const owner = context.payload.organization.login;
    const isFromBot = context.isBot;

    if (!ACCESS_CONTROL.allowedInstallations.includes(owner)) {
        logger.info(
            `Skipping issue ${context.payload.issue.number} for repo ${
            context.payload.repository.name
            } because its not from an allowed installation`
        );

        return;
    }

    // This can throw a `TypeError` during testing.
    if (isFromBot) {
        // Don't act crazy.
        logger.info(`Skipping issue ${context.payload.issue.id} because its from a bot`);
        return;
    }

    logger.info(`Processing issue ${context.payload.issue.id}`);

    try {
        await created(context);
    } catch (err) {
        logger.error(`Unable to process issue ${context.payload.issue.id}`);
    }
}

export const repositoryScheduled = async (context: Context, scheduler: any): Promise<void> => {
    logger.info(`Processing ${context.payload.repository.name}`);

    const owner = context.payload.installation.account.login;
    const repo = context.payload.repository.name;

    if (!ACCESS_CONTROL.allowedInstallations.includes(owner)) {
        logger.info(
            `Skipping scheduled repository ${
            repo
            } because its not part of an allowed installation`
        );
        return;
    }

    if (context.payload.repository.archived) {
        logger.warn(`The repo ${repo} is archived. Skipping.`);
        scheduler.stop(context.payload.repository);

        return;
    }

    try {
        // These are all independent func. Rather than call them each in a
        // try/catch I'm bundling them. If a repo is created without a
        // README etc then it will not have a master branch and the PRs for
        // licensing and compliance cannot be created; this is why these
        // two functions are below and not in `repositoryCreated`.
        await Promise.all([
            addLicenseIfRequired(context, owner, repo),
            addSecurityComplianceInfoIfRequired(context, owner, repo),
            addCollaboratorsToMyIssues(context, owner, repo),
            requestUpdateForMyIssues(context, owner, repo),
            fetchComplianceMetrics(context, owner, repo),
        ]);
    } catch (err) {
        const message = `Unable to complete all housekeeping tasks, repo is ${repo}`;
        logger.error(`${message}, error = ${err.message}`);
    }

    try {
        // functionality below here requires a `config` file
        // exist in the repo.
        try {
            const rmconfig = await fetchConfigFile(context);
            await checkForStaleIssues(context, rmconfig);
        } catch (err) {
            logger.info('No config file. Skipping.');
        }
    } catch (err) {
        const message = `Unable to process repository ${repo}`;
        logger.error(`${message}, error = ${err.message}`);
    }
}

export const repositoryCreated = async (context: Context): Promise<void> => {
    logger.info(`Processing ${context.payload.repository.name}`);

    const owner = context.payload.repository.owner.login;
    const repo = context.payload.repository.name;

    if (!ACCESS_CONTROL.allowedInstallations.includes(owner)) {
        logger.info(
            `Skipping repository ${repo} because its not part of an allowed installation`
        );
        return;
    }

    try {
        // These are all independent func. Rather than call them
        // each in a try/catch I'm bundling them.
        await Promise.all([
            // addLicenseIfRequired(context, owner, repo),
            // addSecurityComplianceInfoIfRequired(context, owner, repo),
            addMinistryTopicIfRequired(context, owner, repo),
            addWordsMatterIfRequire(context, owner, repo),
        ]);
    } catch (err) {
        const message = `Unable to complete all housekeeping tasks, repo is ${repo}`;
        logger.error(`${message}, error = ${err.message}`);
    }
}

export const repositoryDeleted = async (context: Context, scheduler: any): Promise<void> => {
    scheduler.stop(context.payload.repository);
}
