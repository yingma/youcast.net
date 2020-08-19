'use strict';
    
var webrtc = angular.module('webrtc', ['aws.apigateway'/*, 'webrtc.event', 'angular-flexslider'*/]);

webrtc.controller('videoController', ['$scope', '$window', '$location', '$http', 'EventSnap', 'EventCall', 'EventScreen', 'EventWhiteboard', 'awsApiGatewayFactory',
    function($scope, $window, $location, $http, EventSnap, EventCall, EventScreen, EventWhiteboard, awsApiGatewayFactory) {

        var params = $location.hash().split('&');

        if (!params[0] || !params[1]) {
            alert('Missing room or user name');
            trace('Missing room or user name');
            return;
        }

        $scope.room = params[0];
        $scope.user = params[1];
        $scope.auth = params[2];

        var currentX;
        var currentY;
        var initialX;
        var initialY;
        var xOffset = 0;
        var yOffset = 0;
        var dragItem = null;
        var inWhiteboard_ = false;

        $scope.calls_ = [];
        $scope.screenCalls_ = [];

        $scope.videoInputs_ = [];
        $scope.audioInputs_ = [];
        $scope.audioOutputs_ = [];
        $scope.hasRemoteStream_ = true;

        document.body.addEventListener("touchstart", dragStart, false);
        document.body.addEventListener("touchend", dragEnd, false);
        document.body.addEventListener("touchmove", drag, false);

        document.body.addEventListener("mousedown", dragStart, false);
        document.body.addEventListener("mouseup", dragEnd, false);
        document.body.addEventListener("mousemove", drag, false);

        // $scope.eventUpload = EventUpload;

        // $scope.snapshots = [];
        
        $scope.init = function() {
            awsApiGatewayFactory.joinRoom(params[0], params[1], function(err, result){
                if(err) {
                    alert(err.message);
                    trace("error:" + error);
                }

                if (result.errorType) {
                    // wrong number here
                    alert(result.errorMessage);
                    trace("error:" + result.errorMessage);
                    return;
                }
                
                if (result) {
                    if (result.error === "FULL") {
                        alert("Room is full");
                    }
                    $scope.start(result.data, params.length > 2 ? params[2] === 'true' : false);
                }
            });
        };

        $scope.start = function(parameters, online) {
            $scope.online_ = online;
            //$scope.showSlider_ = false;
            $scope.presenter_ = parameters.presenter;
            $scope.peers_ = parameters.peers;
            $scope.roomLink_ = parameters.roomLink;

            $scope.loadingParams_ = parameters;

            trace('Initializing; server= ' + $scope.loadingParams_.roomServer + '.');
            trace('Initializing; room=' + $scope.loadingParams_.roomId + '.');

            $scope.conferenceSvg_ = $(UI_CONSTANTS.conferenceSvg);
            $scope.hangupSvg_ = $(UI_CONSTANTS.hangupSvg);
            $scope.snapshot_ = $(UI_CONSTANTS.snapshot);
            $scope.icons_ = $(UI_CONSTANTS.icons);
            $scope.localVideo_ = $(UI_CONSTANTS.localVideo);
            $scope.sharingDiv_ = $(UI_CONSTANTS.sharingDiv);
            $scope.statusDiv_ = $(UI_CONSTANTS.statusDiv);
            $scope.remoteVideo_ = $(UI_CONSTANTS.remoteVideo);
            $scope.remoteScreen_ = $(UI_CONSTANTS.remoteScreen);
            $scope.miniVideos_ = {};            
            $scope.screenDiv_ = $(UI_CONSTANTS.screenShareDiv);
            //$scope.imageSlider_ = $(UI_CONSTANTS.imageSlider);
            //$scope.videosDiv_ = $(UI_CONSTANTS.videosDiv);
            $scope.roomLinkHref_ = $(UI_CONSTANTS.roomLinkHref);
            $scope.rejoinDiv_ = $(UI_CONSTANTS.rejoinDiv);

            $scope.rejoinButton_ = $(UI_CONSTANTS.rejoinButton);

            $scope.rejoinButton_.addEventListener('click', onRejoinClick_, false);

            $scope.whiteboard_ = $(UI_CONSTANTS.whiteboard);
            $scope.flipCamera_ = $(UI_CONSTANTS.flipCamera);
            $scope.progress_ = $(UI_CONSTANTS.progress);

            //$scope.slider_ = $(UI_CONSTANTS.slider);

            $scope.muteAudioIconSet_ = new IconSet_(UI_CONSTANTS.muteAudioSvg);
            $scope.muteVideoIconSet_ = new IconSet_(UI_CONSTANTS.muteVideoSvg);

            window.addEventListener("pagehide", function(e) {
                // if ($scope.online_) {                
                //     var confirm = confirm("Are you sure you want to leave this room");

                //     if(!confirm){
                //         e.preventDefault();
                //         return;
                //     }
                // }
                hangup_(false);
            });

            createtooltip();

            deactivate_($scope.whiteboard_);

            if ($scope.presenter_ !== $scope.user) {
                //hide_($(UI_CONSTANTS.muteVideoSvg));
                hide_($scope.flipCamera_);
            }

            console.log("start video conference");
            requestMediaAndIceServers_();

            $scope.channel_ = new SignalingChannel(parameters.wssUrl, parameters.wssPostUrl);

            var channelPromise = $scope.channel_.open().catch(function(error) {
                trace(error);
                alert('WebSocket open error: ' + error.message);
                return Promise.reject(error);
            });

            // get list of peer.
            channelPromise.then(function(){
                $scope.channel_.register($scope.loadingParams_.roomId, $scope.loadingParams_.clientId, $scope.presenter_ === $scope.user);
                $scope.channel_.onmessage = onRecvSignalingChannelMessage_.bind(this);
                // We only start signaling after we have registered the signaling channel
                // and have media and TURN. Since we send candidates as soon as the peer
                // connection generates them we need to wait for the signaling channel to be
                // ready.
                // get list of peer.
                
                // ice and media are ready
                Promise.all([$scope.getIceServersPromise_, $scope.getMediaPromise_])
                .then(function() {
                    for (var i = 0; i < $scope.peers_.length; i++) {
                        var peer = $scope.peers_[i];
                        if (peer === $scope.user && $scope.peers_.length > 1)
                             continue;
                        var call = createCall_(peer, $scope.localStream_, $scope.channel_);
                        call.start($scope.room);
                    }
                    finishCallSetup_($scope.room);
                }).catch(function(error) {
                    trace(error);
                    alert('Failed to start signaling: ' + error.message);
                });
                
                if (!online && $scope.presenter_ === $scope.user) {
                    hide_($scope.muteAudioIconSet_.iconElement);
                    hide_($scope.muteVideoIconSet_.iconElement);
                    deactivate_($scope.sharingDiv_);
                    deactivate_($scope.remoteVideo_);
                    deactivate_($scope.remoteScreen_);
                    removeAllMiniVideos();
                    transitionToActive_();
                }

            }).catch(function(error) {
                trace(error);
                alert('WebSocket register error: ' + error.message);
            });

            if ($scope.loadingParams_.maxParty <= 2 || !$scope.auth) {
                hide_($scope.conferenceSvg_);
            }
        };

        function dragStart(e) {
            for (var peer in $scope.miniVideos_) {
                if ($scope.miniVideos_[peer] == e.target) {
                    dragItem = e.target;
                    break;
                }
            }

            if (!dragItem) 
                return;

            if (e.type === "touchstart") {
                initialX = e.touches[0].clientX - xOffset;
                initialY = e.touches[0].clientY - yOffset;
            } else {
                initialX = e.clientX - xOffset;
                initialY = e.clientY - yOffset;
            }
        };

        function dragEnd(e) {
            initialX = currentX;
            initialY = currentY;

            dragItem = null;
        };

        function drag(e) {
            if (dragItem) {
                e.preventDefault();
                if (e.type === "touchmove") {
                  currentX = e.touches[0].clientX - initialX;
                  currentY = e.touches[0].clientY - initialY;
                } else {
                  currentX = e.clientX - initialX;
                  currentY = e.clientY - initialY;
                }
                xOffset = currentX;
                yOffset = currentY;
                setTranslate(currentX, currentY, dragItem);
            }
        };

        function setTranslate(xPos, yPos, el) {
              el.style.transform = "translate3d(" + xPos + "px, " + yPos + "px, 0)";
        };

        function onRecvSignalingChannelMessage_(msg) {
            var messageObj = parseJSON(msg);
            // check if the message is for the user
            if (!messageObj || (messageObj.peer != null && !messageObj.peer.startsWith($scope.user))) {
                return;
            }
            if (messageObj.type === "new" && messageObj.participant !== $scope.user) {
                onNewParticipant(messageObj.participant, messageObj.ispresenter);
                return;
            }
            var call = findCall(messageObj.user);
            if (call != null) {
                call.onRecvSignalingChannelMessage(messageObj);
            }
        };

        //flip camera
        function changeDevice() {
            // remove existing local stream using camera
            for (var call of $scope.calls_) {
                call.removeStream();
            }

            var mediaConstraints = $scope.loadingParams_.mediaConstraints;
        
            if (typeof mediaConstraints.video === "object") {
                // set the default value
                mediaConstraints.video.deviceId = {exact: $scope.selectedVideoDeviceId_};
            }               
                
            if (typeof mediaConstraints.audio === "object") {
                mediaConstraints.audio.deviceId = {exact: $scope.selectedPlaybackDeviceId_};
            }

            $scope.getMediaPromise_ = navigator.mediaDevices.getUserMedia(mediaConstraints)
            .then(function(stream) {
                trace('Got access to local media with mediaConstraints:\n' +
                '  \'' + JSON.stringify(mediaConstraints) + '\'');
                $scope.localStream_ = stream;
                attachLocalStream_(stream);
                for (var call of $scope.calls_) {
                    call.addStream(stream);
                }
            }).catch(function(error) {
                trace(error);
                alert('Error getting user media: ' + error.message);
            });
        };

        function findCall(peer) {
            for (let call of $scope.calls_) {
                if (call.getPeer() === peer) {
                    return call;
                }
            }
            for (let call of $scope.screenCalls_) {
                if (call.getPeer() === peer) {
                    return call;
                }
            }
            return null;
        }

        //$scope.init();
        //here peer is remote peer 
        function createCall_(peer, localstream, signalchannel, sharescreen = false) {
            var call = findCall(peer + (sharescreen ? "_screen" : ""));
            if (!call) {
                call  = new Call(peer, $scope.loadingParams_, localstream, signalchannel, sharescreen);
            } else if (!sharescreen) {
                call.addStream(localstream);
            }
            var roomErrors = $scope.loadingParams_.errorMessages;
            var roomWarnings = $scope.loadingParams_.warningMessages;
            if (roomErrors && roomErrors.length > 0) {
                //popup error messages here
                console.error(roomErrors);
                return;
            } else if (roomWarnings && roomWarnings.length > 0) {
                console.log(roomWarnings);
            }
            // TODO(jiayl): replace callbacks with events.
            call.onremotehangup = onRemoteHangup_.bind(this);
            call.onremotesdpset = onRemoteSdpSet_.bind(this);
            call.onscreen = onScreenShared_.bind(this);
            call.onremotestreamadded = onRemoteStreamAdded_.bind(this);
            //$scope.calls_[peer].onlocalstreamadded = onLocalStreamAdded_.bind(this, peer);

            call.onerror = displayError_.bind(this);
            call.onstatusmessage = displayError_.bind(this);
            call.ondatasend = onDataSend_.bind(this);
                   
            call.oncallerstarted = displaySharingInfo_.bind(this);
            call.oncamera = displayCamera_.bind(this);
            //whiteboard is broadcast session
            call.onwhiteboard = startWhiteboard_.bind(this);
            call.onimage = displayImage_.bind(this);
            call.onimagestart = onImageStart_.bind(this);
            call.onimageprogress = onImageProgress_.bind(this);

            //call.onnewparticipant = onNewParticipant.bind(this);

            call.oniceconnectionstatechange = onIceConnectionStateChange_.bind(this, peer);
            call.onsignalingstatechange = onSignalingStateChange_.bind(this, peer);

            if (!sharescreen) {
                $scope.calls_.push(call);
            } else {
                $scope.screenCalls_.push(call);
            }

            return call;
        };

        function IconSet_(iconSelector) {
            this.iconElement = document.querySelector(iconSelector);
        };

        IconSet_.prototype.toggle = function () {
            if (this.iconElement.classList.contains('on')) {
                this.iconElement.classList.remove('on');
                // turn it off: CSS hides `svg path.on` and displays `svg path.off`
            } else {
                // turn it on: CSS displays `svg.on path.on` and hides `svg.on path.off`
                this.iconElement.classList.add('on');
            }
        };

        function displayStatus_(status) {
            if (status === '') {
                deactivate_($scope.statusDiv_);
            } else {
                activate_($scope.statusDiv_);
            }
            $scope.statusDiv_.innerHTML = status;
        };

        function displayError_(peer, error) {
            trace(error);
            console.log(error);
        };

        function openScreenWindow() {
            trace("open screen");
            window.open("screen.html", "ShareScreen", "scrollbars=no,status=yes");
        };

        var tooltip, hidetooltiptimer;

        function createtooltip() { // call this function ONCE at the end of page to create tool tip object
            tooltip = document.createElement('div');
            tooltip.style.cssText = 
                'position:absolute; background:black; color:white; padding:4px;z-index:1;'
                + 'border-radius:2px; font-size:12px;box-shadow:3px 3px 3px rgba(0,0,0,.4);'
                + 'opacity:0;transition:opacity 0.3s';
            tooltip.innerHTML = 'The link was copied to clipboard!';
            document.body.appendChild(tooltip);
        };

        function showtooltip(e) {
            var evt = e || event;
            clearTimeout(hidetooltiptimer);
            var rect = evt.getBoundingClientRect();
            tooltip.style.left = rect.left - 10 + 'px';
            tooltip.style.top = rect.top + 15 + 'px';
            tooltip.style.opacity = 1;
            hidetooltiptimer = setTimeout(function(){
                tooltip.style.opacity = 0;
            }, 500);
        };

        function selectElementText(el) {
            var range = document.createRange(); // create new range object
            range.selectNodeContents(el); // set range to encompass desired element text
            var selection = $window.getSelection(); // get Selection object from currently user selected text
            selection.removeAllRanges(); // unselect any user selected text (if any)
            selection.addRange(range); // add range to Selection object to select it
        };

        function copySelectionText() {
            var copysuccess // var to check whether execCommand successfully executed
            try{
                copysuccess = $window.document.execCommand("copy"); // run command to copy selected text to clipboard
            } catch(e){
                copysuccess = false;
            }
            return copysuccess;
        };

        function displaySharingInfo_(roomId, roomLink) {
            if (!$scope.auth)
                return;
            $scope.roomLinkHref_.href = roomLink;
            $scope.roomLinkHref_.text = roomLink;
            // pushCallNavigation_(roomId, roomLink);
            activate_($scope.sharingDiv_);
        };

        $scope.copyLink = function() {
            var link = $(UI_CONSTANTS.roomLinkHref);
            selectElementText(link); // select the element's text we wish to read
            var copysuccess = copySelectionText();
            if (copysuccess){
                showtooltip(link);
            }
        };

        function loadTeam_() {
            let params = `resizable=yes,location=no,toolbar=no,menubar=no, width=600,height=600,left=100,top=100`;
            // open team member
            let link = encodeURIComponent('Conference@invite.html#'  + $scope.room);
            window.open("../../index.html#!/login/" + link, 'conference', params);
        };

        function setupUi_() {
            iconEventSetup_();
            document.onkeypress = onKeyPress_.bind(this);
            //window.onmousemove = showIcons_.bind(this);
            window.ontouchstart = showIcons_.bind(this);

            $(UI_CONSTANTS.muteAudioSvg).onclick = toggleAudioMute_.bind(this);
            $(UI_CONSTANTS.muteVideoSvg).onclick = toggleVideoMute_.bind(this);
            //$(UI_CONSTANTS.fullscreenSvg).onclick = toggleFullScreen_.bind(this);
            $(UI_CONSTANTS.hangupSvg).onclick = hangup_.bind(this);
            $(UI_CONSTANTS.flipCamera).onclick = flipCamera_.bind(this);
            $(UI_CONSTANTS.snapshot).onclick = gotoWhiteboard_.bind(this);
            $(UI_CONSTANTS.conferenceSvg).onclick = loadTeam_.bind(this);
            // $(UI_CONSTANTS.roomLinkHref).onclick = copyLink_.bind(this);

            // $(UI_CONSTANTS.slider).onclick = toggleSlider_.bind(this);
            
            setUpFullScreen();
        };

        function finishCallSetup_(room) {
            setupUi_();
            window.onbeforeunload = function() {
                for (var peer in $scope.calls_) {
                    $scope.calls_[peer].hangup(false);
                }
            }.bind(this);
            window.onpopstate = function(event) {
                if (!event.state) {
                    // TODO (chuckhays) : Resetting back to room selection page not
                    // yet supported, reload the initial page instead.
                    trace('Reloading main page.');
                    location.href = location.origin;
                } else {
                    // This could be a forward request to open a room again.
                    if (event.state.roomLink) {
                        location.href = event.state.roomLink;
                    } 
                }
            };
        };

        // function onRemoteHangup_(peer) {
        //     if (peer.lastIndexOf(":") >= 0) {
        //         $scope.calls_.splice($scope.calls_.indexOf(peer), 1);
        //         return;
        //     }
        //     if ($scope.miniVideos_[peer]) {
        //         removeMiniVideo(peer);
        //     }
        //     // if ($scope.isPresenter_ !== 'true' && $scope.isMaster_ !== 'true') {
        //     //     hangup_();
        //     //     return;
        //     // }

        //     if (Object.keys($scope.calls_).length == 1 && $scope.calls_[peer]) {
        //         displayStatus_('The remote side hung up.');
        //         // turn off 
        //         $scope.online_ = false;
        //         hide_($scope.shareScreenIconSet_.iconElement);

        //         if ($scope.roomLink_) {
        //             displaySharingInfo_($scope.loadingParams_.roomId, $scope.roomLink_);
        //         }

        //         if (inWhiteboard_) {
        //             deactivate_($scope.whiteboard_);
        //         }
        //         transitionToWaiting_();
        //     }

        //     $scope.calls_[peer].onRemoteHangup();
        //     delete $scope.calls_[peer];
        //     // if (!$scope.auth) {
        //     //     hangup_();
        //     // }
        // };

        function removeCall(call) {
            for (var i = $scope.calls_.length - 1; i >= 0; i--) {
                 if (call === $scope.calls_[i]) {
                     $scope.calls_.splice(i, 1);
                     return;
                 }
             } 
            for (var i = $scope.screenCalls_.length - 1; i >= 0; i--) {
                if (call === $scope.screenCalls_[i]) {
                     $scope.screenCalls_.splice(i, 1);
                     return;
                }
            }
        };

        function onRemoteHangup_(peer) {
            if ($scope.isScreenSharing_){
                if (peer.endsWith("_screen")) {
                    let call = findCall(peer);
                    if (call) {
                        call.onRemoteHangup();
                        removeCall(call);
                    }
                    if (peer.startsWith($scope.presenter_)) {
                        $scope.isScreenSharing_ = false;
                        //$scope.remoteVideo_.srcObject = $scope.presenterStream;
                        //toggle remote screen to video
                        deactivate_($scope.remoteScreen_);
                        hide_($scope.remoteScreen_);
                        if (!inWhiteboard_) {                    
                            displayCamera_();
                        }
                    }
                    return;                         
                }
            }  

            for (var i = 0; i < $scope.calls_.length; i ++) {
                if ($scope.calls_[i].getPeer() === peer) {
                    EventCall.setupCall($scope.calls_[i], false);                    
                    $scope.calls_[i].onRemoteHangup();
                    $scope.calls_.splice(i, 1);
                    let findIndex = $scope.peers_.findIndex(p => p === peer);
                    $scope.peers_.splice(findIndex, 1);
                    if ($scope.calls_.length === 0) {
                        displayStatus_('The remote side hung up.');
                        // turn off
                        $scope.online_ = false;
                        if ($scope.roomLink_) {
                            displaySharingInfo_($scope.loadingParams_.roomId, $scope.roomLink_);
                        }
                        if (inWhiteboard_) {
                            deactivate_($scope.whiteboard_);
                            document.onkeypress = onKeyPress_.bind(this);
                            inWhiteboard_ = false;
                        }
                        transitionToWaiting_();
                        $scope.loadingParams_.isInitiator = "false";
                        var call = createCall_($scope.user, $scope.localStream_, $scope.channel_);
                        call.start($scope.room);
                        //$scope.calls_[0].start($scope.room);
                    } 
                    break;
                }
            }

            if ($scope.miniVideos_[peer]) {
                removeMiniVideo(peer);
            }
            if ($scope.calls_.length < $scope.loadingParams_.maxParty && $scope.auth) {
                show_($scope.conferenceSvg_);
            }
        };

        function hangup_(rejoin = true) {
            trace('Hanging up.');
            hide_($scope.icons_);
            displayStatus_('Hanging up');
            transitionToDone_();
            if (rejoin) {
                show_($scope.rejoinDiv_);
                activate_($scope.rejoinDiv_);
            }
            $scope.localStream_ = null;
            // Call hangup with async = true.
            if ($scope.online_) {
                for (let call of $scope.screenCalls_) {
                    EventCall.setupCall(call, false);
                    call.hangup(false);
                }
                for (let call of $scope.calls_) {
                    EventCall.setupCall(call, false);
                    call.hangup(false);
                }
            }
            $scope.channel_.close(false);
            // Reset key and mouse event handlers.
            document.onkeypress = null;
            window.onmousemove = null;
            inWhiteboard_ = false;
            $scope.isScreenSharing_ = false;
            $scope.calls_ = [];
            $scope.screenCalls_ = [];
            if (!$scope.online_ && !$scope.auth) {
                 $window.location.href = '../Subscribe/subscribe.html#' + $scope.room + '&' + $scope.user + '&' + $scope.loadingParams_.room_type;
            }
        };

        // function hangup_() {
        //     trace('Hanging up.');
        //     hide_($scope.icons_);

        //     if ($scope.isScreenSharing_ !== 'true')
        //         displayStatus_('Hanging up');
        //     else
        //         displayStatus_('Closed');

        //     transitionToDone_();
        //     // Call hangup with async = true.
        //     for (var peer in $scope.calls_) {
        //         $scope.calls_[peer].hangup(false);
        //     }
        //     // Reset key and mouse event handlers.
        //     document.onkeypress = null;
        //     window.onmousemove = null;

        //     if (!$scope.online_ && !$scope.auth) {
        //         $window.location.href = '../Subscribe/subscribe.html#' + $scope.room + '&' + $scope.user + '&' + ($scope.isPresenter_ ? 'Support' : 'Sales');
        //     }
        // };

        function onRemoteSdpSet_(peer, hasRemoteVideo) {
            if (inWhiteboard_) {
                return;
            }
            if (hasRemoteVideo) {
                trace('Waiting for remote video.');
                waitForRemoteVideo_(peer);
            } else {
                trace('No remote video stream; not waiting for media to arrive.');
                $scope.hasRemoteStream_ = false;
                //show_($scope.noVideo_);
                // TODO(juberti): Make this wait for ICE connection before transitioning.
            }
            transitionToActive_();

            if ($scope.calls_.length >= $scope.loadingParams_.maxParty) {
                hide_($scope.conferenceSvg_);
            }
        };

        // function waitForRemoteVideo_() {
        //     // Wait for the actual video to start arriving before moving to the active
        //     // call state.
        //     var video = $scope.remoteVideo_;
        //     if ($scope.isPresenter_ === 'true' && $scope.miniVideos_.size > 0) {
        //         key = Object.keys($scope.miniVideos_)[0];
        //         video = $scope.miniVideos_[key];
        //     } 

        //     if (video.readyState >= 2) { // i.e. can play
        //         trace('Remote video started; currentTime: ' + video.currentTime);
        //         transitionToActive_();
        //     } else {
        //         video.oncanplay = waitForRemoteVideo_.bind(this);
        //     }
        // };
        function waitForRemoteVideo_(peer) {
            // Wait for the actual video to start arriving before moving to the active
            // call state.
            var video = $scope.remoteVideo_;
            if ($scope.presenter_ === $scope.user && $scope.miniVideos_[peer]) {
                video = $scope.miniVideos_[peer];
            }

            if (video.readyState >= 2) { // i.e. can play
                trace('Remote video started; currentTime: ' + $scope.remoteVideos_.currentTime);
                transitionToActive_();
            } else {
                video.oncanplay = waitForRemoteVideo_.bind(this, peer);
            }
        };

        function flipCamera_() {
            if ($scope.calls_.length == 0 || $scope.presenter_ !== $scope.user) {
                return;
            }
            if ($scope.videoInputs_.length == 1) {
                return;
            }

            for (var i = 0; i < $scope.videoInputs_.length; i++) {
                var deviceId = $scope.videoInputs_[i];
                if (deviceId.id === $scope.selectedVideoDeviceId_) {
                    i = i + 1;
                    if ($scope.videoInputs_.length == i)
                        i = 0;
                    $scope.selectedVideoDeviceId_ = $scope.videoInputs_[i].id;
                    changeDevice();
                    break;
                }
            }         
        };

        function displayCamera_() {
            inWhiteboard_ = false;
            deactivate_($scope.whiteboard_);
            document.onkeypress = onKeyPress_.bind(this);
            //var video = document.getElementById('video');
            for (var call of $scope.calls_) {
                call.startVideoStream();
            }
            if ($scope.presenter_ === $scope.user) {
                show_($scope.localVideo_);
                activate_($scope.localVideo_);
            } else {
                show_($scope.remoteVideo_);
                activate_($scope.remoteVideo_);
            }
            // tell all peers to exit
            for (var call of $scope.calls_) {
                call.exitWhiteboard();
            }
            // turn on back some buttons
            if ($scope.presenter_ === $scope.user) {                
                show_($scope.flipCamera_);         
            }            
            show_($scope.hangupSvg_);
            show_($scope.snapshot_);
        };

        // trigger by far end side
        function startWhiteboard_() {
            inWhiteboard_ = true;
            EventWhiteboard.start();
            if ($scope.presenter_ === $scope.user) {
                onWhiteboard_();
            } else {
                displayWhiteboard_();
            }
        };

        // trigger by near end side
        function gotoWhiteboard_() {
            inWhiteboard_ = true;
            for (var call of $scope.calls_) {
                //call.startDataChannel();
                call.sendSignalingMessage({
                    user: $scope.user,
                    peer: call.getPeer(),
                    type: "whiteboard"
                });
            }
            if ($scope.presenter_ === $scope.user) {
                onWhiteboard_();
            } else {
                displayWhiteboard_();
            }
        };

        function onWhiteboard_() {
            let canvas = document.getElementById('snapshot');
            let context = canvas.getContext('2d');
            context.canvas.width = $scope.localVideo_.videoWidth;
            context.canvas.height = $scope.localVideo_.videoHeight;
            context.drawImage($scope.localVideo_, 0, 0, canvas.width, canvas.height);
            // create a new data and send to other side.
            $scope.image = canvas.toDataURL("image/png");
            let dataSize = $scope.image.length;
            for (let call of $scope.calls_) {
                call.sendSignalingMessage({
                    user: $scope.user,
                    peer: call.getPeer(),
                    type: "data",
                    size: dataSize
                });
            }
            EventSnap.setupImage($scope.image, canvas.width, canvas.height);

            //if (!$scope.online_)
            // goto whiteboard
            displayWhiteboard_();
        };

        /// whenever it is ready, start sending data
        function onDataSend_(peer) {
            if ($scope.presenter_ === $scope.user) {
                for (var call of $scope.calls_) {
                    if (call.getPeer() === peer) {
                        call.sendBlobData($scope.image);
                    }
                }
            }
            if (!inWhiteboard_) {
                displayWhiteboard_();
            } else {
                let call = findCall(peer); 
                if (call) {               
                    EventCall.setupCall(call, true);
                }
            }
        };

        // go to display UI for whiteboard
        function displayWhiteboard_() {
            // snapshot the video if he is repsenter
            for (let call of $scope.calls_) {
                call.stopVideoStream();
            }
            if ($scope.presenter_ === $scope.user) {
                deactivate_($scope.localVideo_);
                hide_($scope.localVideo_);
            } else {
                if (!$scope.isScreenSharing_) {
                    deactivate_($scope.remoteVideo_);
                    hide_($scope.remoteVideo_);
                } else {
                    deactivate_($scope.remoteScreen_);
                    hide_($scope.remoteScreen_); 
                }
            }
            hideIcons_();
            activate_($scope.whiteboard_);
            document.onkeypress = null;
            for (let call of $scope.calls_) {
                call.resetData();
                EventCall.setupCall(call, true);
            }
        };

        function displayImage_(peer, imageData) {
            hide_($scope.progress_);
            var img = new Image();
            img.onload = function() {
                EventSnap.setupImage(this, this.width, this.height);
            };
            img.src = imageData;

            for (let call of $scope.calls_) {
                if (call.getPeer() !== peer) {
                    call.enterWhiteboard();
                }
            }
        };

        function onRemoteStreamAdded_(peer, stream) {
            trace('Remote stream added.');
            deactivate_($scope.sharingDiv_);

            show_($scope.muteAudioIconSet_.iconElement);
            show_($scope.muteVideoIconSet_.iconElement);


            // if (!$scope.hasRemoteStream_) {
            //     hide_($scope.noVideo_);
            // }

            $scope.online_ = true;

            // if (peer === $scope.presenter_) {
            //     $scope.presenterStream = stream;
            // }

            // if (EventScreen.isSharing) {
            //     EventScreen.setStream(stream);
            //     return;
            // }

            if (peer.startsWith($scope.presenter_)) {
                if ($scope.isScreenSharing_) {
                    hide_($scope.remoteVideo_);
                    show_($scope.remoteScreen_);
                } else {
                    show_($scope.remoteVideo_);
                    hide_($scope.remoteScreen_);                
                }
                if (peer.endsWith('_screen')) {
                    if (!$scope.remoteScreen_.srcObject) {
                        $scope.remoteScreen_.srcObject = stream
                    }
                    $scope.remoteScreen_.play();
                } else {
                    if (!$scope.remoteVideo_.srcObject) {
                        $scope.remoteVideo_.srcObject = stream;
                    }
                    $scope.remoteVideo_.play();
                }

            } else if (!$scope.miniVideos_[peer]) {
                addMiniVideo(peer, stream);
            } 

            // if ($scope.presenter_ === peer) {
            //     $scope.remoteVideo_.srcObject = stream;
            // } else if (!$scope.miniVideos_[peer]) {
            //     addMiniVideo(peer, stream);
            // }

            if ($scope.remoteVideoResetTimer_) {
                clearTimeout($scope.remoteVideoResetTimer_);
                $scope.remoteVideoResetTimer_ = null;
            }

            if (inWhiteboard_) {     
                let call = findCall(peer);      
                if ($scope.presenter_ === $scope.user) {
                    if (!call || call.needResendData()) {
                        return;
                    }
                    //call.startDataChannel();
                    call.setToResendData(true);
                    call.sendSignalingMessage({
                        user: $scope.user,
                        peer: peer,
                        type: "whiteboard"
                    });
                    var dataSize = $scope.image.length;
                    call.sendSignalingMessage({
                        user: $scope.user,
                        peer: call.getPeer(),
                        type: "data",
                        size: dataSize
                    });
                } else {
                    EventCall.setupCall(call, true);
                }
            }
        };
		
		var getSelectedDevices_ = function() {
			return navigator.mediaDevices.enumerateDevices().then(function(devices) {
				var cam = 0, cam_found = false;

				var mic = 0, mic_found = false;
				var spk = 0, spk_found = false;

				// add all options here including video and audio devices
				for (var i = 0; i !== devices.length; ++i) {
					var device = devices[i];
					if (device.kind === "videoinput") {
						$scope.videoInputs_.push({id: device.deviceId, label: device.label || 'camera ' + ($scope.videoInputs_.length + 1)});
						cam += 1;
						if (device.deviceId === $scope.selectedVideoDeviceId_)
							cam_found = true;
					}
					if (device.kind === "audioinput") {
						$scope.audioInputs_.push({id: device.deviceId, label: device.label || 'microphone ' + ($scope.audioInputs_.length + 1)});
						mic += 1;
						if (device.deviceId === $scope.selectedRecordDeviceId_)
							mic_found = true;
					}
					if (device.kind === "audiooutput") {
						$scope.audioOutputs_.push({id: device.deviceId, label: device.label || 'speaker ' + ($scope.audioOutputs_.length + 1)});
						spk += 1;
						if (device.deviceId === $scope.selectedPlaybackDeviceId_)
							spk_found = true;
					}
				}

				if (cam > 0 && !cam_found) {
					if ($scope.presenter_ === $scope.user)
						$scope.selectedVideoDeviceId_ = $scope.videoInputs_[0].id;
					else
						$scope.selectedVideoDeviceId_ = $scope.videoInputs_[cam - 1].id;

				}

				if (mic > 0 && !mic_found)
					$scope.selectedRecordDeviceId_ = $scope.audioInputs_[0].id;

				if (spk > 0 && !spk_found)
					$scope.selectedPlaybackDeviceId_ = $scope.audioOutputs_[0].id;

			});

		};
		
		// Asynchronously request user media if needed.
		var maybeGetUserMedia_ = function() {
			// mediaConstraints.audio and mediaConstraints.video could be objects, so
			// check '!=== false' instead of '=== true'.
			var needStream = ($scope.loadingParams_.mediaConstraints.audio !== false ||
								$scope.loadingParams_.mediaConstraints.video !== false)

            navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia; 

			if (needStream || navigator.getUserMedia) {
                return navigator.mediaDevices.getUserMedia({ video: true, audio: true}).then(function(stream) {
                    return getSelectedDevices_().then(function(devices) {
                        var mediaConstraints = $scope.loadingParams_.mediaConstraints;
                        if (typeof mediaConstraints.video === "object")
                            mediaConstraints.video.deviceId = {exact:$scope.selectedVideoDeviceId_};
                        if (typeof mediaConstraints.audio === "object")
                            mediaConstraints.audio.deviceId = {exact:$scope.selectedPlaybackDeviceId_};                    
                        return navigator.mediaDevices.getUserMedia(mediaConstraints)
                        .then(function(stream) {
                            trace('Got access to local media with mediaConstraints:\n' +
                            '  \'' + JSON.stringify(mediaConstraints) + '\'');
                            onLocalStreamAdded_(stream);
                        }).catch(function(error) {
                            onUserMediaError_(error);
                        });
                    });
                }).catch(function(err) {
                    console.log(err);
                });
			} 
			return null;
		};

        // Asynchronously request an ICE server if needed.
        var maybeGetIceServers_ = function() {
            var shouldRequestIceServers =
                  ($scope.loadingParams_.iceServerRequestUrl &&
                  $scope.loadingParams_.iceServerRequestUrl.length > 0 &&
                  $scope.loadingParams_.turnServerOverride &&
                  $scope.loadingParams_.turnServerOverride.length === 0);

            var iceServerPromise = null;
            if (shouldRequestIceServers) {
                var requestUrl = $scope.loadingParams_.iceServerRequestUrl;
                iceServerPromise =
                requestIceServers(requestUrl, this.params_.iceServerTransports).then(
                function(iceServers) {
                  var servers = $scope.loadingParams_.peerConnectionConfig.iceServers;
                  $scope.loadingParams_.peerConnectionConfig.iceServers =
                      servers.concat(iceServers);
                }).catch(function(error) {
                  if (this.onstatusmessage) {
                    // Error retrieving ICE servers.
                    var subject =
                        encodeURIComponent('Youcast ICE servers not working');
                    this.onstatusmessage(
                        'No TURN server; unlikely that media will traverse networks. ' +
                        'If this persists please ' +
                        '<a href="mailto:discuss-webrtc@googlegroups.com?' +
                        'subject=' + subject + '">' +
                        'report it to discuss-webrtc@googlegroups.com</a>.');
                    }
                    trace(error.message);
                });
            } else {
                if ($scope.loadingParams_.turnServerOverride &&
                    $scope.loadingParams_.turnServerOverride.length === 0) {
                    iceServerPromise = Promise.resolve();
                } else {
                // if turnServerOverride is not empty it will be used for
                // turn/stun servers.
                    iceServerPromise = new Promise(function(resolve) {
                        $scope.loadingParams_.peerConnectionConfig.iceServers =
                        $scope.loadingParams_.turnServerOverride;
                        resolve();
                    });
                }
            }
            return iceServerPromise;
        };

        var requestMediaAndIceServers_ = function() {
            if (!$scope.localStream_) {
                $scope.getMediaPromise_ = maybeGetUserMedia_();                
            }
            $scope.getIceServersPromise_ = maybeGetIceServers_();
        };

        // local stream added
        function onLocalStreamAdded_(stream) {
            trace('User has granted access to local media.');
/*             if (!$scope.localStream_ && $scope.online_) {
                for (var i = 0; i < $scope.peers_.length; i++){
                    var peer = $scope.peers_[i];
                    if (peer === $scope.user)
                        continue;
                    var call = createCall_(peer, stream, $scope.channel_);
                    call.start($scope.room);
                };
                $scope.peers_ = [];
            } */
            $scope.localStream_ = stream;
            attachLocalStream_(stream);
        };

        function onScreenShared_(peer) {
            if ($scope.isScreenSharing_) {
				if (inWhiteboard_) {
					inWhiteboard_ = false;
					deactivate_($scope.whiteboard_);
                    document.onkeypress = onKeyPress_.bind(this);
					//var video = document.getElementById('video');
					for (let call of $scope.screenCalls_) {
						call.startVideoStream();
					}
                    for (let call of $scope.calls_) {
                        call.exitWhiteboard();
                    }
                    show_($scope.remoteScreen_);
                    activate_($scope.remoteScreen_);
				}
                return;
            }
            // only possible for remote
            deactivate_($scope.remoteVideo_);
            activate_($scope.remoteScreen_);
            $scope.loadingParams_.isInitiator = "false";
            var call = createCall_(peer, null, $scope.channel_, true);
            call.start($scope.room);
            $scope.isScreenSharing_ = true;
            // hide_($scope.noVideo_);
        };

        function attachLocalStream_(stream) {
            trace('Attaching local stream.');
            displayStatus_('');
            if ($scope.presenter_ === $scope.user) {
                // only presenter share local video stream
                $scope.localVideo_.srcObject = stream;
                $scope.localVideo_.play();
                activate_($scope.localVideo_);
            }

            show_($scope.icons_);
            if ($scope.localStream_ && $scope.localStream_.getVideoTracks().length === 0) {
                hide_($(UI_CONSTANTS.muteVideoSvg));
            }

            if ($scope.localStream_ && $scope.localStream_.getAudioTracks().length === 0) {
                hide_($(UI_CONSTANTS.muteAudioSvg));
            }
        };


        function transitionToActive_() {
            // Stop waiting for remote video.
            if ($scope.presenter_ !== $scope.user) {
                $scope.remoteVideo_.oncanplay = undefined;

                // Prepare the remote video and PIP elements.
                trace('reattachMediaStream: ' + $scope.localVideo_.srcObject);

                if (!$scope.isScreenSharing_) {
                    activate_($scope.remoteVideo_);
                } else {
                    activate_($scope.remoteScreen_);
                }

                // Transition opacity from 0 to 1 for the remote and mini videos.
                // if ($scope.hasRemoteVideo) {
                //     activate_($scope.remoteVideo_);
                // }
                // Transition opacity from 1 to 0 for the local video.
                //this.deactivate_(this.localVideo_);
                //this.localVideo_.srcObject = null;
                // Rotate the div containing the videos 180 deg with a CSS transform.
                //activate_($scope.videosDiv_);
            }

            // else {
            //     activate_($scope.miniVideo_);
            // }
            show_($scope.hangupSvg_);
            show_($scope.snapshot_);

            displayStatus_('');
        };

        function transitionToWaiting_() {
            // Stop waiting for remote video.
            $scope.remoteVideo_.oncanplay = undefined;
            hide_($scope.hangupSvg_);
            if ($scope.presenter_ !== $scope.user) {
                hide_($scope.snapshot_);
            }
            hide_($scope.progress_);
            // Rotate the div containing the videos -180 deg with a CSS transform.
            //deactivate_($scope.videosDiv_);
            if (!$scope.remoteVideoResetTimer_) {
                $scope.remoteVideoResetTimer_ = setTimeout(function() {
                    $scope.remoteVideoResetTimer_ = null;
                    trace('Resetting remoteVideo src after transitioning to waiting.');

                    if ($scope.isPresenter_ !== 'true') {
                        $scope.remoteVideo_.srcObject = null;
                    }

                }.bind(this), 800);
            }
            // Transition opacity from 0 to 1 for the local video.
            // this.activate_(this.localVideo_);
            // Transition opacity from 1 to 0 for the remote and mini videos.
            deactivate_($scope.remoteVideo_);
            deactivate_($scope.remoteScreen_);
        };

        function transitionToDone_() {
            // Stop waiting for remote video.
            if ($scope.presenter_ === $scope.user) {
                deactivate_($scope.localVideo_);
                hide_($scope.localVideo_);
            } else {
                $scope.remoteVideo_.oncanplay = undefined;
                deactivate_($scope.remoteVideo_);
                hide_($scope.remoteVideo_);
                deactivate_($scope.remoteScreen_);
                hide_($scope.remoteScreen_);
            }
            removeAllMiniVideos();
            hide_($scope.hangupSvg_);
            hide_($scope.snapshot_);
            hide_($scope.progress_);
            // show_($scope.rejoinDiv_);
            // activate_($scope.rejoinDiv_);
            displayStatus_('');
        };

        function onImageStart_(size) {
            show_($scope.progress_);
            $scope.size = size;
            $scope.imageProgress = 0;
        };

        function onNewParticipant(peer, ispresenter) {
            // replace the first call
              //do stuff
            const found = $scope.peers_.find(p => p === peer);
            if (found) {
                return;
            }

            $scope.peers_.push(peer);
            if (ispresenter) {
                $scope.presenter_ = peer;
            }
            if ($scope.peers_.length === 2) {
                call = $scope.calls_[0];
                call.resetPeer(peer);
            } else if (peer !== $scope.user && !findCall(peer)) {
                $scope.loadingParams_.isInitiator = "false";
                var call = createCall_(peer, $scope.localStream_, $scope.channel_);
                call.start($scope.room);
                if (inWhiteboard_) {
                    call.enterWhiteboard();    
                }
            }            
        };

        function onImageProgress_(progress) {
            $scope.imageProgress = Math.round(progress * 100 / $scope.size);
        };

        function onRejoinClick_() {
            deactivate_($scope.rejoinDiv_);
            hide_($scope.rejoinDiv_);
            if ($scope.presenter_ === $scope.user) {
                activate_($scope.localVideo_);
                show_($scope.localVideo_);
            } else {
                activate_($scope.remoteVideo_);
                show_($scope.remoteVideo_);
                activate_($scope.remoteScreen_);
                show_($scope.remoteScreen_);
            }
            $scope.init();
        };

        function addMiniVideo(peer, stream) {
            var video = document.createElement("video");
            video.style.left = Object.keys($scope.miniVideos_).length * 17 + '%';
            video.id = 'mini-video';
            //video.muted = true;
            video.setAttribute('playsinline', 'playsinline');
            video.setAttribute('autoplay', 'autoplay');
            video.srcObject = stream;  
            $scope.miniVideos_[peer] = video;
            document.body.appendChild(video);          
            activate_(video);
            video.play(); 
        };

        function removeMiniVideo(peer) {
            var video = $scope.miniVideos_[peer];
            video.srcObject = null;
            document.body.removeChild(video);
            delete $scope.miniVideos_[peer];
        };

        function removeAllMiniVideos() {
            for (var peer in $scope.miniVideos_) {
                removeMiniVideo(peer);
            }
        };

        // Spacebar, or m: toggle audio mute.
        // c: toggle camera(video) mute.
        // f: toggle fullscreen.
        // i: toggle info panel.
        // q: quit (hangup)
        // Return false to screen out original Chrome shortcuts.
        function onKeyPress_(event) {
            switch (String.fromCharCode(event.charCode)) {
                case ' ':
                case 'm':
                    for (var peer in $scope.calls_) {
                        $scope.calls_[peer].toggleAudioMute();
                    }
                    $scope.muteAudioIconSet_.toggle();
                    return false;
                case 'c':
                    for (var peer in $scope.calls_) {
                        $scope.calls_[peer].toggleVideoMute();
                    }
                    $scope.muteVideoIconSet_.toggle();
                    return false;
                case 'f':
                    //toggleFullScreen_();
                    return false;
                case 'q':
                    hangup_();
                    return false;
                default:
                    return;
            }
        };

        $scope.onWhiteboardExit = function () {
            inWhiteboard_ = false;
            deactivate_($scope.whiteboard_);
            document.onkeypress = onKeyPress_.bind(this);
            if ($scope.presenter_ === $scope.user) {
                show_($scope.localVideo_);
                activate_($scope.localVideo_);
            } 
            // else {
            //     show_($scope.remoteVideo_);
            //     activate_($scope.remoteVideo_);
            // }

            if (!$scope.isScreenSharing_) {
                show_($scope.remoteVideo_);
                activate_($scope.remoteVideo_);
                for (var call of $scope.calls_) {
                    call.startVideoStream();
                    call.sendSignalingMessage({
                        user: $scope.user,
                        peer: call.getPeer(),
                        type: "camera"
                    });
                    call.exitWhiteboard();
                }
                //show_($scope.flipCamera_);
            } else {
                show_($scope.remoteScreen_);
                activate_($scope.remoteScreen_);
                for (let call of $scope.screenCalls_) {
                    call.startVideoStream();
                }
                for (let call of $scope.calls_) {
                    call.sendSignalingMessage({
                        user: $scope.user,
                        peer: call.getPeer(),
                        type: "screen"
                    });
                    call.exitWhiteboard();
                }
            }
        };

        function toggleAudioMute_() {
            for (var call of $scope.calls_) {
                call.toggleAudioMute();
            }
            $scope.muteAudioIconSet_.toggle();
        };

        function toggleVideoMute_() {
            for (var call of $scope.calls_) {
                call.toggleVideoMute();
            }
            $scope.muteVideoIconSet_.toggle();
        };

        // function toggleSlider_() {
        //     if ($scope.showSlider_) {
        //         $scope.showSlider_ = false;
        //         hide_($scope.imageSlider_);
        //     } else {
        //         if ($scope.snapshots.length == 0) {
        //             alert('please take snapshot from whiteboard screen');
        //             return;
        //         }
        //         $scope.showSlider_ = true;
        //         show_($scope.imageSlider_);
        //     }
        // }

        function toggleFullScreen_() {
            if (document.webkitCurrentFullScreenElement) {
                trace('Exiting fullscreen.');
                document.querySelector('svg#fullscreen title').textContent =
                    'Enter fullscreen';
                if ($scope.isPresenter_ === 'true') {  
                    $scope.localVideo_.webkitExitFullscreen();  
                } else {
                    $scope.remoteVideo_.webkitExitFullscreen();
                }
            } else {
                trace('Entering fullscreen.');
                document.querySelector('svg#fullscreen title').textContent =
                    'Exit fullscreen';
                if ($scope.isPresenter_ === 'true') {  
                    $scope.localVideo_.webkitEnterFullscreen();  
                } else {
                    $scope.remoteVideo_.webkitEnterFullscreen();
                }
            }
            $scope.fullscreenIconSet_.toggle();
        };

        function hide_(element) {
            element.classList.add('hidden');
        };

        function show_(element) {
            element.classList.remove('hidden');
        };

        function activate_(element) {
            element.classList.add('active');
        };

        function deactivate_(element) {
            element.classList.remove('active');
        };

        function showIcons_() {
            if (!$scope.icons_.classList.contains('active') && !inWhiteboard_) {
                activate_($scope.icons_);
                setIconTimeout_();
            }
        };

        function hideIcons_() {
            if ($scope.icons_.classList.contains('active')) {
                deactivate_($scope.icons_);
            }
        };

        function setIconTimeout_() {
            if ($scope.hideIconsAfterTimeout) {
                window.clearTimeout.bind(this, $scope.hideIconsAfterTimeout);
            }
            $scope.hideIconsAfterTimeout = window.setTimeout(function() {
                hideIcons_();
            }.bind(this), 5000);
        };

        function iconEventSetup_() {
            $scope.icons_.onmouseenter = function() {
                window.clearTimeout($scope.hideIconsAfterTimeout);
            }.bind(this);

            $scope.icons_.onmouseleave = function() {
                setIconTimeout_();
            }.bind(this);
        };


        function onIceConnectionStateChange_(state) {

        };

        function onSignalingStateChange_() {

        };
    }
]);