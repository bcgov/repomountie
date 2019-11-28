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
// Created by Jason Leach on 2019-11-25.
//

import { Application } from 'probot';
import robot from '../src';

jest.mock('fs');

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
            git: {
                createRef: jest.fn(),
                // getRef,
            },
            issues: {
                addAssignees: jest.fn(),
            },
            // pulls: {
            //     create: jest.fn().mockReturnValueOnce(Promise.resolve()),
            //     list: jest.fn().mockReturnValueOnce(Promise.resolve(prNoAddLicense)),
            // },
            repos: {
                createFile: jest.fn(),
            },
        };

        // Passes the mocked out GitHub API into out app instance
        app.auth = () => Promise.resolve(github);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it.skip('A repository without compliance config should have one added', async () => {

    });

    it.skip('A repository with compliance config should be skipped', async () => {

    });

    it.skip('An archived repository (no compliance) should be skipped', async () => {

    });

    it.skip('An archived repository (compliance) should be skipped', async () => {

    });

    it.skip('A repository without master branch should be skipped', async () => {

    });
});

// For more information about using TypeScript in your tests, Jest recommends:
// https://github.com/kulshekhar/ts-jest
