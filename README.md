<a href="https://codeclimate.com/github/bcgov/repomountie/maintainability"><img src="https://api.codeclimate.com/v1/badges/a62462e3e0a6843c3778/maintainability" />&nbsp;&nbsp;&nbsp;</a><a href="https://codeclimate.com/github/bcgov/repomountie/test_coverage"><img src="https://api.codeclimate.com/v1/badges/a62462e3e0a6843c3778/test_coverage" /></a>

## About

The _repomountie_ is a GitHup application (bot) help ensure cultural niceties are respected.

## Usage

### Local Development

To run the bot locally ensure you have a `.env` file in the project root; see `env.example` for required contents. Once your environment is setup run the following command:

```console
npm run build && npm start
```

\* Pro Tip: You can generate a webhook secret with the command:

```console
openssl rand -hex 20
```

\* Pro Tip: Log levels are _trace_, _debug_ or _info_.

\* Pro Tip: You can use `smee.io` or perhaps `ngrok` to proxy GitHub events.

### Build

Use the OpenShift `build.json` template in this repo with the following (sample) command. The build is meant to be a CI process to confirm that a build can happen without error, that no code quality, security or test errors occur.

\* See the `build.json` template for other _optional_ parameters.

\*\* To build multiple branches you'll use the config file multiple times. This will create errors from the `oc` command output that can safely be ignored. For example: `Error from server (AlreadyExists): secrets "github" already exists`

// TODO:(jl) Add sample `oc` command.

### Deployment (OpenShift)

Use the OpenShift `deploy.json` template in this repo with the following (sample) command to build an environment (namesapce) and deploy the code and dependencies:

```console
oc process -f openshift/templates/deploy.json \
-p NAMESPACE=devhub-dev \
-p GITHUB_APP_ID=19327 \
-p GITHUB_WEBHOOK_SECRET_VALUE=432bbe0466fda25cb55b4cee143eb9aaf3e7d8e6 \
-p GITHUB_APP_PRIVATE_KEY_VALUE=$GITHUB_KEY \
-p NODE_ENV=production \
-p IMAGE_TAG=test | oc create -f -
```

| Parameter      | Optional | Description                     |
| -------------- | -------- | ------------------------------- |
| APP_ID         | NO       | The GitHub APP ID               |
| WEBHOOK_SECRET | NO       | The GitHub Webhook secret       |
| PRIVATE_KEY    | NO       | The GiHub App private key       |
| LOG_LEVEL      | YES      | Default `debug`                 |
| NODE_ENV       | NO       | The node.js environment         |
| IMAGE_TAG      | NO       | Image tag to trigger deployment |

\* See the `deploy.json` template for other _optional_ parameters.

## Project Status / Goals / Roadmap

This project is **active**.

Progress to date, known issues, or new features will be documented in the `issues` section of this repo.

## Getting Help or Reporting an Issue

Use the GitHub repo to create issues as needed.

## How to Contribute

_If you are including a Code of Conduct, make sure that you have a [CODE_OF_CONDUCT.md](SAMPLE-CODE_OF_CONDUCT.md) file, and include the following text in here in the README:_
"Please note that this project is released with a [Contributor Code of Conduct](CODE_OF_CONDUCT.md). By participating in this project you agree to abide by its terms."

## License

Detailed guidance around licenses is available
[here](/BC-Open-Source-Development-Employee-Guide/Licenses.md)

Attach the appropriate LICENSE file directly into your repository before you do anything else!

The default license For code repositories is: Apache 2.0

Here is the boiler-plate you should put into the comments header of every source code file as well as the bottom of your README.md:

    Copyright 2018 Province of British Columbia

    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.

For repos that are made up of docs, wikis and non-code stuff it's Creative Commons Attribution 4.0 International, and should look like this at the bottom of your README.md:

<a rel="license" href="http://creativecommons.org/licenses/by/4.0/"><img alt="Creative Commons Licence" style="border-width:0" src="https://i.creativecommons.org/l/by/4.0/80x15.png" /></a><br /><span xmlns:dct="http://purl.org/dc/terms/" property="dct:title">YOUR REPO NAME HERE</span> by <span xmlns:cc="http://creativecommons.org/ns#" property="cc:attributionName">the Province of Britich Columbia</span> is licensed under a <a rel="license" href="http://creativecommons.org/licenses/by/4.0/">Creative Commons Attribution 4.0 International License</a>.

and the code for the cc 4.0 footer looks like this:

    <a rel="license" href="http://creativecommons.org/licenses/by/4.0/"><img alt="Creative Commons Licence"
    style="border-width:0" src="https://i.creativecommons.org/l/by/4.0/80x15.png" /></a><br /><span
    xmlns:dct="http://purl.org/dc/terms/" property="dct:title">YOUR REPO NAME HERE</span> by <span
    xmlns:cc="http://creativecommons.org/ns#" property="cc:attributionName">the Province of Britich Columbia
    </span> is licensed under a <a rel="license" href="http://creativecommons.org/licenses/by/4.0/">
    Creative Commons Attribution 4.0 International License</a>.

[export-xcarchive]: https://github.com/bcdevops/mobile-cicd-api/raw/develop/doc/images/export-xcarchive.gif 'Prepare & Export xcarchive'
Test
