import type { Alert } from 'react-native';
export const appAlert: typeof Alert.alert = (title, message, buttons) => {
  const action = buttons?.find((button) => button.style !== 'cancel');
  if (buttons && buttons.length > 1) {
    if (window.confirm(`${title}\n\n${message ?? ''}`)) action?.onPress?.();
  } else {
    window.alert(`${title}\n\n${message ?? ''}`);
    action?.onPress?.();
  }
};
