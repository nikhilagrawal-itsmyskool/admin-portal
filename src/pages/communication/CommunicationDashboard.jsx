import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Grid, Card, CardActionArea, CardContent } from '@mui/material';
import {
  Send as ComposeIcon,
  Description as TemplateIcon,
  Outbox as SentIcon,
} from '@mui/icons-material';

const links = [
  { title: 'Compose', desc: 'Send an SMS/WhatsApp to students or staff', icon: ComposeIcon, path: '/communication/compose' },
  { title: 'Templates', desc: 'Manage approved message templates', icon: TemplateIcon, path: '/communication/templates' },
  { title: 'Sent Messages', desc: 'Delivery status of sent batches', icon: SentIcon, path: '/communication/messages' },
];

export default function CommunicationDashboard() {
  const navigate = useNavigate();
  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3 }}>Communication</Typography>
      <Grid container spacing={3}>
        {links.map((l) => (
          <Grid item xs={12} sm={6} md={4} key={l.path}>
            <Card>
              <CardActionArea onClick={() => navigate(l.path)}>
                <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 3 }}>
                  <l.icon color="primary" sx={{ fontSize: 40 }} />
                  <Box>
                    <Typography variant="h6">{l.title}</Typography>
                    <Typography variant="body2" color="text.secondary">{l.desc}</Typography>
                  </Box>
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
