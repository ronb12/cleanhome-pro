const { ensureSchema, getSql, json, readBody, seed } = require("./_db");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    json(res, 405, { error: "Method not allowed" });
    return;
  }
  try {
    const payload = await readBody(req);
    if (!payload.customerName || !payload.homeSize || !payload.serviceType || !payload.address || !payload.scheduledDate) {
      json(res, 400, { error: "Missing required fields" });
      return;
    }
    const sql = getSql();
    await ensureSchema(sql);
    await seed(sql);
    const [booking] = await sql`
      INSERT INTO bookings (customer_name, home_size, service_type, address, scheduled_date, total, status, cleaner_id)
      VALUES (
        ${payload.customerName},
        ${payload.homeSize},
        ${payload.serviceType},
        ${payload.address},
        ${payload.scheduledDate},
        ${Number(payload.total || 0)},
        ${payload.status || "Quote Sent"},
        ${payload.cleanerId || null}
      )
      RETURNING *
    `;
    json(res, 201, { booking });
  } catch (error) {
    json(res, 500, { error: error.message });
  }
};
