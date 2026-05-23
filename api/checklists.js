const { ensureSchema, getSql, json, readBody, seed } = require("./_db");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    json(res, 405, { error: "Method not allowed" });
    return;
  }
  try {
    const payload = await readBody(req);
    if (!payload.bookingId || !payload.item) {
      json(res, 400, { error: "Missing required fields" });
      return;
    }
    const sql = getSql();
    await ensureSchema(sql);
    await seed(sql);
    const [entry] = await sql`
      INSERT INTO quality_checklists (booking_id, item, done)
      VALUES (${payload.bookingId}, ${payload.item}, ${Boolean(payload.done)})
      RETURNING *
    `;
    json(res, 201, { entry });
  } catch (error) {
    json(res, 500, { error: error.message });
  }
};
