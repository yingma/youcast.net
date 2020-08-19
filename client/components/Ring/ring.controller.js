var mod = angular.module('starter.ring', ['ngRoute', 'aws.apigateway']);

mod.controller('ringCtrl', ['$scope', '$window', '$location', 'awsApiGatewayFactory', 
    function($scope, $window, $location, awsApiGatewayFactory) {

        //room&auth room owner enters
        //room&user guest calls room owner
        //room&owner&key room owner calls guest by key

        var parameters = $location.hash().split('&');

        var data = {
            'room': parameters[0],
            'user': parameters[1],
            'key': parameters[2],
            'type': '',
            'recaptcha': parameters[3]
        };

        $scope.onload = function() {
            if (data.room && data.user != 'auth') {
                awsApiGatewayFactory.getRoom(data.room, function(err, result) {
                    if (err) {
                        $scope.error.message = err.message;
                        return;
                    }
                    if (result) {
                        $scope.logo = result['data']['Logo'];
                        $scope.description = result['data']['Description'];
                    }
                });
            }
        } 
        
        $scope.error = { message: null };

        $scope.canHangup = false;

        errorHandler = function(err) {
            var vid = document.getElementById('ringplayer'); 
            vid.pause(); 
            console.log(err);
            $scope.error.message = err.message;
        }

        if (!data.room) {
            errorHandler(new Error('Missing room'));
            return;
        }

        var start = Date.now(); 

        if (data.user == 'auth') { // directly allow owner to enter the room after auth
        
            if (/iPad|iPhone/.test(navigator.userAgent) && !window.MSStream) {
                $scope.link = 'video_ios.html';
            } else {
                $scope.link = 'video.html';
            }

            $scope.link = encodeURIComponent('Video@' + $scope.link + '#' + data.room);
            $window.location.href = '../../index.html#!/login/' + $scope.link;

            return;
        } else { // create link from text to owner by client entering the room 
            $scope.link = 'https://bit.ly/34HGMFr#' + data.room + '&auth';
        }

        var timeout = setTimeout(ringTimer, 10);

        $scope.hangup = function () {
            clearTimeout(timeout);
            if (!data.key) {
                //redirect to subscribption page.
                $window.location.href = '../Subscribe/subscribe.html#' + data.room + '&' + data.user + '&' + data.type;
            } else {
                errorHandler(new Error('Please close the window.'));
            }
            return;
        };
    
        function ringTimer() {

            if ((Date.now() - start) > 1000 * environment.ringTimeout) {

                if (!data.key) { //redirect to subscription page.
                    $window.location.href = '../Subscribe/subscribe.html#' + data.room + '&' + data.user + '&' + data.type;
                } else {
                    errorHandler(new Error('No one answers the call, please close the window.'));
                }
                return;
            }

            awsApiGatewayFactory.ring(data.room, data.user, data.key, data.recaptcha, function(err, result){

                if(err) {
                    // put error here.
                    errorHandler(err);
                    return;
                }

                if (result.errorType) {
                    // wrong number here
                    errorHandler(new Error(result.errorMessage));
                    return;
                }

                if (result.data) {

                    data.type = result.data['type'];
                    $scope.canHangup = true;
                    
                    var exit = result.data['exit'];
                    if (exit) {

                        $window.location.href = '../Subscribe/subscribe.html#' + data.room + '&' + data.user + '&' + data.type;
                        return;
                    }

                    var target = result.data['target'];
            
                    if (result.data['notify']) {
                        awsApiGatewayFactory.invite(data.room, target, $scope.link, function(err, result){
                            if (err) {
                                errorHandler(err);
                                return;
                            }

                            awsApiGatewayFactory.notify(data.room, target, $scope.description, $scope.link, function(err, result){
                                if (err) {
                                    errorHandler(err);
                                    return;
                                }

                                setTimeout(ringTimer, 5000);
                            });
                        });

                    } else if (!result.data['wait']){
                        //redirect to video page
                        var link;
                    
                        if (/iPad|iPhone/.test(navigator.userAgent) && !window.MSStream) {
                            link = 'video_ios.html';
                        } else {
                            link = 'video.html';
                        }

                        if (data.key) { //room owner enters the video room
                            link = encodeURIComponent('Video@' + link + '#' + data.room);
                            $window.location.href = '../../index.html#!/login/' + link;
                        } else {
                            //drectly go to video room without auth
                            $window.location.href = '../Video/' + link + '#' + data.room + '&' + data.user;
                        }
                    } else {
                        setTimeout(ringTimer, 5000);
                    }
                }
            });
        }

    }
]);
