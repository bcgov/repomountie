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