const { ensureSchema, getSql, json, readBody, seed } = require("./_db");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    json(res, 405, { error: "Method not allowed" });
    return;
  }
  try {
    const payload = await readBody(req);
    if (!payload.bookingId || !payload.invoiceCode || payload.amount == null || !payload.status) {
      json(res, 400, { error: "Missing required fields" });
      return;
    }
    const sql = getSql();
    await ensureSchema(sql);
    await seed(sql);
    const [invoice] = await sql`
      INSERT INTO invoices (booking_id, invoice_code, amount, status)
      VALUES (${payload.bookingId}, ${payload.invoiceCode}, ${Number(payload.amount)}, ${payload.status})
      RETURNING *
    `;
    json(res, 201, { invoice });
  } catch (error) {
    json(res, 500, { error: error.message });
  }
};
