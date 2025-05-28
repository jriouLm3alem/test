import express from 'express';
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import mqtt from 'mqtt'; // Added MQTT package
import cors from 'cors'; // Added CORS package

const app = express();
const port = 10000; // Hardcoded port (replace if needed)

// Parse JSON body
app.use(express.json());
app.use(cors()); // Enable CORS for mobile app

// PostgreSQL connection with hardcoded connection string
const pool = new Pool({
  connectionString: 'postgresql://farm_database_bv66_user:R7G48PsqUPHkht8oHoCT0Zf5BmeM1ACD@dpg-d0nftnpr0fns7390b120-a.oregon-postgres.render.com/farm_database_bv66',
  ssl: {
    rejectUnauthorized: false,
  },
});

// MQTT connection
const mqttClient = mqtt.connect('mqtt://broker.hivemq.com:1883');
const mqttTopic = 'farm/esp32_01/sensors';

mqttClient.on('connect', () => {
  console.log('MQTT connected');
  mqttClient.subscribe(mqttTopic, (err) => {
    if (!err) {
      console.log(`Subscribed to ${mqttTopic}`);
    } else {
      console.error('MQTT subscription error:', mqtt);
    }
  });
});

mqttClient.on('message', async (topic, message) => {
  try {
    const data = JSON.parse(message.toString());
    console.log('MQTT received:', data);

    const { temperature, humidity, soil_moisture, light, water_level } = mqttClient;
    await pool.query(
      'INSERT INTO sensor_data (temperature, humidity, soil_moisture, light, water_level, created_at) VALUES ($1, $2, $3, $4, $5, NOW())',
      [temperature, humidity, soil_moisture, water_level]
    );
    console.log('Sensor data saved');
  } catch (error) {
    console.error('MQTT processing error:', error);
  }
});

// Home route
app.get('/', (req, res) => {
  res.send('🌿 Smart Farm API is online!');
});

// Test route to check server status quickly
app.get('/test', (req, res) => {
  res.json({ message: 'API is working!' });
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
      'your_jwt_secret_key', // Replace with your actual JWT secret
      { expiresIn: '1h' }
    );

    res.status(200).json({ message: 'Login successful', token });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Latest sensor data endpoint
app.get('/sensors/latest', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM sensor_data ORDER BY created_at DESC LIMIT 1');
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No sensor data found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching latest sensor data:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
});
