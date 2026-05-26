export const groupsData = {
  "Grupo A": [
    { name: "México", flag: "🇲🇽", code: "mx" },
    { name: "Sudáfrica", flag: "🇿🇦", code: "za" },
    { name: "Corea del Sur", flag: "🇰🇷", code: "kr" },
    { name: "Dinamarca", flag: "🇩🇰", code: "dk" }
  ],
  "Grupo B": [
    { name: "Canadá", flag: "🇨🇦", code: "ca" },
    { name: "Catar", flag: "🇶🇦", code: "qa" },
    { name: "Suiza", flag: "🇨🇭", code: "ch" },
    { name: "Italia", flag: "🇮🇹", code: "it" }
  ],
  "Grupo C": [
    { name: "Brasil", flag: "🇧🇷", code: "br" },
    { name: "Marruecos", flag: "🇲🇦", code: "ma" },
    { name: "Haití", flag: "🇭🇹", code: "ht" },
    { name: "Escocia", flag: "🏴󠁧󠁢󠁳󠁣󠁴󠁿", code: "gb-sct" }
  ],
  "Grupo D": [
    { name: "Estados Unidos", flag: "🇺🇸", code: "us" },
    { name: "Paraguay", flag: "🇵🇾", code: "py" },
    { name: "Australia", flag: "🇦🇺", code: "au" },
    { name: "Turquía", flag: "🇹🇷", code: "tr" }
  ],
  "Grupo E": [
    { name: "Alemania", flag: "🇩🇪", code: "de" },
    { name: "Curazao", flag: "🇨🇼", code: "cw" },
    { name: "Costa de Marfil", flag: "🇨🇮", code: "ci" },
    { name: "Ecuador", flag: "🇪🇨", code: "ec" }
  ],
  "Grupo F": [
    { name: "Países Bajos", flag: "🇳🇱", code: "nl" },
    { name: "Japón", flag: "🇯🇵", code: "jp" },
    { name: "Túnez", flag: "🇹🇳", code: "tn" },
    { name: "Ucrania", flag: "🇺🇦", code: "ua" }
  ],
  "Grupo G": [
    { name: "Bélgica", flag: "🇧🇪", code: "be" },
    { name: "Egipto", flag: "🇪🇬", code: "eg" },
    { name: "Irán", flag: "🇮🇷", code: "ir" },
    { name: "Nueva Zelanda", flag: "🇳🇿", code: "nz" }
  ],
  "Grupo H": [
    { name: "España", flag: "🇪🇸", code: "es" },
    { name: "Cabo Verde", flag: "🇨🇻", code: "cv" },
    { name: "Arabia Saudita", flag: "🇸🇦", code: "sa" },
    { name: "Uruguay", flag: "🇺🇾", code: "uy" }
  ],
  "Grupo I": [
    { name: "Francia", flag: "🇫🇷", code: "fr" },
    { name: "Senegal", flag: "🇸🇳", code: "sn" },
    { name: "Noruega", flag: "🇳🇴", code: "no" },
    { name: "Bolivia", flag: "🇧🇴", code: "bo" }
  ],
  "Grupo J": [
    { name: "Argentina", flag: "🇦🇷", code: "ar" },
    { name: "Argelia", flag: "🇩🇿", code: "dz" },
    { name: "Austria", flag: "🇦🇹", code: "at" },
    { name: "Jordania", flag: "🇯🇴", code: "jo" }
  ],
  "Grupo K": [
    { name: "Portugal", flag: "🇵🇹", code: "pt" },
    { name: "Uzbekistán", flag: "🇺🇿", code: "uz" },
    { name: "Colombia", flag: "🇨🇴", code: "co" },
    { name: "Jamaica", flag: "🇯🇲", code: "jm" }
  ],
  "Grupo L": [
    { name: "Inglaterra", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", code: "gb-eng" },
    { name: "Croacia", flag: "🇭🇷", code: "hr" },
    { name: "Ghana", flag: "🇬🇭", code: "gh" },
    { name: "Panamá", flag: "🇵🇦", code: "pa" }
  ]
};

export function generateMatches() {
  const matches = [];
  
  // We have 3 rounds:
  // Ronda 1: pairings 0 & 1
  // Ronda 2: pairings 2 & 3
  // Ronda 3: pairings 4 & 5
  const rounds = [
    { name: "Ronda 1", pairings: [[0, 1], [2, 3]] },
    { name: "Ronda 2", pairings: [[0, 2], [1, 3]] },
    { name: "Ronda 3", pairings: [[3, 0], [1, 2]] }
  ];

  const startDate = new Date("2026-06-11T12:00:00-06:00"); // First match: June 11, 2026 local time
  let matchId = 1;
  
  // Generate matches round by round to match official tournament schedule
  rounds.forEach((round, roundIndex) => {
    Object.entries(groupsData).forEach(([groupName, teams], groupIndex) => {
      round.pairings.forEach((pair) => {
        const teamHome = teams[pair[0]];
        const teamAway = teams[pair[1]];
        
        matches.push({
          id: `match_temp_${matchId++}`,
          roundIndex,
          groupIndex,
          group: groupName,
          teamHome: teamHome.name,
          teamHomeFlag: teamHome.flag,
          teamHomeFlagCode: teamHome.code,
          teamAway: teamAway.name,
          teamAwayFlag: teamAway.flag,
          teamAwayFlagCode: teamAway.code,
          status: "scheduled",
          scoreHome: null,
          scoreAway: null,
          isLocked: false
        });
      });
    });
  });

  // Distribute the 72 matches sequentially from June 11 to June 27, 2026 (17 days inclusive).
  // Days 0 to 13 (June 11 - June 24) get 4 matches per day.
  // Days 14 to 16 (June 25 - June 27) get 5-6 concurrent matches to avoid collusion in final games.
  matches.forEach((match, idx) => {
    let dayOffset = 0;
    let matchIndexInDay = 0;
    
    if (idx < 56) {
      dayOffset = Math.floor(idx / 4);
      matchIndexInDay = idx % 4;
    } else {
      const remainingIdx = idx - 56;
      dayOffset = 14 + Math.floor(remainingIdx / 8); // 8 concurrent matches per day for final round days
      matchIndexInDay = remainingIdx % 8;
    }
    
    const matchDate = new Date(startDate);
    matchDate.setDate(startDate.getDate() + dayOffset);
    
    let hour = 12;
    if (dayOffset < 14) {
      // 4 matches a day: staggered every 3 hours
      hour = 12 + matchIndexInDay * 3;
    } else {
      // 8 matches a day: concurrent blocks at 15:00 and 19:00 local time
      hour = matchIndexInDay < 4 ? 15 : 19;
    }
    
    matchDate.setHours(hour, 0, 0, 0);
    
    match.id = `match_${idx + 1}`;
    match.date = matchDate.toISOString();
    
    delete match.roundIndex;
    delete match.groupIndex;
  });

  return matches;
}
