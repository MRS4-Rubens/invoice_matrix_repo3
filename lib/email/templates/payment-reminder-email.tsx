import * as React from 'react';
import { Html, Head, Body, Container, Section, Text, Heading, Hr } from '@react-email/components';

interface PaymentReminderEmailProps {
  businessName: string;
  customerName: string;
  invoiceNumber: string;
  dueDate: string;
  daysOverdue: number;
  amountDueFormatted: string;
}

export const PaymentReminderEmail = ({
  businessName,
  customerName,
  invoiceNumber,
  dueDate,
  daysOverdue,
  amountDueFormatted,
}: PaymentReminderEmailProps) => {
  return (
    <Html>
      <Head />
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Payment Reminder: {businessName}</Heading>
          
          <Section style={section}>
            <Text style={text}>Hi {customerName},</Text>
            
            <Text style={text}>
              This is a gentle reminder that invoice <strong>{invoiceNumber}</strong> was due on <strong>{dueDate}</strong> and is currently <strong>{daysOverdue} day{daysOverdue === 1 ? '' : 's'} overdue</strong>.
            </Text>
            
            <Text style={text}>
              The outstanding balance is <strong>{amountDueFormatted}</strong>.
            </Text>
            
            <Text style={text}>
              Please arrange payment at your earliest convenience. If you have already made the payment, please disregard this email.
            </Text>
            
            <Hr style={hr} />
            
            <Text style={text}>
              Thank you for your business!
              <br />
              {businessName}
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

const main = {
  backgroundColor: '#f6f9fc',
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '40px 20px',
  borderRadius: '8px',
  marginTop: '20px',
  marginBottom: '20px',
  boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
};

const h1 = {
  color: '#333',
  fontSize: '24px',
  fontWeight: 'bold',
  padding: '0',
  margin: '0 0 20px 0',
  textAlign: 'center' as const,
};

const section = {
  padding: '0 20px',
};

const text = {
  color: '#525f7f',
  fontSize: '16px',
  lineHeight: '24px',
  textAlign: 'left' as const,
};

const hr = {
  borderColor: '#e6ebf1',
  margin: '20px 0',
};

export default PaymentReminderEmail;
