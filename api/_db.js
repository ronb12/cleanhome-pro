const { neon } = require("@neondatabase/serverless");

function getSql() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not configured");
  }
  return neon(process.env.DATABASE_URL);
}

async function ensureSchema(sql) {
  await sql`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`;
  await sql`
    CREATE TABLE IF NOT EXISTS cleaners (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      zone TEXT NOT NULL,
      status TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS bookings (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      customer_name TEXT NOT NULL,
      home_size TEXT NOT NULL,
      service_type TEXT NOT NULL,
      address TEXT NOT NULL,
      scheduled_date DATE NOT NULL,
      total NUMERIC(10, 2) NOT NULL DEFAULT 0,
      status TEXT NOT NULL,
      cleaner_id UUID REFERENCES cleaners(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS quality_checklists (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
      item TEXT NOT NULL,
      done BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS invoices (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
      invoice_code TEXT NOT NULL,
      amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
      status TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
}

async function seed(sql) {
  const [{ count }] = await sql`SELECT COUNT(*)::int AS count FROM bookings`;
  if (count > 0) {
    return;
  }

  const cleaners = await sql`
    INSERT INTO cleaners (name, zone, status)
    VALUES
      ('Ava + Mia Team', 'North', 'On Route'),
      ('Jordan Solo Crew', 'Central', 'Ready')
    RETURNING id, name
  `;

  const bookings = await sql`
    INSERT INTO bookings (customer_name, home_size, service_type, address, scheduled_date, total, status, cleaner_id)
    VALUES
      ('Bradley Home', '3 bed / 2 bath', 'Deep Clean', '14 Willow Trace', CURRENT_DATE, 295, 'Booked', ${cleaners[0].id}),
      ('Apt 4B Turnover', '2 bed / 1 bath', 'Move-out Clean', '88 Market Plaza', CURRENT_DATE, 255, 'Quote Sent', ${cleaners[1].id}),
      ('Nora Family', '4 bed / 3 bath', 'Standard Clean', '210 Lakeview Mall', CURRENT_DATE + 1, 325, 'Reminder Due', ${cleaners[1].id})
    RETURNING id
  `;

  await sql`
    INSERT INTO quality_checklists (booking_id, item, done)
    VALUES
      (${bookings[0].id}, 'Kitchen counters and sink', TRUE),
      (${bookings[0].id}, 'Bathrooms sanitized', TRUE),
      (${bookings[0].id}, 'Floors vacuumed and mopped', FALSE),
      (${bookings[0].id}, 'Before and after photos', FALSE),
      (${bookings[0].id}, 'Customer sign-off', FALSE)
  `;

  await sql`
    INSERT INTO invoices (booking_id, invoice_code, amount, status)
    VALUES
      (${bookings[0].id}, 'CHP-1001', 295, 'Paid'),
      (${bookings[1].id}, 'CHP-1002', 255, 'Open')
  `;
}

function json(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(payload));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
    });
    req.on("end", () => {
      if (!raw) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch (error) {
        reject(error);
      }
    });
    req.on("error", reject);
  });
}

module.exports = { ensureSchema, getSql, json, readBody, seed };
