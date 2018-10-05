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

import { extractMessage, loadTemplate } from '../src/libs/utils';

jest.mock('fs');

describe('Utility functions', () => {
  test('A template can be loaded', async () => {
    const data = await loadTemplate('some-file-name');
    expect(data).not.toBeUndefined();
  });

  test('API error message extracted from Error message', async () => {
    const err = new Error('{"message": "Hello World"}');
    const message = await extractMessage(err);
    expect(message).toEqual('Hello World');
  });
});
