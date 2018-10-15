def sonarqubePodLabel = "prc-api-${UUID.randomUUID().toString()}"
podTemplate(label: sonarqubePodLabel, name: sonarqubePodLabel, serviceAccount: 'jenkins', cloud: 'openshift', containers: [
  containerTemplate(
    name: 'jnlp',
    image: '172.50.0.2:5000/openshift/jenkins-slave-python3nodejs',
    resourceRequestCpu: '500m',
    resourceLimitCpu: '1000m',
    resourceRequestMemory: '1Gi',
    resourceLimitMemory: '4Gi',
    workingDir: '/tmp',
    command: '',
    args: '${computer.jnlpmac} ${computer.name}',
    envVars: [
      envVar(key: 'SONARQUBE_URL', value: 'https://sonarqube-prc-tools.pathfinder.gov.bc.ca')
    ]
  )
]) {
  node(sonarqubePodLabel) {
    stage('checkout code') {
      checkout scm
    }
    stage('exeucte sonar') {
      SONARQUBE_URL = sh (
        script: 'oc get routes -o wide --no-headers | awk \'/sonarqube/{ print match($0,/edge/) ?  "https://"$2 : "http://"$2 }\'',
        returnStdout: true
      ).trim()
      dir('sonar-runner') {
        try {
          // sh returnStdout: true, script: "./gradlew sonarqube -Dsonar.host.url=${SONARQUBE_URL} -Dsonar.verbose=true --stacktrace --info -Dsonar.projectName=${APP_NAME} -Dsonar.branch=${GIT_BRANCH_NAME} -Dsonar.projectKey=org.sonarqube:${APP_NAME} -Dsonar.sources=.."
          sh "./gradlew sonarqube -Dsonar.host.url=${SONARQUBE_URL} -Dsonar.verbose=true --stacktrace --info"
        } finally {
  
        }
      }
    }
  }
}

pipeline {
  agent none
  options {
    disableResume()
  }
  environment {
    OCP_PIPELINE_CLI_URL = 'https://raw.githubusercontent.com/BCDevOps/ocp-cd-pipeline/v0.0.4/src/main/resources/pipeline-cli'
    OCP_PIPELINE_VERSION = '0.0.4'
  }
  stages {
    stage('Build') {
      agent { label 'build' }
      steps {
        echo "Aborting all running jobs ..."
      }
    }
  }
}