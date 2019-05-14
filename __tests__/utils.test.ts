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
// Created by Jason Leach on 2018-10-04.
//

import fs from 'fs';
import path from 'path';
import { Application, Context } from 'probot';
import robot from '../src';
import { extractMessage, labelExists, loadTemplate } from '../src/libs/utils';

jest.mock('fs');

const p0 = path.join(__dirname, 'fixtures/schedule-lic.json');
const repoScheduledEvent = JSON.parse(fs.readFileSync(p0, 'utf8'));

describe('Utility functions', () => {
  let app;
  let github;
  let context;

  beforeEach(() => {
    app = new Application();
    app.app = () => 'Token';
    app.load(robot);

    // allRepoLables = labels;

    github = {
      issues: {
        listLabelsForRepo: jest.fn(),
      },
    };

    // Passes the mocked out GitHub API into out app instance
    app.auth = () => Promise.resolve(github);

    context = new Context(repoScheduledEvent, github as any, {} as any);
  });

  test('A template can be loaded', async () => {
    const data = await loadTemplate('some-file');
    expect(data).not.toBeUndefined();
  });

  test('A file with no read access throws', async () => {
    await expect(loadTemplate('no-file-access')).rejects.toThrow(Error);
  });

  test('A non-existent template throws', async () => {
    await expect(loadTemplate('no-file')).rejects.toThrow(Error);
  });

  test('API error message extracted from Error message', async () => {
    const err = new Error('{"message": "Hello World"}');
    const message = await extractMessage(err);
    expect(message).toEqual('Hello World');
  });

  test('Non existent error message throws', async () => {
    const err = new Error();
    await expect(extractMessage(err)).rejects.toThrow(Error);
  });

  test('Labels should be fetched for lookup', async () => {
    await labelExists(context, 'blarb');
    expect(github.issues.listLabelsForRepo).toHaveBeenCalled();
  });
});
