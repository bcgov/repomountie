//
// Copyright © 2018, 2019 Province of British Columbia
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
// Created by Jason Leach on 2018-10-04.
//

import fs from 'fs';
import path from 'path';
import { Context } from 'probot';
import { COMMIT_FILE_NAMES, ISSUE_TITLES } from '../src/constants';
import { addFileViaPullRequest, assignUsersToIssue, checkIfFileExists, checkIfRefExists, fetchCollaborators, fetchComplianceFile, fetchConfigFile, fetchContentsForFile, fetchFileContent, fetchPullRequests, hasPullRequestWithTitle, isOrgMember, labelExists } from '../src/libs/ghutils';
import helper from './src/helper';

const p0 = path.join(__dirname, 'fixtures/repo-schedule-event.json');
const repoScheduledEvent = JSON.parse(fs.readFileSync(p0, 'utf8'));

const p1 = path.join(__dirname, 'fixtures/repo-get-content-compliance.json');
const complianceResponse = JSON.parse(fs.readFileSync(p1, 'utf8'));

const p2 = path.join(__dirname, 'fixtures/repo-get-content-config.json');
const configResponse = JSON.parse(fs.readFileSync(p2, 'utf8'));

const p3 = path.join(__dirname, 'fixtures/master.json');
const master = JSON.parse(fs.readFileSync(p3, 'utf8'));

const p5 = path.join(__dirname, 'fixtures/repo-get-pulls.json');
const listPulls = JSON.parse(fs.readFileSync(p5, 'utf8'));

const p6 = path.join(__dirname, 'fixtures/repo-list-commits.json');
const listCommits = JSON.parse(fs.readFileSync(p6, 'utf8'));

const p7 = path.join(__dirname, 'fixtures/org-user-ismember.json');
const memberhip = JSON.parse(fs.readFileSync(p7, 'utf8'));

const p8 = path.join(__dirname, 'fixtures/repo-get-collaborators-response.json');
const collabs = JSON.parse(fs.readFileSync(p8, 'utf8'));

