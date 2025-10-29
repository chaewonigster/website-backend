// Public/admin.js — REPLACE your current admin.js with this fixed file
const BASE_API_URL = "https://website-backend-1-w1qd.onrender.com";

/* -------------------------
   Navigation / utilities
   ------------------------- */
function showSection(sectionId) {
  // hide all sections
  document
    .querySelectorAll(".content-section")
    .forEach((s) => s.classList.remove("active"));
  // show requested
  const sec = document.getElementById(sectionId);
  if (sec) sec.classList.add("active");

  // nav highlight
  document
    .querySelectorAll(".nav-item")
    .forEach((n) => n.classList.remove("active"));
  const clicked = Array.from(document.querySelectorAll(".nav-item")).find(
    (item) => item.getAttribute("onclick")?.includes(sectionId)
  );
  if (clicked) clicked.classList.add("active");

  // header text
  const headerTitle = document.querySelector(".header h1");
  if (headerTitle)
    headerTitle.textContent =
      sectionId.charAt(0).toUpperCase() + sectionId.slice(1);

  // ✅ FIX: ensure section data loads *after* DOM exists
  setTimeout(() => {
    if (sectionId === "orders") {
      console.log("📋 Orders section opened — calling loadOrders()");
      loadOrders();
    }
    if (sectionId === "orders") loadOrders();
    if (sectionId === "products") loadProducts();
    if (sectionId === "users") loadUsers();
    if (sectionId === "inventory") loadInventory();
  }, 100);
}

/* -------------------------
   Init
   ------------------------- */
document.addEventListener("DOMContentLoaded", () => {
  console.log("✅ Admin.js loaded and DOM ready"); // ✅ FIX
  // require admin session for the page
  checkAdminSession();

  // wire product form if present
  const productForm = document.getElementById("productForm");
  if (productForm) productForm.addEventListener("submit", handleProductSubmit);

  // default view
  showSection("overview");
  loadUsers();
  loadRecentOrders();
  updateDashboardStats();
  setInterval(updateDashboardStats, 60000);

  // ✅ FIX: also log and test that #ordersTable exists
  const tbodyTest = document.querySelector("#ordersTable tbody");
  console.log("🔍 DOM check on load — tbody found:", tbodyTest);
  // 🧊 Detect when the Orders section becomes visible
  const ordersNav = document.querySelector(
    "a[href='#orders'], .nav-item.orders, .menu-item.orders"
  ); // match depending on your sidebar HTML
  const observerTarget = document.querySelector("#ordersTable");

  function tryLoadOrders() {
    const tbody = document.querySelector("#ordersTable tbody");
    if (tbody && tbody.offsetParent !== null) {
      // section visible
      console.log("📦 Orders tab visible — loading orders now...");
      loadOrders();
    } else {
      console.log("⏳ Waiting for Orders tab to be visible...");
      setTimeout(tryLoadOrders, 500);
    }
  }

  // Run once after full page load (for safety)
  setTimeout(tryLoadOrders, 1000);
});

/* -------------------------
   Auth check
   ------------------------- */
async function checkAdminSession() {
  try {
    const res = await fetch(`${BASE_API_URL}/status`, {
      credentials: "include",
    });
    const data = await res.json();
    if (!data.loggedIn || data.user.role !== "admin") {
      alert("You must be logged in as admin to access this page.");
      window.location.href = "../Login.html";
      return false;
    }
    return true;
  } catch (err) {
    console.error("Error checking session:", err);
    return false;
  }
}
async function updateDashboardStats() {
  try {
    const res = await fetch(`${BASE_API_URL}/api/orders`, {
      credentials: "include",
    });
    const payload = await res.json();

    const orders = Array.isArray(payload)
      ? payload
      : Array.isArray(payload.data)
      ? payload.data
      : [];

    if (!orders.length) return;

    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // 🧾 Total revenue (all orders)
    const totalRevenue = orders.reduce((sum, order) => {
      const total = (order.price ?? 0) * (order.quantity ?? 1);
      return sum + total;
    }, 0);

    // 📦 Orders in last 24 hours
    const ordersToday = orders.filter(
      (order) => new Date(order.timestamp) >= last24h
    ).length;

    // 💰 Update the dashboard
    document.querySelector(
      ".stat-card:nth-child(1) .stat-value"
    ).textContent = `₱${totalRevenue.toLocaleString(undefined, {
      minimumFractionDigits: 2,
    })}`;

    document.querySelector(".stat-card:nth-child(2) .stat-value").textContent =
      ordersToday;
  } catch (err) {
    console.error("Error updating dashboard stats:", err);
  }
}

