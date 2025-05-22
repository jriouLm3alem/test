import express from 'express';
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const app = express();
const port = process.env.PORT || 10000;

// Parse JSON body
app.use(express.json());

// PostgreSQL connection using your URL
const pool = new Pool({
  connectionString: 'postgresql://farm_database_bv66_user:R7G48PsqUPHkht8oHoCT0Zf5BmeM1ACD@dpg-d0nftnpr0fns7390b120-a/farm_database_bv66',
  ssl: {
    rejectUnauthorized: false,
  },
});

// Home route
app.get('/', (req, res) => {
  res.send('🌿 Smart Farm API is online!');
});

// Login route
app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email },
      'your_jwt_secret_key_here', // 🔐 Replace with env variable later
      { expiresIn: '1h' }
    );

    res.status(200).json({ message: 'Login successful', token });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
});
