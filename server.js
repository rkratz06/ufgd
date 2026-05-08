const express = require("express");

const {
    insertLevel,
    addVictorByName,
    getEntryByPosition,
    getTopEntries,
    getPlayers
} = require("./database");

const app = express();
const PORT = 3000;

app.use(express.static("public"));
app.use(express.json());

/* =========================
   GET TOP LEVELS
========================= */
app.get("/levels", (req, res) => {

    const limit = req.query.limit || 100;

    getTopEntries(limit, (err, rows) => {

        if (err) return res.status(500).json({ error: err.message });

        res.json(rows);
    });
});

/* =========================
   GET BY POSITION
========================= */
app.get("/levels/:position", (req, res) => {

    getEntryByPosition(req.params.position, (err, row) => {

        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: "Not found" });

        res.json(row);
    });
});

/* =========================
   CREATE
========================= */
app.post("/levels", (req, res) => {

    const { name, position } = req.body;

    insertLevel(name, position, [], (err) => {

        if (err) return res.status(500).json({ error: err.message });

        res.json({ message: "Level created" });
    });
});

/* =========================
   ADD VICTOR
========================= */
app.post("/levels/:name/victor", (req, res) => {

    addVictorByName(
        req.params.name,
        req.body.victor,
        (err) => {

            if (err) return res.status(500).json({ error: err.message });

            res.json({ message: "Victor added" });
        }
    );
});

/* =========================
   DELETE
========================= */
app.delete("/levels/:position", (req, res) => {

    deleteLevel(req.params.position, (err) => {

        if (err) return res.status(500).json({ error: err.message });

        res.json({ message: "Deleted" });
    });
});

/* =========================
   MOVE
========================= */
app.put("/levels/move", (req, res) => {

    const { oldPosition, newPosition } = req.body;

    moveEntry(oldPosition, newPosition, (err) => {

        if (err) return res.status(500).json({ error: err.message });

        res.json({ message: "Moved" });
    });
});

//get players
app.get("/players", (req, res) => {
    getPlayers((err, rows) => {

        if (err) return res.status(500).json({ error: err.message });

        res.json(rows);
    });
})

/* =========================
   START SERVER
========================= */
app.listen(PORT, () => {
    console.log("server running");
});