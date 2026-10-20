const admin = require('firebase-admin');

// Inisialisasi Firebase Admin SDK
// Pastikan Anda sudah menyiapkan Environment Variables di Vercel:
// FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      // Mengatasi masalah newline (\n) pada private key di environment variable
      privateKey: process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') : undefined,
    }),
  });
}

const db = admin.firestore();

module.exports = async (req, res) => {
  // Mengatur Header CORS agar bisa diakses dari frontend
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { method, url } = req;
  const path = url.split('?')[0];

  try {
    // Endpoint: GET /api/products (Mengambil daftar produk warung)
    if (method === 'GET' && (path === '/api' || path === '/api/products')) {
      const snapshot = await db.collection('products').orderBy('createdAt', 'desc').get();
      const products = [];
      snapshot.forEach((doc) => {
        products.push({ id: doc.id, ...doc.data() });
      });
      return res.status(200).json({ success: true, data: products });
    }

    // Endpoint: POST /api/products (Menambah produk baru)
    if (method === 'POST' && (path === '/api' || path === '/api/products')) {
      const { name, price, stock, category } = req.body;

      if (!name || !price) {
        return res.status(400).json({ success: false, message: 'Nama dan harga produk wajib diisi!' });
      }

      const newProduct = {
        name,
        price: Number(price),
        stock: Number(stock) || 0,
        category: category || 'Umum',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      const docRef = await db.collection('products').add(newProduct);
      return res.status(201).json({ success: true, message: 'Produk berhasil ditambahkan', id: docRef.id });
    }

    return res.status(404).json({ success: false, message: 'Endpoint tidak ditemukan' });
  } catch (error) {
    console.error('Database Error:', error);
    return res.status(500).json({ success: false, message: 'Terjadi kesalahan pada server', error: error.message });
  }
};