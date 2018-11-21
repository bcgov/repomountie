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
// Created by Jason Leach on 2018-10-01.
//

import { logger } from '@bcgov/nodejs-common-utils';
import { Context } from 'probot';
import { BRANCHES, PR_TITLES, TEMPLATES, TEXT_FILES } from '../constants';
import { loadTemplate } from './utils';

/**
 * Add a license file via PR to a given repo
 *
 * @param {Context} context The repo context
 * @returns
 */
export const addLicenseFileToRepo = async (context: Context) => {
  const commitMessage: string = 'Add Apache License 2.0';

  try {
    // If we don't have a master we won't have know where to merge the PR
    const master = await context.github.gitdata.getRef(
      context.repo({
        ref: 'heads/master',
      })
    );

    // Create a branch to commit to commit the license file
    await context.github.gitdata.createRef(
      context.repo({
        ref: `refs/heads/${BRANCHES.ADD_LICENSE}`,
        sha: master.data.object.sha,
      })
    );

    const prMessageBody: string = await loadTemplate(TEXT_FILES.WHY_LICENSE);
    const licenseData: string = await loadTemplate(TEMPLATES.LICENSE);

    // Add the file to the new branch
    await context.github.repos.createFile(
      context.repo({
        branch: BRANCHES.ADD_LICENSE,
        content: Buffer.from(licenseData).toString('base64'),
        message: commitMessage,
        path: 'LICENSE',
      })
    );

    // Create a PR to merge the licence ref into master
    await context.github.pullRequests.create(
      context.repo({
        base: 'master',
        body: prMessageBody,
        head: BRANCHES.ADD_LICENSE,
        maintainer_can_modify: true, // maintainers cat edit your this PR
        title: PR_TITLES.ADD_LICENSE,
      })
    );
  } catch (err) {
    const message = `Unable to add LICENSE to ${context.payload.repository.name}`;
    logger.error(`${message}, error = ${err.message}`);

    throw err;
  }
};
