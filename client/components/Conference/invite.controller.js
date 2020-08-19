var mod = angular.module('starter.invite', ['ngRoute', 'aws.apigateway', 'toastr', 'ngIntlTelInput']);

mod.config(function (ngIntlTelInputProvider) {
    ngIntlTelInputProvider.set({preferredCountries: ['us', 'ca']});
});

mod.controller('inviteCtrl', ['$scope', '$window', '$location', 'awsApiGatewayFactory', 'toastr',
    function($scope, $window, $location, awsApiGatewayFactory, toastr) {

        //room&auth room owner enters
        //room&user guest calls room owner
        //room&owner&key room owner calls guest by key
        var parameters = $location.hash().split('&');

        var data = {
            'room': parameters[0],
            'user': parameters[1] 
        };

        $scope.team = [];

        $scope.number = null;
        $scope.error = { message: null };

        $scope.onload = function() {
            $scope.loading = true;
            awsApiGatewayFactory.getRoom(data.room, function(err, result) {
                if (err) {
                    toastr.error(err.message, 'Error');
                    return;
                }
                var users = [];
                users.push(result['data']['Owner']);
                awsApiGatewayFactory.listTeam(data.room, function(err, result) {
                 
                    if (err) {
                        toastr.error(err.message, 'Error');
                        return;
                    }
                    if (result.data && result.data.length > 0) {
                        result.data.forEach((user) => {
                            users.push(user["Member"]["S"]);
                        });
                        Promise.all(users.map((user) => {
                            if (user !== data.user) {
                                awsApiGatewayFactory.getUser2(user, function(err, result) {
                                    $scope.team.push(result);
                                    Promise.resolve("User loaded");
                                });
                            }
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

        // change sorting order
        $scope.sort_by = function(newSortingOrder, order) {
            if (order == '0') {
                if ($scope.sortingOrder == newSortingOrder)
                    $scope.reverse = !$scope.reverse;
                $scope.sortingOrder = newSortingOrder;
            } else {
                if ($scope.sortingOrder1 == newSortingOrder)
                    $scope.reverse1 = !$scope.reverse1;
                $scope.sortingOrder1 = newSortingOrder;
            }
        };
       

        $scope.notify = function(user) {
            // link to directly enter the room
            var link = 'https://bit.ly/34HGMFr#' + data.room + '&auth';
            awsApiGatewayFactory.invite(data.room, user, link, function(err, result){
                if (err) {
                    errorHandler(err);
                    return;
                }
                awsApiGatewayFactory.notify(data.room, user, link, function(err, result){
                    if (err) {
                        errorHandler(err);
                        return;
                    }
                    // move to next page
                    $window.location.replace("success.html");
                });
            });
        };

        $scope.notify1 = function() {
            if (!$scope.number) {
                return;
            }
            // link to directly enter the room
            var link = 'https://bit.ly/34HGMFr#' + data.room;
            awsApiGatewayFactory.invite(data.room, $scope.number, link, function(err, result){
                if (err) {
                    errorHandler(err);
                    return;
                }
                if (result.error) {
                    errorHandler(result.error);
                    return;
                }
                // move to next page
                $window.location.replace("success.html");
            });
        };

        errorHandler = function(err) {
            console.log(err);
            $scope.error.message = err.message;
        };
        
    }
]);
