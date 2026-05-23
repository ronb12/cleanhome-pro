(() => {
  const key = "cleanhome-pro-v1";
  const state = JSON.parse(localStorage.getItem(key) || "null") || {
    leads: [{ id: crypto.randomUUID(), customer: "Bradley Home", service: "Deep Clean", total: 295, status: "Booked" }],
    checklist: [true, false, false, false, false],
  };
  const save = () => localStorage.setItem(key, JSON.stringify(state));

  const toast = document.querySelector("#toast");
  const homeSize = document.querySelector("#homeSize");
  const cleanType = document.querySelector("#cleanType");
  const estimateTotal = document.querySelector("#estimateTotal");
  const bookingCard = document.querySelector(".booking-card");
  const jobs = document.querySelector(".jobs");
  const summary = document.querySelector(".summary");
  const checklist = document.querySelectorAll(".checklist input");

  const priceMap = { "2 bed / 1 bath": 165, "3 bed / 2 bath": 240, "4 bed / 3 bath": 325 };
  const cleanTypeAddOn = { "Standard Clean": 0, "Deep Clean": 55, "Move-out Clean": 90 };

  bookingCard.insertAdjacentHTML("afterbegin", `<label>Customer name<input id="customerName" placeholder="Customer name" /></label>`);

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add("show");
    window.setTimeout(() => toast.classList.remove("show"), 1700);
  }

  function updateEstimate() {
    const base = priceMap[homeSize.value] || 240;
    const addOn = cleanTypeAddOn[cleanType.value] || 0;
    estimateTotal.textContent = `$${base + addOn}`;
  }

  function render() {
    const revenue = state.leads.reduce((sum, lead) => sum + lead.total, 0);
    summary.innerHTML = `<span>Today booked</span><strong>$${revenue.toLocaleString()}</strong><p>${state.leads.length} jobs • 2 cleaners • ${state.leads.filter((lead) => lead.status === "Quote Sent").length} quote pending</p>`;
    jobs.innerHTML = `<h2>Today's Schedule</h2>${state.leads.map((lead, index) => `<div class="job"><b>${index === 0 ? "9:00 AM" : index === 1 ? "12:30 PM" : "3:00 PM"}</b><span>${lead.service} - ${lead.customer}</span><em>${lead.status}</em></div>`).join("")}`;
    checklist.forEach((box, index) => { box.checked = Boolean(state.checklist[index]); });
    save();
  }

  homeSize.addEventListener("change", updateEstimate);
  cleanType.addEventListener("change", updateEstimate);
  checklist.forEach((box, index) => {
    box.addEventListener("change", () => {
      state.checklist[index] = box.checked;
      save();
    });
  });

  document.querySelector("#quoteBtn").addEventListener("click", () => {
    const customer = document.querySelector("#customerName").value.trim() || "New Customer";
    state.leads.unshift({
      id: crypto.randomUUID(),
      customer,
      service: cleanType.value,
      total: Number(estimateTotal.textContent.replace(/[$,]/g, "")),
      status: "Quote Sent",
    });
    render();
    showToast(`Quote saved for ${customer}.`);
  });

  document.querySelector("#routeBtn").addEventListener("click", () => {
    state.leads.sort((a, b) => a.total - b.total);
    render();
    showToast("Route reordered by the shortest-paying stops for a tighter day.");
  });

  updateEstimate();
  render();
})();
