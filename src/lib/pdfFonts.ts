import bricolageExtraBoldUrl from '@/assets/fonts/BricolageGrotesque-ExtraBold.ttf?url'
import interRegularUrl from '@/assets/fonts/Inter-Regular.ttf?url'
import interSemiBoldUrl from '@/assets/fonts/Inter-SemiBold.ttf?url'
import interBoldUrl from '@/assets/fonts/Inter-Bold.ttf?url'
import jetBrainsMonoMediumUrl from '@/assets/fonts/JetBrainsMono-Medium.ttf?url'
import jetBrainsMonoBoldUrl from '@/assets/fonts/JetBrainsMono-Bold.ttf?url'

/**
 * The PDF needs real, static-weight TTFs to embed — jsPDF has no concept of a
 * variable font's weight axis, so the on-screen @font-face files in index.css
 * can't be reused directly. These are single-instance exports of the exact
 * same type families (Bricolage Grotesque, Inter, JetBrains Mono), generated
 * once with fonttools and committed under src/assets/fonts.
 */
export interface PdfFontSet {
  bricolageExtraBold: string
  interRegular: string
  interSemiBold: string
  interBold: string
  jetBrainsMonoMedium: string
  jetBrainsMonoBold: string
}

async function toBase64(url: string): Promise<string> {
  const response = await fetch(url)
  const buffer = await response.arrayBuffer()
  let binary = ''
  for (const byte of new Uint8Array(buffer)) binary += String.fromCharCode(byte)
  return btoa(binary)
}

let cached: Promise<PdfFontSet> | null = null

/** Fetched once per session, then reused — repeat exports don't refetch. */
export function loadPdfFonts(): Promise<PdfFontSet> {
  if (!cached) {
    cached = Promise.all([
      toBase64(bricolageExtraBoldUrl),
      toBase64(interRegularUrl),
      toBase64(interSemiBoldUrl),
      toBase64(interBoldUrl),
      toBase64(jetBrainsMonoMediumUrl),
      toBase64(jetBrainsMonoBoldUrl),
    ]).then(([bricolageExtraBold, interRegular, interSemiBold, interBold, jetBrainsMonoMedium, jetBrainsMonoBold]) => ({
      bricolageExtraBold,
      interRegular,
      interSemiBold,
      interBold,
      jetBrainsMonoMedium,
      jetBrainsMonoBold,
    }))
  }
  return cached
}
