import { randomBytes as nodeRandomBytes } from 'node:crypto';

const SITE_ID_ENTROPY_BYTES = 12;

export type RandomBytes = (size: number) => Buffer;

export function createSiteId(randomBytes: RandomBytes = nodeRandomBytes): string {
  const entropy = randomBytes(SITE_ID_ENTROPY_BYTES);

  if (entropy.length !== SITE_ID_ENTROPY_BYTES) {
    throw new Error(
      `Site identifier entropy source must return ${SITE_ID_ENTROPY_BYTES} bytes`,
    );
  }

  return `site_${entropy.toString('base64url')}`;
}
