// ============================================================
//  GAMES OF THE DAY — 2x2 Scriptable widget
//  Built for Michael (@movingtoadventure) — Nov 13, 2026
//  Shows today's games he cares about: ranked college football
//  (Playoff Committee Top 25), ranked college basketball (AP
//  Top 25), Orioles games or nationally-televised MLB, and the
//  next NASCAR Cup Series race — but the NASCAR row only appears
//  once the race is within 2 days (see nascarShowWithinDays).
//  NFL is the lowest priority: good NFL games only fill a row when
//  the other sports don't have enough games to fill all 3 slots.
//  Dark, professional look.
//
//  SETUP: install the free "Scriptable" app, create a new
//  script, paste this whole file in, then add a Small Scriptable
//  widget to your home screen and pick this script.
// ============================================================

// ---------- SETTINGS (edit these to change the widget) ----------
const CONFIG = {
  darkMode: true,            // dark look (confirmed)
  showLiveScores: true,      // show live scores for games in progress (confirmed)
  noGamesMode: "lookahead",  // on days with no games: "lookahead" = show
                             // "No games today" + up to 2 of tomorrow's games
  maxGameRows: 3,            // game rows on the small widget
  maxLookaheadRows: 2,       // tomorrow games shown on a no-games day
  includeNascarExhibitions: true, // false = skip the Clash/Duels, show next points race
  nascarShowWithinDays: 2,   // only show the NASCAR row when the next race is
                             // this many days away or less (Michael: a Feb 13
                             // race should first appear around Feb 11-12, not
                             // months ahead). 0 = race day only.
  tapUrl: "https://movingtoadventure.github.io/todays-games/", // live full-day page (GitHub Pages)
};

// ---------- PRIORITY RULES (Michael's picks, 2026-11-13) ----------
// Which games are picked: playoffs first, then one pinned top-5 vs top-5
// matchup (stuck on the widget all day unless it becomes a live blowout),
// then live close games, upcoming games, live blowouts, finals. Inside
// each group: sport priority MLB > LLWS > CFB > CBB > NFL; inside a sport:
// MLB by best combined record, CFB/CBB by SEC/Big Ten first (Big 12 too in
// basketball), then competitiveness (two quality teams > one > none),
// then both teams' records, then best ranks, then earliest.
// NFL is the lowest priority and only ever fills a slot the other sports
// leave open (Michael, 2026-11-16): an NFL game never jumps ahead of a
// CFB/CBB/MLB/LLWS game, not even a playoff or live-close one.
// DISPLAY order (Michael, 2026-11-14): the picked rows are shown in the
// order the games occur — earliest start time first — so the widget reads
// like the day's schedule. A tomorrow game (when shown) comes last.
// LATE KICKOFFS (Michael, 2026-11-14): a game kicking off after 9:30 PM
// local is demoted below earlier games in the same sport, so a 10:30 PM
// game does not take a slot in the morning when a 7:30 PM game is still
// to come. Only upcoming games are demoted; a live late game keeps its
// place, and the pinned top-5 matchup is unaffected.
// MIX (Michael, 2026-11-14): today's games can fill all 3 rows. If today
// has 3 or more good games, no tomorrow game appears. Tomorrow's games
// only fill slots today doesn't use.
// NASCAR has its own row (top priority): on race day it sits at the TOP of
// the widget, otherwise at the bottom (only shown within nascarShowWithinDays).
// A live blowout is demoted below upcoming games. The widget mixes sports
// freely — football, basketball, and baseball can all show at once; the
// priority is simply the best games of the day, not one sport per slot.
const SPORT_ORDER = { MLB: 0, LLWS: 1, CFB: 2, CBB: 3, NFL: 4 };
const BLOWOUT_MARGIN = { CFB: 24, CBB: 21, MLB: 6, LLWS: 10, NFL: 24 }; // live lead that counts as a blowout
// (NFL blowout is 24, same as CFB: both are high-scoring football, and a
//  24-point lead is out of reach late.)
// (Michael: football blowout is roughly 21-28 points — 24 is the middle;
//  basketball is more than 20, so 21.)
const FAV_CONFERENCES = {
  CFB: ["8", "5"],       // ESPN conferenceIds: SEC 8, Big Ten 5
  CBB: ["23", "7", "8"], // ESPN conferenceIds: SEC 23, Big Ten 7, Big 12 8
  // (IDs differ by sport: CFB 8 is the SEC, CBB 8 is the Big 12 — verified.)
};
// Power conferences — a team in one of these is a "quality" opponent even
// when unranked (Ohio State, UConn, etc.). Power Four: ACC, Big Ten,
// Big 12, SEC (plus the Big East, a major basketball conference).
// CFB: SEC 8, Big Ten 5, ACC 1, Big 12 4. CBB: SEC 23, Big Ten 7,
// Big 12 8, ACC 2, Big East 4.
const POWER_CONFERENCES = {
  CFB: ["8", "5", "1", "4"],
  CBB: ["23", "7", "8", "2", "4"],
};
// A "quality" team is one that is ranked, or plays in a power conference.
// A game with two quality teams (Kansas vs Ohio State, Arizona vs Auburn,
// Virginia vs Maryland) is a better, more competitive game than a ranked
// team vs a tiny school (Florida vs Merrimack), so it ranks higher.
// Ranked-vs-ranked is the highest priority of all (both teams quality).
function qualityCount(g) {
  const confs = POWER_CONFERENCES[g.sport] || [];
  return g.teams.filter((t) => t.rank || confs.indexOf(t.conf) !== -1).length;
}
// How many teams in the game are ranked. Ranked-vs-ranked must outrank a
// ranked team vs an unranked power-conference team (Michael, 2026-11-16):
// qualityCount alone ties them (both count as two quality teams), so the
// ranked count breaks the tie first — e.g. #5 Duke vs #10 Illinois beats
// #8 Houston vs unranked Rutgers even when the records differ.
function rankedCount(g) {
  return g.teams.filter((t) => t.rank).length;
}

