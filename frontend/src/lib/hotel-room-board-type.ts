export type HotelBoardTypeLabels = {
  roomOnly: string
  bedBreakfast: string
  halfBoard: string
  fullBoard: string
  allInclusive: string
  ultraAllInclusive: string
  nonAlcoholicAllInclusive: string
}

const BOARD_CODE_TO_KEY: Record<string, keyof HotelBoardTypeLabels> = {
  room_only: 'roomOnly',
  ro: 'roomOnly',
  self_catering: 'roomOnly',
  oda: 'roomOnly',
  bed_breakfast: 'bedBreakfast',
  bb: 'bedBreakfast',
  half_board: 'halfBoard',
  hb: 'halfBoard',
  full_board: 'fullBoard',
  fb: 'fullBoard',
  all_inclusive: 'allInclusive',
  ai: 'allInclusive',
  ultra_all_inclusive: 'ultraAllInclusive',
  uai: 'ultraAllInclusive',
  non_alcoholic_all_inclusive: 'nonAlcoholicAllInclusive',
  alcohol_free_all_inclusive: 'nonAlcoholicAllInclusive',
  alkolsuz_her_sey_dahil: 'nonAlcoholicAllInclusive',
}

/** Oda `board_type` kodu veya serbest metni → vitrin etiketi. */
export function resolveHotelBoardTypeLabel(
  boardType: string | null | undefined,
  labels: HotelBoardTypeLabels,
): string | null {
  if (!boardType?.trim()) return null
  const raw = boardType.trim()
  const v = raw.toLowerCase().replace(/\s+/g, '_').replace(/-/g, '_')
  const key = BOARD_CODE_TO_KEY[v]
  if (key) return labels[key]
  return raw
}

export function defaultHotelBoardTypeLabelsTr(): HotelBoardTypeLabels {
  return {
    roomOnly: 'Sadece oda',
    bedBreakfast: 'Oda + Kahvaltı',
    halfBoard: 'Yarım pansiyon',
    fullBoard: 'Tam pansiyon',
    allInclusive: 'Her şey dahil',
    ultraAllInclusive: 'Ultra her şey dahil',
    nonAlcoholicAllInclusive: 'Alkolsüz her şey dahil',
  }
}

export function defaultHotelBoardTypeLabelsEn(): HotelBoardTypeLabels {
  return {
    roomOnly: 'Room only',
    bedBreakfast: 'Bed & breakfast',
    halfBoard: 'Half board',
    fullBoard: 'Full board',
    allInclusive: 'All inclusive',
    ultraAllInclusive: 'Ultra all inclusive',
    nonAlcoholicAllInclusive: 'Non-alcoholic all inclusive',
  }
}

export function buildBoardTypeLabelsFromMessages(rs: Record<string, string>): HotelBoardTypeLabels {
  return {
    roomOnly: rs.boardRoomOnly ?? rs.roomOnly ?? 'Sadece oda',
    bedBreakfast: rs.boardBedBreakfast ?? rs.breakfastIncluded ?? 'Oda + Kahvaltı',
    halfBoard: rs.boardHalfBoard ?? rs.halfBoard ?? 'Yarım pansiyon',
    fullBoard: rs.boardFullBoard ?? rs.fullBoard ?? 'Tam pansiyon',
    allInclusive: rs.boardAllInclusive ?? rs.allInclusive ?? 'Her şey dahil',
    ultraAllInclusive: rs.boardUltraAllInclusive ?? 'Ultra her şey dahil',
    nonAlcoholicAllInclusive: rs.boardNonAlcoholicAllInclusive ?? 'Alkolsüz her şey dahil',
  }
}

const BOARD_TYPE_DISPLAY_ORDER: Array<keyof HotelBoardTypeLabels> = [
  'roomOnly',
  'bedBreakfast',
  'halfBoard',
  'fullBoard',
  'allInclusive',
  'nonAlcoholicAllInclusive',
  'ultraAllInclusive',
]

function boardTypeKeyFromCode(code: string | null | undefined): keyof HotelBoardTypeLabels | null {
  if (!code?.trim()) return null
  const v = code.trim().toLowerCase().replace(/\s+/g, '_').replace(/-/g, '_')
  return BOARD_CODE_TO_KEY[v] ?? null
}

/** Otel detay üst başlığı — aktif yemek planları ve oda `board_type` birleşiminden benzersiz etiketler. */
export function collectHotelHeaderBoardTypeLabels(input: {
  mealPlans: Array<{ plan_code: string; label?: string; is_active?: boolean }>
  roomBoardTypes: Array<string | null | undefined>
  labels: HotelBoardTypeLabels
}): string[] {
  const keys = new Set<keyof HotelBoardTypeLabels>()
  const extraLabels: string[] = []

  for (const plan of input.mealPlans) {
    if (plan.is_active === false) continue
    const code = plan.plan_code?.trim()
    if (!code) continue
    if (code === 'custom') {
      const custom = plan.label?.trim()
      if (custom) extraLabels.push(custom)
      continue
    }
    const key = boardTypeKeyFromCode(code)
    if (key) keys.add(key)
  }

  for (const boardType of input.roomBoardTypes) {
    const key = boardTypeKeyFromCode(boardType)
    if (key) {
      keys.add(key)
      continue
    }
    const freeText = resolveHotelBoardTypeLabel(boardType, input.labels)
    if (freeText) extraLabels.push(freeText)
  }

  const ordered = BOARD_TYPE_DISPLAY_ORDER.filter((key) => keys.has(key)).map((key) => input.labels[key])
  const seen = new Set(ordered.map((label) => label.toLowerCase()))
  for (const label of extraLabels) {
    const norm = label.toLowerCase()
    if (!seen.has(norm)) {
      seen.add(norm)
      ordered.push(label)
    }
  }
  return ordered
}
