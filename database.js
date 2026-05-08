const sqlite3 = require("sqlite3").verbose();

const db = new sqlite3.Database("./data.db");

/* =========================
   TABLES
========================= */

db.serialize(() => {

    db.run(`
    CREATE TABLE IF NOT EXISTS levels (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE,
        position INTEGER UNIQUE,
        points REAL
    )
    `);

    db.run(`
    CREATE TABLE IF NOT EXISTS players (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE,
        completed_levels INTEGER DEFAULT 0,
        cumulative_points REAL DEFAULT 0
    )
    `);

    db.run(`
    CREATE TABLE IF NOT EXISTS completions (
        player_id INTEGER,
        level_id INTEGER,

        PRIMARY KEY (player_id, level_id),

        FOREIGN KEY(player_id)
            REFERENCES players(id),

        FOREIGN KEY(level_id)
            REFERENCES levels(id)
    )
    `);
});

/* =========================
   POINTS
========================= */

function calculatePoints(position) {
    return Math.log(100 - position);
}

/* =========================
   INSERT LEVEL
========================= */

function insertLevel(name, position, callback) {

    db.run(
        `UPDATE levels
         SET position = position + 1
         WHERE position >= ?`,
        [position],
        (err) => {

            if (err) return callback(err);

            const points =
                calculatePoints(position);

            db.run(
                `INSERT INTO levels
                 (name, position, points)
                 VALUES (?, ?, ?)`,
                [name, position, points],
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
   RECALCULATE
========================= */

function recalculateAllPoints() {

    db.all(
        `SELECT id, position FROM levels`,
        [],
        (err, rows) => {

            if (err) {
                return console.error(err.message);
            }

            rows.forEach(level => {

                const points =
                    calculatePoints(level.position);

                db.run(
                    `UPDATE levels
                     SET points = ?
                     WHERE id = ?`,
                    [points, level.id]
                );
            });
        }
    );
}

/* =========================
   ADD VICTOR
========================= */

function addVictorByName(
    levelName,
    playerName,
    callback
) {

    // get level
    db.get(
        `SELECT * FROM levels
         WHERE name = ?`,
        [levelName],
        (err, level) => {

            if (err) return callback(err);

            if (!level) {
                return callback(
                    new Error("Level not found")
                );
            }

            // ensure player exists
            db.run(
                `INSERT OR IGNORE INTO players (name)
                 VALUES (?)`,
                [playerName],
                (err) => {

                    if (err) return callback(err);

                    // get player
                    db.get(
                        `SELECT * FROM players
                         WHERE name = ?`,
                        [playerName],
                        (err, player) => {

                            if (err) {
                                return callback(err);
                            }

                            // add completion
                            db.run(
                                `INSERT OR IGNORE
                                 INTO completions
                                 (player_id, level_id)
                                 VALUES (?, ?)`,
                                [
                                    player.id,
                                    level.id
                                ],
                                (err) => {

                                    if (err) {
                                        return callback(err);
                                    }

                                    // update stats
                                    db.run(
                                        `UPDATE players
                                         SET completed_levels =
                                             completed_levels + 1,

                                             cumulative_points =
                                             cumulative_points + ?

                                         WHERE id = ?`,
                                        [
                                            level.points,
                                            player.id
                                        ],
                                        callback
                                    );
                                }
                            );
                        }
                    );
                }
            );
        }
    );
}

/* =========================
   GET LEVEL
========================= */

function getEntryByPosition(
    position,
    callback
) {

    db.get(
        `SELECT * FROM levels
         WHERE position = ?`,
        [position],
        (err, level) => {

            if (err) return callback(err);

            if (!level) {
                return callback(null, null);
            }

            db.all(
                `
                SELECT players.name
                FROM completions

                JOIN players
                ON completions.player_id = players.id

                WHERE completions.level_id = ?
                `,
                [level.id],
                (err, victors) => {

                    if (err) {
                        return callback(err);
                    }

                    level.victors =
                        victors.map(v => v.name);

                    callback(null, level);
                }
            );
        }
    );
}

/* =========================
   GET TOP LEVELS
========================= */

function getTopEntries(
    limit,
    callback
) {

    db.all(
        `SELECT * FROM levels
         ORDER BY position ASC
         LIMIT ?`,
        [limit],
        (err, rows) => {

            if (err) return callback(err);

            callback(null, rows);
        }
    );
}

/* =========================
   GET PLAYERS
========================= */

function getPlayers(
    callback
) {

    db.all(
        `SELECT * FROM players
         ORDER BY cumulative_points DESC`,
         [],
        (err, rows) => {

            if (err) return callback(err);

            callback(null, rows);
        }
    );
}

/* =========================
   EXPORTS
========================= */

module.exports = {
    insertLevel,
    addVictorByName,
    getEntryByPosition,
    getTopEntries,
    getPlayers
};