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

export const SCHEDULER_DELAY: number = 24 * 60 * 60 * 1000; // one day

export const COMMENT_TRIGGER_WORD = 'help';

export const BOT_NAME = 'bot-3kdjfksd';

export const REPO_CONFIG_FILE = 'rmconfig.json';

export const HELP_DESK = {
  SUPPORT_USERS: ['jleach'],
};

export const COMMIT_FILE_NAMES = {
  COMPLIANCE: 'COMPLIANCE.yaml',
  LICENSE: 'LICENSE',
};

export const COMMIT_MESSAGES = {
  ADD_COMPLIANCE: 'Add compliance audit file',
  ADD_LICENSE: 'Add Apache License 2.0',
  UPDATE_COMPLIANCE: 'Updating compliance audit file',
  CHANGE_STATUS: 'Rename PIA and STRA status',
};

export const ISSUE_TITLES = {
  ADD_TOPICS: 'Add missing topics',
  ADD_COMPLIANCE: 'Add missing compliance audit file',
  ADD_LICENSE: 'Add missing license',
  RENAME_STATUS: 'Rename PIA and STRA status from exempt',
  WORDS_MATTER: 'Lets use common phrasing',
};

export const BRANCHES = {
  ADD_COMPLIANCE: 'repo-mountie/add-compliance',
  ADD_LICENSE: 'repo-mountie/add-license',
  RENAME_STATUS: 'repo-mountie/rename-status',
};

export const TEMPLATES = {
  COMPLIANCE: 'templates/COMPLIANCE.yaml',
  CONDUCT: 'templates/CODE_OF_CONDUCT.md',
  CONTRIBUTE: 'templates/CONTRIBUTING.md',
  LICENSE: 'templates/LICENSE',
  README: 'templates/README.md',
};

export const VALID_LICENSES = {
  APACHE: 'apache-2.0',
};

export const TEXT_FILES = {
  HOWTO_PR: 'templates/howto_pull_request.md',
  STALE_ISSUE_COMMENT: 'templates/stale_issue_comment.md',
  STALE_PR_COMMENT: 'templates/stale_pr_comment.md',
  WHY_COMPLY: 'templates/why-comply.md',
  WHY_LICENSE: 'templates/why-license.md',
  WHY_RENAME_STATUS: 'templates/why-rename-status.md',
  WHY_TOPICS: 'templates/why-topics.md',
  WORDS_MATTER: 'templates/words-matter.md',
};

export const COMMANDS = {
  IGNORE: '/bot-ignore-length',
};

export const REGEXP = {
  command: '@repo-mountie\\s+',
  compliance: '@repo-mountie\\s+update-(pia|stra)\\s+(in-progress|completed|TBD|not-required)',
  help: '@repo-mountie\\s+help',
};

export const ACCESS_CONTROL = {
  allowedInstallations: ['bcgov', 'fullboar'],
  allowedSsoClients: ['reggie-api'],
};

export const MINISTRY_SHORT_CODES = [
  'AEST',
  'AGRI',
  'ALC',
  'AG',
  'MCF',
  'CITZ',
  'DBC',
  'EMBC',
  'EAO',
  'EDUC',
  'EMPR',
  'ENV',
  'FIN',
  'FLNR',
  'HLTH',
  'IRR',
  'JEDC',
  'LBR',
  'LDB',
  'MMHA',
  'MAH',
  'BCPC',
  'PSA',
  'PSSG',
  'SDPR',
  'STAT',
  'TCA',
  'TRAN',
];
