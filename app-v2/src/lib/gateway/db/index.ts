import 'dotenv/config';
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "@/lib/gateway/db/schema";
import { getDatabaseUrl } from '@/lib/gateway/env';

const pool = new Pool({
    connectionString: getDatabaseUrl(),
    ssl: false
});
const db = drizzle(pool, { schema });

export default db;