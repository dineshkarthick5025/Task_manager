import { getMessaging, getToken, onMessage } from "firebase/messaging";
import { app } from "../firebase";

// Your web app's Firebase configuration
const vapidKey = "BAaHKVlaKQWF4szJmYrl8fNfLjpSXvOQ1pr2stZK08EW24a-DDivtclFaUSAef0o_vjZ5yG2_Tp6nBWA62-Ap5Y"; // Get this from Firebase Console

export const requestNotificationPermission = async () => {
  try {
    // Check if the browser supports notifications
    if (!("Notification" in window)) {
      console.log("This browser does not support notifications");
      return false;
    }

    // Check if permission is already granted
    if (Notification.permission === "granted") {
      await registerServiceWorker();
      return true;
    }

    // Request permission
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      await registerServiceWorker();
    }
    console.log("Notification permission status:", permission);
    return permission === "granted";
  } catch (error) {
    console.error("Error requesting notification permission:", error);
    return false;
  }
};

// Register service worker for push notifications
async function registerServiceWorker() {
  try {
    const messaging = getMessaging(app);
    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
    const currentToken = await getToken(messaging, {
      vapidKey,
      serviceWorkerRegistration: registration
    });

    if (currentToken) {
      console.log('FCM Token:', currentToken);
      return currentToken;
    } else {
      console.log('No registration token available');
    }
  } catch (error) {
    console.error('Error registering service worker:', error);
  }
}

// Speech synthesis configuration
const speechConfig = {
  lang: 'en-US',
  pitch: 1,
  rate: 1,
  volume: 0.8
};

// Text to speech function
const speakNotification = (text) => {
  return new Promise((resolve, reject) => {
    if (!('speechSynthesis' in window)) {
      console.log('Text-to-speech not supported');
      reject('Text-to-speech not supported');
      return;
    }

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    Object.assign(utterance, speechConfig);

    // Get available voices
    const voices = window.speechSynthesis.getVoices();
    // Try to find a female English voice
    const preferredVoice = voices.find(voice => 
      voice.lang.includes('en') && voice.name.includes('Female')
    ) || voices[0];
    
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    utterance.onend = () => resolve();
    utterance.onerror = (error) => reject(error);

    window.speechSynthesis.speak(utterance);
  });
};

export const sendNotification = async (title, options = {}) => {
  try {
    if (!("Notification" in window)) {
      console.log("This browser does not support notifications");
      return;
    }

    if (Notification.permission === "granted") {
      // Set default options with sound
      const defaultOptions = {
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        silent: false,
        sound: '/notification-sound.mp3',
        vibrate: [200, 100, 200],
        requireInteraction: true,
        tag: options.tag || 'default',
        renotify: true,
      };

      const notification = new Notification(title, { ...defaultOptions, ...options });

      // Play notification sound first
      if (!defaultOptions.silent) {
        const audio = new Audio(defaultOptions.sound);
        await audio.play();
        
        // Wait for sound to finish
        await new Promise(resolve => {
          audio.onended = resolve;
        });
      }

      // Then speak the notification
      const textToSpeak = `${title}. ${options.body || ''}`;
      await speakNotification(textToSpeak);

      // Handle notification clicks
      notification.onclick = function(event) {
        event.preventDefault();
        window.focus();
        notification.close();
        if (options.onClick) {
          options.onClick();
        }
      };

      return notification;
    } else {
      console.log("Notification permission not granted");
    }
  } catch (error) {
    console.error("Error sending notification:", error);
  }
};

// Add voice settings to notification settings
export const getVoiceSettings = () => {
  return {
    enabled: localStorage.getItem('voiceNotifications') !== 'false',
    volume: parseFloat(localStorage.getItem('voiceVolume')) || 0.8,
    rate: parseFloat(localStorage.getItem('voiceRate')) || 1,
    pitch: parseFloat(localStorage.getItem('voicePitch')) || 1,
    voice: localStorage.getItem('preferredVoice') || ''
  };
};

export const updateVoiceSettings = (settings) => {
  Object.assign(speechConfig, settings);
  localStorage.setItem('voiceNotifications', settings.enabled);
  localStorage.setItem('voiceVolume', settings.volume);
  localStorage.setItem('voiceRate', settings.rate);
  localStorage.setItem('voicePitch', settings.pitch);
  if (settings.voice) {
    localStorage.setItem('preferredVoice', settings.voice);
  }
};

// Handle incoming FCM messages
export const setupFCMListener = () => {
  const messaging = getMessaging(app);
  onMessage(messaging, (payload) => {
    console.log('Message received:', payload);
    sendNotification(payload.notification.title, {
      body: payload.notification.body,
      icon: payload.notification.icon,
      tag: payload.data?.tag,
      onClick: () => {
        if (payload.data?.url) {
          window.open(payload.data.url, '_blank');
        }
      }
    });
  });
};

export const checkTaskDeadlines = (tasks) => {
  const now = new Date();
  
  return tasks.map(task => {
    if (!task.dueDate || !task.dueTime) return { ...task, status: 'no-deadline' };
    
    const deadline = new Date(`${task.dueDate} ${task.dueTime}`);
    const timeDiff = deadline - now;
    const minutesLeft = Math.floor(timeDiff / (1000 * 60));
    
    let status;
    let voiceMessage = '';

    if (timeDiff < 0) {
      status = 'overdue';
      voiceMessage = `Task overdue: ${task.task}`;
    } else if (minutesLeft <= 30) {
      status = 'urgent';
      voiceMessage = `Urgent: ${task.task} is due in ${minutesLeft} minutes`;
    } else if (minutesLeft <= 60) {
      status = 'warning';
      voiceMessage = `Warning: ${task.task} is due in ${Math.ceil(minutesLeft/60)} hour`;
    } else {
      status = 'upcoming';
      voiceMessage = `Upcoming task: ${task.task}`;
    }

    return {
      ...task,
      status,
      minutesLeft,
      deadline,
      voiceMessage
    };
  });
};


