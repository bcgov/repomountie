//
// Repo Mountie
//
// Copyright © 2018 Province of British Columbia
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
// Created by Jason Leach on 2018-10-15.
//

// import { Application } from 'probot';
// import { default as request } from 'supertest';
// import robot from '../src';

describe('Additional routes', () => {
  // let app;

  beforeEach(() => {
    // const github = {};
    // app = new Application();
    // app.load(robot);
    // app.app = () => 'Token';
    // app.auth = () => Promise.resolve(github);
  });

  // Testing additional routes is under construction
  // https://github.com/probot/probot/issues/699
  test.skip('Health check probe should return OK', async () => {
    // await request(app.server)
    //   .get('/bot/ehlo')
    //   .expect(200); // Ok
  });
});
