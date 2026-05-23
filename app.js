(() => {
  const app = document.querySelector("#app");
  const tabs = document.querySelectorAll(".tab-link");
  const state = {
    activeTab: "overview",
    bookings: [],
    cleaners: [],
    checklists: [],
    invoices: [],
    stats: {},
  };

  const priceMap = { "2 bed / 1 bath": 165, "3 bed / 2 bath": 240, "4 bed / 3 bath": 325 };
  const cleanTypeAddOn = { "Standard Clean": 0, "Deep Clean": 55, "Move-out Clean": 90 };
  const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

  function formatDate(value) {
    return new Date(`${value}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }

  function estimateTotal(homeSize, serviceType) {
    return (priceMap[homeSize] || 240) + (cleanTypeAddOn[serviceType] || 0);
  }

  async function post(url, payload) {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: "Request failed" }));
      throw new Error(error.error || "Request failed");
    }
    return response.json();
  }

  function renderMetrics() {
    return `
      <section class="dashboard">
        <article><span class="kpi">${money.format(state.stats.bookedRevenue || 0)}</span><h2>Booked Revenue</h2><p>Across current quotes and bookings.</p></article>
        <article><span class="kpi">${state.stats.jobsToday || 0}</span><h2>Jobs Today</h2><p>Scheduled cleanings on today’s board.</p></article>
        <article><span class="kpi">${state.stats.quotePending || 0}</span><h2>Quotes Pending</h2><p>Requests still waiting for closeout.</p></article>
        <article><span class="kpi">${state.stats.qualityOpen || 0}</span><h2>Open Quality Items</h2><p>Checklist steps still incomplete.</p></article>
      </section>
    `;
  }

  function renderOverviewTab() {
    const nextBooking = state.bookings[0];
    const openChecklist = state.checklists.filter((item) => !item.done).slice(0, 4);
    const openInvoices = state.invoices.filter((invoice) => invoice.status !== "Paid");
    return `
      <section class="dashboard overview-grid">
        <article class="overview-feature">
          <span class="eyebrow">Next service window</span>
          ${nextBooking ? `
            <h2>${nextBooking.customer_name}</h2>
            <p>${nextBooking.service_type} • ${nextBooking.home_size}</p>
            <div class="detail-grid">
              <div><span>Address</span><strong>${nextBooking.address}</strong></div>
              <div><span>Cleaner</span><strong>${nextBooking.cleaner_name || "Unassigned"}</strong></div>
              <div><span>Status</span><strong>${nextBooking.status}</strong></div>
              <div><span>Revenue</span><strong>${money.format(nextBooking.total)}</strong></div>
            </div>
          ` : `<div class="settings-note">No booking is scheduled yet.</div>`}
        </article>
        <article class="overview-stack">
          <div class="summary-card">
            <h3>Open quality checks</h3>
            ${openChecklist.length
              ? openChecklist.map((item) => `<div class="list-line"><b>${item.customer_name || "Booking removed"}</b><span>${item.item}</span></div>`).join("")
              : `<div class="settings-note">No open quality items.</div>`}
          </div>
          <div class="summary-card">
            <h3>Open invoices</h3>
            ${openInvoices.length
              ? openInvoices.map((invoice) => `<div class="list-line"><b>${invoice.invoice_code}</b><span>${invoice.customer_name || "Booking removed"} • ${money.format(invoice.amount)}</span></div>`).join("")
              : `<div class="settings-note">All invoices are paid.</div>`}
          </div>
        </article>
      </section>
      <section class="settings-note">
        <h2>Today’s Route Board</h2>
        <div class="route-board">
          ${state.bookings.map((booking, index) => `
            <article class="route-stop">
              <span>Stop ${index + 1}</span>
              <strong>${booking.customer_name}</strong>
              <p>${booking.service_type} • ${booking.address}</p>
              <em>${booking.cleaner_name || "Unassigned"} • ${formatDate(booking.scheduled_date)}</em>
            </article>
          `).join("")}
        </div>
      </section>
    `;
  }

  function renderBookingsTab() {
    return `
      <section class="settings-note split-note">
        <div>
        <h2>Create Booking</h2>
          <p>Build the schedule around service type, home size, and route value.</p>
        </div>
        <form id="bookingForm" style="display:grid;gap:10px">
          <div style="display:grid;gap:10px;grid-template-columns:1fr 1fr">
            <input name="customerName" placeholder="Customer name" required>
            <input name="address" placeholder="Address" required>
          </div>
          <div style="display:grid;gap:10px;grid-template-columns:1fr 1fr 1fr">
            <select name="homeSize"><option>2 bed / 1 bath</option><option selected>3 bed / 2 bath</option><option>4 bed / 3 bath</option></select>
            <select name="serviceType"><option>Standard Clean</option><option selected>Deep Clean</option><option>Move-out Clean</option></select>
            <input name="scheduledDate" type="date" required>
          </div>
          <div style="display:grid;gap:10px;grid-template-columns:1fr 1fr 1fr">
            <select name="status"><option>Quote Sent</option><option>Booked</option><option>Reminder Due</option></select>
            <select name="cleanerId"><option value="">Unassigned</option>${state.cleaners.map((cleaner) => `<option value="${cleaner.id}">${cleaner.name}</option>`).join("")}</select>
            <input name="total" placeholder="Estimated total" readonly>
          </div>
          <button type="submit">Save booking</button>
        </form>
      </section>
      <section class="settings-note">
        <h2>Schedule Queue</h2>
        ${state.bookings.map((booking) => `<div style="display:flex;justify-content:space-between;gap:12px;padding:10px 0;border-top:1px solid #ebeef7"><div><b>${booking.customer_name}</b><div>${booking.service_type} • ${booking.home_size}</div><div>${booking.address}</div></div><div>${money.format(booking.total)} • ${booking.status} • ${booking.cleaner_name || "Unassigned"} • ${formatDate(booking.scheduled_date)}</div></div>`).join("")}
      </section>
    `;
  }

  function renderOpsTab() {
    return `
      <section class="settings-note">
        <h2>Add Cleaner</h2>
        <form id="cleanerForm" style="display:grid;gap:10px">
          <div style="display:grid;gap:10px;grid-template-columns:1fr 1fr 1fr">
            <input name="name" placeholder="Cleaner or crew name" required>
            <select name="zone"><option>North</option><option>Central</option><option>South</option></select>
            <select name="status"><option>Ready</option><option>On Route</option><option>On Site</option></select>
          </div>
          <button type="submit">Add cleaner</button>
        </form>
      </section>
      <section class="settings-note">
        <h2>Team Board</h2>
        ${state.cleaners.map((cleaner) => `<div style="display:flex;justify-content:space-between;gap:12px;padding:10px 0;border-top:1px solid #ebeef7"><div><b>${cleaner.name}</b><div>${cleaner.zone}</div></div><div>${cleaner.status}</div></div>`).join("")}
      </section>
    `;
  }

  function renderQualityTab() {
    return `
      <section class="settings-note">
        <h2>Add Quality Check</h2>
        <form id="checklistForm" style="display:grid;gap:10px">
          <select name="bookingId">${state.bookings.map((booking) => `<option value="${booking.id}">${booking.customer_name}</option>`).join("")}</select>
          <div style="display:grid;gap:10px;grid-template-columns:1fr 200px">
            <input name="item" placeholder="Checklist item" required>
            <select name="done"><option value="false">Open</option><option value="true">Done</option></select>
          </div>
          <button type="submit">Add checklist item</button>
        </form>
      </section>
      <section class="settings-note">
        <h2>Quality Board</h2>
        ${state.checklists.map((item) => `<div style="display:flex;justify-content:space-between;gap:12px;padding:10px 0;border-top:1px solid #ebeef7"><div><b>${item.customer_name || "Booking removed"}</b><div>${item.item}</div></div><div>${item.done ? "Done" : "Open"}</div></div>`).join("")}
      </section>
    `;
  }

  function renderBillingTab() {
    return `
      <section class="settings-note">
        <h2>Create Invoice</h2>
        <form id="invoiceForm" style="display:grid;gap:10px">
          <select name="bookingId">${state.bookings.map((booking) => `<option value="${booking.id}">${booking.customer_name}</option>`).join("")}</select>
          <div style="display:grid;gap:10px;grid-template-columns:1fr 1fr 1fr">
            <input name="invoiceCode" placeholder="Invoice code" required>
            <input name="amount" type="number" min="0" placeholder="Amount" required>
            <select name="status"><option>Open</option><option>Paid</option></select>
          </div>
          <button type="submit">Create invoice</button>
        </form>
      </section>
      <section class="settings-note">
        <h2>Invoices</h2>
        ${state.invoices.map((invoice) => `<div style="display:flex;justify-content:space-between;gap:12px;padding:10px 0;border-top:1px solid #ebeef7"><div><b>${invoice.invoice_code}</b><div>${invoice.customer_name || "Booking removed"}</div></div><div>${money.format(invoice.amount)} • ${invoice.status}</div></div>`).join("")}
      </section>
    `;
  }

  function bindTabLinks() {
    tabs.forEach((tab) => {
      tab.classList.toggle("active", tab.dataset.tab === state.activeTab);
      tab.addEventListener("click", () => {
        state.activeTab = tab.dataset.tab;
        render();
      });
    });
  }

  function bindForms() {
    const bookingForm = document.querySelector("#bookingForm");
    if (bookingForm) {
      const homeSize = bookingForm.querySelector('[name="homeSize"]');
      const serviceType = bookingForm.querySelector('[name="serviceType"]');
      const total = bookingForm.querySelector('[name="total"]');
      const update = () => {
        total.value = estimateTotal(homeSize.value, serviceType.value);
      };
      update();
      homeSize.addEventListener("change", update);
      serviceType.addEventListener("change", update);
      bookingForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        await post("/api/bookings", {
          customerName: String(form.get("customerName")),
          address: String(form.get("address")),
          homeSize: String(form.get("homeSize")),
          serviceType: String(form.get("serviceType")),
          scheduledDate: String(form.get("scheduledDate")),
          total: Number(form.get("total")),
          status: String(form.get("status")),
          cleanerId: String(form.get("cleanerId")) || null,
        });
        await load();
      });
    }

    const cleanerForm = document.querySelector("#cleanerForm");
    if (cleanerForm) {
      cleanerForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        await post("/api/cleaners", {
          name: String(form.get("name")),
          zone: String(form.get("zone")),
          status: String(form.get("status")),
        });
        await load();
      });
    }

    const checklistForm = document.querySelector("#checklistForm");
    if (checklistForm) {
      checklistForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        await post("/api/checklists", {
          bookingId: String(form.get("bookingId")),
          item: String(form.get("item")),
          done: String(form.get("done")) === "true",
        });
        await load();
      });
    }

    const invoiceForm = document.querySelector("#invoiceForm");
    if (invoiceForm) {
      invoiceForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        await post("/api/invoices", {
          bookingId: String(form.get("bookingId")),
          invoiceCode: String(form.get("invoiceCode")),
          amount: Number(form.get("amount")),
          status: String(form.get("status")),
        });
        await load();
      });
    }
  }

  function render() {
    let tabContent = "";
    if (state.activeTab === "overview") tabContent = renderOverviewTab();
    if (state.activeTab === "bookings") tabContent = renderBookingsTab();
    if (state.activeTab === "ops") tabContent = renderOpsTab();
    if (state.activeTab === "quality") tabContent = renderQualityTab();
    if (state.activeTab === "billing") tabContent = renderBillingTab();

    app.innerHTML = `${renderMetrics()}${tabContent}`;
    bindTabLinks();
    bindForms();
  }

  async function load() {
    app.innerHTML = '<div class="settings-note">Refreshing operations workspace...</div>';
    const response = await fetch("/api/bootstrap");
    if (!response.ok) {
      throw new Error("Failed to load CleanHome Pro");
    }
    const payload = await response.json();
    state.bookings = payload.bookings;
    state.cleaners = payload.cleaners;
    state.checklists = payload.checklists;
    state.invoices = payload.invoices;
    state.stats = payload.stats;
    render();
  }

  bindTabLinks();
  load().catch((error) => {
    app.innerHTML = `<div class="settings-note">CleanHome Pro could not load: ${error.message}</div>`;
  });
})();
