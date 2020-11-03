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
import { COMMANDS, ISSUE_TITLES } from '../src/constants';
import { assignUsersToIssue, fetchCollaborators } from '../src/libs/ghutils';
import {
  addCollaboratorsToMyIssues,
  extractCommands,
  isValidPullRequestLength,
  requestUpdateForMyIssues,
  shouldIgnoredLengthCheck,
  validatePullRequestIfRequired,
} from '../src/libs/pullrequest';
import { loadTemplate } from '../src/libs/utils';
import helper from './src/helper';

const p0 = path.join(__dirname, 'fixtures/pull_request-opened-event.json');
const issueOpenedEvent = JSON.parse(fs.readFileSync(p0, 'utf8'));

const p2 = path.join(
  __dirname,
  'fixtures/repo-get-collaborators-response.json'
);
const collabs = JSON.parse(fs.readFileSync(p2, 'utf8'));

const p3 = path.join(__dirname, 'fixtures/rmconfig.json');
const config = JSON.parse(fs.readFileSync(p3, 'utf8'));

const p4 = path.join(__dirname, 'fixtures/issues-and-pulls.json');
const issuesAndPulls = JSON.parse(fs.readFileSync(p4, 'utf8'));

const p5 = path.join(__dirname, 'fixtures/issues-empty.json');
const issuesAndPullsEmpty = JSON.parse(fs.readFileSync(p5, 'utf8'));

jest.mock('../src/libs/ghutils', () => ({
  fetchPullRequests: jest.fn(),
  fetchCollaborators: jest.fn(),
  assignUsersToIssue: jest.fn(),
}));

jest.mock('../src/libs/utils', () => ({
  loadTemplate: jest.fn(),
}));

Date.now = jest.fn();

