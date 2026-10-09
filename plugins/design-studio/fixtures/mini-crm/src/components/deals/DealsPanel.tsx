import { Drawer, Typography } from '@mui/material';
import { StatusChip } from 'components/settings/StatusChip';

const HEADER_CELL_SX = { fontWeight: 600, fontSize: 12, color: '#6b7280', py: 1 };

export function DealsPanel({ open }: { open: boolean }) {
  return (
    <Drawer open={open} anchor="right" PaperProps={{ sx: { width: 420, p: 2 } }}>
      <Typography sx={HEADER_CELL_SX}>Deals</Typography>
      <StatusChip status="active" />
    </Drawer>
  );
}
