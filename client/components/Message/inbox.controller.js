var mod = angular.module('starter.inbox', ['aws.cognito.identity', 'aws.apigateway', 'toastr', 'infinite-scroll', 'ngIntlTelInput', 'ui.bootstrap']);

mod.config(function (ngIntlTelInputProvider) {
    ngIntlTelInputProvider.set({preferredCountries: ['us', 'ca']});
});

mod.controller('InboxCtrl', ['$scope', '$state', '$stateParams', 'awsApiGatewayFactory', 'toastr', '$uibModal',
  function($scope, $state, $stateParams, awsApiGatewayFactory, toastr, $uibModal) {

    var vm = this;

    $scope.room = $stateParams.room;
    $scope.error = { message: null };
    $scope.numberToDisplay = 20;
    $scope.moreToLoad = true;
    $scope.subscribers = [];
    $scope.page = 1;

    $scope.query = '';

    $scope.compose = function(number, key, user)  {
        event.stopPropagation();
        var modalCompose = $uibModal.open({
            ariaLabelledBy: 'Compose invite',
            ariaDescribedBy: 'invite',
            controller: function($scope, $uibModalInstance, number, user) {
                $scope.number = number;
                $scope.key = key;
                $scope.user = user;
                $scope.checklink = true;
                $scope.message = "Please click on the following link to enter the room:";
                $scope.ok = function () {
                    $uibModalInstance.close({'number': $scope.number, 'message': $scope.message, 'checklink': $scope.checklink, 'key': key, 'user': user});
                };
              
                $scope.cancel = function () {
                    $uibModalInstance.dismiss('cancel');
                };
            },
            templateUrl: 'components/Message/compose.html',
            resolve: {
                number: function () {
                    return number;
                },
                key: function() {
                    return key;
                },
                user: function() {
                    return user;
                }
            }
        });

        modalCompose.result.then(function (result) {
            // Success
            if (result) {
                awsApiGatewayFactory.composeSMS($scope.room, result['number'], result['user'], result['message'], result['checklink'], function(){
                    if (result['key']) {
                        awsApiGatewayFactory.notify($scope.room, result['key'], 'https://www.youcast.net/plus/components/Enter/enter.html#' + $scope.room, function(err, result){
                            if (err) {
                                errorHandler(err);
                                return;
                            }
                            toastr.success("The message has been sent successfully", "Success");
                            return;
                        });
                    }
                });
            }

        }, function(){
            // Cancel
        });
    }

    $scope.search = function()  {
      
        $scope.query = $scope.query.trim();

        $scope.subscribers = [];
        $scope.moreToLoad = true;
        $scope.loadMore();
    }

    $scope.open = function(subscriber) {
        $state.go('message', {room: $scope.room, user: subscriber["User"], time: subscriber["CheckTime"], name: subscriber["Name"], key: subscriber["Key"], number: subscriber["Number"]});
    }

    $scope.loadMessages = function(index) {

        if ($scope.subscribers.length <= index)
            return;

        var subscriber = $scope.subscribers[index];

        var user = subscriber["User"];

        var time = subscriber["CheckTime"];
        if (!time)  {
            time = 0;
        }

        if ($scope.room && user) {
            awsApiGatewayFactory.loadMessages($scope.room, user, time, true, 'c', function(err, data){
                if (data && data.length > 0) {
                    subscriber.message = data[0]["Text"];
                    subscriber.NewMessage = 1;
                } else {
                    awsApiGatewayFactory.loadMessages($scope.room, user, time, false, 'c', function(err, data){
                        if (data && data.length > 0) {
                            subscriber.message = data[0]["Text"];
                        }
                    });
                }
            });
        }
    }

    $scope.loadFiles = function(index) {

        if ($scope.subscribers.length <= index)
            return;

        var subscriber = $scope.subscribers[index];

        var user = subscriber["User"];
        var time = subscriber["CheckTime"];

        var count = 8;

        if ($scope.room && user) {
            awsApiGatewayFactory.loadFiles($scope.room, user, time, "1", count, function(err, data){
                if (data && data.length > 0) {
                    subscriber.snapshots = data;
                    subscriber.NewSnapshot = data.length;
                    count -= data.length;
                }
                if (count > 0) {
                    awsApiGatewayFactory.loadFiles($scope.room, user, time, "2", count, function(err, data){
                        if (data && data.length > 0) {
                            if (subscriber.snapshots)
                                subscriber.snapshots = subscriber.snapshots.concat(data);
                            else
                                subscriber.snapshots = data;
                        }
                    });
                } 
            });
        }
    }

    var is_loading = false;
    $scope.busy = false;

    $scope.loadMore = function() {

        if (!$scope.moreToLoad)
            return;

        if ($scope.busy) 
            return;
            
        $scope.busy = true;

        if ($scope.room) {

            if (!$scope.query) {

                awsApiGatewayFactory.listSubscriber($scope.room, $scope.page, function(err, data){

                    if(err) {
                        errorHandler(err);
                        toastr.error(err.message, 'Error');
                        $scope.busy = false;
                        return;
                    }

                    if (data && data.length > 0) {
                        var origin_length = $scope.subscribers.length;
                        $scope.subscribers = $scope.subscribers.concat(data);
                        for (var i = $scope.subscribers.length - 1; i >= origin_length; i--) {
                            item_stack.push(i);
                        }
                        if (!is_loading)
                            startRenderTimer();

                        if (data.length < 20)
                            $scope.moreToLoad = false;
                        else
                            $scope.page ++;
                    }

                    $scope.busy = false;
                });

            } else {

                awsApiGatewayFactory.querySubscriber($scope.room, $scope.page, $scope.query,$scope.query, $scope.query, function(err, data){
                    if(err) {
                        errorHandler(err);
                        toastr.error(err.message, 'Error');
                        $scope.busy = false;
                        return;
                    }

                    if (data && data.length > 0) {
                        var origin_length = $scope.subscribers.length;
                        $scope.subscribers = $scope.subscribers.concat(data);
                        for (var i = $scope.subscribers.length - 1; i >= origin_length; i--) {
                            item_stack.push(i);
                        }
                        if (!is_loading)
                            startRenderTimer();

                        if (data.length < 20)
                            $scope.moreToLoad = false;
                        else
                            $scope.page ++;
                    }

                    $scope.busy = false;
                });
            }
        }
    }

    // is chunked in groups.
    var render_timer = null;
    var render_delay = 100;
    var item_stack = [];


    function loadItems() {
        
        is_loading = true;
        // Log here so we can see how often this
        // gets called during page activity.
        while (item_stack.length != 0) {
            var index = item_stack.pop();
            $scope.loadMessages(index);
            $scope.loadFiles(index);
        }
        is_loading = false;
    }

    function startRenderTimer() {

        renderTimer = setTimeout(loadItems, render_delay);
    }

    errorHandler = function(err) {
        console.log(err);
        $scope.error.message = err.message;
    }
}]);
