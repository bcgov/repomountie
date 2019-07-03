//
// Code Signing
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
// Created by Jason Leach on 2018-02-01.
//

def BUILD_CONFIG_BASE_NAME = 'repo-mountie'
def GIT_BRANCH_NAME = 'master'

pipeline {
    agent none
    options {
        disableResume()
    }
    stages {
        stage('Build') {
            agent { label 'build' }
            steps {
                echo "Aborting all running jobs ..."
                script {
                    abortAllPreviousBuildInProgress(currentBuild)
                }

                echo "Building ..."
                script { 
                  def BUILD_CONFIG = "${BUILD_CONFIG_BASE_NAME}-${GIT_BRANCH_NAME}-build"
                  // openshiftBuild bldCfg: BUILD_CONFIG, showBuildLogs: 'true', verbose: 'true'
                  tar -cf artifact.tar .
                  oc start-build secure-image-api-build --from-archive=artifact.tar --follow --wait
                }
            }
        }
        // stage('Deploy (DEV)') {
        //     agent { label 'deploy' }
        //     steps {
        //         echo "Deploying ..."
        //         sh "cd .pipeline && ./npmw ci && ./npmw run deploy -- --pr=${CHANGE_ID} --env=dev"
        //     }
        // }
    }
}
