const sqlite3 = require("sqlite3");

const db = new sqlite3.Database("./data.db", (err) => {
    if (err) {
        console.error(err.message);
    } else {
        console.log("Connected to SQLite database");
    }
});

db.run(`
    CREATE TABLE IF NOT EXISTS levels (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE,
    position INTEGER UNIQUE,
    points INTEGER,
    victors TEXT
    )
    `);

function calculatePoints(position) {
    return Math.log(100 - position);
}

function insertLevel(name, position, victors) {
    db.run(
        `UPDATE entries
        SET position = position + 1
        WHERE position >= ?`,
        [position],
        (err) => {
            if (err) {
                return console.error(err.message);
            }
            const points = calculatePoints(position);
            db.run(
                `INSERT INTO entries
                (name, position, points, victors)
                VALUES (?, ?, ?, ?)`,
                [
                    name,
                    position,
                    points,
                    victors
                ],
                (err) => {
                    if (err) {
                        return console.error(err.message);
                    }

                    recalculateAllPoints();
                }
            );
        }
    );
}

function recalculateAllPoints() {
    db.all(
        `SELECT id, position FROM entries`,
        [],
        (err, rows) => {
            if (err) {
                return console.error(err.message);
            }

            rows.forEach((row) => {
                const newPoints = calculatePoints(row.position);

                db.run(`
                    UPDATE entries
                    SET points = ?
                    WHERE id = ?`,
                [newPoints, row.id]
                );
            });
        }
    );
}

function addVictorByName(levelName, victorName) {
    db.get(`
        SELECT victors
        FROM entries
        WHERE name = ?`,
    [levelName],
    (err, row) => {
        if (err) {
            return console.error(err.message);
        }

        if (!row) {
            return console.log("Level not found");
        }

        let victors = JSON.parse(row.victors || "[]");

        if (!victors.includes(victorName)) {
            victors.push(victorName);
        }

        db.run(`UPDATE entries
            SET victors = ?
            WHERE name = ?`,
        [JSON.stringify(victors), levelName],
        (err) => {
            if (err) {
                console.error(err.message);
            } else {
                console.log("Victor added");
            }
        });
    });
}

function deleteLevel(position) {

    db.run(
        `DELETE FROM entries
         WHERE position = ?`,
        [position],
        (err) => {

            if (err) {
                return console.error(err.message);
            }

            // Shift remaining entries upward
            db.run(
                `UPDATE entries
                 SET position = position - 1
                 WHERE position > ?`,
                [position],
                (err) => {

                    if (err) {
                        return console.error(err.message);
                    }

                    recalculateAllPoints();

                    console.log("Entry deleted");
                }
            );
        }
    );
}

function moveEntry(oldPosition, newPosition) {

    db.get(
        `SELECT id
         FROM entries
         WHERE position = ?`,
        [oldPosition],
        (err, row) => {

            if (err) {
                return console.error(err.message);
            }

            if (!row) {
                return console.log("Entry not found");
            }

            const entryId = row.id;

            // Temporarily move entry out of range
            db.run(
                `UPDATE entries
                 SET position = -1
                 WHERE id = ?`,
                [entryId],
                (err) => {

                    if (err) {
                        return console.error(err.message);
                    }

                    if (newPosition < oldPosition) {

                        // Shift entries down
                        db.run(
                            `UPDATE entries
                             SET position = position + 1
                             WHERE position >= ?
                             AND position < ?`,
                            [newPosition, oldPosition],
                            finishMove
                        );

                    } else {

                        // Shift entries up
                        db.run(
                            `UPDATE entries
                             SET position = position - 1
                             WHERE position <= ?
                             AND position > ?`,
                            [newPosition, oldPosition],
                            finishMove
                        );
                    }

                    function finishMove(err) {

                        if (err) {
                            return console.error(err.message);
                        }

                        db.run(
                            `UPDATE entries
                             SET position = ?
                             WHERE id = ?`,
                            [newPosition, entryId],
                            (err) => {

                                if (err) {
                                    return console.error(err.message);
                                }

                                recalculateAllPoints();

                                console.log("Entry moved");
                            }
                        );
                    }
                }
            );
        }
    );
}

function removeVictor(entryName, victorName) {

    db.get(
        `SELECT victors
         FROM entries
         WHERE name = ?`,
        [entryName],
        (err, row) => {

            if (err) {
                return console.error(err.message);
            }

            if (!row) {
                return console.log("Entry not found");
            }

            let victors =
                JSON.parse(row.victors || "[]");

            victors =
                victors.filter(
                    v => v !== victorName
                );

            db.run(
                `UPDATE entries
                 SET victors = ?
                 WHERE name = ?`,
                [
                    JSON.stringify(victors),
                    entryName
                ],
                (err) => {

                    if (err) {
                        return console.error(err.message);
                    }

                    console.log("Victor removed");
                }
            );
        }
    );
}

function getEntryByPosition(position) {

    db.get(
        `SELECT *
         FROM entries
         WHERE position = ?`,
        [position],
        (err, row) => {

            if (err) {
                return console.error(err.message);
            }

            if (!row) {
                return console.log("Entry not found");
            }

            row.victors =
                JSON.parse(row.victors || "[]");

            console.log(row);
        }
    );
}

function getTopEntries(limit) {

    db.all(
        `SELECT *
         FROM entries
         ORDER BY position ASC
         LIMIT ?`,
        [limit],
        (err, rows) => {

            if (err) {
                return console.error(err.message);
            }

            rows.forEach((row) => {

                row.victors =
                    JSON.parse(row.victors || "[]");
            });

            console.log(rows);
        }
    );
}

module.exports = db;