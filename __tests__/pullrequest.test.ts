//
// Copyright © 2018, 2020 Province of British Columbia
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
import { Context } from 'probot';
import { fetchConfigFile } from '../src/libs/ghutils';
import { extractCommands, isValidPullRequestLength, shouldIgnoredLengthCheck } from '../src/libs/pullrequest';
import helper from './src/helper';

const p0 = path.join(__dirname, 'fixtures/pull_request-opened-event.json');
const issueOpenedEvent = JSON.parse(fs.readFileSync(p0, 'utf8'));

const p1 = path.join(__dirname, 'fixtures/repo-get-content-config.json');
const repoFileContent = JSON.parse(fs.readFileSync(p1, 'utf8'));

const p2 = path.join(__dirname, 'fixtures/rmconfig.json');
const repoMountieConfig = JSON.parse(fs.readFileSync(p2, 'utf8'));

describe('Repository integration tests', () => {
  let context;
  const { app, github } = helper;

  beforeEach(() => {
    context = new Context(issueOpenedEvent, github as any, {} as any);
    context.payload.organization = {
      login: 'bcgov',
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('A config file should be fetched from the repo', async () => {
    github.repos.getContents = jest.fn().mockReturnValueOnce(Promise.resolve(repoFileContent));

    const response = await fetchConfigFile(context);

    expect(response).not.toBe(repoMountieConfig);
    expect(github.repos.getContents).toHaveBeenCalled();
  });

  it('A repo with no config should be handled gracefully', async () => {
    github.repos.getContents = jest.fn().mockReturnValueOnce(Promise.resolve(repoFileContent));

    const err = new Error('Unable to process config file.');
    const getContents = jest.fn().mockReturnValueOnce(Promise.reject(err));
    github.repos.getContents = getContents;

    await expect(fetchConfigFile(context)).rejects.toThrow();
    expect(github.repos.getContents).toHaveBeenCalled();
  });

  it('A PR with less changes is accepted', () => {
    context.payload.pull_request.additions = 5;
    const myConfig = { ...repoMountieConfig };
    myConfig.pullRequest.maxLinesChanged = 10;

    expect(isValidPullRequestLength(context, myConfig)).toBeTruthy();
  });

  it('A PR with more changes is rejected', () => {
    context.payload.pull_request.additions = 10;
    const myConfig = { ...repoMountieConfig };
    myConfig.pullRequest.maxLinesChanged = 5;

    expect(isValidPullRequestLength(context, myConfig)).toBeFalsy();
  });

  it('A PR with the same number of changes is rejected', () => {
    context.payload.pull_request.additions = 10;
    const myConfig = { ...repoMountieConfig };
    myConfig.pullRequest.maxLinesChanged = 10;

    expect(isValidPullRequestLength(context, myConfig)).toBeTruthy();
  });

  it('A long PR should trigger a help comment to be added', async () => {
    github.repos.getContents = jest.fn().mockReturnValueOnce(Promise.resolve(repoFileContent));

    context.payload.pull_request.additions = 1000;
    await app.receive({
      name: 'pull_request.opened',
      payload: issueOpenedEvent.payload,
    });

    expect(github.repos.getContents).toHaveBeenCalled();
    expect(github.issues.createComment).toHaveBeenCalled();
  });

  it('No commands are processed correctly', () => {
    expect(extractCommands(context.payload.pull_request.body).length).toBe(0);
  });

  it('A valid command is extracted', () => {
    context.payload.pull_request.body += '\n /bot-ignore-length';
    expect(extractCommands(context.payload.pull_request.body).length).toBe(1);
  });

  it('Invalid commands are ignored', () => {
    context.payload.pull_request.body += '\n /bot-ignore-length';
    context.payload.pull_request.body += '\n /rm-blarb';

    expect(extractCommands(context.payload.pull_request.body).length).toBe(1);
  });

  it('Empty commands should not be ignored', () => {
    const commands = [];
    expect(shouldIgnoredLengthCheck(commands)).toBeFalsy();
  });

  it('The ignore command should be recognized', () => {
    const commands = ['/bot-ignore-length'];
    expect(shouldIgnoredLengthCheck(commands)).toBeTruthy();
  });

  it('A PR with the ignore command should be ignored', async () => {
    github.repos.getContents = jest.fn().mockReturnValueOnce(Promise.resolve(repoFileContent));
    issueOpenedEvent.payload.pull_request.body += '\n /bot-ignore-length';

    await app.receive({
      name: 'pull_request.opened',
      payload: issueOpenedEvent.payload,
    });

    expect(github.repos.getContents).toHaveBeenCalled();
    expect(github.issues.createComment).not.toHaveBeenCalled();
  });
});
