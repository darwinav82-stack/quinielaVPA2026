/**
 * Calculates the score for a single match prediction.
 * @param {number} predHome - Predicted home goals
 * @param {number} predAway - Predicted away goals
 * @param {number} actualHome - Actual home goals
 * @param {number} actualAway - Actual away goals
 * @returns {number} Points earned (0, 1, 2, or 3)
 */
export function calculateMatchPoints(predHome, predAway, actualHome, actualAway) {
  if (predHome === null || predAway === null || actualHome === null || actualAway === null) {
    return 0;
  }

  // Parse to integers just in case
  const ph = parseInt(predHome, 10);
  const pa = parseInt(predAway, 10);
  const ah = parseInt(actualHome, 10);
  const aa = parseInt(actualAway, 10);

  if (isNaN(ph) || isNaN(pa) || isNaN(ah) || isNaN(aa)) {
    return 0;
  }

  let points = 0;

  // 1 point for home team goals
  if (ph === ah) {
    points += 1;
  }

  // 1 point for away team goals
  if (pa === aa) {
    points += 1;
  }

  // 1 point for correct match outcome (winner or draw)
  const actualOutcome = ah > aa ? "home" : ah < aa ? "away" : "draw";
  const predOutcome = ph > pa ? "home" : ph < pa ? "away" : "draw";

  if (actualOutcome === predOutcome) {
    points += 1;
  }

  return points;
}

/**
 * Re-calculates total scores for all users based on finished matches and their predictions.
 * @param {Array} users - List of users from database
 * @param {Array} matches - List of matches from database
 * @param {Array} predictions - List of predictions from database
 * @returns {Array} Updated users with recalculated points
 */
export function updateLeaderboardPoints(users, matches, predictions) {
  const finishedMatches = new Map(
    matches
      .filter((m) => m.status === "finished" && m.scoreHome !== null && m.scoreAway !== null)
      .map((m) => [m.id, m])
  );

  // Initialize all participant points to 0
  const updatedUsers = users.map((user) => {
    if (user.role === "admin") {
      return { ...user, totalPoints: 0 };
    }
    
    // Sum points for all predictions corresponding to finished matches
    let totalPoints = 0;
    const userPredictions = predictions.filter((p) => p.userId === user.id);

    userPredictions.forEach((pred) => {
      const match = finishedMatches.get(pred.matchId);
      if (match) {
        totalPoints += calculateMatchPoints(
          pred.scoreHome,
          pred.scoreAway,
          match.scoreHome,
          match.scoreAway
        );
      }
    });

    return { ...user, totalPoints };
  });

  return updatedUsers;
}
