/**
 * Last War VS OCR Test Fixtures
 *
 * Representative OCR text samples from Last War VS screenshots.
 * Each sample includes a description and expected parsing outcomes.
 *
 * Usage: import in unit tests or feed directly to parseOcrText()
 *
 *   import { LAST_WAR_SAMPLES } from '@/server/engines/ocr/__fixtures__/lastWarSamples'
 *   const result = parseOcrText(LAST_WAR_SAMPLES.clean.text, 'lastwar-vs', players)
 */

export interface OcrSample {
  description: string
  text: string
  /** Expected number of parsed rows (not discarded) */
  expectedRows: number
  /** Expected number of high-confidence rows (>= 0.8) */
  expectedHighConfidence?: number
  notes: string[]
}

// ─── Samples ──────────────────────────────────────────────────────────────────

/** Clean screenshot — one player per line, all on same row */
export const SAMPLE_CLEAN_MIXED: OcrSample = {
  description: 'Clean screenshot — rank+name+score on same line',
  text: `
Alliance VS Score
Week 14 - Monday
#1 DragonSlayer 87654321
#2 IronFist 65432100
#3 ShadowWolf 54321000
#4 StarKnight 43210000
#5 CrimsonBlade 32100000
  `.trim(),
  expectedRows: 5,
  expectedHighConfidence: 3,
  notes: [
    'Header lines should be discarded',
    'Rank prefix stripped from name',
    'Scores are clean — no OCR corrections needed',
  ],
}

/** Fragmented OCR — name and score on separate lines */
export const SAMPLE_FRAGMENTED: OcrSample = {
  description: 'Fragmented OCR — name and score on separate lines',
  text: `
VS Score - Alliance
1
DragonSlayer
87,654,321
2
IronFist
65,432,100
3
ShadowWolf
54,321,000
  `.trim(),
  expectedRows: 3,
  notes: [
    'Lines should be merged: rank + name + score',
    'Comma separators stripped from scores',
  ],
}

/** With clan tags */
export const SAMPLE_CLAN_TAGS: OcrSample = {
  description: 'Player names with clan tags',
  text: `
#1 [WAR] DragonSlayer 87654321
#2 [WAR]IronFist 65432100
#3 ShadowWolf [ELITE] 54321000
#4 [★] StarKnight 43210000
  `.trim(),
  expectedRows: 4,
  notes: [
    'Clan tags [WAR], [ELITE] stripped from names',
    'Symbol tags [★] stripped',
    'Name matching should work on name without tag',
  ],
}

/** OCR noise — common glyph substitutions */
export const SAMPLE_OCR_NOISE: OcrSample = {
  description: 'OCR glyph noise in scores',
  text: `
DragonSlayer 8765432l
IronFist 6543210O
ShadowWolf 5432l000
StarKnight 43210000
  `.trim(),
  expectedRows: 4,
  notes: [
    '"l" at end of score should be corrected to "1"',
    '"O" in score should be corrected to "0"',
    'ocrCorrections should be populated',
    'issues should include possible_ocr_noise',
  ],
}

/** Spaced numbers (French locale OCR) */
export const SAMPLE_SPACED_NUMBERS: OcrSample = {
  description: 'Scores with space separators (French locale)',
  text: `
#1 DragonSlayer 87 654 321
#2 IronFist 65 432 100
#3 ShadowWolf 5 432 100
  `.trim(),
  expectedRows: 3,
  notes: [
    'Space-separated thousands groups merged',
    'e.g. "87 654 321" → 87654321',
  ],
}

/** Mixed separators */
export const SAMPLE_MIXED_SEPARATORS: OcrSample = {
  description: 'Scores with various separators (dots, commas, spaces)',
  text: `
PlayerOne 12.345.678
PlayerTwo 12,345,678
PlayerThree 12 345 678
PlayerFour 12345678
  `.trim(),
  expectedRows: 4,
  notes: [
    'All separator styles should yield the same score: 12345678',
  ],
}

