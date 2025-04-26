export const requestNotificationPermission = async () => {
  try {
    // Check if the browser supports notifications
    if (!("Notification" in window)) {
      console.log("This browser does not support notifications");
      return false;
    }

    // Check if permission is already granted
    if (Notification.permission === "granted") {
      return true;
    }

    // Request permission
    const permission = await Notification.requestPermission();
    console.log("Notification permission status:", permission);
    return permission === "granted";
  } catch (error) {
    console.error("Error requesting notification permission:", error);
    return false;
  }
};

export const sendNotification = (title, options = {}) => {
  try {
    if (!("Notification" in window)) {
      console.log("This browser does not support notifications");
      return;
    }

    if (Notification.permission === "granted") {
      // Set default options
      const defaultOptions = {
        icon: '/favicon.ico', // Make sure this path exists
        badge: '/favicon.ico', // Make sure this path exists
        silent: false
      };

      const notification = new Notification(title, { ...defaultOptions, ...options });

      // Handle notification clicks
      notification.onclick = function(event) {
        event.preventDefault();
        window.focus();
        notification.close();
      };

      return notification;
    } else {
      console.log("Notification permission not granted");
    }
  } catch (error) {
    console.error("Error sending notification:", error);
  }
};

export const checkTaskDeadlines = (tasks) => {
  const now = new Date();
  
  return tasks.map(task => {
    if (!task.dueDate || !task.dueTime) return { ...task, status: 'no-deadline' };
    
    const deadline = new Date(`${task.dueDate} ${task.dueTime}`);
    const timeDiff = deadline - now;
    const minutesLeft = Math.floor(timeDiff / (1000 * 60));
    
    let status;
    if (timeDiff < 0) {
      status = 'overdue';
    } else if (minutesLeft <= 30) {
      status = 'urgent';
    } else if (minutesLeft <= 60) {
      status = 'warning';
    } else {
      status = 'upcoming';
    }

    return {
      ...task,
      status,
      minutesLeft,
      deadline
    };
  });
};
