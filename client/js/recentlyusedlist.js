'use strict';

 function RecentlyUsedList(key) {
            // This is the length of the most recently used list.
    this.LISTLENGTH_ = 10;

    this.RECENTROOMSKEY_ = key || 'recentRooms';
    this.storage_ = new Storage();
};

RecentlyUsedList.prototype.pushRecentRoom = function (roomId) {
  // Push recent room to top of recent list, keep max of this.LISTLENGTH_
  // entries.
    return new Promise(function(resolve, reject) {
        if (!roomId) {
            resolve();
            return;
        }
    
        this.getRecentRooms().then(function(recentRooms) {
            recentRooms = [roomId].concat(recentRooms);
            // Remove any duplicates from the list, leaving the first occurance.
            recentRooms = recentRooms.filter(function(value, index, self) {
                return self.indexOf(value) === index;
            });
            recentRooms = recentRooms.slice(0, this.LISTLENGTH_);
            this.storage_.setStorage(this.RECENTROOMSKEY_,
            JSON.stringify(recentRooms), function() {
                resolve();
            });
        }.bind(this)).catch(function(err) {
            reject(err);
        }.bind(this));
    }.bind(this));
};

// Get the list of recently used rooms from local storage.
RecentlyUsedList.prototype.getRecentRooms = function () {
    return new Promise(function(resolve) {
        this.storage_.getStorage(this.RECENTROOMSKEY_, function(value) {
            var recentRooms = parseJSON(value);
            if (!recentRooms) {
                recentRooms = [];
            }
            resolve(recentRooms);
        });
    }.bind(this));
};