async function loadRecentOrders() {
  const tbody = document.querySelector("#recentOrdersTable tbody");
  if (!tbody) return;
  tbody.innerHTML = `<tr><td colspan="8">Loading recent orders...</td></tr>`;

  try {
    const res = await fetch(`${BASE_API_URL}/api/orders`, {
      credentials: "include",
    });
    const payload = await res.json();

    const orders = Array.isArray(payload)
      ? payload
      : Array.isArray(payload.data)
      ? payload.data
      : [];

    if (!orders || orders.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;">No recent orders.</td></tr>`;
      return;
    }

    // Sort by most recent (timestamp descending)
    const recentOrders = orders
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 5);

    tbody.innerHTML = "";

    recentOrders.forEach((order) => {
      const dateStr = order.timestamp
        ? new Date(order.timestamp).toLocaleString()
        : "N/A";
      const total = (order.price ?? 0) * (order.quantity ?? 1);
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${order._id}</td>
        <td>${escapeHtml(order.buyer || "Unknown")}</td>
        <td>${escapeHtml(order.product || "N/A")}</td>
        <td>₱${total.toFixed(2)}</td>
        <td>${dateStr}</td>
        <td><button class="action-btn btn-primary" onclick="showSection('orders')">🔍 View</button></td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error("Error loading recent orders:", err);
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;">Error loading recent orders.</td></tr>`;
  }
}

/* -------------------------
   PRODUCTS (table #productsTable tbody)
   ------------------------- */
async function loadProducts() {
  const tbody = document.querySelector("#productsTable tbody");
  if (!tbody) return;
  tbody.innerHTML = `<tr><td colspan="7">Loading products...</td></tr>`;

  try {
    const res = await fetch(`${BASE_API_URL}/api/products`, {
      credentials: "include",
    });
    const payload = await res.json();
    const products = Array.isArray(payload)
      ? payload
      : Array.isArray(payload.data)
      ? payload.data
      : [];

    if (!products.length) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;">No products found.</td></tr>`;
      return;
    }

    tbody.innerHTML = "";
    products.forEach((p) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${p._id || ""}</td>
        <td>${escapeHtml(p.name || "")}</td>
        <td>${escapeHtml(p.category || "")}</td>
        <td>₱${(p.price ?? 0).toFixed(2)}</td>
        <td>${p.stock ?? 0}</td>
        <td>
          <span class="status-badge ${
            p.stock > 0 ? "status-active" : "status-inactive"
          }">
            ${p.stock > 0 ? "Active" : "Out of Stock"}
          </span>
        </td>
        <td>
          <button class="action-btn btn-primary" onclick="openEditProduct('${
            p._id
          }','${escapeAttr(p.name)}','${escapeAttr(p.category)}','${
        p.price ?? 0
      }','${p.stock ?? 0}')">✏️ Edit</button>
          <button class="action-btn btn-danger" onclick="deleteProduct('${
            p._id
          }')">🗑️ Delete</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error("❌ Error loading products:", err);
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;">Error loading products.</td></tr>`;
  }
}

function escapeHtml(str = "") {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
// helper for putting into single-quoted onclick args
function escapeAttr(str = "") {
  return String(str).replaceAll("'", "\\'").replaceAll("\n", " ");
}
function filterProducts(searchValue) {
  const filter = searchValue.toLowerCase();
  const table = document.getElementById("productsTable");
  const rows = table.getElementsByTagName("tr");

  let hasVisible = false;

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const productName = row.cells[1]?.textContent.toLowerCase() || "";
    const category = row.cells[2]?.textContent.toLowerCase() || "";

    if (productName.includes(filter) || category.includes(filter)) {
      row.style.display = "";
      hasVisible = true;
    } else {
      row.style.display = "none";
    }
  }

  // Optional: Show message if nothing matches
  const tbody = table.querySelector("tbody");
  const noResults = tbody.querySelector(".no-results-row");
  if (!hasVisible) {
    if (!noResults) {
      const row = document.createElement("tr");
      row.classList.add("no-results-row");
      const cell = document.createElement("td");
      cell.colSpan = 7;
      cell.textContent = "No matching products found.";
      row.appendChild(cell);
      tbody.appendChild(row);
    }
  } else if (noResults) {
    noResults.remove();
  }
}

