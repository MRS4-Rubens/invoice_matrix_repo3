'use client'

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { deactivateCustomer } from '@/lib/actions/customers/deactivate-customer';
import { reactivateCustomer } from '@/lib/actions/customers/reactivate-customer';
import { useRouter } from 'next/navigation';
import { Power, PowerOff } from 'lucide-react';

export function CustomerActions({ customerId, isActive }: { customerId: string, isActive: boolean }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const toggleActive = async () => {
    const confirmMessage = isActive 
      ? 'Are you sure you want to deactivate this customer? They will not appear in active lists but their history will be preserved.'
      : 'Are you sure you want to reactivate this customer?';
      
    if (!confirm(confirmMessage)) return;

    setLoading(true);
    
    const result = isActive 
      ? await deactivateCustomer({ id: customerId })
      : await reactivateCustomer({ id: customerId });
      
    if (result.success) {
      router.refresh();
    } else {
      alert(result.error.message || 'Action failed. Please try again.');
    }
    
    setLoading(false);
  };

  return (
    <Button
      variant={isActive ? 'destructive' : 'default'}
      onClick={toggleActive}
      disabled={loading}
    >
      {isActive ? (
        <>
          <PowerOff className="size-4 mr-2" />
          Deactivate
        </>
      ) : (
        <>
          <Power className="size-4 mr-2" />
          Reactivate
        </>
      )}
    </Button>
  );
}
