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
// Created by Jason Leach on 2018-10-02.
//

import fs from 'fs';
import yaml from 'js-yaml';
import path from 'path';
import { Context } from 'probot';
import {
  addFileViaPullRequest,
  checkIfRefExists,
  fetchFileContent,
  hasPullRequestWithTitle,
} from '../src/libs/ghutils';
import {
  addLicenseIfRequired,
  addMinistryTopicIfRequired,
  addSecurityComplianceInfoIfRequired,
  addWordsMatterIfRequire,
  doesContentHaveLifecycleBadge,
  fixDeprecatedComplianceStatus,
  requestLifecycleBadgeIfRequired,
} from '../src/libs/repository';
import { loadTemplate } from '../src/libs/utils';
import helper from './src/helper';

// const p0 = path.join(__dirname, 'fixtures/context-no-lic.json');
// const context = JSON.parse(fs.readFileSync(p0, 'utf8'));

const p1 = path.join(__dirname, 'fixtures/repo-get-content-compliance.json');
const complianceResponse = JSON.parse(fs.readFileSync(p1, 'utf8'));

const p2 = path.join(__dirname, 'fixtures/compliance.yaml');
const doc = yaml.safeLoad(fs.readFileSync(p2, 'utf8'));

const p4 = path.join(__dirname, 'fixtures/issues-and-pulls.json');
const issuesAndPulls = JSON.parse(fs.readFileSync(p4, 'utf8'));

const p5 = path.join(__dirname, 'fixtures/repo-schedule-event.json');
const repoScheduleEvent = JSON.parse(fs.readFileSync(p5, 'utf8'));

const p6 = path.join(__dirname, 'fixtures/repo-get-topics.json');
const repoGetTopics = JSON.parse(fs.readFileSync(p6, 'utf8'));

const p7 = path.join(__dirname, 'fixtures/repo-created-event.json');
const repoCreated = JSON.parse(fs.readFileSync(p7, 'utf8'));

const p8 = path.join(__dirname, 'fixtures/issues-and-pulls-empty.json');
const issuesAndPullsEmpty = JSON.parse(fs.readFileSync(p8, 'utf8'));

const p9 = path.join(__dirname, 'fixtures/repo-get-content-readme.json');
const readmeResponse = JSON.parse(fs.readFileSync(p9, 'utf8'));

jest.mock('../src/libs/ghutils', () => ({
  addFileViaPullRequest: jest.fn(),
  checkIfRefExists: jest.fn().mockReturnValueOnce(Promise.resolve(true)),
  extractMessage: jest.fn().mockReturnValue('Hello Message'),
  hasPullRequestWithTitle: jest
    .fn()
    .mockReturnValueOnce(Promise.resolve(false)),
  loadTemplate: jest.fn().mockReturnValue('Hello'),
  fetchFileContent: jest.fn(),
  checkIfFileExists: jest.fn(),
}));

jest.mock('../src/libs/utils', () => ({
  loadTemplate: jest.fn(),
  extractMessage: jest.fn(),
}));

