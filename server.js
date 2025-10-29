require("dotenv").config();
const BASE_API_URL = "https://website-backend-1-w1qd.onrender.com";
const mongoose = require("mongoose");
const cors = require("cors");
const session = require("express-session");
const bcrypt = require("bcryptjs");
const express = require("express");
const path = require("path");
const app = express();

// ✅ CORS FIRST (must be before any routes or session)
const allowedOrigins = [
  "https://website-backend-1-w1qd.onrender.com", // ✅ your backend
  "https://chaewonigster.github.io", // ✅ your frontend (GitHub Pages)
  "http://127.0.0.1:5500", // ✅ local testing
  "http://localhost:5500",
  "https://www.facebook.com", // ✅ Facebook login redirect
  "https://connect.facebook.net", // ✅ Facebook SDK domain
];

app.use(
  cors({
    origin: function (origin, callback) {
      console.log("CORS origin:", origin);
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true, // ✅ important for cookies/sessions
  })
);

// ✅ JSON body parser
app.use(express.json());

// ✅ Static files
app.use(express.static(path.join(__dirname, "Public")));
app.use(express.static(__dirname));

// ✅ Sessions (after CORS)
app.set("trust proxy", 1);
app.use(
  session({
    secret: process.env.SESSION_SECRET || "supersecretkey",
    resave: false,
    saveUninitialized: false,
    cookie: {
      sameSite: "none",
      secure: process.env.NODE_ENV === "production",
    },
  })
);

function isAdmin(req, res, next) {
  if (req.session.user && req.session.user.role === "admin") {
    return next();
  }
  return res.status(403).json({ message: "Forbidden: Admins only" });
}

mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ Connected to MongoDB Atlas"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

mongoose.connection.on("connected", () => {
  console.log("🔗 Connected to MongoDB");
  console.log("📌 Host:", mongoose.connection.host);
  console.log("📌 Port:", mongoose.connection.port);
  console.log("📌 Database:", mongoose.connection.name);
});

const orderSchema = new mongoose.Schema({
  product: String,
  price: Number,
  quantity: Number,
  buyer: String,
  buyerEmail: String, // 📧 added email field
  timestamp: { type: Date, default: Date.now },
});

const Order = mongoose.model("Order", orderSchema);

const productSchema = new mongoose.Schema({
  name: String,
  stock: { type: Number, default: 0 },
  reorderLevel: { type: Number, default: 10 },
  status: { type: String, default: "In Stock" },
});

// ✅ Settings Model (auto-creates the "settings" collection when used)
const settingsSchema = new mongoose.Schema({
  storeName: { type: String, default: "Frozen Goods Store" },
  storeEmail: { type: String, default: "frozen@example.com" },
  currency: { type: String, default: "PHP (₱)" },
});

const Settings = mongoose.model("Settings", settingsSchema);

app.post("/api/order", async (req, res) => {
  try {
    console.log("Received order data:", req.body);
    const { product, price, quantity, buyerEmail } = req.body;

    if (!product || price === undefined || !quantity) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // 🧠 Step 1: Find the product
    const foundProduct = await Product.findOne({ name: product });
    if (!foundProduct) {
      return res.status(404).json({ error: "Product not found" });
    }

    // 🧠 Step 2: Check stock availability
    if (foundProduct.stock < quantity) {
      return res
        .status(400)
        .json({ error: "Not enough stock available for this product" });
    }

    // 🧠 Step 3: Deduct stock and save
    foundProduct.stock -= quantity;
    await foundProduct.save();

    // 🧠 Step 4: Determine buyer name
    let buyer = "guest";
    if (req.session.user) {
      const { firstname, middlename, lastname } = req.session.user;
      buyer = `${firstname} ${middlename} ${lastname}`.trim();
    } else if (req.body.buyer) {
      buyer = req.body.buyer;
    }

    // 🧠 Step 5: Save order
    const newOrder = new Order({ product, price, quantity, buyer, buyerEmail });
    await newOrder.save();

    console.log("✅ New Order Saved:", newOrder);
    res.json({ success: true, message: "Order placed successfully!" });
  } catch (error) {
    console.error("❌ Error placing order:", error);
    res.status(500).json({ error: "Failed to place order" });
  }
});

// ✅ Delete an order by ID
app.delete("/api/orders/:id", async (req, res) => {
  try {
    const id = new mongoose.Types.ObjectId(req.params.id);
    const result = await mongoose.connection.db
      .collection("orders")
      .deleteOne({ _id: id });

    if (result.deletedCount === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found." });
    }

    res.json({ success: true, message: "Order deleted successfully." });
  } catch (error) {
    console.error("Error deleting order:", error);
    res.status(500).json({ success: false, message: "Error deleting order." });
  }
});

// ✅ Get all users
app.get("/api/users", async (req, res) => {
  try {
    const users = await mongoose.connection.db
      .collection("users")
      .find({})
      .toArray();

    res.json({ success: true, data: users });
  } catch (error) {
    console.error("Error fetching users:", error);
    res
      .status(500)
      .json({ success: false, message: "Server error fetching users." });
  }
});
// 📜 Fetch order history of the logged-in user
app.get("/api/order-history", async (req, res) => {
  try {
    const email =
      req.session?.user?.email ||
      req.query.email ||
      req.headers["x-user-email"];

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Missing user email or not logged in",
      });
    }

    const orders = await Order.find({ buyerEmail: email }).sort({
      timestamp: -1,
    });
    res.json({ success: true, orders });
  } catch (err) {
    console.error("Error fetching order history:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch order history",
    });
  }
});

