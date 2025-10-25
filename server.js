require("dotenv").config();
const BASE_API_URL = "https://website-backend-1-w1qd.onrender.com";
const mongoose = require("mongoose");
const cors = require("cors");
const session = require("express-session");
const bcrypt = require("bcryptjs");
const express = require("express");
const app = express();
const path = require("path");

app.use(express.json());

const allowedOrigins = [
  "https://chaewonigster.github.io",
  "http://127.0.0.1:5500", // This should be allowed
  "http://localhost:5500", // You can also try adding this, just in case.
];

app.use(express.static("public"));
app.use(
  cors({
    origin: function (origin, callback) {
      console.log("Origin:", origin);
      if (!origin || allowedOrigins.includes(origin) || origin === "null") {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

app.use(
  session({
    secret: "your_secret_key",
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false },
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

app.post("/order", async (req, res) => {
  try {
    console.log("Received order data:", req.body);
    const { product, price, quantity, buyerEmail } = req.body; // 📧 include buyerEmail

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

    const newOrder = new Order({ product, price, quantity, buyer, buyerEmail }); // 📧 add email
    await newOrder.save();
    console.log("New Order Saved:", newOrder);
    res.json({ message: "Order placed successfully!" });
  } catch (error) {
    console.error("Error placing order:", error);
    res.status(500).json({ error: "Failed to place order" });
  }
});

// 📜 Fetch order history of the logged-in user
app.get("/order-history", async (req, res) => {
  try {
    if (!req.session.user) {
      return res.status(401).json({ success: false, message: "Not logged in" });
    }

    const email = req.session.user.email; // identify by logged-in email
    const orders = await Order.find({ buyerEmail: email }).sort({
      timestamp: -1,
    });

    res.json({ success: true, orders });
  } catch (err) {
    console.error("Error fetching order history:", err);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch order history" });
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
    let user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({ message: "Invalid email or password." });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(400).json({ message: "Invalid email or password." });
    }

    req.session.user = {
      firstname: user.firstname,
      middlename: user.middlename,
      lastname: user.lastname,
      email: user.email,
      address: user.address,
      contact: user.contact,
    };

    req.session.user = {
      firstname: user.firstname,
      middlename: user.middlename,
      lastname: user.lastname,
      email: user.email,
      address: user.address,
      contact: user.contact,
      role: user.role, // ✅ store role in session
    };

    res.json({
      success: true,
      role: user.role, // ✅ send role to frontend
      message: "Login successful!",
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(400).json({
      success: false,
      message: "Invalid email or password.",
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
  res.sendFile(path.join(__dirname, "public", "admin.html"));
});

app.get("/admin/products", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "admin.html"));
});

app.get("/admin/orders", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "admin.html"));
});

app.get("/", (req, res) => {
  res.send("🎉 Backend is live!");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
});
