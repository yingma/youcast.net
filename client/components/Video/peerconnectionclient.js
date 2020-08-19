/*
 *  Copyright (c) 2016 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */

/* More information about these options at jshint.com/docs/options */

/* globals trace, mergeConstraints, parseJSON, iceCandidateType,
   maybePreferAudioReceiveCodec, maybePreferVideoReceiveCodec,
   maybePreferAudioSendCodec, maybePreferVideoSendCodec,
   maybeSetAudioSendBitRate, maybeSetVideoSendBitRate,
   maybeSetAudioReceiveBitRate, maybeSetVideoSendInitialBitRate,
   maybeSetVideoReceiveBitRate, maybeSetVideoSendInitialBitRate,
   maybeRemoveVideoFec, maybeSetOpusOptions, jsSHA, io, callstats,
   DOMException */

/* exported PeerConnectionClient */

// TODO(jansson) disabling for now since we are going replace JSHINT.
// (It does not say where the strict violation is hence it's not worth fixing.).
// jshint strict:false

'use strict';

var PeerConnectionClient = function(user, peer, params, startTime) {
    this.user_ = user;
    this.peer_ = peer;
    this.params_ = params;
    this.startTime_ = startTime;

    trace('Creating RTCPeerConnnection with:\n' +
        '  config: \'' + JSON.stringify(params.peerConnectionConfig) + '\';\n' +
        '\'.');

    // Create an RTCPeerConnection via the polyfill (adapter.js).
    this.pc_ = new RTCPeerConnection(params.peerConnectionConfig);
    this.pc_.onicecandidate = this.onIceCandidate_.bind(this);
    this.pc_.ontrack = this.onRemoteStreamAdded_.bind(this);
    this.pc_.onremovestream = trace.bind(null, 'Remote stream removed.');
    this.pc_.onsignalingstatechange = this.onSignalingStateChanged_.bind(this);
    this.pc_.oniceconnectionstatechange = this.onIceConnectionStateChanged_.bind(this);

    this.pc_.ondatachannel = this.onDataChannel_.bind(this);

    // create a datachannel 
    this.sc_ = this.pc_.createDataChannel('sendDataChannel', { ordered: true });
    this.sc_.binaryType = 'arraybuffer';
    this.sendDataOpened_ = false;
    this.sc_.onopen = this.onSendChannelStateChange_.bind(this);
    this.rc_ = null;
    //this.sc_.onmessage = this.onDataChannelReceiveData_.bind(this);

    //this.sc_.onclose = this.onSendChannelStateChange_.bind(this);

    this.hasRemoteSdp_ = false;
    this.messageQueue_ = [];
    this.isInitiator_ = false;
    this.started_ = false;
    //this.whiteboardStarted_ = false;
    // this.cameraStarted_ = false;
    this.isSendingBlob_ = false;
    this.dataQueue_ = [];

    // TODO(jiayl): Replace callbacks with events.
    // Public callbacks. Keep it sorted.
    this.onerror = null;
    this.oniceconnectionstatechange = null;
    this.onnewicecandidate = null;
    this.onremotehangup = null;
    this.onremotesdpset = null;
    this.onremotestreamadded = null;
    this.onsignalingmessage = null;
    this.onsignalingstatechange = null;

    // Public callbacks

    this.onscreen = null; // disable for mobile
    this.onwhiteboard = null;
    this.ondatasend = null;
    this.ondatareceive = null;
    this.oncamera = null;
    this.onimage = null;
    this.onremoveimage = null;

    this.chunkSize = 16384;
};

// Set up audio and video regardless of what devices are present.
// Disable comfort noise for maximum audio quality.
PeerConnectionClient.DEFAULT_SDP_OFFER_OPTIONS_ = {
    offerToReceiveAudio: 1,
    offerToReceiveVideo: 1,
    voiceActivityDetection: false
};

PeerConnectionClient.prototype.addStream = function(stream) {
    if (!this.pc_)
        return;
    this.pc_.addStream(stream);
};

