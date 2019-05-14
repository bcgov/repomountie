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
import { Application, Context } from 'probot';
import robot from '../src';
import { extractCommands, isValidPullRequestLength, shouldIgnoredLengthCheck } from '../src/libs/pullrequest';
import { fetchRepoMountieConfig } from '../src/libs/utils';

jest.mock('fs');

const p0 = path.join(__dirname, 'fixtures/pull_request-opened-event.json');
const p1 = path.join(__dirname, 'fixtures/repo-get-content.json');
const p2 = path.join(__dirname, 'fixtures/rmconfig.json');

describe('Repository integration tests', () => {
  let app;
  let github;
  let context;
  let issueOpenedEvent;
  let repoFileContent;
  let repoMountieConfig;

  beforeEach(() => {
    app = new Application();
    app.app = () => 'Token';
    app.load(robot);

    issueOpenedEvent = JSON.parse(fs.readFileSync(p0, 'utf8'));
    repoFileContent = JSON.parse(fs.readFileSync(p1, 'utf8'));
    repoMountieConfig = JSON.parse(fs.readFileSync(p2, 'utf8'));

    github = {
      issues: {
        createComment: jest.fn(),
      },
      repos: {
        createFile: jest.fn(),
        getContents: jest.fn().mockReturnValueOnce(Promise.resolve(repoFileContent)),
      },
    };

    // Passes the mocked out GitHub API into out app instance
    app.auth = () => Promise.resolve(github);

    context = new Context(issueOpenedEvent, github as any, {} as any);
  });

  test('A config file should be fetched from the repo', async () => {
    const response = await fetchRepoMountieConfig(context);

    expect(response).not.toBe(repoMountieConfig);
    expect(github.repos.getContents).toHaveBeenCalled();
  });

  test('A repo with no config should be handled gracefully', async () => {
    const err = new Error('Unable to process config file.');
    const getContents = jest.fn().mockReturnValueOnce(Promise.reject(err));
    github.repos.getContents = getContents;

    await expect(fetchRepoMountieConfig(context)).rejects.toThrow(err);
    expect(github.repos.getContents).toHaveBeenCalled();
  });

  test('A PR with less changes is accepted', () => {
    context.payload.pull_request.additions = 5;
    const myConfig = { ...repoMountieConfig };
    myConfig.pullRequest.maxLinesChanged = 10;

    expect(isValidPullRequestLength(context, myConfig)).toBeTruthy();
  });

  test('A PR with more changes is rejected', () => {
    context.payload.pull_request.additions = 10;
    const myConfig = { ...repoMountieConfig };
    myConfig.pullRequest.maxLinesChanged = 5;

    expect(isValidPullRequestLength(context, myConfig)).toBeFalsy();
  });

  test('A PR with the same number of changes is rejected', () => {
    context.payload.pull_request.additions = 10;
    const myConfig = { ...repoMountieConfig };
    myConfig.pullRequest.maxLinesChanged = 10;

    expect(isValidPullRequestLength(context, myConfig)).toBeTruthy();
  });

  test('A long PR should trigger a help comment to be added', async () => {
    context.payload.pull_request.additions = 1000;
    await app.receive({
      name: 'pull_request.opened',
      payload: issueOpenedEvent.payload,
    });

    expect(github.repos.getContents).toHaveBeenCalled();
    expect(github.issues.createComment).toHaveBeenCalled();
  });

  test('No commands are processed correctly', () => {
    expect(extractCommands(context.payload.pull_request.body).length).toBe(0);
  });

  test('A valid command is extracted', () => {
    context.payload.pull_request.body += '\n /bot-ignore-length';
    expect(extractCommands(context.payload.pull_request.body).length).toBe(1);
  });

  test('Invalid commands are ignored', () => {
    context.payload.pull_request.body += '\n /bot-ignore-length';
    context.payload.pull_request.body += '\n /rm-blarb';

    expect(extractCommands(context.payload.pull_request.body).length).toBe(1);
  });

  test('Empty commands should not be ignored', () => {
    const commands = [];
    expect(shouldIgnoredLengthCheck(commands)).toBeFalsy();
  });

  test('The ignore command should be recognized', () => {
    const commands = ['/bot-ignore-length'];
    expect(shouldIgnoredLengthCheck(commands)).toBeTruthy();
  });

  test('A PR with the ignore command should be ignored', async () => {
    issueOpenedEvent.payload.pull_request.body += '\n /bot-ignore-length';
    await app.receive({
      name: 'pull_request.opened',
      payload: issueOpenedEvent.payload,
    });

    expect(github.repos.getContents).toHaveBeenCalled();
    expect(github.issues.createComment).not.toHaveBeenCalled();
  });
});

// For more information about using TypeScript in your tests, Jest recommends:
// https://github.com/kulshekhar/ts-jest
