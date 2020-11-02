//
// Copyright © 2019, 2020 Province of British Columbia
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
// Created by Jason Leach on 2019-12-04.
//

import fs from 'fs';
import yaml from 'js-yaml';
import path from 'path';
import { Context } from 'probot';
import { ISSUE_TITLES } from '../src/constants';
import { assignUsersToIssue, fetchContentsForFile } from '../src/libs/ghutils';
import {
  applyComplianceCommands,
  handleBotCommand,
  handleComplianceCommands,
  helpDeskSupportRequired,
} from '../src/libs/robo';
import helper from './src/helper';

const p0 = path.join(__dirname, 'fixtures/issue_comment-event.json');
const issueCommentEvent = JSON.parse(fs.readFileSync(p0, 'utf8'));

const p1 = path.join(__dirname, 'fixtures/repo-get-content-compliance.json');
const content = JSON.parse(fs.readFileSync(p1, 'utf8'));

const p2 = path.join(__dirname, 'fixtures/compliance.yaml');
const doc = yaml.safeLoad(fs.readFileSync(p2, 'utf8'));

jest.mock('../src/libs/ghutils', () => ({
  assignUsersToIssue: jest.fn(),
  fetchContentsForFile: jest.fn(),
}));

Date.now = jest.fn();

describe('Bot command processing', () => {
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

  it('Missing compliance commands are ignored', async () => {
    const comment = 'hello, I am a teapot';
    const result = applyComplianceCommands(comment, doc);
    expect(result).toMatchSnapshot();
  });

  it('Invalid compliance commands are ignored', async () => {
    const comment = '/change-pia completed';
    const result = applyComplianceCommands(comment, doc);
    expect(result).toMatchSnapshot();
  });

  it('Valid compliance commands are processed', async () => {
    const comment = `@repo-mountie update-pia completed\n@repo-mountie update-stra completed`;
    const result = applyComplianceCommands(comment, doc);
    expect(result).toMatchSnapshot();
  });

  it('Help requests issues are processed', async () => {
    context = new Context(issueCommentEvent, github as any, {} as any);
    context.payload.comment.body = '@repo-mountie help\n';
    const result = helpDeskSupportRequired(context.payload);

    expect(result).toBeTruthy();
  });

  it('Non-help comments are ignored', async () => {
    context = new Context(issueCommentEvent, github as any, {} as any);
    context.payload.comment.body = 'I\'m a teapot';
    const result = helpDeskSupportRequired(context.payload);

    expect(result).toBeFalsy();
  });

  it('Missing file causes update to be skipped', async () => {
    context = new Context(issueCommentEvent, github as any, {} as any);
    context.payload.comment.body = `@repo-mountie update-pia completed`;
    // @ts-ignore
    fetchContentsForFile.mockReturnValueOnce(undefined);

    await handleComplianceCommands(context);

    expect(fetchContentsForFile).toBeCalled();
    expect(github.repos.createOrUpdateFile).not.toBeCalled();
  });

  it('Invalid command causes update to be skipped', async () => {
    context = new Context(issueCommentEvent, github as any, {} as any);
    context.payload.comment.body = `@repo-mountie update-blarb completed`;
    // @ts-ignore
    fetchContentsForFile.mockReturnValueOnce(content.data);

    await handleComplianceCommands(context);

    expect(fetchContentsForFile).not.toBeCalled();
    expect(github.repos.createOrUpdateFile).not.toBeCalled();
  });

  it('Compliance commands are processed appropriately', async () => {
    context = new Context(issueCommentEvent, github as any, {} as any);
    context.payload.comment.body = `@repo-mountie update-pia completed`;
    // @ts-ignore
    fetchContentsForFile.mockReturnValueOnce(content.data);

    await handleComplianceCommands(context);

    expect(fetchContentsForFile).toBeCalled();
    expect(github.repos.createOrUpdateFile).toBeCalled();
  });

  it('An error is handled correctly', async () => {
    context = new Context(issueCommentEvent, github as any, {} as any);
    context.payload.comment.body = `@repo-mountie help`;
    context.payload.issue.title = ISSUE_TITLES.ADD_COMPLIANCE;
    context.payload.sender.type = 'User';

    // @ts-ignore
    assignUsersToIssue.mockImplementationOnce(() => {
      throw new Error();
    });

    await expect(handleBotCommand(context)).rejects.toThrow();
  });

  it('An unknown PR is disregarded', async () => {
    context = new Context(issueCommentEvent, github as any, {} as any);
    context.payload.comment.body = 'I fixed up the code real good.';
    context.payload.issue.title = 'Fix a bug';
    // @ts-ignore
    handleComplianceCommands = jest.fn();

    await handleBotCommand(context);

    expect(handleComplianceCommands).not.toBeCalled();
  });

  it('A request for help is processed correctly', async () => {
    context = new Context(issueCommentEvent, github as any, {} as any);
    context.payload.comment.body = '/help';
    context.payload.issue.title = ISSUE_TITLES.ADD_COMPLIANCE;
    // @ts-ignore
    assignUsersToIssue.mockReturnValueOnce();

    await expect(handleBotCommand(context)).resolves.toBeUndefined();
  });

  it('A ', async () => {
    context = new Context(issueCommentEvent, github as any, {} as any);
    context.payload.issue.title = ISSUE_TITLES.ADD_COMPLIANCE;
    // @ts-ignore

    await handleBotCommand(context);

    expect(handleComplianceCommands).toBeCalled();
  });
});
