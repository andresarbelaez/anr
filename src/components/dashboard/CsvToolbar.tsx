"use client";

import { useRef } from "react";
import { Download, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  onExport: () => void | Promise<void>;
  onImportFile: (file: File) => void | Promise<void>;
  exporting?: boolean;
  importing?: boolean;
  exportFilenameHint?: string;
};

export function CsvToolbar({
  onExport,
  onImportFile,
  exporting = false,
  importing = false,
  exportFilenameHint = "data",
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        type="button"
        variant="secondary"
        size="sm"
        loading={exporting}
        onClick={() => void onExport()}
        title={`Download ${exportFilenameHint}.csv`}
      >
        <Download className="mr-2 h-4 w-4" />
        Export CSV
      </Button>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        loading={importing}
        onClick={() => inputRef.current?.click()}
      >
        <Upload className="mr-2 h-4 w-4" />
        Import CSV
      </Button>
      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void onImportFile(f);
          e.target.value = "";
        }}
      />
    </div>
  );
}
