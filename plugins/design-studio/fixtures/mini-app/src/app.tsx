import { ThemeProvider } from '@mui/material/styles';
import { theme } from './theme';
import { AppRoutes } from './routes/Routes';

export function App() {
  return (
    <ThemeProvider theme={theme}>
      <AppRoutes />
    </ThemeProvider>
  );
}
