var mod = angular.module('starter.sidebar', ['aws.cognito.identity', 'aws.apigateway']);

mod.controller('SidebarCtrl', ['$scope', '$location', '$state', 'awsCognitoIdentityFactory', 'awsApiGatewayFactory', 'notifyingService',
  function($scope, $location, $state, awsCognitoIdentityFactory, awsApiGatewayFactory, notifyingService) {

    $scope.activeRoom = '';
    $scope.rooms = [];

    $scope.sidebarUrl = '';
    $scope.error = { message: null };

    $scope.init = function() {
        awsCognitoIdentityFactory.getSession(function(err, session) {
            if (err) {
                 $scope.sidebarUrl = '';
                 return;
            }
            $scope.sidebarUrl = 'components/Sidebar/sidebar.view.html'
            $scope.load();
        });

        awsCognitoIdentityFactory.registerLoginCallback(function(auth){
            if (!auth) {
                $scope.sidebarUrl = '';
                return;
            }
            
            $scope.sidebarUrl = 'components/Sidebar/sidebar.view.html';
            $scope.load();
        });

    }


    $scope.isExpanded = function(room) {
        if (room == $scope.activeRoom) {
            return true;
        }
        return false;
    }

    $scope.isCollapsed = function() {

        return $scope.collapsed;
    }

    $scope.toggleSidebar = function() {
    //$('#sidebar').toggleClass('active');
        $scope.collapsed = !$scope.collapsed;
    };

    $scope.load = function() {

    	awsApiGatewayFactory.listRooms(function(err, result) {
            if (err) {
                if (err.message.indexOf("validation") >= 0) {
                    $scope.sidebarUrl = '';
                    //$state.go('login', {}, {reoload: true});
                    return;
                }
                //$scope.error.message = err.message;
                //$state.go('login', {}, {reoload: true});
                return;
            }
            if (result) {
                $scope.rooms = result.data;
            }
        });
    }

    $scope.openSettings = function(r) {
        $scope.activeRoom = r;
        $state.go('room', {room: r, type: ''});
    }

    $scope.openMessages = function(r) {
        $state.go('inbox', {room: r});
    }

    $scope.openTeam = function(r) {
        awsApiGatewayFactory.getRoom(r, function(err, result) {
            if (err) {
                $scope.error.message = err.message;
                $scope.activeRoom = null;
                return;
            }
            if (result) {
                if (result['data']['Owner'] === awsCognitoIdentityFactory.getUserName()) {
                    $state.go('team', {room: r});
                } else {
                    $state.go('team1', {room: r});
                }
            }
        });
    }

    notifyingService.subscribe($scope, 'ROOM_TOPIC', function(event, room) {
        // Handle notification
        if (room.startsWith('~')) {
            room = room.substr(1);
            for (var i = $scope.rooms.length - 1; i >= 0; i--) {
                if ($scope.rooms[i].Id === room) {
                    $scope.rooms.splice(i, 1);
                    break;
                }
            }

        } else if (room) {
            awsApiGatewayFactory.getRoom(room, function(err, result) {
                if (err) {
                    $scope.error.message = err.message;
                    $scope.activeRoom = null;
                    return;
                }
                if (result) {
                    var found = false;
                    for (var i = $scope.rooms.length - 1; i >= 0; i--) {
                        if ($scope.rooms[i].Id === room) {
                            $scope.rooms[i].Name = result.data.Name;
                            $scope.rooms[i].NewMessage = result.data.New;
                            $scope.rooms[i].Description = result.data.Description;
                            found = true;
                            break;
                        }
                    }
                    if (!found)
                        $scope.rooms.push({'Name': result.data.Name, 'Id': room, 'Description': result.data.Description, 'NewMessage': result.data.New});

                    $scope.activeRoom = room;
                }
            });
        } else {
            $scope.load();
        }
    });

}]);