// NOTE on favorite team: Michael's favorite college team is the
// Maryland Terrapins, but he asked NOT to bump Maryland football
// to the front of the widget — Maryland football belongs in the
// full view (opened by tapping the widget). Ranked Maryland
// basketball games still appear through the normal ranked filter.
// So there is deliberately no team-priority ordering here.

// ---------- NASCAR CUP SERIES SCHEDULE (edit to update) ----------
// ESPN has no NASCAR feed, so the next race comes from this list.
// Dates/networks verified 2026-11-13 from NASCAR.com (2027 schedule
// announced Aug 26, 2026) and cross-checked. This is the FULL 2027 season:
// 39 events (36 points races + 3 exhibitions: Clash, Duel, All-Star),
// Feb 13 – Nov 14. Start times had NOT been announced yet — keep time:
// null and the widget shows "Time TBA". Do not guess a time. Networks are
// the broadcast partner (FOX Sports / Prime Video / TNT Sports / USA
// Sports); the specific FOX vs FS1 channel inside the FOX Sports window
// had not been announced, except the first three races, verified as FOX.
const NASCAR_SCHEDULE = [
  { name: "Wheatley Vodka Clash", track: "Daytona International Speedway", date: "2027-02-13", network: "FOX", time: null, exhibition: true },
  { name: "Duel at Daytona", track: "Daytona International Speedway", date: "2027-02-18", network: "FOX", time: null, exhibition: true },
  { name: "Daytona 500", track: "Daytona International Speedway", date: "2027-02-21", network: "FOX", time: null, exhibition: false },
  { name: "Autotrader 400", track: "EchoPark Speedway", date: "2027-02-28", network: "FOX Sports", time: null, exhibition: false },
  { name: "DuraMAX Texas Grand Prix", track: "Circuit of The Americas", date: "2027-03-07", network: "FOX Sports", time: null, exhibition: false },
  { name: "Phoenix Raceway", track: "Phoenix Raceway", date: "2027-03-14", network: "FOX Sports", time: null, exhibition: false },
  { name: "Las Vegas Motor Speedway", track: "Las Vegas Motor Speedway", date: "2027-03-21", network: "FOX Sports", time: null, exhibition: false },
  { name: "Darlington Raceway", track: "Darlington Raceway", date: "2027-04-04", network: "FOX Sports", time: null, exhibition: false },
  { name: "Bristol Motor Speedway", track: "Bristol Motor Speedway", date: "2027-04-11", network: "FOX Sports", time: null, exhibition: false },
  { name: "Cook Out 400", track: "Martinsville Speedway", date: "2027-04-18", network: "FOX Sports", time: null, exhibition: false },
  { name: "Jack Link's 500", track: "Talladega Superspeedway", date: "2027-04-25", network: "FOX Sports", time: null, exhibition: false },
  { name: "Würth 400 presented by Liqui Moly", track: "Texas Motor Speedway", date: "2027-05-02", network: "FOX Sports", time: null, exhibition: false },
  { name: "Kansas Speedway", track: "Kansas Speedway", date: "2027-05-09", network: "FOX Sports", time: null, exhibition: false },
  { name: "Dover Motor Speedway", track: "Dover Motor Speedway", date: "2027-05-16", network: "FOX Sports", time: null, exhibition: false },
  { name: "All-Star Race", track: "North Wilkesboro Speedway", date: "2027-05-23", network: "FOX Sports", time: null, exhibition: true },
  { name: "Coca-Cola 600", track: "Charlotte Motor Speedway", date: "2027-05-30", network: "Prime Video", time: null, exhibition: false },
  { name: "Nashville Superspeedway", track: "Nashville Superspeedway", date: "2027-06-06", network: "Prime Video", time: null, exhibition: false },
  { name: "Great American Getaway 400 presented by VISIT PA", track: "Pocono Raceway", date: "2027-06-13", network: "Prime Video", time: null, exhibition: false },
  { name: "Michigan International Speedway", track: "Michigan International Speedway", date: "2027-06-20", network: "Prime Video", time: null, exhibition: false },
  { name: "Chicagoland Speedway", track: "Chicagoland Speedway", date: "2027-06-27", network: "Prime Video", time: null, exhibition: false },
  { name: "Iowa Speedway", track: "Iowa Speedway", date: "2027-07-04", network: "TNT Sports", time: null, exhibition: false },
  { name: "Toyota/Save Mart 350", track: "Sonoma Raceway", date: "2027-07-11", network: "TNT Sports", time: null, exhibition: false },
  { name: "Dollar Tree 400", track: "EchoPark Speedway", date: "2027-07-18", network: "TNT Sports", time: null, exhibition: false },
  { name: "Brickyard 400", track: "Indianapolis Motor Speedway", date: "2027-07-25", network: "TNT Sports", time: null, exhibition: false },
  { name: "Naval Base Coronado", track: "Naval Base Coronado", date: "2027-08-01", network: "TNT Sports", time: null, exhibition: false },
  { name: "Bass Pro Shops Night Race", track: "Bristol Motor Speedway", date: "2027-08-14", network: "USA Sports", time: null, exhibition: false },
  { name: "Enjoy Illinois 300", track: "World Wide Technology Raceway", date: "2027-08-22", network: "USA Sports", time: null, exhibition: false },
  { name: "Coke Zero Sugar 400", track: "Daytona International Speedway", date: "2027-08-28", network: "USA Sports", time: null, exhibition: false },
  { name: "Southern 500", track: "Darlington Raceway", date: "2027-09-05", network: "USA Sports", time: null, exhibition: false },
  { name: "Richmond Raceway", track: "Richmond Raceway", date: "2027-09-11", network: "USA Sports", time: null, exhibition: false },
  { name: "Watkins Glen International", track: "Watkins Glen International", date: "2027-09-19", network: "USA Sports", time: null, exhibition: false },
  { name: "New Hampshire Motor Speedway", track: "New Hampshire Motor Speedway", date: "2027-09-26", network: "USA Sports", time: null, exhibition: false },
  { name: "Kansas Speedway", track: "Kansas Speedway", date: "2027-10-03", network: "USA Sports", time: null, exhibition: false },
  { name: "Las Vegas Motor Speedway", track: "Las Vegas Motor Speedway", date: "2027-10-10", network: "USA Sports", time: null, exhibition: false },
  { name: "Charlotte Motor Speedway", track: "Charlotte Motor Speedway", date: "2027-10-17", network: "USA Sports", time: null, exhibition: false },
  { name: "Freeway Insurance 500", track: "Phoenix Raceway", date: "2027-10-24", network: "USA Sports", time: null, exhibition: false },
  { name: "YellaWood 500", track: "Talladega Superspeedway", date: "2027-10-31", network: "USA Sports", time: null, exhibition: false },
  { name: "Xfinity 500", track: "Martinsville Speedway", date: "2027-11-07", network: "USA Sports", time: null, exhibition: false },
  { name: "NASCAR Championship", track: "Homestead-Miami Speedway", date: "2027-11-14", network: "USA Sports", time: null, exhibition: false },
];

