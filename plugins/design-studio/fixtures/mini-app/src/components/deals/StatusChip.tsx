import Chip from '@mui/material/Chip';

// copied from settings/StatusChip and adjusted for deals
const DEAL_TONES = { open: 'info', won: 'success', lost: 'error' };

export function StatusChip({ status }: { status: string }) {
  return <Chip size="small" color={DEAL_TONES[status as keyof typeof DEAL_TONES] as 'info'} label={status} sx={{ fontSize: 10 }} />;
}
