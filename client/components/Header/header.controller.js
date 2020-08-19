var mod = angular.module('starter.header', ['aws.cognito.identity', 'aws.apigateway']);

mod.controller('HeaderCtrl', ['$scope', '$location', 'awsCognitoIdentityFactory', 'awsApiGatewayFactory', 'notifyingService', '$state', 
  function($scope, $location, awsCognitoIdentityFactory, awsApiGatewayFactory, notifyingService, $state) {

    $scope.user = { 'verified': true };

    $scope.error = { message: null };

  	$scope.headerUrl = 'components/Header/header.view.html';

    awsApiGatewayFactory.getUser(function(err, result) {
        if (err) {
            $scope.error.message = err.message;
            console.log(err.message);
            return;
        }
        if (result) {
            $scope.user.name = result['Name'];
            $scope.user.phone = result['Phone'];
            $scope.user.address = result['Address'];
            $scope.user.city = result['City'];
            $scope.user.state = result['State'];
            $scope.user.zip = result['Zip'];
            $scope.user.country = result['Country'];
            $scope.user.verified = result['Verified'];
            $scope.user.email = result['Email'];
        }
    });

    notifyingService.subscribe($scope, 'CONFIRM_TOPIC', function(event, user) {
        $scope.user.verified = user['verified'];
    });

    $scope.init = function() {
        awsCognitoIdentityFactory.getSession(function(err, session) {
            if (err) {
                 $scope.headerUrl = 'components/Header/header.view.html';
                 return;
            }
            $scope.headerUrl =  'components/Header/header1.view.html'
        });

        awsCognitoIdentityFactory.registerLoginCallback(function(auth){
            if (!auth) {
                 $scope.headerUrl = 'components/Header/header.view.html';
                 if ($state.current.name != 'login') {
                     $state.go('login', {}, {reload:true});
                 }
                 return;
            }
            $scope.headerUrl =  'components/Header/header1.view.html'
        });
    };


    $scope.logout = function() {
    	awsCognitoIdentityFactory.signOut();
    };
}]);