// ---------- DATA SOURCES (ESPN free feeds, no key needed) ----------
const URLS = {
  cfbScores: "https://site.api.espn.com/apis/site/v2/sports/football/college-football/scoreboard",
  cfbRanks:  "https://site.api.espn.com/apis/site/v2/sports/football/college-football/rankings",
  cbbScores: "https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/scoreboard",
  cbbRanks:  "https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/rankings",
  mlbScores: "https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/scoreboard",
  nflScores: "https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard",
  // Little League Baseball World Series — this feed is the Williamsport
  // tournament ONLY (verified 2026-11-13: July dates return 0 events, and
  // every event note reads "Little League Baseball World Series - ...").
  // Regionals are not in this feed, so no regional games can leak in.
  llbScores: "https://site.api.espn.com/apis/site/v2/sports/baseball/llb/scoreboard",
};

// MLB networks that count as "national TV"
const NATIONAL_TV = ["ESPN", "FOX", "FS1", "TBS", "MLB NETWORK"];

// ---------- COLORS ----------
const C = {
  bg:       new Color("#0B0F14"),
  card:     new Color("#12181F"),
  text:     new Color("#FFFFFF"),
  muted:    new Color("#8A94A6"),
  faint:    new Color("#5A6472"),
  divider:  new Color("#1E2630"),
  accent:   new Color("#E8B33C"), // restrained gold accent
  live:     new Color("#34C759"),
};

// ---------- HELPERS ----------
async function fetchJSON(url) {
  try {
    const req = new Request(url);
    req.timeoutInterval = 15;
    return await req.loadJSON();
  } catch (e) {
    return null; // one dead feed never breaks the whole widget
  }
}

function ymdOf(date) {
  const f = new DateFormatter();
  f.dateFormat = "yyyy-MM-dd";
  return f.string(date);
}
function timeOf(date) {
  const f = new DateFormatter();
  f.dateFormat = "h:mm a";
  return f.string(date);
}
function shortDateOf(date) {
  const f = new DateFormatter();
  f.dateFormat = "EEE, MMM d";
  return f.string(date);
}
// Full date for the widget's second header line, with the day's ordinal
// suffix: "Friday, November 13th". (Michael's pick — the header is two
// lines now, title on top and the full date under it, which also helps
// fill the widget so there is no big blank space at the bottom.)
function longDateOf(date) {
  const f = new DateFormatter();
  f.dateFormat = "EEEE, MMMM d";
  const base = f.string(date);
  const day = date.getDate();
  const suffix = (day % 10 === 1 && day !== 11) ? "st"
    : (day % 10 === 2 && day !== 12) ? "nd"
    : (day % 10 === 3 && day !== 13) ? "rd" : "th";
  return base + suffix;
}
// "2027-02-13" -> Date at local noon (avoids DST edge cases)
function dateFromYmd(ymd) {
  const p = ymd.split("-");
  return new Date(parseInt(p[0], 10), parseInt(p[1], 10) - 1, parseInt(p[2], 10), 12, 0, 0);
}

// Build teamId -> rank from a rankings feed (first list whose name contains `part`)
function rankMap(data, part) {
  const map = {};
  if (!data || !data.rankings) return map;
  for (const list of data.rankings) {
    if (list.name && list.name.indexOf(part) !== -1) {
      for (const r of list.ranks || []) {
        if (r.team && r.team.id) map[String(r.team.id)] = r.current;
      }
      break;
    }
  }
  return map;
}

// Normalize one ESPN event into our shape. `ranks` is a teamId->rank map or null.
// Rank source: the rankings-endpoint map first (Playoff Committee for CFB,
// AP Top 25 for CBB); if that fetch failed, fall back to the scoreboard's own
// curatedRank (1-25 = ranked, 99 = unranked) so a dead rankings feed never
// blanks the whole widget.
function parseEvent(ev, ranks, sport) {
  const comp = (ev.competitions && ev.competitions[0]) || {};
  let teams = (comp.competitors || []).map((c) => {
    const curated = (c.curatedRank && c.curatedRank.current) || null;
    const fallbackRank = (curated && curated >= 1 && curated <= 25) ? curated : null;
    // LLWS team names carry a trailing state/country code ("Tokyo JPN",
    // "Hamilton OH") — strip it so the widget shows the city ("Tokyo").
    let nm = c.team.shortDisplayName || c.team.displayName || c.team.abbreviation;
    if (sport === "LLWS") nm = nm.replace(/\s[A-Z]{2,3}$/, "");
    return {
      id: String(c.team.id),
      abbr: c.team.abbreviation,
      name: nm,
      rank: ranks ? (ranks[String(c.team.id)] || fallbackRank) : fallbackRank,
      score: (c.score !== undefined && c.score !== null) ? c.score : null,
      homeAway: c.homeAway || "",
      conf: String(c.team.conferenceId || ""),
      winPct: winPctOf(c.records),
    };
  });
  // ESPN lists home first; display away first ("Illinois at UCLA").
  teams.sort((a, b) => (a.homeAway === "away" ? -1 : 1));
  const broadcasts = [];
  for (const b of comp.broadcasts || []) {
    for (const n of b.names || []) broadcasts.push(n);
  }
  const state = (ev.status && ev.status.type && ev.status.type.state) || "pre";
  const detail = (ev.status && ev.status.type && ev.status.type.shortDetail) || "";
  const date = new Date(ev.date);
  return {
    id: ev.id, date: date, ymd: ymdOf(date), time: timeOf(date),
    state: state, detail: detail, teams: teams, broadcasts: broadcasts,
    // LLWS games are all tournament games, so the playoff flag is not
    // applied to them — they keep their own sport tier instead.
    playoff: sport === "LLWS" ? false : isPlayoff(comp),
    // LLWS round, e.g. "Championship" (from "Little League Baseball World
    // Series - Championship"); "" for other sports.
    round: llwsRound(comp),
  };
}

