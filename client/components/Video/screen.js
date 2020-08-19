'use strict';
var webrtc = angular.module('webrtc', ['aws.apigateway'/*, 'webrtc.event', 'angular-flexslider'*/]);

webrtc.controller('screenController', ['$scope', 'EventScreen', 
    function($scope, EventScreen) {
        
        EventScreen.subscribe(scope.setupStream);

        $scope.remoteVideo_ = $(UI_CONSTANTS.remoteVideo);
        $scope.progressdiv_ = $(UI_CONSTANTS.progress);

        $scope.remoteVideo_.srcObject = EventScreen.getStream();

        function hide_(element) {
            element.classList.add('hidden');
        };

        function show_(element) {
            element.classList.remove('hidden');
        };

        $scope.setupStream = function(stream) {
            if (EventScreen.isSharing) {
                // setup video stream
                $scope.remoteVideo_.srcObject = stream;
                show_($scope.remoteVideo_);
                hide_($scope.progressdiv_);
            } else if (!stream) {
                // close window
                hide_($scope.remoteVideo_);
                show_($scope.progressdiv_);
            }
        };
    }
]);
