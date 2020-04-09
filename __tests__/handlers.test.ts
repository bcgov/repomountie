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
// Created by Jason Leach on 2020-03-27.
//

import fs from 'fs';
import path from 'path';
import { Context } from 'probot';
import { fetchComplianceFile, fetchConfigFile } from '../src/libs/ghutils';
import { issueCommentCreated, memberAddedOrEdited, pullRequestOpened, repositoryDeleted, repositoryScheduled } from '../src/libs/handlers';
import { checkForStaleIssues, created } from '../src/libs/issue';
import { addCollaboratorsToPullRequests, validatePullRequestIfRequired } from '../src/libs/pullrequest';
import { addLicenseIfRequired, addSecurityComplianceInfoIfRequired } from '../src/libs/repository';
import { extractComplianceStatus } from '../src/libs/utils';
import helper from './src/helper';

const p0 = path.join(__dirname, 'fixtures/member-added-event.json');
const memberAddedEvent = JSON.parse(fs.readFileSync(p0, 'utf8'));

const p1 = path.join(__dirname, 'fixtures/pull_request-opened-event.json');
const issueOpenedEvent = JSON.parse(fs.readFileSync(p1, 'utf8'));

const p2 = path.join(__dirname, 'fixtures/issue_comment-event.json');
const issueCommentCreatedEvent = JSON.parse(fs.readFileSync(p2, 'utf8'));

const p3 = path.join(__dirname, 'fixtures/repo-schedule-event.json');
const repoScheduledEvent = JSON.parse(fs.readFileSync(p3, 'utf8'));

const p4 = path.join(__dirname, 'fixtures/repo-deleted-event.json');
const repoDeletedEvent = JSON.parse(fs.readFileSync(p4, 'utf8'));

jest.mock('../src/libs/pullrequest', () => ({
    addCollaboratorsToPullRequests: jest.fn(),
    validatePullRequestIfRequired: jest.fn(),
    requestUpdateForPullRequest: jest.fn(),
}));

jest.mock('../src/libs/repository', () => ({
    addSecurityComplianceInfoIfRequired: jest.fn(),
    addLicenseIfRequired: jest.fn(),
    fixDeprecatedComplianceStatus: jest.fn(),
}));

jest.mock('../src/libs/issue', () => ({
    created: jest.fn(),
    checkForStaleIssues: jest.fn(),
}));

jest.mock('../src/libs/ghutils', () => ({
    fetchConfigFile: jest.fn(),
    fetchComplianceFile: jest.fn(),
}));

jest.mock('../src/libs/utils', () => ({
    extractComplianceStatus: jest.fn(),
}));

