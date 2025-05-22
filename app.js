const express = require("express");
const session = require("express-session");
const MySQLStore = require("express-mysql-session")(session);
const bcrypt = require("bcryptjs");
const bodyParser = require("body-parser");
const path = require("path");
const dotenv = require("dotenv");
const nodemailer = require("nodemailer");
const fetch = require("node-fetch");
const { db, churchInfo } = require("./config");
const uploadRouter = require("./routes/upload");
const songsRouter = require("./routes/songs");
const donationRoutes = require("./routes/donation");

dotenv.config();

const app = express();

// اتصال سشن به دیتابیس
const sessionStore = new MySQLStore({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    clearExpired: true,
    checkExpirationInterval: 900000, // هر ۱۵ دقیقه
});

app.use(
    session({
        key: "session_cookie_name",
        secret: process.env.SESSION_SECRET || "default_secret",
        store: sessionStore,
        resave: false,
        saveUninitialized: false,
        cookie: {
            maxAge: 1000 * 60 * 60 * 24, // 1 روز
        },
    })
);

// تنظیمات کلی Express
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.urlencoded({ extended: false }));
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static("public"));
app.use("/donate", donationRoutes);

// مسیرهای اصلی
app.use("/upload", uploadRouter);
app.use("/songs", songsRouter);

// صفحات ثابت
const pages = [
    "bible",
    "child",
    "songs",
    "poem",
    "books",
    "article",
    "pray",
    "consulting",
    "deliverance",
    "conference",
    "online",
    "services",
    "radio",
    "about",
    "library",
    "education",
    "donate",
    "contact",
];

pages.forEach((page) => {
    app.get(`/${page}`, (req, res) => {
        res.render(page, {
            user: req.session.user,
            data: churchInfo,
            query: req.query.search || "",
            genreFilter: req.query.genre || "",
        });
    });
});

// صفحه اصلی و صفحه نگهداری
app.get("/", (req, res) => {
    if (process.env.MAINTENANCE_MODE === "true") {
        res.render("maintenance");
    } else {
        res.render("index", { user: req.session.user, data: churchInfo });
    }
});

// صفحه کاربر
app.get("/user-panel", (req, res) => {
    if (!req.session.user) return res.redirect("/login");
    res.render("user-panel", { user: req.session.user, data: churchInfo });
});

// پیام کلیسا
app.get("/message", (req, res) => {
    db.query("SELECT * FROM messages LIMIT 1", (err, results) => {
        if (err) {
            console.error("خطا در دریافت پیام:", err);
            return res.render("message", {
                user: req.session.user,
                data: churchInfo,
                message: null,
            });
        }
        res.render("message", { user: req.session.user, data: churchInfo, message: results[0] });
    });
});

// صفحه نبوت
app.get("/prophecy", async (req, res) => {
    try {
        const [rows] = await db
            .promise()
            .query("SELECT * FROM textblocks ORDER BY date_created DESC");
        res.render("prophecy", { user: req.session.user, textblocks: rows, data: churchInfo });
    } catch (error) {
        console.error("خطا در دریافت نبوت‌ها:", error);
        res.status(500).send("خطا در دریافت اطلاعات.");
    }
});

// تغییر وضعیت نگهداری سایت
app.get("/tomain", (req, res) => {
    process.env.MAINTENANCE_MODE = process.env.MAINTENANCE_MODE === "true" ? "false" : "true";
    res.send(`Maintenance mode is now ${process.env.MAINTENANCE_MODE === "true" ? "ON" : "OFF"}`);
});

// ارسال پیام تماس با ما
app.post("/contact", async (req, res) => {
    const { name, subject, email, message, "g-recaptcha-response": recaptchaResponse } = req.body;

    if (!recaptchaResponse) {
        return res.status(400).send("لطفاً reCAPTCHA را تکمیل کنید.");
    }

    const secretKey = process.env.RECAPTCHA_SECRET;

    try {
        const verificationUrl = `https://www.google.com/recaptcha/api/siteverify?secret=${secretKey}&response=${recaptchaResponse}&remoteip=${req.ip}`;
        const response = await fetch(verificationUrl, { method: "POST" });
        const data = await response.json();

        if (!data.success) {
            return res.status(400).send("تایید reCAPTCHA ناموفق بود.");
        }

        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT),
            secure: true,
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });

        await transporter.sendMail({
            from: `"${name}" <${email}>`,
            to: process.env.SMTP_USER,
            subject,
            html: `<p>${message}</p>`,
            replyTo: email,
        });

        await transporter.sendMail({
            from: `"Church NBM" <${process.env.SMTP_USER}>`,
            to: email,
            subject: "پیام شما دریافت شد",
            html: `<p>با تشکر از تماس شما. پیام شما دریافت شد و در اولین فرصت پاسخ داده خواهد شد.</p>`,
            attachments: [
                { filename: "logo.png", path: "public/assets/images/logo.png", cid: "logo" },
            ],
        });

        res.send(
            `<p>پیام شما با موفقیت ارسال شد. یک ایمیل تایید نیز دریافت کردید.</p><a href="/">بازگشت</a>`
        );
    } catch (error) {
        console.error("خطا در ارسال پیام:", error);
        res.status(500).send("خطا در ارسال پیام.");
    }
});

