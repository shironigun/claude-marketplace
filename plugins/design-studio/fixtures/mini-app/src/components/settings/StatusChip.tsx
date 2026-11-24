import Chip from '@mui/material/Chip';

const TONES = { active: 'success', paused: 'warning', archived: 'default' } as const;

export function StatusChip({ status }: { status: keyof typeof TONES }) {
  return <Chip size="small" color={TONES[status]} label={status} />;
}
