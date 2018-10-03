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

import fs from 'fs';
import { Context } from 'probot';
import util from 'util';

/**
 * Load a template file file and return the contents.
 *
 * @param {string} path The path to the template file
 * @returns {Promise<string>} Resolved with contents, rejected otherwise
 */
export const loadTemplate = async (path: string): Promise<string> => {
  const access = util.promisify(fs.access);
  const read = util.promisify(fs.readFile);

  if (access(path, fs.constants.R_OK)) {
    return read(path, 'utf8');
  }

  return Promise.reject();
};

/**
 * Write the payload of an event to the local file system
 *
 * @param {Context} context The context being worked on
 */
export const writeEvent = (context: Context) => {
  fs.writeFileSync(
    `./${context.payload.repository.name}.json`,
    Buffer.from(JSON.stringify(context.payload))
  );
};

/**
 * Extract and return and API response message
 * The errors received from using the github API via Probot
 * will return an Error message with a JSON encoded string in the
 * message property.
 * @param {Error} error The error from which to extract the message
 * @returns Undefined if unparsable, a resolved promise containing the results otherwise
 */
export const extractMessage = async (error: Error): Promise<string> => {
  try {
    const message = JSON.parse(error.message);
    return message;
  } catch (error) {
    return Promise.reject();
  }
};
