var mod = angular.module('starter.team', ['aws.cognito.identity', 'aws.apigateway', 'toastr', 'infinite-scroll', 'ngIntlTelInput', 'ui.bootstrap']);

mod.config(function (ngIntlTelInputProvider) {
    ngIntlTelInputProvider.set({preferredCountries: ['us', 'ca']});
});

mod.controller('TeamCtrl', ['$scope', '$state', '$stateParams', 'awsCognitoIdentityFactory', 'awsApiGatewayFactory', 'toastr', '$uibModal', '$filter',
  function($scope, $state, $stateParams, awsCognitoIdentityFactory, awsApiGatewayFactory, toastr, $uibModal, $filter) {

    var vm = this;

    $scope.sortingOrder = sortingOrder;
    $scope.sortingOrder1 = sortingOrder;
    $scope.room = $stateParams.room;
    $scope.error = { message: null };
    $scope.numberToDisplay = 20;
    $scope.moreToLoad = true;
    $scope.users = [];
    $scope.team = [];
    $scope.page = 1;

    $scope.query = '';
    $scope.loading = false;

    $scope.init = function() {
        $scope.loading = true;
        awsApiGatewayFactory.listTeam($scope.room, function(err, result) {
            if (err) {
                if (err.message.indexOf("validation") >= 0) {
                    awsCognitoIdentityFactory.signOut();
                    $state.go('login', {}, {reoload: true});
                    return;
                }
                toastr.error(err.message, 'Error');
                return;
            }
            if (result.data && result.data.length > 0) {
                Promise.all(result.data.map((user) => {
                    awsApiGatewayFactory.getUser2(user["Member"]["S"], function(err, result) {
                        result["Selected"] = false;
                        $scope.team.push(result);
                        Promise.resolve("User loaded");
                    });
                }))
                .then(() => {
                    $scope.loading = false;
                });
            } else {
                $scope.loading = false;
            }
        });
    };

    $scope.keyPress = function(keyEvent)  {
        if (keyEvent.which === 13) {
            keyEvent.preventDefault();
            $scope.query = $scope.query.trim();
            $scope.users = [];
            $scope.moreToLoad = true;
            $scope.loadMore();
        }
    };

    var is_loading = false;
    $scope.busy = false;

    $scope.loadMore = function() {

        if (!$scope.moreToLoad)
            return;

        if ($scope.busy) 
            return;
            
        $scope.busy = true;
        if ($scope.query) {
            awsApiGatewayFactory.queryUser($scope.query, $scope.query, $scope.query, $scope.room, function(err, data){
                if(err) {
                    errorHandler(err);
                    toastr.error(err.message, 'Error');
                    $scope.busy = false;
                    return;
                }

                if (data && data.length > 0) {
                    var origin_length = $scope.users.length;
                    for (var i = data.length - 1; i >= 0; i--) {
                        data[i]["Selected"] = false;
                    }
                    $scope.users = $scope.users.concat(data);

                    // take care of the sorting order
                    if ($scope.sortingOrder !== '') {
                        $scope.users = $filter('orderBy')($scope.users, $scope.sortingOrder, $scope.reverse);
                    }

                    if (data.length < 20)
                        $scope.moreToLoad = false;
                    else
                        $scope.page ++;
                }
            });
        }
        $scope.busy = false;
    };

    // change sorting order
    $scope.sort_by = function(newSortingOrder, order) {
        if (order == '0') {
            if ($scope.sortingOrder == newSortingOrder)
                $scope.reverse = !$scope.reverse;
            $scope.sortingOrder = newSortingOrder;
        } else {
            if ($scope.sortingOrder1 == newSortingOrder)
                $scope.reverse1 = !$scope.reverse1;
            $scope.sortingOrder1 = newSortingOrder;
        }
    };

    var addTeam = function(room, user) {
        return new Promise(function(resolve, reject) {
             awsApiGatewayFactory.addTeam(user.Id, room, function(err, result) {
                if (err) {
                    if (err.message.indexOf("validation") >= 0)
                    {
                        awsCognitoIdentityFactory.signOut();
                        $state.go('login', {}, {reoload: true});
                        return;
                    }
                    $scope.error.message = err.message;
                    toastr.error(err.message, 'Error');
                    return;
                }
                if (result) {
                    for( var i = 0; i < $scope.users.length; i++){ 
                       if ( $scope.users[i] === user) {
                            $scope.users.splice(i, 1);
                            break;
                       }
                    }
                    user["Selected"] = false;
                    $scope.team.push(user);
                    resolve("The members added to team");
                }
            });
        });
    };

    $scope.addTeam = async () => {
        let userArray =[];
        for (var j = 0; j < $scope.users.length; j++) {
            user = $scope.users[j];
            if (user.Selected) {
                userArray.push(user);
            }
        }
        await Promise.all(userArray.map(async (user) => {
            let result = await addTeam($scope.room, user);
            console.log(result);
        }));
        if (userArray.length > 0){
            toastr.success("Add the users to team", "Success");
        } else {
            toastr.warning("Please select user(s)", "Warning");
        }
    };

    var removeTeam = function(room, user) {
        return new Promise(function(resolve, reject) {
            awsApiGatewayFactory.removeTeam(user.Id, room, function(err, result) {
                if (err) {
                    if (err.message.indexOf("validation") >= 0) {
                        awsCognitoIdentityFactory.signOut();
                        $state.go('login', {}, {reoload: true});
                        reject(Error("Authentication failed"));
                        return;
                    }
                    $scope.error.message = err.message;
                    toastr.error(err.message, 'Error');
                    reject(err);
                    return;
                }

                if (result) {
                    for( var i = 0; i < $scope.team.length; i++) { 
                       if ( $scope.team[i] === user) {
                            $scope.team.splice(i, 1);
                            break;
                       }
                    }
                    user["Selected"] = false;
                    $scope.users.push(user);
                    resolve("The members removed from team");
                }
            });
        });
    };

    $scope.removeTeam = async () => {
        let userArray = [];
        for (var j = 0; j < $scope.team.length; j++) {
            user = $scope.team[j];
            if (user.Selected) {
                userArray.push(user);
            }
        }
        await Promise.all(userArray.map(async (user) => {
            let result = await removeTeam($scope.room, user);
            console.log(result);
        }));
        if (userArray.length > 0) {
            toastr.success("Removed the user to team", "Success");
        } else {
            toastr.warning("Please select team member(s)", "Warning");
        }
    };


    $scope.busy = false;

    errorHandler = function(err) {
        console.log(err);
        $scope.error.message = err.message;
    }
}]);
