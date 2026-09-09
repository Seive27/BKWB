/**
 * Save a Blob to disk.
 *
 * Browsers support the classic `<a download>` trick. Tauri's webview does not,
 * so in the desktop app we open a native Save dialog and write the bytes with
 * the fs plugin.
 */
export async function downloadFile(blob: Blob, filename: string): Promise<void> {
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

    if (!path) return; // user cancelled

    const bytes = new Uint8Array(await blob.arrayBuffer());
    await writeFile(path, bytes);
    return;
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
