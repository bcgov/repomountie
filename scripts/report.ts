import { logger } from '@bcgov/common-nodejs-utils';
import Octokit from '@octokit/rest';
import fs from 'fs';
import yaml from 'js-yaml';
import moment from 'moment';
import { COMMIT_FILE_NAMES, MINISTRY_SHORT_CODES } from '../src/constants';

const org = 'bcgov';
const outDir = 'report';
const token = process.env.GITHUB_TOKEN;

if (!token) {
  logger.error('You must set a github token to use this script');
  logger.error('export GITHUB_TOKEN=<YOUR_TOKEN_HERE>');

  process.exit(1);
}

const fetchAllRepos = async (
  octokit: any, owner: string, recordsPerPage: number = 100, startingPage: number = 1
): Promise<any[]> => {

  try {
    let more = false;
    let repos: any[] = [];
    let currentPage: number = startingPage;

    do {
      const results = await octokit.repos.listForOrg({
        org: owner,
        per_page: recordsPerPage,
        page: currentPage,
        type: 'all',
      });

      if (results.status !== 200) {
        logger.info(`WARNING: Unexpected return code while fetching repos.`);
      }

      repos = repos.concat(results.data);
      more = results.data.length > 0;
      currentPage++;

    } while (more);

    return repos;
  } catch (err) {
    logger.error(`Unable to fetch all repos for org ${owner}`);

    return [];
  }
};

const fetchFileContent = async (
  octokit: any, owner: string, repo: string, path: string
): Promise<Buffer | undefined> => {

  try {
    const response = await octokit.repos.getContents(
      {
        owner,
        repo,
        path,
      }
    );

    const data: any = response.data;

    if (data.content && data.type !== 'file') {
      throw new Error('No content returned or wrong file type.');
    }

    return Buffer.from(data.content, 'base64');
  } catch (err) {
    logger.info(`The repo ${repo} does not does not contain ${path}`);

    return;
  }
};

const fetchOrgCodesForRepo = async (octokit: any, repo: string): Promise<string[]> => {

  try {
    const response = await octokit.repos.listTopics({
      owner: org,
      repo,
    });
    const { names } = response.data;

    return MINISTRY_SHORT_CODES.filter(c => names.includes(c.toLowerCase()));
  } catch (err) {
    const message = `Unable to fetch topics for repo ${repo}`;
    logger.error(`${message}, error = ${err.message}`);

    return [];
  }
}

const formatAsCSV = (records: any[]): string[] => {

  const header = ['repoName'];
  const data: any = []
  for (const r of records) {
    const { repo, spec } = r;
    const lines: any = [];

    for (const s of spec.sort((a, b) => {
      return a.name.localeCompare(b.name);
    })) {
      const { name, status } = s;
      const lastUpdated = s['last-updated'];

      if (!header.includes(`${name}Status`) && !header.includes(`${name}UpdatedAt`)) {
        header.push(`${name}Status`);
        header.push(`${name}UpdatedAt`);
      }

      lines.push(`${status},${moment(lastUpdated).format('MM/DD/YY')}`);
    }

    data.push(header.join(','));
    data.push(`${repo},${lines.join(',')}`);
  }

  return data;
};

const writeOutReport = (data: any) => {

  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir);
  }

  Object.keys(data).forEach((k) => {
    const temp = formatAsCSV(data[k]);
    fs.writeFileSync(`./${outDir}/${k}.csv`, temp.join('\n'));
  });
};

const main = async () => {
  const data = {};
  const stats = {
    missingMinistryCode: 0,
    missingComplianceFile: 0,
    hasManyMinistryCode: 0,
  };

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const octokit = new Octokit({
    auth: token,
  });

  const repos = await fetchAllRepos(octokit, org);

  for (const r of repos) {

    const orgCodes = await fetchOrgCodesForRepo(octokit, r.name);
    if (orgCodes.length > 1) {
      logger.info(`WARNING: The repo ${r.name} has multiple org codes.`);
      logger.info(`         ${orgCodes}`);
      logger.info(`         Skipping...`);

      stats.hasManyMinistryCode++;

      continue;
    }

    const myOrgCode = orgCodes.pop();

    if (!myOrgCode) {
      logger.info(`The repo ${r.name} does not have a ministry code.`);
      stats.missingMinistryCode++;

      continue;
    }

    if (!data.hasOwnProperty(myOrgCode)) {
      data[myOrgCode] = [];
    }

    const buff = await fetchFileContent(octokit, org, r.name, COMMIT_FILE_NAMES.COMPLIANCE);
    if (!buff) {
      stats.missingComplianceFile++;

      continue;
    }

    const doc = yaml.safeLoad(buff.toString());
    data[myOrgCode].push({
      repo: r.name,
      spec: doc.spec,
    });
  }

  writeOutReport(data);

  logger.info('Statistics')
  logger.info(`* ${repos.length} repos were processed for ${org}.`);
  logger.info(`* ${stats.missingComplianceFile} repos missing a compliance file.`);
  logger.info(`* ${stats.missingMinistryCode} repos missing a ministry code.`);
  logger.info(`* ${stats.hasManyMinistryCode} repos have multiple a ministry codes.`);
}

main();