/** With UI decoration lines */
export const SAMPLE_UI_NOISE: OcrSample = {
  description: 'Screenshot with heavy UI noise',
  text: `
Alliance VS Score
Week 14
Top Players
Confirm
DragonSlayer 87654321
IronFist 65432100
Cancel
Back
Menu
ShadowWolf 54321000
  `.trim(),
  expectedRows: 3,
  notes: [
    'UI keywords (Confirm, Cancel, Back, Menu) should be discarded',
    'Header lines (Alliance VS Score, Week 14, Top Players) discarded',
    'Only the 3 player lines should be extracted',
  ],
}

/** Scores below threshold */
export const SAMPLE_LOW_SCORES: OcrSample = {
  description: 'Mix of valid and suspiciously small scores',
  text: `
DragonSlayer 87654321
InactivePlayer 999
WeakPlayer 12345678
RankOnly 1
  `.trim(),
  expectedRows: 3,
  notes: [
    '"RankOnly 1" — "1" is a rank, should discard or extract name only',
    '"InactivePlayer 999" — score below threshold, should have score_too_small issue',
    '"WeakPlayer 12345678" — valid',
  ],
}

/** Special characters in player names */
export const SAMPLE_SPECIAL_CHARS: OcrSample = {
  description: 'Names with special characters and symbols',
  text: `
#1 ·Dragon·Slayer· 87654321
#2 ★IronFist★ 65432100
#3 Shadow_Wolf 54321000
#4 Star|Knight 43210000
  `.trim(),
  expectedRows: 4,
  notes: [
    'Decorative symbols stripped from names',
    'Underscores kept (valid in game names)',
    'Pipe character removed',
  ],
}

/** Realistic messy screenshot */
export const SAMPLE_REALISTIC_MESSY: OcrSample = {
  description: 'Realistic messy OCR from a real screenshot',
  text: `
AlIiance VS Score
Week 14 - Day 3
Confirm to view
1
[WAR] DragonSlayer
87 654 32l
2
IronF1st
65,432,100
3
Shadow Wolf
54.321.OOO
Rewards
Cancel
  `.trim(),
  expectedRows: 3,
  notes: [
    '"AlIiance" — OCR noise in header, still discarded as UI',
    'Rank + name + score merged across 3 lines',
    '"[WAR]" clan tag stripped',
    '"32l" → "321" OCR correction',
    '"F1st" — "1" in name preserved (valid game name)',
    '"54.321.OOO" → 54321000 with O→0 correction',
    'Rewards/Cancel discarded as UI',
  ],
}

// ─── Named export for easy access ─────────────────────────────────────────────

export const LAST_WAR_SAMPLES = {
  clean:              SAMPLE_CLEAN_MIXED,
  fragmented:         SAMPLE_FRAGMENTED,
  clanTags:           SAMPLE_CLAN_TAGS,
  ocrNoise:           SAMPLE_OCR_NOISE,
  spacedNumbers:      SAMPLE_SPACED_NUMBERS,
  mixedSeparators:    SAMPLE_MIXED_SEPARATORS,
  uiNoise:            SAMPLE_UI_NOISE,
  lowScores:          SAMPLE_LOW_SCORES,
  specialChars:       SAMPLE_SPECIAL_CHARS,
  realisticMessy:     SAMPLE_REALISTIC_MESSY,
} as const

/** Minimal player list for testing matchers against fixtures */
export const FIXTURE_PLAYERS = [
  { id: 1, name: 'DragonSlayer', normalizedName: 'dragonslayer', alias: null },
  { id: 2, name: 'IronFist',     normalizedName: 'ironfist',     alias: 'IronF1st' },
  { id: 3, name: 'ShadowWolf',   normalizedName: 'shadowwolf',   alias: null },
  { id: 4, name: 'StarKnight',   normalizedName: 'starknight',   alias: null },
  { id: 5, name: 'CrimsonBlade', normalizedName: 'crimsonblade', alias: null },
]