const Product = mongoose.model(
  "Product",
  new mongoose.Schema({
    name: String,
    price: Number,
    image: String,
    description: String,
    category: String,
    stock: { type: Number, default: 0 }, // ✅ added stock field
  })
);

const User = mongoose.model(
  "User",
  new mongoose.Schema({
    firstname: String,
    middlename: String,
    lastname: String,
    email: { type: String, unique: true },
    password: String,
    address: String,
    contact: String,
    role: { type: String, default: "user" }, // ✅ Add this
  })
);

app.get("/admin/orders", isAdmin, async (req, res) => {
  const orders = await Order.find();
  res.json(orders);
});

// ✅ Admin fetch all orders (simple version, no auth block while testing)
app.get("/api/orders", async (req, res) => {
  try {
    const orders = await Order.find().sort({ timestamp: -1 });
    res.json({ success: true, data: orders });
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).json({ success: false, message: "Failed to fetch orders" });
  }
});

// ✅ Admin delete order (already exists, but make sure matches route)
app.delete("/api/orders/:id", async (req, res) => {
  try {
    await Order.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Order deleted successfully" });
  } catch (error) {
    console.error("Error deleting order:", error);
    res.status(500).json({ success: false, message: "Error deleting order" });
  }
});

// ✅ Admin fetch all users
app.get("/api/users", async (req, res) => {
  try {
    const users = await User.find();
    res.json({ success: true, data: users });
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ success: false, message: "Failed to fetch users" });
  }
});

app.post("/api/register", async (req, res) => {
  try {
    const {
      firstname,
      middlename,
      lastname,
      email,
      password,
      address,
      contact,
    } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email already registered" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      firstname,
      middlename,
      lastname,
      email,
      password: hashedPassword,
      address,
      contact,
    });

    await newUser.save();
    res.json({ message: "Registration successful!" });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ error: "Failed to register user" });
  }
});

app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({ message: "Invalid email or password." });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ message: "Invalid email or password." });
    }

    // ✅ Save full user info to session
    req.session.user = {
      firstname: user.firstname,
      middlename: user.middlename,
      lastname: user.lastname,
      email: user.email,
      address: user.address,
      contact: user.contact,
      role: user.role,
    };

    // ✅ Send full user details to frontend
    res.json({
      success: true,
      message: "Login successful!",
      user: {
        id: user._id,
        firstname: user.firstname,
        middlename: user.middlename,
        lastname: user.lastname,
        email: user.email,
        address: user.address,
        contact: user.contact,
        role: user.role,
      },
      role: user.role, // 👈 added this so your frontend’s `data.role` still works
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during login.",
    });
  }
});

app.get("/api/products", async (req, res) => {
  try {
    const products = await Product.find();
    res.json({ success: true, data: products });
  } catch (error) {
    console.error("Error fetching products:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch products" });
  }
});

app.post("/api/facebook-login", async (req, res) => {
  try {
    const { email, name, facebookId } = req.body;

    if (!email) {
      return res
        .status(400)
        .json({ success: false, message: "Email required from Facebook." });
    }

    let user = await User.findOne({ email });

    if (!user) {
      // 🆕 Auto-register new user
      user = new User({
        firstname: name.split(" ")[0],
        lastname: name.split(" ")[1] || "",
        email,
        password: await bcrypt.hash(facebookId, 10), // 🔐 store hash of fb id
        role: "user",
      });
      await user.save();
    }

    // 🟢 Save session
    req.session.user = {
      firstname: user.firstname,
      lastname: user.lastname,
      email: user.email,
      role: user.role,
    };

    res.json({
      success: true,
      message: "Facebook login successful",
      user,
    });
  } catch (err) {
    console.error("Facebook login error:", err);
    res
      .status(500)
      .json({ success: false, message: "Server error during Facebook login" });
  }
});

