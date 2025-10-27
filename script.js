const BASE_API_URL = "https://website-backend-1-w1qd.onrender.com";

document.addEventListener("DOMContentLoaded", () => {
  // ✅ Load user from localStorage instead of server session
  const storedUser = JSON.parse(localStorage.getItem("user"));

  if (storedUser) {
    const f = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val || "N/A";
    };

    f("firstname", storedUser.firstname);
    f("middlename", storedUser.middlename);
    f("lastname", storedUser.lastname);
    f("email", storedUser.email);
    f("address", storedUser.address);
    f("contact", storedUser.contact);
  } else {
    console.log("⚠️ No user data found in localStorage.");
    // Optional redirect:
    // window.location.href = "login.html";
  }

  document.querySelectorAll(".add-to-cart").forEach((button) => {
    button.addEventListener("click", () => {
      const product = button.closest(".product");
      const productName = button.parentElement.querySelector("h3").innerText;
      const priceText = button.parentElement.querySelector("p").innerText;
      const price = parseFloat(priceText.replace("₱", "").trim());
      const imageSrc = product.querySelector("img").src;

      addToCart(productName, price, imageSrc);
    });
  });

  function loadCart() {
    const cart = JSON.parse(localStorage.getItem("cart")) || [];
    const cartItemsContainer = document.getElementById("cart-items");
    if (!cartItemsContainer) return;

    cartItemsContainer.innerHTML = "";

    const cleanPrice = (raw) => {
      if (typeof raw === "string") {
        return parseFloat(raw.replace(/[₱,]/g, "").trim());
      }
      return Number(raw);
    };

    cart.forEach((item) => {
      if (typeof item.price !== "number") {
        console.warn("Skipping cart item with invalid price:", item);
        return;
      }

      const cartItem = document.createElement("div");
      cartItem.classList.add("cart-item");
      cartItem.innerHTML = `
                <img src="${item.imageSrc}" alt="${item.name}" width="50">
                <span>${item.name}</span>
                <span>₱${item.price.toFixed(2)}</span>
                <span>Qty: ${item.quantity}</span>
            `;
      cartItemsContainer.appendChild(cartItem);
    });
  }

  if (document.getElementById("cart-items")) {
    loadCart();
  }

  document.getElementById("loginForm")?.addEventListener("submit", handleLogin);
  document
    .getElementById("registerForm")
    ?.addEventListener("submit", handleRegister);

  const checkoutBtn = document.getElementById("checkout-btn");
  if (checkoutBtn) {
    checkoutBtn.addEventListener("click", () => {
      let cart = JSON.parse(localStorage.getItem("cart")) || [];
      if (cart.length === 0) {
        alert("Your cart is empty!");
        return;
      }
      window.location.href = "checkout.html";
    });
  }

  document.querySelectorAll(".buy-now").forEach((button) => {
    button.addEventListener("click", function () {
      buyNow(this);
      const product = button.closest(".product");
      const productName = product.querySelector("h3").innerText;
      const priceText = product.querySelector("p").innerText;
      const price = parseFloat(priceText.replace("₱", "").trim());
      const imageSrc = product.querySelector("img").src;

      buyNow(this);
    });
  });

  document
    .getElementById("orderButton")
    ?.addEventListener("click", function () {
      const user = JSON.parse(localStorage.getItem("user"));
      if (!user || !user.email) {
        alert("You must be logged in to place an order.");
        return;
      }

      const orderData = {
        product: "TJ Classic",
        price: 195,
        quantity: 4,
        buyer: `${firstname} ${middlename} ${lastname}`.trim(),
        timestamp: new Date().toISOString(),
      };

      fetch(`${BASE_API_URL}/api/order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(orderData),
      })
        .then((response) => response.json())
        .then((data) => console.log("Order placed:", data))
        .catch((error) => console.error("Error:", error));
    });
});

let cartTotal = 0;

function addToCart(button) {
  const product = button.closest(".product");
  const productName = product.querySelector("h3").innerText;
  const priceText = product.querySelector("p").innerText;
  const price = parseFloat(priceText.replace("₱", "").trim());
  const imageSrc = product.querySelector("img").src;

  let cart = JSON.parse(localStorage.getItem("cart")) || [];
  let existingItem = cart.find((item) => item.name === productName);

  if (existingItem) {
    existingItem.quantity += 1;
  } else {
    cart.push({ name: productName, price, imageSrc, quantity: 1 });
  }

  localStorage.setItem("cart", JSON.stringify(cart));

  let cartTotal = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  updateCartPopup(productName, price, imageSrc, cartTotal, cart.length);
  showPopup("cartPopup");
}

function updateCartPopup(name, price, imageSrc, cartTotal, cartCount) {
  document.getElementById("cartPopupName").innerText = name;
  document.getElementById("cartPopupPrice").innerText = `₱${price.toFixed(2)}`;
  document.getElementById("cartPopupImage").src = imageSrc;
  document.getElementById("cartPopupImage").style.display = "block";
  document.getElementById("cartCount").innerText = cartCount;
  document.getElementById("cartSubtotal").innerText = `₱${cartTotal.toFixed(
    2
  )}`;
}

function showPopup(popupId) {
  const popup = document.getElementById(popupId);
  popup.style.display = "block";
  setTimeout(() => {
    popup.style.display = "none";
  }, 5000);
}

async function buyNow(button) {
  const product = button.closest(".product");
  const productName = product.querySelector("h3").innerText;
  const priceText = product.querySelector("p").innerText;
  const price = parseFloat(priceText.replace("₱", "").trim());

  const user = JSON.parse(localStorage.getItem("user"));
  if (!user || !user.email) {
    alert("You must be logged in to use Buy Now.");
    return;
  }

  try {
    const response = await fetch(`${BASE_API_URL}/api/order`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        product: productName,
        price: price,
        quantity: 1,
      }),
    });

    const data = await response.json();
    console.log("Order placed:", data);
    showBuyNowPopup(productName, price);
  } catch (error) {
    console.error("Error placing order:", error);
  }
}

async function handleLogin(event) {
  console.log("✅ handleLogin triggered");
  event.preventDefault();
  const email = document.getElementById("loginEmail").value;
  const password = document.getElementById("loginPassword").value;

  try {
    const response = await fetch(`${BASE_API_URL}/api/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();
    console.log("Login Response:", data);

    if (data.success) {
      localStorage.setItem("user", JSON.stringify(data.user));
      localStorage.setItem("currentUser", JSON.stringify(data.user));
      localStorage.setItem("currentrole", data.role);

      // ✅ Check user role (make sure backend sends something like data.user.role === "admin")
      if (data.role === "admin") {
        window.location.href = "../Public/admin.html"; // ✅ Admin goes to dashboard
      } else {
        window.location.href = "LOGIN_USER.html"; // ✅ Normal user goes to website
      }
    } else {
      alert("Login failed: " + data.message);
    }
  } catch (error) {
    console.error("Login error:", error);
    alert("An error occurred while logging in.");
  }
}

async function handleRegister(event) {
  event.preventDefault();
  const firstname = document.getElementById("registerFirstName").value;
  const middlename = document.getElementById("registerMiddleName").value;
  const lastname = document.getElementById("registerLastName").value;
  const email = document.getElementById("registerEmail").value;
  const password = document.getElementById("registerPassword").value;
  const address = document.getElementById("registerAddress").value;
  const contact = document.getElementById("registerContact").value;

  try {
    const apiUrl = "https://website-backend-1-w1qd.onrender.com/api/register";
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstname,
        middlename,
        lastname,
        email,
        address,
        contact,
        password,
      }),
    });

    const data = await response.json();
    alert(data.message);
  } catch (error) {
    console.error("Register error:", error);
    alert("An error occurred while registering.");
  }
}