// "Little League Baseball World Series - Championship" -> "Championship".
function llwsRound(comp) {
  const notes = comp.notes || [];
  for (const n of notes) {
    const h = String(n.headline || "");
    const i = h.indexOf(" - ");
    if (i !== -1) return h.slice(i + 3);
  }
  return "";
}

// "9-0" / "103-59" overall record -> win percentage (null if unavailable).
// Used to order MLB games by best combined record.
function winPctOf(records) {
  if (!records) return null;
  for (const r of records) {
    if (r.type === "total" && r.summary) {
      const m = String(r.summary).match(/^(\d+)-(\d+)/);
      if (m) {
        const w = parseInt(m[1], 10), l = parseInt(m[2], 10);
        if (w + l > 0) return w / (w + l);
      }
    }
  }
  return null;
}

// Playoff detection from the competition's notes (e.g. "World Series - Game 5",
// "College Football Playoff Semifinal", "NCAA Tournament - Sweet 16").
// Implemented Nov 2026 but untestable live until a postseason runs —
// there are no playoff games in November. Regular-season notes are empty.
function isPlayoff(comp) {
  const notes = comp.notes || [];
  for (const n of notes) {
    const h = String(n.headline || "");
    if (/playoff|championship|semifinal|final four|sweet 16|elite eight|world series|ALCS|NLCS|ALDS|NLDS|wild card|NCAA tournament/i.test(h)) {
      return true;
    }
  }
  return false;
}

function teamLabel(t, useAbbr) {
  const name = useAbbr ? t.abbr : t.name;
  return (t.rank ? "#" + t.rank + " " : "") + name;
}
// Readability: short team names when they fit, abbreviations when the
// matchup would get cut off (the small widget is only ~145pt wide).
// Rankings always stay visible — the "#" prefix is kept in both forms.
// LLWS teams never abbreviate (their codes are state/country codes like
// "JPN", not the city) — city names are already short.
function matchupParts(g) {
  const full = g.teams.map((t) => teamLabel(t, false)).join(" vs ");
  const useAbbr = g.sport !== "LLWS" && full.length > 20;
  return g.teams.map((t) => teamLabel(t, useAbbr));
}
function matchupLabel(g) {
  return matchupParts(g).join(" vs ");
}
function isNationalTV(broadcasts) {
  for (const b of broadcasts) {
    if (NATIONAL_TV.indexOf(String(b).trim().toUpperCase()) !== -1) return true;
  }
  return false;
}

