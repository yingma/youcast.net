var mod = angular.module('starter.subscribe', ['aws.apigateway', 'webrtc.event', 'ngCookies', 'ngIntlTelInput', 'ng-drag-scroll']);

mod.config(function (ngIntlTelInputProvider) {
    ngIntlTelInputProvider.set({preferredCountries: ['us', 'ca']});
});

function urlB64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
};


mod.controller('subscribeCtrl', ['$scope', '$cookies', '$window', '$location', '$q', 'awsApiGatewayFactory', //'EventUpload',
    function($scope, $cookies, $window, $location, $q, awsApiGatewayFactory /*, EventUpload */) {

        $scope.showSlider_ = false;

        var parameters = $location.hash().split('&');

        var room = parameters[0];
        var user = parameters[1];
        var type = parameters[2];

        // $scope.eventUpload = EventUpload;

        $scope.snapshots = [];

        $scope.error = { message: null };

        $scope.canAddFile = type === 'Support';

        errorHandler = function(err) {
            console.log(err);
            $scope.error.message = err;
        }

        $scope.send = function () {

            if ($scope.snapshots.length > 0) {

                var promises = [];

                for (var i = $scope.snapshots.length - 1; i >= 0; i--) {
                    var promise = awsApiGatewayFactory.submitFile(room, $scope.snapshots[i]["key"]);
                    promises.push(promise);
                }

                $q.all(promises)
                .then(function(response){
                    subscribe(room, user, $scope.name, $scope.number, $scope.email, $scope.message);
                    trace('successfully submit file');
                })
                .catch(function(response){
                    errorHandler(response.statusText);
                    trace(response.statusText);
                })
                .finally(function(){
                    trace('successfully submit file');
                });

            } else {
                subscribe(room, user, $scope.name, $scope.number, $scope.email, $scope.message);
            }
        };

        awsApiGatewayFactory.getFiles(room, user, function(err, result) {

            if (err)
                return;

            if (result.data) {
                for (var i = result.data.length - 1; i >= 0; i--) {
                    $scope.snapshots.push({"key": result.data[i]["UserKey"]["S"], "thumbnail": result.data[i]["Thumbnail"]["S"]});
                }
            }

        });

        $scope.deleteImage = function(index) {
            awsApiGatewayFactory.removeFile(room, $scope.snapshots[index]["key"], function(err, result){
                if (err) {
                    trace("error:" + error);
                    return;
                }
                if (result) {
                    $scope.snapshots.splice(index, 1);
                }
            });
        };

        $scope.attach = function() {

            var link;
                    
            if (/iPad|iPhone/.test(navigator.userAgent) && !window.MSStream) {
                link = 'video_ios.html';
            } else {
                link = 'video.html';
            }

            $window.location.href = '../Video/' + link + '#' + room + '&' + user;

            return;
        };

        subscribe = function(room, user, name, number, email, message) {

            var date = new Date().toLocaleString();

              //subscribe to gcm
            if ('serviceWorker' in navigator && 'PushManager' in window) { 

                console.log('Service Worker and Push is supported');
                trace('Service Worker and Push is supported');
                navigator.serviceWorker.register('../../js/service-worker.js')
                .then(function(registration) {
                    console.log('Service Worker is registered', registration);

                    // Set the initial subscription value
                    registration.pushManager.getSubscription()
                    .then(function(subscription) {
                        if (subscription) {
                            console.log('User IS subscribed.');
                            return subscription;
                        }

                        return registration.pushManager.subscribe({
                            userVisibleOnly: true,
                            applicationServerKey: urlB64ToUint8Array('BEKv_jQbKHT8UuzXFz3F1IXbXvJPSHv1Wiw7YDo63c-jwvTDNdTiJ3IhaMI0lnhRDvQ0KUBIXAaRIZpdpXaFF7g')
                        });
        
                    })
                    .then(function(subscription){
                        // send subscription to server
                        awsApiGatewayFactory.subscribe(room, user, date, subscription, name, number, email, message, function(err, result){
                            if (err) {
                                errorHandler(err);
                                return;
                            }

                            if (result.errorType) {
                                errorHandler(result.errorMessage);
                                return;
                            }

                            //forwad to successful page
                            $window.location.replace("successful.html");
                        });
                    });
                })
                .catch(function(error) {
                    if (Notification.permission === 'denied') {
                        // The user denied the notification permission which
                        // means we failed to subscribe and the user will need
                        // to manually change the notification permission to
                        // subscribe to push messages
                        console.log('Permission for Notifications was denied');
                        trace('permission error');
                    } else {
                        // A problem occurred with the subscription, this can
                        // often be down to an issue or lack of the gcm_sender_id
                        // and / or gcm_user_visible_only
                        console.log('Unable to subscribe to push.', error);
                        trace('subscribe error');
                    }
                })
            } else {
                trace('push messaging is not supported')
                // send subscription to server
                awsApiGatewayFactory.subscribe(room, user, date, '', name, number, email, message, function(err, result){
                    if (err) {
                        errorHandler(err);
                        return;
                    }

                    if (result.errorType) {
                        errorHandler(result.errorMessage);
                        return;
                    }

                    //forwad to successful page
                    $window.location.replace("successful.html");
                });
            }
        };
    }

]);
