const express = require("express");
const Database = require("better-sqlite3");
const cors = require("cors");
const app = express();
const port = 3000;

app.use(
  cors({
    origin: ["http://localhost:5173", "http://localhost:4000"],
    methods: ["GET", "POST", "PUT", "DELETE"],
  })
);
app.use(express.json());
const db = new Database("database.sqlite");
app.get("/products", (req, res) => {
  try {
    const sql = "SELECT * FROM products";
    const products = db.prepare(sql).all();
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

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});

// Handle graceful shutdown
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
