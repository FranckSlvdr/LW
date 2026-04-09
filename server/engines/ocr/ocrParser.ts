/**
 * OCR Parser — profile dispatcher
 *
 * Entry point for OCR text parsing.
 * Selects the appropriate profile based on the profile name.
 *
 * To add a new profile: create it in profiles/ and register it here.
 */

import { lastWarVsProfile } from './profiles/lastWarVsProfile'
import { genericProfile } from './profiles/genericProfile'
import type { OcrParseResult, OcrProfile, PlayerForMatching } from './types'

export type OcrProfileName = 'lastwar-vs' | 'generic'

const PROFILES: Record<OcrProfileName, OcrProfile> = {
  'lastwar-vs': lastWarVsProfile,
  'generic':    genericProfile,
}

export function parseOcrText(
  rawText: string,
  profileName: OcrProfileName,
  players: PlayerForMatching[],
): OcrParseResult {
  const profile = PROFILES[profileName] ?? PROFILES['generic']
  return profile.parse(rawText, players)
}

export function getAvailableProfiles(): OcrProfileName[] {
  return Object.keys(PROFILES) as OcrProfileName[]
}
