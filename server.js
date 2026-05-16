const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');

// إنشاء تطبيق الإكسبريس
const app = express();

// إعدادات الـ Middleware
app.use(cors()); // عشان يسمح للفرونت إند يكلم الباك إند
app.use(express.json()); // عشان نفهم البيانات اللي جاية بصيغة JSON

// الاتصال بقاعدة بيانات MongoDB المحلية
// استخدمنا 127.0.0.1 بدل localhost عشان تتوافق مع أحدث إصدارات Node
mongoose.connect('mongodb+srv://mohamedabdalrasoul0_db_user:<intmaincleano>@cluster0.ymiglaq.mongodb.net/?appName=Cluster0')
    .then(() => console.log('✅ Connected to MongoDB Successfully '))
    .catch((err) => console.error('❌ Failed to connect to MongoDB:', err));

// ==========================================
// بناء هيكل البيانات (Schema & Model) للطلبات
// ==========================================
const orderSchema = new mongoose.Schema({
    orderId: String,
    service: String,
    customer: String,
    status: { type: String, default: 'pending' },
    assignedWorker: { type: String, default: 'Not Assigned' },
    price: Number,
    rating: { type: Number, default: 0 },
    date:String,
    createdAt: { type: Date, default: Date.now }
});

const Order = mongoose.model('Order', orderSchema);

// ==========================================
// مسارات الـ API (Routes)
// ==========================================

// 1. جلب كل الطلبات (GET)
app.get('/api/orders', async (req, res) => {
    try {
        const orders = await Order.find().sort({ createdAt: -1 }); // بنجيبهم مترتبين بالأحدث
        res.json(orders);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch orders' });
    }
});

// 2. إضافة طلب جديد (POST)
app.post('/api/orders', async (req, res) => {
    try {
        const newOrder = new Order(req.body);
        const savedOrder = await newOrder.save();
        res.status(201).json(savedOrder);
    } catch (error) {
        res.status(400).json({ error: 'Failed to add order' });
    }
});

// 3. حذف طلب (DELETE)
app.delete('/api/orders/:id', async (req, res) => {
    try {
        await Order.findByIdAndDelete(req.params.id);
        res.json({ message: 'Order deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete order' });
    }
});
// 4. تحديث حالة الطلب (PUT)
// تحديث الطلب (الحالة أو العامل)
app.put('/api/orders/:id', async (req, res) => {
    try {
        const updatedOrder = await Order.findByIdAndUpdate(
            req.params.id, 
            req.body, // السطر ده بيخليه يحفظ أي بيانات جديدة تتبعتله
            { new: true }
        );
        res.json(updatedOrder);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update order' });
    }
});
// ==========================================
// بناء هيكل البيانات (Schema & Model) للعمال
// ==========================================
const workerSchema = new mongoose.Schema({
    name: String,
    role: String,
    rating: Number,
    status: { type: String, default: 'Active' },
    ratings: { type: [Number], default: [] },
    createdAt: { type: Date, default: Date.now }
});

const Worker = mongoose.model('Worker', workerSchema);

// ==========================================
// مسارات الـ API الخاصة بالعمال
// ==========================================

// جلب كل العمال
app.get('/api/workers', async (req, res) => {
    try {
        const workers = await Worker.find().sort({ createdAt: -1 });
        res.json(workers);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch workers' });
    }
});

// إضافة عامل جديد
app.post('/api/workers', async (req, res) => {
    try {
        const newWorker = new Worker(req.body);
        const savedWorker = await newWorker.save();
        res.status(201).json(savedWorker);
    } catch (error) {
        res.status(400).json({ error: 'Failed to add worker' });
    }
});

// حذف عامل
app.delete('/api/workers/:id', async (req, res) => {
    try {
        await Worker.findByIdAndDelete(req.params.id);
        res.json({ message: 'Worker deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete worker' });
    }
});
// ==========================================
// بناء هيكل البيانات للمستخدمين (Users Schema)
// ==========================================
const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['admin', 'user'], default: 'user' }
});
const User = mongoose.model('User', userSchema);

// ==========================================
// مسارات المصادقة (Authentication Routes)
// ==========================================

// 1. إنشاء حساب جديد (Sign Up) متأمن ومُشفر
app.post('/api/signup', async (req, res) => {
    const { username, password, role, adminSecret } = req.body;
    try {
        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.status(400).json({ success: false, message: 'Username already exists!' });
        }
        
        let finalRole = 'user'; 
        if (role === 'admin') {
            if (adminSecret === 'Cleano2026') {
                finalRole = 'admin';
            } else {
                return res.status(403).json({ success: false, message: 'Access Denied: Invalid Admin Secret Key!' });
            }
        }

        // ==========================================
        // سحر التشفير: تحويل الباسورد لرمز معقد
        // ==========================================
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // بنحفظ الباسورد المُشفر (hashedPassword) بدل العادي
        const newUser = new User({ username, password: hashedPassword, role: finalRole });
        await newUser.save();
        res.json({ success: true, message: 'Account created successfully!' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error creating account' });
    }
});

// 2. تسجيل الدخول (Sign In)
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        // 1. ندور على اليوزر بالاسم بس
        const user = await User.findOne({ username });
        if (!user) {
            return res.status(401).json({ success: false, message: 'Invalid username or password!' });
        }

        // 2. نقارن الباسورد اللي اليوزر كتبه بالباسورد المُشفر في الداتابيز
        const isMatch = await bcrypt.compare(password, user.password);
        if (isMatch) {
            res.json({ success: true, username: user.username, role: user.role });
        } else {
            res.status(401).json({ success: false, message: 'Invalid username or password!' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});
// ==========================================
// مسار تقييم الطلب والعامل (Rating System)
// ==========================================
app.put('/api/orders/:id/rate', async (req, res) => {
    const { rating, workerName } = req.body;
    try {
        // 1. نحفظ التقييم في الطلب نفسه
        const updatedOrder = await Order.findByIdAndUpdate(req.params.id, { rating }, { new: true });
        
        // 2. ندور على العامل ونضيف التقييم لملفه
        if (workerName && workerName !== 'Not Assigned') {
            const worker = await Worker.findOne({ name: workerName });
            if (worker) {
                worker.ratings.push(rating);
                await worker.save();
            }
        }
        res.json(updatedOrder);
    } catch (error) {
        res.status(500).json({ error: 'Failed to rate order' });
    }
});
// ==========================================
// نظام الشات المباشر (Live Chat System)
// ==========================================
const messageSchema = new mongoose.Schema({
    sender: String,
    receiver: String,
    text: String,
    timestamp: { type: Date, default: Date.now }
});
const Message = mongoose.model('Message', messageSchema);

// جلب الرسايل الخاصة بعميل معين
app.get('/api/messages/:customer', async (req, res) => {
    try {
        const msgs = await Message.find({
            $or: [
                { sender: req.params.customer },
                { receiver: req.params.customer }
            ]
        }).sort({ timestamp: 1 });
        res.json(msgs);
    } catch (err) {
        res.status(500).json({ error: 'Error fetching messages' });
    }
});

// إرسال رسالة جديدة
app.post('/api/messages', async (req, res) => {
    try {
        const newMsg = new Message(req.body);
        await newMsg.save();
        res.json(newMsg);
    } catch (err) {
        res.status(500).json({ error: 'Error sending message' });
    }
});
// ==========================================
// تشغيل السيرفر
// ==========================================
const PORT = 5000;
app.listen(PORT, () => {
    console.log(` Server is running on http://localhost:${PORT}`);
});