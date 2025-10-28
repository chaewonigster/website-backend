const BASE_API_URL = "https://website-backend-1-w1qd.onrender.com";

document.addEventListener("DOMContentLoaded", () => {
  checkAdminSession();
  loadProducts();
  loadOrders();
  loadUsers();

  // handle add/edit product form
  document
    .getElementById("productForm")
    .addEventListener("submit", handleProductSubmit);
});

// ✅ Check if admin is logged in
async function checkAdminSession() {
  try {
    const res = await fetch(`${BASE_API_URL}/status`, {
      credentials: "include",
    });
    const data = await res.json();

    if (!data.loggedIn || data.user.role !== "admin") {
      alert("You must be logged in as admin to access this page.");
      window.location.href = "../login.html";
    }
  } catch (err) {
    console.error("Error checking session:", err);
  }
}

// ✅ Load all products
async function loadProducts() {
  const tableBody = document.querySelector("#productsTable tbody");
  tableBody.innerHTML = `<tr><td colspan="7">Loading...</td></tr>`;

  try {
    const res = await fetch(`${BASE_API_URL}/products`, {
      credentials: "include",
    });
    const products = await res.json();

    tableBody.innerHTML = "";
    products.forEach((p) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${p._id}</td>
        <td>${p.name}</td>
        <td>${p.category || "N/A"}</td>
        <td>₱${p.price}</td>
        <td>${p.stock || 0}</td>
        <td><span class="status-badge ${
          p.stock > 0 ? "status-active" : "status-inactive"
        }">
          ${p.stock > 0 ? "Active" : "Out of Stock"}</span>
        </td>
        <td>
          <button class="action-btn btn-primary" onclick="openEditProduct('${
            p._id
          }','${p.name}','${p.category}','${p.price}','${
        p.stock
      }')">✏️ Edit</button>
          <button class="action-btn btn-danger" onclick="deleteProduct('${
            p._id
          }')">🗑️ Delete</button>
        </td>
      `;
      tableBody.appendChild(tr);
    });
  } catch (err) {
    console.error("Error loading products:", err);
    tableBody.innerHTML = `<tr><td colspan="7">Error loading products.</td></tr>`;
  }
}

// ✅ Add or Edit product
async function handleProductSubmit(e) {
  e.preventDefault();

  const id = document.getElementById("editProductId").value;
  const name = document.getElementById("productName").value;
  const category = document.getElementById("productCategory").value;
  const price = parseFloat(document.getElementById("productPrice").value);
  const stock = parseInt(document.getElementById("productStock").value);

  const payload = { name, category, price, stock };

  try {
    const res = await fetch(
      id
        ? `${BASE_API_URL}/admin/products/${id}`
        : `${BASE_API_URL}/admin/products`,
      {
        method: id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      }
    );

    const data = await res.json();
    if (data.success) {
      alert(id ? "✅ Product updated!" : "✅ Product added!");
      closeModal("productModal");
      loadProducts();
      e.target.reset();
      document.getElementById("editProductId").value = "";
      document.getElementById("productSubmitBtn").textContent = "Add Product";
      document.getElementById("productModalTitle").textContent =
        "Add New Product";
    } else {
      alert("❌ Operation failed.");
    }
  } catch (err) {
    console.error("Error submitting product:", err);
  }
}

// ✅ Delete a product
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
  }
}

// ✅ Load orders
async function loadOrders() {
  try {
    const res = await fetch(`${BASE_API_URL}/api/orders`);
    const data = await res.json();

    const container = document.querySelector("#orders-list");
    container.innerHTML = "";

    if (!data.success || data.data.length === 0) {
      container.innerHTML = "<p>No orders found</p>";
      return;
    }

    data.data.forEach((order) => {
      const item = document.createElement("div");
      item.classList.add("order-item");
      item.innerHTML = `
        <p><strong>Product:</strong> ${order.product}</p>
        <p><strong>Quantity:</strong> ${order.quantity}</p>
        <p><strong>Price:</strong> ₱${order.price}</p>
        <p><strong>Buyer:</strong> ${order.buyer}</p>
        <p><strong>Email:</strong> ${order.buyerEmail}</p>
        <button class="delete-order" data-id="${order._id}">Delete</button>
      `;
      container.appendChild(item);
    });

    // 🗑️ Delete button
    document.querySelectorAll(".delete-order").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        const id = e.target.dataset.id;
        if (confirm("Delete this order?")) {
          await fetch(`${BASE_API_URL}/api/orders/${id}`, {
            method: "DELETE",
          });
          loadOrders(); // refresh
        }
      });
    });
  } catch (err) {
    console.error("Error loading orders:", err);
  }
}

// ✅ Modal controls
function openProductModal() {
  document.getElementById("productModal").classList.add("active");
}

function closeModal(id) {
  document.getElementById(id).classList.remove("active");
}

// ✅ Open Edit Product Modal
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

// ✅ View order details
async function viewOrder(id) {
  try {
    const res = await fetch(`${BASE_API_URL}/api/order`, {
      credentials: "include",
    });
    const data = await res.json();
    const order = (data.orders || []).find((o) => o._id === id);

    if (!order) return alert("Order not found.");

    const details = document.getElementById("orderDetails");
    details.innerHTML = `
      <p><strong>Order ID:</strong> ${order._id}</p>
      <p><strong>Customer:</strong> ${order.buyer}</p>
      <p><strong>Email:</strong> ${order.buyerEmail}</p>
      <p><strong>Product:</strong> ${order.product}</p>
      <p><strong>Quantity:</strong> ${order.quantity}</p>
      <p><strong>Total:</strong> ₱${order.total}</p>
      <p><strong>Status:</strong> ${order.status || "pending"}</p>
    `;

    document.getElementById("orderModal").classList.add("active");
  } catch (err) {
    console.error("Error viewing order:", err);
  }
}

// ✅ Navigation control
function showSection(sectionId) {
  document
    .querySelectorAll(".content-section")
    .forEach((s) => s.classList.remove("active"));
  document.getElementById(sectionId).classList.add("active");

  document
    .querySelectorAll(".nav-item")
    .forEach((n) => n.classList.remove("active"));
  document
    .querySelector(`.nav-item[onclick="showSection('${sectionId}')"]`)
    ?.classList.add("active");
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
      alert("❌ Failed to delete order: " + data.message);
    }
  } catch (err) {
    console.error("Error deleting order:", err);
  }
}

async function loadUsers() {
  try {
    const res = await fetch(`${BASE_API_URL}/api/users`);
    const data = await res.json();

    const container = document.querySelector("#users-list");
    container.innerHTML = "";

    if (!data.success || data.data.length === 0) {
      container.innerHTML = "<p>No users found</p>";
      return;
    }

    data.data.forEach((user) => {
      const item = document.createElement("div");
      item.classList.add("user-item");
      item.innerHTML = `
        <p><strong>Name:</strong> ${user.firstname} ${user.lastname}</p>
        <p><strong>Email:</strong> ${user.email}</p>
        <p><strong>Role:</strong> ${user.role}</p>
      `;
      container.appendChild(item);
    });
  } catch (err) {
    console.error("Error loading users:", err);
  }
}

function showSection(sectionId) {
  document
    .querySelectorAll(".content-section")
    .forEach((s) => s.classList.remove("active"));
  document.getElementById(sectionId).classList.add("active");

  document
    .querySelectorAll(".nav-item")
    .forEach((n) => n.classList.remove("active"));
  document
    .querySelector(`.nav-item[onclick="showSection('${sectionId}')"]`)
    ?.classList.add("active");
}