describe('Pull requests', () => {
  let context;
  const { github } = helper;

  beforeEach(() => {
    context = undefined;
    // @ts-ignore
    Date.now.mockReturnValue(1576090712480);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.resetAllMocks();
  });

  it('Pull requests are assigned appropriately', async () => {
    context = new Context(issueOpenedEvent, github as any, {} as any);
    const owner = 'bcgov';
    const repo = 'hello5';

    // @ts-ignore
    github.search.issuesAndPullRequests.mockReturnValueOnce(
      Promise.resolve(issuesAndPulls)
    );
    // @ts-ignore
    fetchCollaborators.mockReturnValueOnce(Promise.resolve(collabs.data));

    await addCollaboratorsToMyIssues(context, owner, repo);

    expect(github.search.issuesAndPullRequests).toBeCalled();
    expect(fetchCollaborators).toBeCalled();
    expect(assignUsersToIssue).toBeCalled();
  });

  it('Repos without pull requests are ignored', async () => {
    context = new Context(issueOpenedEvent, github as any, {} as any);
    const owner = 'bcgov';
    const repo = 'hello5';

    // @ts-ignore
    github.search.issuesAndPullRequests.mockReturnValueOnce(
      Promise.resolve(issuesAndPullsEmpty)
    );

    await addCollaboratorsToMyIssues(context, owner, repo);

    expect(github.search.issuesAndPullRequests).toBeCalled();
    expect(fetchCollaborators).not.toBeCalled();
    expect(assignUsersToIssue).not.toBeCalled();
  });

  it('Repos without collaborators do not have PRs assigned', async () => {
    context = new Context(issueOpenedEvent, github as any, {} as any);
    const owner = 'bcgov';
    const repo = 'hello5';

    // @ts-ignore
    github.search.issuesAndPullRequests.mockReturnValueOnce(
      Promise.resolve(issuesAndPulls)
    );
    // @ts-ignore
    fetchCollaborators.mockReturnValueOnce(Promise.resolve([]));

    await addCollaboratorsToMyIssues(context, owner, repo);

    expect(github.search.issuesAndPullRequests).toBeCalled();
    expect(fetchCollaborators).toBeCalled();
    expect(assignUsersToIssue).not.toBeCalled();
  });

  it('Pull request ignore len command present', async () => {
    context = new Context(issueOpenedEvent, github as any, {} as any);
    const commands = [COMMANDS.IGNORE];

    const rv = await shouldIgnoredLengthCheck(commands);

    expect(rv).toBeTruthy();
  });

  it('Pull request ignore len command not present', async () => {
    context = new Context(issueOpenedEvent, github as any, {} as any);
    const commands = ['/bla'];

    const rv = await shouldIgnoredLengthCheck(commands);

    expect(rv).toBeFalsy();
  });

  it('No commands are processed correctly', () => {
    const body = 'I\'m a teapot';
    expect(extractCommands(body).length).toBe(0);
  });

  it('A valid command is extracted', () => {
    const body = 'I\'m a teapot\n /bot-ignore-length';

    expect(extractCommands(body).length).toBe(1);
  });

  it('Invalid commands are ignored', () => {
    let body = 'I\'m a teapot';
    body += '\n /bot-ignore-length';
    body += '\n /rm-blarb';

    expect(extractCommands(body).length).toBe(1);
  });

  // it('Empty commands should not be ignored', () => {
  //   const commands = [];
  //   expect(shouldIgnoredLengthCheck(commands)).toBeFalsy();
  // });

  it('A PR with less changes is accepted', () => {
    const myConfig = JSON.parse(JSON.stringify(config));
    context = new Context(issueOpenedEvent, github as any, {} as any);
    context.payload.pull_request.additions = 10;

    myConfig.pullRequest.maxLinesChanged = 10;

    expect(isValidPullRequestLength(context, myConfig)).toBeTruthy();
  });

  it('A PR with more changes is rejected', () => {
    const myConfig = JSON.parse(JSON.stringify(config));
    context = new Context(issueOpenedEvent, github as any, {} as any);
    context.payload.pull_request.additions = 10;

    myConfig.pullRequest.maxLinesChanged = 5;

    expect(isValidPullRequestLength(context, myConfig)).toBeFalsy();
  });

  it('A PR with the same number of changes is accepted', () => {
    const myConfig = JSON.parse(JSON.stringify(config));
    context = new Context(issueOpenedEvent, github as any, {} as any);
    context.payload.pull_request.additions = 10;

    myConfig.pullRequest.maxLinesChanged = 10;

    expect(isValidPullRequestLength(context, myConfig)).toBeTruthy();
  });

  it('A PR with less number of changes is accepted', () => {
    const myConfig = JSON.parse(JSON.stringify(config));
    context = new Context(issueOpenedEvent, github as any, {} as any);
    context.payload.pull_request.additions = 5;

    myConfig.pullRequest.maxLinesChanged = 10;

    expect(isValidPullRequestLength(context, myConfig)).toBeTruthy();
  });

  it('A valid PR length is not commented on', async () => {
    context = new Context(issueOpenedEvent, github as any, {} as any);
    const myConfig = JSON.parse(JSON.stringify(config));
    myConfig.pullRequest.maxLinesChanged = 100;

    await validatePullRequestIfRequired(context, myConfig);

    expect(loadTemplate).not.toBeCalled();
    expect(github.issues.createComment).not.toBeCalled();
  });

  it('A invalid PR length is not commented on', async () => {
    // @ts-ignore
    loadTemplate.mockReturnValueOnce('bla1');

    context = new Context(issueOpenedEvent, github as any, {} as any);
    context.payload.pull_request.body += '\nHello\nWorld';

    const myConfig = JSON.parse(JSON.stringify(config));
    myConfig.pullRequest.maxLinesChanged = 2;

    await validatePullRequestIfRequired(context, myConfig);

    expect(loadTemplate).toBeCalled();
    expect(github.issues.createComment).toBeCalled();
  });

  it('Repos without any stale bot PRs are skipped', async () => {
    context = new Context(issueOpenedEvent, github as any, {} as any);
    const owner = 'bcgov';
    const repo = 'hello5';

    // @ts-ignore
    github.search.issuesAndPullRequests.mockReturnValueOnce(
      Promise.resolve(issuesAndPullsEmpty)
    );

    await requestUpdateForMyIssues(context, owner, repo);

    expect(loadTemplate).not.toBeCalled();
    expect(github.issues.createComment).not.toBeCalled();
  });

  it('Repos with stale bot PRs are processed', async () => {
    context = new Context(issueOpenedEvent, github as any, {} as any);
    const owner = 'bcgov';
    const repo = 'hello6';

    const response = JSON.parse(JSON.stringify(issuesAndPulls));
    response.data.items[0].title = ISSUE_TITLES.ADD_COMPLIANCE;

    // @ts-ignore
    github.search.issuesAndPullRequests.mockReturnValueOnce(
      Promise.resolve(response)
    );
    // @ts-ignore
    loadTemplate.mockReturnValueOnce('Foo [DAYS_OLD] bar');

    await requestUpdateForMyIssues(context, owner, repo);

    const call = github.issues.createComment.mock.calls;

    expect(loadTemplate).toBeCalled();
    expect(github.issues.createComment).toBeCalled();
    expect(call).toMatchSnapshot();
  });
});