describe('Repository management', () => {
  let context;
  const { github } = helper;

  beforeEach(() => {
    context = undefined;
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.resetAllMocks();
  });

  it('Adding a license should resolve', async () => {
    context = new Context(repoScheduleEvent, github as any, {} as any);
    const owner = context.payload.repository.owner.login;
    const repo = context.payload.repository.name;

    // @ts-ignore
    addFileViaPullRequest.mockImplementation(() => Promise.resolve());
    await expect(addLicenseIfRequired(context, owner, repo)).resolves.toBe(
      undefined
    );
  });

  it('Adding a license should fail because ref missing', async () => {
    context = new Context(repoScheduleEvent, github as any, {} as any);
    const owner = context.payload.repository.owner.login;
    const repo = context.payload.repository.name;

    // @ts-ignore
    checkIfRefExists.mockReturnValueOnce(false);
    await expect(addLicenseIfRequired(context, owner, repo)).resolves.toBe(
      undefined
    );
  });

  it('Adding a license should fail because pr exists', async () => {
    context = new Context(repoScheduleEvent, github as any, {} as any);
    const owner = context.payload.repository.owner.login;
    const repo = context.payload.repository.name;

    // @ts-ignore
    checkIfRefExists.mockReturnValueOnce(true);
    // @ts-ignore
    hasPullRequestWithTitle.mockReturnValueOnce(true);
    await expect(addLicenseIfRequired(context, owner, repo)).resolves.toBe(
      undefined
    );
  });

  it('Adding a license should fail because add file failed', async () => {
    const aRepoScheduleEvent = JSON.parse(JSON.stringify(repoScheduleEvent));
    aRepoScheduleEvent.payload.repository.license = null;

    context = new Context(aRepoScheduleEvent, github as any, {} as any);
    const owner = context.payload.repository.owner.login;
    const repo = context.payload.repository.name;

    // @ts-ignore
    checkIfRefExists.mockReturnValueOnce(true);
    // @ts-ignore
    hasPullRequestWithTitle.mockReturnValueOnce(false);
    // @ts-ignore
    addFileViaPullRequest.mockImplementation(() => {
      throw new Error();
    });

    await expect(addLicenseIfRequired(context, owner, repo)).rejects.toThrow();
  });

  it('Adding a compliance file should resolve', async () => {
    context = new Context(repoScheduleEvent, github as any, {} as any);
    const owner = context.payload.installation.account.login;
    const repo = context.payload.repository.name;

    await expect(
      addSecurityComplianceInfoIfRequired(context, owner, repo)
    ).resolves.toBe(undefined);
  });

  it('Adding a compliance file should fail because ref missing', async () => {
    context = new Context(repoScheduleEvent, github as any, {} as any);
    const owner = context.payload.installation.account.login;
    const repo = context.payload.repository.name;

    // @ts-ignore
    checkIfRefExists.mockReturnValueOnce(false);

    await expect(
      addSecurityComplianceInfoIfRequired(context, owner, repo)
    ).resolves.toBe(undefined);
  });

  it('Adding a compliance file should fail because pr exists', async () => {
    context = new Context(repoScheduleEvent, github as any, {} as any);
    const owner = context.payload.installation.account.login;
    const repo = context.payload.repository.name;

    // @ts-ignore
    checkIfRefExists.mockReturnValueOnce(true);
    // @ts-ignore
    hasPullRequestWithTitle.mockReturnValueOnce(true);

    await expect(
      addSecurityComplianceInfoIfRequired(context, owner, repo)
    ).resolves.toBe(undefined);
  });

  it('Adding a compliance file should fail because add file failed', async () => {
    context = new Context(repoScheduleEvent, github as any, {} as any);
    const owner = context.payload.installation.account.login;
    const repo = context.payload.repository.name;

    // @ts-ignore
    checkIfRefExists.mockReturnValueOnce(true);
    // @ts-ignore
    hasPullRequestWithTitle.mockReturnValueOnce(false);
    // @ts-ignore
    addFileViaPullRequest.mockImplementation(() => {
      throw new Error();
    });
    // @ts-ignore
    loadTemplate.mockReturnValue('bla [TODAY] bla');

    await expect(
      addSecurityComplianceInfoIfRequired(context, owner, repo)
    ).rejects.toThrow();
  });

  it('Updating a compliance file should succeed', async () => {
    context = new Context(repoScheduleEvent, github as any, {} as any);
    const owner = 'bcgov';
    const repo = 'hello5';

    doc.spec.forEach((s) => {
      s.status = 'exempt';
    });

    const myComplianceResponse = JSON.parse(JSON.stringify(complianceResponse));
    const content = Buffer.from(yaml.safeDump(doc)).toString('base64');

    myComplianceResponse.data.content = content;

    // @ts-ignore
    checkIfRefExists.mockReturnValueOnce(true).mockReturnValueOnce(false);
    // @ts-ignore
    fetchFileContent.mockReturnValueOnce(myComplianceResponse.data);
    // @ts-ignore
    loadTemplate.mockReturnValueOnce('bla [TODAY] bla');

    await fixDeprecatedComplianceStatus(context, owner, repo);

    expect(checkIfRefExists).toBeCalledTimes(2);
    expect(fetchFileContent).toBeCalled();
    expect(loadTemplate).toBeCalled();
    expect(addFileViaPullRequest).toBeCalled();
  });

  it('Valid compliance status should not be updated', async () => {
    context = new Context(repoScheduleEvent, github as any, {} as any);
    const owner = 'bcgov';
    const repo = 'hello5';

    const aDoc = yaml.safeLoad(yaml.safeDump(doc));
    aDoc.spec.forEach((s) => {
      s.status = 'completed';
    });

    const myComplianceResponse = JSON.parse(JSON.stringify(complianceResponse));
    const content = Buffer.from(yaml.safeDump(aDoc)).toString('base64');

    myComplianceResponse.data.content = content;

    // @ts-ignore
    checkIfRefExists.mockReturnValueOnce(true).mockReturnValueOnce(false);
    // @ts-ignore
    fetchFileContent.mockReturnValueOnce(myComplianceResponse.data);
    // @ts-ignore
    loadTemplate.mockReturnValueOnce('bla [TODAY] bla');

    await fixDeprecatedComplianceStatus(context, owner, repo);

    expect(checkIfRefExists).toBeCalledTimes(2);
    expect(fetchFileContent).toBeCalled();
    expect(loadTemplate).not.toBeCalled();
    expect(addFileViaPullRequest).not.toBeCalled();
  });

  it('Repos without a master branch should fail', async () => {
    context = new Context(repoScheduleEvent, github as any, {} as any);
    const owner = 'bcgov';
    const repo = 'hello5';

    // @ts-ignore
    checkIfRefExists.mockReturnValueOnce(false);

    await fixDeprecatedComplianceStatus(context, owner, repo);

    expect(checkIfRefExists).toBeCalledTimes(1);
    expect(fetchFileContent).not.toBeCalled();
    expect(loadTemplate).not.toBeCalled();
    expect(addFileViaPullRequest).not.toBeCalled();
  });

  it('Repos with a fix branch already should not be updated', async () => {
    context = new Context(repoScheduleEvent, github as any, {} as any);
    const owner = 'bcgov';
    const repo = 'hello5';

    // @ts-ignore
    checkIfRefExists.mockReturnValueOnce(true).mockReturnValueOnce(true);

    await fixDeprecatedComplianceStatus(context, owner, repo);

    expect(checkIfRefExists).toBeCalledTimes(2);
    expect(fetchFileContent).not.toBeCalled();
    expect(loadTemplate).not.toBeCalled();
    expect(addFileViaPullRequest).not.toBeCalled();
  });

  it('Repo with valid topics is ignored', async () => {
    context = new Context(repoScheduleEvent, github as any, {} as any);
    const owner = 'bcgov';
    const repo = 'hello5';
    const aTopicsResponse = JSON.parse(JSON.stringify(repoGetTopics));
    aTopicsResponse.data.names = ['CITZ'];

    github.search.issuesAndPullRequests.mockReturnValueOnce(
      Promise.resolve(issuesAndPulls)
    );
    github.repos.listTopics.mockReturnValueOnce(
      Promise.resolve(aTopicsResponse)
    );

    await addMinistryTopicIfRequired(context, owner, repo);

    expect(github.repos.listTopics).toBeCalled();
    expect(github.search.issuesAndPullRequests).not.toBeCalled();
    expect(loadTemplate).not.toBeCalled();
    expect(github.issues.create).not.toBeCalled();
  });

  it('Repo with existing issues is ignored', async () => {
    context = new Context(repoScheduleEvent, github as any, {} as any);
    const owner = 'bcgov';
    const repo = 'hello5';
    const aTopicsResponse = JSON.parse(JSON.stringify(repoGetTopics));
    aTopicsResponse.data.names = ['cat'];

    github.search.issuesAndPullRequests.mockReturnValueOnce(
      Promise.resolve(issuesAndPulls)
    );
    github.repos.listTopics.mockReturnValueOnce(
      Promise.resolve(aTopicsResponse)
    );

    await addMinistryTopicIfRequired(context, owner, repo);

    expect(github.repos.listTopics).toBeCalled();
    expect(github.search.issuesAndPullRequests).toBeCalled();
    expect(loadTemplate).not.toBeCalled();
    expect(github.issues.create).not.toBeCalled();
  });

  it('Repo with not topics or issues is processed', async () => {
    context = new Context(repoScheduleEvent, github as any, {} as any);
    const owner = 'bcgov';
    const repo = 'hello5';
    const aTopicsResponse = JSON.parse(JSON.stringify(repoGetTopics));
    aTopicsResponse.data.names = ['cat'];
    const aRepoResponse = JSON.parse(JSON.stringify(issuesAndPulls));
    aRepoResponse.data.items = [];
    aRepoResponse.data.total_count = 0;

    github.search.issuesAndPullRequests.mockReturnValueOnce(
      Promise.resolve(aRepoResponse)
    );
    github.repos.listTopics.mockReturnValueOnce(
      Promise.resolve(aTopicsResponse)
    );

    await addMinistryTopicIfRequired(context, owner, repo);

    expect(github.repos.listTopics).toBeCalled();
    expect(github.search.issuesAndPullRequests).toBeCalled();
    expect(loadTemplate).toBeCalled();
    expect(github.issues.create).toBeCalled();
  });

  it('A Repo with issues disabled is skipped', async () => {
    const owner = 'bcgov';
    const repo = 'hello5';
    const aRepoCreated = JSON.parse(JSON.stringify(repoCreated));
    aRepoCreated.payload.repository.has_issues = false;

    context = new Context(aRepoCreated, github as any, {} as any);

    // const aRepoResponse = JSON.parse(JSON.stringify(issuesAndPulls));
    // aRepoResponse.data.items = [];
    // aRepoResponse.data.total_count = 0;

    // github.search.issuesAndPullRequests.mockReturnValueOnce(Promise.resolve(aRepoResponse));

    await addWordsMatterIfRequire(context, owner, repo);

    expect(github.search.issuesAndPullRequests).not.toBeCalled();
    expect(loadTemplate).not.toBeCalled();
    expect(github.issues.create).not.toBeCalled();
  });

  it('A Repo without any issue has words matter issue created', async () => {
    const owner = 'bcgov';
    const repo = 'hello5';
    const aRepoCreated = JSON.parse(JSON.stringify(repoCreated));
    aRepoCreated.payload.repository.has_issues = true;

    context = new Context(aRepoCreated, github as any, {} as any);

    const aRepoResponse = JSON.parse(JSON.stringify(issuesAndPulls));
    aRepoResponse.data.items = [];
    aRepoResponse.data.total_count = 0;

    github.search.issuesAndPullRequests.mockReturnValueOnce(
      Promise.resolve(aRepoResponse)
    );

    await addWordsMatterIfRequire(context, owner, repo);

    expect(github.search.issuesAndPullRequests).toBeCalled();
    expect(loadTemplate).toBeCalled();
    expect(github.issues.create).toBeCalled();
  });

  // tslint:disable-next-line
  it("A repo with a valid project lifecycle badge should not have a project lifecycle badge issue created", async () => {
    context = new Context(repoScheduleEvent, github as any, {} as any);
    const owner = context.payload.installation.account.login;
    const repo = context.payload.repository.name;

    const myReadmeResponse = JSON.parse(JSON.stringify(readmeResponse));

    // tslint:disable
    const contentString =
      "Here's a valid project badge. ![img](https://img.shields.io/badge/Lifecycle-Experimental-339999)";
    // tslint:enable
    const encodedContent = Buffer.from(contentString).toString('base64');

    myReadmeResponse.data.content = encodedContent;
    // @ts-ignore
    fetchFileContent.mockReturnValueOnce(
      Promise.resolve(myReadmeResponse.data)
    );

    await requestLifecycleBadgeIfRequired(context, owner, repo);

    expect(fetchFileContent).toBeCalled();
    expect(github.search.issuesAndPullRequests).not.toBeCalled();
    expect(loadTemplate).not.toBeCalled();
    expect(github.issues.create).not.toBeCalled();
  });

  // tslint:disable-next-line
  it("A repo with an open project lifecycle badge issue should not have another project lifecycle badge issue created", async () => {
    context = new Context(repoScheduleEvent, github as any, {} as any);
    const owner = context.payload.installation.account.login;
    const repo = context.payload.repository.name;

    // readmeResponse.data.content is the base64 encoded of:
    // "Here's an invalid project badge. ![img](https://img.shields.io/badge/Invalid-Badge-007EC6)"
    // @ts-ignore
    fetchFileContent.mockReturnValueOnce(Promise.resolve(readmeResponse.data));

    github.search.issuesAndPullRequests.mockReturnValueOnce(
      Promise.resolve(issuesAndPulls)
    );

    await requestLifecycleBadgeIfRequired(context, owner, repo);

    expect(fetchFileContent).toBeCalled();
    expect(github.search.issuesAndPullRequests).toBeCalled();
    expect(loadTemplate).not.toBeCalled();
    expect(github.issues.create).not.toBeCalled();
  });

  it('A repo with an invalid project lifecycle badge has project lifecycle badge issue created', async () => {
    context = new Context(repoScheduleEvent, github as any, {} as any);
    const owner = context.payload.installation.account.login;
    const repo = context.payload.repository.name;

    // readmeResponse.data.content is the base64 encoded of:
    // "Here's an invalid project badge. ![img](https://img.shields.io/badge/Invalid-Badge-007EC6)"
    // @ts-ignore
    fetchFileContent.mockReturnValueOnce(Promise.resolve(readmeResponse.data));

    github.search.issuesAndPullRequests.mockReturnValueOnce(
      Promise.resolve(issuesAndPullsEmpty)
    );

    await requestLifecycleBadgeIfRequired(context, owner, repo);

    expect(fetchFileContent).toBeCalled();
    expect(github.search.issuesAndPullRequests).toBeCalled();
    expect(loadTemplate).toBeCalled();
    expect(github.issues.create).toBeCalled();
  });

  it('A repo without a README.md should not have a project lifecycle badge issue created', async () => {
    context = new Context(repoScheduleEvent, github as any, {} as any);
    const owner = context.payload.installation.account.login;
    const repo = context.payload.repository.name;

    // @ts-ignore
    fetchFileContent.mockReturnValueOnce(undefined);

    await requestLifecycleBadgeIfRequired(context, owner, repo);

    expect(fetchFileContent).toBeCalled();
    expect(github.search.issuesAndPullRequests).not.toBeCalled();
    expect(loadTemplate).not.toBeCalled();
    expect(github.issues.create).not.toBeCalled();
  });
});

