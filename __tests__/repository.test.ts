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

// const p3 = path.join(__dirname, 'fixtures/fix-add-license.json');
// const fixAddLicense = JSON.parse(fs.readFileSync(p3, 'utf8'));

const p4 = path.join(__dirname, 'fixtures/issues-empty.json');
const prNoAddLicense = JSON.parse(fs.readFileSync(p4, 'utf8'));

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
    // Simulates delivery of an issues.opened webhook
    await app.receive({
      name: 'schedule.repository',
      payload: payloadNoLic,
    });

    expect(github.gitdata.getReference.mock.calls.length).toBe(2);
    expect(github.pullRequests.getAll).toHaveBeenCalled();
    expect(github.pullRequests.create).toHaveBeenCalled();
    expect(github.gitdata.createReference).toHaveBeenCalled();
    expect(github.repos.createFile).toHaveBeenCalled();
  });

  test('A repository with a license should not have one added', async () => {
    // Simulates delivery of an issues.opened webhook

    // github.gitdata.getReference = jest.fn().mockReturnValueOnce(new Error());
    await app.receive({
      name: 'schedule.repository',
      payload: payloadWithLic,
    });

    expect(github.gitdata.getReference).not.toBeCalled();
    expect(github.pullRequests.getAll).not.toHaveBeenCalled();
    expect(github.pullRequests.create).not.toHaveBeenCalled();
    expect(github.gitdata.createReference).not.toHaveBeenCalled();
    expect(github.repos.createFile).not.toHaveBeenCalled();
  });

  test('A repository with a license should be skipped', async () => {
    // Simulates delivery of an issues.opened webhook
    await app.receive({
      name: 'schedule.repository',
      payload: payloadWithLic,
    });

    expect(github.gitdata.getReference.mock.calls.length).toBe(0);
    expect(github.pullRequests.getAll).not.toHaveBeenCalled();
    expect(github.gitdata.createReference).not.toHaveBeenCalled();
    expect(github.repos.createFile).not.toHaveBeenCalled();
  });
});

// For more information about using TypeScript in your tests, Jest recommends:
// https://github.com/kulshekhar/ts-jest
