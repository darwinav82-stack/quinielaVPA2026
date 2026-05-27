import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { fileURLToPath } from "url";
import { generateMatches } from "./services/mockMatches.js";
import { updateLeaderboardPoints } from "./services/scoringEngine.js";
import { fetchLiveScoresAndSchedule } from "./services/scheduleFetcher.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = "copamundial2026_super_secret_key";
const DB_PATH = path.join(__dirname, "data", "database.json");

// Middleware
app.use(cors());
app.use(express.json());

// Initialize Database Directory and File
function initDatabase() {
  const dataDir = path.dirname(DB_PATH);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  if (!fs.existsSync(DB_PATH)) {
    const salt = bcrypt.genSaltSync(10);
    const adminPasswordHash = bcrypt.hashSync("admin123", salt);

    const initialDb = {
      users: [
        {
          id: "user_admin",
          username: "admin",
          passwordHash: adminPasswordHash,
          role: "admin",
          mustChangePassword: false,
          totalPoints: 0
        }
      ],
      matches: generateMatches(),
      predictions: []
    };

    fs.writeFileSync(DB_PATH, JSON.stringify(initialDb, null, 2), "utf8");
    console.log("Database initialized with default admin and World Cup 2026 matches.");
  } else {
    // If database exists, verify matches are populated
    try {
      const data = JSON.parse(fs.readFileSync(DB_PATH, "utf8"));
      if (!data.matches || data.matches.length === 0) {
        data.matches = generateMatches();
        fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), "utf8");
        console.log("Database matches re-populated.");
      }
    } catch (err) {
      console.error("Error reading/validating database:", err);
    }
  }
}

initDatabase();

// Database Helper Functions (Atomic JSON file access)
function readDb() {
  try {
    const rawData = fs.readFileSync(DB_PATH, "utf8");
    return JSON.parse(rawData);
  } catch (err) {
    console.error("Error reading database:", err);
    return { users: [], matches: [], predictions: [] };
  }
}

function writeDb(data) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), "utf8");
  } catch (err) {
    console.error("Error writing database:", err);
  }
}

// Authentication Middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "Token de acceso no proporcionado." });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: "Token inválido o expirado." });
    }
    req.user = user;
    next();
  });
}

// Admin Authorization Middleware
function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ message: "Acceso denegado. Se requiere rol de administrador." });
  }
  next();
}

// --- API ROUTES ---

// 1. Auth: Login
app.post("/api/auth/login", (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: "Usuario y contraseña son requeridos." });
  }

  const db = readDb();
  const user = db.users.find(
    (u) => u.username.toLowerCase() === username.toLowerCase()
  );

  if (!user) {
    return res.status(401).json({ message: "Credenciales incorrectas." });
  }

  const validPassword = bcrypt.compareSync(password, user.passwordHash);
  if (!validPassword) {
    return res.status(401).json({ message: "Credenciales incorrectas." });
  }

  const token = jwt.sign(
    {
      id: user.id,
      username: user.username,
      role: user.role,
      mustChangePassword: user.mustChangePassword
    },
    JWT_SECRET,
    { expiresIn: "24h" }
  );

  res.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      role: user.role,
      mustChangePassword: user.mustChangePassword
    }
  });
});

// 2. Auth: Change Password (Forced on first login or manual)
app.post("/api/auth/change-password", authenticateToken, (req, res) => {
  const { newPassword } = req.body;

  if (!newPassword || newPassword.trim().length < 4) {
    return res.status(400).json({ message: "La nueva contraseña debe tener al menos 4 caracteres." });
  }

  const db = readDb();
  const userIndex = db.users.findIndex((u) => u.id === req.user.id);

  if (userIndex === -1) {
    return res.status(404).json({ message: "Usuario no encontrado." });
  }

  const salt = bcrypt.genSaltSync(10);
  db.users[userIndex].passwordHash = bcrypt.hashSync(newPassword, salt);
  db.users[userIndex].mustChangePassword = false;

  writeDb(db);

  // Return new token containing updated mustChangePassword status
  const token = jwt.sign(
    {
      id: db.users[userIndex].id,
      username: db.users[userIndex].username,
      role: db.users[userIndex].role,
      mustChangePassword: false
    },
    JWT_SECRET,
    { expiresIn: "24h" }
  );

  res.json({
    token,
    message: "Contraseña cambiada con éxito.",
    user: {
      id: db.users[userIndex].id,
      username: db.users[userIndex].username,
      role: db.users[userIndex].role,
      mustChangePassword: false
    }
  });
});

// 3. Admin: Get all users
app.get("/api/users", authenticateToken, requireAdmin, (req, res) => {
  const db = readDb();
  const safeUsers = db.users.map(({ passwordHash, ...user }) => user);
  res.json(safeUsers);
});

