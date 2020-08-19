/*
 *  Copyright (c) 2014 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */

/* More information about these options at jshint.com/docs/options */

/* globals trace, requestIceServers, sendUrlRequest, sendAsyncUrlRequest,
   SignalingChannel, PeerConnectionClient, setupLoopback,
   parseJSON, isChromeApp, apprtc, Constants */

/* exported Call */

'use strict';

var Call = function(peer, params, localstream, signalchannel, sharescreen = false) {
    this.peer_ = peer + (sharescreen ? "_screen" : "");
    this.params_ = params;
    this.roomServer_ = params.roomServer || '';
    this.needResendData_ = false;
    //signal for webrtc
    //this.channel_ = new SignalingChannel(params.wssUrl, params.wssPostUrl);
    this.channel_ = signalchannel;
    //this.channel_.onmessage = this.onRecvSignalingChannelMessage_.bind(this);

    this.dataSize_ = 0;
    this.receiveData_ = [];
    this.receivedSize_ = 0;
    this.whiteboard_ = false;
    this.roomId_ = params.roomId;

    this.isScreenSharing_ = sharescreen;

    // webrtc channel 
    this.pcClient_ = null;
    this.localStream_ = localstream;
    this.errorMessageQueue_ = [];
    this.startTime = null;

    // add video and audio devices here
    // this.videoInputs = [];
    // this.audioInputs = [];
    // this.audioOuputs = [];

    // save selected video and audio 
    // this.selectedVideoDeviceId = null;
    // this.selectedRecordDeviceId = null;
    // this.selectedPlaybackDeviceId = null;

    // Public callbacks. Keep it sorted.
    this.oncallerstarted = null;
    this.onerror = null;
    this.oniceconnectionstatechange = null;
    this.onlocalstreamadded = null;
    this.onnewicecandidate = null;
    this.onremotehangup = null;
    this.onremotesdpset = null;
    this.onremotestreamadded = null;
    this.onsignalingstatechange = null;
    this.onstatusmessage = null;

    //signal event
    this.onwhiteboard = null; // start whiteboard session. 
    this.onscreen = null;
    this.oncamera = null; // switch to camera
    this.onimagestart = null;
    this.onimageprogress = null;

    // data channel event
    this.onimage = null; // once receive image call back from data channel.
    this.ondatasend = null; // send message from data channel 
    this.ondatareceive = null; // receive message from data channel 

    this.getMediaPromise_ = null;
    this.getIceServersPromise_ = null;
    //this.requestMediaAndIceServers_();
    this.isInitiator_ = true;
};

// Call.prototype.requestMediaAndIceServers_ = function() {
//     if (!this.localstream_) {
//         this.getMediaPromise_ = this.maybeGetUserMedia_();
//     }
//     this.getIceServersPromise_ = this.maybeGetIceServers_();
// };

Call.prototype.isInitiator = function() {
    return this.isInitiator_;
};

Call.prototype.isPresenter = function() {
    return this.params_.clientId === this.params_.presenter;
};

Call.prototype.start = function(roomId) {
    this.connectToRoom_(roomId);
};

Call.prototype.getPeer = function() {
    return this.peer_;
};

Call.prototype.resetPeer = function(peer) {
    this.peer_ = peer;
    this.pcClient_.resetPeer(peer);
};

Call.prototype.needResendData = function() {
    return this.needResendData_;
};

Call.prototype.setToResendData = function(flag) {
    this.needResendData_ = flag;  
};

