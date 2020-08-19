var mod = angular.module('starter.forgot', ['aws.cognito.identity', 'ngMessages', 'vcRecaptcha']);

mod.controller('ForgotPasswordCtrl', ['$scope', 'awsCognitoIdentityFactory', '$stateParams', '$state',
  function($scope, awsCognitoIdentityFactory, $stateParams, $state) {
    $scope.user = {};
    $scope.error = { message: null };

    $scope.user.email = $stateParams.email;

      $scope.recaptchaKey = '6LfMATUUAAAAAJX851JlWLJyLEeOia_JXY5GJOe6';

      $scope.setResponse = function (response) {
            console.info('Response available');
            $scope.recaptchaResponse = response;
      };
        
      $scope.setWidgetId = function (widgetId) {
            console.info('Created widget ID: %s', widgetId);
            $scope.widgetId = widgetId;
      };

      $scope.cbExpiration = function() {
            console.info('Captcha expired. Resetting response object');
            vcRecaptchaService.reload($scope.widgetId);
            $scope.recaptchaResponse = null;
      };

    $scope.forgotPassword = function() {
      awsCognitoIdentityFactory.forgotPassword($scope.user.email, function(err, result) {
        if (err) {
            errorHandler(err)
            return false;
        }
        console.log('call result: ' + result);
        $state.go('forgot2', {email: $scope.user.email});
        return true;
      });
    }

    $scope.confirmNewPassword = function() {

      awsCognitoIdentityFactory.confirmNewPassword($scope.user.email, $scope.user.code, $scope.user.password, function(err, result) {
        if (err) {
            errorHandler(err)
            return false;
        }
        console.log('call result: ' + result);
        $state.go('login');
        return true;
      });
    }

    errorHandler = function(err) {
      console.log(err);
      $scope.error.message = err.message;
      $scope.$apply();
    }
}]);
