"use strict";
//
//
// Copyright © 2019, 2020 Province of British Columbia
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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
exports.__esModule = true;
var common_nodejs_utils_1 = require("@bcgov/common-nodejs-utils");
var js_yaml_1 = require("js-yaml");
var constants_1 = require("../constants");
/**
 * Check if a git ref exists
 * Check if a git reference exists; the call to GitHub will fail
 * if the reference does not exists.
 * @param {Context} context The event context context
 * @param {string} ref The ref to be looked up
 * @returns A boolean of true if the ref exists, false otherwise
 */
exports.checkIfRefExists = function (context, ref) {
    if (ref === void 0) { ref = context.payload.repository.default_branch; }
    return __awaiter(void 0, void 0, void 0, function () {
        var err_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    // If the repo does *not* have a master branch then we don't want to add one.
                    // The dev team may be doing this off-line and when they go to push master it
                    // will cause a conflict because there will be no common root commit.
                    return [4 /*yield*/, context.github.git.getRef(context.repo({
                            ref: "heads/" + ref
                        }))];
                case 1:
                    // If the repo does *not* have a master branch then we don't want to add one.
                    // The dev team may be doing this off-line and when they go to push master it
                    // will cause a conflict because there will be no common root commit.
                    _a.sent();
                    return [2 /*return*/, true];
                case 2:
                    err_1 = _a.sent();
                    common_nodejs_utils_1.logger.info("No ref " + ref + " exists in " + context.payload.repository.name);
                    return [2 /*return*/, false];
                case 3: return [2 /*return*/];
            }
        });
    });
};
/**
 * Determine if a file exists on a given branch
 * The only way to check if a file exists is to attempt to fetch it;
 * This fn is a wrapper on this capability.
 * @param {Context} context The event context context
 * @param {string} fileName The name of the file to lookup
 * @param {string} ref The name of the branch (Default: master)
 * @returns A true if the file exists, false otherwise.
 */
exports.checkIfFileExists = function (context, fileName, ref) {
    if (ref === void 0) { ref = 'master'; }
    return __awaiter(void 0, void 0, void 0, function () {
        var err_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, exports.fetchFile(context, fileName, ref)];
                case 1:
                    _a.sent();
                    return [2 /*return*/, true];
                case 2:
                    err_2 = _a.sent();
                    return [2 /*return*/, false];
                case 3: return [2 /*return*/];
            }
        });
    });
};
/**
 * Fetch the contents of a file from GitHub
 * This function will fetch the contents of a file from the latest
 * commit in a ref.
 * @param {Context} context The context of the repo
 * @param {string} fileName The name of the file to be fetched
 * @param {string} ref The ref containing the file (default master)
 * @returns A resolved promise with the `data`, thrown error otherwise.
 */
exports.fetchContentsForFile = function (context, fileName, ref) {
    if (ref === void 0) { ref = context.payload.repository.default_branch; }
    return __awaiter(void 0, void 0, void 0, function () {
        var commits, lastCommit, response, data, err_3, message;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 3, , 4]);
                    return [4 /*yield*/, context.github.repos.listCommits(context.repo({
                            path: fileName,
                            sha: ref
                        }))];
                case 1:
                    commits = _a.sent();
                    lastCommit = commits.data.sort(function (a, b) {
                        return (new Date(b.commit.committer.date)).getTime() - (new Date(a.commit.committer.date)).getTime();
                    }).shift();
                    if (!lastCommit) {
                        common_nodejs_utils_1.logger.info('Unable to find last commit.');
                        return [2 /*return*/];
                    }
                    return [4 /*yield*/, context.github.repos.getContents(context.repo({
                            path: fileName,
                            ref: lastCommit.sha
                        }))];
                case 2:
                    response = _a.sent();
                    data = response.data;
                    if (data.content && data.type !== 'file') {
                        common_nodejs_utils_1.logger.info('Unusable content type retrieved.');
                        return [2 /*return*/];
                    }
                    return [2 /*return*/, data];
                case 3:
                    err_3 = _a.sent();
                    message = "Unable to fetch " + fileName;
                    common_nodejs_utils_1.logger.error(message + ", error = " + err_3.message);
                    throw new Error(message);
                case 4: return [2 /*return*/];
            }
        });
    });
};
/**
 * Fetch the repo compliance file
 * The compliance file determines what state any policy compliance
 * is currently in.
 * @param {Context} context The event context context
 * @param {string} fileName The name of the file to fetch
 * @param {string} ref The ref where the file exists
 * @returns A string containing the file data
 */