Call.prototype.hangup = function(async) {
    this.startTime = null;

    if (isChromeApp()) {
        this.clearCleanupQueue_();
    }

    if (this.localStream_) {
        if (typeof this.localStream_.getTracks === 'undefined') {
            // Support legacy browsers, like phantomJs we use to run tests.
            this.localStream_.stop();
        } else {
            this.localStream_.getTracks().forEach(function(track) {
                track.stop();
            });
        }
        this.localStream_ = null;
    }

    if (!this.roomId_) {
        return;
    }

    if (this.pcClient_) {
        this.pcClient_.close();
        this.pcClient_ = null;
    }

    // Send 'leave' to GAE. This must complete before saying BYE to other client.
    // When the other client sees BYE it attempts to post offer and candidates to
    // GAE. GAE needs to know that we're disconnected at that point otherwise
    // it will forward messages to this client instead of storing them.

    // This section of code is executed in both sync and async depending on
    // where it is called from. When the browser is closed, the requests must
    // be executed as sync to finish before the browser closes. When called
    // from pressing the hang up button, the requests are executed async.

    // If you modify the steps used to hang up a call, you must also modify
    // the clean up queue steps set up in queueCleanupMessages_.');

    var steps = [];
    if (!this.isScreenSharing_) {
        steps.push({
            step: function() {
                //Send POST request to /leave.
                var path = this.roomServer_;
                return sendUrlRequest('POST', path, {"room": this.roomId_, "user": this.params_.clientId});
            }.bind(this),
            errorString: 'Error sending /leave:'
        });
    }
    steps.push({
        step: function() {
          // Send bye to the other client.
          this.channel_.send(JSON.stringify({user: this.params_.clientId + (this.isScreenSharing_ ? "_screen" : ""), peer: this.peer_, type: 'bye'}));
        }.bind(this),
        errorString: 'Error sending bye:'
    });
    steps.push({
        step: function() {
          this.params_.previousRoomId = this.roomId_;
          this.roomId_ = null;
          this.params_.clientId = null;
        }.bind(this),
        errorString: 'Error setting params:'
    });

    if (async) {
        var errorHandler = function(errorString, error) {
          trace(errorString + ' ' + error.message);
        };
        var promise = Promise.resolve();
        for (var i = 0; i < steps.length; ++i) {
            promise = promise.then(steps[i].step).catch(
                errorHandler.bind(this, steps[i].errorString));
        }
        return promise;
    }
    // Execute the cleanup steps.
    var executeStep = function(executor, errorString) {
        try {
            executor();
        } catch (ex) {
            trace(errorString + ' ' + ex);
        }
    };

    for (var j = 0; j < steps.length; ++j) {
        executeStep(steps[j].step, steps[j].errorString);
    }

    if (this.roomId_ !== null || this.params_.clientId !== null) {
        trace('ERROR: sync cleanup tasks did not complete successfully.');
    } else {
        trace('Cleanup completed.');
    }
    return Promise.resolve();
};


Call.prototype.onRemoteHangup = function() {
    this.startTime = null;
    // On remote hangup this client becomes the new initiator. so far do not want to change role
    //this.params_.isInitiator = true;
    if (this.pcClient_) {
        this.pcClient_.close();
        this.pcClient_ = null;
    }

    //this.startSignaling_();
};

// Call.prototype.getPeerConnectionStates = function() {
//   if (!this.pcClient_) {
//     return null;
//   }
//   return this.pcClient_.getPeerConnectionStates();
// };

// Call.prototype.getPeerConnectionStats = function(callback) {
//   if (!this.pcClient_) {
//     return;
//   }
//   this.pcClient_.getPeerConnectionStats(callback);
// };


Call.prototype.startVideoStream = function() {
    if (this.isPresenter() && this.localStream_) {
        var videoTracks = this.localStream_.getVideoTracks();
        videoTracks[0].enabled = true;
    }
};

Call.prototype.stopVideoStream = function() {
    if (this.isPresenter() && this.localStream_) {
        var videoTracks = this.localStream_.getVideoTracks();
        videoTracks[0].enabled = false;
    } 
};

Call.prototype.toggleVideoMute = function() {
    var videoTracks = this.localStream_.getVideoTracks();
    if (videoTracks.length === 0) {
        trace('No local video available.');
        return;
    }
    trace('Toggling video mute state.');
    for (var i = 0; i < videoTracks.length; ++i) {
        videoTracks[i].enabled = !videoTracks[i].enabled;
    }
    trace('Video ' + (videoTracks[0].enabled ? 'unmuted.' : 'muted.'));
};

Call.prototype.toggleAudioMute = function() {
    var audioTracks = this.localStream_.getAudioTracks();
    if (audioTracks.length === 0) {
        trace('No local audio available.');
        return;
    }
    trace('Toggling audio mute state.');
    for (var i = 0; i < audioTracks.length; ++i) {
        audioTracks[i].enabled = !audioTracks[i].enabled;
    }
    trace('Audio ' + (audioTracks[0].enabled ? 'unmuted.' : 'muted.'));
};

