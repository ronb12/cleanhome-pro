const { ensureSchema, getSql, json, readBody, seed } = require("./_db");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    json(res, 405, { error: "Method not allowed" });
    return;
  }
  try {
    const payload = await readBody(req);
    if (!payload.name || !payload.zone || !payload.status) {
      json(res, 400, { error: "Missing required fields" });
      return;
    }
    const sql = getSql();
    await ensureSchema(sql);
    await seed(sql);
    const [cleaner] = await sql`
      INSERT INTO cleaners (name, zone, status)
      VALUES (${payload.name}, ${payload.zone}, ${payload.status})
      RETURNING *
    `;
    json(res, 201, { cleaner });
  } catch (error) {
    json(res, 500, { error: error.message });
  }
};
