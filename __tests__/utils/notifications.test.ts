import {registerForPushNotificationsAsync} from '../../utils/notifications';

// jest.mock factories are hoisted - keep state inside the factory via a shared object
const platformState = {OS: 'ios'};

// Mock react-native Platform
jest.mock('react-native', () => ({
  Platform: platformState,
}));

// expo-device: add __esModule so _interopRequireWildcard returns the object as-is
// allowing isDevice mutations to be visible inside notifications.ts
const deviceMock = {__esModule: true as const, isDevice: true};
jest.mock('expo-device', () => deviceMock);

// Mock expo-notifications
jest.mock('expo-notifications', () => ({
  __esModule: true,
  setNotificationChannelAsync: jest.fn().mockResolvedValue(undefined),
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  getExpoPushTokenAsync: jest.fn(),
  AndroidImportance: {MAX: 5},
}));

// expo-constants: add __esModule so _interopRequireDefault returns the object as-is
// and the `default` property IS what notifications.ts gets as `Constants`
const constantsDefaultExport = {
  expoConfig: {extra: {eas: {projectId: 'test-project-id'}}} as any,
  easConfig: null as any,
};
jest.mock('expo-constants', () => ({
  __esModule: true,
  default: constantsDefaultExport,
}));

const Notifications = require('expo-notifications');

describe('registerForPushNotificationsAsync', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    deviceMock.isDevice = true;
    platformState.OS = 'ios';
    constantsDefaultExport.expoConfig = {extra: {eas: {projectId: 'test-project-id'}}};
    constantsDefaultExport.easConfig = null;
    // Restore default mock implementations after resetAllMocks
    Notifications.setNotificationChannelAsync.mockResolvedValue(undefined);
  });

  describe('Android channel setup', () => {
    it('sets up notification channel on Android', async () => {
      platformState.OS = 'android';
      Notifications.getPermissionsAsync.mockResolvedValue({status: 'granted'});
      Notifications.getExpoPushTokenAsync.mockResolvedValue({data: 'ExponentPushToken[test]'});

      await registerForPushNotificationsAsync();

      expect(Notifications.setNotificationChannelAsync).toHaveBeenCalledWith('default', expect.objectContaining({
        name: 'default',
        importance: 5,
      }));
    });

    it('does NOT set up notification channel on iOS', async () => {
      platformState.OS = 'ios';
      Notifications.getPermissionsAsync.mockResolvedValue({status: 'granted'});
      Notifications.getExpoPushTokenAsync.mockResolvedValue({data: 'ExponentPushToken[ios-test]'});

      await registerForPushNotificationsAsync();

      expect(Notifications.setNotificationChannelAsync).not.toHaveBeenCalled();
    });
  });

  describe('permission handling', () => {
    it('returns a token when permission is already granted', async () => {
      Notifications.getPermissionsAsync.mockResolvedValue({status: 'granted'});
      Notifications.getExpoPushTokenAsync.mockResolvedValue({data: 'ExponentPushToken[already-granted]'});

      const token = await registerForPushNotificationsAsync();
      expect(token).toBe('ExponentPushToken[already-granted]');
      expect(Notifications.requestPermissionsAsync).not.toHaveBeenCalled();
    });

    it('requests permission when not already granted, returns token if granted', async () => {
      Notifications.getPermissionsAsync.mockResolvedValue({status: 'undetermined'});
      Notifications.requestPermissionsAsync.mockResolvedValue({status: 'granted'});
      Notifications.getExpoPushTokenAsync.mockResolvedValue({data: 'ExponentPushToken[newly-granted]'});

      const token = await registerForPushNotificationsAsync();
      expect(Notifications.requestPermissionsAsync).toHaveBeenCalled();
      expect(token).toBe('ExponentPushToken[newly-granted]');
    });

    it('returns undefined and does not fetch token when permission denied after request', async () => {
      Notifications.getPermissionsAsync.mockResolvedValue({status: 'undetermined'});
      Notifications.requestPermissionsAsync.mockResolvedValue({status: 'denied'});

      const token = await registerForPushNotificationsAsync();
      expect(token).toBeUndefined();
      expect(Notifications.getExpoPushTokenAsync).not.toHaveBeenCalled();
    });

    it('returns undefined when existing status is denied', async () => {
      Notifications.getPermissionsAsync.mockResolvedValue({status: 'denied'});
      Notifications.requestPermissionsAsync.mockResolvedValue({status: 'denied'});

      const token = await registerForPushNotificationsAsync();
      expect(token).toBeUndefined();
      expect(Notifications.getExpoPushTokenAsync).not.toHaveBeenCalled();
    });
  });

  describe('project ID resolution', () => {
    beforeEach(() => {
      Notifications.getPermissionsAsync.mockResolvedValue({status: 'granted'});
      Notifications.getExpoPushTokenAsync.mockResolvedValue({data: 'ExponentPushToken[proj]'});
    });

    it('uses expoConfig.extra.eas.projectId when available', async () => {
      constantsDefaultExport.expoConfig = {extra: {eas: {projectId: 'eas-project-123'}}};
      constantsDefaultExport.easConfig = null;

      await registerForPushNotificationsAsync();

      expect(Notifications.getExpoPushTokenAsync).toHaveBeenCalledWith({projectId: 'eas-project-123'});
    });

    it('falls back to easConfig.projectId when expoConfig.extra.eas.projectId is absent', async () => {
      constantsDefaultExport.expoConfig = null;
      constantsDefaultExport.easConfig = {projectId: 'fallback-project-456'};

      await registerForPushNotificationsAsync();

      expect(Notifications.getExpoPushTokenAsync).toHaveBeenCalledWith({projectId: 'fallback-project-456'});
    });
  });

  describe('non-physical device', () => {
    it('returns undefined on a simulator/emulator', async () => {
      deviceMock.isDevice = false;

      const token = await registerForPushNotificationsAsync();
      expect(token).toBeUndefined();
      expect(Notifications.getPermissionsAsync).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('returns undefined when getExpoPushTokenAsync throws', async () => {
      Notifications.getPermissionsAsync.mockResolvedValue({status: 'granted'});
      Notifications.getExpoPushTokenAsync.mockRejectedValue(new Error('token fetch failed'));

      const token = await registerForPushNotificationsAsync();
      expect(token).toBeUndefined();
    });
  });
});