// Connects client to the room. This happens by simultaneously requesting
// media, requesting turn, and join the room. Once all three of those
// tasks is complete, the signaling process begins. At the same time, a
// WebSocket connection is opened using |wss_url| followed by a subsequent
// registration once GAE registration completes.
Call.prototype.connectToRoom_ = function(roomId) {
    this.roomId_ = roomId;
    this.isInitiator_ = this.params_.isInitiator === 'true';
    // Asynchronously open a WebSocket connection to WSS.
    // TODO(jiayl): We don't need to wait for the signaling channel to open before
    // start signaling.
    // var channelPromise = this.channel_.open().catch(function(error) {
    //     this.onError_('WebSocket open error: ' + error.message);
    //     return Promise.reject(error);
    // }.bind(this));

    // Asynchronously join the room.
    // var joinPromise =
    //     this.joinRoom_().then(function(roomParams) {
    //         // The only difference in parameters should be clientId and isInitiator,
    //         // and the turn servers that we requested.
    //         // TODO(tkchin): clean up response format. JSHint doesn't like it.
    //         this.params_.clientId = roomParams.client_id;
    //         this.params_.roomId = roomParams.room_id;
    //         this.params_.roomLink = roomParams.room_link;
    //         this.isInitiator_ = roomParams.is_initiator === 'true';

    //         this.params_.messages = roomParams.messages;

    //     }.bind(this)).catch(function(error) {
    //         this.onError_('Room server join error: ' + error.message);
    //         return Promise.reject(error);
    //     }.bind(this));

    // We only register with WSS if the web socket connection is open and if we're
    // already registered with GAE.

    this.startSignaling_();
    if (isChromeApp()) {
        // We need to register the required clean up steps with the
        // background window as soon as we have the information available.
        // This is required because only the background window is notified
        // when the window closes.
        this.queueCleanupMessages_();
    }
};

Call.prototype.queueCleanupMessages_ = function() {
  // Set up the cleanup queue.
  // These steps mirror the cleanup done in hangup(), but will be
  // executed when the Chrome App is closed by background.js.
  apprtc.windowPort.sendMessage({
    action: Constants.QUEUEADD_ACTION,
    queueMessage: {
      action: Constants.XHR_ACTION,
      method: 'POST',
      url: this.getLeaveUrl_(),
      body: null
    }
  });

  apprtc.windowPort.sendMessage({
    action: Constants.QUEUEADD_ACTION,
    queueMessage: {
      action: Constants.WS_ACTION,
      wsAction: Constants.WS_SEND_ACTION,
      data: JSON.stringify({
        cmd: 'send',
        msg: JSON.stringify({user: this.params_.clientId, peer: this.peer_, type: 'bye'})
      })
    }
  });

  apprtc.windowPort.sendMessage({
    action: Constants.QUEUEADD_ACTION,
    queueMessage: {
      action: Constants.XHR_ACTION,
      method: 'DELETE',
      url: this.channel_.getWssPostUrl(),
      body: null
    }
  });
};

Call.prototype.clearCleanupQueue_ = function() {
  // Clear the cleanup queue.
  apprtc.windowPort.sendMessage({action: Constants.QUEUECLEAR_ACTION});
};

Call.prototype.restart = function() {
  // Reinitialize the promises so the media gets hooked up as a result
  // of calling maybeGetMedia_.
  this.requestMediaAndIceServers_();
  this.start(this.params_.previousRoomId);
};

Call.prototype.removeStream = function() {
    if (this.localStream_) {
        if (typeof this.localStream_.getTracks === 'undefined') {
            // Support legacy browsers, like phantomJs we use to run tests.
            this.localStream_.stop();
        } else {
            this.localStream_.getTracks().forEach(function(track) {
                track.stop();
            });
        };

        this.pcClient_.removeStream(this.localStream_);
        this.localStream_ = null;
    };
};

// only call when flip camera
Call.prototype.addStream = function(stream) {
    // remove existing local stream
    //this.onUserMediaSuccess_(stream);   
    this.localStream_ = stream;        
    if (this.localStream_) {
        trace('Adding local stream.');
        this.pcClient_.addStream(this.localStream_);
    };
    this.pcClient_.reset();
    if (this.isInitiator()) {
        this.pcClient_.startAsCaller(this.params_.offerOptions);
    } else {
        this.pcClient_.startAsCallee(this.params_.messages);
    };
};

// Call.prototype.reconnect = function() {
  
//     // remove existing local stream
//     if (this.localStream_) {
//         if (typeof this.localStream_.getTracks === 'undefined') {
//             // Support legacy browsers, like phantomJs we use to run tests.
//             this.localStream_.stop();
//         } else {
//             this.localStream_.getTracks().forEach(function(track) {
//                 track.stop();
//             });
//         }

//         this.pcClient_.removeStream(this.localStream_);
//         this.localStream_ = null;
//     }

//     var mediaConstraints = this.params_.mediaConstraints;

