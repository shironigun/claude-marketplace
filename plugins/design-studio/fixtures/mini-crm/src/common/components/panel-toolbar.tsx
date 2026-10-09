import { Button, IconButton, Toolbar, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

interface PanelToolbarProps { title: string; onClose: () => void; onSave: () => void }

export function PanelToolbar({ title, onClose, onSave }: PanelToolbarProps) {
  return (
    <Toolbar sx={{ px: 2, gap: 1 }}>
      <Typography variant="h6" sx={{ flex: 1 }}>{title}</Typography>
      <IconButton onClick={onClose}><CloseIcon /></IconButton>
      <Button variant="contained" onClick={onSave}>Save</Button>
    </Toolbar>
  );
}
