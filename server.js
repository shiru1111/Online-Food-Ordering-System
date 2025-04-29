// server.js
const express = require('express');
const mysql = require('mysql2/promise');
const bodyParser = require('body-parser');
const cors = require('cors');
const app = express();
const port = 3000;

app.use(cors());
app.use(bodyParser.json());

// MySQL Connection
const db = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '122324',
  database: 'food_ordering'
});

// Routes
app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const [results] = await db.query('SELECT * FROM users WHERE email = ? AND password = ?', [email, password]);
    if (results.length > 0) {
      const user = results[0];
      res.json({ success: true, level: user.level });
    } else {
      res.status(401).json({ success: false, message: 'Invalid email or password' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error during login');
  }
});




app.get('/restaurants', async (req, res) => {
  try {
    const [results] = await db.query('SELECT * FROM restaurants');
    res.json(results);
  } catch (err) {
    res.status(500).send(err);
  }
});

app.get('/restaurants-with-menus', async (req, res) => {
  try {
    const [results] = await db.query(`
      SELECT r.id as restaurant_id, r.name as restaurant_name, m.id as menu_id, m.name as menu_name, m.price
      FROM restaurants r
      LEFT JOIN menus m ON r.id = m.restaurant_id
      ORDER BY r.id;
    `);

    const restaurantMap = {};
    results.forEach(row => {
      if (!restaurantMap[row.restaurant_id]) {
        restaurantMap[row.restaurant_id] = {
          id: row.restaurant_id,
          name: row.restaurant_name,
          menus: []
        };
      }
      if (row.menu_id) {
        restaurantMap[row.restaurant_id].menus.push({
          id: row.menu_id,
          name: row.menu_name,
          price: row.price
        });
      }
    });
    res.json(Object.values(restaurantMap));
  } catch (err) {
    res.status(500).send(err);
  }
});

app.get('/menu/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const [results] = await db.query('SELECT * FROM menus WHERE restaurant_id = ?', [id]);
    res.json(results);
  } catch (err) {
    res.status(500).send(err);
  }
});

app.post('/order', async (req, res) => { 
  const {
    email, restaurantId, menuItems, customerName,
    paymentMethod, accountNumber,
    houseNumber, city, province, postalCode, additionalAddress
  } = req.body;

  try {
    const [orderResult] = await db.query(
      'INSERT INTO orders (user_email, restaurant_id, status, tracking_id, customer_name, payment_method, account_number, house_number, city, province, postal_code, additional_address) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [email, restaurantId, 'Pending', `TRK-${Date.now()}`, customerName, paymentMethod, accountNumber, houseNumber, city, province, postalCode, additionalAddress]
    );
    
    const orderId = orderResult.insertId;

    for (let item of menuItems) {
      await db.query(
        'INSERT INTO order_items (order_id, menu_id, quantity) VALUES (?, ?, ?)',
        [orderId, item.id, item.quantity]
      );
    }

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).send('Order failed');
  }
});

app.get('/orders/:email', async (req, res) => {
  const { email } = req.params;
  try {
    const [orders] = await db.query(`
      SELECT o.id, o.status, o.tracking_id, o.customer_name, o.payment_method, o.account_number,
             o.house_number, o.city, o.province, o.postal_code, o.additional_address, r.name AS restaurant
      FROM orders o
      JOIN restaurants r ON o.restaurant_id = r.id
      WHERE o.user_email = ?
      ORDER BY o.id DESC
    `, [email]);

    for (let order of orders) {
      const [items] = await db.query(`
        SELECT m.name AS name, m.price AS price, oi.quantity AS quantity
        FROM order_items oi
        JOIN menus m ON oi.menu_id = m.id
        WHERE oi.order_id = ?
      `, [order.id]);

      // Updated total calculation
      order.total = items.reduce((sum, item) => {
        return sum + (parseFloat(item.price) * item.quantity);
      }, 0);

      // Include quantity per item
      order.items = items.map(item =>
        `${item.name} (x${item.quantity}) - ₱${(item.price * item.quantity).toFixed(2)}`
      ).join(', ');
    }

    res.json(orders);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error fetching orders');
  }
});
// Route to mark order as received (Delivered)
app.post('/orders/:id/received', async (req, res) => {
  const { id } = req.params;
  try {
    // Update the status of the order to 'Delivered'
    await db.query('UPDATE orders SET status = ? WHERE id = ?', ['Delivered', id]);
    res.sendStatus(200); // Success response
  } catch (err) {
    console.error(err);
    res.status(500).send('Failed to update order status');
  }
});

