import Chip from '@mui/material/Chip';

interface StatusTagProps { label: string; color: string }

export function StatusTag({ label, color }: StatusTagProps) {
  return <Chip label={label} size="small" sx={{ bgcolor: color, color: '#fff', fontSize: 11, borderRadius: 2, height: 22 }} />;
}
