pipeline {
  agent { label 'waypoint-private-runner' }
  options { disableConcurrentBuilds(); timestamps(); timeout(time: 120, unit: 'MINUTES') }
  parameters {
    string(name: 'ECR_REGISTRY', defaultValue: '', description: 'Verified Singapore ECR registry')
    string(name: 'DELIVERY_ROLE_ARN', defaultValue: '', description: 'Terraform delivery role; runner needs sts:AssumeRole')
    string(name: 'API_BASE_URL', defaultValue: '', description: 'Verified HTTPS API URL including /api')
    booleanParam(name: 'REQUEST_RELEASE', defaultValue: false, description: 'Request publication and deployment approvals after tests')
  }
  environment {
    AWS_REGION = 'ap-southeast-1'
    EKS_CLUSTER = 'waypoint-dev'
  }
  stages {
    stage('Checkout') {
      steps {
        checkout scm
        script { env.IMAGE_TAG = sh(script: 'git rev-parse HEAD', returnStdout: true).trim() }
      }
    }
    stage('Tests and dependency scan') { steps { sh 'bash infrastructure/scripts/ci-test.sh' } }
    stage('Build and scan all six images') { steps { sh 'bash infrastructure/scripts/images.sh build' } }
    stage('Approve image publication') {
      when { expression { params.REQUEST_RELEASE } }
      steps {
        timeout(time: 30, unit: 'MINUTES') {
          input message: "Publish six images for ${env.IMAGE_TAG}? Review security blockers and test reports.", submitter: 'waypoint-release-approvers'
        }
      }
    }
    stage('Push ECR images') {
      when { expression { params.REQUEST_RELEASE } }
      steps {
        // AWS Credentials plugin: short-lived AssumeRole credentials from runner IAM role.
        withAWS(role: params.DELIVERY_ROLE_ARN, roleSessionName: "waypoint-${env.BUILD_NUMBER}", duration: 3600, region: 'ap-southeast-1', useNode: true) {
          sh '''#!/usr/bin/env bash
set -euo pipefail
export DOCKER_CONFIG
DOCKER_CONFIG=$(mktemp -d)
trap 'rm -rf "$DOCKER_CONFIG"' EXIT
aws ecr get-login-password --region "$AWS_REGION" | docker login --username AWS --password-stdin "$ECR_REGISTRY"
bash infrastructure/scripts/images.sh push
'''
        }
      }
    }
    stage('Approve development deployment') {
      when { expression { params.REQUEST_RELEASE } }
      steps {
        timeout(time: 30, unit: 'MINUTES') {
          input message: "Deploy ${env.IMAGE_TAG} to waypoint-dev? All release blockers must be resolved; review rollback SHA.", submitter: 'waypoint-release-approvers'
        }
      }
    }
    stage('Rollout and smoke tests') {
      when { expression { params.REQUEST_RELEASE } }
      steps {
        withAWS(role: params.DELIVERY_ROLE_ARN, roleSessionName: "waypoint-deploy-${env.BUILD_NUMBER}", duration: 3600, region: 'ap-southeast-1', useNode: true) {
          sh 'bash infrastructure/scripts/deploy.sh'
        }
      }
    }
  }
  post {
    always {
      junit testResults: 'services/*/target/surefire-reports/*.xml', allowEmptyResults: true
      echo "Waypoint build ${env.BUILD_NUMBER}: ${currentBuild.currentResult}; SHA ${env.IMAGE_TAG}"
    }
  }
}
