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

jest.mock('fs');

const p0 = path.join(__dirname, 'fixtures/issue-comment-created-unassigned.json');
const unassignedIssueCommentCreated = JSON.parse(fs.readFileSync(p0, 'utf8'));

const p1 = path.join(__dirname, 'fixtures/issue-comment-created-assigned.json');
const assignedIssueCommentCreated = JSON.parse(fs.readFileSync(p1, 'utf8'));

const p2 = path.join(__dirname, 'fixtures/issue-comment-created-notme.json');
const unassignedIssueNotMineCommentCreated = JSON.parse(fs.readFileSync(p2, 'utf8'));

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
      },
      pullRequests: {
        create: jest.fn(),
        list: jest.fn(),
      },
      repos: {
        createFile: jest.fn(),
      },
    };

    // Passes the mocked out GitHub API into out app instance
    app.auth = () => Promise.resolve(github);
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

    expect(github.gitdata.getReference).not.toBeCalled();
    expect(github.pullRequests.getAll).not.toHaveBeenCalled();
    expect(github.pullRequests.create).not.toHaveBeenCalled();
    expect(github.gitdata.createReference).not.toHaveBeenCalled();
    expect(github.repos.createFile).not.toHaveBeenCalled();
    expect(github.issues.addAssigneesToIssue).not.toHaveBeenCalled();
  });
});

// For more information about using TypeScript in your tests, Jest recommends:
// https://github.com/kulshekhar/ts-jest
