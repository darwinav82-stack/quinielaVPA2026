export function showNotification(title, body) {

  if (Notification.permission === "granted") {

    new Notification(title, {
      body,
      icon: "/favicon.ico"
    });

  }

}