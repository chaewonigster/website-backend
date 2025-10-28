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
  "https://website-backend-1-w1qd.onrender.com", // ✅ allow your deployed site
  "https://chaewonigster.github.io", // ✅ allow GitHub Pages (if used)
  "http://127.0.0.1:5500", // ✅ allow local testing
  "http://localhost:5500",
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

app.post("/api/order", async (req, res) => {
  try {
    console.log("Received order data:", req.body);
    const { product, price, quantity, buyerEmail } = req.body; // Include buyerEmail

    if (!product || price === undefined || !quantity) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    let buyer = "guest";
    if (req.session.user) {
      const { firstname, middlename, lastname } = req.session.user;
      buyer = `${firstname} ${middlename} ${lastname}`.trim();
    } else if (req.body.buyer) {
      buyer = req.body.buyer;
    }

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

app.get("/products", async (req, res) => {
  try {
    const products = await Product.find();
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch products" });
  }
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

app.post("/admin/products", isAdmin, async (req, res) => {
  try {
    const newProduct = new Product(req.body);
    await newProduct.save();
    res.json({ success: true, product: newProduct });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to add product" });
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
