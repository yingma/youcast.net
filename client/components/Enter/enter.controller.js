var mod = angular.module('starter.enter', ['ngRoute', 'aws.apigateway', 'vcRecaptcha']);

mod.controller('enterCtrl', ['$scope', '$window', '$location', 'awsApiGatewayFactory', 'vcRecaptchaService',
    function($scope, $window, $location, awsApiGatewayFactory, vcRecaptchaService) {

        $scope.recaptchaResponse = null;
        $scope.widgetId = null;

        $scope.logo = null;
        $scope.description = "";

        $scope.room = $location.hash();

        $scope.recaptchaKey = '6LfMATUUAAAAAJX851JlWLJyLEeOia_JXY5GJOe6';

        $scope.onload = function() {
            if ($scope.room) {
                awsApiGatewayFactory.getRoom($scope.room, function(err, result) {
                    if (err) {
                        $scope.error.message = err.message;
                        return;
                    }
                    if (result) {
                        $scope.description = result['data']['Description'];
                        $scope.logo = result['data']['Logo'];
                    }
                });
            }
        } 

        $scope.setResponse = function (response) {
            console.info('Response available');
            $scope.recaptchaResponse = response;
        }
        
        $scope.setWidgetId = function (widgetId) {
            console.info('Created widget ID: %s', widgetId);
            $scope.widgetId = widgetId;
        }

        $scope.cbExpiration = function() {
            console.info('Captcha expired. Resetting response object');
            vcRecaptchaService.reload($scope.widgetId);
            $scope.recaptchaResponse = null;
        }
        
        $scope.enter = function () {
            $scope.user_id = localStorage.getItem($scope.room);
            if (!$scope.user_id) {
                // generate client id 
                $scope.user_id = randomString(9);
                localStorage.setItem($scope.room,$scope.user_id);
            }
            // forward to ring page
            $window.location.href = '../Ring/ring.html#' + $scope.room + '&' + $scope.user_id + '&' + '&' + $scope.recaptchaResponse;
        }

        // Return a random numerical string.
        randomString = function(strLength) {
            var result = [];
            strLength = strLength || 5;
            var charSet = '0123456789';
            while (strLength--) {
                result.push(charSet.charAt(Math.floor(Math.random() * charSet.length)));
            }
            return result.join('');
        }

        errorHandler = function(err) {
            console.log(err);
            $scope.error.message = err.message;
            $scope.$apply();
        }
    }
]);

