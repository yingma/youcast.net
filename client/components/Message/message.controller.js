var mod = angular.module('starter.message', ['aws.cognito.identity', 'aws.apigateway', 'toastr', 'infinite-scroll', 'ngIntlTelInput', 'ui.bootstrap']);

mod.config(function (ngIntlTelInputProvider) {
    ngIntlTelInputProvider.set({preferredCountries: ['us', 'ca']});
});

mod.controller('MessageCtrl', ['$scope', '$state', '$window', '$stateParams', 'awsApiGatewayFactory', 'toastr', '$uibModal', 'notifyingService',
  function($scope, $state, $window, $stateParams, awsApiGatewayFactory, toastr, $uibModal, notifyingService) {

    $scope.room = $stateParams.room;
    $scope.user = $stateParams.user;
    $scope.key = $stateParams.key;
    $scope.number = $stateParams.number;
    $scope.numberToDisplay = 120;
    $scope.checktime = $stateParams.time;
    $scope.name = $stateParams.name;
    $scope.error = { message: null };
    $scope.items = [];
    $scope.photoUrl = '';

    $scope.compose = function()  {
        var number = $scope.number;
        var key = $scope.key;
        var user = $scope.user;

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
                        awsApiGatewayFactory.notify($scope.room, result['key'], 'https://www.youcast.net/pro/components/Enter/enter.html#' + $scope.room, function(err, result){
                            if (err) {
                                errorHandler(err);
                                return;
                            }
                            toastr.success("The reply has been sent successfully", "Success");
                            $scope.onload();
                            return;
                        });
                    }
                });
            }

        }, function(){
            // Cancel
        });
    }

    $scope.isNumber = function(item) {
        return typeof item === 'number';
    }

    $scope.isImage = function(item) {
        return typeof item === 'object' && item.type === 'image';
    }

    function show_(element) {
        if (element)
            element.classList.remove('hidden');
    };

    function hide_(element) {
        if (element)
            element.classList.add('hidden');
    };

    $scope.goback = function() {
        // awsApiGatewayFactory.openSubscribe($scope.room, $scope.key, function(err, data){
        //     if (err) {
        //         $scope.error.message = err.message;
        //         toastr.error(err.message, 'Error');
        //         return;
        //     }
        //     notifyingService.notify('ROOM_TOPIC', $scope.room);
        //     $window.history.back();
        // });
        $window.history.back();
    }

    $scope.delete = function() {
        awsApiGatewayFactory.removeSubscribe($scope.room, $scope.key, function(err, data){
            if (err) {
                $scope.error.message = err.message;
                toastr.error(err.message, 'Error');
                return;
            }
            notifyingService.notify('ROOM_TOPIC', $scope.room);
            $window.history.back();
        });
    }

    $scope.click = function(item) {
        var swipe = document.getElementById('photoswipe');
        show_(swipe);
        hide_(document.getElementById('main'));
        swipe.src = '';
        setTimeout(function() {           
            swipe.src = '/pro/components/PhotoSwipe/photoswipe.html#' + $scope.room + '&' + $scope.user + '&' + item.key;
        }, 100);
        
    }

    $scope.isText = function(item) {
        return typeof item === 'object' && item.type === 'text';
    }

    $scope.isNew = function(item) {
        return item.time.getTime() > $scope.checktime * 1000 && item.mtype!=='u' ;
    }

    // local time
    $scope.formatDate = function(ticks) {

        var date = new Date(ticks);
        date.setHours(0);
        date.setMinutes(0);
        date.setSeconds(0);
        date.setMilliseconds(0);
        var today = new Date();
        today.setHours(0);
        today.setMinutes(0);
        today.setSeconds(0);
        today.setMilliseconds(0);
        
        diff = today.getTime() - ticks; // get the difference between today(at 00:00:00) and the date
        if (diff === 0) {
            return "Today";
        } else if (diff <= (24 * 60 * 60 *1000)) {
            return "Yesterday";
        } else if (diff <= (6 * 24 * 60 * 60 *1000)) {
            d = date.getDay();
            days = new Array('Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat');
            return days[d];

        } else { 
            //return compDate.toDateString(); // or format it what ever way you want
            year = date.getFullYear();
            month = date.getMonth();
            months = new Array('Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec');
            day = date.getDate();
            d = date.getDay();
            days = new Array('Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat');

            var formattedDate = days[d] + " " + day + " " + months[month] + " " + year;
            return formattedDate;
        }
    }

    $scope.formatTime = function(time) {
        return time.toLocaleTimeString();
    }


    function addToTimeline(ticks, item, type, key, mtype = 'c') {

        var time = new Date(ticks*1000);
        var d = new Date(time.getFullYear(), time.getMonth(), time.getDate());
        var found = false;
        var i;
        for (i = 0; i < $scope.items.length; i++) {
            if (typeof $scope.items[i] === 'number') {
                if ($scope.items[i]  == d.getTime()) {
                    found = true;
                    break;
                } else if ($scope.items[i] < d.getTime()) {
                    break;
                }
            }
        }

        if (!found) {
            $scope.items.splice(i, 0, d.getTime());
        }


        for (i = i + 1; i < $scope.items.length + 1; i++) {
            if (i === $scope.items.length || typeof $scope.items[i] === 'number' || $scope.items[i].time < time) {
                $scope.items.splice(i, 0, {'data':item, 'type':type, 'time':time, 'key':key, 'mtype':mtype});
                break;
            }
        }

    }


    $scope.loadMessages = function() {
        awsApiGatewayFactory.loadMessages($scope.room, $scope.user, 0, true, null, function(err, data){
            if (err) {
                $scope.error.message = err.message;
                toastr.error(err.message, 'Error');
                return;
            }
            if (data) {
                data.forEach(function(item){
                    addToTimeline(item["Time"], item["Text"], "text", item["UserKey"], item["Type"]);    
                });
            }
        });
    }

    $scope.loadFiles = function() {
        awsApiGatewayFactory.loadFiles($scope.room, $scope.user, 0, "1", 200, function(err, data){
            if (err) {
                $scope.error.message = err.message;
                toastr.error(err.message, 'Error');
                return;
            }
            if (data)
                data.forEach(function(item){
                    addToTimeline(item["Time"], item["Thumbnail"], "image", item["UserKey"]);    
                });
        });
    }


    $scope.onload = function() {
        if ($scope.room && $scope.user) {
            $scope.items = [];
            awsApiGatewayFactory.openSubscribe($scope.room, $scope.key, function(err, data){
                if (err) {
                    $scope.error.message = err.message;
                    toastr.error(err.message, 'Error');
                    return;
                }
                notifyingService.notify('ROOM_TOPIC', $scope.room);
                $scope.loadFiles();
                $scope.loadMessages();
            });            
        }
    }

    errorHandler = function(err) {
        console.log(err);
        $scope.error.message = err.message;
        $scope.$apply();
    }
}]);
