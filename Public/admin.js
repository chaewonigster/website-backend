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
    if (sectionId === "products") loadProducts();
    if (sectionId === "users") loadUsers();
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
    const products = await res.json(); // your /products returns array

    if (!Array.isArray(products) || products.length === 0) {
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
        <td>₱${(p.price ?? 0).toFixed ? p.price.toFixed(2) : p.price}</td>
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
    console.error("Error loading products:", err);
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
  console.log("🔍 tbody found:", tbody); // ✅ FIX
  if (!tbody) return;
  tbody.innerHTML = `<tr><td colspan="7">Loading orders...</td></tr>`;

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
    console.log("🧾 Parsed orders:", orders); // ✅ FIX

    if (!orders || orders.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;">No orders found.</td></tr>`;
      return;
    }

    tbody.innerHTML = "";
    console.log("✅ Rendering orders:", orders.length);

    orders.forEach((order, index) => {
      console.log("Rendering order:", index, order);
      const dateStr = order.timestamp
        ? new Date(order.timestamp).toLocaleString()
        : "";
      const total = (order.price ?? 0) * (order.quantity ?? 1);
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${order._id}</td>
        <td>${escapeHtml(order.buyer || "Unknown")}</td>
        <td>${escapeHtml(order.buyerEmail || "N/A")}</td>
        <td>${escapeHtml(order.product || "N/A")}</td>
        <td>₱${
          (order.price ?? 0).toFixed ? order.price.toFixed(2) : order.price
        }</td>
        <td>${order.quantity ?? 1}</td>
        <td>${dateStr}</td>
        <td>
          <button class="action-btn btn-primary" onclick="viewOrder('${
            order._id
          }')">🔍 View</button>
          <button class="action-btn btn-danger" onclick="deleteOrder('${
            order._id
          }')">🗑️</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error("Error loading orders:", err);
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;">Error loading orders.</td></tr>`;
  }
  setTimeout(() => {
    console.log(
      "🔍 After render, tbody children:",
      document.querySelectorAll("#ordersTable tbody tr").length
    );
  }, 1000);
}

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