async function handleProductSubmit(e) {
  e.preventDefault();
  const id = document.getElementById("editProductId").value;
  const name = document.getElementById("productName").value.trim();
  const category = document.getElementById("productCategory").value;
  const price = parseFloat(document.getElementById("productPrice").value) || 0;
  const stock = parseInt(document.getElementById("productStock").value) || 0;

  const payload = { name, category, price, stock };

  try {
    const endpoint = id
      ? `${BASE_API_URL}/admin/products/${id}`
      : `${BASE_API_URL}/admin/products`;
    const res = await fetch(endpoint, {
      method: id ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (data.success) {
      alert(id ? "✅ Product updated!" : "✅ Product added!");
      closeModal("productModal");
      document.getElementById("productForm").reset();
      loadProducts();
      document.getElementById("editProductId").value = "";
      document.getElementById("productSubmitBtn").textContent = "Add Product";
      document.getElementById("productModalTitle").textContent =
        "Add New Product";
    } else {
      console.warn("product operation response:", data);
      alert("❌ Operation failed.");
    }
  } catch (err) {
    console.error("Error submitting product:", err);
    alert("❌ Error submitting product (see console).");
  }
}

async function deleteProduct(id) {
  if (!confirm("Are you sure you want to delete this product?")) return;
  try {
    const res = await fetch(`${BASE_API_URL}/admin/products/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    const data = await res.json();
    if (data.success) {
      alert("🗑️ Product deleted!");
      loadProducts();
    } else {
      alert("❌ Failed to delete product.");
    }
  } catch (err) {
    console.error("Error deleting product:", err);
    alert("❌ Error deleting product (see console).");
  }
}
// 🧊 Automatically load Orders when Orders tab is clicked

/* -------------------------
   ORDERS (table #ordersTable tbody)
   ------------------------- */
async function loadOrders() {
  const tbody = document.querySelector("#ordersTable tbody");
  if (!tbody) return;
  tbody.innerHTML = `<tr><td colspan="8">Loading orders...</td></tr>`;

  try {
    const res = await fetch(`${BASE_API_URL}/api/orders`, {
      credentials: "include",
    });
    const payload = await res.json();
    const orders = Array.isArray(payload)
      ? payload
      : Array.isArray(payload.data)
      ? payload.data
      : [];

    if (!orders.length) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;">No orders found.</td></tr>`;
      return;
    }

    // 🔹 Group orders by buyerEmail + rounded timestamp (1 min interval)
    const grouped = {};
    orders.forEach((order) => {
      const date = new Date(order.timestamp);
      date.setSeconds(0, 0); // group within same minute
      const key = `${order.buyerEmail || "guest"}-${date.toISOString()}`;

      if (!grouped[key]) {
        grouped[key] = {
          id: order._id, // ✅ Keep the first order ID
          buyer: order.buyer,
          buyerEmail: order.buyerEmail,
          timestamp: date,
          items: [],
          total: 0,
          statuses: [],
        };
      }

      // Combine same products
      const existing = grouped[key].items.find((i) => i.name === order.product);
      if (existing) {
        existing.quantity += order.quantity;
        existing.subtotal += order.price * order.quantity;
      } else {
        grouped[key].items.push({
          name: order.product,
          quantity: order.quantity,
          price: order.price,
          subtotal: order.price * order.quantity,
        });
      }

      grouped[key].total += order.price * order.quantity;
      if (order.status) grouped[key].statuses.push(order.status);
    });

    tbody.innerHTML = "";

    // ✅ Build properly aligned rows (8 columns)
    Object.values(grouped).forEach((group, index) => {
      const dateStr = new Date(group.timestamp).toLocaleString();
      const itemList = group.items
        .map((i) => `${i.name} ×${i.quantity}`)
        .join(", ");
      const status =
        group.statuses[group.statuses.length - 1] || "Order Placed";

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${group.id || "—"}</td>
        <td>${group.buyer || "Unknown"}</td>
        <td>${group.buyerEmail || "N/A"}</td>
        <td>${dateStr}</td>
        <td>${itemList}</td>
        <td>₱${group.total.toFixed(2)}</td>
        <td>${status}</td>
        <td style="text-align:center;">
          <button class="action-btn btn-primary" onclick="viewGroupedOrder(${index})">🔍 View</button>
        </td>
      `;
      tbody.appendChild(tr);
    });

    // ✅ Store grouped data globally for the View button
    window.groupedOrders = Object.values(grouped);
  } catch (err) {
    console.error("Error loading orders:", err);
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;">Error loading orders.</td></tr>`;
  }
}

function viewGroupedOrder(index) {
  const order = window.groupedOrders[index];
  if (!order) return;

  const details = `
    <p><strong>Customer:</strong> ${order.buyer}</p>
    <p><strong>Email:</strong> ${order.buyerEmail}</p>
    <p><strong>Date:</strong> ${new Date(order.timestamp).toLocaleString()}</p>
    <p><strong>Items:</strong><br>${order.items
      .map((i) => `${i.name} ×${i.quantity} — ₱${i.subtotal.toFixed(2)}`)
      .join("<br>")}</p>
    <p><strong>Total:</strong> ₱${order.total.toFixed(2)}</p>
    <p><strong>Status:</strong> ${
      order.statuses[order.statuses.length - 1] || "Order Placed"
    }</p>
  `;

  document.getElementById("orderDetails").innerHTML = details;
  openOrderModal(); // ✅ now uses proper modal open helper
}

// ----- modal helpers: open/close + event handlers -----
function openOrderModal() {
  const modal = document.getElementById("orderModal");
  if (!modal) return;
  // use flex so the modal-content can be perfectly centered with CSS
  modal.style.display = "flex";
  // focus trap: let keyboard users close with Escape
  document.addEventListener("keydown", escCloseHandler);
}

function closeOrderModal() {
  const modal = document.getElementById("orderModal");
  if (!modal) return;
  modal.style.display = "none";
  document.removeEventListener("keydown", escCloseHandler);
}

function escCloseHandler(e) {
  if (e.key === "Escape") closeModal();
}

// Close when clicking the X or clicking outside the modal box
// Attach handlers once the DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  // Close buttons (supports one or multiple close buttons)
  document.querySelectorAll(".close-btn").forEach((btn) => {
    btn.addEventListener("click", closeOrderModal);
  });

  // Click outside modal-content to close
  const modal = document.getElementById("orderModal");
  if (modal) {
    modal.addEventListener("click", (evt) => {
      // If the clicked element is the overlay (modal), close.
      // This prevents clicks inside .modal-content from closing it.
      if (evt.target === modal) closeModal();
    });
  }
});

async function viewOrder(id) {
  try {
    const res = await fetch(`${BASE_API_URL}/api/orders`, {
      credentials: "include",
    });
    const payload = await res.json();
    const orders = payload && payload.data ? payload.data : [];
    const order = orders.find((o) => String(o._id) === String(id));
    if (!order) return alert("Order not found");

    const details = document.getElementById("orderDetails");
    details.innerHTML = `
      <p><strong>Order ID:</strong> ${order._id}</p>
      <p><strong>Customer:</strong> ${escapeHtml(order.buyer || "Unknown")}</p>
      <p><strong>Email:</strong> ${escapeHtml(order.buyerEmail || "N/A")}</p>
      <p><strong>Product:</strong> ${escapeHtml(order.product || "N/A")}</p>
      <p><strong>Quantity:</strong> ${order.quantity}</p>
      <p><strong>Price each:</strong> ₱${
        (order.price ?? 0).toFixed ? order.price.toFixed(2) : order.price
      }</p>
      <p><strong>Total:</strong> ₱${(
        (order.price ?? 0) * (order.quantity ?? 1)
      ).toFixed(2)}</p>
      <p><strong>Date:</strong> ${
        order.timestamp ? new Date(order.timestamp).toLocaleString() : ""
      }</p>
    `;
    document.getElementById("orderModal").classList.add("active");
  } catch (err) {
    console.error("Error viewing order:", err);
    alert("Error viewing order (see console).");
  }
}

async function deleteOrder(id) {
  if (!confirm("Are you sure you want to delete this order?")) return;
  try {
    const res = await fetch(`${BASE_API_URL}/api/orders/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    const data = await res.json();
    if (data.success) {
      alert("🗑️ Order deleted!");
      loadOrders();
    } else {
      alert("Failed to delete order: " + (data.message || ""));
    }
  } catch (err) {
    console.error("Error deleting order:", err);
    alert("Error deleting order (see console).");
  }
}

/* -------------------------
   USERS (table #usersTable tbody)
   ------------------------- */
async function loadUsers() {
  const tbody = document.querySelector("#usersTable tbody");
  if (!tbody) return;
  tbody.innerHTML = `<tr><td colspan="5">Loading users...</td></tr>`;

  try {
    const res = await fetch(`${BASE_API_URL}/api/users`, {
      credentials: "include",
    });
    const payload = await res.json(); // { success, data }
    const users =
      payload && payload.data
        ? payload.data
        : Array.isArray(payload)
        ? payload
        : [];

    if (!users || users.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;">No users found.</td></tr>`;
      return;
    }

    tbody.innerHTML = "";
    users.forEach((u, idx) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${idx + 1}</td>
        <td>${escapeHtml((u.firstname || "") + " " + (u.lastname || ""))}</td>
        <td>${escapeHtml(u.email || "")}</td>
        <td>${escapeHtml(u.contact || "N/A")}</td>
        <td>${escapeHtml(u.role || "user")}</td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error("Error loading users:", err);
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;">Error loading users.</td></tr>`;
  }
}

/* -------------------------
   INVENTORY (table #inventoryTable tbody)
   ------------------------- */
async function loadInventory() {
  const tbody = document.querySelector("#inventoryTable tbody");
  if (!tbody) return;
  tbody.innerHTML = `<tr><td colspan="6">Loading inventory...</td></tr>`;

  try {
    const res = await fetch(`${BASE_API_URL}/api/products`, {
      credentials: "include",
    });
    const payload = await res.json();
    const products = Array.isArray(payload)
      ? payload
      : Array.isArray(payload.data)
      ? payload.data
      : [];

    if (!products.length) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;">No inventory data found.</td></tr>`;
      return;
    }

    tbody.innerHTML = "";
    products.forEach((p) => {
      const reorderLevel = p.reorderLevel ?? 10;
      const statusClass =
        p.stock === 0
          ? "status-inactive"
          : p.stock <= reorderLevel
          ? "status-pending"
          : "status-active";
      const statusText =
        p.stock === 0
          ? "Out of Stock"
          : p.stock <= reorderLevel
          ? "Low Stock"
          : "In Stock";

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${escapeHtml(p.name || "")}</td>
        <td>${escapeHtml(p.sku || p._id || "N/A")}</td>
        <td>${p.stock ?? 0}</td>
        <td>${reorderLevel}</td>
        <td><span class="status-badge ${statusClass}">${statusText}</span></td>
        <td>
          <button class="action-btn btn-primary" onclick="openEditInventoryItem('${
            p._id
          }', '${escapeAttr(p.name)}', ${
        p.stock ?? 0
      }, ${reorderLevel})">✏️</button>
          <button class="action-btn btn-danger" onclick="deleteProduct('${
            p._id
          }')">🗑️</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error("Error loading inventory:", err);
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;">Error loading inventory.</td></tr>`;
  }
}

