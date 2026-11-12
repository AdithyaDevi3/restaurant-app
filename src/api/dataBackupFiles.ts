import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { BackupPayload, parseBackupJson } from '../algorithm/DataBackup';

const MAX_BACKUP_BYTES = 5 * 1024 * 1024;

export async function shareBackupFile(backup: BackupPayload): Promise<void> {
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('File sharing is not available on this device.');
  }

  const date = backup.exportedAt.slice(0, 10) || 'backup';
  const file = new File(Paths.cache, `restaurantfinder-${date}.json`);
  if (file.exists) file.delete();

  try {
    file.create();
    file.write(JSON.stringify(backup, null, 2));
    await Sharing.shareAsync(file.uri, {
      dialogTitle: 'Export RestaurantFinder backup',
      mimeType: 'application/json',
    });
  } finally {
    if (file.exists) file.delete();
  }
}

export async function pickBackupFile(): Promise<BackupPayload | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: 'application/json',
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (result.canceled) return null;

  const asset = result.assets[0];
  if (asset.size !== undefined && asset.size > MAX_BACKUP_BYTES) {
    throw new Error('The selected backup is larger than 5 MB.');
  }

  const file = new File(asset.uri);
  if (file.size > MAX_BACKUP_BYTES) {
    throw new Error('The selected backup is larger than 5 MB.');
  }
  return parseBackupJson(await file.text());
}
