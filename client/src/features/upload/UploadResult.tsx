export function UploadResult({
  shareLink,
  copied,
  onCopy,
}: {
  shareLink: string;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <div role="status">
      <p className="ok">Upload complete.</p>
      <input type="text" readOnly value={shareLink} aria-label="Share link" />
      <button type="button" onClick={onCopy}>
        {copied ? 'Copied' : 'Copy link'}
      </button>
    </div>
  );
}
