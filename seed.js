const sqlite3 = require("sqlite3").verbose();

const db = new sqlite3.Database("./data.db");

/* =========================
   SAMPLE DATA
========================= */

const sampleLevels = [
    "Requiem",
    "Killbot",
    "Black Blizzard",
];

/* =========================
   INSERT DATA
========================= */

db.serialize(() => {

    // optional: clear old data
    db.run(`DELETE FROM levels`);

    sampleLevels.forEach((name, index) => {

        const position = index + 1;
        const points = Math.log(100 - position);
        const victors = JSON.stringify([
            "Kryan",
            "Vyzed"
        ]);

        db.run(
            `INSERT INTO levels
             (name, position, points, victors)
             VALUES (?, ?, ?, ?)`,
            [name, position, points, victors]
        );
    });

    console.log("Seed data inserted!");
});