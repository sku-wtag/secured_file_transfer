import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import nodemailer from 'nodemailer';

import { env } from '../config/env.js';
import { logger } from '../logger.js';

const DEV_MAIL_DIR = 'var/mail';

interface Mail {
  to: string;
  subject: string;
  text: string;
}

async function writeDevMail(mail: Mail, rendered: string): Promise<void> {
  await mkdir(DEV_MAIL_DIR, { recursive: true });
  const fileName = `${String(Date.now())}-${mail.to.replaceAll(/[^\w.@-]/g, '_')}.eml`;
  await writeFile(path.join(DEV_MAIL_DIR, fileName), rendered);
  logger.info({ file: fileName }, 'wrote dev email to disk');
}

async function sendViaSmtp(smtpUrl: string, mail: Mail): Promise<void> {
  const transport = nodemailer.createTransport(smtpUrl);
  await transport.sendMail({
    from: env.MAIL_FROM,
    to: mail.to,
    subject: mail.subject,
    text: mail.text,
  });
}

async function sendViaDevStream(mail: Mail): Promise<void> {
  const transport = nodemailer.createTransport({ streamTransport: true, buffer: true });
  const info = await transport.sendMail({
    from: env.MAIL_FROM,
    to: mail.to,
    subject: mail.subject,
    text: mail.text,
  });
  if (!Buffer.isBuffer(info.message)) {
    throw new Error('Expected the dev stream transport to buffer the message');
  }
  await writeDevMail(mail, info.message.toString('utf8'));
}

export async function sendMail(mail: Mail): Promise<void> {
  console.log('Sagor', env.SMTP_URL);
  if (env.SMTP_URL) {
    await sendViaSmtp(env.SMTP_URL, mail);
  } else {
    await sendViaDevStream(mail);
  }
}
