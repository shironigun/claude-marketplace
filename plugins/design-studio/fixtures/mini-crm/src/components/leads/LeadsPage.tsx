import { useQuery } from '@tanstack/react-query';
import { Box, Dialog, TextField } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { PageTitle, PanelToolbar } from 'common/components';
import { LeadRow } from './LeadRow';
import { fetchLeads } from '../../api/leads-api';

const HEADER_CELL_SX = { fontWeight: 600, fontSize: 12, color: '#6b7280', py: 1 };

export function LeadsPage() {
  const { t } = useTranslation();
  const { data = [] } = useQuery({ queryKey: ['leads'], queryFn: fetchLeads });
  return (
    <Box sx={{ p: 3, minHeight: 'calc(100vh - 48px)' }}>
      <PageTitle title={t('leads.title')} />
      <Box sx={HEADER_CELL_SX}>{t('leads.name')}</Box>
      <TextField placeholder="Search leads" size="small" />
      {data.map((lead) => <LeadRow key={lead.id} lead={lead} />)}
      <Dialog open={false}>
        <PanelToolbar title="Edit" onClose={() => {}} onSave={() => {}} />
      </Dialog>
    </Box>
  );
}