function showBuyNowPopup(productName, price) {
  document.getElementById("buyNowPopupName").textContent = productName;
  document.getElementById("buyNowPopupPrice").textContent = "₱" + price;
  document.getElementById("buyNowPopup").style.display = "block";
}

function closeBuyNowPopup() {
  document.getElementById("buyNowPopup").style.display = "none";
}

function goToOrders() {
  window.location.href = "orders.html";
}

document
  .getElementById("search-bar")
  ?.addEventListener("input", searchProducts);

function fetchProducts() {
  console.log("fetchProducts() called – no implementation yet.");
}

function searchProducts(event) {
  const searchTerm = event.target.value.toLowerCase();
  const productElements = document.querySelectorAll(".product");

  productElements.forEach((product) => {
    const productName = product.querySelector("h3").innerText.toLowerCase();
    if (productName.includes(searchTerm)) {
      product.style.display = "";
    } else {
      product.style.display = "none";
    }
  });
}

function displayCart() {
  const cart = JSON.parse(localStorage.getItem("cart")) || [];
  let total = 0;
  const cartContainer = document.getElementById("cart-items");
  cartContainer.innerHTML = "";

  const grouped = {};
  cart.forEach((item) => {
    if (!grouped[item.name]) {
      grouped[item.name] = { ...item };
    } else {
      grouped[item.name].quantity += item.quantity;
    }
  });

  Object.values(grouped).forEach((item) => {
    const cartItem = document.createElement("div");
    cartItem.classList.add("cart-item");

    const totalItemPrice = item.price * item.quantity;

    cartItem.innerHTML = `
            <img src="${item.imageSrc}" alt="${item.name}" width="50">
            <span><strong>${item.name}</strong> x${item.quantity}</span>
            <span>₱${totalItemPrice.toFixed(2)}</span>
        `;

    cartContainer.appendChild(cartItem);
  });

  document.getElementById("total").textContent = `Total: ₱${total.toFixed(2)}`;
}
