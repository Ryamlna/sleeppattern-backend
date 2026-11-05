const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const app = express();
const PORT = process.env.PORT || 5000;
const prisma = new PrismaClient();

app.use(cors({
  origin: ['http://localhost:5173', 'https://sleeppattern-frontend.vercel.app'], 
  credentials: true
}));

// 1. Endpoint Autentikasi Google (Sudah ada sebelumnya)
app.post('/api/auth/google', async (req, res) => {
  const { token } = req.body;
  try {
    const response = await fetch(`https://www.googleapis.com/oauth2/v3/userinfo?access_token=${token}`);
    const payload = await response.json();
    if (payload.error) throw new Error(payload.error_description || 'Token tidak valid');

    const { email, name, picture } = payload;
    let user = await prisma.user.findUnique({ where: { email: email } });

    if (!user) {
      user = await prisma.user.create({ data: { email, name, picture } });
      console.log("🎉 Akun baru berhasil dibuat:", email);
    } else {
      console.log("👋 Pengguna lama login:", email);
    }

    res.status(200).json({ message: "Otentikasi berhasil", user });
  } catch (error) {
    console.error("Gagal login:", error.message);
    res.status(401).json({ error: "Otentikasi gagal" });
  }
});

// 2. Endpoint: Menyimpan Data Tidur
app.post('/api/sleep', async (req, res) => {
  const { email, date, sleepTime, wakeTime, quality, usedGadget, didExercise } = req.body;

  try {
    let user = await prisma.user.findUnique({ where: { email } });

    // FIX BUG DEMO: Buat akun otomatis di database jika yang login adalah Akun Demo
    if (!user && email === 'demo@sleeppattern.id') {
      user = await prisma.user.create({
        data: { 
          email: 'demo@sleeppattern.id', 
          name: 'Akun Demo', 
          picture: 'https://ui-avatars.com/api/?name=Akun+Demo&background=10B981&color=fff' 
        }
      });
      console.log("🎉 Akun Demo berhasil dibuat di Database!");
    }

    if (!user) return res.status(404).json({ error: "Pengguna tidak ditemukan" });

    const sleepDateTime = new Date(`${date}T${sleepTime}:00`);
    let wakeDateTime = new Date(`${date}T${wakeTime}:00`);
    if (wakeDateTime < sleepDateTime) wakeDateTime.setDate(wakeDateTime.getDate() + 1);

    const newRecord = await prisma.sleepRecord.create({
      data: { userId: user.id, date: new Date(date), sleepTime: sleepDateTime, wakeTime: wakeDateTime, quality, usedGadget, didExercise },
    });

    console.log(`🌙 Data tidur berhasil dicatat untuk: ${email}`);
    res.status(201).json({ message: "Data berhasil disimpan", record: newRecord });
  } catch (error) {
    console.error("Gagal mencatat tidur:", error.message);
    res.status(500).json({ error: "Gagal menyimpan data ke database" });
  }
});

// 3. Endpoint BARU: Mengambil Riwayat Tidur
app.get('/api/sleep/:email', async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { email: req.params.email },
      include: {
        sleepRecords: {
          orderBy: { date: 'desc' } // Urutkan dari tanggal terbaru
        }
      }
    });

    if (!user) return res.status(404).json({ error: "Pengguna tidak ditemukan" });

    res.status(200).json(user.sleepRecords);
  } catch (error) {
    console.error("Gagal mengambil data:", error.message);
    res.status(500).json({ error: "Server gagal mengambil riwayat tidur" });
  }
});

// 4. Endpoint BARU: Menghapus Riwayat Tidur
app.delete('/api/sleep/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    await prisma.sleepRecord.delete({
      where: { id: id },
    });
    
    // Tambahkan baris ini agar terminal backend-mu bersuara!
    console.log(`🗑️ Data tidur berhasil dihapus dengan ID: ${id}`);
    
    res.status(200).json({ message: "Data berhasil dihapus" });
  } catch (error) {
    console.error("Gagal menghapus data:", error.message);
    res.status(500).json({ error: "Server gagal menghapus data" });
  }
});

app.listen(PORT, () => {
  console.log(`Server Backend berjalan di http://localhost:${PORT}`);
});