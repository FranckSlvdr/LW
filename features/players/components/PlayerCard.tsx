import { Badge } from '@/components/ui/Badge'
import { RANK_BADGE_VARIANT } from '@/features/players/lib/playerTableUtils'
import type { PlayerApi } from '@/types/api'
import type { PlayerRank } from '@/types/domain'

interface Props {
  player: PlayerApi
  statusLabel: string
  inactiveLabel: string
}

export function PlayerCard({ player, statusLabel, inactiveLabel }: Props) {
  const rankVariant = player.currentRank
    ? RANK_BADGE_VARIANT[player.currentRank as PlayerRank]
    : 'neutral'

  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--color-border)] last:border-b-0">
      {/* Rank badge */}
      <div className="shrink-0 w-12">
        {player.currentRank ? (
          <Badge variant={rankVariant}>{player.currentRank}</Badge>
        ) : (
          <Badge variant="neutral">—</Badge>
        )}
      </div>

      {/* Name + alias */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[var(--color-text-primary)] truncate leading-tight">
          {player.name}
        </p>
        {player.alias && (
          <p className="text-xs text-[var(--color-text-muted)] truncate leading-tight mt-0.5">
            {player.alias}
          </p>
        )}
      </div>

      {/* General level */}
      {player.generalLevel != null && (
        <span className="text-xs text-[var(--color-text-secondary)] shrink-0">
          Lvl {player.generalLevel}
        </span>
      )}

      {/* Active status dot */}
      <span
        className={[
          'w-2 h-2 rounded-full shrink-0',
          player.isActive
            ? 'bg-[var(--color-success)]'
            : 'bg-[var(--color-text-muted)] opacity-40',
        ].join(' ')}
        title={player.isActive ? statusLabel : inactiveLabel}
      />
    </div>
  )
}
