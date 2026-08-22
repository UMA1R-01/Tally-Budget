import { isTauri } from '@tauri-apps/api/core'

export interface FileTypeFilter {
  name: string
  extensions: string[]
}

/**
 * Hands a file to the user. Inside the Tauri shell this opens a native Save
 * As dialog and writes to wherever they choose; in a plain browser (e.g.
 * `npm run dev` outside the desktop shell) it falls back to a Blob download
 * link, which is the browser's own save-location prompt.
 *
 * Returns false if the user cancelled the dialog — callers use that to skip
 * the "saved" toast without treating a cancel as an error.
 */
export async function saveBlob(blob: Blob, filename: string, filters: FileTypeFilter[]): Promise<boolean> {
  if (isTauri()) {
    const [{ save }, { writeFile }] = await Promise.all([
      import('@tauri-apps/plugin-dialog'),
      import('@tauri-apps/plugin-fs'),
    ])
    const path = await save({ defaultPath: filename, filters })
    if (!path) return false
    await writeFile(path, new Uint8Array(await blob.arrayBuffer()))
    return true
  }

  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.rel = 'noopener'
  document.body.appendChild(link)
  link.click()
  link.remove()
  // Revoke on the next tick — Safari cancels an in-flight download otherwise.
  setTimeout(() => URL.revokeObjectURL(url), 1000)
  return true
}
