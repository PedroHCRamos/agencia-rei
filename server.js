require('dotenv').config();
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const twilio = require('twilio');
const app = express();
const port = process.env.PORT || 3000;

// Twilio configuration
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioWhatsAppNumber = process.env.TWILIO_WHATSAPP_NUMBER;
const client = twilio(accountSid, authToken);

// SQLite database setup
const db = new sqlite3.Database('users.db', (err) => {
    if (err) console.error('Database connection error:', err);
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        fullName TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        phone TEXT NOT NULL,
        password TEXT NOT NULL
    )`);
});

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
        const emailExists = await new Promise((resolve) => {
            db.get('SELECT email FROM users WHERE email = ?', [email], (err, row) => {
                resolve(!!row);
            });
        });
        if (emailExists) {
            return res.status(400).json({ message: 'E-mail já cadastrado.' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Store user in database
        db.run(
            'INSERT INTO users (fullName, email, phone, password) VALUES (?, ?, ?, ?)',
            [fullName, email, phone, hashedPassword],
            (err) => {
                if (err) {
                    return res.status(500).json({ message: 'Erro ao salvar no banco de dados.' });
                }

                // Send WhatsApp message
                const firstName = fullName.split(' ')[0];
                client.messages
                    .create({
                        from: twilioWhatsAppNumber,
                        to: `whatsapp:+55${phone.replace(/\D/g, '')}`,
                        body: `Parabéns ${firstName}! Cadastro realizado com sucesso na Agência Rei.`
                    })
                    .then(() => {
                        res.status(200).json({ message: 'Cadastro realizado com sucesso!' });
                    })
                    .catch((error) => {
                        console.error('WhatsApp error:', error);
                        res.status(500).json({ message: 'Cadastro realizado, mas falha ao enviar mensagem no WhatsApp.' });
                    });
            }
        );
    } catch (error) {
        console.error('Server error:', error);
        res.status(500).json({ message: 'Erro no servidor.' });
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});