// NFL divisions by team abbreviation (for the "divisional matchup" test).
// ESPN uses WSH for Washington; WAS is included as a safety net.
const NFL_DIVISIONS = {
  BUF: "AFCE", MIA: "AFCE", NE: "AFCE", NYJ: "AFCE",
  BAL: "AFCN", CIN: "AFCN", CLE: "AFCN", PIT: "AFCN",
  HOU: "AFCS", IND: "AFCS", JAX: "AFCS", TEN: "AFCS",
  DEN: "AFCW", KC: "AFCW", LV: "AFCW", LAC: "AFCW",
  DAL: "NFCE", NYG: "NFCE", PHI: "NFCE", WSH: "NFCE", WAS: "NFCE",
  CHI: "NFCN", DET: "NFCN", GB: "NFCN", MIN: "NFCN",
  ATL: "NFCS", CAR: "NFCS", NO: "NFCS", TB: "NFCS",
  ARI: "NFCW", LAR: "NFCW", SF: "NFCW", SEA: "NFCW",
};
// Primetime NFL windows: NBC carries only Sunday Night Football, ESPN
// only Monday Night Football, Prime Video only Thursday Night Football,
// so the broadcast network alone identifies the primetime slot.
const NFL_PRIMETIME = ["NBC", "ESPN", "PRIME VIDEO", "AMAZON PRIME VIDEO"];
function isNflPrimetime(g) {
  for (const b of g.broadcasts) {
    if (NFL_PRIMETIME.indexOf(String(b).trim().toUpperCase()) !== -1) return true;
  }
  return false;
}
function isNflDivisional(g) {
  if (g.teams.length < 2) return false;
  const d0 = NFL_DIVISIONS[g.teams[0].abbr], d1 = NFL_DIVISIONS[g.teams[1].abbr];
  return d0 && d0 === d1;
}
// A "good" NFL game: a playoff game, a primetime game, a divisional game,
// a matchup of two good teams (both .500 or better, or combined .600+),
// or a live game that's still close (within 7 points). NFL has no
// rankings, so these are the quality signals. Only good games are
// collected — and only as filler (orderGames sorts NFL last, always).
function isGoodNflGame(g) {
  if (g.playoff) return true;
  if (isNflPrimetime(g)) return true;
  if (isNflDivisional(g)) return true;
  const pcts = g.teams.map((t) => t.winPct);
  if (pcts.length === 2 && pcts[0] !== null && pcts[1] !== null) {
    if (pcts[0] >= 0.5 && pcts[1] >= 0.5) return true;
    if ((pcts[0] + pcts[1]) / 2 >= 0.6) return true;
  }
  if (g.state === "in" && g.teams.length === 2 && g.teams[0].score !== null && g.teams[1].score !== null) {
    if (Math.abs(g.teams[0].score - g.teams[1].score) <= 7) return true;
  }
  return false;
}
function nextNascar(todayYmd) {
  const today = dateFromYmd(todayYmd);
  const list = NASCAR_SCHEDULE
    .filter((r) => !r.exhibition || CONFIG.includeNascarExhibitions)
    .filter((r) => r.date >= todayYmd)
    // Only show the race once it's close: Michael doesn't want to see a
    // February race sitting on the widget in November. Both dates are local
    // noon, so the difference is whole days.
    .filter((r) => Math.round((dateFromYmd(r.date) - today) / 86400000) <= CONFIG.nascarShowWithinDays)
    .sort((a, b) => (a.date < b.date ? -1 : 1));
  return list.length ? list[0] : null;
}
// ---------- PRIORITY ORDERING (see PRIORITY RULES above) ----------
function rankSum(g) {
  return g.teams.reduce((s, t) => s + (t.rank || 99), 0);
}
function hasFavConf(g) {
  const confs = FAV_CONFERENCES[g.sport] || [];
  return g.teams.some((t) => confs.indexOf(t.conf) !== -1);
}
function combinedWinPct(g) {
  const pcts = g.teams.map((t) => t.winPct).filter((p) => p !== null);
  if (!pcts.length) return -1;
  return pcts.reduce((a, b) => a + b, 0) / pcts.length;
}
function isBlowout(g) {
  if (g.state !== "in" || g.teams.length < 2) return false;
  const s0 = g.teams[0].score, s1 = g.teams[1].score;
  if (s0 === null || s1 === null) return false;
  return Math.abs(s0 - s1) >= (BLOWOUT_MARGIN[g.sport] || 20);
}
function isTop5Matchup(g) {
  return g.teams.length === 2 && g.teams.every((t) => t.rank && t.rank <= 5);
}
// A game kicking off after 9:30 PM local is "late" — it should not take a
// widget slot in the morning when earlier games are still to come
// (Michael, 2026-11-14: Texas/LSU at 7:30 PM should show instead of Utah
// at 10:30 PM). Only upcoming games are demoted; a late game that is live
// is happening now and keeps its normal place.
function isLateKickoff(g) {
  if (g.state !== "pre") return false;
  const h = g.date.getHours(), m = g.date.getMinutes();
  return h > 21 || (h === 21 && m > 30);
}
// Watch-order inside one group: sport priority, then late kickoffs demoted,
// then MLB best records, then ranked-vs-ranked (both teams ranked beats one
// ranked beats none), then competitiveness (two quality teams > one >
// none), then both teams' records, then SEC/Big Ten, then best ranks,
// then earliest.
function watchCompare(a, b) {
  const so = (SPORT_ORDER[a.sport] || 0) - (SPORT_ORDER[b.sport] || 0);
  if (so) return so;
  const late = (isLateKickoff(a) ? 1 : 0) - (isLateKickoff(b) ? 1 : 0);
  if (late) return late;
  if (a.sport === "MLB") {
    const wp = combinedWinPct(b) - combinedWinPct(a);
    if (wp) return wp;
  }
  const rc = rankedCount(b) - rankedCount(a);
  if (rc) return rc;
  const qc = qualityCount(b) - qualityCount(a);
  if (qc) return qc;
  // When both games are ranked-vs-ranked, the lowest combined rank wins
  // first (Michael, 2026-11-16): #5 vs #10 (sum 15) outranks #14 vs #2
  // (sum 16), even when the records differ. For other games, records
  // still decide before ranks.
  if (rankedCount(a) === 2 && rankedCount(b) === 2) {
    const rs0 = rankSum(a) - rankSum(b);
    if (rs0) return rs0;
  }
  const wp = combinedWinPct(b) - combinedWinPct(a);
  if (wp) return wp;
  const fav = (hasFavConf(b) ? 1 : 0) - (hasFavConf(a) ? 1 : 0);
  if (fav) return fav;
  const rs = rankSum(a) - rankSum(b);
  if (rs) return rs;
  return a.date - b.date;
}
// State class: live close (0), upcoming (1), live blowout (2), final (3).
function stateClass(g) {
  if (g.state === "in") return isBlowout(g) ? 2 : 0;
  if (g.state === "pre") return 1;
  return 3;
}
// Full ordering for one day's games: playoffs first, then the pinned top-5
// matchup, then everything else by state class and watch-order.
// Returns { ordered, pinned } — main() needs the pin to keep it visible
// when it mixes in tomorrow's games.
function orderGames(games) {
  const list = games.slice();
  // NFL is the lowest priority and only fills slots the other sports leave
  // open (Michael, 2026-11-16): it is separated out first so that even a
  // playoff or live-close NFL game never jumps ahead of a CFB/CBB/MLB/LLWS
  // game. Within NFL, the same state-class + watch order applies.
  const nfl = list.filter((g) => g.sport === "NFL");
  const nonNfl = list.filter((g) => g.sport !== "NFL");
  const playoffs = nonNfl.filter((g) => g.playoff);
  const rest = nonNfl.filter((g) => !g.playoff);
  const matchups = rest.filter(isTop5Matchup).sort((a, b) => {
    const fav = (hasFavConf(b) ? 1 : 0) - (hasFavConf(a) ? 1 : 0);
    if (fav) return fav;
    return rankSum(a) - rankSum(b) || (a.date - b.date);
  });
  // Pin the best top-5 matchup that is NOT a live blowout; if the best one
  // is a blowout, the next one gets the pin instead (and if all are
  // blowouts, nothing is pinned — the blowouts sort with the rest).
  const pinned = matchups.find((g) => !isBlowout(g)) || null;
  const others = rest.filter((g) => g !== pinned);
  others.sort((a, b) => stateClass(a) - stateClass(b) || watchCompare(a, b));
  playoffs.sort((a, b) => stateClass(a) - stateClass(b) || watchCompare(a, b));
  nfl.sort((a, b) => stateClass(a) - stateClass(b) || watchCompare(a, b));
  return { ordered: playoffs.concat(pinned ? [pinned] : []).concat(others).concat(nfl), pinned: pinned };
}

