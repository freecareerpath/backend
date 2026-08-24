import 'dotenv/config';
import * as bcrypt from 'bcryptjs';
import { Pool } from 'pg';
import { CAREER_PATHS } from './seed-data';

const PASSWORD_HASH_ROUNDS = 12;

/**
 * Idempotent: every career-path/module/node upsert keys off its natural
 * unique constraint (slug, or (parent_id, slug)) via ON CONFLICT ... DO
 * UPDATE, so re-running this against an already-seeded database updates
 * content in place rather than creating duplicates. Resources have no
 * natural unique key of their own (a node's curated links are a small,
 * fully-seed-owned set), so each node's resource rows are replaced
 * wholesale on every run — still idempotent, never accumulates duplicates.
 * The admin/demo accounts use DO NOTHING instead, specifically so re-seeding
 * a live environment never silently overwrites a real admin's rotated
 * password.
 */
async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('DATABASE_URL is not set — see backend/.env.example.');
    process.exit(1);
  }

  const pool = new Pool({ connectionString: databaseUrl });
  try {
    await seedCareerPaths(pool);
    await seedUsers(pool);
    console.log('Seed complete.');
  } finally {
    await pool.end();
  }
}

async function seedCareerPaths(pool: Pool): Promise<void> {
  for (const path of CAREER_PATHS) {
    const pathResult = await pool.query<{ id: string }>(
      `INSERT INTO career_paths (slug, title, short_description, description, status, display_order)
       VALUES ($1, $2, $3, $4, 'published', $5)
       ON CONFLICT (slug) DO UPDATE SET
         title = EXCLUDED.title,
         short_description = EXCLUDED.short_description,
         description = EXCLUDED.description,
         status = EXCLUDED.status,
         display_order = EXCLUDED.display_order,
         updated_at = now()
       RETURNING id`,
      [path.slug, path.title, path.shortDescription, path.description, path.displayOrder],
    );
    const careerPathId = pathResult.rows[0].id;
    console.log(`career_path "${path.slug}" -> ${careerPathId}`);

    for (const [moduleIndex, mod] of path.modules.entries()) {
      const moduleResult = await pool.query<{ id: string }>(
        `INSERT INTO career_path_modules (career_path_id, slug, title, description, status, display_order)
         VALUES ($1, $2, $3, $4, 'published', $5)
         ON CONFLICT (career_path_id, slug) DO UPDATE SET
           title = EXCLUDED.title,
           description = EXCLUDED.description,
           display_order = EXCLUDED.display_order,
           updated_at = now()
         RETURNING id`,
        [careerPathId, mod.slug, mod.title, mod.description, moduleIndex],
      );
      const moduleId = moduleResult.rows[0].id;

      for (const [nodeIndex, node] of mod.nodes.entries()) {
        const nodeResult = await pool.query<{ id: string }>(
          `INSERT INTO career_path_nodes (module_id, slug, title, summary, description, status, display_order)
           VALUES ($1, $2, $3, $4, $5, 'published', $6)
           ON CONFLICT (module_id, slug) DO UPDATE SET
             title = EXCLUDED.title,
             summary = EXCLUDED.summary,
             description = EXCLUDED.description,
             display_order = EXCLUDED.display_order,
             updated_at = now()
           RETURNING id`,
          [moduleId, node.slug, node.title, node.summary, node.description, nodeIndex],
        );
        const nodeId = nodeResult.rows[0].id;

        await pool.query('DELETE FROM career_path_resources WHERE node_id = $1', [nodeId]);
        for (const [resourceIndex, resource] of node.resources.entries()) {
          await pool.query(
            `INSERT INTO career_path_resources (node_id, label, url, display_order) VALUES ($1, $2, $3, $4)`,
            [nodeId, resource.label, resource.url, resourceIndex],
          );
        }
      }
    }
  }
}

async function seedUsers(pool: Pool): Promise<void> {
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (adminEmail && adminPassword) {
    await upsertUser(pool, 'Admin', adminEmail, adminPassword, 'admin');
    console.log(`admin user ensured: ${adminEmail}`);
  } else {
    console.log('ADMIN_EMAIL/ADMIN_PASSWORD not set — skipping admin user seed.');
  }

  const demoEmail = process.env.DEMO_USER_EMAIL;
  const demoPassword = process.env.DEMO_USER_PASSWORD;

  if (demoEmail && demoPassword) {
    await upsertUser(pool, 'Demo User', demoEmail, demoPassword, 'user');
    console.log(`demo user ensured: ${demoEmail}`);
  }
}

async function upsertUser(
  pool: Pool,
  name: string,
  email: string,
  password: string,
  role: 'user' | 'admin',
): Promise<void> {
  const passwordHash = await bcrypt.hash(password, PASSWORD_HASH_ROUNDS);
  await pool.query(
    `INSERT INTO users (email, password_hash, name, role) VALUES ($1, $2, $3, $4)
     ON CONFLICT (email) DO NOTHING`,
    [email, passwordHash, name, role],
  );
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
