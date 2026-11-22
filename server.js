const express = require("express");
const session = require("express-session");
const bcrypt = require("bcryptjs");
const path = require("path");
const mysql = require("mysql2/promise");

const app = express();
const PORT = 1234;

const pool = mysql.createPool({
    host: "localhost",
    port: 3306,
    user: "internship_app",
    password: "zxcv1234",
    database: "internship_tracking"
});

app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(
    session({
        secret: "internship-tracking-dev-secret",
        resave: false,
        saveUninitialized: false
    })
);

app.post("/login", async (req, res) => {
    const { username, password } = req.body;

    try {
        const [rows] = await pool.query(
            "SELECT * FROM users WHERE username = ?",
            [username]
        );
        const user = rows[0];

        if (!user || !(await bcrypt.compare(password, user.password_hash))) {
            return res.redirect("/login.html?error=1");
        }

        req.session.user = {
            id: user.id,
            username: user.username,
            role: user.role,
            student_id: user.student_id
        };
        res.redirect("/");
    } catch (error) {
        console.error(error.message);
        res.redirect("/login.html?error=1");
    }
});

app.post("/logout", (req, res) => {
    req.session.destroy(() => {
        res.redirect("/login.html");
    });
});

app.use((req, res, next) => {
    if (req.path === "/login.html" || req.session.user) {
        return next();
    }
    if (req.path.startsWith("/api/")) {
        return res.status(401).json({ error: "ยังไม่ได้ล็อกอิน" });
    }
    res.redirect("/login.html");
});

function requireRole(...roles) {
    return (req, res, next) => {
        if (!roles.includes(req.session.user.role)) {
            return res.status(403).json({ error: "คุณไม่มีสิทธิ์ทำรายการนี้" });
        }
        next();
    };
}


app.use(express.static(path.join(__dirname, "public")));

app.get("/api/me", (req, res) => {
    res.json(req.session.user);
});

app.get("/api/status", async (req, res) => {
    try {
        await pool.query("SELECT 1");
        res.json({ database: "connected" });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ database: "error" });
    }
});

app.get("/api/students/count", async (req, res) => {
    try {
        const [rows] = await pool.query("SELECT COUNT(*) AS total FROM students");
        res.json({ total: rows[0].total });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ total: 0 });
    }
});
app.get("/api/students", async (req, res) => {
    const keyword = (req.query.q || "").trim();

    try {
        const [rows] = await pool.query(
            "SELECT id, student_code, full_name, major FROM students WHERE student_code LIKE ? OR full_name LIKE ? ORDER BY id",
            [`%${keyword}%`, `%${keyword}%`]
        );
        res.json(rows);
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ error: "ดึงข้อมูลไม่สำเร็จ" });
    }
});

app.get("/api/students/:id", async (req, res) => {
    try {
        const [rows] = await pool.query(
            "SELECT id, student_code, full_name, major FROM students WHERE id = ?",
            [req.params.id]
        );
        if (rows.length === 0) {
            return res.status(404).json({ error: "ไม่พบนักศึกษา" });
        }
        res.json(rows[0]);
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ error: "ดึงข้อมูลไม่สำเร็จ" });
    }
});

app.post("/api/students", requireRole("mentor"), async (req, res) => {
    const { student_code, full_name, major } = req.body;

    if (!student_code || !full_name) {
        return res.status(400).json({ error: "กรุณากรอกรหัสนักศึกษาและชื่อ" });
    }

    try {
        await pool.query(
            "INSERT INTO students (student_code, full_name, major) VALUES (?, ?, ?)",
            [student_code.trim(), full_name.trim(), (major || "").trim()]
        );
        res.status(201).json({ message: "เพิ่มนักศึกษาสำเร็จ" });
    } catch (error) {
        if (error.code === "ER_DUP_ENTRY") {
            return res.status(409).json({ error: "รหัสนักศึกษานี้มีอยู่แล้ว" });
        }
        console.error(error.message);
        res.status(500).json({ error: "เพิ่มข้อมูลไม่สำเร็จ" });
    }
});

app.put("/api/students/:id", requireRole("mentor"), async (req, res) => {
    const { student_code, full_name, major } = req.body;

    if (!student_code || !full_name) {
        return res.status(400).json({ error: "กรุณากรอกรหัสนักศึกษาและชื่อ" });
    }

    try {
        const [result] = await pool.query(
            "UPDATE students SET student_code = ?, full_name = ?, major = ? WHERE id = ?",
            [student_code.trim(), full_name.trim(), (major || "").trim(), req.params.id]
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: "ไม่พบนักศึกษา" });
        }
        res.json({ message: "แก้ไขข้อมูลสำเร็จ" });
    } catch (error) {
        if (error.code === "ER_DUP_ENTRY") {
            return res.status(409).json({ error: "รหัสนักศึกษานี้มีอยู่แล้ว" });
        }
        console.error(error.message);
        res.status(500).json({ error: "แก้ไขข้อมูลไม่สำเร็จ" });
    }
});

