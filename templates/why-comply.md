Projects in the Government of British Columbia (BCGov) all need to complete a Privacy Assessment (PIA) and Security Threat & Risk Assessment (STRA). Every ministry has their own way to complete both the STRA and PIA so we don't enforce that projects do them, only that they report on the current status.

To help with reporting, I've added a compliance audit file as part of this pull request. You just need to updated it to indicate the status of both assessments. Here is a table of possible states:

| State       | Description                                                                                            |
| ----------- | :----------------------------------------------------------------------------------------------------- |
| TBD         | If you're surprised by this news, use this state. I'll let you talk to your MISO and check back later. |
| in-progress | Use this state when your assessment(s) are underway.                                                   |
| completed   | Use this state when your assessment(s) are completed. 🙌 🎉                                            |

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

- If you're not sure what to do **add a comment below** with the word **help** in it; a real-live-person will reply back to help you out.

[1]: https://github.com/bcgov/BC-Policy-Framework-For-GitHub/tree/master/BC-Open-Source-Development-Employee-Guide
