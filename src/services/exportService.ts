import { jsPDF } from 'jspdf'
import type { DayGroup, Transaction } from '@/types'
import type { Currency } from '@/lib/currency'
import { calculateTotals, getDateRange, groupByDay } from '@/lib/ledger'
import { formatAmount, formatMoney } from '@/lib/money'
import { formatDateShort, formatDayHeading, formatRange, todayISO } from '@/lib/date'
import { loadPdfFonts, type PdfFontSet } from '@/lib/pdfFonts'
import { saveBlob } from '@/lib/download'

/**
 * PDF export — real jsPDF vector drawing, not a rasterized screenshot. Every
 * rule/figure/pill is drawn with the PDF's own text and shape primitives, so
 * the output has genuine selectable/searchable text and stays crisp at any
 * zoom, instead of embedding a photograph of the page. The layout mirrors the
 * on-screen statement (StatementHero + LedgerTable) but is a second,
 * hand-drawn implementation in point-coordinates — see design-directions
 * history for why that trade-off was chosen over html2canvas rasterization.
 */

/* ── palette (identical hex values to src/index.css) ── */
const INK: [number, number, number] = [11, 11, 12]
const INK_MUTED: [number, number, number] = [140, 136, 128]
const PAPER: [number, number, number] = [245, 242, 234]
const PAPER_LINE: [number, number, number] = [226, 220, 206]
const VOLT: [number, number, number] = [214, 255, 62]
const FLARE: [number, number, number] = [255, 74, 40]
const FLARE_SOFT: [number, number, number] = [255, 225, 217]
const MOSS: [number, number, number] = [27, 122, 75]
const WHITE: [number, number, number] = [255, 255, 255]

/* ── page geometry (pt, real A4 = 595.28 x 841.89) ── */
const PAGE_W = 595.28
const PAGE_H = 841.89
const MARGIN = 42
const CONTENT_W = PAGE_W - MARGIN * 2
const BAND_H = 68
const PERF_Y = BAND_H
const PERF_R = 3.1
const PERF_GAP = 15.5
const FOOT_H = 42

function setColor(doc: jsPDF, fn: 'setTextColor' | 'setFillColor' | 'setDrawColor', rgb: [number, number, number]) {
  doc[fn](rgb[0], rgb[1], rgb[2])
}

/**
 * jsPDF's text() never wraps or clips on its own — unlike the on-screen
 * `truncate` CSS the app uses for the same fields, a long date range or
 * description would just run past its column and off the page. Mirrors that
 * same "shrink to fit, add an ellipsis" behavior using the current font.
 */
function truncateToWidth(doc: jsPDF, text: string, maxWidth: number): string {
  if (doc.getTextWidth(text) <= maxWidth) return text
  const ellipsis = '…'
  if (doc.getTextWidth(ellipsis) > maxWidth) return ellipsis
  let lo = 0
  let hi = text.length
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2)
    const candidate = text.slice(0, mid).trimEnd() + ellipsis
    if (doc.getTextWidth(candidate) <= maxWidth) lo = mid
    else hi = mid - 1
  }
  return lo === 0 ? ellipsis : text.slice(0, lo).trimEnd() + ellipsis
}

function makeDoc(fonts: PdfFontSet): jsPDF {
  const doc = new jsPDF({ unit: 'pt', format: 'a4', compress: true })
  doc.addFileToVFS('BricolageGrotesque-ExtraBold.ttf', fonts.bricolageExtraBold)
  doc.addFont('BricolageGrotesque-ExtraBold.ttf', 'Bricolage', 'bold')
  doc.addFileToVFS('Inter-Regular.ttf', fonts.interRegular)
  doc.addFont('Inter-Regular.ttf', 'Inter', 'normal')
  doc.addFileToVFS('Inter-SemiBold.ttf', fonts.interSemiBold)
  doc.addFont('Inter-SemiBold.ttf', 'Inter', 'semibold')
  doc.addFileToVFS('Inter-Bold.ttf', fonts.interBold)
  doc.addFont('Inter-Bold.ttf', 'Inter', 'bold')
  doc.addFileToVFS('JetBrainsMono-Medium.ttf', fonts.jetBrainsMonoMedium)
  doc.addFont('JetBrainsMono-Medium.ttf', 'JetBrainsMono', 'normal')
  doc.addFileToVFS('JetBrainsMono-Bold.ttf', fonts.jetBrainsMonoBold)
  doc.addFont('JetBrainsMono-Bold.ttf', 'JetBrainsMono', 'bold')
  return doc
}

