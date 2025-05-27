require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const twilio = require('twilio');
const app = express();
const port = process.env.PORT || 3000;

// Twilio configuration
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioWhatsAppNumber = process.env.TWILIO_WHATSAPP_NUMBER;
const client = twilio(accountSid, authToken);

// PostgreSQL setup
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// Create users table
pool.query(`
    CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        fullName VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        phone VARCHAR(20) NOT NULL,
        password VARCHAR(255) NOT NULL
    )
`).catch(err => console.error('Error creating table:', err));

app.use(express.json());
app.use(express.static('public'));

app.post('/api/register', async (req, res) => {
    const { fullName, email, phone, password } = req.body;

    // Server-side validation
    if (!fullName || !email || !phone || !password) {
        return res.status(400).json({ message: 'Todos os campos são obrigatórios.' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ message: 'E-mail inválido.' });
    }
    if (!/^\(\d{2}\)\s\d{5}-\d{4}$/.test(phone)) {
        return res.status(400).json({ message: 'Telefone inválido.' });
    }
    if (password.length < 6) {
        return res.status(400).json({ message: 'A senha deve ter no mínimo 6 caracteres.' });
    }

    try {
        // Check if email already exists
        const emailResult = await pool.query('SELECT email FROM users WHERE email = $1', [email]);
        if (emailResult.rows.length > 0) {
            return res.status(400).json({ message: 'E-mail já cadastrado.' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Store user in database
        await pool.query(
            'INSERT INTO users (fullName, email, phone, password) VALUES ($1, $2, $3, $4)',
            [fullName, email, phone, hashedPassword]
        );

        // Send WhatsApp message
        const firstName = fullName.split(' ')[0];
        await client.messages.create({
            from: twilioWhatsAppNumber,
            to: `whatsapp:+55${phone.replace(/\D/g, '')}`,
            body: `Parabéns ${firstName}! Cadastro realizado com sucesso na Agência Rei.`
        });

        res.status(200).json({ message: 'Cadastro realizado com sucesso!' });
    } catch (error) {
        console.error('Server error:', error);
        res.status(500).json({ message: 'Erro no servidor.' });
    }
});

// Temporary route for debugging (remove after testing)
app.get('/api/users', async (req, res) => {
    try {
        const result = await pool.query('SELECT id, fullName, email, phone FROM users');
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ message: 'Erro ao consultar banco de dados.' });
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});