import { env } from '../config/env.js';
import { createLocalBlobStore } from './local-blob-store.js';

export const blobStore = createLocalBlobStore(env.BLOB_ROOT);
