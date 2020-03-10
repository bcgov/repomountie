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
// Created by Jason Leach on 2018-10-04.
//

import fs from 'fs';
import yaml from 'js-yaml';
import path from 'path';
import { extractComplianceStatus, extractMessage, loadTemplate } from '../src/libs/utils';

const p1 = path.join(__dirname, 'fixtures/repo-get-content-compliance.json');
const complianceResponse = JSON.parse(fs.readFileSync(p1, 'utf8'));

jest.mock('fs');

describe('Utility functions', () => {

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('A template can be loaded', async () => {
    const data = await loadTemplate('some-file');
    expect(data).not.toBeUndefined();
  });

  it('A file with no read access throws', async () => {
    await expect(loadTemplate('no-file-access')).rejects.toThrow(Error);
  });

  it('A non-existent template throws', async () => {
    await expect(loadTemplate('no-file')).rejects.toThrow(Error);
  });

  it('API error message extracted from Error message', async () => {
    const err = new Error('{"message": "Hello World"}');
    const message = await extractMessage(err);
    expect(message).toEqual('Hello World');
  });

  it('The compliance status should be extracted', async () => {
    const data = Buffer.from(complianceResponse.data.content, 'base64').toString();
    const doc = yaml.safeLoad(data);
    const mobj = extractComplianceStatus('blarb', 'blarb', doc);

    expect(mobj._id).not.toBeUndefined();
    // @ts-ignore
    expect(mobj.records).not.toBeUndefined();
  });
});
