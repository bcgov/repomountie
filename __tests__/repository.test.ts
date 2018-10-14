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

jest.mock('fs');

const p0 = path.join(__dirname, 'fixtures/repo-created-lic.json');
const payloadWithLic = JSON.parse(fs.readFileSync(p0, 'utf8'));

const p1 = path.join(__dirname, 'fixtures/repo-created-no-lic.json');
const payloadNoLic = JSON.parse(fs.readFileSync(p1, 'utf8'));

const p2 = path.join(__dirname, 'fixtures/master.json');
const master = JSON.parse(fs.readFileSync(p2, 'utf8'));

const p3 = path.join(__dirname, 'fixtures/repo-archived-no-lic.json');
const archivedNoLic = JSON.parse(fs.readFileSync(p3, 'utf8'));

const p4 = path.join(__dirname, 'fixtures/issues-empty.json');
const prNoAddLicense = JSON.parse(fs.readFileSync(p4, 'utf8'));

const p5 = path.join(__dirname, 'fixtures/repo-archived-lic.json');
const archivedLic = JSON.parse(fs.readFileSync(p5, 'utf8'));

describe('Repository integration tests', () => {
  let app;
  let github;

  beforeEach(() => {
    app = new Application();
    app.app = () => 'Token';
    app.load(robot);
    const getReference = jest.fn();
    getReference.mockReturnValueOnce(master);
    getReference.mockReturnValueOnce(master);

    github = {
      gitdata: {
        createReference: jest.fn(),
        getReference,
      },
      issues: {
        addAssigneesToIssue: jest.fn(),
      },
      pullRequests: {
        create: jest.fn().mockReturnValueOnce(Promise.resolve()),
        getAll: jest.fn().mockReturnValueOnce(Promise.resolve(prNoAddLicense)),
      },
      repos: {
        createFile: jest.fn(),
      },
    };

    // Passes the mocked out GitHub API into out app instance
    app.auth = () => Promise.resolve(github);
  });

  test('A repository without a license should have one added', async () => {
    await app.receive({
      name: 'schedule.repository',
      payload: payloadNoLic,
    });

    expect(github.gitdata.getReference.mock.calls.length).toBe(2);
    expect(github.pullRequests.getAll).toHaveBeenCalled();
    expect(github.pullRequests.create).toHaveBeenCalled();
    expect(github.gitdata.createReference).toHaveBeenCalled();
    expect(github.repos.createFile).toHaveBeenCalled();
    expect(github.issues.addAssigneesToIssue).not.toHaveBeenCalled();
  });

  // Test error path execution when `getReference` first fails to
  // get the master branch.
  test('A repo with no master branch is skipped 1', async () => {
    const err = new Error('{"message": "Big Trouble 1"}');
    github.gitdata.getReference = jest.fn().mockReturnValueOnce(Promise.reject(err));

    await app.receive({
      name: 'schedule.repository',
      payload: payloadNoLic,
    });

    expect(github.gitdata.getReference).toBeCalled();
    expect(github.pullRequests.getAll).not.toHaveBeenCalled();
    expect(github.pullRequests.create).not.toHaveBeenCalled();
    expect(github.gitdata.createReference).not.toHaveBeenCalled();
    expect(github.repos.createFile).not.toHaveBeenCalled();
    expect(github.issues.addAssigneesToIssue).not.toHaveBeenCalled();
  });

  // Test error path execution when `getReference` fails to
  // get the master branch the second time it is called.
  test('A repo with no master branch is skipped 2', async () => {
    const err = new Error('{"message": "Big Trouble 2"}');
    const getReference = jest.fn();
    getReference.mockReturnValueOnce(master);
    getReference.mockReturnValueOnce(Promise.reject(err));
    github.gitdata.getReference = getReference;

    await app.receive({
      name: 'schedule.repository',
      payload: payloadNoLic,
    });

    expect(github.gitdata.getReference.mock.calls.length).toBe(2);
    expect(github.pullRequests.getAll).toHaveBeenCalled();
    expect(github.pullRequests.create).not.toHaveBeenCalled();
    expect(github.gitdata.createReference).not.toHaveBeenCalled();
    expect(github.repos.createFile).not.toHaveBeenCalled();
    expect(github.issues.addAssigneesToIssue).not.toHaveBeenCalled();
  });

  test('A repository with a license should be skipped', async () => {
    await app.receive({
      name: 'schedule.repository',
      payload: payloadWithLic,
    });

    expect(github.gitdata.getReference).not.toBeCalled();
    expect(github.pullRequests.getAll).not.toHaveBeenCalled();
    expect(github.pullRequests.create).not.toHaveBeenCalled();
    expect(github.gitdata.createReference).not.toHaveBeenCalled();
    expect(github.repos.createFile).not.toHaveBeenCalled();
    expect(github.issues.addAssigneesToIssue).not.toHaveBeenCalled();
  });

  test('An archived repository (no lic) should be skipped', async () => {
    await app.receive({
      name: 'schedule.repository',
      payload: archivedNoLic,
    });

    expect(github.gitdata.getReference).not.toBeCalled();
    expect(github.pullRequests.getAll).not.toHaveBeenCalled();
    expect(github.pullRequests.create).not.toHaveBeenCalled();
    expect(github.gitdata.createReference).not.toHaveBeenCalled();
    expect(github.repos.createFile).not.toHaveBeenCalled();
    expect(github.issues.addAssigneesToIssue).not.toHaveBeenCalled();
  });

  test('An archived repository (lic) should be skipped', async () => {
    await app.receive({
      name: 'schedule.repository',
      payload: archivedLic,
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