// 4. Admin: Add new user (auto-generates password)
app.post("/api/users", authenticateToken, requireAdmin, (req, res) => {
  const { username } = req.body;

  if (!username || username.trim().length < 3) {
    return res.status(400).json({ message: "El nombre de usuario debe tener al menos 3 caracteres." });
  }

  const db = readDb();
  const exists = db.users.some(
    (u) => u.username.toLowerCase() === username.trim().toLowerCase()
  );

  if (exists) {
    return res.status(400).json({ message: "El nombre de usuario ya existe." });
  }

  // Generate a random 8-character password
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let generatedPassword = "";
  for (let i = 0; i < 8; i++) {
    generatedPassword += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  const salt = bcrypt.genSaltSync(10);
  const passwordHash = bcrypt.hashSync(generatedPassword, salt);

  const newUser = {
    id: `user_${Date.now()}`,
    username: username.trim(),
    passwordHash,
    role: "user",
    mustChangePassword: true, // Forced reset on first login
    totalPoints: 0
  };

  db.users.push(newUser);
  writeDb(db);

  res.status(201).json({
    message: "Usuario creado exitosamente.",
    user: {
      id: newUser.id,
      username: newUser.username,
      role: newUser.role,
      mustChangePassword: newUser.mustChangePassword,
      totalPoints: newUser.totalPoints
    },
    generatedPassword // Sent to the admin once
  });
});

// 4.1 Admin: Delete User
app.delete("/api/users/:id", authenticateToken, requireAdmin, (req, res) => {

  const { id } = req.params;

  const db = readDb();

  // Buscar usuario
  const user = db.users.find((u) => u.id === id);

  if (!user) {
    return res.status(404).json({
      message: "Usuario no encontrado."
    });
  }

  // Evitar eliminar admin principal
  if (user.role === "admin") {
    return res.status(400).json({
      message: "No se puede eliminar el administrador principal."
    });
  }

  // Eliminar usuario
  db.users = db.users.filter((u) => u.id !== id);

  // Eliminar predicciones asociadas
  db.predictions = db.predictions.filter(
    (p) => p.userId !== id
  );

  writeDb(db);

  res.json({
    message: "Usuario eliminado correctamente."
  });

});

// 5. General: Get matches (attaches authenticated user's prediction if logged in)
app.get("/api/matches", authenticateToken, (req, res) => {
  const db = readDb();
  const userId = req.user.id;

  // Map predictions to matches for easy UI usage
  const userPredictions = db.predictions.filter((p) => p.userId === userId);
  const predictionMap = new Map(userPredictions.map((p) => [p.matchId, p]));

  const matchesWithPredictions = db.matches.map((match) => {
    const pred = predictionMap.get(match.id);
    return {
      ...match,
      prediction: pred ? { scoreHome: pred.scoreHome, scoreAway: pred.scoreAway } : null
    };
  });

  res.json(matchesWithPredictions);
});

// 6. User: Submit / Update Prediction
app.post("/api/predictions", authenticateToken, (req, res) => {
  const { matchId, scoreHome, scoreAway } = req.body;

  if (scoreHome === undefined || scoreAway === undefined || scoreHome === "" || scoreAway === "") {
    return res.status(400).json({ message: "Marcadores son requeridos para la predicción." });
  }

  const db = readDb();
  const match = db.matches.find((m) => m.id === matchId);

  if (!match) {
    return res.status(404).json({ message: "Partido no encontrado." });
  }

  // Check if match is locked (either marked as locked, is live, or is finished)
  if (match.isLocked || match.status !== "scheduled") {
    return res.status(400).json({ message: "No se pueden modificar predicciones para un partido que ya inició o está bloqueado." });
  }

  const userId = req.user.id;
  const predIndex = db.predictions.findIndex(
    (p) => p.userId === userId && p.matchId === matchId
  );

  const parsedHome = parseInt(scoreHome, 10);
  const parsedAway = parseInt(scoreAway, 10);

  if (isNaN(parsedHome) || isNaN(parsedAway) || parsedHome < 0 || parsedAway < 0) {
    return res.status(400).json({ message: "Los marcadores deben ser números enteros no negativos." });
  }

  const prediction = {
    id: predIndex !== -1 ? db.predictions[predIndex].id : `pred_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    userId,
    matchId,
    scoreHome: parsedHome,
    scoreAway: parsedAway,
    updatedAt: new Date().toISOString()
  };

  if (predIndex !== -1) {
    db.predictions[predIndex] = prediction;
  } else {
    db.predictions.push(prediction);
  }

  writeDb(db);

  res.json({
    message: "Predicción guardada con éxito.",
    prediction: { scoreHome: parsedHome, scoreAway: parsedAway }
  });
});

// 7. General: Get Leaderboard
app.get("/api/leaderboard", authenticateToken, (req, res) => {
  const db = readDb();
  
  // Sort user participants by points descending
  const participants = db.users
    .filter((u) => u.role !== "admin")
    .map(({ id, username, totalPoints }) => ({ id, username, totalPoints }))
    .sort((a, b) => b.totalPoints - a.totalPoints);

  res.json(participants);
});

// 8. Admin: Sync matches (Internet generation / reset simulation)
app.post("/api/matches/sync", authenticateToken, requireAdmin, (req, res) => {
  const db = readDb();

  // Reset to original scheduled list (simulating fetching clean data from the internet)
  db.matches = generateMatches();
  
  // Re-calculate points (which will reset to 0 since no matches are finished now)
  db.users = updateLeaderboardPoints(db.users, db.matches, db.predictions);

  writeDb(db);
  res.json({ message: "Partidos sincronizados exitosamente desde internet (Restaurados al calendario inicial).", matches: db.matches });
});

// 9. Admin: Control Match Status (Simulation of Real-time and Lock)
app.post("/api/matches/:id/simulate", authenticateToken, requireAdmin, (req, res) => {
  const { id } = req.params;
  const { action, scoreHome, scoreAway } = req.body;

  const db = readDb();
  const matchIndex = db.matches.findIndex((m) => m.id === id);

  if (matchIndex === -1) {
    return res.status(404).json({ message: "Partido no encontrado." });
  }

  const match = db.matches[matchIndex];

  switch (action) {
    case "lock":
      db.matches[matchIndex].isLocked = true;
      break;
    case "unlock":
      db.matches[matchIndex].isLocked = false;
      break;
    case "start_live":
      // Lock predictions when live begins
      db.matches[matchIndex].status = "live";
      db.matches[matchIndex].isLocked = true;
      db.matches[matchIndex].scoreHome = scoreHome !== undefined ? parseInt(scoreHome, 10) : 0;
      db.matches[matchIndex].scoreAway = scoreAway !== undefined ? parseInt(scoreAway, 10) : 0;
      break;
    case "update_live":
      if (match.status !== "live") {
        return res.status(400).json({ message: "El partido debe estar en vivo para actualizar el marcador en tiempo real." });
      }
      db.matches[matchIndex].scoreHome = parseInt(scoreHome, 10);
      db.matches[matchIndex].scoreAway = parseInt(scoreAway, 10);
      break;
    case "finalize":
      db.matches[matchIndex].status = "finished";
      db.matches[matchIndex].isLocked = true;
      if (scoreHome !== undefined && scoreAway !== undefined) {
        db.matches[matchIndex].scoreHome = parseInt(scoreHome, 10);
        db.matches[matchIndex].scoreAway = parseInt(scoreAway, 10);
      }
      // Calculate scores automatically when finalized
      db.users = updateLeaderboardPoints(db.users, db.matches, db.predictions);
      break;
    default:
      return res.status(400).json({ message: "Acción de simulación no válida." });
  }

  writeDb(db);
  res.json({
    message: `Partido simulado con acción: ${action}`,
    match: db.matches[matchIndex],
    leaderboard: db.users
      .filter((u) => u.role !== "admin")
      .map(({ id, username, totalPoints }) => ({ id, username, totalPoints }))
      .sort((a, b) => b.totalPoints - a.totalPoints)
  });
});

// Background Auto-Sync Engine
async function runAutoSync() {
  try {
    const db = readDb();
    const { matches: newMatches, updated } = await fetchLiveScoresAndSchedule(db.matches);
    
    if (updated) {
      db.matches = newMatches;
      // Recalculate leaderboard in case any matches finalized during sync
      db.users = updateLeaderboardPoints(db.users, db.matches, db.predictions);
      writeDb(db);
      console.log("🔄 [AUTO-SYNC] Marcadores actualizados automáticamente en base de datos.");
    }
  } catch (err) {
    console.error("❌ Error en auto-sync:", err);
  }
}

// Serve static files from React build in production
//const distPath = path.join(__dirname, "../frontend/dist");
//app.use(express.static(distPath));

// Fallback all non-API GET requests to index.html for React routing
/*app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api")) {
    return next();
  }
  const indexPath = path.join(distPath, "index.html");
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(200).send("<h3>Quiniela VPA Backend is Running.</h3><p>Para ver el frontend, asegúrate de compilarlo con 'npm run build' en la carpeta frontend.</p>");
  }
});
*/

app.get("/", (req, res) => {
  res.json({
    message: "Quiniela Backend API Running"
  });
});

// Run auto-sync every 15 seconds
setInterval(runAutoSync, 15000);

// Start Server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
