var mod = angular.module('starter.room', ['aws.cognito.identity', 'ngMessages', 'aws.apigateway', 'toastr', 'ui.bootstrap', 'ja.qr']);

mod.directive('dragDropCanvas', function () {
    return {
        restrict: 'E',
        replace: true,
        template: '<canvas/>',
        controller: 'RoomCtrl',
        scope: false,
        link: function (scope, element, attrs) {

            element.bind('paint', function (event) {

                var context = element[0].getContext('2d');

                var image = new Image();
                image.src = scope.logo;

                //Image is loaded; draw image
                image.onload = function (event) {
                    //Draw image onto canvas context
                    context.drawImage(image, 0, 0, element[0].width, element[0].height);
                }
            });
            /**
             * Bind canvas to dragover event
             */
            element.bind('dragover', function (event) {
                event.stopPropagation();
                event.preventDefault();

                //Set the drop effect for the draggable image
                event.originalEvent.dataTransfer.dropEffect = 'copy';
            });

            /**
             * Bind canvas to dragenter event
             */
            element.bind('dragenter', function (event) {
                event.stopPropagation();
                event.preventDefault();

                //Set the drop effect for the draggable image
                event.originalEvent.dataTransfer.dropEffect = 'copy';
            });

            /**
             * Bind canvas to drop event; prevent default behavior, read and load image into context
             */
            element.bind('drop', function (event) {
                event.stopPropagation();
                event.preventDefault();

                var canCopy = verifyFile(event);

                if (canCopy) {

                    scope.room.changed = true;

                    var context = element[0].getContext('2d');

                    //Get the event files
                    var file = event.originalEvent.dataTransfer.files[0];

                    //Load image file if FileReader exists and this is really an image
                    var reader = new FileReader();

                    //File reader is loaded; load image
                    reader.onload = function (event) {
                        var image = new Image();

                        image.src = event.target.result;

                        //Image is loaded; draw image
                        image.onload = function (event) {
                            //Draw image onto canvas context
                            context.drawImage(image, 0, 0, element[0].width, element[0].height);

                            //Get the base64 image context
                            scope.logo = element[0].toDataURL('image/png');
                            scope.$apply('logo');
                        }

                    }

                    //Clear the canvas context
                    context.clearRect(0, 0, element[0].width, element[0].height);

                    //Load file reader
                    reader.readAsDataURL(file);
                }
            });

            element.bind('clear', function (event) {
                const context = element[0].getContext('2d');
                context.clearRect(0, 0, element[0].width, element[0].height);
                scope.logo = null;
            });
            /**
             * Verify that there is only one draggable file and can be read as an image
             */
            var verifyFile = function (event) {
                //Get the event files
                var files = event.originalEvent.dataTransfer.files;

                //Ensure there is only one file and it is an image
                if (files.length === 1 && ((typeof FileReader !== 'undefined' && files[0].type.indexOf('image') !== -1))) {
                    return true;
                }

                return false;
            };
        }
    }
});