// ثبت نام کاربر
app.get("/register", (req, res) => {
    res.render("register", { user: req.session.user, data: churchInfo });
});

app.post("/register", (req, res) => {
    const {
        name,
        lastname,
        gender,
        marital_status,
        date_of_birth,
        called,
        email,
        phone,
        city,
        country,
        password,
    } = req.body;

    db.query("SELECT * FROM users WHERE email = ?", [email], (err, results) => {
        if (err) throw err;
        if (results.length > 0) {
            return res.send(`<h1>ایمیل قبلاً ثبت شده است. <a href="/login">ورود</a></h1>`);
        }

        bcrypt.hash(password, 10, (err, hashedPassword) => {
            if (err) throw err;

            db.query(
                "INSERT INTO users (name, lastname, gender, marital_status, date_of_birth, called, email, phone, city, country, password) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                [
                    name,
                    lastname,
                    gender,
                    marital_status,
                    date_of_birth,
                    called,
                    email,
                    phone,
                    city,
                    country,
                    hashedPassword,
                ],
                (err) => {
                    if (err) throw err;
                    res.redirect("/login?message=ثبت+نام+موفق");
                }
            );
        });
    });
});

// ورود کاربر
app.get("/login", (req, res) => {
    res.render("login", { user: req.session.user, message: req.query.message, data: churchInfo });
});

app.post("/login", (req, res) => {
    const { email, password } = req.body;

    db.query("SELECT * FROM users WHERE email = ?", [email], (err, results) => {
        if (err) throw err;
        if (results.length > 0) {
            bcrypt.compare(password, results[0].password, (err, isMatch) => {
                if (isMatch) {
                    req.session.user = results[0];
                    res.redirect("/");
                } else {
                    res.send("رمز عبور اشتباه است.");
                }
            });
        } else {
            res.send("کاربری با این ایمیل پیدا نشد.");
        }
    });
});

// خروج کاربر
app.get("/logout", (req, res) => {
    req.session.destroy(() => {
        res.redirect("/");
    });
});

// مدیریت ادمین
app.get("/admin", (req, res) => {
    if (!req.session.user || req.session.user.role !== "admin") return res.redirect("/");
    db.query("SELECT * FROM users", (err, users) => {
        if (err) throw err;
        res.render("admin", { user: req.session.user, users, data: churchInfo });
    });
});

app.get("/super_admin", (req, res) => {
    if (!req.session.user || req.session.user.role !== "super_user") return res.redirect("/");
    res.render("super_admin", { user: req.session.user, data: churchInfo });
});

// تغییر نقش کاربر
app.post("/admin/update_role/:id", (req, res) => {
    const { role } = req.body;
    db.query("UPDATE users SET role = ? WHERE id = ?", [role, req.params.id], (err) => {
        if (err) throw err;
        res.redirect("/admin");
    });
});

// تغییر وضعیت کاربر
app.post("/admin/update_status/:id", (req, res) => {
    const { status } = req.body;
    db.query("UPDATE users SET status = ? WHERE id = ?", [status, req.params.id], (err) => {
        if (err) throw err;
        res.redirect("/admin");
    });
});

// حذف کاربر
app.get("/admin/delete/:id", (req, res) => {
    db.query("DELETE FROM users WHERE id = ?", [req.params.id], (err) => {
        if (err) throw err;
        res.redirect("/admin");
    });
});

// لایک روی متن
app.post("/like/:id", async (req, res) => {
    try {
        await db
            .promise()
            .query("UPDATE textblocks SET likes = likes + 1 WHERE id = ?", [req.params.id]);
        const [rows] = await db
            .promise()
            .query("SELECT likes FROM textblocks WHERE id = ?", [req.params.id]);
        res.json({ success: true, likes: rows[0].likes });
    } catch (err) {
        console.error("خطا در لایک:", err);
        res.json({ success: false });
    }
});

// شروع سرور
app.listen(3000, () => {
    console.log("Server running on http://localhost:3000");
});