describe('GitHub event handlers', () => {
    let context
    const { github } = helper;
    const scheduler = {
        stop: jest.fn(),
    };

    beforeEach(() => {
        context = undefined;
    });

    afterEach(() => {
        jest.clearAllMocks();
        jest.resetAllMocks();
    });

    it('Member added handler', async () => {
        context = new Context(memberAddedEvent, github as any, {} as any);
        context.payload.organization.login = 'bcgov';

        await memberAddedOrEdited(context);

        expect(addCollaboratorsToPullRequests).toBeCalled();
    });

    it('Member edited handler', async () => {
        context = new Context(memberAddedEvent, github as any, {} as any);
        context.payload.organization.login = 'bcgov';

        await memberAddedOrEdited(context);

        expect(addCollaboratorsToPullRequests).toBeCalled();
    });

    it('Pull request created from bad org rejected', async () => {
        context = new Context(issueOpenedEvent, github as any, {} as any);
        context.payload.organization.login = 'fakeOrg';

        await pullRequestOpened(context);

        expect(addCollaboratorsToPullRequests).not.toBeCalled();
        expect(fetchConfigFile).not.toBeCalled();
        expect(validatePullRequestIfRequired).not.toBeCalled();
    });

    it('Pull request created by Bot is processed', async () => {
        context = new Context(issueOpenedEvent, github as any, {} as any);
        context.payload.sender.type = 'Bot';
        context.payload.organization.login = 'bcgov';

        await pullRequestOpened(context);

        expect(addCollaboratorsToPullRequests).toBeCalled();
        expect(fetchConfigFile).not.toBeCalled();
        expect(validatePullRequestIfRequired).not.toBeCalled();
    });

    it('Pull request from repo with config processed', async () => {
        context = new Context(issueOpenedEvent, github as any, {} as any);
        context.payload.sender.type = 'User';
        context.payload.organization.login = 'bcgov';

        await pullRequestOpened(context);

        expect(addCollaboratorsToPullRequests).not.toBeCalled();
        expect(fetchConfigFile).toBeCalled();
        expect(validatePullRequestIfRequired).toBeCalled();
    });

    it('Pull request from repo without config skipped', async () => {
        // @ts-ignore
        fetchConfigFile.mockImplementationOnce(() => {
            throw new Error();
        });
        context = new Context(issueOpenedEvent, github as any, {} as any);
        context.payload.sender.type = 'User';
        context.payload.organization.login = 'bcgov';

        await pullRequestOpened(context);

        expect(addCollaboratorsToPullRequests).not.toBeCalled();
        expect(fetchConfigFile).toBeCalled();
        expect(validatePullRequestIfRequired).not.toBeCalled();
    });

    it('Comment created from bad org rejected', async () => {
        context = new Context(issueCommentCreatedEvent, github as any, {} as any);
        context.payload.organization.login = 'fakeOrg';

        await issueCommentCreated(context);

        expect(created).not.toBeCalled();
    });

    it('Comment created by Bot is ignored', async () => {
        context = new Context(issueCommentCreatedEvent, github as any, {} as any);
        context.payload.sender.type = 'Bot';
        context.payload.organization.login = 'bcgov';

        await issueCommentCreated(context);

        expect(created).not.toBeCalled();
    });

    it('Comment created by User is processed', async () => {
        context = new Context(issueCommentCreatedEvent, github as any, {} as any);
        context.payload.sender.type = 'User';
        context.payload.organization.login = 'bcgov';

        await issueCommentCreated(context);

        expect(created).toBeCalled();
    });

    it('Scheduled repos from bad org rejected', async () => {
        context = new Context(repoScheduledEvent, github as any, {} as any);
        context.payload.installation.account.login = 'fakeOrg';

        await repositoryScheduled(context, {});

        expect(addCollaboratorsToPullRequests).not.toBeCalled();
        expect(fetchComplianceFile).not.toBeCalled();
        expect(extractComplianceStatus).not.toBeCalled();
        expect(addSecurityComplianceInfoIfRequired).not.toBeCalled();
        expect(addLicenseIfRequired).not.toBeCalled();
        expect(fetchConfigFile).not.toBeCalled();
        expect(checkForStaleIssues).not.toBeCalled();
        expect(scheduler.stop).not.toBeCalled();
    });

    it('Scheduled repos that are archived are rejected', async () => {
        context = new Context(repoScheduledEvent, github as any, {} as any);
        context.payload.installation.account.login = 'bcgov';
        context.payload.repository.archived = true;

        await repositoryScheduled(context, scheduler);

        expect(addCollaboratorsToPullRequests).not.toBeCalled();
        expect(fetchComplianceFile).not.toBeCalled();
        expect(extractComplianceStatus).not.toBeCalled();
        expect(addSecurityComplianceInfoIfRequired).not.toBeCalled();
        expect(addLicenseIfRequired).not.toBeCalled();
        expect(fetchConfigFile).not.toBeCalled();
        expect(checkForStaleIssues).not.toBeCalled();
        expect(scheduler.stop).toBeCalled();
    });

    it('Scheduled repos without compiance file have one added', async () => {
        context = new Context(repoScheduledEvent, github as any, {} as any);
        context.payload.installation.account.login = 'bcgov';
        context.payload.repository.archived = false;
        // @ts-ignore
        fetchComplianceFile.mockImplementationOnce(() => {
            throw new Error();
        });

        await repositoryScheduled(context, scheduler);

        expect(addCollaboratorsToPullRequests).toBeCalled();
        expect(fetchComplianceFile).toBeCalled();
        expect(extractComplianceStatus).not.toBeCalled();
        expect(addSecurityComplianceInfoIfRequired).toBeCalled();
        expect(addLicenseIfRequired).toBeCalled();
        expect(fetchConfigFile).toBeCalled();
        expect(checkForStaleIssues).toBeCalled();
        expect(scheduler.stop).not.toBeCalled();
    });

    it('Scheduled repos with compliance file have it skipped', async () => {
        context = new Context(repoScheduledEvent, github as any, {} as any);
        context.payload.installation.account.login = 'bcgov';
        context.payload.repository.archived = false;

        // @ts-ignore
        // extractComplianceStatus.mockReturnValue({
        //     save: () => { console.log('x'); },
        // });

        await repositoryScheduled(context, scheduler);

        expect(addCollaboratorsToPullRequests).toBeCalled();
        expect(fetchComplianceFile).toBeCalled();
        expect(extractComplianceStatus).toBeCalled();
        expect(addSecurityComplianceInfoIfRequired).toBeCalled();
        expect(addLicenseIfRequired).toBeCalled();
        expect(fetchConfigFile).toBeCalled();
        expect(checkForStaleIssues).toBeCalled();
        expect(scheduler.stop).not.toBeCalled();
    });

    it('Scheduled repos without config file skip cultural policy', async () => {
        context = new Context(repoScheduledEvent, github as any, {} as any);
        context.payload.installation.account.login = 'bcgov';
        context.payload.repository.archived = false;
        // @ts-ignore
        fetchConfigFile.mockImplementationOnce(() => {
            throw new Error();
        });
        // // @ts-ignore
        // extractComplianceStatus.mockReturnValue({
        //     save: () => { },
        // });

        await repositoryScheduled(context, scheduler);

        expect(addCollaboratorsToPullRequests).toBeCalled();
        expect(fetchComplianceFile).toBeCalled();
        expect(extractComplianceStatus).toBeCalled();
        expect(addSecurityComplianceInfoIfRequired).toBeCalled();
        expect(addLicenseIfRequired).toBeCalled();
        expect(fetchConfigFile).toBeCalled();
        expect(checkForStaleIssues).not.toBeCalled();
        expect(scheduler.stop).not.toBeCalled();
    });

    it('Deleted repositories are unscheduled', async () => {
        context = new Context(repoDeletedEvent, github as any, {} as any);

        await repositoryDeleted(context, scheduler);

        expect(scheduler.stop).toBeCalled();
    });
});