/* Small caps aren't a real font feature here, so labels are typed upper-case
   already (matches the app's `.lbl` utility, which does the same via CSS). */
function label(doc: jsPDF, str: string, x: number, y: number, opts: { align?: 'left' | 'right'; color?: [number, number, number] } = {}) {
  doc.setFont('Inter', 'bold')
  doc.setFontSize(7.6)
  doc.setCharSpace(0.6)
  setColor(doc, 'setTextColor', opts.color ?? INK_MUTED)
  doc.text(str.toUpperCase(), x, y, { align: opts.align ?? 'left' })
  doc.setCharSpace(0)
}

function drawPerforation(doc: jsPDF) {
  setColor(doc, 'setFillColor', PAPER)
  doc.rect(0, PERF_Y, PAGE_W, 9, 'F')
  setColor(doc, 'setFillColor', INK)
  let x = PERF_GAP / 2
  while (x < PAGE_W) {
    doc.circle(x, PERF_Y, PERF_R, 'F')
    x += PERF_GAP
  }
}

// Same masthead on every page — no lighter "continued" variant. One header
// style, full black band + perforation, page 1 through the last page.
function drawMasthead(doc: jsPDF) {
  setColor(doc, 'setFillColor', INK)
  doc.rect(0, 0, PAGE_W, BAND_H, 'F')

  doc.setFont('Bricolage', 'bold')
  doc.setFontSize(27)
  setColor(doc, 'setTextColor', WHITE)
  doc.text('REPORT', MARGIN, 47)
  const w = doc.getTextWidth('REPORT')
  setColor(doc, 'setTextColor', VOLT)
  doc.text('.', MARGIN + w, 47)

  drawPerforation(doc)
}

// A paper-tinted plate under the footer, not just a hairline on white — it
// gives every page a soft "landing" before its bottom edge, so a continuous
// scroll into the next page's solid-ink masthead reads as a seam rather than
// a hard white-to-black slam.
function drawFooter(doc: jsPDF, pageNum: number, totalPages: number, generatedOn: string) {
  const y = PAGE_H - FOOT_H
  setColor(doc, 'setFillColor', PAPER)
  doc.rect(0, y, PAGE_W, FOOT_H, 'F')

  doc.setLineWidth(0.6)
  setColor(doc, 'setDrawColor', PAPER_LINE)
  doc.line(MARGIN, y, PAGE_W - MARGIN, y)

  doc.setFont('Inter', 'semibold')
  doc.setFontSize(7.6)
  doc.setCharSpace(0.5)
  setColor(doc, 'setTextColor', INK_MUTED)
  doc.text(`GENERATED ${generatedOn.toUpperCase()}`, MARGIN, y + 20)
  doc.text(`PAGE ${pageNum} OF ${totalPages}`, PAGE_W - MARGIN, y + 20, { align: 'right' })
  doc.setCharSpace(0)
}

