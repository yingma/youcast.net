'use strict';

/* eslint-env browser, serviceworker */


self.addEventListener('push', function(event) {
    console.log('Received a push message', event);

    var notificationTitle = 'Youcast reminder';

    var notificationOptions = {
        body: 'Your invitee is online now, please click on to enter the room',
        icon: '../images/badge.png',
        tag: 'renotify',
        renotify: true,
        requireInteraction: true,
        data: {
            url: '',
            comment: ''
        }
    };

    if (event.data && event.data.length > 0) {
        const data = event.data.json();
        //notificationTitle = data.title;
        notificationOptions.data.url = data.url;
        notificationOptions.data.comment = data.comment;
        notificationOptions.body = `A client @'${data.comment}'`;
    }

    event.waitUntil(
      Promise.all([
        self.registration.showNotification(
            notificationTitle, notificationOptions),
        ])
    );
});

self.addEventListener('notificationclick', function(event) {
    event.notification.close();

    const urlToOpen = new URL(event.notification.data.url, self.location.origin).href;

    const promiseChain = clients.matchAll({
        type: 'window',
        includeUncontrolled: true
    })
    .then((windowClients) => {
        let matchingClient = null;

        for (let i = 0; i < windowClients.length; i++) {
          const windowClient = windowClients[i];
          if (windowClient.url.indexOf(event.notification.data.comment) !== -1) {
            matchingClient = windowClient;
            break;
          }
        }

        if (matchingClient) {
          return matchingClient.focus();
        } else {
          return clients.openWindow(urlToOpen);
        }
    });

    event.waitUntil(promiseChain);

});

self.addEventListener('notificationclose', function(event) {
    event.waitUntil(
        Promise.all([
        ])
    );
});
