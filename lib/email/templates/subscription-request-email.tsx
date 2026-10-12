import * as React from 'react';
import { Html, Head, Body, Container, Section, Text, Heading, Hr, Link } from '@react-email/components';

interface SubscriptionRequestEmailProps {
  businessName: string;
  ownerEmail: string;
  gstin: string | null;
  planName: string;
  cycle: string;
  amountFormatted: string;
  utr: string;
  paymentMethod: string;
  screenshotUrl: string | null;
  approveLink: string;
}

export const SubscriptionRequestEmail = ({
  businessName,
  ownerEmail,
  gstin,
  planName,
  cycle,
  amountFormatted,
  utr,
  paymentMethod,
  screenshotUrl,
  approveLink,
}: SubscriptionRequestEmailProps) => {
  const methodLabel =
    paymentMethod === 'upi_qr'
      ? 'UPI QR Code Scan'
      : paymentMethod === 'upi_id'
      ? 'Direct UPI ID'
      : 'Direct Bank Transfer (NEFT/IMPS)';

  return (
    <Html>
      <Head />
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>🔔 Subscription Payment Claim</Heading>
          
          <Section style={section}>
            <Text style={text}>
              A business owner has submitted a payment claim and requested subscription activation. Details are below:
            </Text>

            <Section style={card}>
              <Text style={cardText}>
                <strong>Business Name:</strong> {businessName}
              </Text>
              <Text style={cardText}>
                <strong>Business GSTIN:</strong> {gstin || 'Not Provided (Composition/Regular unregistered)'}
              </Text>
              <Text style={cardText}>
                <strong>Owner Email:</strong> {ownerEmail}
              </Text>
              <Text style={cardText}>
                <strong>Requested Plan:</strong> <span style={badge}>{planName.toUpperCase()} ({cycle.toUpperCase()})</span>
              </Text>
              <Text style={cardText}>
                <strong>Amount Paid:</strong> {amountFormatted}
              </Text>
              <Text style={cardText}>
                <strong>Payment Method:</strong> {methodLabel}
              </Text>
              <Text style={cardText}>
                <strong>Transaction UTR / Reference:</strong> <strong style={utrText}>{utr}</strong>
              </Text>
            </Section>

            {screenshotUrl && (
              <Section style={btnSection}>
                <Link href={screenshotUrl} style={screenshotBtn}>
                  🖼️ View Payment Screenshot
                </Link>
              </Section>
            )}

            <Hr style={hr} />

            <Text style={text}>
              Please verify this reference/UTR against your bank statement or UPI transactions before approval.
            </Text>

            <Section style={btnSection}>
              <Link href={approveLink} style={approveBtn}>
                ⚡ Go to Admin Console to Approve / Reject
              </Link>
            </Section>
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
  color: '#4f46e5',
  fontSize: '22px',
  fontWeight: 'bold',
  padding: '0',
  margin: '0 0 20px 0',
  textAlign: 'center' as const,
};

const section = {
  padding: '0 10px',
};

const text = {
  color: '#525f7f',
  fontSize: '15px',
  lineHeight: '24px',
  textAlign: 'left' as const,
};

const card = {
  backgroundColor: '#f8fafc',
  border: '1px solid #e2e8f0',
  borderRadius: '12px',
  padding: '16px 20px',
  margin: '20px 0',
};

const cardText = {
  color: '#334155',
  fontSize: '14px',
  lineHeight: '22px',
  margin: '6px 0',
};

const badge = {
  backgroundColor: '#e0e7ff',
  color: '#4338ca',
  padding: '2px 8px',
  borderRadius: '4px',
  fontSize: '12px',
  fontWeight: 'bold' as const,
};

const utrText = {
  color: '#0f172a',
  fontFamily: 'monospace',
  fontSize: '15px',
};

const btnSection = {
  textAlign: 'center' as const,
  margin: '25px 0',
};

const screenshotBtn = {
  backgroundColor: '#64748b',
  borderRadius: '6px',
  color: '#ffffff',
  fontSize: '14px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '10px 18px',
};

const approveBtn = {
  backgroundColor: '#4f46e5',
  borderRadius: '6px',
  color: '#ffffff',
  fontSize: '14px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '12px 24px',
};

const hr = {
  borderColor: '#e6ebf1',
  margin: '20px 0',
};

export default SubscriptionRequestEmail;
