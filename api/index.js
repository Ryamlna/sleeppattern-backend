const express = require('express');
const app = express();

app.use(express.json());

app.get('/api/test', (req, res) => {
  res.json({ message: "Backend SleepPattern sukses berjalan di Vercel!" });
});

module.exports = app;