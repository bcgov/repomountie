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

import groovy.json.JsonOutput

def APP_NAME = 'repo-mountie'
def BUILD_CONFIG_BASE_NAME = 'repo-mountie'
def IMAGESTREAM_NAME = APP_NAME
def TAG_NAMES = ['dev', 'test', 'prod']
def PIRATE_ICO = 'http://icons.iconarchive.com/icons/aha-soft/torrent/64/pirate-icon.png'
def JENKINS_ICO = 'https://wiki.jenkins-ci.org/download/attachments/2916393/logo.png'
def OPENSHIFT_ICO = 'https://commons.wikimedia.org/wiki/File:OpenShift-LogoType.svg'
def SLACK_CHANNEL = '${SLACK_CHANNEL}'
def GIT_BRANCH_NAME = 'master'

def notifySlack(text, channel, url, attachments, icon) {
    def slackURL = url
    def jenkinsIcon = icon
    def payload = JsonOutput.toJson([text: text,
        channel: channel,
        username: "Jenkins",
        icon_url: jenkinsIcon,
        attachments: attachments
    ])
    sh "curl -s -S -X POST --data-urlencode \'payload=${payload}\' ${slackURL}"
}

// See https://github.com/jenkinsci/kubernetes-plugin
podTemplate(label: "${APP_NAME}-node-build", name: "${APP_NAME}-node-build", serviceAccount: 'jenkins', cloud: 'openshift', containers: [
  containerTemplate(
    name: 'jnlp',
    image: 'docker-registry.default.svc:5000/openshift/jenkins-slave-nodejs:8',
    resourceRequestCpu: '500m',
    resourceLimitCpu: '1000m',
    resourceRequestMemory: '1Gi',
    resourceLimitMemory: '2Gi',
    workingDir: '/tmp',
    command: '',
    args: '${computer.jnlpmac} ${computer.name}',
    alwaysPullImage: false,
    envVars: [
      envVar(key: 'NODE_ENV', value: 'test'),
      // envVar(key: 'SESSION_SECRET', value: 'helloworld'),
      // secretEnvVar(key: 'SLACK_TOKEN', secretName: 'slack', secretKey: 'token')
      ]
  )
]) {
  node("${APP_NAME}-node-build") {

    SLACK_TOKEN = sh (
      script: """oc get secret/slack -o template --template="{{.data.token}}" | base64 --decode""",
      returnStdout: true).trim()

    stage('Checkout') {
      echo "Checking out source"
      checkout scm

      GIT_COMMIT_SHORT_HASH = sh (
        script: """git describe --always""",
        returnStdout: true).trim()
      GIT_COMMIT_AUTHOR = sh (
        script: """git show -s --pretty=%an""",
        returnStdout: true).trim()
    }
    
    stage('Steup') {
      echo "Setup: ${BUILD_ID}"

      sh "node -v"
      sh "npm -v"
      sh "npm ci"
    }
    
    stage('Test') {
      echo "Testing: ${BUILD_ID}"

      script {
        //
        // Check the code builds
        //

        try {
          echo "Checking Build"
          sh "npm run build"
        } catch (error) {
          // def attachment = [:]
          // attachment.fallback = 'See build log for more details'
          // attachment.title = "API Build ${BUILD_ID} FAILED! :face_with_head_bandage: :hankey:"
          // attachment.color = '#CD0000' // Red
          // attachment.text = "The code does not build.\ncommit ${GIT_COMMIT_SHORT_HASH} by ${GIT_COMMIT_AUTHOR}"
          // // attachment.title_link = "${env.BUILD_URL}"

          // notifySlack("${APP_NAME}, Build #${BUILD_ID}", "${SLACK_CHANNEL}", "https://hooks.slack.com/services/${SLACK_TOKEN}", [attachment], JENKINS_ICO)
          // sh "exit 1001"
        }

        //
        // Check code quality
        //

        try {
          echo "Checking code quality with SonarQube"
          SONARQUBE_URL = sh (
              script: 'oc get routes -o wide --no-headers | awk \'/sonarqube/{ print match($0,/edge/) ?  "https://"$2 : "http://"$2 }\'',
              returnStdout: true
                ).trim()
          echo "SONARQUBE_URL: ${SONARQUBE_URL}"
          dir('sonar-runner') {
            sh returnStdout: true, script: "./gradlew sonarqube -Dsonar.host.url=${SONARQUBE_URL} -Dsonar.verbose=true --stacktrace --info -Dsonar.projectName=${APP_NAME} -Dsonar.branch=${GIT_BRANCH_NAME} -Dsonar.projectKey=org.sonarqube:${APP_NAME} -Dsonar.sources=.."
          }
        } catch (error) {
          // def attachment = [:]
          // attachment.fallback = 'See build log for more details'
          // attachment.title = "API Build ${BUILD_ID} WARNING! :unamused: :zany_face: :facepalm:"
          // attachment.color = '#FFA500' // Orange
          // attachment.text = "The SonarQube code quality check failed.\ncommit ${GIT_COMMIT_SHORT_HASH} by ${GIT_COMMIT_AUTHOR}"
          // // attachment.title_link = "${env.BUILD_URL}"

          // notifySlack("${APP_NAME}, Build #${BUILD_ID}", "${SLACK_CHANNEL}", "https://hooks.slack.com/services/${SLACK_TOKEN}", [attachment], JENKINS_ICO)
        }

        //
        // Check code quality with a LINTer
        //

        try {
          echo "Checking code quality with LINTer"
          sh "npm run test:lint"
        } catch (error) {
          // def attachment = [:]
          // attachment.fallback = 'See build log for more details'
          // attachment.title = "API Build ${BUILD_ID} WARNING! :unamused: :zany_face: :facepalm:"
          // attachment.color = '#FFA500' // Orange
          // attachment.text = "There LINTer code quality check failed.\ncommit ${GIT_COMMIT_SHORT_HASH} by ${GIT_COMMIT_AUTHOR}"
          // // attachment.title_link = "${env.BUILD_URL}"

          // notifySlack("${APP_NAME}, Build #${BUILD_ID}", "${SLACK_CHANNEL}", "https://hooks.slack.com/services/${SLACK_TOKEN}", [attachment], JENKINS_ICO)
        }

        //
        // Run a security check on our packages
        //

        // try {
        //   echo "Checking dependencies for security issues"
        //   sh "npx nsp check"
        // } catch (error) {
        //   // def output = readFile('nsp-report.txt').trim()
        //   def attachment = [:]
        //   attachment.fallback = 'See build log for more details'
        //   attachment.title = "API Build ${BUILD_ID} WARNING! :unamused: :zany_face: :facepalm:"
        //   attachment.color = '#FFA500' // Orange
        //   attachment.text = "There are security warnings related to some packages.\ncommit ${GIT_COMMIT_SHORT_HASH} by ${GIT_COMMIT_AUTHOR}"

        //   notifySlack("${APP_NAME}, Build #${BUILD_ID}", "${SLACK_CHANNEL}", "https://hooks.slack.com/services/${SLACK_TOKEN}", [attachment], JENKINS_ICO)
        // }

        //
        // Run our unit tests et al.
        //

        try {
          echo "Running Unit Tests"
          sh "npm test"
        } catch (error) {
          // def attachment = [:]
          // attachment.fallback = 'See build log for more details'
          // attachment.title = "API Build ${BUILD_ID} FAILED! :face_with_head_bandage: :hankey:"
          // attachment.color = '#CD0000' // Red
          // attachment.text = "There are issues with the unit tests.\ncommit ${GIT_COMMIT_SHORT_HASH} by ${GIT_COMMIT_AUTHOR}"
          // // attachment.title_link = "${env.BUILD_URL}"

          // notifySlack("${APP_NAME}, Build #${BUILD_ID}", "${SLACK_CHANNEL}", "https://hooks.slack.com/services/${SLACK_TOKEN}", [attachment], JENKINS_ICO)
          // sh "exit 1001"
        }
      }
    }

    stage('Image Build') {
       try {
        echo "Build: ${BUILD_ID}"

        // run the oc build to package the artifacts into a docker image
        def BUILD_CONFIG = "${BUILD_CONFIG_BASE_NAME}-${GIT_BRANCH_NAME}-build"
        openshiftBuild bldCfg: BUILD_CONFIG, showBuildLogs: 'true', verbose: 'true'

        // Don't tag with BUILD_ID so the pruner can do it's job; it won't delete tagged images.
        // Tag the images for deployment based on the image's hash
        IMAGE_HASH = sh (
          script: """oc get istag ${IMAGESTREAM_NAME}:latest -o template --template=\"{{.image.dockerImageReference}}\"|awk -F \":\" \'{print \$3}\'""",
          returnStdout: true).trim()
        echo ">> IMAGE_HASH: ${IMAGE_HASH}"

        // def attachment = [:]
        // def message = "Another huge sucess; A freshly minted build is being deployed and will be available shortly."
        // message = message + "\ncommit ${GIT_COMMIT_SHORT_HASH} by ${GIT_COMMIT_AUTHOR}"
        // attachment.title = "API Build ${BUILD_ID} OK! :heart: :tada:"
        // attachment.fallback = 'See build log for more details'
        // attachment.color = '#00FF00' // Lime Green

        // if( "master" != GIT_BRANCH_NAME.toLowerCase() ) {
        //   def action = [:]
        //   message = message + "\nThis image can be promoted to the *test* environment"
        //   action.type = "button"
        //   action.text = "Promote Image? :rocket:"
        //   action.url = "https://jenkins-devex-mpf-secure-tools.pathfinder.gov.bc.ca/job/devex-mpf-secure-tools/job/devex-mpf-secure-tools-api-develop-pipeline/${BUILD_ID}/input"
        //   attachment.actions = [action]
        // }
        // attachment.text = message

        // notifySlack("${env.JOB_NAME}", "${SLACK_CHANNEL}", "https://hooks.slack.com/services/${SLACK_TOKEN}", [attachment], JENKINS_ICO)

        // if( "master" == GIT_BRANCH_NAME.toLowerCase() ) {
        //   openshiftTag destStream: IMAGESTREAM_NAME, verbose: 'true', destTag: TAG_NAMES[2], srcStream: IMAGESTREAM_NAME, srcTag: "${IMAGE_HASH}"
        //   notifySlack("Promotion Completed\n Build #${BUILD_ID} is promoted to the *prod* environment.", "${SLACK_CHANNEL}", "https://hooks.slack.com/services/${SLACK_TOKEN}", [], OPENSHIFT_ICO)
        //   echo "Applying tag ${TAG_NAMES[2]} to image ${IMAGE_HASH}"
        // } else {
          openshiftTag destStream: IMAGESTREAM_NAME, verbose: 'true', destTag: TAG_NAMES[0], srcStream: IMAGESTREAM_NAME, srcTag: "${IMAGE_HASH}"
          echo "Applying tag ${TAG_NAMES[0]} to image ${IMAGE_HASH}"
        // }
      } catch (error) {
        // echo "Unable complete build, error = ${error}"

        // def attachment = [:]
        // attachment.fallback = 'See build log for more details'
        // attachment.title = "API Build ${BUILD_ID} FAILED! :face_with_head_bandage: :hankey:"
        // attachment.color = '#CD0000' // Red
        // attachment.text = "There are issues with OpenShift build.\ncommit ${GIT_COMMIT_SHORT_HASH} by ${GIT_COMMIT_AUTHOR}"

        // notifySlack("${env.JOB_NAME}, Build #${BUILD_ID}", "${SLACK_CHANNEL}", "https://hooks.slack.com/services/${SLACK_TOKEN}", [attachment], JENKINS_ICO)
        // sh "exit 1002"
      }
    }
  }
  // if( "master" != GIT_BRANCH_NAME.toLowerCase() ) {
  //   stage('Approval') {
  //     timeout(time: 1, unit: 'DAYS') {
  //       input message: "Deploy to test?", submitter: 'jleach-admin'
  //     }
  //     node ('master') {
  //       stage('Promotion') {
  //         openshiftTag destStream: IMAGESTREAM_NAME, verbose: 'true', destTag: TAG_NAMES[1], srcStream: IMAGESTREAM_NAME, srcTag: "${IMAGE_HASH}"
  //         notifySlack("Promotion Completed\n Build #${BUILD_ID} was promoted to *test*.", "${SLACK_CHANNEL}", "https://hooks.slack.com/services/${SLACK_TOKEN}", [], OPENSHIFT_ICO)
  //       }
  //     }  
  //   }
  // }
}
