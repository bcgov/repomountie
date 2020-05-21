import { logger } from '@bcgov/common-nodejs-utils';
import { intersection } from 'lodash';
import { Context } from 'probot';
import { MINISTRY_SHORT_CODES } from '../constants';
import { fetchComplianceFile } from './ghutils';
import { extractComplianceStatus } from './utils';

export const fetchComplianceMetrics = async (
    context: Context, owner: string, repo: string,
): Promise<void> => {
    // this block of code is for reporting purposes only.
    try {

        const listTopicsResponse = await context.github.repos.listTopics({
            owner,
            repo,
        });

        const topics = listTopicsResponse.data.names ? listTopicsResponse.data.names : [];
        const myTopics = intersection(MINISTRY_SHORT_CODES.map(c => c.toLowerCase()), topics);
        const data = await fetchComplianceFile(context);
        const doc = extractComplianceStatus(repo,
            context.payload.installation.account.login, myTopics, data);

        await doc.save();
    } catch (err) {
        const message = `Unable to check compliance in repository ${repo}`;
        logger.error(`${message}, error = ${err.message}`);
    }
};