function drawHero(
  doc: jsPDF,
  top: number,
  net: number,
  income: number,
  expense: number,
  count: number,
  period: string,
  symbol: string,
): number {
  const negative = net < 0
  let y = top

  label(doc, 'Net position', MARGIN, y)
  y += 44

  const display = formatMoney(net, symbol)
  doc.setFont('Bricolage', 'bold')
  doc.setFontSize(44)
  const textW = doc.getTextWidth(display)

  // Sweep behind the figure — volt only. A negative net position is plain
  // flare-colored text, no highlight bar underneath.
  if (!negative) {
    setColor(doc, 'setFillColor', VOLT)
    doc.rect(MARGIN - 3, y - 14.5, textW + 7, 17, 'F')
  }

  setColor(doc, 'setTextColor', negative ? FLARE : INK)
  doc.text(display, MARGIN, y)
  y += 29

  // divider-rule cells: Revenue / Expenses / Period
  doc.setLineWidth(1.4)
  setColor(doc, 'setDrawColor', INK)
  doc.line(MARGIN, y, PAGE_W - MARGIN, y)
  y += 18

  const cols: { lbl: string; val: string; color: [number, number, number] }[] = [
    { lbl: 'Revenue', val: `+${formatAmount(income)}`, color: MOSS },
    { lbl: 'Expenses', val: `−${formatAmount(expense)}`, color: FLARE },
    { lbl: `Period · ${count} ${count === 1 ? 'entry' : 'entries'}`, val: period, color: INK },
  ]

  // Columns are sized to what each cell actually needs, not a fixed guess —
  // a static split always loses on *some* input: equal thirds truncates a
  // long date, giving Period more up front truncates a seven-figure total.
  // Measuring first means a short Period and huge totals both just work,
  // and a long Period only eats into Revenue/Expenses' slack, never their
  // minimum. truncateToWidth stays as the last-resort safety net.
  const colGap = 14
  doc.setFont('Inter', 'bold')
  doc.setFontSize(7.6)
  doc.setCharSpace(0.6)
  const labelWidths = cols.map((c) => doc.getTextWidth(c.lbl.toUpperCase()))
  doc.setCharSpace(0)
  doc.setFont('Bricolage', 'bold')
  doc.setFontSize(17.5)
  const naturalWidths = cols.map((c, i) => Math.max(labelWidths[i]!, doc.getTextWidth(c.val)))

  const totalNatural = naturalWidths.reduce((a, b) => a + b, 0)
  const available = CONTENT_W - colGap * (cols.length - 1)
  // Enough room for everyone's natural size: hand out the leftover space in
  // proportion to each column's own width, so a longer value gets more
  // breathing room instead of an arbitrary even split. Not enough room even
  // at natural size (a truly extreme case): shrink every column
  // proportionally to its share of the need — truncateToWidth below still
  // catches whatever's left over.
  const colWidths = naturalWidths.map((w) => (available / totalNatural) * w)

  const colLefts: number[] = []
  let cursor = MARGIN
  for (const w of colWidths) {
    colLefts.push(cursor)
    cursor += w + colGap
  }

  cols.forEach((c, i) => {
    const cx = colLefts[i]!
    if (i > 0) {
      setColor(doc, 'setDrawColor', PAPER_LINE)
      doc.setLineWidth(0.7)
      doc.line(cx - colGap / 2, y - 16, cx - colGap / 2, y + 16)
    }
    label(doc, c.lbl, cx, y)
    doc.setFont('Bricolage', 'bold')
    doc.setFontSize(17.5)
    setColor(doc, 'setTextColor', c.color)
    doc.text(truncateToWidth(doc, c.val, colWidths[i]!), cx, y + 20)
  })
  y += 38
  return y
}

// drawHero's layout is fixed-height regardless of content, so the bottom y
// it will produce is knowable before the real draw call — needed up front to
// size page 1's row budget. Kept as one function so the two never drift.
function drawHeroMeasureOnly(top: number): number {
  // label(44) + figure/divider(29) + cells row(38) — matches drawHero exactly.
  return top + 44 + 29 + 38
}

// Centers on real metrics rather than eyeballed offsets: the pill's vertical
// midpoint is derived from the row's baseline, then the label's own baseline
// is placed half a cap-height above that midpoint (labels are all-caps, so
// there are no descenders to budget for) — equal optical padding above and
// below the glyphs, and equal padX on both sides since width = textW + 2*padX.
function drawPill(doc: jsPDF, isIncome: boolean, x: number, rowBaselineY: number) {
  const txt = (isIncome ? 'Income' : 'Expense').toUpperCase()
  const fontSize = 7.4
  const capHeight = fontSize * 0.73 // Inter's cap-height ratio

  doc.setFont('Inter', 'bold')
  doc.setFontSize(fontSize)
  doc.setCharSpace(0.5)
  const textW = doc.getTextWidth(txt)

  const padX = 7.2
  const w = textW + padX * 2
  const h = 16
  const pillCenterY = rowBaselineY - 3.4 // aligns the pill to the row text's own optical center
  const yTop = pillCenterY - h / 2
  const textBaseline = pillCenterY + capHeight / 2

  setColor(doc, 'setFillColor', isIncome ? VOLT : FLARE_SOFT)
  doc.roundedRect(x, yTop, w, h, 3, 3, 'F')

  setColor(doc, 'setTextColor', isIncome ? INK : FLARE)
  doc.text(txt, x + padX, textBaseline)
  doc.setCharSpace(0)
}