PeerConnectionClient.prototype.removeStream = function(stream) {
    if (!this.pc_)
        return;
    this.pc_.removeStream(stream);
}

PeerConnectionClient.prototype.reset = function() {
    this.started_ = false;
};

PeerConnectionClient.prototype.resetPeer = function(peer) {
    this.peer_ = peer;
};

PeerConnectionClient.prototype.startAsCaller = function(offerOptions) {
    if (!this.pc_) {
        return false;
    }
    if (this.started_) {
        return false;
    }
    this.isInitiator_ = true;
    this.started_ = true;
    var constraints = mergeConstraints(
        PeerConnectionClient.DEFAULT_SDP_OFFER_OPTIONS_, offerOptions);
    trace('Sending offer to peer, with constraints: \n\'' +
        JSON.stringify(constraints) + '\'.');
    this.pc_.createOffer(constraints)
        .then(this.setLocalSdpAndNotify_.bind(this))
        .catch(this.onError_.bind(this, 'createOffer'));
    return true;
};

PeerConnectionClient.prototype.startAsCallee = function(initialMessages) {
    if (!this.pc_) {
        return false;
    }
    if (this.started_) {
        return false;
    }
    this.isInitiator_ = false;
    this.started_ = true;
    if (initialMessages && initialMessages.length > 0) {
        // Convert received messages to JSON objects and add them to the message
        // queue.
        for (var i = 0, len = initialMessages.length; i < len; i++) {
            this.receiveSignalingMessage(initialMessages[i]);
        }
        return true;
    }
    // We may have queued messages received from the signaling channel before
    // started.
    if (this.messageQueue_.length > 0) {
        this.drainMessageQueue_();
    }
    return true;
};

PeerConnectionClient.prototype.receiveSignalingMessage = function(messageObj) {
    if ((this.isInitiator_ && messageObj.type === 'answer') ||
        (!this.isInitiator_ && messageObj.type === 'offer')) {
        this.hasRemoteSdp_ = true;
        // Always process offer before candidates.
        this.messageQueue_.unshift(messageObj);
    } else if (messageObj.type === 'candidate') {
        this.messageQueue_.push(messageObj);
    } else if (messageObj.type === 'bye') {
        if (this.onremotehangup) {
            this.onremotehangup(this.peer_);
        }
    } else if (messageObj.type === "whiteboard" 
        || messageObj.type === "data" 
        || messageObj.type === "ready" 
        || messageObj.type === "camera"
        || messageObj.type === "screen") {
        this.messageQueue_.push(messageObj);
    }

    this.drainMessageQueue_();
};


PeerConnectionClient.prototype.close = function() {
    if (!this.pc_) {
        return;
    }
    this.dataQueue_ = [];
    this.sc_.close();
    this.sc_ = null;
    this.pc_.close();
    this.pc_ = null;
};

// PeerConnectionClient.prototype.getPeerConnectionStates = function() {
//   	if (!this.pc_) {
// 		return null;
//   	}
//   	return {
// 		'signalingState': this.pc_.signalingState,
// 		'iceGatheringState': this.pc_.iceGatheringState,
// 		'iceConnectionState': this.pc_.iceConnectionState
//   	};
// };

// PeerConnectionClient.prototype.getPeerConnectionStats = function(callback) {
//   	if (!this.pc_) {
// 		return;
//   	}
//   	this.pc_.getStats(null)
//   	.then(callback);
// };

PeerConnectionClient.prototype.doAnswer_ = function() {
    trace('Sending answer to peer.');
    this.pc_.createAnswer()
        .then(this.setLocalSdpAndNotify_.bind(this))
        .catch(this.onError_.bind(this, 'createAnswer'));
};

