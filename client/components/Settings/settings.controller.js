var mod = angular.module('starter.settings', ['aws.cognito.identity', 'aws.apigateway', 'ngMessages', 'toastr', 'ja.qr']);

mod.controller('SettingsCtrl', ['$scope', 'awsCognitoIdentityFactory', 'awsApiGatewayFactory', '$state', '$stateParams', 'notifyingService', 'toastr',
  function($scope, awsCognitoIdentityFactory, awsApiGatewayFactory, $state, $stateParams, notifyingService, toastr) {
    $scope.user = {};
    $scope.error = { message: null, message1: null };
    $scope.setting = { edit: false, changed: false };
    $scope.contact = { edit: false, changed: false };

    $scope.user.phone = $stateParams.phone;
	$scope.disablePush = false;

    $scope.load = function() {
        awsApiGatewayFactory.getUser(function(err, result) {
            if (err) {
                if (err.message.indexOf("validation") >= 0) {
                    awsCognitoIdentityFactory.signOut();
                    $state.go('login', {}, {reoload: true});
                    return;
                }
                $scope.error.message = err.message;
                toastr.error(err.message, 'Error');
                return;
            }
            if (result) {
                $scope.user.name = result['Name'];
                $scope.user.phone = result['Phone'];
                $scope.user.address = result['Address'];
                $scope.user.city = result['City'];
                $scope.user.state = result['State'];
                $scope.user.zip = result['Zip'];
                $scope.user.country = result['Country'];
                $scope.user.verified = result['Verified'];
				$scope.user.subscription = result['Subscription'];
                $scope.isSubscribed = !!$scope.user.subscription;
            }
        });

        awsCognitoIdentityFactory.getUserAttributes(function(err, result) {
            if (err) {
                $scope.error.message = err.message;
                toastr.error(err.message, 'Error');
                return;
            }
            if (result) {
                $scope.user.email = result['email'];
            }
        });
    };

    $scope.editSetting = function(){
        $scope.setting.edit = !$scope.setting.edit;
        $scope.error.message = '';
    };

    $scope.cancelEditSetting = function(){
        $scope.setting.edit = false;
        $scope.error.message = '';

    };

    $scope.cancelEditContact = function(){
        $scope.contact.edit = false;
        $scope.error.message1 = '';
        $scope.contact.name = $scope.user.name;
        $scope.contact.phone = $scope.user.phone;       
        $scope.contact.address = $scope.user.address;
        $scope.contact.city = $scope.user.city;
        $scope.contact.state = $scope.user.state;
        $scope.contact.zip = $scope.user.zip;
        $scope.contact.country = $scope.user.country;
        $scope.contact.verified = $scope.user.verified;
        $scope.isSubscribed = !!$scope.user.subscription;
    };

    $scope.onChangeContact = function() {
        $scope.contact.changed = true;
    };

    $scope.onTogglePush = function() {
        if ($scope.contact.subscription) {
            $scope.contact.subscription = '';
            $scope.isSubscribed = false;
            return;
        }
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
                        delete subscription['expirationTime'];
                        $scope.contact.subscription = subscription;                        
                        $scope.isSubscribed = true;
                        return;
                    }
                    return registration.pushManager.subscribe({
                        userVisibleOnly: true,
                        applicationServerKey: urlB64ToUint8Array('BEKv_jQbKHT8UuzXFz3F1IXbXvJPSHv1Wiw7YDo63c-jwvTDNdTiJ3IhaMI0lnhRDvQ0KUBIXAaRIZpdpXaFF7g')
                    });
                })
                .then(function(){
                    // send subscription to server
                    //$scope.user.subscription = subscription;
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
            });
        } else {
            trace('push messaging is not supported');
            // send subscription to server
            // not supported disable checkbox
			$scope.disablePush = true;
        }
    };

    $scope.onChangePhone = function() {
        if ($scope.contact.phone != $scope.user.phone) {
            $scope.contact.verified = false;
            $scope.contact.changed = true;
        } else {
            $scope.contact.verified = $scope.user.verified;
        }

    };

    $scope.updatePassword = function() {
        awsCognitoIdentityFactory.changePassword($scope.setting.oldPassword, $scope.setting.newPassword, function(err, result){
            if (err) {
                $scope.error.message = err.message;
                toastr.error(err.message, 'Error');
                return;
            }
            $scope.setting.edit = false;
            $scope.error.message = '';
            toastr.success("Password changed", "Success")
        });
    };

    $scope.editContact = function(){
        $scope.contact.edit = !$scope.contact.edit;
        $scope.error.message1 = '';
        if ($scope.contact.edit) {
            $scope.contact.name = $scope.user.name;
            $scope.contact.email = $scope.user.email;
            $scope.contact.phone = $scope.user.phone;       
            $scope.contact.address = $scope.user.address;
            $scope.contact.city = $scope.user.city;
            $scope.contact.state = $scope.user.state;
            $scope.contact.zip = $scope.user.zip;
            $scope.contact.country = $scope.user.country;
            $scope.contact.verified = $scope.user.verified;
            $scope.contact.issubscribed = $scope.isSubscribed;
        }
    };

    $scope.resendCode = function() {
        $scope.user.code = "";
        awsCognitoIdentityFactory.getAttributeVerficationCode("phone_number", function(err, result) {
            if (err) {
                errorHandler(err)
                return false;
            }
            console.log('Resend code succsesfully');
            return true;
        });
    };

    $scope.confirmPhone = function() {
        awsCognitoIdentityFactory.verifyPhone($scope.user.code, function(err, result){
            if (err) {
                $scope.error.message1 = err.message;
                toastr.error(err.message, 'Error');
                return;
            }

            toastr.success("Phone confirmed", "Success")

            awsApiGatewayFactory.confirmPhone($scope.user.phone, function(err, result){
                if (err){
                    $scope.error.message1 = err.message;
                    toastr.error(err.message, 'Error');
                    return; 
                }
                $scope.user.verified = true;
                notifyingService.notify('CONFIRM_TOPIC', $scope.user);

                $state.go('settings');
            });

        });
    };

    $scope.updatePhone = function(){
        awsCognitoIdentityFactory.updatePhone($scope.user.phone, function(err, result){
            if (err){
                $scope.error.message1 = err.message;
                toastr.error(err.message, 'Error');
                return; 
            }
            $state.go('phoneconfirm', {phone: $scope.user.phone});
        });
    };

    $scope.updateContact = function() {
        awsApiGatewayFactory.updateContact($scope.contact.name, $scope.contact.email, $scope.contact.phone, $scope.contact.address, $scope.contact.city, $scope.contact.state, $scope.contact.zip, $scope.contact.country, $scope.contact.verified, $scope.contact.subscription, function(err, result) {
            if(err) {
                if (err.message.indexOf("validation") >= 0){
                    awsCognitoIdentityFactory.signOut();
                    $state.go('login', {}, {reoload: true});
                    return;
                }
                $scope.error.message1 = err.message;
                return false;
            }

            $scope.contact.edit = false;
            $scope.error.message1 = '';

            var phoneChanged = false;

            if ($scope.user.phone != $scope.contact.phone) {

                phoneChanged = true;
            }
            $scope.user.phone = $scope.contact.phone;
            $scope.user.name = $scope.contact.name;
            $scope.user.address = $scope.contact.address;
            $scope.user.city = $scope.contact.city;
            $scope.user.state = $scope.contact.state;
            $scope.user.zip = $scope.contact.zip;
            $scope.user.country = $scope.contact.country;
            $scope.user.verified = !phoneChanged && $scope.user.verified;
            $scope.user.subscription = $scope.contact.subscription;
			notifyingService.notify('CONFIRM_TOPIC', $scope.user);
        });
    };
}]);