// Mirrors LedgerTable.tsx's day heading row: bold date label — a thin
// connecting rule filling the gap — the day's net, right-aligned.
function drawDayHeading(doc: jsPDF, group: DayGroup, blockTop: number) {
  const baseline = blockTop + DAY_GAP_BEFORE + 10
  const dayLabel = formatDayHeading(group.date).toUpperCase()

  doc.setFont('Bricolage', 'bold')
  doc.setFontSize(12.5)
  doc.setCharSpace(0.4)
  setColor(doc, 'setTextColor', INK)
  doc.text(dayLabel, MARGIN, baseline)
  const labelW = doc.getTextWidth(dayLabel)
  doc.setCharSpace(0)

  // Same typography as the date label — font, weight, size, letter-spacing —
  // so the two read as one heading; only the moss/flare color differs.
  doc.setFont('Bricolage', 'bold')
  doc.setFontSize(12.5)
  doc.setCharSpace(0.4)
  setColor(doc, 'setTextColor', group.net < 0 ? FLARE : MOSS)
  const sign = group.net < 0 ? '−' : '+'
  const amtText = `${sign}${formatAmount(Math.abs(group.net))}`
  doc.text(amtText, PAGE_W - MARGIN, baseline, { align: 'right' })
  const amtW = doc.getTextWidth(amtText)
  doc.setCharSpace(0)

  const lineStart = MARGIN + labelW + 12
  const lineEnd = PAGE_W - MARGIN - amtW - 12
  if (lineEnd > lineStart) {
    doc.setLineWidth(0.75)
    setColor(doc, 'setDrawColor', PAPER_LINE)
    doc.line(lineStart, baseline - 3.8, lineEnd, baseline - 3.8)
  }
}

const DESC_LINE_H = 14 // wrapped-description line spacing at 10.5pt Inter

/**
 * Wraps rather than cuts — a long description gets as many lines as it
 * needs instead of an ellipsis. One shared measurement used by both the
 * pagination pass and the real draw, so a row's reserved height can never
 * drift from what it actually renders at.
 */
function measureRow(doc: jsPDF, transaction: Transaction) {
  const isIncome = transaction.type === 'income'
  const sign = isIncome ? '+' : '−'

  doc.setFont('JetBrainsMono', 'normal')
  doc.setFontSize(9.8)
  const amountText = `${sign}${formatAmount(transaction.amount)}`
  const amountW = doc.getTextWidth(amountText)

  doc.setFont('Inter', 'normal')
  doc.setFontSize(10.5)
  const descX = MARGIN + 64
  const descMaxWidth = PAGE_W - MARGIN - amountW - 16 - descX
  const lines = doc.splitTextToSize(transaction.description || 'Untitled entry', descMaxWidth) as string[]
  const height = ROW_H + (lines.length - 1) * DESC_LINE_H

  return { isIncome, amountText, lines, height }
}

function drawRow(doc: jsPDF, transaction: Transaction, y: number) {
  const { isIncome, amountText, lines } = measureRow(doc, transaction)
  drawPill(doc, isIncome, MARGIN, y)

  doc.setFont('Inter', 'normal')
  doc.setFontSize(10.5)
  setColor(doc, 'setTextColor', INK)
  const descX = MARGIN + 64
  lines.forEach((line, i) => doc.text(line, descX, y + i * DESC_LINE_H))

  doc.setFont('JetBrainsMono', 'normal')
  doc.setFontSize(9.8)
  setColor(doc, 'setTextColor', isIncome ? MOSS : FLARE)
  doc.text(amountText, PAGE_W - MARGIN, y, { align: 'right' })

  const bottomY = y + (lines.length - 1) * DESC_LINE_H + 6.2
  doc.setLineWidth(0.5)
  setColor(doc, 'setDrawColor', PAPER_LINE)
  doc.line(MARGIN, bottomY, PAGE_W - MARGIN, bottomY)
}