PeerConnectionClient.prototype.setLocalSdpAndNotify_ =
    function(sessionDescription) {
        sessionDescription.sdp = maybePreferAudioReceiveCodec(
            sessionDescription.sdp,
            this.params_);
        sessionDescription.sdp = maybePreferVideoReceiveCodec(
            sessionDescription.sdp,
            this.params_);
        sessionDescription.sdp = maybeSetAudioReceiveBitRate(
            sessionDescription.sdp,
            this.params_);
        sessionDescription.sdp = maybeSetVideoReceiveBitRate(
            sessionDescription.sdp,
            this.params_);
        sessionDescription.sdp = maybeRemoveVideoFec(
            sessionDescription.sdp,
            this.params_);
        this.pc_.setLocalDescription(sessionDescription)
            .then(trace.bind(null, 'Set session description success.'))
            .catch(this.onError_.bind(this, 'setLocalDescription'));

        if (this.onsignalingmessage) {
            // Chrome version of RTCSessionDescription can't be serialized directly
            // because it JSON.stringify won't include attributes which are on the
            // object's prototype chain. By creating the message to serialize
            // explicitly we can avoid the issue.
            this.onsignalingmessage({
                user: this.user_,
                peer: this.peer_,
                sdp: sessionDescription.sdp,
                type: sessionDescription.type
            });
        }
    };

PeerConnectionClient.prototype.setRemoteSdp_ = function(message) {
    message.sdp = maybeSetOpusOptions(message.sdp, this.params_);
    message.sdp = maybePreferAudioSendCodec(message.sdp, this.params_);
    message.sdp = maybePreferVideoSendCodec(message.sdp, this.params_);
    message.sdp = maybeSetAudioSendBitRate(message.sdp, this.params_);
    message.sdp = maybeSetVideoSendBitRate(message.sdp, this.params_);
    message.sdp = maybeSetVideoSendInitialBitRate(message.sdp, this.params_);
    message.sdp = maybeRemoveVideoFec(message.sdp, this.params_);
    this.pc_.setRemoteDescription(new RTCSessionDescription(message))
        .then(this.onSetRemoteDescriptionSuccess_.bind(this))
        .catch(this.onError_.bind(this, 'setRemoteDescription'));
};

PeerConnectionClient.prototype.onSetRemoteDescriptionSuccess_ = function() {
    trace('Set remote session description success.');
    // By now all onaddstream events for the setRemoteDescription have fired,
    // so we can know if the peer has any remote video streams that we need
    // to wait for. Otherwise, transition immediately to the active state.
    var remoteStreams = this.pc_.getRemoteStreams();
    if (this.onremotesdpset) {
        this.onremotesdpset(this.peer_, remoteStreams.length > 0 &&
            remoteStreams[0].getVideoTracks().length > 0);
    }
};

PeerConnectionClient.prototype.processSignalingMessage_ = function(message) {
    if (message.type === 'offer' && !this.isInitiator_) {
        if (this.pc_.signalingState !== 'stable') {
            trace('ERROR: remote offer received in unexpected state: ' +
                this.pc_.signalingState);
            return;
        }
        this.setRemoteSdp_(message);
        this.doAnswer_();
    } else if (message.type === 'answer' && this.isInitiator_) {
        if (this.pc_.signalingState !== 'have-local-offer') {
            trace('ERROR: remote answer received in unexpected state: ' +
                this.pc_.signalingState);
            return;
        }
        this.setRemoteSdp_(message);
    } else if (message.type === 'candidate') {
        var candidate = new RTCIceCandidate({
            sdpMLineIndex: message.label,
            candidate: message.candidate
        });
        this.recordIceCandidate_('Remote', candidate);
        this.pc_.addIceCandidate(candidate)
            .then(trace.bind(null, 'Remote candidate added successfully.'))
            .catch(this.onError_.bind(this, 'addIceCandidate'));
    } else if (message.type === 'whiteboard') {
        if (this.onwhiteboard)
            this.onwhiteboard();
    } else if (message.type === 'data') { // whiteboard session
        if (this.ondataready)
            this.ondataready(message);
        // trigger the whiteboard session
    } else if (message.type === 'ready') {
        if (this.ondatasend)
            this.ondatasend(this.peer_); 
    } else if (message.type === 'camera') {
        if (this.oncamera)
            this.oncamera();
    } else if (message.type === 'screen') {
        // if (this.screenStarted_)
        //     return;
        // this.screenStarted_ = true;
        // this.cameraStarted_ = false;
        //this.whiteboardStarted_ = false;
        //this.whiteboard_ = false;
        if (this.onscreen)
            this.onscreen(this.peer_);
    } else {
        trace('WARNING: unexpected message: ' + JSON.stringify(message));
    }
};

