"use strict";
//
// Copyright © 2018, 2019, 2020 Province of British Columbia
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
exports.__esModule = true;
exports.SCHEDULER_DELAY = 24 * 60 * 60 * 1000; // one day
exports.COMMENT_TRIGGER_WORD = 'help';
exports.GITHUB_ID = 'repo-mountie';
exports.REPO_CONFIG_FILE = 'rmconfig.json';
exports.HELP_DESK = {
    SUPPORT_USERS: ['jleach']
};
exports.COMMIT_FILE_NAMES = {
    COMPLIANCE: 'COMPLIANCE.yaml',
    LICENSE: 'LICENSE'
};
exports.COMMIT_MESSAGES = {
    ADD_COMPLIANCE: 'Add compliance audit file',
    ADD_LICENSE: 'Add Apache License 2.0',
    UPDATE_COMPLIANCE: 'Updating compliance audit file'
};
exports.PR_TITLES = {
    ADD_COMPLIANCE: 'Add missing compliance audit file',
    ADD_LICENSE: 'Add missing license'
};
exports.BRANCHES = {
    ADD_COMPLIANCE: 'repo-mountie/add-compliance',
    ADD_LICENSE: 'repo-mountie/add-license'
};
exports.TEMPLATES = {
    COMPLIANCE: 'templates/COMPLIANCE.yaml',
    CONDUCT: 'templates/CODE_OF_CONDUCT.md',
    CONTRIBUTE: 'templates/CONTRIBUTING.md',
    LICENSE: 'templates/LICENSE',
    README: 'templates/README.md'
};
exports.VALID_LICENSES = {
    APACHE: 'apache-2.0'
};
exports.TEXT_FILES = {
    HOWTO_PR: 'templates/howto_pull_request.md',
    STALE_COMMENT: 'templates/stale_issue_comment.md',
    WHY_COMPLY: 'templates/why-comply.md',
    WHY_LICENSE: 'templates/why-license.md'
};
exports.COMMANDS = {
    IGNORE: '/bot-ignore-length'
};
exports.REGEXP = {
    command: '@repo-mountie\\s+',
    compliance: '@repo-mountie\\s+update-(pia|stra)\\s+(in-progress|completed|TBD|exempt)',
    help: '@repo-mountie\\s+help'
};
exports.ACCESS_CONTROL = {
    allowedInstallations: ['bcgov', 'fullboar'],
    allowedSsoClients: ['reggie-api']
};
