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
// Created by Jason Leach on 2018-10-02.
//

import { logger } from '@bcgov/common-nodejs-utils';
import { Context } from 'probot';
import { PR_TITLES, VALID_LICENSES } from '../constants';
import { addLicenseFileToRepo } from './content';
import { extractMessage } from './utils';

const masterRefExists = async (context: Context) => {
  try {
    // If the repo does *not* have a master branch then we don't want to add one.
    // The dev team may be doing this off-line and when they go to push master it
    // will cause a conflict because there will be no common root commit.
    await context.github.git.getRef(
      context.repo({
        ref: 'heads/master',
      })
    );

    return true;
  } catch (err) {
    logger.info(`No master branch exists in ${context.payload.repository.name}`);
    // throw err; // hard stop if we don't have a master branch
    return false;
  }
};

export const addSecurityComplianceInfoIfRequired = async (context: Context, scheduler: any = undefined) => {
  return;
};

export const addLicenseIfRequired = async (context: Context, scheduler: any = undefined) => {
  try {
    // Currently we only have one cultural rule, a repo must have a licence. If this
    // is true then we can safely disable the bot for the particular repo.
    if (
      context.payload.repository.license &&
      Object.values(VALID_LICENSES).includes(context.payload.repository.license.key)
    ) {
      scheduler.stop(context.payload.repository);
      return;
    }

    if ((await masterRefExists(context)) && !context.payload.repository.license) {
      try {
        const allPullRequests = await context.github.pulls.list(
          context.repo({
            state: 'all',
          })
        );

        const hasLicensePR =
          allPullRequests.data.filter(pr => pr.title === PR_TITLES.ADD_LICENSE).length > 0;

        if (hasLicensePR) {
          // Do nothing
          logger.info(`Licencing PR exists in ${context.payload.repository.name}`);
        } else {
          // Add a license via a PR
          await addLicenseFileToRepo(context);
        }
      } catch (err) {
        const message = `Unable to add license to ${context.payload.repository.name}`;
        logger.error(`${message}, error = ${err.message}`);

        throw err;
      }
    }
  } catch (err) {
    const message = extractMessage(err);
    if (message) {
      logger.error(`Error validating license for ${context.payload.repository.name}`);
    } else {
      logger.error(err.message);
    }

    throw err;
  }
};
