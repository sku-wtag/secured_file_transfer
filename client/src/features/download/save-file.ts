declare global {
  interface Window {
    showSaveFilePicker?: (options?: { suggestedName?: string }) => Promise<FileSystemFileHandle>;
  }
}

export interface FileSink {
  write(chunk: Uint8Array): Promise<void>;
  close(): Promise<void>;
}

function downloadBlobFallback(filename: string, mimeType: string): FileSink {
  const parts: Uint8Array[] = [];
  return {
    write(chunk) {
      parts.push(chunk);
      return Promise.resolve();
    },
    close() {
      const blob = new Blob(parts as BlobPart[], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
      return Promise.resolve();
    },
  };
}

async function fileSystemAccessSink(filename: string): Promise<FileSink | null> {
  if (!window.showSaveFilePicker) return null;
  const handle = await window.showSaveFilePicker({ suggestedName: filename });
  const writable = await handle.createWritable();
  return {
    async write(chunk) {
      await writable.write(chunk as FileSystemWriteChunkType);
    },
    async close() {
      await writable.close();
    },
  };
}

export async function createFileSink(filename: string, mimeType: string): Promise<FileSink> {
  try {
    const sink = await fileSystemAccessSink(filename);
    if (sink) return sink;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
  }
  return downloadBlobFallback(filename, mimeType);
}