// Route to delete an order
app.delete('/orders/:id', async (req, res) => {
  const { id } = req.params;
  try {
    // Delete the order and its related order items
    await db.query('DELETE FROM order_items WHERE order_id = ?', [id]);
    await db.query('DELETE FROM orders WHERE id = ?', [id]);
    res.sendStatus(200); // Success response
  } catch (err) {
    console.error(err);
    res.status(500).send('Failed to delete order');
  }
});


// Admin - Add Restaurant
app.post('/admin/restaurant', async (req, res) => {
  const { name } = req.body;
  try {
    await db.query('INSERT INTO restaurants (name) VALUES (?)', [name]);
    res.sendStatus(200);
  } catch (err) {
    res.status(500).send('Error adding restaurant');
  }
});

// Admin - Add Menu Item
app.post('/admin/menu', async (req, res) => {
  const { restaurantId, name, price } = req.body;
  try {
    await db.query('INSERT INTO menus (restaurant_id, name, price) VALUES (?, ?, ?)', [restaurantId, name, price]);
    res.sendStatus(200);
  } catch (err) {
    res.status(500).send('Error adding menu item');
  }
});

// Admin - Update Menu Item Price
app.put('/admin/menu/:id/price', async (req, res) => {
  const { id } = req.params;
  const { price } = req.body;
  try {
    await db.query('UPDATE menus SET price = ? WHERE id = ?', [price, id]);
    res.sendStatus(200);
  } catch (err) {
    res.status(500).send('Error updating price');
  }
});

// Admin - Delete Menu Item
app.delete('/menu/:id', async (req, res) => {
  const menuId = req.params.id;

  try {
    // Check if any pending orders contain this menu item
    const [pending] = await db.query(`
      SELECT oi.menu_id 
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      WHERE oi.menu_id = ? AND o.status = 'pending'
    `, [menuId]);

    if (pending.length > 0) {
      return res.status(400).json({ message: 'Cannot delete menu item. Pending orders exist.' });
    }

    // If no pending orders, proceed to delete
    await db.query('DELETE FROM menus WHERE id = ?', [menuId]);
    res.sendStatus(204);
  } catch (error) {
    console.error('Delete menu error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});



// Admin - Delete Restaurant

// Assuming you're using Express
app.delete('/restaurants/:id', async (req, res) => {
  const restaurantId = req.params.id;
  try {
    // Check if the restaurant has any menus or orders before deleting
    const [menus] = await db.query('SELECT * FROM menus WHERE restaurant_id = ?', [restaurantId]);
    if (menus.length > 0) {
      return res.status(400).json({ message: 'Restaurant has menu items. Please clear it first.' });
    }

    const [orders] = await db.query('SELECT * FROM orders WHERE restaurant_id = ?', [restaurantId]);
    if (orders.length > 0) {
      return res.status(400).json({ message: 'Restaurant has orders. Please delete orders first.' });
    }

    // Delete restaurant
    const [result] = await db.query('DELETE FROM restaurants WHERE id = ?', [restaurantId]);

    if (result.affectedRows > 0) {
      return res.status(200).json({ message: 'Restaurant deleted successfully' });
    } else {
      return res.status(404).json({ message: 'Restaurant not found' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to delete restaurant' });
  }
});

app.put('/restaurants/:id', async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;
  try {
    await db.query('UPDATE restaurants SET name = ? WHERE id = ?', [name, id]);
    res.sendStatus(200);
  } catch (err) {
    res.status(500).send('Error updating restaurant');
  }
});


app.put('/menus/:id', async (req, res) => {
  const { id } = req.params;
  const { name, price } = req.body;
  try {
    await db.query('UPDATE menus SET name = ?, price = ? WHERE id = ?', [name, price, id]);
    res.sendStatus(200);
  } catch (err) {
    res.status(500).send('Error updating menu item');
  }
});



app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});