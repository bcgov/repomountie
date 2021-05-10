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

export const ONE_DAY: number = 24 * 60 * 60 * 1000;

export const SCHEDULER_DELAY: number = ONE_DAY; // one day

export const INACTIVE_DAYS: number = 180;

export const COMMENT_TRIGGER_WORD = 'help';

export const BOT_NAME = 'repo-mountie';

export const REPO_CONFIG_FILE = 'rmconfig.json';

export const REPO_README = 'README.md';

export const HELP_DESK = {
  SUPPORT_USERS: ['jleach'],
};

export const COMMIT_FILE_NAMES = {
  COMPLIANCE: 'COMPLIANCE.yaml',
  LICENSE: 'LICENSE',
};

const COMMIT_SIGN_OFF = `Signed-off-by: ${BOT_NAME} <pathfinder@gov.bc.ca>`;

export const COMMIT_MESSAGES = {
  ADD_COMPLIANCE: `Add compliance audit file\n\n${COMMIT_SIGN_OFF}`,
  ADD_LICENSE: `Add Apache License 2.0\n\n${COMMIT_SIGN_OFF}`,
  UPDATE_COMPLIANCE: `Updating compliance audit file\n\n${COMMIT_SIGN_OFF}`,
  CHANGE_STATUS: `Rename PIA and STRA status\n\n${COMMIT_SIGN_OFF}`,
};

export const ISSUE_TITLES = {
  ADD_TOPICS: 'Add missing topics',
  ADD_COMPLIANCE: 'Add missing compliance audit file',
  ADD_LICENSE: 'Add missing license',
  RENAME_STATUS: 'Rename PIA and STRA status from exempt',
  WORDS_MATTER: 'Lets use common phrasing',
  LIFECYCLE_BADGES: 'Add project lifecycle badge',
  INACTIVE_REPO: `It's Been a While Since This Repository has Been Updated`,
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
  LIFECYCLE_BADGES: 'templates/lifecycle-badges.md',
  INACTIVE_REPO: 'templates/inactive_repo_reminder.md',
};

export const COMMANDS = {
  IGNORE: '/bot-ignore-length',
};

export const REGEXP = {
  command: '@repo-mountie\\s+',
  compliance:
    '@repo-mountie\\s+update-(pia|stra)\\s+(in-progress|completed|TBD|not-required)',
  help: '@repo-mountie\\s+help',
  // prettier-ignore
  // tslint:disable-next-line
  lifecycle_badge: '!\\[{1}[\\w\\s:\\-]{0,}\\]{1}\\(https:\\/\\/img\\.shields\\.io\\/badge\\/Lifecycle-(Maturing-007EC6|Experimental-339999|Stable-97ca00|Dormant-ff7f2a|Retired-d45500)\\??[:\\w\\s\\-=%]{0,}\\){0}',
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
