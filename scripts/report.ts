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
// Created by Jason Leach on 2020-02-19.
//

import { logger } from '@bcgov/common-nodejs-utils';
import fs from 'fs';
import moment from 'moment';
import { cleanup, ComplianceAudit, connect, RepoMeta } from '../src/db';

/**
 * Remove duplicate records
 * Prune records from the database where the status of the PIA or STRA
 * has not changed from the previous record.
 * @param {array} repoNames THe names of the repositories to prune
 * @returns Resolves when processing is complete, rejects on failure.
 */
const prune = async (repoNames: []): Promise<void> => {
    const piaRecordName = 'PIA';
    const straRecordName = 'STRA';

    try {
        for (const name of repoNames) {
            const dupes: any = [];
            const records = await ComplianceAudit.find({ repoName: name }, {}, { sort: { createdAt: 1 } });

            let last;
            records.forEach((cur) => {
                if (!last) {
                    last = cur;
                    return;
                }

                const cPIA = cur.records.filter((v) => v.name === piaRecordName);
                const cSTRA = cur.records.filter((v) => v.name === straRecordName);
                const lPIA = last.records.filter((v) => v.name === piaRecordName);
                const lSTRA = cur.records.filter((v) => v.name === straRecordName);

                if ((cPIA.status === lPIA.status) && cSTRA.status === lSTRA.status) {
                    dupes.push(cur._id);
                    return;
                }

                last = cur;
            });

            await ComplianceAudit.deleteMany({
                _id: { $in: dupes },
            });
        }
    } catch (err) {
        const message = 'Unable to prune records';
        logger.error(`${message}, error = ${err.message}`);
    }
};

/**
 * Bucket sort records by ministry
 * @param {array} records The compliance records
 * @returns A dictionary of records where the key is the ministry
 */
const sortByMinistry = (records: any[]): any =>
    records.reduce((acc, cur) => {
        if (!(cur.ministry in acc)) {
            acc[cur.ministry] = [];
        }
        acc[cur.ministry].push(cur);

        return acc;
    }, {});

/**
 * Convert an array of compliance records to CSV with header
 * @param {array} data The compliance records
 * @returns A string formatted as CSV with header fields.
 */
const formatAsCSV = (data: any[]): string => {
    const header: any = ['ministry', 'repoName', 'productLead'];
    const lines: any = [];

    // Build the CSV file, one line for each record in the
    // input data.
    data.forEach((d) => {
        const status: any = [];
        // Each data item will have a PIA and STRA record; its not clear if they
        // will always be in the same order so they are added to the header and
        // CSV dynamically.
        // TODO:(jl) Better to sort alphabetically and just pull out the first
        // two records?
        d.records.forEach((r) => {
            const prefix = r.name.toLowerCase();
            if (!header.includes(`${prefix}Status`) || !header.includes(`${prefix}UpdatedAt`)) {
                header.push(`${prefix}Status,${prefix}UpdatedAt`);
            }
            // / add to the status array, joined to the CSV later
            status.push(`${r.status},${moment(r.updatedAt).format('MM/DD/YY')}`);
        });
        // add the line to the CSV array
        lines.push(`${d.ministry},${d.repoName},${d.productLead},${status.join(',')}`);
    });

    // insert the header at the front of the array
    lines.splice(0, 0, header.join(','));

    return lines.join('\n');
};

/**
 * Generate the compliance report
 * This func will generate a compliance report in CSV format
 * with header(s). One file will be created for each sorting key
 * which in this context is the ministry.
 * @param {array} data The compliance records
 */
const report = (compliance: []): void => {
    const sorted = sortByMinistry(compliance);
    const keys = Object.keys(sorted);

    keys.forEach((k) => {
        const lines = formatAsCSV(sorted[k]);
        fs.writeFileSync(`./data/${k}.csv`, lines);
    });
};

/**
 * Merge repo metadata with compliance audit record
 * @param {Object[]} compliance The compliance records
 * @param {Object[]} meta Repository metadata records
 * @returns An array of compliance records populated with additional metadata.
 */
const merge = (compliance, meta): any[] => {
    const merged: any = [];
    compliance.forEach((c) => {
        const repodata = meta.find((m) => m.repository === c.repoName);
        if (repodata) {
            merged.push(
                {
                    ...c,
                    ministry: repodata.ministry,
                    ministryOrg: repodata.org,
                    productLead: repodata.productLead,
                }
            );
        }
    });

    return merged;
};

/**
 * Main functionality
 */
const main = async (): Promise<void> => {
    try {
        // Connect to the database
        connect();

        // Prune duplicate records from the database. We're only interested in
        // changes over time.
        const reponames = await ComplianceAudit.find({}, { repoName: 1, _id: 0 }).distinct('repoName');
        await prune(reponames);

        // Fetch the metadata scraped from OCP and merge it (where possible) into
        // the compliance records. This information populates the `ministry`
        // field on which the records will be sorted and reported.
        const meta: any = await RepoMeta.find({}, { gitOrg: 0, buildConfigName: 0, _id: 0 }).lean();
        const compliance: any = await ComplianceAudit.find().lean();
        const merged: any = merge(compliance, meta);

        // Generate a series of CSV report files.
        report(merged);
    } catch (err) {
        const message = `Unable to open database connection`;
        throw new Error(`${message}, error = ${err.message}`);
    } finally {
        // Close database connections
        cleanup();
    }
};

main();
