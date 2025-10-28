// Public/admin.js
// Unified admin dashboard script — includes product CRUD + order management
const BASE_API_URL = "https://website-backend-1-w1qd.onrender.com";

/* =========================
   Helper / Utility
   ========================= */
function qs(selector, parent = document) {
  return parent.querySelector(selector);
}
function qsa(selector, parent = document) {
  return Array.from(parent.querySelectorAll(selector));
}
function showAlert(msg) {
  alert(msg);
}
function escapeHtml(str = "") {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/* =========================
   AUTH CHECK (server-side session)
   ========================= */
async function ensureAdmin() {
  try {
    const res = await fetch(`${BASE_API_URL}/status`, {
      credentials: "include",
    });
    const data = await res.json();
    if (!data.user || data.user.role !== "admin") {
      showAlert("Access denied. Admins only.");
      window.location.href = "../login.html";
      return false;
    }
    return true;
  } catch (err) {
    console.error("Auth check failed:", err);
    return false;
  }
}

/* =========================
   PRODUCT CRUD
   ========================= */
async function loadProducts() {
  try {
    const res = await fetch(`${BASE_API_URL}/products`, {
      credentials: "include",
    });
    const products = await res.json();
    const tbody = qs("#productsTable tbody");
    if (!tbody) return;
    tbody.innerHTML = "";

    if (!products.length) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;">No products found.</td></tr>`;
      return;
    }

    products.forEach((p) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td style="width:64px">${
          p.image ? `<img src="${p.image}" alt="${p.name}" width="50">` : ""
        }</td>
        <td>${escapeHtml(p.name)}</td>
        <td>${escapeHtml(p.category || "")}</td>
        <td>₱${Number(p.price).toFixed(2)}</td>
        <td>
          <span class="status-badge ${
            p.stock > 0 ? "status-active" : "status-inactive"
          }">
            ${p.stock > 0 ? "Available" : "Out of Stock"}
          </span>
        </td>
        <td>
          <button class="action-btn btn-primary" data-action="edit" data-id="${
            p._id
          }">Edit</button>
          <button class="action-btn btn-danger" data-action="delete" data-id="${
            p._id
          }">Delete</button>
        </td>`;
      tbody.appendChild(tr);
    });

    qsa("[data-action='edit']").forEach((btn) =>
      btn.addEventListener("click", () => openEditProductModal(btn.dataset.id))
    );
    qsa("[data-action='delete']").forEach((btn) =>
      btn.addEventListener("click", () => handleDeleteProduct(btn.dataset.id))
    );
  } catch (err) {
    console.error("loadProducts error:", err);
  }
}

function openAddProductModal() {
  qs("#productModal").classList.add("active");
  qs("#productModalTitle").textContent = "Add New Product";
  qs("#productSubmitBtn").textContent = "Add Product";
  const f = qs("#productForm");
  if (f) f.reset();
  qs("#editProductId").value = "";
}

async function openEditProductModal(productId) {
  try {
    const res = await fetch(`${BASE_API_URL}/products`, {
      credentials: "include",
    });
    const products = await res.json();
    const p = products.find((x) => x._id === productId);
    if (!p) return showAlert("Product not found.");

    qs("#editProductId").value = p._id;
    qs("#productName").value = p.name || "";
    qs("#productCategory").value = p.category || "";
    qs("#productPrice").value = p.price ?? "";
    if (qs("#productImage")) qs("#productImage").value = p.image || "";
    if (qs("#productDescription"))
      qs("#productDescription").value = p.description || "";
    if (qs("#productStock")) qs("#productStock").value = p.stock || "";

    qs("#productModalTitle").textContent = "Edit Product";
    qs("#productSubmitBtn").textContent = "Update Product";
    qs("#productModal").classList.add("active");
  } catch (err) {
    console.error("openEditProductModal error:", err);
  }
}

async function handleProductFormSubmit(e) {
  e.preventDefault();
  const id = qs("#editProductId").value;
  const name = qs("#productName").value.trim();
  const category = qs("#productCategory").value.trim();
  const price = parseFloat(qs("#productPrice").value) || 0;
  const image = qs("#productImage") ? qs("#productImage").value.trim() : "";
  const description = qs("#productDescription")
    ? qs("#productDescription").value.trim()
    : "";
  const stock = qs("#productStock")
    ? parseInt(qs("#productStock").value) || 0
    : 0;

  const payload = { name, category, price, image, description, stock };

  try {
    if (id) {
      const res = await fetch(`${BASE_API_URL}/admin/products/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        showAlert("Product updated successfully.");
        qs("#productModal").classList.remove("active");
        await loadProducts();
      } else showAlert("Failed to update product.");
    } else {
      const res = await fetch(`${BASE_API_URL}/admin/products`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        showAlert("Product created.");
        qs("#productForm").reset();
        qs("#productModal").classList.remove("active");
        await loadProducts();
      } else showAlert("Failed to create product.");
    }
  } catch (err) {
    console.error("handleProductFormSubmit error:", err);
  }
}

