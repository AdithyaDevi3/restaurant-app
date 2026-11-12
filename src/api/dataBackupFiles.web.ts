import * as DocumentPicker from 'expo-document-picker';
import { BackupPayload, parseBackupJson } from '../algorithm/DataBackup';

export async function shareBackupFile(backup: BackupPayload): Promise<void> {
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `restaurantfinder-${backup.exportedAt.slice(0, 10)}.json`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function pickBackupFile(): Promise<BackupPayload | null> {
  const result = await DocumentPicker.getDocumentAsync({ type: 'application/json', multiple: false });
  if (result.canceled) return null;
  const asset = result.assets[0];
  if (!asset.file || asset.file.size > 5 * 1024 * 1024) throw new Error('Choose a JSON backup smaller than 5 MB.');
  try { return parseBackupJson(await asset.file.text()); }
  finally { URL.revokeObjectURL(asset.uri); }
}
