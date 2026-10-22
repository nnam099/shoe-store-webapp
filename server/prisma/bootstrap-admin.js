import { randomBytes } from 'node:crypto';
import { unlink, writeFile } from 'node:fs/promises';
import process from 'node:process';
import prisma from '../src/config/db.js';
import { hashPassword, validatePasswordConfirmation } from '../src/utils/password.js';
import { normalizeEmail, normalizeRequiredText } from '../src/utils/adminValidation.js';

function readOption(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function hasOption(name) {
  return process.argv.includes(name);
}

function readSecret(prompt) {
  if (!process.stdin.isTTY || !process.stdout.isTTY || typeof process.stdin.setRawMode !== 'function') {
    throw new Error('A secure interactive terminal is required.');
  }
  return new Promise((resolve, reject) => {
    let value = '';
    process.stdout.write(prompt);
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding('utf8');

    const cleanup = () => {
      process.stdin.off('data', onData);
      process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stdout.write('\n');
    };
    const onData = (key) => {
      if (key === '\u0003') {
        cleanup();
        reject(new Error('Cancelled.'));
      } else if (key === '\r' || key === '\n') {
        cleanup();
        resolve(value);
      } else if (key === '\u007f' || key === '\b') {
        value = value.slice(0, -1);
      } else if (key >= ' ') {
        value += key;
      }
    };
    process.stdin.on('data', onData);
  });
}

async function main() {
  const email = normalizeEmail(readOption('--email'));
  const fullName = normalizeRequiredText(readOption('--name'), 'name', 100);
  if (await prisma.adminAccount.count() > 0) {
    throw new Error('Bootstrap refused: an Admin account already exists. Use the protected Admin API.');
  }
  const generatePassword = hasOption('--generate-password');
  const passwordFile = process.env.ADMIN_BOOTSTRAP_PASSWORD_FILE;
  if (generatePassword && !passwordFile) {
    throw new Error('ADMIN_BOOTSTRAP_PASSWORD_FILE is required in generated-password mode.');
  }

  const password = generatePassword
    ? randomBytes(24).toString('base64url')
    : await readSecret('Admin password: ');
  const confirmation = generatePassword
    ? password
    : await readSecret('Confirm password: ');
  validatePasswordConfirmation(password, confirmation);
  const passwordHash = await hashPassword(password);
  if (generatePassword) {
    await writeFile(passwordFile, `${password}\n`, { encoding: 'utf8', flag: 'wx', mode: 0o600 });
  }

  try {
    await prisma.$transaction(async (tx) => {
      const existingCount = await tx.adminAccount.count();
      if (existingCount > 0) {
        throw new Error('Bootstrap refused: an Admin account already exists. Use the protected Admin API.');
      }
      await tx.adminAccount.create({
        data: { email, fullName, passwordHash, isActive: true },
      });
    }, { isolationLevel: 'Serializable' });
  } catch (error) {
    if (generatePassword) {
      await unlink(passwordFile).catch(() => {});
    }
    throw error;
  }
  process.stdout.write('First Admin account created successfully.\n');
}

main()
  .catch((error) => {
    process.stderr.write(`${error?.message || 'Bootstrap failed.'}\n`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
