var mod = angular.module('aws.apigateway', []);

mod.service('LoadingInterceptor', ['$q', '$rootScope', '$log', 
    function ($q, $rootScope, $log) {
    
        var xhrCreations = 0;
        var xhrResolutions = 0;
     
        function isLoading() {
            return xhrResolutions < xhrCreations;
        }
     
        function updateStatus() {
            $rootScope.loading = isLoading();
        }
     
        return {
            request: function (config) {
                xhrCreations++;
                updateStatus();
                return config;
            },
            requestError: function (rejection) {
                xhrResolutions++;
                updateStatus();
                $log.error('Request error:', rejection);
                return $q.reject(rejection);
            },
            response: function (response) {
                xhrResolutions++;
                updateStatus();
                return response;
            },
            responseError: function (rejection) {
                xhrResolutions++;
                updateStatus();
                $log.error('Response error:', rejection);
                return $q.reject(rejection);
            }
        };
    }]);


mod.factory('awsApiGatewayFactory', ['$http', function($http) {
    
    var api = {};

    // region
    var region = environment.region;

    /* *********************************** */
    AWS.config.region = region;

    api.getRoom = function(room, callback) {

        var url = environment.roomGetUri;

        var config = {
            headers: {
                'Content-Type': 'application/json'
            },
            params: {
                'room': room
            }
        }

        $http.get(
            url, 
            config
        )
        .then(function (response) {
            trace('successfully get room');
            return callback(null, response.data);
        })
        .catch(function (response) {
            trace(response.statusText);
            return callback(response.status, response.data);
        })
        .finally(function(){
            trace('get room');
        });
    };


    api.ring = function(room, user, key, recaptcha, callback) {

        var url = environment.roomRingUri;

        var config = {
            headers: {
                'Content-Type': 'application/json'
            },
            params: {
                'room': room, 
                'user': user,
                'key': key,
                'recaptcha': recaptcha
            }
        }

        $http.get(
            url, 
            config
        )
        .then(function (response) {
            trace('successfully ring up');
            return callback(null, response.data);
        })
        .catch(function (response) {
            trace(response.statusText);
            return callback(response.status, response.data);
        })
        .finally(function(){
            trace('ring up');
        });
    };

    api.invite = function(room, key, text, callback) {

        var url = environment.roomInviteUri;

        var config = {
            headers: {
                'Content-Type': 'application/json'
            }
        }

        var data = {
            'room': room,
            'key': key,
            'text': text
        }

        $http.post(
            url, 
            data,
            config
        )
        .then(function (response) {
            trace('successfully send invite for room');
            return callback(null, response.data);
        })
        .catch(function (response) {
            trace(response.statusText);
            return callback(response.status, response.data);
        })
        .finally(function(){
            trace('sent invite for room');
        });
    };

    api.notify = function(room, key, text, link, callback) {

        var url = environment.roomNotifyUri;

        var config = {
            headers: {
                'Content-Type': 'application/json'
            }
        }

        var payload = {
            url : link,
            comment : text,
            exp: 3600,
            tag: room
        }

        var data = {
            'room': room,
            'text': JSON.stringify(payload)
        }

        $http.post(
            url, 
            data,
            config
        )
        .then(function (response) {
            trace('successfully sent notify for room');
            return callback(null, response.data);
        })
        .catch(function (response) {
            trace(response.statusText);
            return callback(response.status, response.data);
        })
        .finally(function(){
            trace('sent notify for room');
        });
    };

    api.subscribe = function(room, user, date, subscription, name, number, email, message, callback) {

        var url = environment.roomSubscribeUri;

        var config = {
            headers: {
                'Content-Type': 'application/json'
            }
        }

        var data = {
            'room': room,
            'user': user,
            'date': date,
            'subscription': subscription,
            'name': name,
            'number': number,
            'email': email,
            'message': message
        }

        $http.post(
            url, 
            data,
            config
        )
        .then(function (response) {
            trace('successfully subscribe to room');
            return callback(null, response.data);
        })
        .catch(function (response) {
            trace(response.statusText);
            return callback(response.status, response.data);
        })
        .finally(function(){
            trace('subscribe to room');
        });
    };

    function getCurrentPosition() {
        var options = {
            enableHighAccuracy: true,
            timeout: 5000,
            maximumAge: 0
        };
        return new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject, options));
    }; 

    api.addFile = function(room, user, thumbnail, width, height, callback) {
        
        var latitude, longtitude;

        // update meta data
        var url = environment.fileAddFileUri;
        var date = new Date();

        var config = {
            headers: {
                'Content-Type': 'application/json'
            }
        }

        if ("geolocation" in navigator) {
            getCurrentPosition().then(position => {
                if (position.coords) {
                    latitude = position.coords.latitude;
                    longitude = position.coords.longitude;
                }

                var data = {
                    'user': user,
                    'room': room,
                    'width': width,
                    'height': height,
                    'thumbnail': thumbnail,
                    'latitude': latitude,
                    'longitude': longitude,
                    'date': date.toLocaleDateString() + ' ' + date.toLocaleTimeString() 
                }

                $http.post(
                    url, 
                    data,
                    config
                )
                .then(function (response) {
                    trace('successfully upload file');
                    return callback(null, response.data);
                })
                .catch(function (response) {
                    trace(response.statusText);
                    return callback(response.status, response.data);
                })
                .finally(function(){
                    trace('upload file to room');
                });

            }).catch((err) => {
                console.error(err.message);
            });

        } else {

            var data = {
                'user': user,
                'room': room,
                'width': width,
                'height': height,
                'thumbnail': thumbnail,
                'date': date.toLocaleDateString() + ' ' + date.toLocaleTimeString() 
            }

            $http.post(
                url, 
                data,
                config
            )
            .then(function (response) {
                trace('successfully upload file');
                return callback(null, response.data);
            })
            .catch(function (response) {
                trace(response.statusText);
                return callback(response.status, response.data);
            })
            .finally(function(){
                trace('upload file to room');
            });
        }
    };

    api.getFiles = function (room, user, callback) {

        var url = environment.fileGetUri;

        var config = {
            headers: {
                'Content-Type': 'application/json'
            },
            params: {
                'room': room,
                'user': user
            }
        }

        $http.get(
            url, 
            config
        )
        .then(function (response) {
            trace('successfully get new file list');
            return callback(null, response.data);
        })
        .catch(function (response) {
            trace(response.statusText);
            return callback(response.status, response.data);
        })
        .finally(function(){
            trace('get new file list');
        });
    };

    api.uploadFile = function(url, blob, callback) {

        var request = new XMLHttpRequest();
        request.open("PUT", url, true);
        request.setRequestHeader("Content-Type", "image/jpeg");

        request.onreadystatechange = function() {
            if (this.readyState == XMLHttpRequest.DONE && request.status == 200) {
                console.log(request.responseText);
                return callback(null, request.responseText);
            } else {
                console.log(request.statusText);
                return callback(request.status, request.statusText);
            }
        };

        request.send(blob);
    };

    api.submitFile = function(room, key, callback) {

        // update meta data
        var url = environment.fileSubmitUri;

        var config = {
            headers: {
                'Content-Type': 'application/json'
            }
        }

        var data = {
            'room': room,
            'key': key
        }

        return $http.post(
            url, 
            data,
            config
        );
    };

    api.removeFile = function(room, userkey, callback) {

        // update meta data
        var url = environment.fileDeleteUri;

        var config = {
            headers: {
                'Content-Type': 'application/json'
            }
        }

        var data = {
            'room': room,
            'userkey': userkey
        }

        $http.post(
            url, 
            data,
            config
        )
        .then(function (response) {
            trace('successfully remove file');
            return callback(null, response.data);
        })
        .catch(function (response) {
            trace(response.statusText);
            return callback(response.status, response.data);
        })
        .finally(function(){
            trace('remove file');
        });
    };

    api.joinRoom = function(room, user, token, callback) {

        var url = environment.roomJoinUri;

        var config = {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': token
            }
        }

        var data = {
            'user': user,
            'room': room
        }

        $http.post(
            url, 
            data,
            config
        )
        .then(function (response) {
            trace('successfully join room');
            return callback(null, response.data);
        })
        .catch(function (response) {
            trace(response.statusText);
            return callback(response.error, response.data);
        })
        .finally(function(){
            trace('join room');
        });
    };

    api.joinRoom = function(room, user, token, callback) {

        var url = environment.roomJoin1Uri;

        var config = {
            headers: {
                'Content-Type': 'application/json'
            }
        }

        var data = {
            'user': user,
            'room': room
        }

        $http.post(
            url, 
            data,
            config
        )
        .then(function (response) {
            trace('successfully join room');
            return callback(null, response.data);
        })
        .catch(function (response) {
            trace(response.statusText);
            return callback(response.error, response.data);
        })
        .finally(function(){
            trace('join room');
        });
    };

    trace = function(text) {

        if (!text)
            return;
        
        // This function is used for logging.
        if (text[text.length - 1] === '\n') {
            text = text.substring(0, text.length - 1);
        }
        if (window.performance) {
            var now = (window.performance.now() / 1000).toFixed(3);
            console.log(now + ': ' + text);
        } else {
            console.log(text);
        }
    }

    return api;
}]);
