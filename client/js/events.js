'use strict';

var event = angular.module('webrtc.event', []);
// create our angular app and inject ngAnimate and ui-router 
// =============================================================================
//var EventWhiteboard = angular.module('webrtc', [])
// event.factory('EventCall', function () {
//     return {
//         subscribers: [],

//         subscribe: function (func) {
//             var found;
//             for (var i = this.subscribers.length - 1; i >= 0; i--) {
//                 if (this.subscribers[i] === func)
//                     found = true;
//             }
//             if (!found)
//                 this.subscribers.push(func);
//         },

//         unsubscribe: function (func) {
//             for (var i = this.subscribers.length - 1; i >= 0; i--) {
//                 if (this.subscribers[i] === func)
//                     this.subscribers.splice(i, 1);
//             }
//         },

//         removeAll: function () {
//             this.subscribers = [];
//         },

//         setupCall: function (newcall) {
//             this.subscribers.forEach(function (func) {
//                 func.call(null, newcall);
//             });
//         }
//     }
// })
// .factory('EventSnap', function() {
//     return {
//         subscribers: [],

//         subscribe: function (func) {
//             var found;
//             for (var i = this.subscribers.length - 1; i >= 0; i--) {
//                 if (this.subscribers[i] === func)
//                     found = true;
//             }
//             if (!found)
//                 this.subscribers.push(func);
//         },

//         unsubscribe: function (func) {
//             for (var i = this.subscribers.length - 1; i >= 0; i--) {
//                 if (this.subscribers[i] === func)
//                     this.subscribers.splice(i, 1);
//             }
//         },

//         removeAll: function () {
//             this.subscribers = [];
//         },

//         setupImage: function (newimage, width, height) {
//             this.subscribers.forEach(function (func) {
//                 func.call(null, newimage, width, height);
//             });
//         }
//     }
// })
event.factory('EventUpload', function() {
    return {
        subscribers: [],

        subscribe: function (func) {
            var found;
            for (var i = this.subscribers.length - 1; i >= 0; i--) {
                if (this.subscribers[i] === func)
                    found = true;
            }
            if (!found)
                this.subscribers.push(func);
        },

        unsubscribe: function (func) {
            for (var i = this.subscribers.length - 1; i >= 0; i--) {
                if (this.subscribers[i] === func)
                    this.subscribers.splice(i, 1);
            }
        },

        removeAll: function () {
            this.subscribers = [];
        },

        uploadImage: function (key, newimage) {
            this.subscribers.forEach(function (func) {
                func.call(null, key, newimage);
            });
        }
        //,
        // removeImage: function (key) {
        //     this.subscribers.forEach(function (func) {
        //         func.call(null, key, null);
        //     });
        // }
    }
});
