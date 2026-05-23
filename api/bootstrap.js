const { ensureSchema, getSql, json, seed } = require("./_db");

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    json(res, 405, { error: "Method not allowed" });
    return;
  }

  try {
    const sql = getSql();
    await ensureSchema(sql);
    await seed(sql);

    const [bookings, cleaners, checklists, invoices] = await Promise.all([
      sql`
        SELECT bookings.*, cleaners.name AS cleaner_name
        FROM bookings
        LEFT JOIN cleaners ON cleaners.id = bookings.cleaner_id
        ORDER BY scheduled_date ASC, bookings.created_at DESC
      `,
      sql`SELECT * FROM cleaners ORDER BY created_at ASC`,
      sql`
        SELECT quality_checklists.*, bookings.customer_name
        FROM quality_checklists
        LEFT JOIN bookings ON bookings.id = quality_checklists.booking_id
        ORDER BY quality_checklists.created_at ASC
      `,
      sql`
        SELECT invoices.*, bookings.customer_name
        FROM invoices
        LEFT JOIN bookings ON bookings.id = invoices.booking_id
        ORDER BY invoices.created_at DESC
      `,
    ]);

    const bookedRevenue = bookings.reduce((sum, booking) => sum + Number(booking.total), 0);

    json(res, 200, {
      bookings,
      cleaners,
      checklists,
      invoices,
      stats: {
        bookedRevenue,
        jobsToday: bookings.filter((booking) => new Date(booking.scheduled_date).toDateString() === new Date().toDateString()).length,
        quotePending: bookings.filter((booking) => booking.status === "Quote Sent").length,
        qualityOpen: checklists.filter((item) => !item.done).length,
      },
    });
  } catch (error) {
    json(res, 500, { error: error.message });
  }
};
