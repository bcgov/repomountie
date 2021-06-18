//
// Copyright © 2018, 2020 Province of British Columbia
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
// Created by Jon Langlois on 2021-05-12.
//

import template from 'lodash/template';

describe('Template Snapshots', () => {
  it('Process template for inactive repository issues', async () => {
    // Can not load templates because FS is mocked for speed in
    // unit testing.
    const inactiveIssueText =
      'Bla <%- daysInactive %> days. Blarb <%- daysInactiveLimit %> days.';

    expect(
      template(inactiveIssueText)({
        daysInactive: 14,
        daysInactiveLimit: 7,
      })
    ).toMatchSnapshot();
  });
});
