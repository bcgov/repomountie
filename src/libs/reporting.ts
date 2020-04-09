import { logger } from '@bcgov/common-nodejs-utils';
import { Context } from 'probot';
import { fetchComplianceFile } from './ghutils';
import { extractComplianceStatus } from './utils';


export const fetchComplianceMetrics = async (context: Context): Promise<void> => {
    const repo = context.payload.repository.name;

    // this block of code is for reporting purposes only.
    try {
        const data = await fetchComplianceFile(context);
        const doc = extractComplianceStatus(repo,
            context.payload.installation.account.login, data);

        await doc.save();
    } catch (err) {
        const message = `Unable to check compliance in repository ${repo}`;
        logger.error(`${message}, error = ${err.message}`);
    }
};