app.delete("/api/students/:id", requireRole("mentor"), async (req, res) => {
    try {
        const [result] = await pool.query(
            "DELETE FROM students WHERE id = ?",
            [req.params.id]
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: "ไม่พบนักศึกษา" });
        }
        res.json({ message: "ลบนักศึกษาสำเร็จ" });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ error: "ลบข้อมูลไม่สำเร็จ" });
    }
});

app.get("/api/companies", async (req, res) => {
    try {
        const [rows] = await pool.query(
            "SELECT id, name, address, contact_name, contact_phone FROM companies ORDER BY id"
        );
        res.json(rows);
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ error: "ดึงข้อมูลไม่สำเร็จ" });
    }
});

app.post("/api/companies", requireRole("mentor"), async (req, res) => {
    const { name, address, contact_name, contact_phone } = req.body;

    if (!name || !name.trim()) {
        return res.status(400).json({ error: "กรุณากรอกชื่อสถานประกอบการ" });
    }

    try {
        await pool.query(
            "INSERT INTO companies (name, address, contact_name, contact_phone) VALUES (?, ?, ?, ?)",
            [name.trim(), (address || "").trim(), (contact_name || "").trim(), (contact_phone || "").trim()]
        );
        res.status(201).json({ message: "เพิ่มสถานประกอบการสำเร็จ" });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ error: "เพิ่มข้อมูลไม่สำเร็จ" });
    }
});

app.put("/api/companies/:id", requireRole("mentor"), async (req, res) => {
    const { name, address, contact_name, contact_phone } = req.body;

    if (!name || !name.trim()) {
        return res.status(400).json({ error: "กรุณากรอกชื่อสถานประกอบการ" });
    }

    try {
        const [result] = await pool.query(
            "UPDATE companies SET name = ?, address = ?, contact_name = ?, contact_phone = ? WHERE id = ?",
            [name.trim(), (address || "").trim(), (contact_name || "").trim(), (contact_phone || "").trim(), req.params.id]
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: "ไม่พบสถานประกอบการ" });
        }
        res.json({ message: "แก้ไขข้อมูลสำเร็จ" });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ error: "แก้ไขข้อมูลไม่สำเร็จ" });
    }
});

app.delete("/api/companies/:id", requireRole("mentor"), async (req, res) => {
    try {
        const [result] = await pool.query(
            "DELETE FROM companies WHERE id = ?",
            [req.params.id]
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: "ไม่พบสถานประกอบการ" });
        }
        res.json({ message: "ลบสถานประกอบการสำเร็จ" });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ error: "ลบข้อมูลไม่สำเร็จ" });
    }
});

app.get("/api/applications", async (req, res) => {
    const user = req.session.user;

    try {
        let sql = `
            SELECT a.id, a.status, a.note, a.created_at,
                   s.full_name AS student_name, s.student_code,
                   c.name AS company_name
            FROM applications a
            JOIN students s ON a.student_id = s.id
            JOIN companies c ON a.company_id = c.id
        `;
        const params = [];

        if (user.role !== "mentor") {
            sql += " WHERE a.student_id = ?";
            params.push(user.student_id);
        }

        sql += " ORDER BY a.id DESC";

        const [rows] = await pool.query(sql, params);
        res.json(rows);
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ error: "ดึงข้อมูลไม่สำเร็จ" });
    }
});

app.post("/api/applications", requireRole("student"), async (req, res) => {
    const studentId = req.session.user.student_id;
    const { company_id, note } = req.body;

    if (!studentId) {
        return res.status(400).json({ error: "บัญชีนี้ยังไม่ได้เชื่อมกับนักศึกษา" });
    }
    if (!company_id) {
        return res.status(400).json({ error: "กรุณาเลือกสถานประกอบการ" });
    }

    try {
        const [existing] = await pool.query(
            "SELECT id FROM applications WHERE student_id = ? AND company_id = ? AND status = 'pending'",
            [studentId, company_id]
        );
        if (existing.length > 0) {
            return res.status(409).json({ error: "คุณมีใบสมัครที่รอตรวจสอบกับสถานประกอบการนี้อยู่แล้ว" });
        }

        await pool.query(
            "INSERT INTO applications (student_id, company_id, note) VALUES (?, ?, ?)",
            [studentId, company_id, (note || "").trim()]
        );
        res.status(201).json({ message: "ส่งใบสมัครสำเร็จ" });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ error: "ส่งใบสมัครไม่สำเร็จ" });
    }
});

app.put("/api/applications/:id/status", requireRole("mentor"), async (req, res) => {
    const { status } = req.body;

    if (!["pending", "approved", "rejected"].includes(status)) {
        return res.status(400).json({ error: "สถานะไม่ถูกต้อง" });
    }

    try {
        const [result] = await pool.query(
            "UPDATE applications SET status = ? WHERE id = ?",
            [status, req.params.id]
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: "ไม่พบใบสมัคร" });
        }
        res.json({ message: "เปลี่ยนสถานะสำเร็จ" });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ error: "เปลี่ยนสถานะไม่สำเร็จ" });
    }
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});