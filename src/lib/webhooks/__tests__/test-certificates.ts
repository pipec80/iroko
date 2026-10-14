import { generateKeyPairSync, randomBytes, sign } from 'node:crypto';
import type { KeyObject } from 'node:crypto';

// Test-only DER builder: generated keys and explicit CA, never OS trust changes.
function der(tag: number, content: Buffer): Buffer {
  const length = content.length;
  const encoded =
    length < 128 ? Buffer.from([length])
    : length < 256 ? Buffer.from([0x81, length])
    : Buffer.from([0x82, length >> 8, length & 255]);
  return Buffer.concat([Buffer.from([tag]), encoded, content]);
}
const seq = (...values: Buffer[]) => der(0x30, Buffer.concat(values));
const oid = (hex: string) => der(0x06, Buffer.from(hex, 'hex'));
const algorithm = seq(oid('2a864886f70d01010b'), der(0x05, Buffer.alloc(0)));
const name = (commonName: string) =>
  seq(der(0x31, seq(oid('550403'), der(0x0c, Buffer.from(commonName)))));
const date = (value: Date) =>
  der(0x17, Buffer.from(value.toISOString().replace(/[-:T]/g, '').slice(2, 14) + 'Z'));
const extension = (id: string, value: Buffer, critical = false) =>
  seq(oid(id), ...(critical ? [der(0x01, Buffer.from([255]))] : []), der(0x04, value));
const pem = (label: string, value: Buffer) =>
  `-----BEGIN ${label}-----\n${value
    .toString('base64')
    .match(/.{1,64}/g)
    ?.join('\n')}\n-----END ${label}-----\n`;

function certificate(
  subject: string,
  issuer: string,
  publicKey: KeyObject,
  signer: KeyObject,
  isCa: boolean,
): Buffer {
  // DER INTEGER must be minimally encoded: add sign padding only when needed.
  const serialBytes = randomBytes(16);
  serialBytes[0] = (serialBytes[0] ?? 0) | 1;
  const serial =
    (serialBytes[0] ?? 0) >= 128 ? Buffer.concat([Buffer.from([0]), serialBytes]) : serialBytes;
  const basic = extension('551d13', isCa ? seq(der(0x01, Buffer.from([255]))) : seq(), true);
  const usage = extension('551d0f', der(0x03, Buffer.from(isCa ? [1, 6] : [7, 128])), true);
  const leaf =
    isCa ?
      []
    : [
        extension('551d11', seq(der(0x82, Buffer.from(subject)))),
        extension('551d25', seq(oid('2b06010505070301'))),
      ];
  const tbs = seq(
    der(0xa0, der(0x02, Buffer.from([2]))),
    der(0x02, serial),
    algorithm,
    name(issuer),
    seq(date(new Date(Date.now() - 86400000)), date(new Date(Date.now() + 86400000))),
    name(subject),
    publicKey.export({ type: 'spki', format: 'der' }),
    der(0xa3, seq(basic, usage, ...leaf)),
  );
  return seq(
    tbs,
    algorithm,
    der(0x03, Buffer.concat([Buffer.from([0]), sign('sha256', tbs, signer)])),
  );
}

export function createTestCertificates(): {
  ca: string;
  cert: string;
  key: string;
  wrongCert: string;
  wrongKey: string;
} {
  const ca = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const leaf = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const wrong = generateKeyPairSync('rsa', { modulusLength: 2048 });
  return {
    ca: pem(
      'CERTIFICATE',
      certificate(
        'Webhook TEST ONLY CA',
        'Webhook TEST ONLY CA',
        ca.publicKey,
        ca.privateKey,
        true,
      ),
    ),
    cert: pem(
      'CERTIFICATE',
      certificate('delivery.test', 'Webhook TEST ONLY CA', leaf.publicKey, ca.privateKey, false),
    ),
    key: leaf.privateKey.export({ type: 'pkcs8', format: 'pem' }).toString(),
    wrongCert: pem(
      'CERTIFICATE',
      certificate('wrong.test', 'Webhook TEST ONLY CA', wrong.publicKey, ca.privateKey, false),
    ),
    wrongKey: wrong.privateKey.export({ type: 'pkcs8', format: 'pem' }).toString(),
  };
}
