var mod = angular.module('photoswipe', ['aws.apigateway', 'aws.cognito.identity']);

function hide_(element) {
    if (element)
        element.classList.add('hidden');
};

function show_(element) {
    if (element)
        element.classList.remove('hidden');
};

mod.controller('photoswipeCtrl', ['$scope', 'awsCognitoIdentityFactory', '$location', '$q', 'awsApiGatewayFactory', //'EventUpload',
    function($scope, awsCognitoIdentityFactory, $location, $q, awsApiGatewayFactory /*, EventUpload */) {
        var parameters = $location.hash().split('&');

        $scope.room = parameters[0];
        $scope.user = parameters[1];
        var key = parameters[2];

        var items = [];
        var index = 0;

        $scope.error = { message: null };

        var promise = new Promise(function(resolve, reject) {
            awsApiGatewayFactory.loadFiles($scope.room, $scope.user, 0, "1", 200, function(err, data){

                if(err) {
                    if (err.message.indexOf("validation") >= 0) {
                        awsCognitoIdentityFactory.signOut();
                        $state.go('login', {}, {reoload: true});
                        return;
                    }
                    errorHandler(err);
                    toastr.error(err.message, 'Error');
                    $scope.busy = false;
                    reject(err);
                    return;
                }

                if (data)
                    data.forEach(function(item){
                        var k = item["UserKey"];
                        if (k === key) 
                        {
                            index = items.length;
                        }
                        items.push({src:"https://www.youcast.net/uploads/" + $scope.room + "/" + k + ".jpg", w:item["Width"], h:item["Height"]});    
                    });
                resolve(1);
            });
        });

        var openPhotoSwipe = function() {
            var pswpElement = document.querySelectorAll('.pswp')[0];
            
            // define options (if needed)
            var options = {
                // history & focus options are disabled on CodePen  
                escKey: true,      
                history: true,
                focus: true,
                fullscreenEl: true,
                closeEl:true,
                index: index,
                showAnimationDuration: 0,
                hideAnimationDuration: 0
            };
            
            var gallery = new PhotoSwipe( pswpElement, PhotoSwipeUI_Default, items, options);
            gallery.init();

            // Gallery starts closing
            gallery.listen('close', function() {
                if (parent) { 
                    hide_(parent.document.getElementById('photoswipe'));
                    show_(parent.document.getElementById('main'));
                }
            });
        };


        $scope.onload = function() {
            promise
            .then(function(response){
                openPhotoSwipe();
                trace('successfully load files');
            })
            .catch(function(response){
                trace(response.statusText);
            })
            .finally(function(){
                trace('successfully load files');
            });
        }
    }

]);



