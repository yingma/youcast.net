var mod = angular.module('starter.team1', ['aws.cognito.identity', 'aws.apigateway', 'toastr', 'infinite-scroll', 'ngIntlTelInput', 'ui.bootstrap']);

mod.config(function (ngIntlTelInputProvider) {
    ngIntlTelInputProvider.set({preferredCountries: ['us', 'ca']});
});

mod.controller('TeamCtrl1', ['$scope', '$state', '$stateParams', 'awsCognitoIdentityFactory', 'awsApiGatewayFactory', 'toastr', '$uibModal', '$filter',
  function($scope, $state, $stateParams, awsCognitoIdentityFactory, awsApiGatewayFactory, toastr, $uibModal, $filter) {

    var vm = this;

    $scope.sortingOrder = sortingOrder;
    $scope.sortingOrder1 = sortingOrder;
    $scope.room = $stateParams.room;
    $scope.error = { message: null };
    $scope.numberToDisplay = 20;
    $scope.moreToLoad = true;
    $scope.users = [];
    $scope.team = [];
    $scope.page = 1;

    $scope.query = '';
    $scope.loading = false;
    $scope.owner = '';

    $scope.init = function() {
        $scope.loading = true;
        awsApiGatewayFactory.getRoom($scope.room, function(err, result) {
            if (err) {
                toastr.error(err.message, 'Error');
                return;
            }
            var users = [];
            $scope.owner = result['data']['Owner'];
            users.push($scope.owner);
            awsApiGatewayFactory.listTeam($scope.room, function(err, result) {
                if (err) {
                    toastr.error(err.message, 'Error');
                    return;
                }
                if (result.data && result.data.length > 0) {
                    result.data.forEach((user) => {
                        users.push(user["Member"]["S"]);
                    });
                    Promise.all(users.map((user) => {                        
                        awsApiGatewayFactory.getUser2(user, function(err, result) {
                            $scope.team.push(result);
                            Promise.resolve("User loaded");
                        });                        
                    }))
                    .then(() => {
                        $scope.loading = false;
                    });
                } else {
                    $scope.loading = false;
                }
            });
        });
    };
    
    $scope.keyPress = function(keyEvent)  {
        if (keyEvent.which === 13) {
            keyEvent.preventDefault();
            $scope.query = $scope.query.trim();
            $scope.users = [];
            $scope.moreToLoad = true;
            $scope.loadMore();
        }
    };

    var is_loading = false;
    $scope.busy = false;

    
    // change sorting order
    $scope.sort_by = function(newSortingOrder) {        
        if ($scope.sortingOrder == newSortingOrder)
            $scope.reverse = !$scope.reverse;
        $scope.sortingOrder = newSortingOrder;
    };


    $scope.busy = false;

    errorHandler = function(err) {
        console.log(err);
        $scope.error.message = err.message;
    }
}]);
