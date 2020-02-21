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

import mongoose from 'mongoose';
import config from '../src/config';
import { ComplianceAudit } from '../src/models/compliance';

const prune = async (repoNames: []) => {
    try {
        for (const name of repoNames) {
            const dupes: any = [];
            const r2 = await ComplianceAudit.find({ repoName: name }, {}, { sort: { createdAt: 1 } });

            let last;
            r2.forEach((cur) => {
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
        console.log('Done');
    }
};

const report = async (repoNames: []) => {
    console.log('OK');
};

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

const cleanup = () => {
    mongoose.connection.close();
};

const main = async () => {
    try {
        connect();
        const results = await ComplianceAudit.find({}, { repoName: 1, _id: 0 }).distinct('repoName');

        await prune(results);
        await report(results);

        cleanup();
    } catch (err) {
        const message = `Unable to open database connection`;
        throw new Error(`${message}, error = ${err.message}`);
    }
};

main();
