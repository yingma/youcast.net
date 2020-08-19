var mod = angular.module('starter.register', ['aws.cognito.identity', 'ngMessages']);

var compareTo = function() {
    return {
        require: "ngModel",
        scope: {
            otherModelValue: "=compareTo"
        },
        link: function(scope, element, attributes, ngModel) {
             
            ngModel.$validators.compareTo = function(modelValue) {
                return modelValue == scope.otherModelValue;
            };
 
            scope.$watch("otherModelValue", function() {
                ngModel.$validate();
            });
        }
    };
};
 
mod.directive("compareTo", compareTo);

mod.controller('RegisterCtrl', ['$scope', 'awsCognitoIdentityFactory', '$state',
  function($scope, awsCognitoIdentityFactory, $state) {
    $scope.user = {};

    $scope.error = {
      message: null
    };

    $scope.register = function() {
      awsCognitoIdentityFactory.signUp($scope.user.email, $scope.user.email, $scope.user.password,
        function(err, result) {
          if(err) {
            errorHandler(err);
            return false;
          }
          $scope.$apply();
          $state.go('confirm', {user: $scope.user.email});
        });
      return true;
    };

    $scope.goback = function () {
        window.history.back();
    };

    errorHandler = function(err) {
      console.log(err);
      $scope.error.message = err.message;
      $scope.$apply();
    };
}]);