exports.fetchFile = function (context, fileName, ref) {
    if (ref === void 0) { ref = context.payload.repository.default_branch; }
    return __awaiter(void 0, void 0, void 0, function () {
        var response, data, err_4, message;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, context.github.repos.getContents(context.repo({
                            branch: ref,
                            path: fileName
                        }))];
                case 1:
                    response = _a.sent();
                    data = response.data;
                    if (data.content && data.type !== 'file') {
                        throw new Error('No content returned or wrong file type.');
                    }
                    return [2 /*return*/, Buffer.from(data.content, 'base64').toString()];
                case 2:
                    err_4 = _a.sent();
                    message = "Unable to fetch " + fileName;
                    common_nodejs_utils_1.logger.error(message + ", error = " + err_4.message);
                    throw new Error(message);
                case 3: return [2 /*return*/];
            }
        });
    });
};
/**
 * Fetch the repo compliance file
 * The compliance file determines what state any policy compliance
 * is currently in.
 * @param {Context} context The event context context
 * @returns A `Promise` containing a `RepoCompliance` object
 */
exports.fetchComplianceFile = function (context) { return __awaiter(void 0, void 0, void 0, function () {
    var content, err_5, message;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                return [4 /*yield*/, exports.fetchFile(context, constants_1.COMMIT_FILE_NAMES.COMPLIANCE)];
            case 1:
                content = _a.sent();
                return [2 /*return*/, js_yaml_1["default"].safeLoad(content)];
            case 2:
                err_5 = _a.sent();
                message = 'Unable to fetch compliance file.';
                common_nodejs_utils_1.logger.error(message + ", error = " + err_5.message);
                throw new Error(message);
            case 3: return [2 /*return*/];
        }
    });
}); };
/**
 * Fetch the repo configuration file
 * The configuration file determines what, if any, cultural policies should
 * be enforced.
 * @param {Context} context The event context context
 * @returns A `Promise` containing a `RepoMountieConfig` object
 */
exports.fetchConfigFile = function (context) { return __awaiter(void 0, void 0, void 0, function () {
    var content, err_6, message;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                return [4 /*yield*/, exports.fetchFile(context, constants_1.REPO_CONFIG_FILE)];
            case 1:
                content = _a.sent();
                return [2 /*return*/, JSON.parse(content)];
            case 2:
                err_6 = _a.sent();
                message = 'Unable to fetch config file.';
                common_nodejs_utils_1.logger.error(message + ", error = " + err_6.message);
                throw new Error(message);
            case 3: return [2 /*return*/];
        }
    });
}); };
/**
 * Check if a label exists in a given context
 * Check if a given label exists in the repo specified by
 * the `context` argument.
 * @param {Context} context The event context context
 * @param {string} labelName The label name to be checked
 * @returns `true` if the label exists, false otherwise.
 */
exports.labelExists = function (context, labelName) { return __awaiter(void 0, void 0, void 0, function () {
    var result, myMatches, err_7, message;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                return [4 /*yield*/, context.github.issues.listLabelsForRepo(context.issue())];
            case 1:
                result = _a.sent();
                if (!result.data) {
                    return [2 /*return*/, false];
                }
                myMatches = result.data.filter(function (item) { return item.name === labelName; });
                return [2 /*return*/, myMatches.length > 0];
            case 2:
                err_7 = _a.sent();
                message = 'Unable to fetch repo labels';
                common_nodejs_utils_1.logger.error(message + ", error = " + err_7.message);
                return [2 /*return*/, false];
            case 3: return [2 /*return*/];
        }
    });
}); };
/**
 * Add a file to a repo via a pull request
 * Adds a file to a repo via a PR based of the
 * master branch.
 * @param {Context} context The event context context
 * @param {string} commitMessage The commit message for the file
 * @param {string} prTitle The title of the pull request
 * @param {string} prBody The message body of the pull request
 * @param {string} srcBranchName The source branch for the pull request
 * @param {string} fileName The name of the file to be added
 * @param {string} fileData The data of the file to be added
 */