// ✅ Get single product by ID
app.get("/api/products/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ error: "Product not found" });
    res.json(product);
  } catch (err) {
    console.error("Error fetching product:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ✅ Update existing product
app.put("/api/products/:id", async (req, res) => {
  try {
    const { name, stock, reorderLevel, price, status } = req.body;

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { name, stock, reorderLevel, price, status },
      { new: true }
    );

    if (!product) return res.status(404).json({ error: "Product not found" });
    res.json(product);
  } catch (err) {
    console.error("Error updating product:", err);
    res.status(500).json({ error: "Server error" });
  }
});

app.put("/api/products/:id", async (req, res) => {
  try {
    const { name, stock, reorderLevel, price, status } = req.body;

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { name, stock, reorderLevel, price, status },
      { new: true }
    );

    if (!product) return res.status(404).json({ error: "Product not found" });
    res.json(product);
  } catch (err) {
    console.error("Error updating product:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ✅ Get settings
app.get("/api/settings", async (req, res) => {
  try {
    let settings = await Settings.findOne();
    // If none exists, create default automatically
    if (!settings) {
      settings = await Settings.create({
        storeName: "Frozen Goods Store",
        storeEmail: "frozen@example.com",
        currency: "PHP (₱)",
      });
    }
    res.json(settings);
  } catch (err) {
    console.error("Error fetching settings:", err);
    res.status(500).json({ error: "Server error fetching settings" });
  }
});

// ✅ Update settings
app.put("/api/settings", async (req, res) => {
  try {
    const { storeName, storeEmail, currency } = req.body;
    const updated = await Settings.findOneAndUpdate(
      {},
      { storeName, storeEmail, currency },
      { new: true, upsert: true }
    );
    res.json(updated);
  } catch (err) {
    console.error("Error saving settings:", err);
    res.status(500).json({ error: "Server error saving settings" });
  }
});

app.put("/api/settings", async (req, res) => {
  const { storeName, storeEmail, currency } = req.body;
  const updated = await Settings.findOneAndUpdate(
    {},
    { storeName, storeEmail, currency },
    { new: true, upsert: true }
  );
  res.json(updated);
});
app.post("/admin/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const admin = await User.findOne({ email, role: "admin" });
    if (!admin) {
      return res
        .status(403)
        .json({ success: false, message: "Not authorized" });
    }

    const isPasswordValid = await bcrypt.compare(password, admin.password);
    if (!isPasswordValid) {
      return res
        .status(403)
        .json({ success: false, message: "Invalid password" });
    }

    req.session.user = {
      email: admin.email,
      firstname: admin.firstname,
      role: admin.role,
    };

    res.json({ success: true, message: "Admin login successful!" });
  } catch (error) {
    console.error("Admin login error:", error);
    res.status(500).json({ success: false, message: "Admin login failed" });
  }
});

app.put("/admin/products/:id", async (req, res) => {
  try {
    const { name, category, price, stock, reorderLevel } = req.body;

    const product = await Product.findById(req.params.id);
    if (!product)
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });

    if (name) product.name = name;
    if (category) product.category = category;
    if (price !== undefined) product.price = price; // ✅ allow price updates
    if (stock !== undefined) product.stock = stock;
    if (reorderLevel !== undefined) product.reorderLevel = reorderLevel;

    await product.save();
    res.json({ success: true, message: "Product updated", data: product });
  } catch (err) {
    console.error("Error updating product:", err);
    res.status(500).json({ success: false, message: "Error updating product" });
  }
});

app.get("/admin/orders", isAdmin, async (req, res) => {
  const orders = await Order.find().sort({ timestamp: -1 });
  res.json({ success: true, orders });
});

app.get("/status", (req, res) => {
  if (req.session.user) {
    res.json({ loggedIn: true, user: req.session.user });
  } else {
    res.json({ loggedIn: false });
  }
});

app.put("/admin/products/:id", isAdmin, async (req, res) => {
  await Product.findByIdAndUpdate(req.params.id, req.body);
  res.json({ success: true });
});

app.delete("/admin/products/:id", isAdmin, async (req, res) => {
  await Product.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

app.post("/logout", (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

app.get("/create-admin", async (req, res) => {
  try {
    const existingAdmin = await User.findOne({ email: "admin@example.com" });
    if (existingAdmin) {
      return res.send("⚠️ Admin already exists.");
    }

    const hashedPassword = await bcrypt.hash("adminpassword", 10);

    const adminUser = new User({
      firstname: "Admin",
      middlename: "",
      lastname: "User",
      email: "admin@example.com",
      password: hashedPassword,
      address: "N/A",
      contact: "N/A",
      role: "admin",
    });

    await adminUser.save();
    res.send("✅ Admin Created!");
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Admin creation failed" });
  }
});
app.get("/facebook-data-deletion", (req, res) => {
  return res.json({
    url: "https://website-backend-1-w1qd.onrender.com/data-deletion.html",
    message: "For data deletion, visit the provided URL.",
  });
});

app.get("/admin/login", (req, res) => {
  res.sendFile(path.join(__dirname, "Public", "admin.html"));
});

app.get("/admin.html", (req, res) => {
  res.sendFile(path.join(__dirname, "Public", "admin.html"));
});

app.get("/admin/products", (req, res) => {
  res.sendFile(path.join(__dirname, "Public", "admin.html"));
});

app.get("/admin/orders", (req, res) => {
  res.sendFile(path.join(__dirname, "Public", "admin.html"));
});

app.get("/", (req, res) => {
  res.send("🎉 Backend is live!");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
});
