const sqlite3 = require("sqlite3").verbose();

const db = new sqlite3.Database("./data.db");

/* =========================
   SAMPLE DATA
========================= */

const sampleLevels = [
    {
        name: "Requiem",
        victors: ["Kryan", "Vyzed"]
    },
    {
        name: "Killbot",
        victors: ["Technical", "Nexus"]
    },
    {
        name: "Black Blizzard",
        victors: ["Riot", "AeonAir"]
    }
];

/* =========================
   POINTS FUNCTION
========================= */

function calculatePoints(position) {
    return Math.log(100 - position);
}

/* =========================
   INSERT DATA
========================= */

db.serialize(() => {

    /* -------------------------
       CLEAR OLD DATA
    ------------------------- */

    db.run(`DELETE FROM completions`);
    db.run(`DELETE FROM players`);
    db.run(`DELETE FROM levels`);

    /* -------------------------
       INSERT LEVELS
    ------------------------- */

    sampleLevels.forEach((levelData, index) => {

        const position = index + 1;

        const points =
            calculatePoints(position);

        db.run(
            `INSERT INTO levels
             (name, position, points)
             VALUES (?, ?, ?)`,
            [
                levelData.name,
                position,
                points
            ],

            function(err) {

                if (err) {
                    return console.error(err.message);
                }

                const levelId = this.lastID;

                /* -------------------------
                   INSERT PLAYERS + COMPLETIONS
                ------------------------- */

                levelData.victors.forEach(playerName => {

                    // create player if missing
                    db.run(
                        `INSERT OR IGNORE INTO players
                         (name, completed_levels, cumulative_points)
                         VALUES (?, 0, 0)`,
                        [playerName],
                        (err) => {

                            if (err) {
                                return console.error(err.message);
                            }

                            // get player id
                            db.get(
                                `SELECT id
                                 FROM players
                                 WHERE name = ?`,
                                [playerName],
                                (err, playerRow) => {

                                    if (err) {
                                        return console.error(err.message);
                                    }

                                    const playerId =
                                        playerRow.id;

                                    // add completion
                                    db.run(
                                        `INSERT INTO completions
                                         (player_id, level_id)
                                         VALUES (?, ?)`,
                                        [
                                            playerId,
                                            levelId
                                        ],
                                        (err) => {

                                            if (err) {
                                                return console.error(err.message);
                                            }

                                            // update player stats
                                            db.run(
                                                `
                                                UPDATE players

                                                SET completed_levels =
                                                    completed_levels + 1,

                                                    cumulative_points =
                                                    cumulative_points + ?

                                                WHERE id = ?
                                                `,
                                                [
                                                    points,
                                                    playerId
                                                ]
                                            );
                                        }
                                    );
                                }
                            );
                        }
                    );
                });
            }
        );
    });

    console.log("Seed data inserted!");
});