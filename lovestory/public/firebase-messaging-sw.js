importScripts('https://www.gstatic.com/firebasejs/10.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.0.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyAxAvXz8kjfPp7VJVvxmeoru7-elXig7RA",
  authDomain: "love-story-b712a.firebaseapp.com",
  projectId: "love-story-b712a",
  storageBucket: "love-story-b712a.appspot.com",
  messagingSenderId: "137733854230",
  appId: "1:137733854230:web:791143851a6a7179fd1137"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/favicon.ico', // You can replace with an actual logo png path
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
