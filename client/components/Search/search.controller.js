var mod = angular.module('starter.inbox', ['aws.cognito.identity', 'aws.apigateway', 'toastr', 'infinite-scroll', 'ngIntlTelInput', 'ui.bootstrap']);

mod.config(function (ngIntlTelInputProvider) {
    ngIntlTelInputProvider.set({preferredCountries: ['us', 'ca']});
});

mod.controller('InboxCtrl', ['$scope', '$state', '$stateParams', 'awsApiGatewayFactory', 'toastr', '$uibModal', '$filter',
  function($scope, $state, $stateParams, awsApiGatewayFactory, toastr, $uibModal, $filter) {

    var vm = this;

    $scope.sortingOrder = sortingOrder;
    $scope.room = $stateParams.room;
    $scope.error = { message: null };
    $scope.numberToDisplay = 20;
    $scope.moreToLoad = true;
    $scope.users = [];
    $scope.team = [];
    $scope.page = 1;

    $scope.query = '';

    $scope.init = function() {
        awsApiGatewayFactory.listTeam(room, function(err, result) {
            if (err) {
                if (err.message.indexOf("validation") >= 0)
                {
                    awsCognitoIdentityFactory.signOut();
                    $state.go('login', {}, {reoload: true});
                    return;
                }
                toastr.error(err.message, 'Error');
                return;
            }
            if (result) {
                for(var uid in result) {
                    api.getUser(uid, function(err, result) {
                        $scope.team.append(result);
                    });
                }
            }
        });
    };

    $scope.search = function()  {
      
        $scope.query = $scope.query.trim();

        $scope.users = [];
        $scope.moreToLoad = true;

        $scope.loadMore();
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
            awsApiGatewayFactory.queryUser($scope.query, $scope.query, $scope.query, function(err, data){
                if(err) {
                    errorHandler(err);
                    toastr.error(err.message, 'Error');
                    $scope.busy = false;
                    return;
                }

                if (data && data.length > 0) {
                    var origin_length = $scope.users.length;
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

                $scope.busy = false;
            });
        }
    };

    // change sorting order
    $scope.sort_by = function(newSortingOrder) {
        if ($scope.sortingOrder == newSortingOrder)
            $scope.reverse = !$scope.reverse;

        $scope.sortingOrder = newSortingOrder;

        // icon setup
        $('th i').each(function(){
            // icon reset
            $(this).removeClass().addClass('icon-sort');
        });
        if ($scope.reverse)
            $('th.'+new_sorting_order+' i').removeClass().addClass('icon-chevron-up');
        else
            $('th.'+new_sorting_order+' i').removeClass().addClass('icon-chevron-down');
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
                       if ( $scope.user[i] === user) {
                            $scope.user.splice(i, 1);
                            break;
                       }
                    }
                    $scope.team.append(user);
                }
            });
        });
    };

    $scope.addTeam = function() {
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
        toastr.success("Add the users to team", "Success");
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
                    $scope.users.append(user);
                    resolve("The members removed from team");
                }
            });
        });
    };

    $scope.removeTeam = function() {
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
        toastr.success("Removed the user to team", "Success");
    };


    $scope.busy = false;

    errorHandler = function(err) {
        console.log(err);
        $scope.error.message = err.message;
    }
}]);
