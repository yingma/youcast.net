var mod = angular.module('starter.home', ['aws.cognito.identity', 'aws.apigateway', 'toastr']);

mod.controller('HomeCtrl', ['$scope', 'awsApiGatewayFactory', '$state', 
    function($scope, awsApiGatewayFactory, $state) {

        $scope.new = 0;

        $scope.openSettings = function(r, t) {
            $state.go('room', {room: r, type: t});
        }

        $scope.load = function() {
            awsApiGatewayFactory.listRooms(function(err, result) {
                if (err) {
                    $scope.error.message = err.message;
                    return;
                }
                if (result) {
                    $scope.rooms = result.data;

                    for (var i = $scope.rooms.length - 1; i >= 0; i--) {
                        $scope.new += $scope.rooms[i].NewMessage;
                    }
                    
                }
            });
        }

        $scope.openMessages = function(r) {
            $state.go('inbox', {room: r});
        }
    }
]);