async function handleDeleteProduct(id) {
  if (!confirm("Delete this product?")) return;
  try {
    const res = await fetch(`${BASE_API_URL}/admin/products/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    const data = await res.json();
    if (data.success) {
      showAlert("Product deleted.");
      await loadProducts();
    } else showAlert("Failed to delete product.");
  } catch (err) {
    console.error("handleDeleteProduct error:", err);
  }
}

/* =========================
   ORDERS (Admin View)
   ========================= */
async function loadOrders() {
  try {
    const res = await fetch(`${BASE_API_URL}/admin/orders`, {
      credentials: "include",
    });
    const result = await res.json();
    const orders = result.orders || [];
    const tbody = qs("#ordersTable tbody");
    if (!tbody) return;
    tbody.innerHTML = "";

    if (!orders.length) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;">No orders found.</td></tr>`;
      return;
    }

    orders.forEach((order) => {
      const date = new Date(order.createdAt).toLocaleDateString();
      const items = order.items
        .map((i) => `${i.name} (${i.quantity})`)
        .join(", ");
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${order._id}</td>
        <td>${order.user?.firstname || "Unknown"} ${
        order.user?.lastname || ""
      }</td>
        <td>${date}</td>
        <td>${items}</td>
        <td>₱${order.totalPrice.toFixed(2)}</td>
        <td>
          <span class="status-badge ${
            order.status === "Completed" ? "status-active" : "status-pending"
          }">
            ${order.status}
          </span>
        </td>
        <td><button class="action-btn btn-success" onclick="viewOrder('${
          order._id
        }')">View</button></td>`;
      tbody.appendChild(row);
    });
  } catch (err) {
    console.error("loadOrders error:", err);
  }
}

function viewOrder(orderId) {
  fetch(`${BASE_API_URL}/admin/orders`, { credentials: "include" })
    .then((res) => res.json())
    .then((result) => {
      const order = result.orders.find((o) => o._id === orderId);
      if (!order) return;
      const detailsDiv = qs("#orderDetails");
      detailsDiv.innerHTML = `
        <p><strong>Order ID:</strong> ${order._id}</p>
        <p><strong>Customer:</strong> ${order.user?.firstname || "Unknown"} ${
        order.user?.lastname || ""
      }</p>
        <p><strong>Email:</strong> ${order.user?.email || "N/A"}</p>
        <p><strong>Total Price:</strong> ₱${order.totalPrice.toFixed(2)}</p>
        <p><strong>Status:</strong> ${order.status}</p>
        <p><strong>Items:</strong></p>
        <ul>${order.items
          .map((i) => `<li>${i.name} (${i.quantity})</li>`)
          .join("")}</ul>`;
      openModal("orderModal");
    })
    .catch((err) => console.error("Error loading order details:", err));
}

/* =========================
   UI Helpers
   ========================= */
function openModal(id) {
  qs(`#${id}`).classList.add("active");
}
function closeModal(id) {
  qs(`#${id}`).classList.remove("active");
}
function showSection(id) {
  qsa(".content-section").forEach((sec) => sec.classList.remove("active"));
  qs(`#${id}`).classList.add("active");
  qsa(".nav-item").forEach((nav) => nav.classList.remove("active"));
  const activeNav = Array.from(qsa(".nav-item")).find((n) =>
    n.textContent.toLowerCase().includes(id)
  );
  if (activeNav) activeNav.classList.add("active");
  if (id === "products") loadProducts();
  if (id === "orders") loadOrders();
}

/* =========================
   INIT
   ========================= */
async function initAdminDashboard() {
  const ok = await ensureAdmin();
  if (!ok) return;

  const addBtn = qs("button[onclick='openProductModal()']");
  if (addBtn) addBtn.addEventListener("click", openAddProductModal);

  const productForm = qs("#productForm");
  if (productForm)
    productForm.addEventListener("submit", handleProductFormSubmit);

  qsa(".close-btn").forEach((btn) =>
    btn.addEventListener("click", (e) => {
      const modal = e.currentTarget.closest(".modal");
      if (modal) modal.classList.remove("active");
    })
  );

  await loadProducts();
  await loadOrders();
}

document.addEventListener("DOMContentLoaded", initAdminDashboard);
