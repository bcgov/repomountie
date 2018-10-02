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

import { logger } from "@bcgov/nodejs-common-utils";
import fs from "fs";
import { Application, Context } from "probot";
import createScheduler from "probot-scheduler";
import util from "util";
import {
  BRANCHES,
  SCHEDULER_DELAY,
  TEMPLATES,
  VALID_LICENSES
} from "./constants";

const loadTemplate = async (path: string): Promise<string> => {
  const access = util.promisify(fs.access);
  const read = util.promisify(fs.readFile);

  if (access(path, fs.constants.R_OK)) {
    return await read(path, "utf8");
  }

  return Promise.reject();
};

const addLicense = async (context: Context) => {
  const commitMessage: string = "Add Apache License 2.0";
  const body: string = `
  Repos in our organization need to be licensed under the Apache License 2.0.
  To help you get up to spec I've added one for you as part of this PR;
  please merge it when you can. If you have an exception please add comments to
  this PR and close it without merging it.`;

  try {
    const master = await context.github.gitdata.getReference(
      context.repo({
        ref: "heads/master"
      })
    );

    if (!master) {
      return;
    }

    await context.github.gitdata.createReference(
      context.repo({
        ref: BRANCHES.LICENSE,
        sha: master.data.object.sha
      })
    );

    const data = await loadTemplate(TEMPLATES.LICENSE);
    if (!data) {
      return;
    }

    await context.github.repos.createFile(
      context.repo({
        branch: BRANCHES.LICENSE,
        content: Buffer.from(data).toString("base64"),
        message: commitMessage,
        path: "LICENSE"
      })
    );

    await context.github.pullRequests.create(
      context.repo({
        base: "master",
        body,
        head: BRANCHES.LICENSE,
        maintainer_can_modify: true, // maintainers cat edit your this PR
        title: "Add missing license"
      })
    );
  } catch (err) {
    logger.log(err.message);
  }
};

export = (app: Application) => {
  logger.info("Loaded!!!");

  const scheduler = createScheduler(app, {
    delay: false, // !!process.env.DISABLE_DELAY, // delay is enabled on first run
    interval: SCHEDULER_DELAY
  });

  app.on("repository.deleted", async context => {
    scheduler.stop(context.payload.repository);
  });

  app.on("schedule.repository", async context => {
    try {
      const master = await context.github.gitdata.getReference(
        context.repo({
          ref: "heads/master"
        })
      );

      if (
        context.payload.repository.license &&
        Object.values(VALID_LICENSES).includes(
          context.payload.repository.license
        )
      ) {
        scheduler.stop(context.payload.repository);
        return;
      }

      if (!context.payload.repository.license && master) {
        const licenseBranch = await context.github.gitdata.getReference(
          context.repo({
            ref: BRANCHES.LICENSE
          })
        );

        if (licenseBranch) {
          return;
        }

        addLicense(context);
      }
    } catch (error) {
      logger.error(error.message);
    }
  });
};
