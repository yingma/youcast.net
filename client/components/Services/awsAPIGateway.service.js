var mod = angular.module('aws.apigateway', ['aws.cognito.identity']);

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


mod.factory('awsApiGatewayFactory', ['$http', 'awsCognitoIdentityFactory', function($http, awsCognitoIdentityFactory) {

    var api = {};

    api.listRooms = function(callback) {

        awsCognitoIdentityFactory.getSession((err, session) => {

            if (err) {
                return callback(err); 
            }

            var url = environment.roomListUri;
        
            var config = {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': session.idToken.jwtToken
                },
                params: {
                    'user': awsCognitoIdentityFactory.getUserName()
                }
            }

            $http.get(
                url, 
                config
            )
            .then(function (response) {
                trace('successfully list rooms: ' + response.data);
                return callback(null, response.data);
            })
            .catch(function (response) {
                trace(response.statusText);
                return callback(response.status, response.data);
            })
            .finally(function (){
                trace('list room');
            });
            
        });
    };

    api.getRoom = function(room, callback) {

         awsCognitoIdentityFactory.getSession((err, session) => {

            if (err) {
                return callback(err); 
            }

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
            trace('ring');
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
            trace('successfully invite to room');
            return callback(null, response.data);
        })
        .catch(function (response) {
            trace(response.statusText);
            return callback(response.status, response.data);
        })
        .finally(function(){
            trace('invite room');
        });
    };

    api.notify = function(room, key, text, callback) {

        var url = environment.roomNotifyUri;

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
            trace('successfully notify to room');
            return callback(null, response.data);
        })
        .catch(function (response) {
            trace(response.statusText);
            return callback(response.status, response.data);
        })
        .finally(function(){
            trace('notify to room');
        });
    };

    api.composeSMS = function(room, number, user, text, link, callback) {

        var url = environment.composeSMSUri;

        var config = {
            headers: {
                'Content-Type': 'application/json'
            }
        }

        var data = {
            'room': room,
            'number': number,
            'user': user,
            'text': text,
            'link': link
        }

        $http.post(
            url, 
            data,
            config
        )
        .then(function (response) {
            trace('successfully notify to room');
            return callback(null, response.data);
        })
        .catch(function (response) {
            trace(response.statusText);
            return callback(response.status, response.data);
        })
        .finally(function(){
            trace('notify to room');
        });
    };

    api.removeSubscribe = function(room, key, callback) {

        awsCognitoIdentityFactory.getSession((err, session) => {

            if (err) {
                return callback(err); 
            }

            var url = environment.roomUpdateSubscribeUri;

            var config = {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': session.idToken.jwtToken
                }
            }

            var data = {
                'room': room,
                'key': key,
                'flag': 'D'
            }

            $http.post(
                url, 
                data,
                config
            )
            .then(function (response) {
                trace('removed subscription');
                return callback(null, response.data);
            })
            .catch(function (response) {
                trace(response.statusText);
                return callback(response.status, response.data);
            })
            .finally(function(){
                trace('successfully removed subscription');
            });

        });

    };

    api.openSubscribe = function(room, key, callback) {

        awsCognitoIdentityFactory.getSession((err, session) => {

            if (err){
                return callback(err);
            }

            var url = environment.roomUpdateSubscribeUri;

            var config = {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': session.idToken.jwtToken
                }
            }

            var data = {
                'room': room,
                'key': key,
            }

            $http.post(
                url, 
                data,
                config
            )
            .then(function (response) {
                trace('updated subscription');
                return callback(null, response.data);
            })
            .catch(function (response) {
                trace(response.statusText);
                return callback(response.status, response.data);
            })
            .finally(function(){
                trace('updated subscription');
            });

        });

    };

    api.createRoom = function(name, description, resolution, type, notify, maxparty, logo, callback) {
        awsCognitoIdentityFactory.getSession((err, session) => {
            if (err){
                return callback(err);
            }
            var url = environment.roomCreateUri;
            var config = {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': session.idToken.jwtToken
                }
            }
            var data = {
                'user': awsCognitoIdentityFactory.getUserName(),
                'name': name,
                'logo': logo,
                'description': description,
                'resolution': resolution,
                'type': type,
                'notify': notify,
                'maxparty': maxparty
            }
            $http.post(
                url, 
                data,
                config
            )
            .then(function (response) {
                trace('successfully create room');
                return callback(null, response.data);
            })
            .catch(function (response) {
                trace(response.statusText);
                return callback(response.status, response.data);
            })
            .finally(function(){
                trace('create room');
            });

        });
    };

    api.updateRoom = function(room, name, description, resolution, notify, maxparty, logo, callback) {

        awsCognitoIdentityFactory.getSession((err, session) => {

            if (err){
                return callback(err);
            }

            var url = environment.roomUpdateUri;

            var config = {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': session.idToken.jwtToken
                }
            }

            var data = {
                'room': room,
                'user': awsCognitoIdentityFactory.getUserName(),
                'name': name,
                'logo': logo,
                'description': description,
                'resolution': resolution,
                'notify': notify,
                'maxparty': maxparty
            }

            $http.post(
                url, 
                data,
                config
            )
            .then(function (response) {
                trace('successfully update room');
                return callback(null, response.data);
            })
            .catch(function (response) {
                trace(response.statusText);
                return callback(response.status, response.data);
            })
            .finally(function(){
                trace('update room');
            });

        });
       
    };

    api.deleteRoom = function(roomId, callback) {

        awsCognitoIdentityFactory.getSession((err, session) => {
            
            if (err){
                return callback(err);
            }

            var url = environment.roomDeleteUri;

            var config = {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': session.idToken.jwtToken
                }
            }

            var data = {
                'room': roomId,
                'user': awsCognitoIdentityFactory.getUserName()
            }

            $http.post(
                url, 
                data,
                config
            )
            .then(function (response) {
                return callback(null, response.data);
            })
            .catch(function (response) {
                trace(response.statusText);
                return callback(response.status, response.data);
            })
            .finally(function (){
                trace('delete room');
            });

        });
    };

    api.subscribeRoom = function(roomId, subscription, callback) {

        awsCognitoIdentityFactory.getSession((err, session) => {

            if (err){
                return callback(err);
            }

            var url = environment.roomSubscribeUri;

            var config = {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': session.idToken.jwtToken
                }
            }

            var data = {
                'room': roomId,
                'user': awsCognitoIdentityFactory.getUserName(),
                'subscription': JSON.stringify(subscription)
            }

            $http.post(
                url,
                data,
                config
            )
            .then(function (response) {
                return callback(null, response.data);
            })
            .catch(function (response) {
                trace(response.statusText);
                return callback(response.status, response.data);
            })
            .finally(function(){
                trace('subscribe to room');
            });

        });
    };

    api.getUser = function(callback) {
        awsCognitoIdentityFactory.getSession((err, session) => {
            if (err){
                return callback(err);
            }
            var url = environment.userGetUri;
            var config = {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': session.idToken.jwtToken
                },
                params: {
                    'user': awsCognitoIdentityFactory.getUserName()
                }
            }
            $http.get(
                url,
                config
            )
            .then(function (response) {                    
                return callback(null, response.data['data']);
            })
            .catch(function (response) {
                trace(response.statusText);
                return callback(response.status, response.data['data']);
            })
            .finally(function(){
                trace('get user info');
            });

        });
    };
	
	 api.getUser2 = function(userId, callback) {
        awsCognitoIdentityFactory.getSession((err, session) => {
            if (err){
                return callback(err);
            }
            var url = environment.userGetUri;
            var config = {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': session.idToken.jwtToken
                },
                params: {
                    'user': userId
                }
            }
            $http.get(
                url,
                config
            )
            .then(function (response) {                    
                return callback(null, response.data['data']);
            })
            .catch(function (response) {
                trace(response.statusText);
                return callback(response.status, response.data['data']);
            })
            .finally(function(){
                trace('get user info');
            });
        });
    };

    api.confirmPhone = function(phone, callback) {
        
        awsCognitoIdentityFactory.getSession((err, session) => {
           
            if (err){
                return callback(err);
            }

            var url = environment.userUpdateUri;

            var config = {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': session.idToken.jwtToken
                }
            }

            var data = {
                'user': awsCognitoIdentityFactory.getUserName(),
                'phone': phone,
                'verified': true
            }

            $http.post(
                url,
                data,
                config
            )
            .then(function (response) {
                trace("update contact successfully")
                return callback(null, response.data);
            })
            .catch(function (response) {
                trace("Error:" + repsponse.statusText);
                return callback(response.status, response.data);
            })
            .finally(function () {
                trace('get user info'); 
            });

        });
    };


    api.updateContact = function(name, email, phone, address, city, state, zip, country, verified, subscription, callback) {

        awsCognitoIdentityFactory.getSession((err, session) => {

            if (err){
                return callback(err);
            }

            var url = environment.userUpdateUri;

            var config = {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': session.idToken.jwtToken
                }
            }

            var data = {
                'user': awsCognitoIdentityFactory.getUserName(),
                'email': email,
                'phone': phone,
                'name': name,
                'address': address,
                'city': city,
                'state': state,
                'zip': zip,
                'country': country,
                'verified': verified,
                'subscription': subscription
            }

            $http.post(
                url,
                data,
                config
            )
            .then(function (response) {
                trace("update contact successfully")
                return callback(null, response.data);
            })
            .catch(function (response) {
                trace("Error:" + repsponse.statusText);
                return callback(response.status, response.data);
            })
            .finally(function () {
                trace('get user info'); 
            });

        });
       
    };

    api.listSubscriber = function(room, page, callback) {

        awsCognitoIdentityFactory.getSession((err, session) => {

            if (err){
                return callback(err);
            }

            var url = environment.subscriberListUri;

            var config = {
                headers: {
                    'Authorization': session.idToken.jwtToken
                },
                params: {
                    'room': room,
                    'page': page
                }
            }

            $http.get(
                url, 
                config
            )
            .then(function (response) {
                trace('successfully list subscribers: ' + response.data);
                var data = [];
                for (var i = 0; i < response.data.data.length; i++) {
                    data.push(AWS.DynamoDB.Converter.unmarshall(response.data.data[i]));
                }
                return callback(null, data);
            })
            .catch(function (response) {
                return callback(response.status, response.data);
            })
            .finally(function() {
                trace('get room subscribe list');
            });

        });
    };

    api.listTeam = function(room, callback) {

          awsCognitoIdentityFactory.getSession((err, session) => {

            if (err){
                return callback(err);
            }

            var url = environment.teamListUri;

            var config = {
                headers: {
                    'Authorization': session.idToken.jwtToken
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
                trace("successfully get users of team");
                return callback(null, response.data);
            })
            .catch(function (response) {
                return callback(response.status, response.data);
            })
            .finally(function() {
                trace('get room team list');
            });

        });
    };

    api.addTeam = function(member, room, callback) {

          awsCognitoIdentityFactory.getSession((err, session) => {

            if (err){
                return callback(err);
            }

            var url = environment.teamAddUri;

            var config = {
                headers: {
                    'Authorization': session.idToken.jwtToken
                }
            }

            var data = {
                'user': awsCognitoIdentityFactory.getUserName(),
                'member': member,
                'room': room
            }

            $http.post(
                url,
                data,
                config
            )
            .then(function (response) {
                trace("successfully add user to team");
                return callback(null, response.data);
            })
            .catch(function (response) {
                return callback(response.status, response.data);
            })
            .finally(function() {
                trace('add user to team');
            });

        });
    };

    api.removeTeam = function(member, room, callback) {

          awsCognitoIdentityFactory.getSession((err, session) => {

            if (err){
                return callback(err);
            }

            var url = environment.teamRemoveUri;

            var config = {
                headers: {
                    'Authorization': session.idToken.jwtToken
                }
            }

            var data = {
                'user': awsCognitoIdentityFactory.getUserName(),
                'member': member,
                'room': room
            }

            $http.post(
                url,
                data,
                config
            )
            .then(function (response) {
                trace("successfully remove user from team");
                return callback(null, response.data);
            })
            .catch(function (response) {
                return callback(response.status, response.data);
            })
            .finally(function() {
                trace('remove user from team');
            });

        });
    };

    api.queryUser = function(name, email, number, room, callback) {
         awsCognitoIdentityFactory.getSession((err, session) => {
            if (err){
                return callback(err);
            }
            var url = environment.searchUserUri;
            var config = {
                headers: {
                    'Authorization': session.idToken.jwtToken
                },
                params: {
                    'name': name,
                    'email': email,
                    'number': number,
                    'room': room
                }
            }
            $http.get(
                url, 
                config
            )
            .then(function (response) {
                trace('successfully query users: ' + response.data);
                var data = [];
                for (var i = 0; i < response.data.data.length; i++) {
                    data.push(AWS.DynamoDB.Converter.unmarshall(response.data.data[i]));
                }
                return callback(null, data);
            })
            .catch(function (response) {
                return callback(response.status, null);
            })
            .finally(function() {
                trace('get user list');
            });
        });
    };

    api.querySubscriber = function(room, page, name, email, number, callback) {

        awsCognitoIdentityFactory.getSession((err, session) => {

            if (err){
                return callback(err);
            }

            var url = environment.subscriberListUri;

            var config = {
                headers: {
                    'Authorization': session.idToken.jwtToken
                },
                params: {
                    'room': room,
                    'page': page,
                    'name': name,
                    'email': email,
                    'number': number
                }
            }

            $http.get(
                url, 
                config
            )
            .then(function (response) {
                trace('successfully list subscribers: ' + response.data);
                var data = [];
                for (var i = 0; i < response.data.data.length; i++) {
                    data.push(AWS.DynamoDB.Converter.unmarshall(response.data.data[i]));
                }
                return callback(null, data);
            })
            .catch(function (response) {
                return callback(response.status, null);
            })
            .finally(function() {
                trace('get room subscribe list');
            });

        });

    };

    api.loadFiles = function(room, user, time, type, limit, callback) {

        awsCognitoIdentityFactory.getSession((err, session) => {

            if (err){
                return callback(err);
            }

            var url = environment.fileListUri;

            var config = {
                headers: {
                    'Authorization': session.idToken.jwtToken
                },
                params: {
                    'room': room, 
                    'user': user,
                    'time': time,
                    'type': type, 
                    'limit': limit
                }
            }

            $http.get(
                url, 
                config
            )
            .then(function (response) {
                trace('successfully get snapshots: ' + response.data);
                var data = [];
                for (var i = 0; i < response.data.data.length; i++) {
                    var item = AWS.DynamoDB.Converter.unmarshall(response.data.data[i]);
                    item.new_flag=(type=='1');
                    data.push(item);
                }
                return callback(null, data);
            })
            .catch(function (response) {
                return callback(response.status, null);
            })
            .finally(function() {
                trace('get room snapshots');
            });
        });
    };

    api.loadMessages = function(room, user, time, is_new, type, callback) {
        
        awsCognitoIdentityFactory.getSession((err, session) => {
            
            if (err){
                return callback(err);
            }

            var url = environment.messageListUri;

            var config = {
                headers: {
                    'Authorization': session.idToken.jwtToken
                },
                params: {
                    'room': room, 
                    'user': user,
                    'time': time,
                    'new': is_new
                }
            }

            $http.get(
                url, 
                config
            )
            .then(function (response) {
                trace('successfully list message: ' + response.data);
                var data = [];
                for (var i = 0; i < response.data.data.length; i++) {
                    var item = AWS.DynamoDB.Converter.unmarshall(response.data.data[i]);
                    if (item["Type"] == type || !type)
                        data.push(item);
                }
                return callback(null, data);
            })
            .catch(function (response) {
                return callback(response.status, null);
            })
            .finally(function() {
                trace('get room message list');
            });

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
