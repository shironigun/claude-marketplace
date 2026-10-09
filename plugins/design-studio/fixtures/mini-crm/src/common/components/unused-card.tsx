import { Card, CardContent, Typography } from '@mui/material';

export function UnusedCard({ text }: { text: string }) {
  return (
    <Card sx={{ p: 0.6 }}>
      <CardContent><Typography>{text}</Typography></CardContent>
    </Card>
  );
}