// Pick the rows for the widget (max 3). Today's games fill the rows first,
// up to all 3 — if today has 3 or more good games, no tomorrow game
// appears (Michael, 2026-11-14). Tomorrow's games only fill slots today
// doesn't use. The returned rows are in display order: earliest start
// time first, so the widget reads like the day's schedule (Michael,
// 2026-11-14); a tomorrow game comes last.
function pickRows(today, tomorrow, maxRows) {
  const rows = [];
  const t = today.ordered, m = tomorrow.ordered;
  if (!t.length) return rows;
  const todayRows = t.slice(0, maxRows);
  const pin = today.pinned;
  if (pin && todayRows.indexOf(pin) === -1 && todayRows.length === maxRows) todayRows[maxRows - 1] = pin;
  rows.push.apply(rows, todayRows.map((g) => ({ game: g, isTomorrow: false })));
  const remaining = maxRows - rows.length;
  if (remaining > 0) {
    if (m.length) rows.push.apply(rows, m.slice(0, remaining).map((g) => ({ game: g, isTomorrow: true })));
    else {
      // Fill from today's games, skipping any already shown (the pin swap
      // above can leave the swapped-out game still in the ordered list).
      const rest = t.filter((g) => rows.every((r) => r.game !== g));
      rows.push.apply(rows, rest.slice(0, remaining).map((g) => ({ game: g, isTomorrow: false })));
    }
  }
  // Display order: earliest start time first (tomorrow's games sort last).
  rows.sort((a, b) => a.game.date - b.game.date);
  return rows;
}

// ---------- FETCH + FILTER ----------
async function loadGames() {
  const today = new Date();
  const todayYmd = ymdOf(today);
  const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
  const tomorrowYmd = ymdOf(tomorrow);

  // Fetch each scoreboard with an explicit dates= param for today AND
  // tomorrow. The default scoreboard (no dates) is unreliable — verified
  // 2026-11-17: it returned only 1 CBB game (last night's UCLA game) and
  // only future CFB games, so the widget showed "No games today" on a day
  // with 11 CBB games. Explicit dates return the complete slate.
  function sbUrl(base, ymd) { return base + "?dates=" + ymd.replace(/-/g, ""); }
  const [cfbSB, cfbSBtom, cfbR, cbbSB, cbbSBtom, cbbR, mlbSB, mlbSBtom, llbSB, llbSBtom, nflSB, nflSBtom] = await Promise.all([
    fetchJSON(sbUrl(URLS.cfbScores, todayYmd)), fetchJSON(sbUrl(URLS.cfbScores, tomorrowYmd)),
    fetchJSON(URLS.cfbRanks),
    fetchJSON(sbUrl(URLS.cbbScores, todayYmd)), fetchJSON(sbUrl(URLS.cbbScores, tomorrowYmd)),
    fetchJSON(URLS.cbbRanks),
    fetchJSON(sbUrl(URLS.mlbScores, todayYmd)), fetchJSON(sbUrl(URLS.mlbScores, tomorrowYmd)),
    fetchJSON(sbUrl(URLS.llbScores, todayYmd)), fetchJSON(sbUrl(URLS.llbScores, tomorrowYmd)),
    fetchJSON(sbUrl(URLS.nflScores, todayYmd)), fetchJSON(sbUrl(URLS.nflScores, tomorrowYmd)),
  ]);

  const cfbRanks = rankMap(cfbR, "Playoff");
  const cbbRanks = rankMap(cbbR, "AP Top 25");

  const todayGames = [];
  const tomorrowGames = [];

  function collect(scoreboard, ranks, sport, keep) {
    if (!scoreboard || !scoreboard.events) return;
    for (const ev of scoreboard.events) {
      const g = parseEvent(ev, ranks, sport);
      g.sport = sport;
      if (!keep(g, ev)) continue;
      if (g.ymd === todayYmd) todayGames.push(g);
      else if (g.ymd === tomorrowYmd) tomorrowGames.push(g);
    }
  }

  // College football: ranked teams only
  collect(cfbSB, cfbRanks, "CFB", (g) => g.teams.some((t) => t.rank));
  collect(cfbSBtom, cfbRanks, "CFB", (g) => g.teams.some((t) => t.rank));
  // College basketball: ranked teams only
  collect(cbbSB, cbbRanks, "CBB", (g) => g.teams.some((t) => t.rank));
  collect(cbbSBtom, cbbRanks, "CBB", (g) => g.teams.some((t) => t.rank));
  // MLB: Orioles, or any game on national TV (offseason-safe: empty feed = no games)
  collect(mlbSB, null, "MLB", (g) =>
    g.teams.some((t) => t.abbr === "BAL") || isNationalTV(g.broadcasts));
  collect(mlbSBtom, null, "MLB", (g) =>
    g.teams.some((t) => t.abbr === "BAL") || isNationalTV(g.broadcasts));
  // Little League World Series: Williamsport tournament only. The llb feed
  // itself carries no regionals (verified), and as a second guard the event
  // note must read "Little League Baseball World Series".
  collect(llbSB, null, "LLWS", (g, ev) => {
    const comp = (ev.competitions && ev.competitions[0]) || {};
    const notes = comp.notes || [];
    return notes.some((n) => String(n.headline || "").indexOf("Little League Baseball World Series") !== -1);
  });
  collect(llbSBtom, null, "LLWS", (g, ev) => {
    const comp = (ev.competitions && ev.competitions[0]) || {};
    const notes = comp.notes || [];
    return notes.some((n) => String(n.headline || "").indexOf("Little League Baseball World Series") !== -1);
  });
  // NFL: good games only (primetime, playoffs, good records, divisional,
  // live close) — and only as filler (orderGames sorts NFL last, always).
  collect(nflSB, null, "NFL", (g) => isGoodNflGame(g));
  collect(nflSBtom, null, "NFL", (g) => isGoodNflGame(g));

  return {
    today: orderGames(todayGames),
    tomorrow: orderGames(tomorrowGames),
    nascar: nextNascar(todayYmd),
    todayYmd: todayYmd,
    now: today,
  };
}

// ---------- WIDGET BUILDING ----------
function addText(stack, text, font, color, align) {
  const t = stack.addText(text);
  t.font = font;
  t.textColor = color;
  t.lineLimit = 1;
  if (align === "right") t.rightAlignText();
  else if (align === "center") t.centerAlignText();
  else t.leftAlignText();
  return t;
}

