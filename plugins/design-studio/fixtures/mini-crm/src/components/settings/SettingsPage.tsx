import { Box, Typography } from '@mui/material';
import { makeStyles } from 'tss-react/mui';
import { StatusChip } from './StatusChip';

const HEADER_CELL_SX = { fontWeight: 600, fontSize: 12, color: '#6b7280', py: 1 };

const useStyles = makeStyles()((theme) => ({ header: { marginTop: 12, padding: theme.spacing(2), borderRadius: 6 } }));

export default function SettingsPage() {
  const { classes } = useStyles();
  return (
    <Box className={classes.header} style={{ padding: 5 }}>
      <Box sx={HEADER_CELL_SX}>Name</Box>
      <Typography sx={{ fontSize: 11.5, color: 'text.secondary' }}>General</Typography>
      <StatusChip status="active" />
    </Box>
  );
}
