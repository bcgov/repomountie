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
// Created by Jason Leach on 2018-10-13.
//

import fs from 'fs';
import path from 'path';
import { Application } from 'probot';
import robot from '../src';
import { fetchRepoMountieConfig, labelExists, loadTemplate } from '../src/libs/utils';

const p0 = path.join(__dirname, 'fixtures/issue-comment-created-unassigned.json');
const unassignedIssueCommentCreated = JSON.parse(fs.readFileSync(p0, 'utf8'));

const p1 = path.join(__dirname, 'fixtures/issue-comment-created-assigned.json');
const assignedIssueCommentCreated = JSON.parse(fs.readFileSync(p1, 'utf8'));

const p2 = path.join(__dirname, 'fixtures/issue-comment-created-notme.json');
const unassignedIssueNotMineCommentCreated = JSON.parse(fs.readFileSync(p2, 'utf8'));

const p3 = path.join(__dirname, 'fixtures/repo-created-lic.json');
const payloadWithLic = JSON.parse(fs.readFileSync(p3, 'utf8'));

const p4 = path.join(__dirname, 'fixtures/issues-and-pulls.json');
const issuesAndPulls = JSON.parse(fs.readFileSync(p4, 'utf8'));

const p5 = path.join(__dirname, 'fixtures/issues-and-pulls-empty.json');
const issuesAndPullsEmpty = JSON.parse(fs.readFileSync(p5, 'utf8'));

const p6 = path.join(__dirname, 'fixtures/rmconfig.json');
const config = JSON.parse(fs.readFileSync(p6, 'utf8'));

const p7 = path.join(__dirname, '../templates/stale_issue_comment.md');
const template = fs.readFileSync(p7, 'utf8');

jest.mock('../src/libs/utils', () => ({
  fetchRepoMountieConfig: jest.fn(),
  loadTemplate: jest.fn(),
  labelExists: jest.fn(),
}));

describe('Repository integration tests', () => {
  let app;
  let github;

  beforeEach(() => {
    app = new Application();
    app.app = () => 'Token';
    app.load(robot);

    github = {
      gitdata: {
        createRef: jest.fn(),
        getRef: jest.fn(),
      },
      issues: {
        addAssignees: jest.fn(),
        createComment: jest.fn(),
        addLabels: jest.fn(),
        update: jest.fn(),
      },
      search: {
        issuesAndPullRequests: jest.fn(),
      },
      pullRequests: {
        create: jest.fn(),
        getAll: jest.fn(),
        list: jest.fn(),
      },
      repos: {
        createFile: jest.fn(),
      },
    };

    // Passes the mocked out GitHub API into out app instance
    app.auth = () => Promise.resolve(github);

    // @ts-ignore
    fetchRepoMountieConfig.mockReturnValue(config)
    // @ts-ignore
    loadTemplate.mockReturnValue(template)
    // @ts-ignore
    labelExists.mockReturnValue(true)
  });

  test('An unassigned PR (issue) assigned', async () => {
    await app.receive({
      name: 'issue_comment.created',
      payload: unassignedIssueCommentCreated,
    });

    expect(github.gitdata.getRef).not.toBeCalled();
    expect(github.pullRequests.list).not.toHaveBeenCalled();
    expect(github.pullRequests.create).not.toHaveBeenCalled();
    expect(github.gitdata.createRef).not.toHaveBeenCalled();
    expect(github.repos.createFile).not.toHaveBeenCalled();
    expect(github.issues.addAssignees).toHaveBeenCalled();
  });

  test('An assigned PR (issue) is skipped', async () => {
    await app.receive({
      name: 'issue_comment.created',
      payload: assignedIssueCommentCreated,
    });

    expect(github.gitdata.getRef).not.toBeCalled();
    expect(github.pullRequests.list).not.toHaveBeenCalled();
    expect(github.pullRequests.create).not.toHaveBeenCalled();
    expect(github.gitdata.createRef).not.toHaveBeenCalled();
    expect(github.repos.createFile).not.toHaveBeenCalled();
    expect(github.issues.addAssignees).not.toHaveBeenCalled();
  });

  test('An issue not created by me is ignored', async () => {
    await app.receive({
      name: 'issue_comment.created',
      payload: unassignedIssueNotMineCommentCreated,
    });

    expect(github.gitdata.getRef).not.toBeCalled();
    expect(github.pullRequests.getAll).not.toHaveBeenCalled();
    expect(github.pullRequests.create).not.toHaveBeenCalled();
    expect(github.gitdata.createRef).not.toHaveBeenCalled();
    expect(github.repos.createFile).not.toHaveBeenCalled();
    expect(github.issues.addAssignees).not.toHaveBeenCalled();
  });

  test('Old issues are closed out', async () => {
    github.search.issuesAndPullRequests = jest.fn().mockReturnValueOnce(Promise.resolve(issuesAndPulls)),
      await app.receive({
        name: 'schedule.repository',
        payload: payloadWithLic,
      });

    expect(github.search.issuesAndPullRequests).toBeCalled();
    expect(github.issues.createComment).toBeCalled();
    expect(github.issues.addLabels).toBeCalled();
    expect(github.issues.update).toBeCalled();
  });


  test('Stale config stanza missing skips', async () => {
    const myConfig = Object.assign({}, config);
    delete myConfig.staleIssue;

    // @ts-ignore
    fetchRepoMountieConfig.mockReturnValue(myConfig)
    // @ts-ignore
    loadTemplate.mockReturnValue(template)
    // @ts-ignore
    labelExists.mockReturnValue(true)

    github.search.issuesAndPullRequests = jest.fn().mockReturnValueOnce(Promise.resolve(issuesAndPulls)),
      await app.receive({
        name: 'schedule.repository',
        payload: payloadWithLic,
      });

    expect(github.search.issuesAndPullRequests).not.toBeCalled();
    expect(github.issues.createComment).not.toBeCalled();
    expect(github.issues.addLabels).not.toBeCalled();
    expect(github.issues.update).not.toBeCalled();
  });

  test('No stale issues are handled properly', async () => {
    github.search.issuesAndPullRequests = jest.fn().mockReturnValueOnce(Promise.resolve(issuesAndPullsEmpty)),
      await app.receive({
        name: 'schedule.repository',
        payload: payloadWithLic,
      });

    expect(github.search.issuesAndPullRequests).toBeCalled();
    expect(github.issues.createComment).not.toBeCalled();
    expect(github.issues.addLabels).not.toBeCalled();
    expect(github.issues.update).not.toBeCalled();
  });

  test('Applying labels is skipped if non-existent', async () => {
    // @ts-ignore
    labelExists.mockReturnValue(false)
    const addLabelsArgs = { "issue_number": 2, "labels": [], "number": undefined, "owner": "bcgov", "repo": "blarb" };

    github.search.issuesAndPullRequests = jest.fn().mockReturnValueOnce(Promise.resolve(issuesAndPulls)),

      await app.receive({
        name: 'schedule.repository',
        payload: payloadWithLic,
      });
    expect(github.search.issuesAndPullRequests).toBeCalled();
    expect(github.issues.createComment).toBeCalled();
    expect(github.issues.addLabels).toBeCalledWith(addLabelsArgs);
    expect(github.issues.update).toBeCalled();
  });
});

// For more information about using TypeScript in your tests, Jest recommends:
// https://github.com/kulshekhar/ts-jest