//     if (mediaConstraints.video.mandatory != null)             
//         mediaConstraints.video.facingMode = this.selectedVideoDeviceId;

//     if (mediaConstraints.audio.mandatory != null)
//         mediaConstraints.audio["mandatory"].sourceId = this.selectedPlaybackDeviceId;

//     var mediaPromise = navigator.mediaDevices.getUserMedia(mediaConstraints)
//     .then(function(stream) {
//         trace('Got access to local media with mediaConstraints:\n' +
//         '  \'' + JSON.stringify(mediaConstraints) + '\'');

//         this.onUserMediaSuccess_(stream);

//     }.bind(this)).catch(function(error) {
//         this.onError_('Error getting user media: ' + error.message);
//         this.onUserMediaError_(error);
//     }.bind(this));

//     mediaPromise.then(function(){
//          if (this.localStream_ ) {
//             trace('Adding local stream.');
//             this.pcClient_.addStream(this.localStream_);
//         }
//         this.pcClient_.reset();
//         if (this.isInitiator()) {
//             this.pcClient_.startAsCaller(this.params_.offerOptions);
//         } else {
//             this.pcClient_.startAsCallee(this.params_.messages);
//         }
//     }.bind(this)).catch(function(error) {
//         this.onError_('Failed to start signaling: ' + error.message);
//     });
// };


// // Asynchronously request user media if needed.
// Call.prototype.maybeGetUserMedia_ = function() {
//     // mediaConstraints.audio and mediaConstraints.video could be objects, so
//     // check '!=== false' instead of '=== true'.
//     var needStream = (this.params_.mediaConstraints.audio !== false ||
//                         this.params_.mediaConstraints.video !== false)
//     var devicePromise = null;

//     if (needStream) {

//         var mediaConstraints = this.params_.mediaConstraints;
    
//         if (mediaConstraints.video.mandatory != null) {
//             // set the default value
//             if (!this.selectedVideoDeviceId) {
//                 this.selectedVideoDeviceId = "environment";
//             } 
//             mediaConstraints.video.facingMode = this.selectedVideoDeviceId;
//         }               
            
//         if (mediaConstraints.audio.mandatory != null)
//             mediaConstraints.audio["mandatory"].sourceId = this.selectedPlaybackDeviceId;

//         return navigator.mediaDevices.getUserMedia(mediaConstraints)
//         .then(function(stream) {
//             trace('Got access to local media with mediaConstraints:\n' +
//             '  \'' + JSON.stringify(mediaConstraints) + '\'');

//             this.onUserMediaSuccess_(stream);
//         }.bind(this)).catch(function(error) {
//             this.onError_('Error getting user media: ' + error.message);
//             this.onUserMediaError_(error);
//         }.bind(this));
              
//     } else {
//         devicePromise = Promise.resolve();
//     }
//     return devicePromise;
// };

// // Asynchronously request an ICE server if needed.
// Call.prototype.maybeGetIceServers_ = function() {
//     var shouldRequestIceServers =
//           (this.params_.iceServerRequestUrl &&
//           this.params_.iceServerRequestUrl.length > 0 &&
//           this.params_.turnServerOverride &&
//           this.params_.turnServerOverride.length === 0);

//     var iceServerPromise = null;
//     if (shouldRequestIceServers) {
//         var requestUrl = this.params_.iceServerRequestUrl;
//         iceServerPromise =
//         requestIceServers(requestUrl, this.params_.iceServerTransports).then(
//         function(iceServers) {
//           var servers = this.params_.peerConnectionConfig.iceServers;
//           this.params_.peerConnectionConfig.iceServers =
//               servers.concat(iceServers);
//         }.bind(this)).catch(function(error) {
//           if (this.onstatusmessage) {
//             // Error retrieving ICE servers.
//             var subject =
//                 encodeURIComponent('AppRTC demo ICE servers not working');
//             this.onstatusmessage(
//                 'No TURN server; unlikely that media will traverse networks. ' +
//                 'If this persists please ' +
//                 '<a href="mailto:discuss-webrtc@googlegroups.com?' +
//                 'subject=' + subject + '">' +
//                 'report it to discuss-webrtc@googlegroups.com</a>.');
//             }
//             trace(error.message);
//         }.bind(this));
//     } else {
//         if (this.params_.turnServerOverride &&
//             this.params_.turnServerOverride.length === 0) {
//             iceServerPromise = Promise.resolve();
//         } else {
//         // if turnServerOverride is not empty it will be used for
//         // turn/stun servers.
//             iceServerPromise = new Promise(function(resolve) {
//                 this.params_.peerConnectionConfig.iceServers =
//                 this.params_.turnServerOverride;
//                 resolve();
//             }.bind(this));
//         }
//     }
//     return iceServerPromise;
// };

