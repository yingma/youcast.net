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

// Keep this in sync with the HTML element id attributes. Keep it sorted.
var UI_CONSTANTS = {
  confirmJoinButton: '#confirm-join-button',
  confirmJoinDiv: '#confirm-join-div',
  confirmJoinRoomSpan: '#confirm-join-room-span',
  conferenceSvg: '#conference-call',
  fullscreenSvg: '#fullscreen',
  hangupSvg: '#hangup',
  icons: '#icons',
  imageSlider: '#image-slider',
  miniVideo: '#mini-video',
  localVideo: '#local-video',
  muteAudioSvg: '#mute-audio',
  muteVideoSvg: '#mute-video',
  privacyLinks: '#privacy',
  remoteVideo: '#remote-video',
  remoteScreen: '#remote-screen',
  rejoinButton: '#rejoin-button',
  rejoinDiv: '#rejoin-div',
  rejoinLink: '#rejoin-link',
  roomLinkHref: '#room-link-href',
  roomSelectionDiv: '#room-selection',
  roomSelectionInput: '#room-id-input',
  roomSelectionInputLabel: '#room-id-input-label',
  roomSelectionJoinButton: '#join-button',
  roomSelectionRandomButton: '#random-button',
  roomSelectionRecentList: '#recent-rooms-list',
  sharingDiv: '#sharing-div',
  statusDiv: '#status-div',
  flipCamera: "#flip-camera",
  snapshot: "#capture",
  whiteboard: "#whiteboard",
  slider: "#slider",
  progress: "#progress",
  screenShareSvg: "#screen-sharing",
  screenShareDiv: "#screen-div",
  noVideo: "#no-video"
};

var Constants = {
  // Action type for remote web socket communication.
  WS_ACTION: 'ws',
  // Action type for remote xhr communication.
  XHR_ACTION: 'xhr',
  // Action type for adding a command to the remote clean up queue.
  QUEUEADD_ACTION: 'addToQueue',
  // Action type for clearing the remote clean up queue.
  QUEUECLEAR_ACTION: 'clearQueue',
  // Web socket action type specifying that an event occured.
  EVENT_ACTION: 'event',

  // Web socket action type to create a remote web socket.
  WS_CREATE_ACTION: 'create',
  // Web socket event type onerror.
  WS_EVENT_ONERROR: 'onerror',
  // Web socket event type onmessage.
  WS_EVENT_ONMESSAGE: 'onmessage',
  // Web socket event type onopen.
  WS_EVENT_ONOPEN: 'onopen',
  // Web socket event type onclose.
  WS_EVENT_ONCLOSE: 'onclose',
  // Web socket event sent when an error occurs while calling send.
  WS_EVENT_SENDERROR: 'onsenderror',
  // Web socket action type to send a message on the remote web socket.
  WS_SEND_ACTION: 'send',
  // Web socket action type to close the remote web socket.
  WS_CLOSE_ACTION: 'close'
};