exports.addFileViaPullRequest = function (context, commitMessage, prTitle, prBody, srcBranchName, fileName, fileData) { return __awaiter(void 0, void 0, void 0, function () {
    var mainbr, err_8, message;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 5, , 6]);
                return [4 /*yield*/, context.github.git.getRef(context.repo({
                        ref: "heads/" + context.payload.repository.default_branch
                    }))];
            case 1:
                mainbr = _a.sent();
                // Create a branch to commit to commit the license file
                return [4 /*yield*/, context.github.git.createRef(context.repo({
                        ref: "refs/heads/" + srcBranchName,
                        sha: mainbr.data.object.sha
                    }))];
            case 2:
                // Create a branch to commit to commit the license file
                _a.sent();
                // Add the file to the new branch
                return [4 /*yield*/, context.github.repos.createFile(context.repo({
                        branch: srcBranchName,
                        content: Buffer.from(fileData).toString('base64'),
                        message: commitMessage,
                        path: fileName
                    }))];
            case 3:
                // Add the file to the new branch
                _a.sent();
                // Create a PR to merge the licence ref into master
                return [4 /*yield*/, context.github.pulls.create(context.repo({
                        base: context.payload.repository.default_branch,
                        body: prBody,
                        head: srcBranchName,
                        maintainer_can_modify: true,
                        title: prTitle
                    }))];
            case 4:
                // Create a PR to merge the licence ref into master
                _a.sent();
                return [3 /*break*/, 6];
            case 5:
                err_8 = _a.sent();
                message = "Unable to add " + fileName + " file to " + context.payload.repository.name;
                common_nodejs_utils_1.logger.error(message + ", error = " + err_8.message);
                throw err_8;
            case 6: return [2 /*return*/];
        }
    });
}); };
exports.fetchCollaborators = function (context, affiliation) {
    if (affiliation === void 0) { affiliation = "all" /* All */; }
    return __awaiter(void 0, void 0, void 0, function () {
        var results, err_9, message;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, context.github.repos.listCollaborators(context.repo({
                            affiliation: affiliation
                        }))];
                case 1:
                    results = _a.sent();
                    if (!results && !results.data) {
                        return [2 /*return*/, []];
                    }
                    return [2 /*return*/, results.data];
                case 2:
                    err_9 = _a.sent();
                    message = "Unable to lookup collaborators in repo " + context.payload.repository.name;
                    common_nodejs_utils_1.logger.error(message + ", error = " + err_9.message);
                    throw err_9;
                case 3: return [2 /*return*/];
            }
        });
    });
};
exports.fetchPullRequests = function (context, state) {
    if (state === void 0) { state = PullState.All; }
    return __awaiter(void 0, void 0, void 0, function () {
        var results, err_10, message;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, context.github.pulls.list(context.repo({
                            state: state
                        }))];
                case 1:
                    results = _a.sent();
                    if (!results && !results.data) {
                        return [2 /*return*/, []];
                    }
                    return [2 /*return*/, results.data];
                case 2:
                    err_10 = _a.sent();
                    message = "Unable to lookup PRs in repo " + context.payload.repository.name;
                    common_nodejs_utils_1.logger.error(message + ", error = " + err_10.message);
                    throw err_10;
                case 3: return [2 /*return*/];
            }
        });
    });
};
/**
 * Check if a pull request exists
 * Check if pull requests exists with a given title
 * @param {Context} context The event context context
 * @param {string} title The title to look for
 * @param {string} state The state the PR must be in.
 * @returns `true` if if a PR exists, false otherwise.
 */
exports.hasPullRequestWithTitle = function (context, title, state) {
    if (state === void 0) { state = PullState.All; }
    return __awaiter(void 0, void 0, void 0, function () {
        var results, err_11, message;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, exports.fetchPullRequests(context, state)];
                case 1:
                    results = _a.sent();
                    if (results.filter(function (pr) { return pr.title === title; }).length > 0) {
                        return [2 /*return*/, true];
                    }
                    return [2 /*return*/, false];
                case 2:
                    err_11 = _a.sent();
                    message = "Unable to lookup PRs in repo " + context.payload.repository.name;
                    common_nodejs_utils_1.logger.error(message + ", error = " + err_11.message);
                    throw err_11;
                case 3: return [2 /*return*/];
            }
        });
    });
};
/**
 * Assign GitHub users to an issue
 * @param context The `Context` containing the GH issue.
 * @param assignees An `Array` of users to assign to the issue
 */