// When we receive messages from GAE registration and from the WSS connection,
// we add them to a queue and drain it if conditions are right.
PeerConnectionClient.prototype.drainMessageQueue_ = function() {
    // It's possible that we finish registering and receiving messages from WSS
    // before our peer connection is created or started. We need to wait for the
    // peer connection to be created and started before processing messages.
    //
    // Also, the order of messages is in general not the same as the POST order
    // from the other client because the POSTs are async and the server may handle
    // some requests faster than others. We need to process offer before
    // candidates so we wait for the offer to arrive first if we're answering.
    // Offers are added to the front of the queue.
    if (!this.pc_ || !this.started_ || !this.hasRemoteSdp_) {
        return;
    }
    for (var i = 0, len = this.messageQueue_.length; i < len; i++) {
        this.processSignalingMessage_(this.messageQueue_[i]);
    }
    this.messageQueue_ = [];
};

PeerConnectionClient.prototype.onIceCandidate_ = function(event) {
    if (event.candidate) {
        // Eat undesired candidates.
        if (this.filterIceCandidate_(event.candidate)) {
            var message = {
                user: this.user_,
                peer: this.peer_,
                type: 'candidate',
                label: event.candidate.sdpMLineIndex,
                id: event.candidate.sdpMid,
                candidate: event.candidate.candidate
            };
            if (this.onsignalingmessage) {
                this.onsignalingmessage(message);
            }
            this.recordIceCandidate_('Local', event.candidate);
        }
    } else {
        trace('End of candidates.');
    }
};

PeerConnectionClient.prototype.onSignalingStateChanged_ = function() {
    if (!this.pc_) {
        return;
    }
    trace('Signaling state changed to: ' + this.pc_.signalingState);
    if (this.onsignalingstatechange) {
        this.onsignalingstatechange();
    }
};


PeerConnectionClient.prototype.onIceConnectionStateChanged_ = function() {
    if (!this.pc_) {
        return;
    }
    trace('ICE connection state changed to: ' + this.pc_.iceConnectionState);
    if (this.pc_.iceConnectionState === 'completed') {
        trace('ICE complete time: ' +
            (window.performance.now() - this.startTime_).toFixed(0) + 'ms.');
    }
    if (this.oniceconnectionstatechange) {
        this.oniceconnectionstatechange(this.pc_.iceConnectionState);
    }
};

// Return false if the candidate should be dropped, true if not.
PeerConnectionClient.prototype.filterIceCandidate_ = function(candidateObj) {
    var candidateStr = candidateObj.candidate;

    // Always eat TCP candidates. Not needed in this context.
    if (candidateStr.indexOf('tcp') !== -1) {
        return false;
    }
    // If we're trying to eat non-relay candidates, do that.
    if (this.params_.peerConnectionConfig.iceTransports === 'relay' &&
        iceCandidateType(candidateStr) !== 'relay') {
        return false;
    }
    return true;
};


PeerConnectionClient.prototype.recordIceCandidate_ = function(location, candidateObj) {
    if (this.onnewicecandidate) {
        this.onnewicecandidate(location, candidateObj.candidate);
    }
};

PeerConnectionClient.prototype.onRemoteStreamAdded_ = function(event) {
    trace("remote streams added");
    if (this.onremotestreamadded) {
        this.onremotestreamadded(this.peer_, event.streams[0]);
    }
};

