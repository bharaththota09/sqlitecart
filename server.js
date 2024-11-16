const express = require("express");
const Database = require("better-sqlite3");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const app = express();
const port = 3000;
const jwt = require("jsonwebtoken");
const bodyParser = require("body-parser");
const MY_SECRET_KEY = "bharath@123";
app.use(
  cors({
    origin: ["http://localhost:5173", "http://localhost:4000"],
    methods: ["GET", "POST", "PUT", "DELETE"],
  })
);
app.use(express.json());
const db = new Database("cart.db");

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: "Token missing" });
  }

  const token = authHeader.split(" ")[1];
  jwt.verify(token, MY_SECRET_KEY, (err, user) => {
    if (err) {
      return res.status(403).json({ error: "Invalid or expired token" });
    }
    req.user = user;
    next();
  });
};

app.get("/products", authenticateToken, (req, res) => {
  try {
    const sql = "SELECT * FROM products";
    const products = db.prepare(sql).all();
    res.json({ products });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/products/:id", (req, res) => {
  const adminid = req.params.id;
  try {
    const sql = "SELECT * FROM products where adminid =?";
    const stmt = db.prepare(sql);
    const products = stmt.all(adminid);
    res.json({ products });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/products", (req, res) => {
  const product = req.body;
  console.log("Received product:", product);

  if (
    !product.title ||
    !product.price ||
    !product.description ||
    !product.category ||
    !product.image ||
    !product.stockavailable
  ) {
    return res.status(400).json({ error: "All fields are required" });
  }

  try {
    const sql = `
      INSERT INTO products (adminid, title, price, description, category, image, stockavailable)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    const stmt = db.prepare(sql);
    const info = stmt.run(
      product.adminid,
      product.title,
      product.price,
      product.description,
      product.category,
      product.image,
      product.stockavailable
    );
    res.status(201).json({
      message: "Product created successfully",
      product: { productid: info.lastInsertRowid, ...product },
    });
  } catch (err) {
    console.error("Error inserting product:", err.message);
    res.status(500).json({ error: "Database insert failed: " + err.message });
  }
});

app.delete("/products/:id", (req, res) => {
  const productId = parseInt(req.params.id, 10);

  if (!productId) {
    return res.status(400).json({ error: "Product ID is required" });
  }

  try {
    const sql = "DELETE FROM products WHERE productid = ?";
    const stmt = db.prepare(sql);
    const result = stmt.run(productId);

    if (result.changes === 0) {
      return res.status(404).json({ error: "Product not found" });
    }

    res.status(200).json({ message: "Product deleted successfully" });
  } catch (err) {
    console.error("Error deleting product:", err.message);
    res.status(500).json({ error: "Database delete failed: " + err.message });
  }
});

app.post("/usersignup", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res
      .status(400)
      .json({ error: "Username and password are required" });
  }
  try {
    const userExists = db
      .prepare("SELECT * FROM users WHERE username = ?")
      .get(username);
    if (userExists) {
      return res.status(409).json({ error: "Username already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const stmt = db.prepare(
      "INSERT INTO users (username, password) VALUES (?, ?)"
    );
    const info = stmt.run(username, hashedPassword);

    res.status(201).json({
      message: "User registered successfully",
      userId: info.lastInsertRowid,
    });
  } catch (err) {
    console.error("Error during signup:", err.message);
    res.status(500).json({ error: "Database error" });
  }
});

app.post("/userlogin", (req, res) => {
  const { username, password } = req.body;

  try {
    const sql = "SELECT * FROM users WHERE username = ?";
    const user = db.prepare(sql).get(username);

    if (!user) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

    bcrypt.compare(password, user.password, (err, result) => {
      if (err || !result) {
        return res.status(401).json({ error: "Invalid username or password" });
      } else {
        let token = jwt.sign({ username }, MY_SECRET_KEY, { expiresIn: "1h" });

        res.json({ token, userid: user.userid, username: user.username });
      }
    });
  } catch (err) {
    console.error("Error during login:", err.message);
    res.status(500).json({ error: "Database error" });
  }
});

app.post("/signup", async (req, res) => {
  const { adminname, password } = req.body;

  if (!adminname || !password) {
    return res
      .status(400)
      .json({ error: "Username and password are required" });
  }
  try {
    const userExists = db
      .prepare("SELECT * FROM admins WHERE adminname = ?")
      .get(adminname);
    if (userExists) {
      return res.status(409).json({ error: "Username already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const stmt = db.prepare(
      "INSERT INTO admins (adminname, password) VALUES (?, ?)"
    );
    const info = stmt.run(adminname, hashedPassword);

    res.status(201).json({
      message: "User registered successfully",
      userId: info.lastInsertRowid,
    });
  } catch (err) {
    console.error("Error during signup:", err.message);
    res.status(500).json({ error: "Database error" });
  }
});

app.post("/login", (req, res) => {
  const { adminname, password } = req.body;

  if (!adminname || !password) {
    return res
      .status(400)
      .json({ error: "Username and password are required" });
  }

  try {
    const sql = "SELECT * FROM admins WHERE adminname = ?";
    const user = db.prepare(sql).get(adminname);

    if (!user) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

    bcrypt.compare(password, user.password, (err, result) => {
      if (err || !result) {
        return res.status(401).json({ error: "Invalid username or password" });
      }
      res.json({ adminid: user.adminid, adminname: user.adminname });
    });
  } catch (err) {
    console.error("Error during login:", err.message);
    res.status(500).json({ error: "Database error" });
  }
});

app.post("/savelater", authenticateToken, (req, res) => {
  const { userId, productId } = req.body;
  try {
    const isSaved = db.prepare(
      `select * from savelater where userId=${userId} and productId=${productId}`
    );
    const info = isSaved.get();

    if (info === undefined) {
      const save = db.prepare(
        `insert into savelater(userId,productId) values(${userId},${productId})`
      );
      const info = save.run();
      res.sendStatus(200);
    } else {
      const removesave = db.prepare(
        `delete from savelater where userId=${userId} and productId=${productId}`
      );
      const info = removesave.run();
      res.sendStatus(200);
    }
  } catch (error) {
    console.log(error);
  }
});
app.get("/savelater/:id", authenticateToken, (req, res) => {
  const userId = req.params.id;
  try {
    const query = db.prepare(`SELECT * FROM savelater WHERE userId = ?`);
    const items = query.all(userId);

    if (items.length === 0) {
      return res.status(200).json([]);
    }

    res.status(200).json(items);
  } catch (error) {
    console.error("Error fetching saved items:", error.message);
    res
      .status(500)
      .json({ error: "An error occurred while fetching saved items." });
  }
});

app.post("/orders/", authenticateToken, (req, res) => {
  console.log(req.body);
  const { userId, orderTime, cartList } = req.body;
  try {
    const insertOrder = db.prepare(
      "INSERT INTO orders (userId, orderTime) VALUES (?, ?)"
    );
    const info = insertOrder.run(userId, orderTime);
    const orderId = info.lastInsertRowid;
    const insertOrderItems = db.prepare(
      "INSERT INTO order_items (orderId, productId, quantity, price, description, category, image, title) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    );

    cartList.forEach((item) => {
      insertOrderItems.run(
        orderId,
        item.e.productid,
        item.quantity,
        item.e.price,
        item.e.description,
        item.e.category,
        item.e.image,
        item.e.title
      );
    });

    res.status(201).json({ message: "Order created successfully", orderId });
  } catch (err) {
    console.error("Error processing order:", err.message);
    res.status(500).json({ error: "Error processing order" });
  }
});

app.get("/orders/:userId", authenticateToken, (req, res) => {
  const userId = req.params.userId;
  const stmt = db.prepare(`
        SELECT orders.id AS orderId, orders.orderTime, order_items.productId, order_items.quantity, 
            order_items.price, order_items.description, order_items.category, order_items.image, order_items.title
        FROM orders
        INNER JOIN order_items ON orders.id = order_items.orderId
        WHERE orders.userId = ?
    `);

  const rows = stmt.all(userId);

  if (rows.length === 0) {
    return res.status(404).json({ message: "No orders found for this user" });
  }
  const groupedOrders = rows.reduce((acc, row) => {
    let order = acc.find((o) => o.orderId === row.orderId);
    if (!order) {
      order = {
        orderId: row.orderId,
        orderTime: row.orderTime,
        cartList: [],
      };
      acc.push(order);
    }
    order.cartList.push({
      productId: row.productId,
      quantity: row.quantity,
      price: row.price,
      description: row.description,
      category: row.category,
      image: row.image,
      title: row.title,
    });

    return acc;
  }, []);
  res.status(200).json(groupedOrders);
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});

process.on("SIGINT", () => {
  db.close((err) => {
    if (err) {
      console.error("Error closing database connection:", err.message);
    } else {
      console.log("Database connection closed.");
    }
  });
  process.exit();
});