// Call.prototype.onUserMediaSuccess_ = function(stream) {
//     this.localStream_ = stream;
//     if (this.onlocalstreamadded) {
//         this.onlocalstreamadded(stream);
//     }
// };

// Call.prototype.onUserMediaError_ = function(error) {
//     var errorMessage = 'Failed to get access to local media. Error name was ' +
//       error.name + '. Continuing without sending a stream.';
//     this.onError_('getUserMedia error: ' + errorMessage);
//     this.errorMessageQueue_.push(error);
//     alert(errorMessage);
// };


Call.prototype.maybeCreatePcClientAsync_ = function() {
    return new Promise(function(resolve, reject) {
        if (this.pcClient_) {
            resolve();
            return;
        }
        if (typeof RTCPeerConnection.generateCertificate === 'function') {
            var certParams = {name: 'ECDSA', namedCurve: 'P-256'};
            RTCPeerConnection.generateCertificate(certParams)
            .then(function(cert) {
                trace('ECDSA certificate generated successfully.');
                this.params_.peerConnectionConfig.certificates = [cert];
                this.createPcClient_();
                resolve();
            }.bind(this))
            .catch(function(error) {
                trace('ECDSA certificate generation failed.');
                reject(error);
            });
        } else {
            this.createPcClient_();
                resolve();
        }
    }.bind(this));
};

Call.prototype.createPcClient_ = function() {
    this.pcClient_ = new PeerConnectionClient(this.params_.clientId + (this.isScreenSharing_ ? "_screen" : ""), this.peer_, this.params_, this.startTime);
    this.pcClient_.onsignalingmessage = this.sendSignalingMessage_.bind(this);
    this.pcClient_.onremotehangup = this.onremotehangup;
    this.pcClient_.onremotesdpset = this.onremotesdpset;
    this.pcClient_.onremotestreamadded = this.onremotestreamadded;
    this.pcClient_.onsignalingstatechange = this.onsignalingstatechange;
    this.pcClient_.oniceconnectionstatechange = this.oniceconnectionstatechange;
    this.pcClient_.onnewicecandidate = this.onnewicecandidate;
    this.pcClient_.onerror = this.onerror;

    this.pcClient_.onwhiteboard = this.onwhiteboard;
    this.pcClient_.ondataready = this.onDataReady_.bind(this);
    this.pcClient_.onscreen = this.onscreen;
    this.pcClient_.oncamera = this.oncamera;

    this.pcClient_.onimage = this.onimage;
    this.pcClient_.ondatasend = this.ondatasend;
    this.pcClient_.ondatareceive = this.onReceiveMessageCallback_.bind(this);

    trace('Created PeerConnectionClient');
};

Call.prototype.startSignaling_ = function() {
    trace('Starting signaling.');
    if (!this.isInitiator() && this.oncallerstarted) {
        this.oncallerstarted(this.roomId_, this.params_.roomLink);
    }
    this.startTime = window.performance.now();
    this.maybeCreatePcClientAsync_()
    .then(function() {
        if (this.localStream_ ) {
            trace('Adding local stream.');
            this.pcClient_.addStream(this.localStream_);
        }
        if (this.isInitiator()) {
            if (!this.isScreenSharing_){
                this.pcClient_.startAsCaller(this.params_.offerOptions);
            } else {
                this.pcClient_.startAsCaller({});
            }
        } else {
            this.pcClient_.startAsCallee(this.params_.messages);
        }
    }.bind(this))
    .catch(function(e) {
        this.onError_('Create PeerConnection exception: ' + e);
        alert('Cannot create RTCPeerConnection: ' + e.message);
    }.bind(this));
};

Call.prototype.resetData = function() {
    this.receivedSize_ = 0;
    this.receiveData_ = [];
};

Call.prototype.onReceiveMessageCallback_ = function(data) {
    trace('Received Message ' + data.length);
    if (!this.whiteboard_) {
        this.receiveData_.push(data);
        this.receivedSize_ += data.length;
        if (this.onimageprogress)
            this.onimageprogress(this.receivedSize_);
        if (this.receivedSize_ === this.dataSize_) {
            var received = this.receiveData_.join('');
            if (this.onimage)
                this.onimage(this.peer_, received);
            this.whiteboard_ = true;
            this.resetData();
        }
    } else {
        if (this.ondatareceive) {
            var json = parseJSON(data);
            this.ondatareceive(json);
        }
    }
};

