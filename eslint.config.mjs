import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // TEMPORARY downgrades (ARCH-002). Each block is owned by a later audit ID: delete the block when that ID is fixed.
  { // FE-002 — setState inside effects
    files: [
      'app/(admin)/admin/admin-console.tsx',
      'components/app/invoices/templates/template-*.tsx',
      'components/app/subscription/upgrade-prompt-modal.tsx',
    ],
    rules: { 'react-hooks/set-state-in-effect': 'warn' },
  },
  { // FE-002 — impure render / memoization
    files: [
      'components/app/settings/billing-tab.tsx',
      'components/app/settings/logo-upload-card.tsx',
      'components/landing/live-dashboard.tsx',
    ],
    rules: { 'react-hooks/purity': 'warn', 'react-hooks/preserve-manual-memoization': 'warn' },
  },
  { // REF-001 — `any` inside the large UI components
    files: [
      'app/(admin)/admin/admin-console.tsx',
      'components/app/invoices/invoice-form.tsx',
      'components/app/invoices/invoice-print-view.tsx',
      'components/app/invoices/templates/template-*.tsx',
      'components/app/settings/billing-tab.tsx',
      'components/app/settings/invoice-settings-form.tsx',
    ],
    rules: { '@typescript-eslint/no-explicit-any': 'warn' },
  },
  { // CORE-005 — require('react-dom/server') workaround
    files: ['app/api/**/archival-render/route.ts'],
    rules: { '@typescript-eslint/no-require-imports': 'warn' },
  },
  { // DEAD-001 — throwaway scripts that will be deleted or converted to tests
    files: [
      'add-columns.ts', 'migrate-manual.ts', 'test-*.ts', 'scratch/**',
      'lib/db/scripts/**', '**/*.examples.ts',
    ],
    rules: { '@typescript-eslint/no-explicit-any': 'warn', '@typescript-eslint/no-require-imports': 'warn' },
  },
  globalIgnores([
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
  ]),
])

export default eslintConfig
