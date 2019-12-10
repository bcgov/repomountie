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

import fs from 'fs';
import path from 'path';
import { Application } from 'probot';
import robot from '../src';
import { addLicenseIfRequired, addSecurityComplianceInfoIfRequired } from '../src/libs/repository';
import { addFileViaPullRequest, checkIfRefExists, hasPullRequestWithTitle } from '../src/libs/utils';

const p0 = path.join(__dirname, 'fixtures/context-no-lic.json');
const context = JSON.parse(fs.readFileSync(p0, 'utf8'));

jest.mock('fs');

jest.mock('../src/libs/utils', () => ({
    checkIfRefExists: jest.fn().mockReturnValueOnce(Promise.resolve(true)),
    hasPullRequestWithTitle: jest.fn().mockReturnValueOnce(Promise.resolve(false)),
    addFileViaPullRequest: jest.fn(),
    extractMessage: jest.fn().mockReturnValue('Hello Message'),
    loadTemplate: jest.fn().mockReturnValue('Hello'),
}));

describe('Repository integration tests', () => {
    let app;
    let github;

    beforeEach(() => {
        app = new Application();
        app.app = { getSignedJsonWebToken: () => 'xxx' };
        app.load(robot);
        // const getRef = jest.fn();
        // getRef.mockReturnValueOnce(master);
        // getRef.mockReturnValueOnce(master);

        github = {
            // git: {
            //     createRef: jest.fn(),
            //     // getRef,
            // },
            // issues: {
            //     addAssignees: jest.fn(),
            // },
            // pulls: {
            //     create: jest.fn().mockReturnValueOnce(Promise.resolve()),
            //     // list: jest.fn().mockReturnValueOnce(Promise.resolve(prNoAddLicense)),
            // },
            // repos: {
            //     createFile: jest.fn(),
            // },
        };

        // Passes the mocked out GitHub API into out app instance
        app.auth = () => Promise.resolve(github);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('Adding a license should resolve', async () => {
        // @ts-ignore
        addFileViaPullRequest.mockImplementation(() =>
            Promise.resolve());
        await expect(addLicenseIfRequired(context)).resolves.toBe(undefined);
    });

    it('Adding a license should fail because ref missing', async () => {
        // @ts-ignore
        checkIfRefExists.mockReturnValueOnce(false);
        await expect(addLicenseIfRequired(context)).resolves.toBe(undefined);
    });

    it('Adding a license should fail because pr exists', async () => {
        // @ts-ignore
        checkIfRefExists.mockReturnValueOnce(true);
        // @ts-ignore
        hasPullRequestWithTitle.mockReturnValueOnce(true);
        await expect(addLicenseIfRequired(context)).resolves.toBe(undefined);
    });

    it('Adding a license should fail because add file failed', async () => {
        // @ts-ignore
        checkIfRefExists.mockReturnValueOnce(true);
        // @ts-ignore
        hasPullRequestWithTitle.mockReturnValueOnce(false);
        // @ts-ignore
        addFileViaPullRequest.mockImplementation(() => {
            throw new Error();
        });

        await expect(addLicenseIfRequired(context)).rejects.toThrow();
    });

    it('Adding a compliance file should resolve', async () => {
        await expect(addSecurityComplianceInfoIfRequired(context)).resolves.toBe(undefined);
    });

    it('Adding a compliance file should fail because ref missing', async () => {
        // @ts-ignore
        checkIfRefExists.mockReturnValueOnce(false);
        await expect(addSecurityComplianceInfoIfRequired(context)).resolves.toBe(undefined);
    });

    it('Adding a compliance file should fail because pr exists', async () => {
        // @ts-ignore
        checkIfRefExists.mockReturnValueOnce(true);
        // @ts-ignore
        hasPullRequestWithTitle.mockReturnValueOnce(true);
        await expect(addSecurityComplianceInfoIfRequired(context)).resolves.toBe(undefined);
    });

    it('Adding a compliance file should fail because add file failed', async () => {
        // @ts-ignore
        checkIfRefExists.mockReturnValueOnce(true);
        // @ts-ignore
        hasPullRequestWithTitle.mockReturnValueOnce(false);
        // @ts-ignore
        addFileViaPullRequest.mockImplementation(() => {
            throw new Error();
        });

        await expect(addSecurityComplianceInfoIfRequired(context)).rejects.toThrow();
    });
});