/* -------------------------
   EDIT INVENTORY ITEM
   ------------------------- */
/* -------------------------
   EDIT INVENTORY ITEM (robust)
   ------------------------- */
function openEditInventoryItem(id, name = "", stock = 0, reorderLevel = 10) {
  // remove existing modal if any
  const existing = document.getElementById("inventoryEditModal");
  if (existing) existing.remove();

  // build modal DOM so we can attach listeners safely
  const modal = document.createElement("div");
  modal.id = "inventoryEditModal";
  modal.className = "modal active";
  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h2>Edit Inventory</h2>
        <span class="close-btn" id="inventoryEditCloseBtn">&times;</span>
      </div>

      <div style="margin-bottom:12px;">
        <p><strong>${escapeHtml(name)}</strong></p>
      </div>

      <div class="form-group">
        <label>Stock Quantity</label>
        <input type="number" id="editStockQty" class="form-control" value="${stock}" min="0" />
      </div>

      <div class="form-group">
        <label>Reorder Level</label>
        <input type="number" id="editReorderLevel" class="form-control" value="${reorderLevel}" min="0" />
      </div>

      <div style="display:flex; gap:10px; justify-content:flex-end; margin-top:10px;">
        <button class="btn btn-primary" id="inventorySaveBtn">💾 Save</button>
        <button class="btn" id="inventoryCancelBtn">✖ Cancel</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  // wire buttons
  document
    .getElementById("inventoryCancelBtn")
    .addEventListener("click", removeInventoryEditModal);
  document
    .getElementById("inventoryEditCloseBtn")
    .addEventListener("click", removeInventoryEditModal);

  document
    .getElementById("inventorySaveBtn")
    .addEventListener("click", async () => {
      // delegate to save function
      await saveInventoryChanges(id);
    });
}