exports.assignUsersToIssue = function (context, assignees, params) {
    if (params === void 0) { params = undefined; }
    return __awaiter(void 0, void 0, void 0, function () {
        var aParams, err_12, message;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    aParams = params ? params : context.issue({ assignees: assignees });
                    return [4 /*yield*/, context.github.issues.addAssignees(aParams)];
                case 1:
                    _a.sent();
                    return [3 /*break*/, 3];
                case 2:
                    err_12 = _a.sent();
                    message = 'Unable to assign user to issue.';
                    common_nodejs_utils_1.logger.error(message + ", error = " + err_12.message);
                    throw err_12;
                case 3: return [2 /*return*/];
            }
        });
    });
};
/**
 * Update the contents of a file or create it if non-existent.
 * This fn updates the contents of a file by creating a commit
 * with the appropriate changes.
 * @param {Context} context The event context context
 * @param {string} fileName The name of the file to lookup
 * @returns undefined if successful, throws otherwise
 */
exports.updateFileContent = function (context, commitMessage, srcBranchName, fileName, fileData, fileSHA) { return __awaiter(void 0, void 0, void 0, function () {
    var err_13, message;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                return [4 /*yield*/, context.github.repos.createOrUpdateFile(context.repo({
                        branch: srcBranchName,
                        content: Buffer.from(fileData).toString('base64'),
                        message: commitMessage,
                        path: fileName,
                        sha: fileSHA
                    }))];
            case 1:
                _a.sent();
                return [3 /*break*/, 3];
            case 2:
                err_13 = _a.sent();
                message = 'Unable to update file.';
                common_nodejs_utils_1.logger.error(message + ", error = " + err_13.message);
                throw err_13;
            case 3: return [2 /*return*/];
        }
    });
}); };
/**
 * Check if a user is member of an organization
 * This fn will check if the given user ID belongs to the
 * organization in the given context.
 * @param {Context} context The query context
 * @param {string} userID The GitHub ID of the user
 * @returns True if the user is a member, false otherwise
 */
exports.isOrgMember = function (context, userID) { return __awaiter(void 0, void 0, void 0, function () {
    var response, message, err_14, message;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                return [4 /*yield*/, context.github.orgs.checkMembership({
                        org: context.payload.organization.login,
                        username: userID
                    })];
            case 1:
                response = _a.sent();
                if (response.status === 204 || response.status === 302) {
                    // 204 No Content - The user is a member;
                    // 302 Found      - TBD
                    return [2 /*return*/, true];
                }
                message = 'Unexpected return code looking up user';
                common_nodejs_utils_1.logger.info(message + ", code = " + response.status);
                return [2 /*return*/, false];
            case 2:
                err_14 = _a.sent();
                // 404 Not Found  - The user is not a member of the org.
                if (err_14.code === 404) {
                    return [2 /*return*/, false];
                }
                message = 'Unable to lookup user';
                common_nodejs_utils_1.logger.error(message + ", error = " + err_14.message);
                throw err_14;
            case 3: return [2 /*return*/];
        }
    });
}); };
/**
 * Add a comment to an issue
 * This fn will add a comment to a given issue
 * @param {Context} context The query context
 * @param {string} body The comment body
 * @returns Undefined if successful, thrown error otherwise
 */
exports.addCommentToIssue = function (context, body) { return __awaiter(void 0, void 0, void 0, function () {
    var err_15, message;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                return [4 /*yield*/, context.github.issues.createComment(context.issue({
                        body: body
                    }))];
            case 1:
                _a.sent();
                return [3 /*break*/, 3];
            case 2:
                err_15 = _a.sent();
                message = 'Unable to add comment to issue.';
                common_nodejs_utils_1.logger.error(message + ", error = " + err_15.message);
                throw err_15;
            case 3: return [2 /*return*/];
        }
    });
}); };
exports.blarb = function (context, fileName, ref) {
    if (ref === void 0) { ref = context.payload.repository.default_branch; }
    return __awaiter(void 0, void 0, void 0, function () {
        var commits, err_16, message;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, context.github.repos.listCommits(context.repo({
                            path: fileName,
                            sha: ref
                        }))];
                case 1:
                    commits = (_a.sent())
                        .data
                        .sort(function (a, b) {
                        return (new Date(b.commit.committer.date)).getTime() - (new Date(a.commit.committer.date)).getTime();
                    })
                        .slice(-2);
                    if (commits.length <= 1) {
                        // no change or they probably have not merged the initial the PR yet.
                        // This status will be picked up a different way.
                        return [2 /*return*/];
                    }
                    return [3 /*break*/, 3];
                case 2:
                    err_16 = _a.sent();
                    message = 'Unable to add comment to issue.';
                    common_nodejs_utils_1.logger.error(message + ", error = " + err_16.message);
                    throw err_16;
                case 3: return [2 /*return*/];
            }
        });
    });
};
