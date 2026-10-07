import 'dotenv/config';
import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not defined.');
}

const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);

// Singleton PrismaClient instance
const prisma = new PrismaClient({ adapter });

export default prisma;
