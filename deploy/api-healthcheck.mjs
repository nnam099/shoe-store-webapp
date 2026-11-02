import prisma from '../src/config/db.js';

try {
  const response = await fetch('http://127.0.0.1:5000/api/health');
  if (!response.ok) throw new Error('API liveness check failed.');
  await prisma.$queryRaw`SELECT 1`;
  await prisma.$disconnect();
  process.exit(0);
} catch {
  await prisma.$disconnect().catch(() => {});
  process.exit(1);
}