/* ── pagination: deterministic fixed heights, no DOM measurement needed ── */
const ROW_H = 22
const DAY_GAP_BEFORE = 17 // breathing room above a new day, separating it from the previous day's rows
const DAY_H = 45 // DAY_GAP_BEFORE + heading line + trailing space before the first row

type Block = { kind: 'day'; h: number; group: DayGroup } | { kind: 'row'; h: number; transaction: Transaction }

function buildBlocks(doc: jsPDF, groups: DayGroup[]): Block[] {
  const blocks: Block[] = []
  for (const group of groups) {
    blocks.push({ kind: 'day', h: DAY_H, group })
    for (const transaction of group.transactions) {
      blocks.push({ kind: 'row', h: measureRow(doc, transaction).height, transaction })
    }
  }
  return blocks
}

interface Page {
  first: boolean
  blocks: Block[]
}

function paginateBlocks(blocks: Block[], firstBudget: number, contBudget: number): Page[] {
  const pages: Page[] = []
  let i = 0
  let pageIndex = 0
  while (i < blocks.length) {
    const isFirst = pageIndex === 0
    const budget = isFirst ? firstBudget : contBudget
    let used = 0
    const chunk: Block[] = []
    while (i < blocks.length) {
      const b = blocks[i]!
      if (b.kind === 'day') {
        const next = blocks[i + 1]
        const pairH = b.h + (next ? next.h : 0)
        if (used + pairH > budget && chunk.length > 0) break
      } else if (used + b.h > budget && chunk.length > 0) {
        break
      }
      chunk.push(b)
      used += b.h
      i++
    }
    pages.push({ first: isFirst, blocks: chunk })
    pageIndex++
  }
  return pages
}

/**
 * Draws the whole statement and hands it to the user via a native Save As
 * dialog (or a browser download outside the desktop shell — see saveBlob).
 * Callers should guard against an empty ledger themselves (there's nothing
 * useful to export at zero transactions); this always renders at least a
 * cover page even if `transactions` is empty. Returns false if the user
 * cancelled the save dialog.
 */
export async function exportStatementToPdf(transactions: Transaction[], currency: Currency): Promise<boolean> {
  const fonts = await loadPdfFonts()
  const doc = makeDoc(fonts)

  const groups = groupByDay(transactions)
  const totals = calculateTotals(transactions)
  const range = getDateRange(transactions)
  const periodLabel = range ? formatRange(range.start, range.end) : 'No activity'
  const generatedOn = formatDateShort(todayISO())

  const CHROME_TOP = BAND_H + 9 + 28 // band + perforation + top padding, same on every page

  const heroBottom = drawHeroMeasureOnly(CHROME_TOP)
  const firstBudget = PAGE_H - FOOT_H - 14 - heroBottom
  const contBudget = PAGE_H - FOOT_H - 14 - CHROME_TOP

  const blocks = buildBlocks(doc, groups)
  const pages = paginateBlocks(blocks, firstBudget, contBudget)
  // An empty ledger still produces one page: masthead + hero + footer, no rows.
  if (pages.length === 0) pages.push({ first: true, blocks: [] })

  pages.forEach((page, pIdx) => {
    if (pIdx > 0) doc.addPage()
    drawMasthead(doc)
    const y = page.first ?
      drawHero(doc, CHROME_TOP, totals.net, totals.income, totals.expense, transactions.length, periodLabel, currency.symbol)
    : CHROME_TOP
    let cursor = y
    for (const b of page.blocks) {
      if (b.kind === 'day') drawDayHeading(doc, b.group, cursor)
      else drawRow(doc, b.transaction, cursor)
      cursor += b.h
    }
    drawFooter(doc, pIdx + 1, pages.length, generatedOn)
  })

  return saveBlob(doc.output('blob'), `Report_${todayISO()}.pdf`, [{ name: 'PDF', extensions: ['pdf'] }])
}
