'use client';

import React from 'react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { exportToCSV } from '@/utils/export';
import { Download } from 'lucide-react';

interface CSVExporterProps {
  data: any[];
  fileName: string;
}

export default function CSVExporter({ data, fileName }: CSVExporterProps) {
  const { toast } = useToast();

  const handleExport = () => {
    if (!data || data.length === 0) {
      toast('No report rows available to export.', 'error');
      return;
    }
    exportToCSV(data, fileName);
    toast('Report rows exported to CSV.', 'success');
  };

  return (
    <Button onClick={handleExport} variant="outline" className="text-xs bg-white dark:bg-zinc-900 hover:bg-zinc-100 transition-colors">
      <Download className="w-4 h-4 mr-1.5" /> Export CSV
    </Button>
  );
}
