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
import { BRANCHES, TEMPLATES } from '../constants';
import { loadTemplate } from './utils';

/**
 * Add a license file via PR to a given repo
 *
 * @param {Context} context The repo context
 * @returns
 */
export const addLicense = async (context: Context) => {
  const commitMessage: string = 'Add Apache License 2.0';
  const body: string = `
    Repos in our organization need to be licensed under the Apache License 2.0.
    To help you get up to spec I've added one for you as part of this PR;
    please merge it when you can. If you have an exception please add comments to
    this PR and close it without merging it.`;

  try {
    // If we don't have a master we won't have know where to merge the PR
    const master = await context.github.gitdata.getReference(
      context.repo({
        ref: 'heads/master',
      })
    );

    if (!master) {
      return;
    }

    // Create a branch to commit to commit the license file
    await context.github.gitdata.createReference(
      context.repo({
        ref: BRANCHES.LICENSE,
        sha: master.data.object.sha,
      })
    );

    const data = await loadTemplate(TEMPLATES.LICENSE);
    if (!data) {
      return;
    }

    // Add the file to the new branch
    await context.github.repos.createFile(
      context.repo({
        branch: BRANCHES.LICENSE,
        content: Buffer.from(data).toString('base64'),
        message: commitMessage,
        path: 'LICENSE',
      })
    );

    // Create a PR to merge the licence ref into master
    await context.github.pullRequests.create(
      context.repo({
        base: 'master',
        body,
        head: BRANCHES.LICENSE,
        maintainer_can_modify: true, // maintainers cat edit your this PR
        title: 'Add missing license',
      })
    );
  } catch (err) {
    logger.log(err.message);

    throw err;
  }
};
