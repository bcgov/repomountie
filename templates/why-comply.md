## TL;DR 🏎️

Your repo is missing a compliance audit file so I've created this PR with a **template** that you can update with the correct PIA and STRA status (status options in the table below). If you'd like me to do this for you, skip to the _commands_ section below.

## Compliance

Projects in our organization (bcgov) need to complete a [Privacy Impact Assessment][2] (PIA) and Security Threat & Risk Assessment (STRA) before they go live in production. Since every ministry has their own way of doing both the STRA and PIA we don't enforce that projects do them, only that they report on the current status.

To help with reporting, I've added a compliance audit file as part of this pull request. Please checkout this branch and edit update `status` as needed. Here is a table of possible states:

| Status      | Description                                                                                            |
| ----------- | :----------------------------------------------------------------------------------------------------- |
| TBD         | If you're surprised by this news, use this state. I'll let you talk to your MISO and check back later. |
| in-progress | Use this state when your assessment(s) are underway. |
| completed   | Use this state when your assessment(s) are completed. 🙌 🎉 |
| not-required      | You have consulted with your MISO or Privacy Officer and they  agree that no PIA or STRA is required.|

Here is what a completed audit file might look like:

```yaml
name: compliance
description: |
  This document is used to track a projects PIA and STRA
  compliance.
spec:
  - name: PIA
    status: in-progress
    last-updated: '2019-11-22T00:03:52.138Z'
  - name: STRA
    status: completed
    last-updated: '2019-11-22T00:03:52.138Z'
```

For more information check out the [BC Policy Framework for GitHub][1].

### Pro Tip 🤓

- If you're not sure what to do **add a comment below** with the command **@repo-mountie help** in it; a real-live-person will reply back to help you out.
- Leverage this PR to document the history of your PIA and STRA thus far by adding a comment or two.

### Commands 🤖

I can update the status of the PIA and STRA for you; **you'll** just need to merge the PR when I'm done. You can find the available `status` values in the table above. Below are some commands I understand:

| Command                          | Description                                       |
| :------------------------------- | :------------------------------------------------ |
| @repo-mountie help               | You're freaking out and want to talk to a person. |
| @repo-mountie update-pia STATUS  | You want me to update the PIA status.             |
| @repo-mountie update-stra STATUS | You want me to update the STRA status.            |

#### Examples

```console
@repo-mountie update-pia completed
@repo-mountie update-stra in-progress
```

[1]: https://github.com/bcgov/BC-Policy-Framework-For-GitHub/tree/master/BC-Open-Source-Development-Employee-Guide
[2]: https://www2.gov.bc.ca/gov/content/governments/services-for-government/information-management-technology/privacy/privacy-impact-assessments
