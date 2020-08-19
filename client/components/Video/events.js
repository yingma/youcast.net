
// create our angular app and inject ngAnimate and ui-router 
// =============================================================================
//var EventWhiteboard = angular.module('webrtc', [])
webrtc.factory('EventCall', function () {
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

        setupCall: function (call, flag) {
            this.subscribers.forEach(function (func) {
                func.call(null, call, flag);
            });
        }
    }
})
.factory('EventSnap', function() {
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

        setupImage: function (newimage, width, height) {
            this.subscribers.forEach(function (func) {
                func.call(null, newimage, width, height);
            });
        }
    }
})
.factory('EventScreen', function() {
    return {
        subscribers: [],
        stream: null,
        isSharing: false,

        setStream: function(s) {
            stream = s;
            this.subscribers.forEach(function (func) {
                func.call(null, s);
            });
        },

        getStream: function() {
            return stream;
        },

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
        }
    }
})
.factory('EventWhiteboard', function() {
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

        start: function () {
            this.subscribers.forEach(function (func) {
                func.call();
            });
        }
    }
});
