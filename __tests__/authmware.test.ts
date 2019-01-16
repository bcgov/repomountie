//
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
// Created by Jason Leach on 2018-11-05.
//

/* eslint-env es6 */

'use strict';

import fs from 'fs';
import path from 'path';
import { isAuthorized } from '../src/libs/authmware';

const path2 = path.join(__dirname, 'fixtures/jwt-decoded-sa-20181107.json');
const saOk = JSON.parse(fs.readFileSync(path2, 'utf8'));

const path3 = path.join(__dirname, 'fixtures/jwt-decoded-sa-badid-20181107.json');
const saBadId = JSON.parse(fs.readFileSync(path3, 'utf8'));

describe('Authentication tests', () => {
  test('A service account JWT with valid ID is accepted', () => {
    expect(isAuthorized(saOk)).toBeTruthy();
  });

  test('A service account JWT with an invalid ID is rejected', () => {
    expect(isAuthorized(saBadId)).toBeFalsy();
  });
});