function removeInventoryEditModal() {
  const el = document.getElementById("inventoryEditModal");
  if (el) el.remove();
}

/**
 * Save changes:
 * - GET current product from /api/products/:id (if available)
 * - Merge new stock/reorderLevel into product object
 * - PUT to /admin/products/:id (same endpoint used by product form)
 */
async function saveInventoryChanges(id) {
  const stockEl = document.getElementById("editStockQty");
  const reorderEl = document.getElementById("editReorderLevel");
  if (!stockEl || !reorderEl) return alert("Inputs not found.");

  const stock = parseInt(stockEl.value, 10);
  const reorderLevel = parseInt(reorderEl.value, 10);

  if (isNaN(stock) || isNaN(reorderLevel)) {
    return alert("Please enter valid numeric values.");
  }

  try {
    // Try to fetch the current product first (so we don't accidentally overwrite other fields)
    let product = null;
    try {
      const getRes = await fetch(`${BASE_API_URL}/api/products/${id}`, {
        credentials: "include",
      });
      const getPayload = await getRes.json();
      // backend may return product directly or under .data
      product =
        getPayload && getPayload.data ? getPayload.data : getPayload || null;
    } catch (err) {
      // not fatal — we will still attempt to send minimal payload
      console.warn("Could not fetch existing product (continuing):", err);
    }

    // Build payload: prefer to preserve existing product fields if we have them
    const payload = product
      ? { ...product, stock, reorderLevel }
      : { stock, reorderLevel };

    // send update to admin endpoint (same endpoint product editor uses)
    const res = await fetch(`${BASE_API_URL}/admin/products/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });

    // attempt to parse JSON safely
    let data = {};
    try {
      data = await res.json();
    } catch (err) {
      console.warn("Non-JSON response from update:", err);
    }

    // handle a common set of success shapes
    const success =
      (typeof data.success !== "undefined" && data.success) ||
      (res.ok && (data || Object.keys(data).length > 0));

    if (success) {
      alert("✅ Inventory updated successfully!");
      removeInventoryEditModal();
      // refresh the UI
      if (typeof loadInventory === "function") loadInventory();
      if (typeof loadProducts === "function") loadProducts();
    } else {
      console.warn("Update failed response:", res.status, data);
      // show backend message if available
      const msg = data && (data.message || data.error || data.msg);
      alert("❌ Failed to update inventory." + (msg ? " — " + msg : ""));
    }
  } catch (err) {
    console.error("Error saving inventory changes:", err);
    alert("❌ Error saving changes (see console).");
  }
}

/* -------------------------
   Modal helpers
   ------------------------- */
function openProductModal() {
  document.getElementById("productModal").classList.add("active");
}
function closeModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove("active");
}

function openEditProduct(id, name, category, price, stock) {
  document.getElementById("editProductId").value = id;
  document.getElementById("productName").value = name;
  document.getElementById("productCategory").value = category;
  document.getElementById("productPrice").value = price;
  document.getElementById("productStock").value = stock;
  document.getElementById("productSubmitBtn").textContent = "Update Product";
  document.getElementById("productModalTitle").textContent = "Edit Product";
  openProductModal();
}