// Join the room and returns room parameters.
// Call.prototype.joinRoom_ = function() {

//     return new Promise(function(resolve, reject) {
//         if (!this.params_.roomId) {
//             reject(Error('Missing room id.'));
//         }
//         var responseObj = {
//             client_id : this.params_.clientId,
//             room_id: this.params_.roomId,
//             room_link : this.params_.roomLink, //'https://www.youcast.net/#!%2Fr2%2F' +  this.params_.roomId,
//             is_initiator : this.params_.isInitiator

//         }
//         resolve(responseObj);
//         // var path = this.roomServer_ + '/join/' +
//         //     this.params_.roomId + window.location.search;

//         // sendAsyncUrlRequest('POST', path)
//         // .then(function(response) {
//         //     var responseObj = parseJSON(response);
//         //     if (!responseObj) {
//         //         reject(Error('Error parsing response JSON.'));
//         //         return;
//         //     }
//         //     if (responseObj.result !== 'SUCCESS') {
//         //         // TODO (chuckhays) : handle room full state by returning to room
//         //         // selection state.
//         //         // When room is full, responseObj.result === 'FULL'
//         //         reject(Error('Registration error: ' + responseObj.result));
//         //         if (responseObj.result === 'FULL') {
//         //             var getPath = this.roomServer_ + '/r/' +
//         //                 this.params_.roomId + window.location.search;
//         //             window.location.assign(getPath);
//         //         }
//         //         return;
//         //     }
//         //     trace('Joined the room.');
//         //     resolve(responseObj.params);
//         // }.bind(this))
//         // .catch(function(error) {
//         //     reject(Error('Failed to join the room: ' + error.message));
//         //     return;
//         // }.bind(this));
//     }.bind(this));
// };

Call.prototype.onRecvSignalingChannelMessage = function(msg) {
    this.maybeCreatePcClientAsync_()
    .then(function() {
        this.pcClient_.receiveSignalingMessage(msg);
    }.bind(this));
};

Call.prototype.sendSignalingMessage_ = function(message) {
    var msgString = JSON.stringify(message);
    if (this.isInitiator()) {
        // Initiator posts all messages to GAE. GAE will either store the messages
        // until the other client connects, or forward the message to Collider if
        // the other client is already connected.
        // Must append query parameters in case we've specified alternate WSS url.
        // var path = this.roomServer_ + '/message/' + this.params_.roomId +
        //     '/' + this.params_.clientId + window.location.search;
        // var xhr = new XMLHttpRequest();
        // xhr.open('POST', path, true);
        // xhr.send(msgString);
        this.channel_.send(msgString);
        trace('C->GAE: ' + msgString);
    } else {
        this.channel_.send(msgString);
    }
};

Call.prototype.sendTextData = function(text) {
    if (this.pcClient_ && text) {
        //var data = str2ab(text);
        this.pcClient_.sendTextData(text);
    }
};

Call.prototype.sendRelayTextData = function(text) {
    if (this.pcClient_ && text) {
        //var data = str2ab(text);
        this.pcClient_.sendRelayTextData(text);
    }
};

Call.prototype.sendBlobData = function(data) {
    if (this.pcClient_ && data) {
        this.pcClient_.sendData(data);
        this.whiteboard_ = true;
    }
};

Call.prototype.exitWhiteboard = function() {
    this.whiteboard_ = false;
};

// Call.prototype.startDataChannel = function() {
//     if (this.pcClient_)
//         this.pcClient_.startDataChannel();
// };

Call.prototype.sendSignalingMessage = function(message) {
    if (this.channel_){
        var msgString = JSON.stringify(message);
        this.channel_.send(msgString);
    }
};

Call.prototype.onDataReady_ = function(message) {
    if (!this.isPresenter()) {
        this.dataSize_ = message.size;
        if (this.onimagestart)
            this.onimagestart(this.dataSize_);
        this.pcClient_.onsignalingmessage({
            user: this.params_.clientId + (this.isScreenSharing_ ? "_screen" : ""),
            peer: this.peer_,
            type: 'ready'
        });
    };
};

// Call.prototype.onDataReceive_ = function(data) {
//     debugger;
//     //var str = ab2str(msg);
//     var obj = parseJSON(data);
//     if (this.ondatareceive) {
//         this.ondatareceive(obj);
//     }
// };

Call.prototype.onError_ = function(message) {
    if (this.onerror) {
        this.onerror(message);
    }
};
