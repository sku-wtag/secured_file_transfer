import { Banner } from '../../components/Banner.tsx';
import { Button } from '../../components/Button.tsx';
import { TextField } from '../../components/TextField.tsx';

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
    <div className="flex flex-col gap-4">
      <Banner kind="ok">Upload complete.</Banner>
      <div className="flex items-end gap-2">
        <TextField
          id="share-link"
          label="Share link"
          readOnly
          value={shareLink}
          containerClassName="flex-1"
        />
        <Button type="button" variant="secondary" onClick={onCopy}>
          {copied ? 'Copied' : 'Copy link'}
        </Button>
      </div>
    </div>
  );
}