mod.controller('RoomCtrl', ['$scope', '$window', 'awsCognitoIdentityFactory', '$state', '$stateParams', 'awsApiGatewayFactory', 'toastr', 'notifyingService', '$uibModal', 
  function($scope, $window, awsCognitoIdentityFactory, $state, $stateParams, awsApiGatewayFactory, toastr, notifyingService, $uibModal) {

    $scope.logo = null;

    $scope.room = {changed: false, type: '', resolution: ''};

    $scope.room.Id = $stateParams.room;
    if (!$scope.room.Id)
        $scope.room.type = $stateParams.type;
    $scope.error = { message: null };

    $scope.onload = function() {
        if ($scope.room.Id) {
            awsApiGatewayFactory.getRoom($scope.room.Id, function(err, result){
                if(err) {
                    errorHandler(err);
                    toastr.error(err.message, 'Error');
                    return;
                }
                if (result) {
                    $scope.room.name = result['data']['Name'];
                    $scope.room.description = result['data']['Description'];
                    $scope.room.type = result['data']['Type'];
                    $scope.room.resolution = result['data']['Resolution'];
                    $scope.room.maxparty = result['data']['MaxParty'];
                    if (!$scope.room.maxparty){
                        $scope.room.maxparty = "2";
                    } else {
                        $scope.room.maxparty = result['data']['MaxParty'].toString();
                    }
                    $scope.logo = result['data']['Logo'];
                    $scope.room.notify = result['data']['Notify'];
                    if (!$scope.room.notify){
                        $scope.room.notify = "All";
                    }
                    angular.element('#logo').trigger('paint');
                }
            });
        }
    }

    $scope.onChange = function() {
        $scope.room.changed = true;
    }

    $scope.onResetLogo = function() {
        angular.element('#logo').trigger('clear');
        $scope.room.changed = true;
    }

    $scope.linkRoom = function(room) {
        var modalEmbed = $uibModal.open({
            ariaDescribedBy: 'Embed',
            controller: function($scope, $uibModalInstance, room) {
                $scope.room = room;
                $scope.script = '<a href="' + 'https://bit.ly/2OGT3Ve#' + $scope.room + '">'
                                + '<img border="0" align="center"  src="https://www.youcast.net/pro/images/logobutton.png"/>' 
                                + '</a>';
                $scope.qrcode = 'https://bit.ly/2OGT3Ve#' + $scope.room;

                $scope.copy = function () {
                    document.getElementById('textScript').select();
                    document.execCommand("copy");
                };
              
                $scope.cancel = function () {
                    $uibModalInstance.dismiss('cancel');
                };
            },
            templateUrl: 'components/Room/embed.html',
            resolve: {
                room: function () {
                    return room;
                },
            }
        });


        modalEmbed.result.then(function (result) {
            // Success
            if (result) {

            }

        }, function(){
            // Cancel
        });
    }

    $scope.enterRoom = function() {
        var link;
        if (/iPad|iPhone/.test(navigator.userAgent) && !window.MSStream) {
            link = 'video_ios.html#';
        } else {
            link = 'video.html#';
        }    

        link += $scope.room.Id + '&' + awsCognitoIdentityFactory.getUserName() + '&true';
        $window.location.href = 'components/Video/' + link;
    }
    
    // $scope.subscribeRoom = function() {
    //     //subscribe to gcm
    //     if ('serviceWorker' in navigator && 'PushManager' in window) { 

    //         console.log('Service Worker and Push is supported');
    //         trace('Service Worker and Push is supported');
    //         navigator.serviceWorker.register('../../js/service-worker.js')
    //         .then(function(registration) {
    //             console.log('Service Worker is registered', registration);

    //             // Set the initial subscription value
    //             registration.pushManager.getSubscription()
    //             .then(function(subscription) {
    //                 if (subscription) {
    //                     console.log('User IS subscribed.');
    //                     return subscription;
    //                 }

    //                 return registration.pushManager.subscribe({
    //                     userVisibleOnly: true,
    //                     applicationServerKey: urlB64ToUint8Array('BEKv_jQbKHT8UuzXFz3F1IXbXvJPSHv1Wiw7YDo63c-jwvTDNdTiJ3IhaMI0lnhRDvQ0KUBIXAaRIZpdpXaFF7g')
    //                 });
    
    //             })
    //             .then(function(subscription){
    //                 // send subscription to server
    //                 awsApiGatewayFactory.subscribeRoom($scope.room.Id, subscription, function(err, result){
    //                     if (err) {
    //                         if (err.message.indexOf("validation") >= 0) {
    //                             $state.go('login', {}, {reoload: true});
    //                             return;
    //                         }
    //                         errorHandler(err);
    //                         return;
    //                     }

    //                     if (result.errorType) {
    //                         errorHandler(result.errorMessage);
    //                         return;
    //                     }

    //                     toastr.success('Register browser push successfully');

    //                 });
    //             });
    //         })
    //         .catch(function(error) {
    //             if (Notification.permission === 'denied') {
    //                 // The user denied the notification permission which
    //                 // means we failed to subscribe and the user will need
    //                 // to manually change the notification permission to
    //                 // subscribe to push messages
    //                 console.log('Permission for Notifications was denied');
    //                 toastr.error('Permission for Notifications was denied', 'Error');
    //                 trace('permission error');
    //             } else {
    //                 // A problem occurred with the subscription, this can
    //                 // often be down to an issue or lack of the gcm_sender_id
    //                 // and / or gcm_user_visible_only
    //                 console.log('Unable to subscribe to push', error);
    //                 toastr.error('Unable to subscribe to push', 'Error');
    //                 trace('subscribe error');
    //             }
    //         })
    //     } else {
    //         toastr.error('Browser push does not support', 'Error');
    //         console.warn('Push messaging is not supported');
    //         trace('push messaging is not supported');
    //     }
    // }

    $scope.saveRoom = function() {

        if (!$scope.room.Id) {
            awsApiGatewayFactory.createRoom($scope.room.name, $scope.room.description, $scope.room.resolution, $scope.room.type, $scope.room.notify, parseInt($scope.room.maxparty), $scope.logo, function(err, result){
                if(err) {
                    if (err.message.indexOf("validation") >= 0) {
                        $state.go('login', {}, {reoload: true});
                        return;
                    }
                    errorHandler(err);
                    toastr.error(err.message, 'Error');
                    return;
                }

                if (result) {
                    $scope.room.Id = result['data'];
                    toastr.success('Successfully saved');
                    $scope.room.changed = false;
                    notifyingService.notify('ROOM_TOPIC', $scope.room.Id);
                }
            });

        } else {
            awsApiGatewayFactory.updateRoom($scope.room.Id, $scope.room.name, $scope.room.description, $scope.room.resolution, $scope.room.notify, parseInt($scope.room.maxparty), $scope.logo, function(err, result){
                if(err) {
                    if (err.message.indexOf("validation") >= 0) {
                        $state.go('login', {}, {reoload: true});
                        return;
                    }
                    errorHandler(err);
                    toastr.error(err.message, 'Error');
                    return;
                }
                toastr.success('Successfully saved');
                $scope.room.changed = false;
                notifyingService.notify('ROOM_TOPIC', $scope.room.Id);
            });
        }
    }

    $scope.deleteRoom = function() {

        if ($scope.room.Id) {
            awsApiGatewayFactory.deleteRoom($scope.room.Id, function(err, result){
                if(err) {
                    if (err.message.indexOf("validation") >= 0) {
                        $state.go('login', {}, {reoload: true});
                        return;
                    }
                    errorHandler(err);
                    toastr.error(err.message, 'Error');
                    return;
                }

                if (result.errorType) {
                    // wrong number here
                    errorHandler(new Error(result.errorMessage));
                    toastr.error(result.errorMessage, 'Error');
                    return;
                }

                if (result) {
                    notifyingService.notify('ROOM_TOPIC', '~' + $scope.room.Id);
                    $state.go('home');
                }
            });
        }

    }

    errorHandler = function(err) {
        console.log(err);
        $scope.error.message = err.message;
    }
}]);
