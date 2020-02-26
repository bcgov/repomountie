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
// Created by Jason Leach on 2020-02-26.
//

import nock from 'nock';
import { Application } from 'probot';
import robot from '../../src';

jest.mock('mongoose');

nock('https://api.github.com')
    .get('/app/installations?per_page=100')
    .reply(200, {});

let app;
let github;

app = new Application();
app.app = { getSignedJsonWebToken: () => 'xxx' };
app.load(robot);

github = {
    git: {
        createRef: jest.fn(),
        getRef: jest.fn(),
    },
    gitdata: {
        createRef: jest.fn(),
        getRef: jest.fn(),
    },
    issues: {
        addAssignees: jest.fn(),
        addLabels: jest.fn(),
        createComment: jest.fn(),
        listLabelsForRepo: jest.fn(),
        update: jest.fn(),
    },
    orgs: {
        checkMembership: jest.fn(),
    },
    pullRequests: {
        create: jest.fn(),
        getAll: jest.fn(),
        list: jest.fn(),
    },
    pulls: {
        create: jest.fn(),
        getAll: jest.fn(),
        list: jest.fn(),
    },
    repos: {
        createFile: jest.fn(),
        createOrUpdateFile: jest.fn(),
        getContents: jest.fn(),
        listCollaborators: jest.fn(),
        listCommits: jest.fn(),
    },
    search: {
        issuesAndPullRequests: jest.fn(),
    },
};

// Passes the mocked out GitHub API into out app instance
app.auth = () => Promise.resolve(github);

export default {
    app,
    github,
};
