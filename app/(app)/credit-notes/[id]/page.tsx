import { redirect } from 'next/navigation';
import { getCreditNote } from '@/lib/actions/credit-notes/get-credit-note';
import { CreditNoteDetail } from '@/components/app/credit-notes/credit-note-detail';

export default async function CreditNotePage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const result = await getCreditNote({ id });

  if (!result.success) {
    if (result.error.code === 'UNAUTHORIZED') {
      redirect('/login');
    }
    return (
      <div className="w-full">
        <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-md text-sm">
          <strong>Credit Note Not Found:</strong> {result.error.message}
        </div>
      </div>
    );
  }

  return <CreditNoteDetail creditNote={result.data} />;
}
