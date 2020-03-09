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
import mongoose from 'mongoose';
import config from '../src/config';
import { ComplianceAudit } from '../src/models/compliance';
import { RepoMeta } from '../src/models/repometa';

/**
 * Connect to mongo database
 */
const connect = async () => {
    const options = {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    };
    const user = config.get('db:user');
    const passwd = config.get('db:password');
    const host = config.get('db:host');
    const dbname = config.get('db:database');
    const curl = `mongodb://${user}:${passwd}@${host}/${dbname}`;

    await mongoose.connect(curl, options);
};

/**
 * Remove duplicate records
 * Prune records from the database where the status of the PIA or STRA
 * has not changed from the previous record.
 * @param {array} repoNames THe names of the repositories to prune
 * @returns Resolves when processing is complete, rejects on failure.
 */
const prune = async (repoNames: []): Promise<void> => {
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

                const cPIA = cur.records.filter((v) => v.name === 'PIA');
                const cSTRA = cur.records.filter((v) => v.name === 'STRA');
                const lPIA = last.records.filter((v) => v.name === 'PIA');
                const lSTRA = cur.records.filter((v) => v.name === 'STRA');

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

const report = async (repoNames: []) => {
    console.log('TODO: Waiting for feedback from Nick.');
};

/**
 * Merge repo metadata with compliance audit record
 * @param {Object[]} compliance The compliance records
 * @param {Object[]} meta Repository metadata records
 * @returns An array of compliance records populated with additional metadata.
 */
const merge = (compliance, meta) => {
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
 * Close connection to mongo database
 * The connection to mongo needs to be closed so the script
 * can exit.
 */
const cleanup = () => {
    mongoose.connection.close();
};

/**
 * Main functionality
 */
const main = async () => {
    try {
        connect();

        // { "_id" : ObjectId("5e6045eac163623463609bd0"),
        // "repository" : "representation-grant" }
        const reponames = await ComplianceAudit.find({}, { repoName: 1, _id: 0 }).distinct('repoName');
        await prune(reponames);

        // { "_id" : ObjectId("5e6045eac163623463609bd0"), "project" : "ag-csb-representation-grant-tools",
        // "buildConfigName" : "web-pipeline", "gitOrg" : "bcgov",
        // "repository" : "representation-grant", "productLead" : "ryan.loiselle@gov.bc.ca",
        // "ministry" : "AG", "org" : "CRTINNOVAT" }
        const meta = await RepoMeta.find({}, { gitOrg: 0, buildConfigName: 0, _id: 0 }).lean();

        // { "_id" : ObjectId("5e55940daa59fb0021144e5d"), "orgName" : "fullboar",
        // "records" : [ { "_id" : ObjectId("5e55940daa59fb0021144e5e"),
        // "name" : "PIA", "status" : "completed",
        // "updatedAt" : ISODate("2020-01-09T22:13:28.138Z") },
        // { "_id" : ObjectId("5e55940daa59fb0021144e5f"), "name" : "STRA",
        // "status" : "exempt", "updatedAt" : ISODate("2020-01-09T22:13:28.138Z") } ],
        // "repoName" : "hello6", "createdAt" : ISODate("2020-02-25T21:39:25.350Z"),
        // "updatedAt" : ISODate("2020-02-25T21:39:25.350Z"), "__v" : 0 }
        const compliance = await ComplianceAudit.find().lean();

        const merged = merge(compliance, meta);
        report(merged);

        cleanup();
    } catch (err) {
        const message = `Unable to open database connection`;
        throw new Error(`${message}, error = ${err.message}`);
    }
};

main();
