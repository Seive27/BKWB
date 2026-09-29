/**
 * Save a Blob to disk.
 *
 * In the Tauri desktop app a native Save dialog asks where to put the file.
 * In a regular browser we fall back to the classic `<a download>` trick.
 *
 * Returns the chosen path (or the filename in browser mode), or `null` when
 * the user cancels the Save dialog.
 */

export type DownloadResult = { path: string; filename: string } | null;

type SavedHandler = (result: { path: string; filename: string }) => void;

let savedHandler: SavedHandler | null = null;

/** ToastProvider registers here so every successful save shows a toast. */
export function setDownloadSavedHandler(handler: SavedHandler | null): void {
  savedHandler = handler;
}

function notifySaved(path: string, filename: string): DownloadResult {
  const result = { path, filename };
  savedHandler?.(result);
  return result;
}

export async function downloadFile(blob: Blob, filename: string): Promise<DownloadResult> {
  const isTauri =
    typeof window !== 'undefined' &&
    ('__TAURI_INTERNALS__' in window || '__TAURI__' in window);

  if (isTauri) {
    const { save } = await import('@tauri-apps/plugin-dialog');
    const { writeFile } = await import('@tauri-apps/plugin-fs');

    const extension = filename.includes('.') ? filename.split('.').pop()! : undefined;
    const path = await save({
      defaultPath: filename,
      filters: extension
        ? [{ name: extension.toUpperCase(), extensions: [extension] }]
        : undefined,
    });

    if (!path) return null; // user cancelled

    const bytes = new Uint8Array(await blob.arrayBuffer());
    await writeFile(path, bytes);
    return notifySaved(path, filename);
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  return notifySaved(filename, filename);
}
