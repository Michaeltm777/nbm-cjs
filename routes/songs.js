const express = require("express");
const { db, churchInfo } = require("../config");
const router = express.Router();

router.get("/", async (req, res) => {
    try {
        const { search, genre, artist } = req.query;
        let query = "SELECT * FROM songs";
        const conditions = [];
        const params = [];

        if (search) {
            conditions.push("title LIKE ?");
            params.push(`%${search}%`);
        }
        if (genre) {
            conditions.push("genre = ?");
            params.push(genre);
        }
        if (artist) {
            conditions.push("artist = ?");
            params.push(artist);
        }
        if (conditions.length) {
            query += " WHERE " + conditions.join(" AND ");
        }

        const [songs] = await db.promise().execute(query, params);
        const [genres] = await db.promise().execute("SELECT DISTINCT genre FROM songs");
        const [artists] = await db.promise().execute("SELECT DISTINCT artist FROM songs");

        res.render("songs", {
            songs,
            user: req.session.user,
            data: churchInfo,
            query: search || "",
            genreFilter: genre || "",
            artistFilter: artist || "",
            genres,
            artists,
        });
    } catch (error) {
        console.error("Error fetching songs:", error);
        res.status(500).send("Server error during fetching songs.");
    }
});

router.get("/edit/:id", async (req, res) => {
    const { id } = req.params;
    try {
        const [rows] = await db.promise().execute("SELECT * FROM songs WHERE id = ?", [id]);
        if (!rows.length) {
            return res.send("آهنگ مورد نظر یافت نشد.");
        }
        const song = rows[0];
        res.render("edit", { song, user: req.session.user });
    } catch (error) {
        console.error("Error fetching song:", error);
        res.status(500).send("Server error during fetching song details.");
    }
});

router.post("/edit/:id", async (req, res) => {
    try {
        const { title, artist, genre } = req.body;
        await db
            .promise()
            .execute("UPDATE songs SET title = ?, artist = ?, genre = ? WHERE id = ?", [
                title,
                artist,
                genre,
                req.params.id,
            ]);
        res.redirect("/songs");
    } catch (error) {
        console.error("Error in /edit POST:", error);
        res.status(500).send("Server error during edit");
    }
});

module.exports = router;
