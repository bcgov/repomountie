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
import { fetchConfigFile } from '../src/libs/ghutils';
import { issueCommentCreated, memberAddedOrEdited, pullRequestOpened, repositoryCreated, repositoryDeleted, repositoryScheduled } from '../src/libs/handlers';
import { checkForStaleIssues, created } from '../src/libs/issue';
import { addCollaboratorsToMyIssues, validatePullRequestIfRequired } from '../src/libs/pullrequest';
import { addLicenseIfRequired, addMinistryTopicIfRequired, addSecurityComplianceInfoIfRequired } from '../src/libs/repository';
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

const p5 = path.join(__dirname, 'fixtures/repo-created-event.json');
const repoCreatedEvent = JSON.parse(fs.readFileSync(p5, 'utf8'));

jest.mock('../src/libs/pullrequest', () => ({
    addCollaboratorsToMyIssues: jest.fn(),
    validatePullRequestIfRequired: jest.fn(),
    requestUpdateForMyIssues: jest.fn(),
}));

jest.mock('../src/libs/repository', () => ({
    addSecurityComplianceInfoIfRequired: jest.fn(),
    addLicenseIfRequired: jest.fn(),
    fixDeprecatedComplianceStatus: jest.fn(),
    addMinistryTopicIfRequired: jest.fn(),
}));

jest.mock('../src/libs/issue', () => ({
    created: jest.fn(),
    checkForStaleIssues: jest.fn(),
}));

jest.mock('../src/libs/ghutils', () => ({
    fetchConfigFile: jest.fn(),
}));

