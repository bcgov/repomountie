//
// Copyright © 2020 Province of British Columbia
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
// Created by Jason Leach on 2020-04-08.
//

import fs from 'fs';
import path from 'path';
import { Context } from 'probot';
import { fetchComplianceFile } from '../src/libs/ghutils';
import { fetchComplianceMetrics } from '../src/libs/reporting';
import { extractComplianceStatus } from '../src/libs/utils';
import helper from './src/helper';

const p3 = path.join(__dirname, 'fixtures/repo-schedule-event.json');
const repoScheduledEvent = JSON.parse(fs.readFileSync(p3, 'utf8'));

jest.mock('../src/libs/ghutils', () => ({
    fetchComplianceFile: jest.fn(),
}));

jest.mock('../src/libs/utils', () => ({
    extractComplianceStatus: jest.fn(),
}));

describe('Reporting', () => {
    let context
    const { github } = helper;

    beforeEach(() => {
        context = undefined;
    });

    afterEach(() => {
        jest.clearAllMocks();
        jest.resetAllMocks();
    });

    it('Compliance metrics should be stored', async () => {
        context = new Context(repoScheduledEvent, github as any, {} as any);

        const save = jest.fn();
        // @ts-ignore
        extractComplianceStatus.mockImplementation(() =>
            ({ save })
        );

        await fetchComplianceMetrics(context);

        expect(fetchComplianceFile).toBeCalled();
        expect(extractComplianceStatus).toBeCalled();
        expect(save).toBeCalled();
    });
});
