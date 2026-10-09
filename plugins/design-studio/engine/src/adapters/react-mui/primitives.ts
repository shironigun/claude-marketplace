import type { Level } from '../../inventory/levels.ts';

const MUI: Record<'layout' | 'atom' | 'molecule' | 'organism', string[]> = {
  layout: ['Box', 'Stack', 'Grid', 'Grid2', 'Container', 'Paper', 'Card', 'CardContent', 'CardActions', 'CardMedia', 'CardActionArea', 'Divider', 'Toolbar', 'DialogTitle', 'DialogContent', 'DialogContentText', 'DialogActions', 'TableHead', 'TableBody', 'TableRow', 'TableCell', 'TableFooter', 'List', 'Collapse', 'Fade', 'Grow', 'Slide', 'Zoom', 'ClickAwayListener', 'Portal', 'Backdrop', 'ImageList', 'FormGroup', 'FormControl'],
  atom: ['Button', 'LoadingButton', 'IconButton', 'Fab', 'ToggleButton', 'TextField', 'Select', 'NativeSelect', 'InputBase', 'Input', 'OutlinedInput', 'FilledInput', 'Checkbox', 'Radio', 'Switch', 'Slider', 'Rating', 'Chip', 'Avatar', 'Badge', 'Tooltip', 'Link', 'Typography', 'SvgIcon', 'Icon', 'CircularProgress', 'LinearProgress', 'Skeleton', 'FormLabel', 'FormHelperText', 'InputLabel', 'InputAdornment', 'MenuItem', 'Tab', 'ListItemText', 'ListItemIcon', 'ListItemAvatar', 'ListSubheader'],
  molecule: ['ButtonGroup', 'ToggleButtonGroup', 'Autocomplete', 'Pagination', 'TablePagination', 'Breadcrumbs', 'Tabs', 'Stepper', 'Step', 'StepLabel', 'Alert', 'AlertTitle', 'Snackbar', 'Menu', 'MenuList', 'SpeedDial', 'DatePicker', 'TimePicker', 'DateTimePicker', 'DateRangePicker', 'ListItem', 'ListItemButton', 'FormControlLabel', 'RadioGroup', 'AvatarGroup', 'CardHeader', 'AccordionSummary', 'AccordionDetails', 'DesktopDatePicker', 'MobileDatePicker', 'StaticDatePicker', 'DateCalendar', 'DesktopTimePicker', 'MobileTimePicker', 'StaticTimePicker'],
  organism: ['Dialog', 'Modal', 'Drawer', 'SwipeableDrawer', 'Popover', 'Popper', 'AppBar', 'Table', 'TableContainer', 'Accordion', 'TreeView', 'SimpleTreeView', 'RichTreeView', 'DataGrid', 'DataGridPro', 'LineChart', 'BarChart', 'PieChart', 'ScatterChart', 'SparkLineChart', 'Gauge'],
};
const IGNORED_MUI = new Set(['ThemeProvider', 'StyledEngineProvider', 'CssBaseline', 'GlobalStyles', 'LocalizationProvider', 'NoSsr']);
const MUI_INDEX = new Map<string, Level>(Object.entries(MUI).flatMap(([lv, names]) => names.map((n): [string, Level] => [n, lv as Level])));
const DOM: Record<string, Level> = {
  button: 'atom', input: 'atom', a: 'atom', img: 'atom', select: 'atom', textarea: 'atom', label: 'atom', svg: 'atom', p: 'atom',
  h1: 'atom', h2: 'atom', h3: 'atom', h4: 'atom', h5: 'atom', h6: 'atom',
  nav: 'organism', header: 'organism', aside: 'organism', form: 'organism', table: 'organism', dialog: 'organism',
};

export function libLevel(id: string): Level | 'icon' | null {
  const i = id.indexOf(':');
  const lib = id.slice(0, i);
  const name = id.slice(i + 1);
  if (lib === 'icon') return 'icon';
  if (lib === 'mui') return IGNORED_MUI.has(name) ? null : (MUI_INDEX.get(name) ?? 'atom');
  if (lib === 'dom') return DOM[name] ?? 'layout';
  if (lib === 'router') return name === 'Link' || name === 'NavLink' ? 'atom' : null;
  return null;
}
