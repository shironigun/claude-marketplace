import { Box, Typography } from '@mui/material';
import { StatusTag } from 'common/components';

const STATUS_COLORS = { new: '#2196f3', won: '#4caf50', lost: '#f44336' };

export function LeadRow({ lead }: { lead: { id: string; name: string; status: 'new' | 'won' | 'lost' } }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 1 }}>
      <Typography sx={{ fontSize: 13 }}>{lead.name}</Typography>
      <StatusTag label={lead.status} color={STATUS_COLORS[lead.status]} />
    </Box>
  );
}