// Team logo URL on ESPN's CDN. College logos have a dark variant (for the
// dark widget); MLB has no dark variant, so it uses the standard one.
// LLWS teams have no ESPN logos, so they show text only.
// Verified 2026-11-13: ncaa 500 and 500-dark both return 200 for UCLA (26),
// Illinois (356), Houston (248); mlb 500 returns 200, mlb 500-dark 404s.
function logoUrl(sport, teamId) {
  if (!teamId) return null;
  if (sport === "CFB" || sport === "CBB") {
    return "https://a.espncdn.com/i/teamlogos/ncaa/" + (CONFIG.darkMode ? "500-dark" : "500") + "/" + teamId + ".png";
  }
  if (sport === "MLB") return "https://a.espncdn.com/i/teamlogos/mlb/500/" + teamId + ".png";
  // NFL has no dark variant (nfl/500-dark 404s — verified 2026-11-16), so
  // it uses the standard one like MLB; bakeLogo composites it onto the bg.
  if (sport === "NFL") return "https://a.espncdn.com/i/teamlogos/nfl/500/" + teamId + ".png";
  return null;
}

// Load logos for the games about to be shown (max 3 rows x 2 teams).
// Each load is independent — a failure just leaves that team text-only.
async function loadLogos(games) {
  const jobs = [];
  for (const g of games) {
    for (const t of g.teams) {
      const url = logoUrl(g.sport, t.id);
      if (!url) continue;
      jobs.push((async () => {
        try {
          // Logos get their own short timeout: a slow logo must fail fast
          // instead of hanging the whole script past Scriptable's run
          // limit, which kills it with a timeout and shows nothing.
          const req = new Request(url);
          req.timeoutInterval = 10;
          const raw = await req.loadImage();
          t.img = bakeLogo(raw);
        } catch (e) { t.img = null; }
      })());
    }
  }
  await Promise.all(jobs);
}

// Bake the logo onto the widget's background color. The logo files are
// transparent PNGs, but on the phone their transparent areas rendered as
// white boxes (seen on UCLA and Missouri, whose artwork doesn't fill the
// frame — blocky logos like Illinois looked fine because their artwork
// covers the box). Compositing onto the exact background color makes the
// logo seamless against the widget.
function bakeLogo(img) {
  const s = 60; // drawn at 60x60 for crispness, displayed at 18x18
  const ctx = new DrawContext();
  ctx.size = new Size(s, s);
  ctx.opaque = true;
  ctx.setFillColor(CONFIG.darkMode ? new Color("#0B0F14") : new Color("#F2F2F7"));
  ctx.fillRect(new Rect(0, 0, s, s));
  ctx.drawImageInRect(img, new Rect(0, 0, s, s));
  return ctx.getImage();
}

// One game row: logos + matchup (line 1), sport + network + time/score (line 2).
// A tomorrow game shown in the today view is marked clearly: its line 2
// reads "TOMORROW · ..." in the gold accent color, so it stands apart from
// today's games (the header says "Games of the Day", not "Today's", for the
// same reason). Team logos come from ESPN's CDN (loaded in main() into
// t.img); a team without a logo just shows its name.
function addGameRow(widget, g, isTomorrow) {
  // Line 1: logos + matchup (full width — the time moved to line 2 so the
  // names and logos have room and never get cut off).
  const row = widget.addStack();
  row.layoutHorizontally();
  row.centerAlignContent();
  const names = matchupParts(g);
  g.teams.forEach((t, i) => {
    if (i > 0) {
      const vs = row.addText(" vs ");
      vs.font = Font.boldSystemFont(11.5);
      vs.textColor = C.text;
    }
    if (t.img) {
      const im = row.addImage(t.img);
      im.imageSize = new Size(18, 18);
      row.addSpacer(3);
    }
    const name = row.addText(names[i]);
    name.font = Font.boldSystemFont(11.5);
    name.textColor = C.text;
    name.lineLimit = 1;
    name.minimumScaleFactor = 0.75;
  });

  // Line 2: sport + network (left) + time/score/status (right)
  // (kept clearly visible, as Michael asked)
  const sub = widget.addStack();
  sub.layoutHorizontally();
  const net = (g.broadcasts[0] || "").toUpperCase();
  let subLeft = (isTomorrow ? "TOMORROW · " : "") + g.sport + (net ? " · " + net : "");
  if (g.sport === "LLWS" && g.round) subLeft += " · " + g.round;
  const subTxt = addText(sub, subLeft, Font.systemFont(9), isTomorrow ? C.accent : C.muted, "left");
  subTxt.minimumScaleFactor = 0.8;
  sub.addSpacer();
  let right = "", rightColor = C.text;
  let rightDone = false;
  if (g.state === "in" && CONFIG.showLiveScores) {
    const score = g.teams.map((t) => (t.score === null ? "–" : t.score)).join("–");
    right = score + "  ● " + g.detail; // e.g. "24–17  ● Q3 4:12"
    rightColor = C.live;
  } else if (g.state === "post") {
    // Final-only winner emphasis (Michael, 2026-11-16): the winning score
    // stands out in the bright color, the losing score goes muted. Live
    // games keep both scores the same color (single green string above).
    // A tied final (rare) shows both scores bright.
    const s0 = g.teams.length > 0 ? g.teams[0].score : null;
    const s1 = g.teams.length > 1 ? g.teams[1].score : null;
    const str0 = s0 === null ? "–" : String(s0);
    const str1 = s1 === null ? "–" : String(s1);
    const losingIdx = (s0 !== null && s1 !== null) ? (Number(s0) < Number(s1) ? 0 : Number(s1) < Number(s0) ? 1 : -1) : -1;
    addText(sub, str0, Font.boldSystemFont(9), losingIdx === 0 ? C.muted : C.text, "right");
    addText(sub, "–", Font.boldSystemFont(9), C.muted, "right");
    addText(sub, str1, Font.boldSystemFont(9), losingIdx === 1 ? C.muted : C.text, "right");
    addText(sub, " · Final", Font.boldSystemFont(9), C.muted, "right");
    rightDone = true;
  } else {
    right = g.time;
  }
  if (right && !rightDone) addText(sub, right, Font.boldSystemFont(9), rightColor, "right");
}

