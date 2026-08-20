import { z } from 'zod';

export const manifestSchema = z.object({
  v: z.literal(1),
  name: z.string().min(1),
  type: z.string(),
  size: z.number().int().nonnegative(),
  chunkSize: z.number().int().positive(),
});

export type FileManifest = z.infer<typeof manifestSchema>;