describe('doesContentHaveLifecycleBadge', () => {
  it('Valid lifecycle badges should return true', () => {
    expect(
      doesContentHaveLifecycleBadge(
        // tslint:disable-next-line
        "[![Lifecycle](https://img.shields.io/badge/Lifecycle-Stable-97ca00?style=for-the-badge)](https://github.com/bcgov/repomountie/blob/master/doc/lifecycle-badges.md)"
      )
    ).toBe(true);
    expect(
      doesContentHaveLifecycleBadge(
        // tslint:disable-next-line
        "[![](https://img.shields.io/badge/Lifecycle-Experimental-339999)](https://github.com/bcgov/repomountie/blob/master/doc/lifecycle-badges.md)"
      )
    ).toBe(true);
    expect(
      doesContentHaveLifecycleBadge(
        // tslint:disable-next-line
        "![](https://img.shields.io/badge/Lifecycle-Stable-97ca00)"
      )
    ).toBe(true);
    expect(
      doesContentHaveLifecycleBadge(
        // tslint:disable-next-line
        "[![lifecycle:stable](https://img.shields.io/badge/Lifecycle-Stable-97ca00)]"
      )
    ).toBe(true);
    expect(
      doesContentHaveLifecycleBadge(
        // tslint:disable-next-line
        "[![lifecycle:dormant](https://img.shields.io/badge/Lifecycle-Dormant-ff7f2a)](https://github.com/bcgov/repomountie/)"
      )
    ).toBe(true);
    expect(
      doesContentHaveLifecycleBadge(
        // tslint:disable-next-line
        "[![random-text](https://img.shields.io/badge/Lifecycle-Retired-d45500)](https://github.com/bcgov/repomountie/blob/master/doc/lifecycle-badges.md)"
      )
    ).toBe(true);
  });

  it('Invalid lifecycle badges should return false', () => {
    expect(
      doesContentHaveLifecycleBadge(
        // tslint:disable-next-line
        "![img](https://img.shields.io/badge/Invalid-Badge-339999)"
      )
    ).toBe(false);
    expect(
      doesContentHaveLifecycleBadge(
        // tslint:disable-next-line
        "[![img](https://img.shields.io/badge/Invalid-Badge-339999)](https://github.com/bcgov/repomountie/blob/master/doc/lifecycle-badges.md)"
      )
    ).toBe(false);
  });
});
