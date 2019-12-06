//
// Repo Mountie
//
// Copyright © 2019 Province of British Columbia
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
import path from 'path';
import { GITHUB_ID } from '../src/constants';
import { handleComplianceCommands, helpDeskSupportRequired } from '../src/libs/robo';

const p0 = path.join(__dirname, 'fixtures/issue_comment-event.json');
const context = JSON.parse(fs.readFileSync(p0, 'utf8'));

describe('Bot command processing', () => {

    beforeEach(() => {
        context.payload.issue.user.login = `${GITHUB_ID}[bot]`;
        context.payload.comment.body = 'I\'m a teapot';
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    // TODO:(jl) test handleBotCommand

    it('Help requests issues are processed', async () => {
        context.payload.comment.body = 'help';
        const result = helpDeskSupportRequired(context.payload);

        expect(result).toBeTruthy();
    });

    it('Non-help comments are ignored', async () => {
        const result = helpDeskSupportRequired(context.payload);

        expect(result).toBeFalsy();
    });

    it('Blarb', async () => {
        handleComplianceCommands('body');
    });
});
