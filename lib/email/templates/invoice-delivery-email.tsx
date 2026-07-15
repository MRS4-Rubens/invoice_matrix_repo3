import * as React from 'react';
import { Html, Head, Body, Container, Section, Text, Heading, Hr } from '@react-email/components';

interface InvoiceDeliveryEmailProps {
  businessName: string;
  customerName: string;
  invoiceNumber: string;
  invoiceDate: string;
  grandTotalFormatted: string;
  dueDate: string | null;
}

export const InvoiceDeliveryEmail = ({
  businessName,
  customerName,
  invoiceNumber,
  invoiceDate,
  grandTotalFormatted,
  dueDate,
}: InvoiceDeliveryEmailProps) => {
  return (
    <Html>
      <Head />
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Invoice from {businessName}</Heading>
          
          <Section style={section}>
            <Text style={text}>Hi {customerName},</Text>
            
            <Text style={text}>
              Please find attached invoice <strong>{invoiceNumber}</strong> for <strong>{grandTotalFormatted}</strong>.
            </Text>
            
            <Text style={text}>
              <strong>Invoice Date:</strong> {invoiceDate}
              {dueDate && (
                <>
                  <br />
                  <strong>Due Date:</strong> {dueDate}
                </>
              )}
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

export default InvoiceDeliveryEmail;
