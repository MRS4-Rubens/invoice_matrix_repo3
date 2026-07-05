'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { PageContainer } from '@/components/page-container'
import { cn } from '@/lib/utils'

const faqs = [
  {
    question: 'Is Bill Matrix fully GST-compliant?',
    answer:
      'Yes. Bill Matrix automatically calculates CGST + SGST for intra-state transactions and IGST for inter-state, based on the registered state of your business and your customer\'s GSTIN.',
  },
  {
    question: 'Can I export data for ITR filing?',
    answer:
      'Yes. The Excel export includes Invoice No, Date, Buyer name, GSTIN, Taxable Amount, CGST, SGST, IGST, Total GST, and Grand Total — exactly the columns your CA needs.',
  },
  {
    question: 'Where is my data stored?',
    answer:
      'All invoice PDFs and documents are stored on iDrive e2 object storage with signed URLs. Your data is retained for 6+ years as required by GST regulations.',
  },
  {
    question: 'Can I customise the invoice number format?',
    answer:
      'Yes. You can set a custom prefix (e.g. BM, FIRM, INV) and manually override any invoice number. The counter resets daily by default.',
  },
  {
    question: 'Can I manage multiple businesses?',
    answer:
      'Multi-business support is available on the Enterprise plan. Each business has its own GSTIN, invoice series, customers, and reports.',
  },
  {
    question: 'Is there a free trial for paid plans?',
    answer:
      'The Professional plan comes with a 14-day free trial — no credit card required. You can upgrade, downgrade, or cancel anytime.',
  },
]

export function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  return (
    <section className="py-20">
      <PageContainer>
        <div className="text-center">
          <h2 className="text-3xl font-bold text-foreground">
            Frequently asked questions
          </h2>
        </div>

        <div className="mx-auto mt-10 max-w-2xl">
          {faqs.map((faq, index) => (
            <div key={index} className="border-b border-border">
              <button
                type="button"
                className="flex w-full items-center justify-between py-4 text-left"
                onClick={() =>
                  setOpenIndex(openIndex === index ? null : index)
                }
              >
                <span className="text-sm font-medium text-foreground">
                  {faq.question}
                </span>
                <ChevronDown
                  className={cn(
                    'ml-4 size-4 shrink-0 text-muted-foreground transition-transform duration-200',
                    openIndex === index && 'rotate-180',
                  )}
                />
              </button>
              {openIndex === index && (
                <p className="pb-4 text-sm leading-relaxed text-muted-foreground">
                  {faq.answer}
                </p>
              )}
            </div>
          ))}
        </div>
      </PageContainer>
    </section>
  )
}
