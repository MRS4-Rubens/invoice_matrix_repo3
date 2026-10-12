import * as React from 'react';
import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Heading,
  Hr,
} from '@react-email/components';

interface FeedbackNotificationEmailProps {
  category: string;
  categoryLabel: string;
  severity?: string;
  rating?: number;
  title: string;
  description: string;
  userName: string;
  userEmail: string;
  userRole: string;
  businessName: string;
  businessGstin?: string | null;
  diagnostics?: {
    currentUrl?: string;
    browser?: string;
    os?: string;
    screenResolution?: string;
    submittedAt?: string;
  };
  attachmentNames: string[];
}

export const FeedbackNotificationEmail = ({
  category,
  categoryLabel,
  severity,
  rating,
  title,
  description,
  userName,
  userEmail,
  userRole,
  businessName,
  businessGstin,
  diagnostics,
  attachmentNames,
}: FeedbackNotificationEmailProps) => {
  const categoryBadgeColor =
    category === 'bug'
      ? '#e11d48' // Rose/Red
      : category === 'feature_request'
      ? '#7c3aed' // Purple/Violet
      : category === 'ui_ux'
      ? '#ea580c' // Orange
      : '#059669'; // Emerald

  const severityColor =
    severity === 'critical' ? '#dc2626' : severity === 'medium' ? '#d97706' : '#2563eb';

  return (
    <Html>
      <Head />
      <Body style={main}>
        <Container style={container}>
          {/* Header Banner */}
          <Section style={headerSection}>
            <Text style={headerEyebrow}>BILL MATRIX USER FEEDBACK &amp; BUG REPORT</Text>
            <Heading style={headerTitle}>{title}</Heading>

            <div style={{ marginTop: '12px' }}>
              <span
                style={{
                  ...badgeStyle,
                  backgroundColor: categoryBadgeColor,
                  color: '#ffffff',
                }}
              >
                {categoryLabel.toUpperCase()}
              </span>

              {severity && (
                <span
                  style={{
                    ...badgeStyle,
                    backgroundColor: '#ffffff',
                    color: severityColor,
                    border: `1px solid ${severityColor}`,
                    marginLeft: '8px',
                  }}
                >
                  PRIORITY: {severity.toUpperCase()}
                </span>
              )}

              {rating && (
                <span
                  style={{
                    ...badgeStyle,
                    backgroundColor: '#fef3c7',
                    color: '#b45309',
                    border: '1px solid #fde68a',
                    marginLeft: '8px',
                  }}
                >
                  RATING: {'★'.repeat(rating)}{'☆'.repeat(5 - rating)} ({rating}/5)
                </span>
              )}
            </div>
          </Section>

          {/* Description Body */}
          <Section style={cardSection}>
            <Text style={sectionHeading}>FEEDBACK / ISSUE DESCRIPTION</Text>
            <div style={descriptionBox}>
              <Text style={descriptionText}>{description}</Text>
            </div>
          </Section>

          {/* Submitter & Business Profile */}
          <Section style={cardSection}>
            <Text style={sectionHeading}>SUBMITTED BY (REPLY-TO RECIPIENT)</Text>
            <table style={infoTable}>
              <tbody>
                <tr>
                  <td style={infoLabel}>User:</td>
                  <td style={infoValue}>
                    <strong>{userName}</strong> ({userEmail})
                  </td>
                </tr>
                <tr>
                  <td style={infoLabel}>Role:</td>
                  <td style={infoValue}>
                    <span style={roleBadge}>{userRole.toUpperCase()}</span>
                  </td>
                </tr>
                <tr>
                  <td style={infoLabel}>Business:</td>
                  <td style={infoValue}>
                    <strong>{businessName}</strong>
                    {businessGstin && <span> (GSTIN: {businessGstin})</span>}
                  </td>
                </tr>
              </tbody>
            </table>

            <div style={replyTipBox}>
              <Text style={replyTipText}>
                💡 <strong>1-Click Reply Tip:</strong> Hitting <strong>&quot;Reply&quot;</strong> in your email client will automatically address your email to <strong>{userEmail}</strong>.
              </Text>
            </div>
          </Section>

          {/* Technical Diagnostics */}
          {diagnostics && (
            <Section style={cardSection}>
              <Text style={sectionHeading}>TECHNICAL DIAGNOSTICS &amp; CLIENT CONTEXT</Text>
              <table style={infoTable}>
                <tbody>
                  {diagnostics.currentUrl && (
                    <tr>
                      <td style={infoLabel}>Page URL:</td>
                      <td style={infoValue}>
                        <code style={codeStyle}>{diagnostics.currentUrl}</code>
                      </td>
                    </tr>
                  )}
                  {diagnostics.browser && (
                    <tr>
                      <td style={infoLabel}>Browser:</td>
                      <td style={infoValue}>{diagnostics.browser}</td>
                    </tr>
                  )}
                  {diagnostics.os && (
                    <tr>
                      <td style={infoLabel}>Operating System:</td>
                      <td style={infoValue}>{diagnostics.os}</td>
                    </tr>
                  )}
                  {diagnostics.screenResolution && (
                    <tr>
                      <td style={infoLabel}>Screen Size:</td>
                      <td style={infoValue}>{diagnostics.screenResolution}</td>
                    </tr>
                  )}
                  {diagnostics.submittedAt && (
                    <tr>
                      <td style={infoLabel}>Timestamp:</td>
                      <td style={infoValue}>{diagnostics.submittedAt}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </Section>
          )}

          {/* Attachments Note */}
          {attachmentNames.length > 0 && (
            <Section style={cardSection}>
              <Text style={sectionHeading}>ATTACHED FILES ({attachmentNames.length})</Text>
              <ul style={attachmentList}>
                {attachmentNames.map((name, idx) => (
                  <li key={idx} style={attachmentItem}>
                    📎 {name}
                  </li>
                ))}
              </ul>
              <Text style={attachmentSubtext}>
                (Files are attached directly to this email in your Gmail/Mail client. Zero files saved to app cloud storage.)
              </Text>
            </Section>
          )}

          <Hr style={divider} />

          <Section style={footerSection}>
            <Text style={footerText}>
              Sent automatically by Bill Matrix Application Dispatch.
              <br />
              Recipient configured: mcrsftrwds4@gmail.com
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

export default FeedbackNotificationEmail;

// ── Styles ────────────────────────────────────────────────────────
const main = {
  backgroundColor: '#f1f5f9',
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
  padding: '24px 0',
  margin: '0',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  maxWidth: '620px',
  borderRadius: '16px',
  border: '1px solid #e2e8f0',
  overflow: 'hidden',
  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
};

const headerSection = {
  background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)',
  padding: '28px 24px',
  color: '#ffffff',
};

const headerEyebrow = {
  fontSize: '11px',
  fontWeight: '800' as const,
  letterSpacing: '1px',
  color: '#94a3b8',
  margin: '0 0 6px 0',
};

const headerTitle = {
  fontSize: '20px',
  fontWeight: '800' as const,
  color: '#ffffff',
  margin: '0',
  lineHeight: '1.3',
};

const badgeStyle = {
  display: 'inline-block',
  fontSize: '11px',
  fontWeight: '700' as const,
  padding: '3px 9px',
  borderRadius: '9999px',
  letterSpacing: '0.5px',
};

const cardSection = {
  padding: '20px 24px',
  borderBottom: '1px solid #f1f5f9',
};

const sectionHeading = {
  fontSize: '11px',
  fontWeight: '800' as const,
  letterSpacing: '0.8px',
  color: '#64748b',
  margin: '0 0 10px 0',
};

const descriptionBox = {
  backgroundColor: '#f8fafc',
  border: '1px solid #e2e8f0',
  borderRadius: '10px',
  padding: '14px 16px',
};

const descriptionText = {
  fontSize: '14px',
  lineHeight: '1.6',
  color: '#1e293b',
  margin: '0',
  whiteSpace: 'pre-wrap' as const,
};

const infoTable = {
  width: '100%',
  borderCollapse: 'collapse' as const,
};

const infoLabel = {
  width: '110px',
  fontSize: '13px',
  color: '#64748b',
  fontWeight: '600' as const,
  padding: '5px 0',
  verticalAlign: 'top' as const,
};

const infoValue = {
  fontSize: '13.5px',
  color: '#0f172a',
  padding: '5px 0',
};

const roleBadge = {
  display: 'inline-block',
  fontSize: '10.5px',
  fontWeight: '700' as const,
  padding: '2px 7px',
  borderRadius: '4px',
  backgroundColor: '#e0e7ff',
  color: '#4338ca',
};

const codeStyle = {
  fontFamily: 'monospace',
  fontSize: '12px',
  backgroundColor: '#f1f5f9',
  padding: '2px 5px',
  borderRadius: '4px',
  color: '#0f172a',
};

const replyTipBox = {
  marginTop: '12px',
  backgroundColor: '#eff6ff',
  border: '1px solid #bfdbfe',
  borderRadius: '8px',
  padding: '10px 14px',
};

const replyTipText = {
  fontSize: '12.5px',
  color: '#1e40af',
  margin: '0',
  lineHeight: '1.4',
};

const attachmentList = {
  margin: '0',
  paddingLeft: '20px',
  fontSize: '13px',
  color: '#334155',
};

const attachmentItem = {
  marginBottom: '4px',
};

const attachmentSubtext = {
  fontSize: '11.5px',
  color: '#94a3b8',
  marginTop: '8px',
  marginBottom: '0',
  fontStyle: 'italic' as const,
};

const divider = {
  borderColor: '#e2e8f0',
  margin: '0',
};

const footerSection = {
  padding: '18px 24px',
  textAlign: 'center' as const,
};

const footerText = {
  fontSize: '11.5px',
  color: '#94a3b8',
  margin: '0',
  lineHeight: '1.5',
};