// PeerConnectionClient.prototype.startDataChannel = function() {
//     //this.isSendingBlob_ = true;
// };

PeerConnectionClient.prototype.onDataChannel_ = function(event) {
    this.rc_ = event.channel;
    this.rc_.binaryType = 'arraybuffer';
    this.rc_.onmessage = this.onDataChannelReceiveData_.bind(this);
    this.rc_.onopen = this.onDataChannelReceiveState_.bind(this);
    this.rc_.onclose = this.onDataChannelReceiveState_.bind(this);
};

PeerConnectionClient.prototype.onSendChannelStateChange_ = function() {
    var readyState = this.sc_.readyState;
    trace('Send channel state is ' + readyState);
    if (readyState === 'open') { 
        this.sendDataOpened_ = true;
        this.usePolling = true;
        if (typeof this.sc_.bufferedAmountLowThreshold === 'number') {
            trace('Using the bufferedamountlow event for flow control');
            this.usePolling = false;
            // Reduce the buffer fullness threshold, since we now have more efficient
            // buffer management.
            var bufferFullThreshold = this.chunkSize / 2;
            // This is "overcontrol": our high and low thresholds are the same.
            this.sc_.bufferedAmountLowThreshold = bufferFullThreshold;
        } else { // close
            this.dataQueue_ = [];
        }
    }
};

PeerConnectionClient.prototype.onDataChannelReceiveState_ = function() {
    var readyState = this.rc_.readyState;
    trace('Receive channel state is: ' + readyState);
}


PeerConnectionClient.prototype.onDataChannelReceiveData_ = function(event) {
    if (this.ondatareceive)
        this.ondatareceive(event.data);
};

PeerConnectionClient.prototype.sendTextData = function(data) {
    if (this.sendDataOpened_ && data) {
        this.dataQueue_.push(data);
    }

    while (this.dataQueue_.length > 0) {
        var data = this.dataQueue_.shift();
        this.sc_.send(data);
    }
};

PeerConnectionClient.prototype.sendRelayTextData = function(data) {
    if (data) {
        this.dataQueue_.push(data);
    }
    if (this.isSendingBlob_)
        return;

    while (this.sendDataOpened_ && this.dataQueue_.length > 0) {
        var data = this.dataQueue_.shift();
        this.sc_.send(data);
    }
};

PeerConnectionClient.prototype.sendData = function(data) {
    this.sendData_(data);
};

PeerConnectionClient.prototype.sendData_ = function(data) {

    var self = this;
    var datachannel = this.sc_;
    var chunkSize = this.chunkSize;
    var bufferFullThreshold = chunkSize / 2;
    var usePolling = this.usePolling;
    this.isSendingBlob_ = true;
    // Listen for one bufferedamountlow event.
    var listener = function(data, offset) {
        datachannel.onbufferedamountlow = null;
        sendAllData(data, offset);
    };
    var sendAllData = function(data, offset) {
        while (offset < data.length) {
            if (datachannel.bufferedAmount > bufferFullThreshold) {
                if (usePolling) {
                    setTimeout(sendAllData, 250);
                } else {
                    datachannel.onbufferedamountlow = function() {
                        listener(data, offset);
                    };
                }
                return;
            }
            var len = Math.min(chunkSize, data.length - offset); 
            datachannel.send(data.slice(offset, offset + len));
            offset += len;
        }

        self.isSendingBlob_ = false;
        trace("All data chunks sent.");
        // reset data 
        setTimeout(function(){
            PeerConnectionClient.prototype.sendRelayTextData.call(self, null);
        },500);
    };
    setTimeout(function() {
        sendAllData(data, 0);
    }, 250);
};

PeerConnectionClient.prototype.onError_ = function(tag, error) {
    if (this.onerror) {
        this.onerror(this.peer_, tag + ': ' + error.toString());
    }
};
