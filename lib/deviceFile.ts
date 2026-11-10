import * as FileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

export async function shareBase64File(input: {
  filename: string;
  base64: string;
  mimeType: string;
  uti: string;
  dialogTitle: string;
}): Promise<boolean> {
  if (!input.base64) return false;
  const dir = FileSystem.cacheDirectory;
  if (!dir) return false;
  const uri = `${dir}${input.filename}`;
  await FileSystem.writeAsStringAsync(uri, input.base64, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const info = await FileSystem.getInfoAsync(uri);
  if (!info.exists || info.size === 0) return false;
  if (!(await Sharing.isAvailableAsync())) return false;
  await Sharing.shareAsync(uri, {
    mimeType: input.mimeType,
    UTI: input.uti,
    dialogTitle: input.dialogTitle,
  });
  return true;
}

export async function sharePosterPdf(html: string, filename: string): Promise<boolean> {
  const file = await Print.printToFileAsync({ html, base64: true });
  if (file.base64) {
    return shareBase64File({
      filename,
      base64: file.base64,
      mimeType: 'application/pdf',
      uti: 'com.adobe.pdf',
      dialogTitle: 'Print poster',
    });
  }
  if (!file.uri) return false;
  const info = await FileSystem.getInfoAsync(file.uri);
  if (!info.exists || info.size === 0) return false;
  if (!(await Sharing.isAvailableAsync())) return false;
  await Sharing.shareAsync(file.uri, {
    mimeType: 'application/pdf',
    UTI: 'com.adobe.pdf',
    dialogTitle: 'Print poster',
  });
  return true;
}
