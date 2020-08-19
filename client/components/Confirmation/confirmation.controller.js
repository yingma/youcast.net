var mod = angular.module('starter.confirmation', ['aws.cognito.identity', 'ngMessages', 'aws.apigateway']);

mod.controller('ConfirmationCtrl', ['$scope', 'awsCognitoIdentityFactory', '$state', '$stateParams', 'awsApiGatewayFactory', 
  function($scope, awsCognitoIdentityFactory, $state, $stateParams, awsApiGatewayFactory) {
    $scope.user = {};

    $scope.error = { message: null };

    $scope.verifyCode = function() {
      awsCognitoIdentityFactory.confirmAccount($scope.user.name, $scope.user.code, function(err, result) {
        if(err) {
          errorHandler(err)
          return false;
        }

        if (result == "SUCCESS")
            $state.go('login');
      });
    }

    $scope.resendCode = function() {
      awsCognitoIdentityFactory.resendCode($scope.user.name, function(err, result) {
        if (err) {
            errorHandler(err)
            return false;
        }
        console.log('call result: ' + result);
        return true;
      });
    }

    $scope.setUserNameIfExists = function() {
      var username = $stateParams.user;
      if(username) {
        $scope.user.exists = true;
        $scope.user.name = username;
      }
    }

    errorHandler = function(err) {
      console.log(err);
      $scope.error.message = err.message;
      $scope.$apply();
    }
}]);
