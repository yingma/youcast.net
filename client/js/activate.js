'use strict';

angular.module('myApp').controller('ActivateCtrl', function ($scope, $location, cognitoService) {

  $scope.submit = function () {
    var userPool = cognitoService.getUserPool();

    var cognitoUser = cognitoService.getUser(userPool, $('#email').val());
    var activationKey = $('#activationCode').val();

    cognitoUser.confirmRegistration(activationKey, true, function (err, result) {
      if (err) {
        console.log(err);

        // TODO: 生のエラー情報は表示させない方が良いが、機能確認のため、画面に表示。
        $scope.errorMessage = err.message;
        $scope.$apply();
        return;
      }

      $location.path('/login');
      $scope.$apply();
    });
  };

  return false;
});
