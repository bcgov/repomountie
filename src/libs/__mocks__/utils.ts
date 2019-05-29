//
// SecureImage
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
// Created by Jason Leach on 2018-02-14.
//

import fs from 'fs';
import path from 'path';
import { Context } from 'probot';
import { RepoMountieConfig } from '../utils';

const p0 = path.join(__dirname, '../../../__tests__/fixtures/rmconfig.json');
const config = JSON.parse(fs.readFileSync(p0, 'utf8'));

const p1 = path.join(__dirname, '../../../templates/stale_issue_comment.md');
const template = fs.readFileSync(p1, 'utf8');

export const fetchRepoMountieConfig = async (context: Context): Promise<RepoMountieConfig> => {
  return config;
};

export const loadTemplate = async (path: string): Promise<string> => {
  return template;
}

export const labelExists = async (context: Context, labelName: string): Promise<boolean> => {
  return true;
}