describe('GitHub event handlers', () => {
    const { github } = helper;
    const scheduler = {
        stop: jest.fn(),
    };

    afterEach(() => {
        jest.clearAllMocks();
        jest.resetAllMocks();
    });

    it('Member added handler', async () => {
        const event = JSON.parse(JSON.stringify(memberAddedEvent));
        event.payload.organization.login = 'bcgov';
        const context = new Context(event, github as any, {} as any);

        await memberAddedOrEdited(context);

        expect(addCollaboratorsToMyIssues).toBeCalled();
    });

    it('Member edited handler', async () => {
        const event = JSON.parse(JSON.stringify(memberAddedEvent));
        event.payload.organization.login = 'bcgov';
        const context = new Context(event, github as any, {} as any);

        await memberAddedOrEdited(context);

        expect(addCollaboratorsToMyIssues).toBeCalled();
    });

    it('Pull request created from bad org rejected', async () => {
        const event = JSON.parse(JSON.stringify(issueOpenedEvent));
        event.payload.organization.login = 'fakeOrg';
        const context = new Context(event, github as any, {} as any);

        await pullRequestOpened(context);

        expect(addCollaboratorsToMyIssues).not.toBeCalled();
        expect(fetchConfigFile).not.toBeCalled();
        expect(validatePullRequestIfRequired).not.toBeCalled();
    });

    it('Pull request created by Bot is processed', async () => {
        const event = JSON.parse(JSON.stringify(issueOpenedEvent));
        event.payload.organization.login = 'bcgov';
        event.payload.sender.type = 'Bot';
        const context = new Context(event, github as any, {} as any);

        await pullRequestOpened(context);

        expect(addCollaboratorsToMyIssues).toBeCalled();
        expect(fetchConfigFile).not.toBeCalled();
        expect(validatePullRequestIfRequired).not.toBeCalled();
    });

    it('Pull request from repo with config processed', async () => {
        const event = JSON.parse(JSON.stringify(issueOpenedEvent));
        event.payload.organization.login = 'bcgov';
        event.payload.sender.type = 'User';
        const context = new Context(event, github as any, {} as any);

        await pullRequestOpened(context);

        expect(addCollaboratorsToMyIssues).not.toBeCalled();
        expect(fetchConfigFile).toBeCalled();
        expect(validatePullRequestIfRequired).toBeCalled();
    });

    it('Pull request from repo without config skipped', async () => {
        const event = JSON.parse(JSON.stringify(issueOpenedEvent));
        event.payload.organization.login = 'bcgov';
        event.payload.sender.type = 'User';
        const context = new Context(event, github as any, {} as any);

        // @ts-ignore
        fetchConfigFile.mockImplementationOnce(() => {
            throw new Error();
        });

        await pullRequestOpened(context);

        expect(addCollaboratorsToMyIssues).not.toBeCalled();
        expect(fetchConfigFile).toBeCalled();
        expect(validatePullRequestIfRequired).not.toBeCalled();
    });

    it('Comment created from bad org rejected', async () => {
        const event = JSON.parse(JSON.stringify(issueCommentCreatedEvent));
        event.payload.organization.login = 'fakeOrg';
        event.payload.sender.type = 'User';
        const context = new Context(event, github as any, {} as any);

        await issueCommentCreated(context);

        expect(created).not.toBeCalled();
    });

    it('Comment created by Bot is ignored', async () => {
        const event = JSON.parse(JSON.stringify(issueCommentCreatedEvent));
        event.payload.organization.login = 'bcgov';
        event.payload.sender.type = 'Bot';
        const context = new Context(event, github as any, {} as any);

        await issueCommentCreated(context);

        expect(created).not.toBeCalled();
    });

    it('Comment created by User is processed', async () => {
        const event = JSON.parse(JSON.stringify(issueCommentCreatedEvent));
        event.payload.organization.login = 'bcgov';
        event.payload.sender.type = 'User';
        const context = new Context(event, github as any, {} as any);

        await issueCommentCreated(context);

        expect(created).toBeCalled();
    });

    it('Scheduled repos from bad org rejected', async () => {
        const event = JSON.parse(JSON.stringify(repoScheduledEvent));
        event.payload.installation.account.login = 'fakeOrg';
        const context = new Context(event, github as any, {} as any);

        await repositoryScheduled(context, {});

        expect(addMinistryTopicIfRequired).not.toBeCalled();
        expect(addCollaboratorsToMyIssues).not.toBeCalled();
        expect(addSecurityComplianceInfoIfRequired).not.toBeCalled();
        expect(addLicenseIfRequired).not.toBeCalled();
        expect(fetchConfigFile).not.toBeCalled();
        expect(checkForStaleIssues).not.toBeCalled();
        expect(scheduler.stop).not.toBeCalled();
    });

    it('Scheduled repos that are archived are rejected', async () => {
        const event = JSON.parse(JSON.stringify(repoScheduledEvent));
        event.payload.installation.account.login = 'bcgov';
        event.payload.repository.archived = true;
        const context = new Context(event, github as any, {} as any);

        await repositoryScheduled(context, scheduler);

        expect(addMinistryTopicIfRequired).not.toBeCalled();
        expect(addCollaboratorsToMyIssues).not.toBeCalled();
        expect(addSecurityComplianceInfoIfRequired).not.toBeCalled();
        expect(addLicenseIfRequired).not.toBeCalled();
        expect(fetchConfigFile).not.toBeCalled();
        expect(checkForStaleIssues).not.toBeCalled();
        expect(scheduler.stop).toBeCalled();
    });

    it('Scheduled repos without compliance file have one added', async () => {
        const event = JSON.parse(JSON.stringify(repoScheduledEvent));
        event.payload.installation.account.login = 'bcgov';
        event.payload.repository.archived = false;
        const context = new Context(event, github as any, {} as any);

        await repositoryScheduled(context, scheduler);

        expect(addMinistryTopicIfRequired).not.toBeCalled();
        expect(addCollaboratorsToMyIssues).toBeCalled();
        expect(addSecurityComplianceInfoIfRequired).toBeCalled();
        expect(addLicenseIfRequired).toBeCalled();
        expect(fetchConfigFile).toBeCalled();
        expect(checkForStaleIssues).toBeCalled();
        expect(scheduler.stop).not.toBeCalled();
    });

    it('Scheduled repos with compliance file have it skipped', async () => {
        const event = JSON.parse(JSON.stringify(repoScheduledEvent));
        event.payload.installation.account.login = 'bcgov';
        event.payload.repository.archived = false;
        const context = new Context(event, github as any, {} as any);

        await repositoryScheduled(context, scheduler);

        expect(addMinistryTopicIfRequired).not.toBeCalled();
        expect(addCollaboratorsToMyIssues).toBeCalled();
        expect(addSecurityComplianceInfoIfRequired).toBeCalled();
        expect(addLicenseIfRequired).toBeCalled();
        expect(fetchConfigFile).toBeCalled();
        expect(checkForStaleIssues).toBeCalled();
        expect(scheduler.stop).not.toBeCalled();
    });

    it('Scheduled repos without config file skip cultural policy', async () => {
        const event = JSON.parse(JSON.stringify(repoScheduledEvent));
        event.payload.installation.account.login = 'bcgov';
        event.payload.repository.archived = false;
        const context = new Context(event, github as any, {} as any);

        // @ts-ignore
        fetchConfigFile.mockImplementationOnce(() => {
            throw new Error();
        });

        await repositoryScheduled(context, scheduler);

        expect(addMinistryTopicIfRequired).not.toBeCalled();
        expect(addCollaboratorsToMyIssues).toBeCalled();
        expect(addSecurityComplianceInfoIfRequired).toBeCalled();
        expect(addLicenseIfRequired).toBeCalled();
        expect(fetchConfigFile).toBeCalled();
        expect(checkForStaleIssues).not.toBeCalled();
        expect(scheduler.stop).not.toBeCalled();
    });

    it('Deleted repositories are unscheduled', async () => {
        const event = JSON.parse(JSON.stringify(repoDeletedEvent));
        event.payload.organization.login = 'bcgov';
        const context = new Context(event, github as any, {} as any);

        await repositoryDeleted(context, scheduler);

        expect(scheduler.stop).toBeCalled();
    });

    it('Created repos have topics issue added', async () => {
        const event = JSON.parse(JSON.stringify(repoCreatedEvent));
        const context = new Context(event, github as any, {} as any);

        await repositoryCreated(context);

        expect(addMinistryTopicIfRequired).toBeCalled();
        expect(addCollaboratorsToMyIssues).not.toBeCalled();
        expect(addSecurityComplianceInfoIfRequired).not.toBeCalled();
        expect(addLicenseIfRequired).not.toBeCalled();
        expect(fetchConfigFile).not.toBeCalled();
        expect(checkForStaleIssues).not.toBeCalled();
        expect(scheduler.stop).not.toBeCalled();
    });

    it('Created repos from the wrong org are skipped', async () => {
        const event = JSON.parse(JSON.stringify(repoCreatedEvent));
        event.payload.repository.owner.login = 'bacon';

        const context = new Context(event, github as any, {} as any);

        await repositoryCreated(context);

        expect(addMinistryTopicIfRequired).not.toBeCalled();
        expect(addCollaboratorsToMyIssues).not.toBeCalled();
        expect(addSecurityComplianceInfoIfRequired).not.toBeCalled();
        expect(addLicenseIfRequired).not.toBeCalled();
        expect(fetchConfigFile).not.toBeCalled();
        expect(checkForStaleIssues).not.toBeCalled();
        expect(scheduler.stop).not.toBeCalled();
    });
});
