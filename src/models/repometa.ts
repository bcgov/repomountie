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
// Created by Jason Leach on 2020-03-04.
//

import mongoose from 'mongoose';

const RepoMetaSchema = new mongoose.Schema({
    buildConfigName: {
        index: true,
        type: String,
    },
    gitOrg: {
        index: true,
        type: String,
    },
    ministry: {
        index: true,
        type: String,
    },
    orgName: {
        index: true,
        type: String,
    },
    productLead: {
        index: true,
        type: String,
    },
    project: {
        index: true,
        type: String,
    },
    repository: {
        index: true,
        type: String,
    },
});

export const RepoMeta = mongoose.model('RepoMeta',
    RepoMetaSchema);
