import 'dart:convert';

import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

import '../config/constants.dart';

/// Top-level handler for background/terminated FCM messages.
/// Must be a top-level function (not a class method).
@pragma('vm:entry-point')
Future<void> firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  // Background messages are automatically displayed as notifications by the system.
  // This handler is for any additional processing needed.
  print('FCM background message received: ${message.messageId}');
}

class NotificationService {
  static final NotificationService _instance = NotificationService._internal();
  factory NotificationService() => _instance;
  NotificationService._internal();

  final FirebaseMessaging _messaging = FirebaseMessaging.instance;
  final FlutterLocalNotificationsPlugin _localNotifications =
      FlutterLocalNotificationsPlugin();

  bool _isInitialized = false;
  String? _currentToken;

  /// Initialize the notification service.
  /// Call this after Firebase.initializeApp() and after user login.
  Future<void> initialize() async {
    if (_isInitialized) return;

    // Request notification permissions
    final settings = await _messaging.requestPermission(
      alert: true,
      badge: true,
      sound: true,
      provisional: false,
    );

    if (settings.authorizationStatus == AuthorizationStatus.denied) {
      print('FCM: User denied notification permission');
      return;
    }

    print('FCM: Permission status: ${settings.authorizationStatus}');

    // Initialize local notifications for foreground display
    await _initLocalNotifications();

    // Get the FCM token and register it with the backend
    await _registerToken();

    // Listen for token refreshes
    _messaging.onTokenRefresh.listen((newToken) {
      print('FCM: Token refreshed');
      _registerTokenWithBackend(newToken);
    });

    // Handle foreground messages — show a local notification
    FirebaseMessaging.onMessage.listen(_handleForegroundMessage);

    // Handle notification taps when app is in background
    FirebaseMessaging.onMessageOpenedApp.listen(_handleNotificationTap);

    // Check if the app was opened from a terminated state via notification
    final initialMessage = await _messaging.getInitialMessage();
    if (initialMessage != null) {
      _handleNotificationTap(initialMessage);
    }

    _isInitialized = true;
    print('FCM: NotificationService initialized successfully');
  }

  /// Initialize flutter_local_notifications for foreground display.
  Future<void> _initLocalNotifications() async {
    const androidSettings = AndroidInitializationSettings('@mipmap/ic_launcher');

    const initSettings = InitializationSettings(
      android: androidSettings,
    );

    await _localNotifications.initialize(
      initSettings,
      onDidReceiveNotificationResponse: (details) {
        print('FCM: Local notification tapped: ${details.payload}');
      },
    );

    // Create a high-priority notification channel for Android
    const androidChannel = AndroidNotificationChannel(
      'nirikshan_alerts',
      'Nirikshan AI Alerts',
      description: 'Real-time intrusion and crowd detection alerts',
      importance: Importance.high,
      playSound: true,
      enableVibration: true,
    );

    await _localNotifications
        .resolvePlatformSpecificImplementation<
            AndroidFlutterLocalNotificationsPlugin>()
        ?.createNotificationChannel(androidChannel);
  }

  /// Get the FCM token and register with backend.
  Future<void> _registerToken() async {
    try {
      final token = await _messaging.getToken();
      if (token != null) {
        _currentToken = token;
        print('FCM: Device token obtained: ${token.substring(0, 20)}...');
        await _registerTokenWithBackend(token);
      } else {
        print('FCM: Failed to get device token');
      }
    } catch (e) {
      print('FCM: Error getting token: $e');
    }
  }

  /// Send the FCM token to the backend for push notification registration.
  Future<void> _registerTokenWithBackend(String fcmToken) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final authToken = prefs.getString(tokenKey);

      if (authToken == null || authToken.isEmpty) {
        print('FCM: No auth token available. Skipping backend registration.');
        return;
      }

      final response = await http
          .post(
            Uri.parse(registerNotificationEndpoint),
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer $authToken',
            },
            body: jsonEncode({'token': fcmToken}),
          )
          .timeout(requestTimeout);

      if (response.statusCode == 200) {
        print('FCM: Token registered with backend successfully');
      } else {
        print('FCM: Backend registration failed: ${response.statusCode} ${response.body}');
      }
    } catch (e) {
      print('FCM: Error registering token with backend: $e');
    }
  }

  /// Unregister the FCM token from the backend (call on logout).
  Future<void> unregister() async {
    if (_currentToken == null) return;

    try {
      final prefs = await SharedPreferences.getInstance();
      final authToken = prefs.getString(tokenKey);

      if (authToken == null) return;

      await http
          .post(
            Uri.parse(unregisterNotificationEndpoint),
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer $authToken',
            },
            body: jsonEncode({'token': _currentToken}),
          )
          .timeout(requestTimeout);

      print('FCM: Token unregistered from backend');
    } catch (e) {
      print('FCM: Error unregistering token: $e');
    }
  }

  /// Handle a foreground FCM message by showing a local notification.
  void _handleForegroundMessage(RemoteMessage message) {
    print('FCM: Foreground message received: ${message.messageId}');

    final notification = message.notification;
    if (notification == null) return;

    _localNotifications.show(
      notification.hashCode,
      notification.title ?? '🚨 Alert',
      notification.body ?? 'An incident has been detected.',
      const NotificationDetails(
        android: AndroidNotificationDetails(
          'nirikshan_alerts',
          'Nirikshan AI Alerts',
          channelDescription: 'Real-time intrusion and crowd detection alerts',
          importance: Importance.high,
          priority: Priority.high,
          icon: '@mipmap/ic_launcher',
          playSound: true,
          enableVibration: true,
        ),
      ),
      payload: jsonEncode(message.data),
    );
  }

  /// Handle notification tap (app opened from background/terminated).
  void _handleNotificationTap(RemoteMessage message) {
    print('FCM: Notification tapped: ${message.data}');
    // Future: navigate to incident details screen
  }
}
