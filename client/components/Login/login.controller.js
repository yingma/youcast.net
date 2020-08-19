var mod = angular.module('starter.login', ['aws.cognito.identity']);

mod.controller('LoginCtrl', ['$scope', 'awsCognitoIdentityFactory', '$state', '$stateParams', '$window', '$location', '$rootScope',
  function($scope, awsCognitoIdentityFactory, $state, $stateParams, $window, $location, $rootScope) {

    var str = $stateParams.url;

    if (str)
      $rootScope.url = str.replace('@', '/');    

    $scope.user = { email: null, password: null };
    $scope.error = { message: null };

    $scope.userLogged = function() {
      awsCognitoIdentityFactory.getSession((err, session) => {
        if (err) {
          return;
        }
        if (!$rootScope.url) {
          $state.go('home', {}, {reload: true});
        } else {
          $window.location.href = 'https://www.youcast.net/plus/components/' + $rootScope.url + '&' + awsCognitoIdentityFactory.getUserName() + '&true';
        }
      });
    }

    // $scope.userLogged();
    $scope.getUserFromLocalStorage = function() {
      awsCognitoIdentityFactory.getUserFromLocalStorage(function(err, isValid) {
        if(err) {
          $scope.error.message = err.message;
          return false;
        }
        if(isValid) $state.go('home', {}, {reoload: true})
      });
    }

    $scope.signIn = function(login) {
      awsCognitoIdentityFactory.signIn($scope.user.email, $scope.user.password, function(err) {
        if(err) {
          console.log(err);
          if (err.message === 'Incorrect username or password.') {
            // https://github.com/aws/amazon-cognito-identity-js/issues/42
            $scope.error.message = err.message + ' Have you verified ' + $scope.user.email + ' account?'
          }
          else {
            $scope.error.message = err.message;
          }
          $scope.$apply();
          return false;
        }
        
        clearForm(login);
        if (!$rootScope.url) {
          $state.go('home', {}, {reoload: true});
        } else {
          $window.location.href = 'https://www.youcast.net/plus/components/' + $rootScope.url + '&' + awsCognitoIdentityFactory.getUserName() + '&true';
        }
      })
    }


    var clearForm = function(login) {
      $scope.user = { email: '', password: '' }
      login.$setUntouched();
    }
}]);
