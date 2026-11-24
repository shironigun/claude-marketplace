import { List, ListItem, ListItemText, Typography } from '@mui/material';

export interface InboxItem { id: string; from: string; preview: string }

export function Inbox({ items }: { items: InboxItem[] }) {
  return (
    <List dense sx={{ bgcolor: '#fafafa', borderRadius: 1 }}>
      {items.map((item) => (
        <ListItem key={item.id} divider>
          <ListItemText primary={item.from} secondary={item.preview} />
          <Typography sx={{ fontSize: 10.5, color: '#9e9e9e' }}>now</Typography>
        </ListItem>
      ))}
    </List>
  );
}
