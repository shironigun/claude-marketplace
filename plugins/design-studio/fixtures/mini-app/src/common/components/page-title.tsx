import Typography from '@mui/material/Typography';

export default function PageTitle({ title }: { title: string }) {
  return <Typography variant="h4" sx={{ fontWeight: 600, mb: 2 }}>{title}</Typography>;
}
