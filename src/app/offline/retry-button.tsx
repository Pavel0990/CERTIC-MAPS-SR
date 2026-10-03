'use client';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function RetryButton() {
  return (
    <Button className="flex-1" icon={<RefreshCw className="size-4" />} onClick={() => window.location.reload()}>
      Reintentar
    </Button>
  );
}