function addNascarRow(widget, race) {
  const d = dateFromYmd(race.date);
  const when = shortDateOf(d) + " · " + race.network + " · " + (race.time ? race.time : "Time TBA");
  const row = widget.addStack();
  row.layoutHorizontally();
  row.centerAlignContent();
  const flag = row.addText("🏁");
  flag.font = Font.systemFont(10);
  row.addSpacer(4);
  const t = row.addText(race.name);
  t.font = Font.boldSystemFont(10.5);
  t.textColor = C.text;
  t.lineLimit = 1;
  t.minimumScaleFactor = 0.8;
  const sub = widget.addStack();
  sub.layoutHorizontally();
  addText(sub, "NASCAR · " + when, Font.systemFont(8.5), C.muted, "left");
}

function addDivider(widget) {
  const div = widget.addStack();
  div.backgroundColor = C.divider;
  div.size = new Size(0, 1);
}

async function main() {
  const data = await loadGames();
  const widget = new ListWidget();
  widget.backgroundColor = CONFIG.darkMode ? C.bg : new Color("#F2F2F7");
  widget.setPadding(11, 12, 9, 12);
  widget.url = CONFIG.tapUrl;
  widget.refreshAfterDate = new Date(Date.now() + 30 * 60 * 1000); // nudge iOS to refresh

  const textColor = CONFIG.darkMode ? C.text : new Color("#111111");
  const mutedColor = CONFIG.darkMode ? C.muted : new Color("#6B7280");

  // Header: two lines — "GAMES OF THE DAY" on top, the full date under it
  // ("Friday, November 13th"). The second line fills the widget vertically
  // so there is no big blank space at the bottom, and the title no longer
  // claims everything is today (the third row can be tomorrow's game,
  // marked TOMORROW in gold on its own line).
  const header = widget.addStack();
  header.layoutVertically();
  const title = header.addText("GAMES OF THE DAY");
  title.font = Font.boldSystemFont(10.5);
  title.textColor = textColor;
  title.lineLimit = 1;
  title.minimumScaleFactor = 0.8;
  title.centerAlignText();
  const dateTxt = header.addText(longDateOf(data.now));
  dateTxt.font = Font.systemFont(8.5);
  dateTxt.textColor = mutedColor;
  dateTxt.lineLimit = 1;
  dateTxt.centerAlignText();

  // The gaps between the header, the rows and the footer are flexible, so
  // the space spreads evenly instead of pooling into one big blank at the
  // bottom — the layout fills the widget the same way on any phone size.
  widget.addSpacer();

  // NASCAR is the top priority: on race day its row goes FIRST, at the top
  // of the widget; when the race is still 1-2 days out it sits at the bottom.
  const raceToday = data.nascar && data.nascar.date === data.todayYmd;
  if (raceToday) {
    addNascarRow(widget, data.nascar);
    widget.addSpacer(5);
    addDivider(widget);
    widget.addSpacer(6);
  }

  // Game rows: today's games take the first two slots; tomorrow's biggest
  // game fills the rest (see pickRows). On a no-games day, say so and peek.
  const rows = pickRows(data.today, data.tomorrow, CONFIG.maxGameRows);
  const todayShown = rows.filter((r) => !r.isTomorrow).length;
  const extra = data.today.ordered.length - todayShown;

  // Games to display (for logos): the rows, or the tomorrow peek on a no-games day.
  const displayGames = rows.length ? rows.map((r) => r.game)
    : (CONFIG.noGamesMode === "lookahead" ? data.tomorrow.ordered.slice(0, CONFIG.maxLookaheadRows) : []);
  await loadLogos(displayGames);

  if (rows.length === 0) {
    // No games today: say so, then show a peek at tomorrow.
    const empty = widget.addStack();
    empty.layoutHorizontally();
    empty.centerAlignContent();
    const t = empty.addText("No games today");
    t.font = Font.boldSystemFont(12);
    t.textColor = textColor;
    t.centerAlignText();
    widget.addSpacer();
    if (CONFIG.noGamesMode === "lookahead" && data.tomorrow.ordered.length > 0) {
      const lab = widget.addStack();
      lab.layoutHorizontally();
      const lt = lab.addText("TOMORROW");
      lt.font = Font.boldSystemFont(8.5);
      lt.textColor = mutedColor;
      widget.addSpacer(3);
      const peek = data.tomorrow.ordered.slice(0, CONFIG.maxLookaheadRows);
      peek.forEach((g, i) => {
        addGameRow(widget, g, false);
        if (i < peek.length - 1) widget.addSpacer();
      });
    }
  } else {
    rows.forEach((r, i) => {
      addGameRow(widget, r.game, r.isTomorrow);
      if (i < rows.length - 1) widget.addSpacer();
    });
  }

  // NASCAR row (bottom) — only when the race is coming up but not today.
  if (data.nascar && !raceToday) {
    widget.addSpacer(6);
    addDivider(widget);
    widget.addSpacer(5);
    addNascarRow(widget, data.nascar);
  }

  // Footer: last updated (+ overflow count)
  widget.addSpacer();
  const footer = widget.addStack();
  footer.layoutHorizontally();
  const ft = footer.addText(
    "Updated " + timeOf(new Date()) + (extra > 0 ? "  ·  +" + extra + " more today" : "")
  );
  ft.font = Font.systemFont(8);
  ft.textColor = C.faint;

  if (config.runsInWidget) {
    Script.setWidget(widget);
  } else {
    await widget.presentSmall();
  }
  Script.complete();
}

// If anything goes wrong while loading the games, show that instead of
// dying silently with a blank screen — so a tap on Play always shows
// something, and a failed fetch is obvious.
main().catch(async (e) => {
  const w = new ListWidget();
  w.backgroundColor = CONFIG.darkMode ? C.bg : new Color("#F2F2F7");
  const t = w.addText("Couldn't load games. Check your connection and try again.");
  t.font = Font.systemFont(10);
  t.textColor = CONFIG.darkMode ? C.text : new Color("#111111");
  if (config.runsInWidget) Script.setWidget(w);
  else await w.presentSmall();
  Script.complete();
});
