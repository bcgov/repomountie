//
// Copyright © 2020 Province of British Columbia
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
// Created by Jason Leach on 2020-03-26.
//

import { logger } from '@bcgov/common-nodejs-utils';
import { Context } from 'probot';
import { PR_TITLES } from '../constants';
import { PullState, RepoAffiliation } from './enums';
import { assignUsersToIssue, fetchCollaborators, fetchPullRequests } from './ghutils';

export const memberAddedOrEditedToRepo = async (context: Context) => {

    try {
        // filter for PRs created by the bot that don't have any
        // assignees
        const pulls: any = (await fetchPullRequests(context, PullState.Open))
            .filter(p => p.assignees.length === 0)
            .filter(p => Object.values(PR_TITLES).includes(p.title.trim()));

        if (pulls.length === 0) {
            return;
        }

        // filter for collaborators who are admin or can write
        const assignees: any = (await fetchCollaborators(context, RepoAffiliation.Direct))
            .filter((c) => (c.permissions.admin === true ||
                c.permissions.push === true))
            .map((u) => u.login);

        if (assignees.length === 0) {
            return;
        }

        const owner = context.payload.organization.login;
        const repo = context.payload.repository.name;
        const promises = pulls.map(pr =>
            assignUsersToIssue(context, assignees, {
                number: pr.number,
                owner,
                repo,
            }));

        await Promise.all(promises);
    } catch (err) {
        const message = `Unable to assign users to PR`;
        logger.error(`${message}, error = ${err.message}`);
    }
}