describe('GitHub utility functions', () => {
    let context;
    const { github } = helper;

    beforeEach(() => {
        context = new Context(repoScheduledEvent, github as any, {} as any);
        context.payload.organization = {
            login: 'bcgov',
        };
    });

    afterEach(() => {
        jest.clearAllMocks();
        jest.resetAllMocks();
    });

    it('Labels should be fetched for lookup', async () => {
        await labelExists(context, 'blarb');
        expect(github.issues.listLabelsForRepo).toHaveBeenCalled();
    });

    it('A file should be retrieved.', async () => {
        github.repos.getContents = jest.fn().mockReturnValueOnce(Promise.resolve(complianceResponse));
        const data = await fetchFileContent(context, COMMIT_FILE_NAMES.COMPLIANCE);

        expect(data).toMatchSnapshot();
    });

    it('A file should not be retrieved.', async () => {
        await expect(fetchFileContent(context, 'blarb.txt')).rejects.toThrow(Error);
    });

    it('The compliance file should be retrieved.', async () => {
        github.repos.getContents = jest.fn().mockReturnValueOnce(Promise.resolve(complianceResponse));
        const data = await fetchComplianceFile(context);

        expect(github.repos.getContents).toHaveBeenCalled();
        expect(data).toMatchSnapshot();
    });

    it('The config file should be retrieved.', async () => {
        github.repos.getContents = jest.fn().mockReturnValueOnce(Promise.resolve(configResponse));
        const data = await fetchConfigFile(context);

        expect(github.repos.getContents).toHaveBeenCalled();
        expect(data).toMatchSnapshot();
    });

    it('The ref should exists.', async () => {
        github.git.getRef.mockReturnValueOnce(master);
        const result = await checkIfRefExists(context, context.payload.repository.default_branch);

        expect(github.git.getRef).toHaveBeenCalled();
        expect(result).toBeTruthy();
    });

    it('The ref should not exists.', async () => {
        github.git.getRef.mockReturnValueOnce(Promise.reject());
        const result = await checkIfRefExists(context, context.payload.repository.default_branch);

        expect(github.git.getRef).toHaveBeenCalled();
        expect(result).toBeFalsy();
    });

    it('A file should be added by PR', async () => {
        const owner = 'bcgov';
        const repo = 'hello5';
        github.git.getRef.mockReturnValueOnce(master);

        await addFileViaPullRequest(context, owner, repo, 'Hello', 'World',
            'This is a body.', 'blarb', 'blarb.txt', 'some-data-here');

        expect(github.git.getRef).toHaveBeenCalled();
        expect(github.pulls.create).toHaveBeenCalled();
        expect(github.git.createRef).toHaveBeenCalled();
        expect(github.repos.createOrUpdateFile).toHaveBeenCalled();
    });

    it('Pull requests are retrieved', async () => {
        github.pulls.list = jest.fn().mockReturnValueOnce(Promise.resolve(listPulls));
        const results = await fetchPullRequests(context);

        expect(results).toMatchSnapshot();
    });

    it('A pull request should not exists', async () => {
        github.pulls.list = jest.fn().mockReturnValueOnce(Promise.resolve(listPulls));
        const result = await hasPullRequestWithTitle(context, 'Hello');

        expect(result).toBeFalsy();
    });

    it('A pull request should exists', async () => {
        github.pulls.list = jest.fn().mockReturnValueOnce(Promise.resolve(listPulls));
        const result = await hasPullRequestWithTitle(context, ISSUE_TITLES.ADD_LICENSE);

        expect(result).toBeTruthy();
    });

    it('Assigning an issue on GitHub should succeed', async () => {
        github.issues.addAssignees = jest.fn().mockReturnValueOnce(Promise.resolve());

        await expect(assignUsersToIssue(context, ['blarb'])).resolves.toBeUndefined();
    });

    it('Assigning an issue on GitHub should fail', async () => {
        github.issues.addAssignees = jest.fn().mockReturnValueOnce(Promise.reject());

        await expect(assignUsersToIssue(context, ['blarb'])).rejects.toThrow();
    });

    it('File contents should be retrieved', async () => {
        github.repos.getContents = jest.fn().mockReturnValueOnce(Promise.resolve(complianceResponse));
        github.repos.listCommits = jest.fn().mockReturnValueOnce(Promise.resolve(listCommits));

        const results = await fetchContentsForFile(context, 'helo.yaml');

        expect(github.repos.listCommits).toHaveBeenCalled();
        expect(github.repos.getContents).toHaveBeenCalled();
        expect(results).toMatchSnapshot();
    });

    it('A user is a member of the organization', async () => {
        github.orgs.checkMembership = jest.fn().mockReturnValueOnce(Promise.resolve(memberhip));

        const result = await isOrgMember(context, 'helloworld');
        expect(result).toBeTruthy();
    });

    it('A user is not a member of the organization', async () => {
        const err: any = new Error('Nope');
        err.code = 404;

        github.orgs.checkMembership = jest.fn().mockReturnValueOnce(Promise.reject(err));

        const result = await isOrgMember(context, 'helloworld');
        expect(result).toBeFalsy();
    });

    it('A user lookup fails unexpectedly', async () => {
        const err: any = new Error('Nope');

        github.orgs.checkMembership = jest.fn().mockReturnValueOnce(Promise.reject(err));

        await expect(isOrgMember(context, 'helloworld')).rejects.toThrow();
    });

    it('A user lookup fails due to an unexpected http code', async () => {
        memberhip.status = 512;
        github.orgs.checkMembership = jest.fn().mockReturnValueOnce(Promise.resolve(memberhip));

        const result = await isOrgMember(context, 'helloworld');
        expect(result).toBeFalsy();
    });

    it('Return true if a file exists', async () => {
        github.repos.getContents = jest.fn().mockReturnValueOnce(Promise.resolve(complianceResponse));

        await expect(checkIfFileExists(context, 'hello.yaml')).resolves.toBeTruthy();
    });

    it('Return false if a file does not exist', async () => {
        github.repos.getContents = jest.fn().mockReturnValueOnce(Promise.reject());

        await expect(checkIfFileExists(context, 'hello.yaml')).resolves.toBeFalsy();
    });

    it('Fetching collaborators should succeed', async () => {
        github.repos.listCollaborators = jest.fn().mockReturnValueOnce(Promise.resolve(collabs));

        const results = await fetchCollaborators(context);

        expect(results).toMatchSnapshot();
    });
});
