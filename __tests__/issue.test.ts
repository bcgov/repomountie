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
// Created by Jason Leach on 2018-10-13.
//

import fs from 'fs';
import path from 'path';
import { Context } from 'probot';
import { isOrgMember, labelExists, searchAndPullRequests } from '../src/libs/ghutils';
import { checkForStaleIssues, created } from '../src/libs/issue';
import { handleBotCommand } from '../src/libs/robo';
import { loadTemplate } from '../src/libs/utils';
import helper from './src/helper';

const p0 = path.join(__dirname, 'fixtures/issue_comment-event.json');
const unassignedIssueCommentCreatedEvent = JSON.parse(fs.readFileSync(p0, 'utf8'));

const p1 = path.join(__dirname, 'fixtures/rmconfig.json');
const config = JSON.parse(fs.readFileSync(p1, 'utf8'));

const p2 = path.join(__dirname, '../templates/stale_issue_comment.md');
const tempate = fs.readFileSync(p2, 'utf8');

const p3 = path.join(__dirname, 'fixtures/issues-and-pulls.json');
const issuesAndPulls = JSON.parse(fs.readFileSync(p3, 'utf8'));

const p4 = path.join(__dirname, 'fixtures/issues-empty.json');
const issuesAndPullsEmpty = JSON.parse(fs.readFileSync(p4, 'utf8'));

// jest.mock('../src/libs/issue', () => ({
//   created: jest.fn(),
//   checkForStaleIssues: jest.fn(),
// }));

jest.mock('../src/libs/ghutils', () => ({
  isOrgMember: jest.fn(),
  searchAndPullRequests: jest.fn(),
  labelExists: jest.fn(),
}));

jest.mock('../src/libs/utils', () => ({
  loadTemplate: jest.fn(),
}));

jest.mock('../src/libs/robo', () => ({
  handleBotCommand: jest.fn(),
}));

describe('Issues (and PRs)', () => {
  let context
  const { github } = helper;

  beforeEach(() => {
    context = undefined;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('Comments from non-members are ignored', async () => {
    context = new Context(unassignedIssueCommentCreatedEvent, github as any, {} as any);
    // @ts-ignore
    isOrgMember.mockReturnValueOnce(Promise.resolve(false));

    await created(context);

    expect(isOrgMember).toBeCalled();
    expect(handleBotCommand).not.toBeCalled();
  });

  it('Comments without commands are skipped', async () => {
    context = new Context(unassignedIssueCommentCreatedEvent, github as any, {} as any);
    context.payload.comment.body = 'I\'m a teapot';

    // @ts-ignore
    isOrgMember.mockReturnValueOnce(Promise.resolve(true));

    await created(context);

    expect(isOrgMember).toBeCalled();
    expect(handleBotCommand).not.toBeCalled();
  });

  it('Comments with commands are processed', async () => {
    context = new Context(unassignedIssueCommentCreatedEvent, github as any, {} as any);
    context.payload.comment.body = '@repo-mountie help\n';

    // @ts-ignore
    isOrgMember.mockReturnValueOnce(Promise.resolve(true));

    await created(context);

    expect(isOrgMember).toBeCalled();
    expect(handleBotCommand).toBeCalled();
  });

  // TODO:(jl) Should be moved to repo?

  it('Repos configured to ignore stale issues ignored', async () => {
    context = new Context(unassignedIssueCommentCreatedEvent, github as any, {} as any);

    const myConfig = JSON.parse(JSON.stringify(config));
    delete myConfig.staleIssue;

    await checkForStaleIssues(context, myConfig);

    expect(searchAndPullRequests).not.toBeCalled();
    expect(loadTemplate).not.toBeCalled();
    expect(labelExists).not.toBeCalled();

    expect(github.issues.createComment).not.toBeCalled();
    expect(github.issues.addLabels).not.toBeCalled();
    expect(github.issues.update).not.toBeCalled();
  });

  it('Repos without applicable stale label ok', async () => {
    context = new Context(unassignedIssueCommentCreatedEvent, github as any, {} as any);
    // @ts-ignore
    searchAndPullRequests.mockReturnValueOnce(Promise.resolve(issuesAndPulls));
    // @ts-ignore
    loadTemplate.mockReturnValueOnce(Promise.resolve(tempate));

    const myConfig = JSON.parse(JSON.stringify(config));
    delete myConfig.staleIssue.applyLabel;

    await checkForStaleIssues(context, myConfig);

    expect(searchAndPullRequests).toBeCalled();
    expect(loadTemplate).toBeCalled();
    expect(labelExists).not.toBeCalled();

    expect(github.issues.createComment).toBeCalled();
    expect(github.issues.addLabels).toBeCalled();
    expect(github.issues.update).toBeCalled();
  });

  it('Repos with stale issues are commented, labeled and closed', async () => {
    context = new Context(unassignedIssueCommentCreatedEvent, github as any, {} as any);
    // @ts-ignore
    searchAndPullRequests.mockReturnValueOnce(Promise.resolve(issuesAndPulls));
    // @ts-ignore
    loadTemplate.mockReturnValueOnce(Promise.resolve(tempate));

    await checkForStaleIssues(context, config);

    expect(searchAndPullRequests).toBeCalled();
    expect(loadTemplate).toBeCalled();
    expect(labelExists).toBeCalled();

    expect(github.issues.createComment).toBeCalled();
    expect(github.issues.addLabels).toBeCalled();
    expect(github.issues.update).toBeCalled();
  });

  it('Repos without stale issues ignored', async () => {
    context = new Context(unassignedIssueCommentCreatedEvent, github as any, {} as any);
    // @ts-ignore
    searchAndPullRequests.mockReturnValueOnce(Promise.resolve(issuesAndPullsEmpty));

    await checkForStaleIssues(context, config);

    expect(searchAndPullRequests).toBeCalled();
    expect(loadTemplate).not.toBeCalled();
    expect(labelExists).not.toBeCalled();

    expect(github.issues.createComment).not.toBeCalled();
    expect(github.issues.addLabels).not.toBeCalled();
    expect(github.issues.update).not.toBeCalled();
  });
});
