const sqlite3 = require("sqlite3").verbose();

const db = new sqlite3.Database("./data.db");

db.run(`
CREATE TABLE IF NOT EXISTS levels (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE,
    position INTEGER UNIQUE,
    points REAL,
    victors TEXT
)
`);

function calculatePoints(position) {
    return Math.log(100 - position);
}

/* =========================
   INSERT
========================= */
function insertLevel(name, position, victors, callback) {

    db.run(
        `UPDATE levels
         SET position = position + 1
         WHERE position >= ?`,
        [position],
        (err) => {
            if (err) return callback(err);

            const points = calculatePoints(position);

            db.run(
                `INSERT INTO levels
                (name, position, points, victors)
                VALUES (?, ?, ?, ?)`,
                [name, position, points, JSON.stringify(victors)],
                (err) => {
                    if (err) return callback(err);

                    recalculateAllPoints();
                    callback(null);
                }
            );
        }
    );
}

/* =========================
   RECALCULATE POINTS
========================= */
function recalculateAllPoints() {

    db.all(`SELECT id, position FROM levels`, [], (err, rows) => {
        if (err) return console.error(err.message);

        rows.forEach(row => {
            db.run(
                `UPDATE levels SET points = ? WHERE id = ?`,
                [calculatePoints(row.position), row.id]
            );
        });
    });
}

/* =========================
   GET TOP ENTRIES (FIXED)
========================= */
function getTopEntries(limit, callback) {

    db.all(
        `SELECT * FROM levels ORDER BY position ASC LIMIT ?`,
        [limit],
        (err, rows) => {
            if (err) return callback(err);

            const formatted = rows.map(r => ({
                ...r,
                victors: JSON.parse(r.victors || "[]")
            }));

            callback(null, formatted);
        }
    );
}

/* =========================
   GET BY POSITION (FIXED)
========================= */
function getEntryByPosition(position, callback) {

    db.get(
        `SELECT * FROM levels WHERE position = ?`,
        [position],
        (err, row) => {
            if (err) return callback(err);
            if (!row) return callback(null, null);

            row.victors = JSON.parse(row.victors || "[]");
            callback(null, row);
        }
    );
}

/* =========================
   ADD VICTOR (FIXED CALLBACK)
========================= */
function addVictorByName(name, victor, callback) {

    db.get(
        `SELECT victors FROM levels WHERE name = ?`,
        [name],
        (err, row) => {
            if (err) return callback(err);
            if (!row) return callback(new Error("Level not found"));

            let victors = JSON.parse(row.victors || "[]");

            if (!victors.includes(victor)) {
                victors.push(victor);
            }

            db.run(
                `UPDATE levels SET victors = ? WHERE name = ?`,
                [JSON.stringify(victors), name],
                callback
            );
        }
    );
}

/* =========================
   DELETE
========================= */
function deleteLevel(position, callback) {

    db.run(
        `DELETE FROM levels WHERE position = ?`,
        [position],
        (err) => {
            if (err) return callback(err);

            db.run(
                `UPDATE levels SET position = position - 1 WHERE position > ?`,
                [position],
                (err) => {
                    if (err) return callback(err);

                    recalculateAllPoints();
                    callback(null);
                }
            );
        }
    );
}

/* =========================
   MOVE (simplified safe version)
========================= */
function moveEntry(oldPos, newPos, callback) {

    db.run(
        `UPDATE levels SET position = ? WHERE position = ?`,
        [newPos, oldPos],
        (err) => {
            if (err) return callback(err);

            recalculateAllPoints();
            callback(null);
        }
    );
}

/* =========================
   EXPORTS
========================= */
module.exports = {
    insertLevel,
    addVictorByName,
    deleteLevel,
    moveEntry,
    getEntryByPosition,
    getTopEntries
};