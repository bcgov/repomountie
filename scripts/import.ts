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
// Created by Jason Leach on 2020-02-27.
//

import parse from 'csv-parse/lib/sync';
import fs from 'fs';
import { cleanup, connect, RepoMeta } from '../src/db';

const dataFilePath = './data/csv_output.csv';

/**
 * Main functionality
 */
const main = async () => {
    try {
        await connect();

        const fin = fs.readFileSync(dataFilePath);

        // Read in and parse the CSV to POJOs.
        const records = parse(fin, {
            columns: true,
            skip_empty_lines: true,
        });

        // Filter out some objects we don't want and transform some object properties
        // to be in a format that is more consumable.
        const transformedRecords = records
            .filter((r) => r.gitOrg !== 'BCDevOps' && r.ministry !== '')
            .map((r) => {
                // Remove `.git` from repository name.
                return { ...r, repository: r.repository.split('.')[0] };
            }).reduce((acc, cur) => {
                // Strip dev/test/tools from the project name (namespace) and combine it
                // with the repo name for a dictionary key.
                acc[`${cur.project.split('-').slice(0, -1)}-${cur.repository}`] = cur;

                return acc;
            }, {});

        // Convert the POJO back to an array
        const keepers = Object.keys(transformedRecords).map((k) => transformedRecords[k]);

        // The `repometa` collection is reference data and should not
        // accumulate so we flush it before doing a fresh import.
        await RepoMeta.collection.deleteMany({});
        // Import the new ref data.
        await RepoMeta.collection.insertMany(keepers);

        // tslint:disable-next-line:no-console
        console.log(`importing ${keepers.length} records`);
    } catch (err) {
        const message = `Unable to import all records`;
        throw new Error(`${message}, error = ${err.message}`);
    } finally {
        cleanup();
    }
};

main();
