const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const session = require('express-session');
const bcrypt = require("bcryptjs");

const app = express(); 
app.use(express.json());
app.use(cors({
    origin: "http://127.0.0.1:5500",  // Your frontend origin
    credentials: true                // Allow sending cookies (session)
}));
app.use(session({
    secret: "your_secret_key", 
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } 
}));


mongoose.connect("mongodb://localhost:27017/Frozen", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});


const orderSchema = new mongoose.Schema({
    product: String,
    price: Number,
    quantity: Number,
    buyer: String,  
    timestamp: { type: Date, default: Date.now }
});

const Order = mongoose.model("Order", orderSchema);


app.post("/order", async (req, res) => {
    try {
        console.log("Received order data:", req.body);
        const { product, price, quantity } = req.body;

        if (!product || price === undefined || !quantity) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        let buyer = "guest";

        // If session exists, prefer session user
        if (req.session.user) {
            const { firstname, middlename, lastname } = req.session.user;
            buyer = `${firstname} ${middlename} ${lastname}`.trim();
        }
        // If not, fallback to frontend's buyer
        else if (req.body.buyer) {
            buyer = req.body.buyer;
        }

        const newOrder = new Order({ product, price, quantity, buyer });
        await newOrder.save();

        console.log("New Order Saved:", newOrder);
        res.json({ message: "Order placed successfully!" });
    } catch (error) {
        console.error("Error placing order:", error);
        res.status(500).json({ error: "Failed to place order" });
    }
});


const Product = mongoose.model("Product", new mongoose.Schema({
    name: String,
    price: Number,
    image: String,
    description: String,
    category: String
}));

const User = mongoose.model("User", new mongoose.Schema({
    firstname: String,
    middlename: String,
    lastname: String,
    email: { type: String, unique: true },
    password: String,
    address: String,    
    contact: String  
}));

app.post("/register", async (req, res) => {
    
    try {
        const { firstname, middlename, lastname, email, password, address, contact } = req.body;
        const existingUser = await User.findOne({ email });

        if (existingUser) {
            return res.status(400).json({ message: "Email already registered" });
        }

        const hashedPassword = await bcrypt.hash(password, 10); // Hash password

        const newUser = new User({ 
            firstname,
            middlename,
            lastname, 
            email, 
            password: hashedPassword,
            address,
            contact
        });

        await newUser.save();

        res.json({ message: "Registration successful!" });
    } catch (error) {
        console.error("Registration error:", error);
        res.status(500).json({ error: "Failed to register user" });
    }
});


app.post("/login", async (req, res) => {
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

        // Store user info in session
        req.session.user = {
            firstname: user.firstname,
            middlename: user.middlename,
            lastname: user.lastname,
            email: user.email,
            address: user.address,
            contact: user.contact
        };

        res.json({ 
            success: true, 
            user: {
                firstname: user.firstname,
                middlename: user.middlename,
                lastname: user.lastname,
                email: user.email,
                address: user.address,
                contact: user.contact
            },
            message: "Login successful!", 

        });
    } catch (error) {
        console.error("Login error:", error);
        return res.status(400).json({ success: false, message: "Invalid email or password." });
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

app.post('/admin/login', (req, res) => {
    const { username, password } = req.body;
    if (username === 'admin' && password === 'password') { // Replace with real auth logic
        req.session.user = { firstname: user.firstname, middlename: user.middlename, lastname: user.lastname, email: user.email, address: user.address, contact: user.contact }; // Store user info in session
        res.json({ success: true, message: "Login successful!" });

    } else {
        res.json({ success: false });
    }
});

app.get('/status', (req, res) => {
    if (req.session.user) {
        res.json({ loggedIn: true, user: req.session.user });
    } else {
        res.json({ loggedIn: false });
    }
});

app.post('/logout', (req, res) => {
    req.session.destroy();
    res.json({ success: true });
});



app.listen(3000, () => console.log("Server running on port 3000"));