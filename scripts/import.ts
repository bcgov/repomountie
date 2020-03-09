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
import mongoose from 'mongoose';
import config from '../src/config';
import { RepoMeta } from '../src/models/repometa';

const dataFilePath = './data/csv_output.csv';

const connect = async () => {
    const options = {
        useCreateIndex: true,
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
        await connect();

        const fin = fs.readFileSync(dataFilePath);
        let temp = {};
        let keepers = parse(fin, {
            columns: true,
            skip_empty_lines: true,
        })
            .filter((r) => r.gitOrg !== 'BCDevOps' && r.ministry !== '')
            .map((r) => {
                return { ...r, repository: r.repository.split('.')[0] };
            });

        keepers.forEach((k) => {
            temp[`${k.project.split('-').slice(0, -1)}-${k.repository}`] = k;
        });

        keepers = Object.keys(temp).map((k) => temp[k]);

        await RepoMeta.collection.deleteMany();
        await RepoMeta.collection.insertMany(keepers);

        // tslint:disable-next-line:no-console
        console.log(`importing ${keepers.length} records`);

        cleanup();
    } catch (err) {
        const message = `Unable to open database connection`;
        throw new Error(`${message}, error = ${err.message}`);
    }
};

main();
