"use client";

import React, { useEffect, useMemo, useState } from "react";

type Match = {
  id: string;
  round: number;
  home: string;
  away: string;
  hg: number | null;
  ag: number | null;
};

type Round = {
  round: number;
  matches: Match[];
};

type Row = {
  team: string;
  pts: number;
  pj: number;
  pg: number;
  pe: number;
  pp: number;
  gf: number;
  gc: number;
  dg: number;
};

type CupMatch = {
  home: string;
  away: string;
  hg: number | null;
  ag: number | null;
  winner: string | null;
};

type CupRound = {
  name: string;
  matches: CupMatch[];
};

type CupTournament = {
  rounds: CupRound[];
  currentRoundIndex: number;
  champion: string | null;
};

type ClubStats = {
  team: string;
  titles: number;
  cupTitles: number;
  seasons: number;
  relegations: number;
  promotions: number;
  historicalPoints: number;
};

type SeasonRecord = {
  year: number;
  primera: Row[];
  b: Row[];
  fixtureA?: Round[];
  fixtureB?: Round[];
  top3: Row[];
  relegated: Row[];
  relegatedByTable?: Row;
  relegatedByAverage?: Row;
  promotionTeamA?: Row;
  promotionTeamB?: Row;
  promotionWinner?: string | null;
  promoted: Row[];
  champion: Row;
  cupChampion?: string | null;
  cupRounds?: CupRound[];
};

type AverageRow = {
  team: string;
  pts: number;
  pj: number;
  temporadas: number;
  promedio: number;
};

type AiSeasonText = {
  headline: string;
  mainArticle: string;
  cupArticle: string;
  bArticle: string;
  relegationArticle: string;
  promotionArticle: string;
  editorial: string;
  shortNews: string[];
};

type AiClubProfile = {
  title: string;
  description: string;
  shortTag: string;
};

type RoundReport = {
  title: string;
  lines: string[];
  league: LeagueKey;
  round: number;
  year: number;
  headline?: string;
  subtitle?: string;
  featured?: {
    home: string;
    away: string;
    hg: number;
    ag: number;
    winner: string | null;
  };
  results?: {
    home: string;
    away: string;
    hg: number;
    ag: number;
    winner: string | null;
    totalGoals: number;
  }[];
  statLine?: string;
};


type HeadToHeadRow = {
  rival: string;
  pj: number;
  wins: number;
  draws: number;
  losses: number;
  gf: number;
  gc: number;
};

type LeagueKey = "primera" | "b";
type CompetitionKey = "primera" | "b" | "copa";
type ThemeMode = "dark" | "light";

type TabKey =
  | "inicio"
  | "fixture"
  | "historica"
  | "campeonatos"
  | "promedios"
  | "movimientos"
  | "clubes"
  | "anios";

type SavedGame = {
  year: number;
  primeraTeams: string[];
  bTeams: string[];
  fixtureA: Round[];
  fixtureB: Round[];
  roundIndexA: number;
  roundIndexB: number;
  history: SeasonRecord[];
  selectedYear: number | null;
  activeLeague: LeagueKey;
  activeCompetition?: CompetitionKey;
  tab: TabKey;
  theme: ThemeMode;
  cup?: CupTournament;
  saveCode?: string;
  sidebarOpen?: boolean;
  teamPower?: Record<string, number>;
};

const STORAGE_KEY = "liga-manager-save-v4";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const initialPrimera = [
  "River",
  "Boca Jrs",
  "Racing",
  "Independiente",
  "San Lorenzo",
  "Estudiantes",
  "Velez",
  "Rosario Central",
  "Lanus",
  "Newels",
  "Talleres",
  "Argentinos Jrs",
  "Huracan",
  "Belgrano",
  "Platense",
  "Banfield",
  "Tigre",
  "Union",
  "Instituto",
  "Barracas",
];

const initialB = [
  "Defenza & Justicia",
  "Atl. Tucuman",
  "Central Cordoba",
  "Sarmiento",
  "Riestra",
  "Aldosivi",
  "Gimnacia LP",
  "Ind Rivadavia",
  "Gimnacia Mendoza",
  "Est Rio Cuarto",
  "Chacarita",
  "Quilmes",
  "Ferro",
  "Chicago",
  "Colon",
  "Godoy Cruz",
  "Arsenal",
  "Patronato",
  "Temperley",
  "Moron",
];

const strengths: Record<string, number> = {
  River: 86,
  "Boca Jrs": 85,
  Racing: 80,
  Independiente: 79,
  "San Lorenzo": 78,
  Estudiantes: 78,
  Velez: 76,
  "Rosario Central": 74,
  Lanus: 73,
  Newels: 72,
  Talleres: 72,
  "Argentinos Jrs": 71,
  "Defenza & Justicia": 70,
  "Godoy Cruz": 70,
  Union: 68,
  Huracan: 68,
  "Atl. Tucuman": 67,
  Belgrano: 67,
  Banfield: 66,
  Tigre: 66,
  Platense: 65,
  "Gimnacia LP": 65,
  Colon: 64,
  "Ind Rivadavia": 63,
  Instituto: 63,
  Sarmiento: 62,
  "Central Cordoba": 62,
  Aldosivi: 60,
  Riestra: 60,
  Chacarita: 59,
  Quilmes: 59,
  Ferro: 58,
  Chicago: 58,
  "Gimnacia Mendoza": 57,
  Arsenal: 57,
  Patronato: 57,
  "Est Rio Cuarto": 56,
  Barracas: 56,
  Temperley: 56,
  Moron: 56,
};

const MIN_POWER = 45;
const MAX_POWER = 95;

function clampPower(value: number) {
  return Math.max(MIN_POWER, Math.min(MAX_POWER, Math.round(value)));
}

function createInitialTeamPower() {
  return { ...strengths };
}

let activeTeamPower: Record<string, number> = createInitialTeamPower();

function getTeamPower(team: string, teamPower?: Record<string, number>) {
  return teamPower?.[team] ?? activeTeamPower[team] ?? strengths[team] ?? 60;
}

function updateSeasonTeamPower({
  currentPower,
  record,
}: {
  currentPower: Record<string, number>;
  record: SeasonRecord;
}) {
  const next = { ...currentPower };

  const allTeams = new Set([
    ...Object.keys(strengths),
    ...record.primera.map((row) => row.team),
    ...record.b.map((row) => row.team),
  ]);

  allTeams.forEach((team) => {
    const base = strengths[team] ?? 60;
    const current = next[team] ?? base;

    // Regresión anual: evita que la fuerza se infle o se hunda para siempre.
    next[team] = current + (base - current) * 0.12;
  });

  function add(team: string | undefined | null, amount: number) {
    if (!team) return;
    const base = strengths[team] ?? 60;
    next[team] = clampPower((next[team] ?? base) + amount);
  }

  add(record.champion.team, 3);
  add(record.top3[1]?.team, 1);
  add(record.top3[2]?.team, 1);

  if (record.cupChampion) add(record.cupChampion, 2);

  record.promoted.forEach((row) => add(row.team, 2));
  record.relegated.forEach((row) => add(row.team, -4));

  if (record.promotionWinner === record.promotionTeamB?.team) {
    add(record.promotionTeamB?.team, 2);
    add(record.promotionTeamA?.team, -2);
  }

  record.primera.slice(0, 5).forEach((row) => add(row.team, 1));
  record.primera.slice(-4).forEach((row) => add(row.team, -1));

  return Object.fromEntries(
    Object.entries(next).map(([team, power]) => [team, clampPower(power)])
  );
}

function buildTeamPowerFromHistory(history: SeasonRecord[]) {
  return history.reduce(
    (currentPower, record) =>
      updateSeasonTeamPower({
        currentPower,
        record,
      }),
    createInitialTeamPower()
  );
}

const logos: Record<string, string> = {
  "Boca Jrs": "/teams/boca-jrs.png",
  River: "/teams/river.png",
  Racing: "/teams/racing.png",
  Independiente: "/teams/independiente.png",
  "San Lorenzo": "/teams/san-lorenzo.png",
  Estudiantes: "/teams/estudiantes.png",
  Velez: "/teams/velez.png",
  "Rosario Central": "/teams/rosario-central.png",
  Lanus: "/teams/lanus.png",
  Newels: "/teams/newels.png",
  Talleres: "/teams/talleres.png",
  "Argentinos Jrs": "/teams/argentinos-jrs.png",
  Huracan: "/teams/huracan.png",
  Belgrano: "/teams/belgrano.png",
  Platense: "/teams/platense.png",
  Banfield: "/teams/banfield.png",
  Tigre: "/teams/tigre.png",
  Union: "/teams/union.png",
  Instituto: "/teams/instituto.png",
  Barracas: "/teams/barracas.png",
  "Defenza & Justicia": "/teams/defenza-justicia.png",
  "Atl. Tucuman": "/teams/atl-tucuman.png",
  "Central Cordoba": "/teams/central-cordoba.png",
  Sarmiento: "/teams/sarmiento.png",
  Riestra: "/teams/riestra.png",
  Aldosivi: "/teams/aldosivi.png",
  "Gimnacia LP": "/teams/gimnacia-lp.png",
  "Ind Rivadavia": "/teams/ind-rivadavia.png",
  "Gimnacia Mendoza": "/teams/gimnacia-mendoza.png",
  "Est Rio Cuarto": "/teams/est-rio-cuarto.png",
  Chacarita: "/teams/chacarita.png",
  Quilmes: "/teams/quilmes.png",
  Ferro: "/teams/ferro.png",
  Chicago: "/teams/chicago.png",
  Colon: "/teams/colon.png",
  "Godoy Cruz": "/teams/godoy-cruz.png",
  Arsenal: "/teams/arsenal.png",
  Patronato: "/teams/patronato.png",
  Temperley: "/teams/temperley.png",
  Moron: "/teams/moron.png",
};

const leagueLogos: Record<LeagueKey, string> = {
  primera: "/tournaments/liga-profesional.png",
  b: "/tournaments/primera-nacional.png",
};

function shuffle<T>(array: T[]) {
  const arr = [...array];

  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }

  return arr;
}

function generateFixture(teams: string[]): Round[] {
  const list = shuffle(teams);
  const n = list.length;
  const rounds: Round[] = [];
  const rotation = [...list];

  for (let round = 1; round <= n - 1; round++) {
    const matches: Match[] = [];

    for (let i = 0; i < n / 2; i++) {
      let home = rotation[i];
      let away = rotation[n - 1 - i];

      if (round % 2 === 0) [home, away] = [away, home];

      matches.push({
        id: `${round}-${i}-${home}-${away}-${Math.random().toString(36).slice(2)}`,
        round,
        home,
        away,
        hg: null,
        ag: null,
      });
    }

    rounds.push({ round, matches });

    const last = rotation.pop();
    if (last) rotation.splice(1, 0, last);
  }

  return rounds;
}

function getEffectiveStrength(
  team: string,
  context: LeagueKey | "cup",
  isHome: boolean,
  teamPower?: Record<string, number>
) {
  const base = getTeamPower(team, teamPower);

  const multiplier = context === "b" ? 2 : context === "cup" ? 1.18 : 1;
  const homeBonus = isHome ? 3 + base * 0.035 : 0;

  return base * multiplier + homeBonus;
}

function simulateGoals(
  team: string,
  rival: string,
  context: LeagueKey | "cup" = "primera",
  isHome = false,
  teamPower?: Record<string, number>
) {
  const teamStrength = getEffectiveStrength(team, context, isHome, teamPower);
  const rivalStrength = getEffectiveStrength(rival, context, !isHome, teamPower);
  const diff = teamStrength - rivalStrength;

  const bonus = diff / 750;
  const r = Math.random() + bonus;

  if (r < 0.24) return 0;
  if (r < 0.51) return 1;
  if (r < 0.74) return 2;
  if (r < 0.89) return 3;
  if (r < 0.965) return 4;
  if (r < 0.992) return 5;
  return 6;
}

function simulateOne(match: Match, context: LeagueKey = "primera"): Match {
  return {
    ...match,
    hg: simulateGoals(match.home, match.away, context, true),
    ag: simulateGoals(match.away, match.home, context, false),
  };
}

function simulateRemainingFixture(fixture: Round[], context: LeagueKey) {
  return fixture.map((round) => ({
    ...round,
    matches: round.matches.map((match) =>
      match.hg === null || match.ag === null ? simulateOne(match, context) : match
    ),
  }));
}

function buildTable(teams: string[], fixture: Round[]): Row[] {
  const table: Record<string, Row> = {};

  teams.forEach((team) => {
    table[team] = {
      team,
      pts: 0,
      pj: 0,
      pg: 0,
      pe: 0,
      pp: 0,
      gf: 0,
      gc: 0,
      dg: 0,
    };
  });

  fixture.forEach((round) => {
    round.matches.forEach((match) => {
      if (match.hg === null || match.ag === null) return;

      const home = table[match.home];
      const away = table[match.away];

      if (!home || !away) return;

      home.pj += 1;
      away.pj += 1;

      home.gf += match.hg;
      home.gc += match.ag;

      away.gf += match.ag;
      away.gc += match.hg;

      if (match.hg > match.ag) {
        home.pg += 1;
        away.pp += 1;
        home.pts += 3;
      } else if (match.hg < match.ag) {
        away.pg += 1;
        home.pp += 1;
        away.pts += 3;
      } else {
        home.pe += 1;
        away.pe += 1;
        home.pts += 1;
        away.pts += 1;
      }
    });
  });

  return Object.values(table)
    .map((row) => ({ ...row, dg: row.gf - row.gc }))
    .sort((a, b) => b.pts - a.pts || b.dg - a.dg || b.gf - a.gf || a.team.localeCompare(b.team));
}

function isSeasonFinished(fixture: Round[]) {
  return fixture.every((round) => round.matches.every((match) => match.hg !== null && match.ag !== null));
}

function playedMatches(fixture: Round[]) {
  return fixture.reduce(
    (acc, round) => acc + round.matches.filter((match) => match.hg !== null && match.ag !== null).length,
    0
  );
}

function totalMatches(fixture: Round[]) {
  return fixture.reduce((acc, round) => acc + round.matches.length, 0);
}

function getAverageRows(history: SeasonRecord[], currentTable: Row[]): AverageRow[] {
  return currentTable
    .map((teamRow) => {
      const pastRows = history
        .slice(-3)
        .flatMap((season) => season.primera)
        .filter((row) => row.team === teamRow.team);

      const usedRows = [...pastRows, teamRow].filter((row) => row.pj > 0);
      const pts = usedRows.reduce((acc, row) => acc + row.pts, 0);
      const pj = usedRows.reduce((acc, row) => acc + row.pj, 0);
      const promedio = pj > 0 ? pts / pj : 0;

      return { team: teamRow.team, pts, pj, temporadas: usedRows.length, promedio };
    })
    .sort((a, b) => b.promedio - a.promedio || b.pts - a.pts || a.team.localeCompare(b.team));
}

function generateCup(primera: string[], b: string[]): CupTournament {
  const teams = shuffle([...primera, ...shuffle(b).slice(0, 12)]);
  const names = ["16avos", "Octavos", "Cuartos", "Semifinal", "Final"];

  const rounds: CupRound[] = names.map((name) => ({
    name,
    matches: [],
  }));

  for (let i = 0; i < 32; i += 2) {
    rounds[0].matches.push({
      home: teams[i],
      away: teams[i + 1],
      hg: null,
      ag: null,
      winner: null,
    });
  }

  return { rounds, currentRoundIndex: 0, champion: null };
}

function cupMatchWinner(match: CupMatch) {
  if (match.hg === null || match.ag === null) return null;
  if (match.hg === match.ag) return match.winner;
  return match.hg > match.ag ? match.home : match.away;
}

function advanceCup(cup: CupTournament): CupTournament {
  const nextCup: CupTournament = {
    ...cup,
    rounds: cup.rounds.map((round) => ({
      ...round,
      matches: round.matches.map((match) => ({ ...match })),
    })),
  };

  const current = nextCup.rounds[nextCup.currentRoundIndex];
  if (!current || current.matches.length === 0) return nextCup;

  const winners = current.matches.map(cupMatchWinner);

  if (winners.some((winner) => !winner)) {
    window.alert("Todavía faltan partidos por jugar en esta instancia.");
    return nextCup;
  }

  if (nextCup.currentRoundIndex === nextCup.rounds.length - 1) {
    nextCup.champion = winners[0] ?? null;
    return nextCup;
  }

  const nextRound = nextCup.rounds[nextCup.currentRoundIndex + 1];

  if (nextRound.matches.length === 0) {
    for (let i = 0; i < winners.length; i += 2) {
      nextRound.matches.push({
        home: winners[i]!,
        away: winners[i + 1]!,
        hg: null,
        ag: null,
        winner: null,
      });
    }
  }

  nextCup.currentRoundIndex += 1;
  return nextCup;
}

function simulateCupResult(home: string, away: string): Pick<CupMatch, "hg" | "ag" | "winner"> {
  const hg = simulateGoals(home, away, "cup", true);
  const ag = simulateGoals(away, home, "cup", false);
  const winner = hg > ag ? home : ag > hg ? away : Math.random() > 0.5 ? home : away;
  return { hg, ag, winner };
}

function simulateWholeCup(cup: CupTournament): CupTournament {
  let nextCup: CupTournament = {
    ...cup,
    rounds: cup.rounds.map((round) => ({
      ...round,
      matches: round.matches.map((match) => ({ ...match })),
    })),
  };

  while (!nextCup.champion) {
    const round = nextCup.rounds[nextCup.currentRoundIndex];
    if (!round) break;

    round.matches = round.matches.map((match) => {
      if (match.hg !== null && match.ag !== null && match.winner) return match;
      return { ...match, ...simulateCupResult(match.home, match.away) };
    });

    const current = nextCup.rounds[nextCup.currentRoundIndex];
    const winners = current.matches.map(cupMatchWinner);

    if (winners.some((winner) => !winner)) break;

    if (nextCup.currentRoundIndex === nextCup.rounds.length - 1) {
      nextCup.champion = winners[0] ?? null;
      break;
    }

    const nextRound = nextCup.rounds[nextCup.currentRoundIndex + 1];

    if (nextRound.matches.length === 0) {
      for (let i = 0; i < winners.length; i += 2) {
        nextRound.matches.push({
          home: winners[i]!,
          away: winners[i + 1]!,
          hg: null,
          ag: null,
          winner: null,
        });
      }
    }

    nextCup.currentRoundIndex += 1;
  }

  return nextCup;
}

function cupStageName(round?: CupRound) {
  const count = round?.matches.length ?? 0;

  if (count >= 16) return "16avos";
  if (count === 8) return "Octavos";
  if (count === 4) return "Cuartos";
  if (count === 2) return "Semifinal";
  if (count === 1) return "Final";

  return "Pendiente";
}

function generateNews(table: Row[], champion?: string, cupChampion?: string | null) {
  const leader = table[0];
  const second = table[1];
  const third = table[2];
  const fourth = table[3];
  const last = table[table.length - 1];
  const penultimate = table[table.length - 2];
  const bestAttack = [...table].sort((a, b) => b.gf - a.gf || b.pts - a.pts)[0];
  const bestDefense = [...table].sort((a, b) => a.gc - b.gc || b.pts - a.pts)[0];
  const worstDefense = [...table].sort((a, b) => b.gc - a.gc || a.pts - b.pts)[0];
  const bestDiff = [...table].sort((a, b) => b.dg - a.dg || b.pts - a.pts)[0];
  const closeTitle = leader && second && leader.pts - second.pts <= 3;
  const seed = hashText(table.map((row) => `${row.team}-${row.pts}-${row.gf}-${row.gc}-${row.dg}`).join("|") + champion + cupChampion);

  const leaderSize = getTeamSizeLabel(leader?.team);
  const lastSize = getTeamSizeLabel(last?.team);
  const variants = [
    leader ? `${leader.team} mira a todos desde arriba con ${leader.pts} puntos; ${leaderSize === "CHICO" ? "la sorpresa empieza a ponerse seria" : leaderSize === "MEDIO" ? "su campaña ya pide otra consideración" : "ahora le toca sostener la chapa"}.` : "",
    closeTitle && leader && second ? `${second.team} está a ${leader.pts - second.pts} de ${leader.team}: la punta tiene respiración en la nuca.` : "",
    third ? `${third.team} se mantiene en el lote fuerte y todavía tiene margen para meter presión.` : "",
    fourth ? `${fourth.team} aparece como tapado: no hace ruido, pero la tabla ya lo muestra cerca.` : "",
    last ? `${last.team} está último y la calculadora ya dejó de ser chiste${lastSize === "GIGANTE" || lastSize === "GRANDE" ? ": para un club de ese peso, duele el doble" : ""}.` : "",
    penultimate ? `${penultimate.team} mira de reojo el fondo: no está hundido, pero tampoco puede regalar nada.` : "",
    bestAttack ? `${bestAttack.team} tiene el ataque más picante: ${bestAttack.gf} goles y varios arqueros con pesadillas.` : "",
    bestDefense ? `${bestDefense.team} cerró la persiana: apenas ${bestDefense.gc} goles recibidos.` : "",
    worstDefense ? `${worstDefense.team} necesita candado urgente: ya recibió ${worstDefense.gc}.` : "",
    bestDiff ? `${bestDiff.team} presume la mejor diferencia de gol: ${bestDiff.dg > 0 ? "+" : ""}${bestDiff.dg}.` : "",
    champion ? `${champion} carga el peso del último título; en este save, los recuerdos duran poco.` : "",
    cupChampion ? `${cupChampion} llega con chapa copera y sabe que los cruces se juegan con otra cara.` : "",
    leader && bestAttack && leader.team === bestAttack.team ? `${leader.team} lidera y además pega fuerte arriba: combo incómodo para cualquiera.` : "",
    leader && bestDefense && leader.team === bestDefense.team ? `${leader.team} manda desde el orden: pocos goles en contra y mucho oficio.` : "",
  ].filter(Boolean);

  const pivot = variants.length ? seed % variants.length : 0;
  const rotated = [...variants.slice(pivot), ...variants.slice(0, pivot)];

  return (rotated.length >= 3 ? rotated : [
    "La fecha dejó ruido, goles y varios mirando la tabla de reojo.",
    "Arriba se acomodan los candidatos; abajo, nadie quiere sacar la calculadora.",
    "El campeonato empieza a mostrar quién tiene chapa y quién puro humo.",
  ]).slice(0, 3);
}

function getRelegations(history: SeasonRecord[], finalTable: Row[]) {
  const byTable = finalTable[finalTable.length - 1];

  const averageRows = getAverageRows(history, finalTable);
  const sortedAsc = [...averageRows].sort((a, b) => a.promedio - b.promedio);

  const lowestAverage = sortedAsc.find((row) => row.team !== byTable.team);

  const secondLowestAverage = sortedAsc.find(
    (row) => row.team !== byTable.team && row.team !== lowestAverage?.team
  );

  const byAverage =
    finalTable.find((row) => row.team === lowestAverage?.team) ??
    finalTable[finalTable.length - 2];

  const promotionTeamA =
    finalTable.find((row) => row.team === secondLowestAverage?.team) ??
    finalTable[finalTable.length - 3];

  return {
    byTable,
    byAverage,
    promotionTeamA,
    relegated: [byTable, byAverage],
  };
}

function playPromotionMatch(teamA: Row | undefined, teamB: Row | undefined) {
  if (!teamA || !teamB) return null;

  const goalsA = simulateGoals(teamA.team, teamB.team, "cup", true);
  const goalsB = simulateGoals(teamB.team, teamA.team, "cup", false);

  if (goalsA > goalsB) return teamA.team;
  if (goalsB > goalsA) return teamB.team;

  return Math.random() > 0.5 ? teamA.team : teamB.team;
}

function getAllMatchesFromSeason(season: SeasonRecord) {
  const leagueRounds = [...(season.fixtureA ?? []), ...(season.fixtureB ?? [])];
  const cupRounds = season.cupRounds ?? [];

  const leagueMatches = leagueRounds.flatMap((round) =>
    round.matches.map((match) => ({
      home: match.home,
      away: match.away,
      hg: match.hg,
      ag: match.ag,
    }))
  );

  const cupMatches = cupRounds.flatMap((round) =>
    round.matches.map((match) => ({
      home: match.home,
      away: match.away,
      hg: match.hg,
      ag: match.ag,
    }))
  );

  return [...leagueMatches, ...cupMatches];
}

function getHeadToHead(team: string, allTeams: string[], history: SeasonRecord[]): HeadToHeadRow[] {
  return allTeams
    .filter((rival) => rival !== team)
    .map((rival) => {
      let pj = 0;
      let wins = 0;
      let draws = 0;
      let losses = 0;
      let gf = 0;
      let gc = 0;

      history.forEach((season) => {
        getAllMatchesFromSeason(season).forEach((match) => {
          const involved =
            (match.home === team && match.away === rival) ||
            (match.home === rival && match.away === team);

          if (!involved || match.hg === null || match.ag === null) return;

          const teamGoals = match.home === team ? match.hg : match.ag;
          const rivalGoals = match.home === team ? match.ag : match.hg;

          pj += 1;
          gf += teamGoals;
          gc += rivalGoals;

          if (teamGoals > rivalGoals) wins += 1;
          else if (teamGoals < rivalGoals) losses += 1;
          else draws += 1;
        });
      });

      return { rival, pj, wins, draws, losses, gf, gc };
    })
    .filter((row) => row.pj > 0)
    .sort((a, b) => b.pj - a.pj || b.wins - a.wins || a.rival.localeCompare(b.rival));
}

function generateClubText(club: ClubStats) {
  const totalTitles = club.titles + club.cupTitles;
  const stability = club.seasons > 0 ? club.historicalPoints / club.seasons : 0;

  if (club.titles >= 5) {
    return `${club.team} ya se instaló como una potencia histórica del simulador. Sus ligas ganadas lo ponen en una mesa chica de candidatos permanentes y cada temporada empieza con obligación de pelear arriba.`;
  }

  if (club.titles >= 3 && club.cupTitles >= 2) {
    return `${club.team} es un club completo: sabe ganar torneos largos y también resolver cruces de copa. Su ciclo combina regularidad, jerarquía y carácter en partidos decisivos.`;
  }

  if (club.titles >= 3) {
    return `${club.team} se transformó en uno de los clubes más fuertes del país. Sus títulos de liga lo ponen como protagonista histórico y cada temporada aparece como candidato serio.`;
  }

  if (club.titles >= 1 && club.cupTitles >= 1) {
    return `${club.team} ya conoce las dos caras de la gloria: festejó en la liga y también levantó copas. No siempre domina, pero cuando encuentra confianza puede ganarle a cualquiera.`;
  }

  if (club.titles >= 1 && club.historicalPoints < 120) {
    return `${club.team} tocó el cielo con una liga inolvidable, aunque todavía busca sostener ese nivel en el tiempo. Su desafío es dejar de vivir de una campaña histórica y construir una era.`;
  }

  if (club.titles >= 1) {
    return `${club.team} ya dejó una marca grande con su título de liga. Puede no ser el más regular de todos, pero sabe competir cuando la temporada lo pone cerca de la gloria.`;
  }

  if (club.cupTitles >= 4) {
    return `${club.team} es prácticamente un especialista copero. En la Copa Argentina se agranda, elimina rivales pesados y convirtió los mano a mano en su territorio favorito.`;
  }

  if (club.cupTitles >= 2 && club.titles === 0) {
    return `${club.team} se hace especialmente fuerte en la Copa Argentina. En los torneos de liga todavía le falta regularidad, pero en cruces mano a mano compite como un grande.`;
  }

  if (club.cupTitles >= 1 && club.titles === 0) {
    return `${club.team} encontró una identidad copera importante. Aunque en la liga todavía busca mayor estabilidad, en Copa Argentina ya demostró que puede golpear fuerte.`;
  }

  if (club.relegations >= 3 && club.promotions >= 3) {
    return `${club.team} vive en una montaña rusa: baja, sube y vuelve a pelear. Es un club de emociones fuertes, acostumbrado a finales dramáticos y temporadas al límite.`;
  }

  if (club.relegations >= 3) {
    return `${club.team} atraviesa una historia dura, marcada por varios descensos. Necesita reconstruirse desde la base para recuperar estabilidad y volver a ser competitivo.`;
  }

  if (club.relegations > club.promotions) {
    return `${club.team} tuvo más golpes que alegrías en los movimientos de categoría. La prioridad deportiva pasa por consolidarse y evitar que la presión lo arrastre otra vez.`;
  }

  if (club.promotions >= 3 && club.relegations === 0) {
    return `${club.team} es una historia de crecimiento puro. Ascendió, se afirmó y todavía no pagó derecho de piso, mostrando una evolución muy seria.`;
  }

  if (club.promotions > club.relegations) {
    return `${club.team} viene creciendo desde abajo. Sus ascensos muestran una evolución importante y puede transformarse en un equipo estable de Primera.`;
  }

  if (club.seasons >= 8 && totalTitles === 0 && stability >= 35) {
    return `${club.team} es uno de esos equipos siempre incómodos: no acumula títulos, pero suma puntos, compite bien y suele arruinarle campeonatos a los candidatos.`;
  }

  if (club.seasons >= 8 && totalTitles === 0) {
    return `${club.team} es un habitante habitual de Primera, aunque todavía le falta dar el salto grande. Tiene recorrido, identidad y una deuda pendiente con las vueltas olímpicas.`;
  }

  if (club.historicalPoints > 300 && totalTitles === 0) {
    return `${club.team} tiene números de club serio, pero todavía no pudo traducirlos en títulos. Es regular, competitivo y con una base que invita a pensar en algo más.`;
  }

  if (club.historicalPoints > 250) {
    return `${club.team} mantiene una trayectoria sólida. No siempre pelea títulos, pero suma puntos, compite bien y suele ser un rival incómodo, especialmente de local.`;
  }

  if (club.seasons <= 2 && club.promotions > 0) {
    return `${club.team} recién empieza a escribir su capítulo en Primera. El ascenso le dio impulso, pero ahora necesita demostrar que puede sostenerse entre los mejores.`;
  }

  if (club.seasons <= 2 && club.historicalPoints > 0) {
    return `${club.team} está dando sus primeros pasos importantes. Todavía no tiene una identidad definitiva, pero cada punto suma para construir reputación.`;
  }

  if (club.historicalPoints <= 40 && club.seasons >= 3) {
    return `${club.team} viene sufriendo más de la cuenta. Le cuesta sumar, le cuesta sostener campañas y necesita una temporada de quiebre para cambiar su historia.`;
  }

  return `${club.team} todavía está construyendo su historia. Con el paso de las temporadas puede definir si será protagonista, copero, ascensor o un equipo de lucha permanente.`;
}


function formatFechaCount(count: number) {
  if (count === 0) return "última fecha";
  return `${count} fecha${count === 1 ? "" : "s"}`;
}

function buildTitleRaceLine(table: Row[], remainingRounds: number, league: LeagueKey) {
  const leader = table[0];
  const second = table[1];
  const third = table[2];

  if (!leader) return "El campeonato entra en zona caliente y cada resultado empieza a pesar más que la tabla misma.";

  const leagueName = league === "b" ? "la B Nacional" : "la Liga Profesional";
  const gap = second ? leader.pts - second.pts : 0;
  const pointsLeft = Math.max(remainingRounds, 0) * 3;
  const dateText = formatFechaCount(remainingRounds);

  if (remainingRounds === 0) {
    return `${leader.team} cerró la última fecha como dueño de ${leagueName}. La tabla ya no admite promesas: lo que no se ganó en la cancha quedó perdido en el archivo.`;
  }

  if (!second) {
    return `A falta de ${dateText}, ${leader.team} manda en ${leagueName} y mira el cierre con el peso de quien sabe que cada pelota puede valer una temporada.`;
  }

  if (gap === 0) {
    return `A falta de ${dateText}, ${leagueName} está al rojo vivo: ${leader.team} y ${second.team} llegan igualados, sin margen para pestañear y con la calculadora explotando.`;
  }

  if (gap <= 3) {
    return `Quedan ${dateText} y ${leader.team} defiende la punta con apenas ${gap} punto${gap === 1 ? "" : "s"} sobre ${second.team}. El torneo entró en zona de nervios.`;
  }

  if (pointsLeft > 0 && gap > pointsLeft) {
    return `${leader.team} tiene el cierre prácticamente servido: quedan ${dateText} y la distancia con ${second.team} ya parece demasiado grande para una remontada común.`;
  }

  return `El tramo final ya empezó: quedan ${dateText}, ${leader.team} manda con ${leader.pts} puntos y detrás aparecen ${second.team}${third ? ` y ${third.team}` : ""}, esperando el tropiezo que cambie todo.`;
}

function buildRelegationDramaLine(table: Row[], league: LeagueKey, stats?: ClubStatsCollection) {
  const last = table[table.length - 1];
  const penultimate = table[table.length - 2];
  const antepenultimate = table[table.length - 3];

  if (!last) return null;

  if (league === "b") {
    return `${last.team}${penultimate ? ` y ${penultimate.team}` : ""} viven una semana incómoda en el fondo de la B. No todo es ascenso: abajo también se juega reputación, futuro y paciencia.`;
  }

  const lastSize = getTeamSizeLabel(last.team, stats);
  const pressure = lastSize === "GIGANTE" || lastSize === "GRANDE"
    ? ` Para ${last.team}, que carga etiqueta de ${getTeamSizePhrase(last.team, stats)}, el golpe hace más ruido.`
    : "";

  return `${last.team}${penultimate ? `, ${penultimate.team}` : ""}${antepenultimate ? ` y ${antepenultimate.team}` : ""} empiezan a mirar la zona baja con otra cara. La pelea por no caer ya dejó de ser amenaza y se volvió tema de vestuario.${pressure}`;
}

function buildLeaderMovementLine(previousLeader: Row | undefined, newLeader: Row | undefined, remainingRounds: number) {
  if (!previousLeader || !newLeader) return null;
  if (previousLeader.team === newLeader.team) {
    if (remainingRounds <= 3) return `${newLeader.team} sostuvo la punta en el momento más incómodo: cuando todos esperan una caída, cada triunfo vale doble.`;
    return `${newLeader.team} sigue arriba y empieza a acostumbrar al resto a correr desde atrás.`;
  }

  return `${newLeader.team} le arrebató la punta a ${previousLeader.team} y cambió el clima del campeonato. No fue solo una fecha: fue un giro de cartelera.`;
}

function buildGrandezaRoundLine(results: { home: string; away: string; hg: number; ag: number; winner: string | null; totalGoals: number }[], table: Row[], stats?: ClubStatsCollection) {
  const upset = results.find((match) => {
    if (!match.winner) return false;
    const loser = match.winner === match.home ? match.away : match.home;
    const winnerSize = getTeamSizeLabel(match.winner, stats);
    const loserSize = getTeamSizeLabel(loser, stats);
    return (winnerSize === "CHICO" || winnerSize === "MUY CHICO") && (loserSize === "GRANDE" || loserSize === "GIGANTE");
  });

  if (upset?.winner) {
    const loser = upset.winner === upset.home ? upset.away : upset.home;
    return `${upset.winner} firmó un batacazo con todas las letras: bajó a ${loser}, ${getTeamSizePhrase(loser, stats)}, y recordó que la grandeza no firma planillas antes de jugar.`;
  }

  const smallTop = table.find((row, index) => index <= 4 && ["CHICO", "MUY CHICO"].includes(getTeamSizeLabel(row.team, stats)));
  if (smallTop) {
    const pos = table.findIndex((row) => row.team === smallTop.team) + 1;
    return `${smallTop.team} ya no puede esconderse detrás del cartel de chico: está ${pos}° y su campaña empieza a pedir una tapa propia.`;
  }

  const bigCrisis = [...table].reverse().find((row) => {
    const size = getTeamSizeLabel(row.team, stats);
    const pos = table.findIndex((item) => item.team === row.team) + 1;
    return (size === "GIGANTE" || size === "GRANDE") && pos >= 12;
  });

  if (bigCrisis) {
    const pos = table.findIndex((row) => row.team === bigCrisis.team) + 1;
    return `${bigCrisis.team} tiene nombre pesado, pero la tabla le devuelve una imagen incómoda: ${pos}° y con más preguntas que respuestas.`;
  }

  return null;
}

function buildPowerNarrativeLine(table: Row[], teamPower?: Record<string, number>) {
  const overachiever = table.find((row, index) => index <= 5 && getTeamPower(row.team, teamPower) <= 68);
  if (overachiever) {
    const pos = table.findIndex((row) => row.team === overachiever.team) + 1;
    return `${overachiever.team} está jugando por encima de su fuerza actual: con ${getTeamPower(overachiever.team, teamPower)} de poder aparece ${pos}° y rompe cualquier pronóstico frío.`;
  }

  const underachiever = [...table].reverse().find((row) => getTeamPower(row.team, teamPower) >= 78);
  if (underachiever) {
    const pos = table.findIndex((row) => row.team === underachiever.team) + 1;
    if (pos >= 10) return `${underachiever.team} tiene fuerza de candidato (${getTeamPower(underachiever.team, teamPower)}), pero su campaña no acompaña: la tabla empieza a exigir explicaciones.`;
  }

  return null;
}

function TeamLogo({
  team,
  size = "md",
}: {
  team?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
}) {
  const safeTeam = team ?? "-";
  const logo = logos[safeTeam];

  const sizeClass = {
    xs: "h-4 w-4",
    sm: "h-5 w-5",
    md: "h-7 w-7",
    lg: "h-10 w-10",
    xl: "h-14 w-14",
  }[size];

  if (!logo) {
    return (
      <div
        className={`${sizeClass} rounded-full bg-slate-600/60 border border-white/15 shrink-0 grid place-items-center text-[10px] font-black text-white/75`}
      >
        {safeTeam.slice(0, 1)}
      </div>
    );
  }

  return (
    <img
      src={logo}
      alt={safeTeam}
      className={`${sizeClass} object-contain shrink-0 drop-shadow-sm`}
      onError={(event) => {
        event.currentTarget.style.display = "none";
      }}
    />
  );
}

function TournamentLogo({ league }: { league: LeagueKey }) {
  const src = leagueLogos[league];

  return (
    <img
      src={src}
      alt={league}
      className="h-12 w-12 object-contain hidden sm:block rounded-xl bg-white/90 p-1"
      onError={(event) => {
        event.currentTarget.style.display = "none";
      }}
    />
  );
}

function CupLogo({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const sizeClass =
    size === "lg" ? "h-14 w-14" : size === "sm" ? "h-8 w-8" : "h-12 w-12";

  return (
    <img
      src="/tournaments/copa-argentina.png"
      alt="Copa Argentina"
      className={`${sizeClass} object-contain rounded-xl bg-white/90 p-1`}
      onError={(event) => {
        event.currentTarget.style.display = "none";
      }}
    />
  );
}

function TeamName({
  team,
  align = "left",
  small = false,
}: {
  team?: string;
  align?: "left" | "right";
  small?: boolean;
}) {
  const safeTeam = team ?? "-";

  return (
    <div
      className={`flex items-center gap-2 min-w-0 ${
        align === "right" ? "justify-end text-right" : "justify-start text-left"
      }`}
    >
      {align === "right" ? (
        <>
          <span className="truncate">{safeTeam}</span>
          <TeamLogo team={safeTeam} size={small ? "sm" : "md"} />
        </>
      ) : (
        <>
          <TeamLogo team={safeTeam} size={small ? "sm" : "md"} />
          <span className="truncate">{safeTeam}</span>
        </>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: React.ReactNode;
  sub?: string;
}) {
  return (
    <div className="rounded-xl bg-white/[0.08] border border-white/10 shadow-sm px-4 py-3 backdrop-blur text-white">
      <p className="text-xs uppercase tracking-wide text-white/55 font-bold">{label}</p>
      <div className="text-xl font-black truncate">{value}</div>
      {sub && <p className="text-xs text-white/55 truncate">{sub}</p>}
    </div>
  );
}

function GlassCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`glass-card rounded-2xl bg-[#071118]/82 border border-white/10 shadow-2xl backdrop-blur-xl ${className}`}
    >
      {children}
    </div>
  );
}

function StandingsTable({ rows, type }: { rows: Row[]; type?: LeagueKey }) {
  function rowClass(index: number, total: number) {
    if (type === "primera") {
      if (index === 0 || index === 1) return "bg-emerald-500/18";
      if (index === 2) return "bg-sky-500/14";
      if (index === 3) return "bg-violet-500/14";
      if (index === total - 1) return "bg-red-500/25";
      return "bg-white/[0.025]";
    }

    if (type === "b") {
      if (index <= 1) return "bg-emerald-500/18";
      if (index === 2) return "bg-yellow-500/22";
      if (index >= total - 2) return "bg-red-500/18";
      return "bg-white/[0.025]";
    }

    return "bg-white/[0.025]";
  }

  return (
    <div className="overflow-auto rounded-xl border border-white/10 bg-black/20 shadow-inner text-white max-h-[560px]">
      <table className="w-full text-sm border-separate border-spacing-0">
        <thead className="sticky top-0 z-[1] bg-black/80 text-white">
          <tr>
            <th className="p-2 text-center">#</th>
            <th className="p-2 text-left">Equipo</th>
            <th className="p-2">Pts</th>
            <th className="p-2">PJ</th>
            <th className="p-2">PG</th>
            <th className="p-2">PE</th>
            <th className="p-2">PP</th>
            <th className="p-2">GF</th>
            <th className="p-2">GC</th>
            <th className="p-2">DG</th>
          </tr>
        </thead>

        <tbody>
          {rows.map((row, index) => (
            <tr
              key={row.team}
              className={`border-t border-white/10 transition-all hover:bg-white/10 ${rowClass(index, rows.length)}`}
            >
              <td className="text-center p-2 font-bold text-white/80">{index + 1}</td>

              <td className="p-2 font-semibold whitespace-nowrap min-w-[180px]">
                <TeamName team={row.team} small />
              </td>

              <td className="text-center font-black">{row.pts}</td>
              <td className="text-center">{row.pj}</td>
              <td className="text-center">{row.pg}</td>
              <td className="text-center">{row.pe}</td>
              <td className="text-center">{row.pp}</td>
              <td className="text-center">{row.gf}</td>
              <td className="text-center">{row.gc}</td>

              <td
                className={`text-center font-bold ${
                  row.dg > 0 ? "text-emerald-300" : row.dg < 0 ? "text-red-300" : ""
                }`}
              >
                {row.dg}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MatchCard({
  match,
  onUpdate,
  onSimulate,
}: {
  match: Match;
  onUpdate: (id: string, hg: number | null, ag: number | null) => void;
  onSimulate: (match: Match) => void;
}) {
  const played = match.hg !== null && match.ag !== null;
  const homeWon = played && (match.hg ?? 0) > (match.ag ?? 0);
  const awayWon = played && (match.ag ?? 0) > (match.hg ?? 0);

  return (
    <div className="border-b border-white/10 last:border-b-0 px-3 py-2 text-white transition-all hover:bg-white/8">
      <div className="grid grid-cols-[1fr_92px_1fr_64px] gap-3 items-center">
        <div className={`${homeWon ? "font-black" : "font-semibold"}`}>
          <TeamName team={match.home} align="right" small />
        </div>

        <div className="grid grid-cols-[34px_18px_34px] items-center justify-center gap-1">
          <input
            className="h-8 rounded-lg border border-white/10 bg-white/[0.08] text-white text-center font-black text-sm outline-none focus:ring-2 focus:ring-blue-500"
            value={match.hg ?? ""}
            onChange={(e) =>
              onUpdate(match.id, e.target.value === "" ? null : Number(e.target.value), match.ag)
            }
          />

          <span className="text-center font-black text-white/70">-</span>

          <input
            className="h-8 rounded-lg border border-white/10 bg-white/[0.08] text-white text-center font-black text-sm outline-none focus:ring-2 focus:ring-blue-500"
            value={match.ag ?? ""}
            onChange={(e) =>
              onUpdate(match.id, match.hg, e.target.value === "" ? null : Number(e.target.value))
            }
          />
        </div>

        <div className={`${awayWon ? "font-black" : "font-semibold"}`}>
          <TeamName team={match.away} small />
        </div>

        <button
          onClick={() => onSimulate(match)}
          className="rounded-lg bg-white/8 hover:bg-white/15 text-white px-3 py-1.5 text-xs font-bold transition-colors"
        >
          Jugar
        </button>
      </div>
    </div>
  );
}

function Zone({
  name,
  type,
  teams,
  fixture,
  setFixture,
  roundIndex,
  setRoundIndex,
  onRoundReport,
  clubStats,
  teamPower,
}: {
  name: string;
  type: LeagueKey;
  teams: string[];
  fixture: Round[];
  setFixture: React.Dispatch<React.SetStateAction<Round[]>>;
  roundIndex: number;
  setRoundIndex: React.Dispatch<React.SetStateAction<number>>;
  onRoundReport?: (report: RoundReport) => void;
  clubStats?: ClubStatsCollection;
  teamPower?: Record<string, number>;
}) {
  const table = useMemo(() => buildTable(teams, fixture), [teams, fixture]);
  const currentRound = fixture[roundIndex] ?? fixture[0];
  const leader = table[0];
  const playedInRound = currentRound.matches.filter((m) => m.hg !== null && m.ag !== null).length;
  const isB = type === "b";

  function emitRoundReport(simulatedMatches: Match[]) {
    const decided = simulatedMatches
      .filter((match) => match.hg !== null && match.ag !== null)
      .map((match) => ({
        match,
        diff: Math.abs((match.hg ?? 0) - (match.ag ?? 0)),
        goals: (match.hg ?? 0) + (match.ag ?? 0),
      }))
      .sort((a, b) => b.diff - a.diff || b.goals - a.goals)[0]?.match;

    const winner =
      decided && decided.hg !== null && decided.ag !== null
        ? decided.hg > decided.ag
          ? decided.home
          : decided.ag > decided.hg
            ? decided.away
            : null
        : null;

    const reportResults = simulatedMatches
      .filter((match) => match.hg !== null && match.ag !== null)
      .map((match) => ({
        home: match.home,
        away: match.away,
        hg: match.hg ?? 0,
        ag: match.ag ?? 0,
        winner: match.hg === match.ag ? null : (match.hg ?? 0) > (match.ag ?? 0) ? match.home : match.away,
        totalGoals: (match.hg ?? 0) + (match.ag ?? 0),
      }));

    const reportFixture = fixture.map((round) =>
      round.round === currentRound.round ? { ...round, matches: simulatedMatches } : round
    );
    const reportTable = buildTable(teams, reportFixture);
    const previousLeader = table[0];
    const reportLeader = reportTable[0];
    const remainingRounds = Math.max(fixture.length - currentRound.round, 0);

    const totalGoals = reportResults.reduce((acc, match) => acc + match.totalGoals, 0);
    const draws = reportResults.filter((match) => !match.winner).length;
    const awayWins = reportResults.filter((match) => match.winner === match.away).length;
    const homeWins = reportResults.filter((match) => match.winner === match.home).length;
    const biggest = [...reportResults].sort((a, b) => Math.abs(b.hg - b.ag) - Math.abs(a.hg - a.ag) || b.totalGoals - a.totalGoals)[0];
    const goalFest = [...reportResults].sort((a, b) => b.totalGoals - a.totalGoals)[0];
    const tightGames = reportResults.filter((match) => Math.abs(match.hg - match.ag) <= 1).length;
    const scoreless = reportResults.filter((match) => match.totalGoals === 0).length;
    const upset = [...reportResults].find((match) => {
      if (!match.winner) return false;
      const loser = match.winner === match.home ? match.away : match.home;
      return (strengths[match.winner] ?? 60) + 7 < (strengths[loser] ?? 60);
    });

    const featuredResult = upset ?? biggest ?? goalFest;
    const reportSeed = currentRound.round * 131 + totalGoals * 17 + homeWins * 7 + awayWins * 5 + draws * 3 + tightGames * 11 + (featuredResult?.totalGoals ?? 0);
    const reportVariant = reportSeed % 12;

    const featuredMatch = featuredResult
      ? {
          home: featuredResult.home,
          away: featuredResult.away,
          hg: featuredResult.hg,
          ag: featuredResult.ag,
          winner: featuredResult.winner,
        }
      : decided && decided.hg !== null && decided.ag !== null
        ? {
            home: decided.home,
            away: decided.away,
            hg: decided.hg,
            ag: decided.ag,
            winner,
          }
        : undefined;

    const mainTeam = featuredMatch?.winner ?? featuredMatch?.home ?? leader?.team ?? "La fecha";
    const rivalTeam = featuredMatch?.winner === featuredMatch?.home ? featuredMatch?.away : featuredMatch?.home;
    const loserTeam =
  featuredMatch?.winner && featuredMatch?.home && featuredMatch?.away
    ? featuredMatch.winner === featuredMatch.home
      ? featuredMatch.away
      : featuredMatch.winner === featuredMatch.away
        ? featuredMatch.home
        : null
    : null;
    const contextLine = buildSizeContextLine({
      winner: featuredMatch?.winner,
      loser: loserTeam,
      leader: reportLeader,
      table: reportTable,
      stats: clubStats,
    });

    const leaderMovementLine = buildLeaderMovementLine(previousLeader, reportLeader, remainingRounds);
    const titleRaceLine = buildTitleRaceLine(reportTable, remainingRounds, type);
    const relegationDramaLine = buildRelegationDramaLine(reportTable, type, clubStats);
    const grandezaRoundLine = buildGrandezaRoundLine(reportResults, reportTable, clubStats);
    const powerNarrativeLine = buildPowerNarrativeLine(reportTable, teamPower);

    const headlines = [
      `${mainTeam} puso la tapa`,
      `${mainTeam} sacudió la fecha`,
      `Fecha ${currentRound.round}: nadie salió ileso`,
      `La tabla empezó a hablar`,
      `${mainTeam} metió presión`,
      `Goles, nervios y calculadora`,
      `Una jornada con ruido de campeonato`,
      `${mainTeam} dejó una marca`,
      `El torneo cambió de cara`,
      `Hubo función y también susto`,
      `La fecha tuvo dueño y sospechas`,
      `Domingo de golpes cruzados`,
    ];

    const subtitles = [
      `La jornada tuvo ${totalGoals} goles, ${tightGames} partidos cerrados y varios mensajes para los que miran la tabla.`,
      `Entre triunfos locales, golpes visitantes y empates tensos, el torneo sumó otro capítulo con olor a archivo.`,
      `No se definió nada, pero más de uno terminó mirando el fixture con otra cara.`,
      `El campeonato todavía está largo, aunque algunas señales empiezan a repetirse.`,
      `La fecha mezcló oficio, sustos y resultados que pueden pesar después.`,
      `Una jornada de esas que parecen normales hasta que uno revisa la tabla.`,
      `Arriba se acomodan, abajo se inquietan y en el medio nadie duerme.`,
      `Hubo goles, hubo ruido y hubo equipos que salieron con más preguntas que respuestas.`,
      `La pelota dejó un par de verdades y varios silencios incómodos.`,
      `Fecha para guardar: no por definitiva, sino por traicionera.`,
      scoreless ? `Hasta los 0-0 dejaron algo: caras largas y calculadoras encendidas.` : `Los arcos tuvieron trabajo y las defensas, bastante para explicar el lunes.`,
      awayWins > homeWins ? `Los visitantes hicieron ruido fuera de casa y cambiaron el clima de la semana.` : `La localía pesó y varios hicieron de su cancha una trinchera.`,
    ];

    const leadLines = [
      contextLine,
      featuredMatch?.winner
        ? `${featuredMatch.winner} se quedó con el foco de la jornada porque convirtió un resultado en mensaje. No es título, pero sí de esas victorias que cambian el humor de una semana.`
        : `Hubo una jornada pareja, de esas que no rompen la tabla de golpe pero empiezan a mover el clima debajo de la superficie.`,
      featuredMatch?.winner
        ? `${featuredMatch.winner} ganó y le agregó volumen a su campaña. En un campeonato largo, estos partidos no levantan copas, pero construyen reputación.`
        : `La fecha dejó empates, goles repartidos y esa sensación de que nadie puede relajarse demasiado sin pagar intereses.`,
      featuredMatch?.winner
        ? `El gran golpe lo dio ${featuredMatch.winner}, que encontró una victoria de esas que después se recuerdan cuando llega la calculadora y empiezan los "si no fuera por..." .`
        : `La jornada tuvo más tensión que brillo, pero el campeonato también se construye con esos puntos silenciosos que en mayo parecen chicos y en diciembre valen oro.`,
      upset
        ? `${upset.winner} firmó el batacazo de la fecha: no fue solo un marcador, fue una advertencia para cualquiera que crea que la chapa juega sola.`
        : `${mainTeam} quedó en el centro de una jornada con más lectura que simple resultado: hubo números, señales y un par de alarmas encendidas.`,
      goalFest
        ? `${goalFest.home} y ${goalFest.away} armaron el partido más eléctrico: ${goalFest.hg}-${goalFest.ag}, una de esas funciones que dejan técnicos sin voz y defensas mirando al piso.`
        : `No hizo falta una goleada para que la fecha tuviera peso: algunos puntos valen más por contexto que por belleza.`,
    ];

    const featuredLine = featuredMatch
      ? `Partido destacado: ${featuredMatch.home} ${featuredMatch.hg} - ${featuredMatch.ag} ${featuredMatch.away}. ${featuredMatch.winner ? `${featuredMatch.winner} terminó festejando y ${rivalTeam ?? "su rival"} se fue con trabajo para la semana.` : "Empate cerrado, de esos que dejan gusto raro en los dos vestuarios."}`
      : "No hubo un partido que se robara toda la escena, pero sí varios resultados que pueden tener segunda lectura.";

    const analysisLines = [
      `La ${isB ? "Primera B Nacional" : "Liga Profesional"} dejó ${homeWins} triunfos locales, ${awayWins} visitantes y ${draws} empates. Más que una estadística, es el mapa emocional de la fecha: quién impuso casa, quién robó puntos y quién sobrevivió.`,
      `Con ${totalGoals} goles, la jornada tuvo ritmo suficiente para cambiar estados de ánimo. Algunos ganaron aire, otros empezaron a sentir que el margen se achica y varios quedaron obligados a responder rápido.`,
      goalFest ? `El partido más goleador fue ${goalFest.home} ${goalFest.hg}-${goalFest.ag} ${goalFest.away}. Fue el cartel luminoso de la fecha: mucho ataque, poca calma y defensores que van a soñar con coberturas.` : `La pelota dejó pocas certezas, pero una idea clara: cada punto empieza a tener peso propio.`,
      biggest ? `La diferencia más fuerte apareció en ${biggest.home} ${biggest.hg}-${biggest.ag} ${biggest.away}. No es solo resultado amplio: puede ser envión para uno y ruido interno para el otro.` : `La fecha se explicó más por detalles que por goleadas: una pelota quieta, un cierre tarde, un empate que parecía poco y puede valer mucho.`,
      awayWins > homeWins ? `Los visitantes salieron con personalidad: ${awayWins} triunfos fuera de casa. Cuando ganar afuera se vuelve costumbre, el torneo empieza a mirar distinto.` : `La localía pesó: ${homeWins} equipos hicieron valer su casa. No siempre alcanza con jugar bien; a veces hay que saber cerrar la puerta.`,
      draws >= 4 ? `Hubo muchos empates y poca generosidad. Fecha de dientes apretados, más calculadora que champagne, ideal para los que prefieren no perder antes que arriesgar de más.` : `La jornada no se escondió: hubo ganadores claros, derrotas dolorosas y poco espacio para las excusas de manual.`,
      scoreless ? `También hubo partidos cerrados al extremo: ${scoreless} terminaron sin goles. No todo 0-0 es olvido; algunos son síntomas de miedo, cansancio o respeto excesivo.` : `No hubo demasiado lugar para aburrirse: los resultados dejaron material para discutir toda la semana.`,
      tightGames >= 5 ? `${tightGames} partidos se resolvieron por detalles mínimos. Fue fecha de margen fino, cambios puntuales y uñas mordidas hasta el cierre.` : `No todo fue parejo: algunos resultados marcaron diferencias que pueden pesar anímicamente en el próximo fixture.`,
      featuredMatch?.winner ? `${featuredMatch.winner} sale fortalecido, pero el torneo no regala continuidad: confirmar después de una buena fecha suele ser más difícil que pegar primero.` : `La fecha dejó más preguntas que respuestas, justo lo que necesita un campeonato para seguir vivo.`,
      reportLeader ? `${reportLeader.team} mira todo desde arriba, pero cada fecha le agrega un examen nuevo. Ser líder no es estar cómodo; es jugar con todos apuntándote.` : `La tabla todavía se acomoda, pero algunos ya empiezan a mostrar qué tipo de temporada quieren jugar.`,
    ];

    const finalStretch = remainingRounds <= 3;
    const finalHeadline =
      remainingRounds === 0
        ? `Última fecha: ${reportLeader?.team ?? mainTeam} y el cierre caliente`
        : `Quedan ${remainingRounds}: ${reportLeader?.team ?? mainTeam} siente la presión`;

    const reportLines = [
      ...(finalStretch ? [titleRaceLine, relegationDramaLine] : []),
      leaderMovementLine,
      grandezaRoundLine,
      powerNarrativeLine,
      leadLines[reportVariant % leadLines.length],
      featuredLine,
      analysisLines[(reportVariant + 1) % analysisLines.length],
      analysisLines[(reportVariant + 2) % analysisLines.length],
      analysisLines[(reportVariant + 3) % analysisLines.length],
      analysisLines[(reportVariant + 4) % analysisLines.length],
      analysisLines[(reportVariant + 5) % analysisLines.length],
      contextLine,
    ].filter((line): line is string => Boolean(line));

    onRoundReport?.({
      title: `Diario de la Fecha ${currentRound.round}`,
      league: type,
      round: currentRound.round,
      year: 0,
      headline: finalStretch ? finalHeadline : headlines[reportVariant],
      subtitle: finalStretch ? titleRaceLine : subtitles[(reportVariant + totalGoals) % subtitles.length],
      featured: featuredMatch,
      results: reportResults.sort((a, b) => b.totalGoals - a.totalGoals).slice(0, 8),
      statLine: `${totalGoals} goles · ${homeWins} triunfos locales · ${awayWins} visitantes · ${draws} empates`,
      lines: reportLines.slice(0, 10),
    });

  }

  function updateMatch(id: string, hg: number | null, ag: number | null) {
    const nextMatches = currentRound.matches.map((match) =>
      match.id === id ? { ...match, hg, ag } : match
    );

    setFixture((old) =>
      old.map((round) =>
        round.round === currentRound.round
          ? { ...round, matches: nextMatches }
          : round
      )
    );

    if (nextMatches.every((match) => match.hg !== null && match.ag !== null)) {
      emitRoundReport(nextMatches);
    }
  }

  function simulateMatch(match: Match) {
    if (match.hg !== null && match.ag !== null) {
      const ok = window.confirm("Este partido ya fue simulado. ¿Querés volver a simularlo?");
      if (!ok) return;
    }

    playSound("match");

    updateMatch(
      match.id,
      simulateGoals(match.home, match.away, type, true),
      simulateGoals(match.away, match.home, type, false)
    );
  }

  function simulateRound() {
    const alreadyPlayed = currentRound.matches.some((match) => match.hg !== null && match.ag !== null);

    if (alreadyPlayed) {
      const ok = window.confirm(
        "Algunos partidos de esta fecha ya fueron simulados. Solo se simularán los que faltan. ¿Continuar?"
      );

      if (!ok) return;
    }

    playSound("match");

    const simulatedMatches = currentRound.matches.map((match) =>
      match.hg !== null && match.ag !== null ? match : simulateOne(match, type)
    );

    emitRoundReport(simulatedMatches);

    setFixture((old) =>
      old.map((round) =>
        round.round === currentRound.round
          ? {
              ...round,
              matches: simulatedMatches,
            }
          : round
      )
    );
  }
  return (
    <section className="space-y-4 animate-[fadeIn_.25s_ease-out] max-w-[1360px] mx-auto">
      <GlassCard
        className={`p-4 overflow-hidden relative ${
          isB ? "border-amber-300/20" : "border-blue-300/20"
        }`}
      >
        <div
          className={`absolute inset-0 opacity-25 ${
            isB
              ? "bg-[radial-gradient(circle_at_top_right,#f59e0b,transparent_34%)]"
              : "bg-[radial-gradient(circle_at_top_right,#2563eb,transparent_34%)]"
          }`}
        />

        <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <TournamentLogo league={type} />

            <div>
              <p
                className={`text-xs uppercase tracking-[0.35em] font-black ${
                  isB ? "text-amber-200" : "text-blue-200"
                }`}
              >
                Temporada actual
              </p>

              <h2 className="text-3xl md:text-4xl font-black tracking-tight text-white">{name}</h2>

              <p className="text-sm text-white/65">
                Fecha {currentRound.round} · {playedInRound}/{currentRound.matches.length} partidos jugados
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 min-w-[320px]">
            <div className="rounded-xl bg-white/[0.07] border border-white/10 p-3">
              <p className="text-xs text-white/55 font-bold uppercase">Líder</p>

              <div className="mt-1 text-white">
                <TeamName team={leader?.team ?? "-"} small />
              </div>
            </div>

            <div className="rounded-xl bg-white/[0.07] border border-white/10 p-3">
              <p className="text-xs text-white/55 font-bold uppercase">Puntos líder</p>
              <p className="text-2xl font-black text-white">{leader?.pts ?? 0}</p>
            </div>

            <div className="rounded-xl bg-white/[0.07] border border-white/10 p-3 col-span-2 md:col-span-1">
              <p className="text-xs text-white/55 font-bold uppercase">Equipos</p>
              <p className="text-2xl font-black text-white">{teams.length}</p>
            </div>
          </div>
        </div>
      </GlassCard>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(760px,1.12fr)_minmax(560px,.88fr)] gap-4 items-start">
        <GlassCard className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setRoundIndex(Math.max(0, roundIndex - 1))}
                className="border border-white/10 bg-white/8 px-3 py-2 rounded-lg font-bold hover:bg-white/15 text-white"
              >
                Anterior
              </button>

              <div
                className={`${
                  isB ? "bg-amber-500" : "bg-blue-600"
                } rounded-lg text-white px-4 py-2 font-black shadow`}
              >
                Fecha {currentRound.round}
              </div>

              <button
                onClick={() => setRoundIndex(Math.min(fixture.length - 1, roundIndex + 1))}
                className="border border-white/10 bg-white/8 px-3 py-2 rounded-lg font-bold hover:bg-white/15 text-white"
              >
                Siguiente
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-black/20 overflow-hidden max-h-[560px] overflow-y-auto">
            {currentRound.matches.map((match) => (
              <MatchCard key={match.id} match={match} onUpdate={updateMatch} onSimulate={simulateMatch} />
            ))}
          </div>

          <button
            onClick={simulateRound}
            className="mt-3 w-full bg-gradient-to-r from-slate-950 to-blue-950 hover:brightness-110 text-white px-4 py-3 rounded-xl font-black shadow-lg transition-all"
          >
            Simular fecha completa
          </button>
        </GlassCard>

        <GlassCard className="p-4 h-fit min-w-0">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-2xl font-black text-white">Tabla</h3>
            <span className="text-xs uppercase tracking-wider font-black text-emerald-300">En vivo</span>
          </div>

          <StandingsTable rows={table} type={type} />
        </GlassCard>
      </div>
    </section>
  );
}

function CupPanel({
  cup,
  currentCupRound,
  simulateCupRound,
  advanceCupManually,
  resetCup,
  simulateCupMatch,
  updateCupMatch,
}: {
  cup: CupTournament;
  currentCupRound: CupRound;
  simulateCupRound: () => void;
  advanceCupManually: () => void;
  resetCup: () => void;
  simulateCupMatch: (matchIndex: number) => void;
  updateCupMatch: (matchIndex: number, hg: number | null, ag: number | null) => void;
}) {
  return (
    <section className="space-y-5 max-w-[1360px] mx-auto animate-[fadeIn_.25s_ease-out]">
      <GlassCard className="p-5 text-white border-sky-400/25 overflow-hidden relative">
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_top_right,#38bdf8,transparent_40%)]" />

        <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <CupLogo size="lg" />

            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-sky-300 font-black">Copa Argentina</p>

              <h1 className="text-4xl font-black text-white">
                {cup.champion ? "Copa finalizada" : cupStageName(currentCupRound)}
              </h1>

              <p className="text-white/65">
                {cup.champion
                  ? `Campeón: ${cup.champion}`
                  : "Participan los 20 de Primera y 12 de la B. Jugá la instancia y después tocá avanzar."}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={simulateCupRound}
              disabled={!!cup.champion}
              className={`px-5 py-3 rounded-xl font-black shadow-lg ${
                cup.champion ? "bg-white/15 text-white/45 cursor-not-allowed" : "bg-sky-600 hover:bg-sky-700 text-white"
              }`}
            >
              Simular instancia
            </button>

            <button
              onClick={advanceCupManually}
              disabled={!!cup.champion}
              className={`px-5 py-3 rounded-xl font-black shadow-lg ${
                cup.champion
                  ? "bg-white/15 text-white/45 cursor-not-allowed"
                  : "bg-emerald-600 hover:bg-emerald-700 text-white"
              }`}
            >
              Avanzar instancia
            </button>

            <button
              onClick={resetCup}
              className="px-5 py-3 rounded-xl font-black shadow-lg bg-black/55 hover:bg-black/75 border border-white/10 text-white"
            >
              Reiniciar copa
            </button>
          </div>
        </div>
      </GlassCard>

      <GlassCard className="p-4 text-white border-sky-400/20 overflow-hidden relative">
        <div className="absolute inset-0 opacity-15 bg-[radial-gradient(circle_at_top_right,#38bdf8,transparent_38%)]" />

        <div className="relative flex items-center justify-between mb-4">
          <h2 className="text-2xl font-black">Partidos de {cupStageName(currentCupRound)}</h2>

          <div className="flex items-center gap-2 rounded-full bg-sky-500/15 border border-sky-400/25 px-3 py-1 text-xs font-black uppercase tracking-wider text-sky-200">
            <CupLogo size="sm" />
            Instancia actual
          </div>
        </div>

        {cup.champion ? (
          <div className="relative rounded-2xl bg-yellow-500/15 border border-yellow-400/25 p-8 text-center">
            <div className="flex justify-center">
              <TeamLogo team={cup.champion ?? "-"} size="xl" />
            </div>

            <h3 className="mt-4 text-4xl font-black text-white">{cup.champion}</h3>

            <p className="text-white/65">Campeón de la Copa Argentina</p>
          </div>
        ) : (
          <div className="relative grid grid-cols-1 lg:grid-cols-2 gap-3">
            {(currentCupRound?.matches ?? []).map((match, index) => (
              <div
                key={`${currentCupRound?.name}-${index}`}
                className="rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 px-4 py-3 transition-all"
              >
                <div className="grid grid-cols-[1fr_92px_1fr_72px] gap-3 items-center text-sm">
                  <TeamName team={match.home} align="right" small />

                  <div className="grid grid-cols-[34px_18px_34px] items-center justify-center gap-1">
                    <input
                      className="h-8 rounded-lg border border-white/10 bg-white/[0.08] text-white text-center font-black text-sm outline-none focus:ring-2 focus:ring-sky-500"
                      value={match.hg ?? ""}
                      onChange={(e) =>
                        updateCupMatch(index, e.target.value === "" ? null : Number(e.target.value), match.ag)
                      }
                    />

                    <span className="text-center font-black text-white/70">-</span>

                    <input
                      className="h-8 rounded-lg border border-white/10 bg-white/[0.08] text-white text-center font-black text-sm outline-none focus:ring-2 focus:ring-sky-500"
                      value={match.ag ?? ""}
                      onChange={(e) =>
                        updateCupMatch(index, match.hg, e.target.value === "" ? null : Number(e.target.value))
                      }
                    />
                  </div>

                  <TeamName team={match.away} small />

                  <button
                    onClick={() => simulateCupMatch(index)}
                    className="rounded-lg bg-sky-600/90 hover:bg-sky-500 text-white px-3 py-1.5 text-xs font-bold transition-colors"
                  >
                    Jugar
                  </button>
                </div>

                {match.winner && (
                  <div className="mt-2 text-center text-xs text-sky-200 font-bold">Clasifica: {match.winner}</div>
                )}
              </div>
            ))}
          </div>
        )}
      </GlassCard>

      <GlassCard className="p-4 text-white">
        <h2 className="text-2xl font-black mb-3">Cuadro de Copa</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-3">
          {cup.rounds.map((round, index) => (
            <div
              key={`${round.name}-${index}`}
              className={`rounded-xl border p-3 ${
                index === cup.currentRoundIndex && !cup.champion
                  ? "bg-sky-500/15 border-sky-400/35"
                  : "bg-white/5 border-white/10"
              }`}
            >
              <p className="font-black mb-2">{cupStageName(round)}</p>

              <p className="text-xs text-white/55">
                {round.matches.length ? `${round.matches.length} partidos` : "Pendiente"}
              </p>
            </div>
          ))}
        </div>
      </GlassCard>
    </section>
  );
}

function FixtureFullView({
  title,
  fixture,
  league,
}: {
  title: string;
  fixture: Round[];
  league: LeagueKey;
}) {
  return (
    <GlassCard className="p-5 space-y-4 text-white">
      <div className="flex items-center gap-3">
        <TournamentLogo league={league} />
        <h2 className="text-2xl font-black">{title}</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {fixture.map((round) => (
          <details
            key={`${league}-${round.round}`}
            className="rounded-xl border border-white/10 bg-white/[0.04] p-4"
          >
            <summary className="cursor-pointer font-black text-lg">Fecha {round.round}</summary>

            <div className="mt-3 space-y-2">
              {round.matches.map((match) => (
                <div
                  key={match.id}
                  className="grid grid-cols-[1fr_68px_1fr] gap-3 items-center rounded-lg bg-black/25 px-3 py-2 text-sm"
                >
                  <TeamName team={match.home} align="right" small />

                  <div className="text-center font-black">
                    {match.hg === null || match.ag === null ? "-" : `${match.hg} - ${match.ag}`}
                  </div>

                  <TeamName team={match.away} small />
                </div>
              ))}
            </div>
          </details>
        ))}
      </div>
    </GlassCard>
  );
}

function HistoricTable({ rows }: { rows: Row[] }) {
  return <StandingsTable rows={rows} />;
}

function ChampionshipsTable({ history, teams }: { history: SeasonRecord[]; teams: string[] }) {
  const [mode, setMode] = useState<"total" | "liga" | "copa" | "b" | "descensos">("total");

  const rows = useMemo(() => {
    const stats: Record<
      string,
      {
        liga: number;
        copa: number;
        b: number;
        descensos: number;
        total: number;
      }
    > = {};

    teams.forEach((team) => {
      stats[team] = {
        liga: 0,
        copa: 0,
        b: 0,
        descensos: 0,
        total: 0,
      };
    });

    history.forEach((season) => {
      const champion = season.champion.team;
      const cupChampion = season.cupChampion;
      const bChampion = season.b[0]?.team;

      if (!stats[champion]) {
        stats[champion] = { liga: 0, copa: 0, b: 0, descensos: 0, total: 0 };
      }
      stats[champion].liga += 1;

      if (cupChampion) {
        if (!stats[cupChampion]) {
          stats[cupChampion] = { liga: 0, copa: 0, b: 0, descensos: 0, total: 0 };
        }
        stats[cupChampion].copa += 1;
      }

      if (bChampion) {
        if (!stats[bChampion]) {
          stats[bChampion] = { liga: 0, copa: 0, b: 0, descensos: 0, total: 0 };
        }
        stats[bChampion].b += 1;
      }

      season.relegated.forEach((row) => {
        if (!stats[row.team]) {
          stats[row.team] = { liga: 0, copa: 0, b: 0, descensos: 0, total: 0 };
        }
        stats[row.team].descensos += 1;
      });

      if (
        season.promotionWinner &&
        season.promotionWinner === season.promotionTeamB?.team &&
        season.promotionTeamA
      ) {
        if (!stats[season.promotionTeamA.team]) {
          stats[season.promotionTeamA.team] = { liga: 0, copa: 0, b: 0, descensos: 0, total: 0 };
        }
        stats[season.promotionTeamA.team].descensos += 1;
      }
    });

    Object.values(stats).forEach((row) => {
      // Torneos totales NO cuenta la B.
      row.total = row.liga + row.copa;
    });

    return Object.entries(stats)
      .map(([team, values]) => ({
        team,
        ...values,
        value: values[mode],
      }))
      .sort((a, b) => b.value - a.value || b.total - a.total || a.team.localeCompare(b.team));
  }, [history, teams, mode]);

  const labels = {
    total: "Torneos totales",
    liga: "Ligas ganadas",
    copa: "Copas Argentina",
    b: "Ligas de la B",
    descensos: "Descensos",
  };

  const descriptions = {
    total: "Suma solo Liga Profesional + Copa Argentina. No cuenta títulos de la B.",
    liga: "Ranking exclusivo de Ligas Profesionales ganadas.",
    copa: "Ranking exclusivo de Copas Argentina ganadas.",
    b: "Ranking exclusivo de campeonatos de Primera B Nacional.",
    descensos: "Ranking exclusivo de descensos registrados.",
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {[
          ["total", "Torneos totales"],
          ["liga", "Ligas ganadas"],
          ["copa", "Copas Argentina"],
          ["b", "Ligas de la B"],
          ["descensos", "Descensos"],
        ].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setMode(key as "total" | "liga" | "copa" | "b" | "descensos")}
            className={`rounded-xl px-4 py-2 font-black border transition-all ${
              mode === key
                ? "bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-900/25"
                : "bg-black/45 text-white border-white/10 hover:bg-white/10"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <p className="text-sm text-white/65">{descriptions[mode]}</p>

      <div className="overflow-auto rounded-xl border border-white/10 bg-black/35 backdrop-blur-xl shadow-xl text-white">
        <table className="w-full text-sm">
          <thead className="bg-black/75 text-white">
            <tr>
              <th className="p-3">#</th>
              <th className="p-3 text-left">Equipo</th>
              <th>{labels[mode]}</th>
              {mode === "total" && (
                <>
                  <th>Liga</th>
                  <th>Copa Arg.</th>
                </>
              )}
            </tr>
          </thead>

          <tbody>
            {rows.map((row, index) => (
              <tr key={row.team} className="border-t border-white/10 hover:bg-white/10">
                <td className="text-center p-3 font-bold">{index + 1}</td>

                <td className="p-3 font-semibold">
                  <TeamName team={row.team} small />
                </td>

                <td className={`text-center font-black text-lg ${mode === "descensos" ? "text-red-300" : ""}`}>
                  {row.value}
                </td>

                {mode === "total" && (
                  <>
                    <td className="text-center font-bold">{row.liga}</td>
                    <td className="text-center font-bold">{row.copa}</td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-white/55">
        * En las vistas individuales se muestra solo esa estadística. La B tiene su ranking separado y no suma en torneos totales.
      </p>
    </div>
  );
}

function BestWorstStats({ history }: { history: SeasonRecord[] }) {
  const stats = useMemo(() => {
    const allPrimera = history.flatMap((season) =>
      season.primera.map((row) => ({
        ...row,
        year: season.year,
      }))
    );

    const best = [...allPrimera].sort((a, b) => b.pts - a.pts || b.dg - a.dg)[0];
    const worst = [...allPrimera].sort((a, b) => a.pts - b.pts || a.dg - b.dg)[0];
    const mostGoals = [...allPrimera].sort((a, b) => b.gf - a.gf)[0];
    const bestDefense = [...allPrimera].sort((a, b) => a.gc - b.gc)[0];

    return { best, worst, mostGoals, bestDefense };
  }, [history]);

  if (!history.length) return null;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <StatCard
        label="Mejor campaña"
        value={stats.best ? `${stats.best.team} · ${stats.best.pts}` : "-"}
        sub={stats.best ? `Año ${stats.best.year}` : undefined}
      />

      <StatCard
        label="Peor campaña"
        value={stats.worst ? `${stats.worst.team} · ${stats.worst.pts}` : "-"}
        sub={stats.worst ? `Año ${stats.worst.year}` : undefined}
      />

      <StatCard
        label="Más goleador"
        value={stats.mostGoals ? `${stats.mostGoals.team} · ${stats.mostGoals.gf}` : "-"}
        sub={stats.mostGoals ? `Año ${stats.mostGoals.year}` : undefined}
      />

      <StatCard
        label="Mejor defensa"
        value={stats.bestDefense ? `${stats.bestDefense.team} · ${stats.bestDefense.gc}` : "-"}
        sub={stats.bestDefense ? `Año ${stats.bestDefense.year}` : undefined}
      />
    </div>
  );
}

function AverageTable({ history, currentTable }: { history: SeasonRecord[]; currentTable: Row[] }) {
  const rows = useMemo(() => getAverageRows(history, currentTable), [history, currentTable]);
  const directRelegationTeam = rows[rows.length - 1]?.team;
  const promotionTeam = rows[rows.length - 2]?.team;

  return (
    <div className="overflow-auto rounded-xl border border-white/10 bg-black/35 backdrop-blur-xl shadow-xl text-white">
      <table className="w-full text-sm">
        <thead className="bg-black/70 text-white">
          <tr>
            <th className="p-3">#</th>
            <th className="p-3 text-left">Equipo</th>
            <th>Pts</th>
            <th>PJ</th>
            <th>Temp.</th>
            <th>Promedio</th>
          </tr>
        </thead>

        <tbody>
          {rows.map((row, index) => (
            <tr
              key={row.team}
              className={`border-t border-white/10 ${
                row.team === directRelegationTeam
                  ? "bg-red-500/25"
                  : row.team === promotionTeam
                  ? "bg-yellow-500/25"
                  : index < 4
                  ? "bg-emerald-500/15"
                  : "bg-white/[0.03]"
              }`}
            >
              <td className="text-center p-3 font-bold text-white">{index + 1}</td>

              <td className="p-3 font-semibold">
                <TeamName team={row.team} small />
              </td>

              <td className="text-center font-bold">{row.pts}</td>
              <td className="text-center">{row.pj}</td>
              <td className="text-center">{row.temporadas}</td>
              <td className="text-center font-black">{row.promedio.toFixed(3)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className="p-3 text-xs text-white/60">
        * Promedios con las últimas 4 temporadas disponibles: 3 pasadas + actual. Rojo:
        descenso directo por promedio. Amarillo: promoción contra el 3.º de la B.
      </p>
    </div>
  );
}

function MovementsTable({ history }: { history: SeasonRecord[] }) {
  if (!history.length) {
    return <p className="text-white/70">Todavía no hay ascensos ni descensos registrados.</p>;
  }

  return (
    <div className="space-y-4">
      {history.map((season) => (
        <GlassCard key={season.year} className="p-5 text-white">
          <h2 className="text-2xl font-black mb-3">Año {season.year}</h2>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="rounded-xl bg-yellow-500/15 border border-yellow-400/20 p-4">
              <p className="font-black mb-2">Campeón</p>
              <TeamName team={season.champion.team} />
            </div>

            <div className="rounded-xl bg-red-500/15 border border-red-400/20 p-4">
              <p className="font-black mb-2">Descendidos</p>

              <div className="space-y-2">
                <div>
                  <span className="text-xs text-white/60">Tabla general</span>
                  <TeamName team={season.relegatedByTable?.team ?? season.relegated[0]?.team} small />
                </div>

                <div>
                  <span className="text-xs text-white/60">Promedios</span>
                  <TeamName team={season.relegatedByAverage?.team ?? season.relegated[1]?.team} small />
                </div>
              </div>
            </div>

            <div className="rounded-xl bg-emerald-500/15 border border-emerald-400/20 p-4">
              <p className="font-black mb-2">Ascendidos directos</p>

              <div className="space-y-2">
                {season.promoted.map((row) => (
                  <TeamName key={row.team} team={row.team} small />
                ))}
              </div>
            </div>

            <div className="rounded-xl bg-orange-500/15 border border-orange-400/20 p-4">
              <p className="font-black mb-2">Promoción</p>

              <div className="space-y-2">
                <div>
                  <span className="text-xs text-white/60">Primera</span>
                  <TeamName team={season.promotionTeamA?.team ?? "-"} small />
                </div>

                <div>
                  <span className="text-xs text-white/60">B Nacional</span>
                  <TeamName team={season.promotionTeamB?.team ?? "-"} small />
                </div>

                <div>
                  <span className="text-xs text-white/60">Ganador</span>
                  <TeamName team={season.promotionWinner ?? "-"} small />
                </div>
              </div>
            </div>
          </div>
        </GlassCard>
      ))}
    </div>
  );
}

function RelegationPreview({ history, table, bTable }: { history: SeasonRecord[]; table: Row[]; bTable: Row[] }) {
  const { byTable, byAverage, promotionTeamA } = getRelegations(history, table);
  const promotionTeamB = bTable[2];

  return (
    <GlassCard className="p-5 text-white h-fit">
      <h2 className="text-2xl font-black mb-4">Descensos y promoción</h2>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-xl bg-red-500/15 border border-red-400/20 p-4 text-center">
          <p className="font-bold">Por tabla general</p>
          <p className="text-xs text-white/55 mb-3">Último desciende a la B</p>

          <div className="flex justify-center">
            <TeamName team={byTable?.team ?? "-"} small />
          </div>
        </div>

        <div className="rounded-xl bg-red-500/15 border border-red-400/20 p-4 text-center">
          <p className="font-bold">Por promedios</p>
          <p className="text-xs text-white/55 mb-3">Peor promedio desciende</p>

          <div className="flex justify-center">
            <TeamName team={byAverage?.team ?? "-"} small />
          </div>
        </div>

        <div className="rounded-xl bg-yellow-500/15 border border-yellow-400/20 p-4 text-center">
          <p className="font-bold">Promoción</p>
          <p className="text-xs text-white/55 mb-3">Anteúltimo promedio vs 3.º de la B</p>

          <div className="space-y-2">
            <div className="flex justify-center">
              <TeamName team={promotionTeamA?.team ?? "-"} small />
            </div>

            <div className="text-xs font-black text-white/60">VS</div>

            <div className="flex justify-center">
              <TeamName team={promotionTeamB?.team ?? "-"} small />
            </div>
          </div>
        </div>
      </div>
    </GlassCard>
  );
}

function playSound(type: "click" | "champion" | "match" | "season" = "click") {
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;

    const audio = new AudioContextClass();
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();

    oscillator.type =
      type === "champion" || type === "season" ? "triangle" : type === "match" ? "square" : "sine";

    oscillator.frequency.value =
      type === "season" ? 523 : type === "champion" ? 660 : type === "match" ? 260 : 420;

    gain.gain.value = type === "match" ? 0.035 : 0.045;

    oscillator.connect(gain);
    gain.connect(audio.destination);
    oscillator.start();

    if (type === "season") {
      oscillator.frequency.setValueAtTime(523, audio.currentTime);
      oscillator.frequency.setValueAtTime(659, audio.currentTime + 0.13);
      oscillator.frequency.setValueAtTime(784, audio.currentTime + 0.26);
      oscillator.frequency.setValueAtTime(1046, audio.currentTime + 0.42);
      gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.85);
      oscillator.stop(audio.currentTime + 0.86);
    } else if (type === "champion") {
      oscillator.frequency.setValueAtTime(660, audio.currentTime);
      oscillator.frequency.setValueAtTime(880, audio.currentTime + 0.12);
      oscillator.frequency.setValueAtTime(1040, audio.currentTime + 0.24);
      gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.55);
      oscillator.stop(audio.currentTime + 0.56);
    } else if (type === "match") {
      oscillator.frequency.setValueAtTime(260, audio.currentTime);
      oscillator.frequency.setValueAtTime(180, audio.currentTime + 0.07);
      gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.18);
      oscillator.stop(audio.currentTime + 0.19);
    } else {
      gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.12);
      oscillator.stop(audio.currentTime + 0.13);
    }
  } catch {
    // El sonido es opcional.
  }
}

function createRandomSaveCode() {
  return `liga-${Math.random().toString(36).slice(2, 8)}-${Date.now().toString(36)}`;
}


function SecondaryHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <GlassCard className="px-5 py-4 text-white w-full overflow-hidden relative">
      <div className="absolute inset-0 opacity-18 bg-[radial-gradient(circle_at_top_right,#2563eb,transparent_34%)]" />

      <div className="relative flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4 min-w-0">
          <div className="h-12 w-12 rounded-2xl bg-white/90 p-1 grid place-items-center shadow-lg shrink-0">
            <img
              src="/tournaments/liga-profesional.png"
              alt="Liga Manager"
              className="h-10 w-10 object-contain"
              onError={(event) => {
                event.currentTarget.style.display = "none";
              }}
            />
          </div>

          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.32em] text-blue-300 font-black">
              Liga Manager
            </p>

            <h2 className="text-2xl md:text-3xl font-black text-white leading-tight truncate">
              {title}
            </h2>

            <p className="text-white/65 mt-1 text-sm">{subtitle}</p>
          </div>
        </div>
      </div>
    </GlassCard>
  );
}

function Sidebar({
  open,
  setOpen,
  tab,
  setTab,
  theme,
  setTheme,
  year,
  saveCode,
  cloudStatus,
  saveOnline,
  loadOnline,
  setSaveCode,
  resetGame,
}: {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  tab: TabKey;
  setTab: React.Dispatch<React.SetStateAction<TabKey>>;
  theme: ThemeMode;
  setTheme: React.Dispatch<React.SetStateAction<ThemeMode>>;
  year: number;
  saveCode: string;
  cloudStatus: string;
  saveOnline: () => void;
  loadOnline: () => void;
  setSaveCode: React.Dispatch<React.SetStateAction<string>>;
  resetGame: () => void;
}) {
  const navItems: [TabKey, string, string][] = [
    ["inicio", "Inicio", "⌂"],
    ["fixture", "Fixture", "▦"],
    ["historica", "Tabla histórica", "≡"],
    ["campeonatos", "Estadísticas", "♛"],
    ["promedios", "Promedios", "◉"],
    ["movimientos", "Ascensos/Descensos", "↕"],
    ["clubes", "Clubes", "⌾"],
    ["anios", "Años", "▣"],
  ];

  const [savePanelOpen, setSavePanelOpen] = useState(false);

  return (
    <aside className={`fixed left-0 top-0 z-30 h-screen transition-all duration-300 ${open ? "w-[290px]" : "w-[86px]"}`}>
      <div className="h-full border-r border-white/10 bg-[#061016]/95 backdrop-blur-xl shadow-2xl px-3 py-4 flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3 px-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-11 w-11 rounded-xl bg-white/90 p-1 shrink-0 grid place-items-center shadow-lg">
              <img
                src="/tournaments/liga-profesional.png"
                alt="Liga Manager"
                className="h-9 w-9 object-contain"
                onError={(event) => {
                  event.currentTarget.style.display = "none";
                }}
              />
            </div>

            {open && (
              <div className="min-w-0">
                <h1 className="font-black text-white leading-tight truncate">Liga Manager</h1>
                <p className="text-xs text-white/55 truncate">Simulador argentino</p>
              </div>
            )}
          </div>

          <button
            onClick={() => setOpen((v) => !v)}
            className="h-9 w-9 rounded-lg bg-white/10 hover:bg-white/15 border border-white/10 text-white font-black shrink-0"
            title={open ? "Minimizar menú" : "Abrir menú"}
          >
            {open ? "«" : "»"}
          </button>
        </div>

        <div className="h-px bg-white/10 my-1" />

        <div className="space-y-1 text-sm">
          {navItems.map(([key, label, icon]) => (
            <button
              key={key}
              onClick={() => {
                playSound("click");
                setTab(key);
              }}
              title={label}
              className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left font-black transition-all ${
                tab === key
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-900/30"
                  : "text-white/75 hover:bg-white/10 hover:text-white"
              }`}
            >
              <span className="w-7 text-center shrink-0">{icon}</span>
              {open && <span className="truncate">{label}</span>}
            </button>
          ))}
        </div>

        <div className="h-px bg-white/10 my-1" />

        <div className="mt-auto space-y-2 pr-1 pb-3">
          <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-1.5">
            {open ? (
              <>
                <button
                  onClick={() => setSavePanelOpen((value) => !value)}
                  className="w-full rounded-xl bg-white/[0.055] hover:bg-white/[0.10] border border-white/10 px-3 py-2 text-left transition-all"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[10px] uppercase tracking-[0.18em] text-sky-300 font-black">
                        Autoguardado
                      </p>
                      <p className="text-[11px] text-white/55 truncate">
                        {saveCode}
                      </p>
                    </div>

                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 shrink-0" />
                  </div>
                </button>

                {savePanelOpen && (
                  <div className="mt-2 rounded-xl border border-white/10 bg-black/30 p-2 space-y-1.5">
                    <div className="flex items-center gap-2 rounded-lg bg-black/25 border border-white/10 px-2 py-1">
                      <span className="text-[10px] font-black text-white truncate">{saveCode}</span>

                      <button
                        onClick={() => navigator.clipboard?.writeText(saveCode)}
                        className="shrink-0 rounded-md bg-white/10 px-2 py-0.5 text-[10px] text-white hover:bg-white/15"
                      >
                        Copiar
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        onClick={saveOnline}
                        className="rounded-lg bg-emerald-600 hover:bg-emerald-700 px-2 py-1.5 text-white font-black text-[11px]"
                      >
                        Guardar
                      </button>

                      <button
                        onClick={loadOnline}
                        className="rounded-lg bg-sky-600 hover:bg-sky-700 px-2 py-1.5 text-white font-black text-[11px]"
                      >
                        Cargar
                      </button>
                    </div>

                    <button
                      onClick={() => {
                        const code = window.prompt("Nuevo código de guardado:", saveCode);
                        if (code) setSaveCode(code);
                      }}
                      className="w-full rounded-lg bg-white/10 hover:bg-white/15 border border-white/10 px-2 py-1.5 text-white font-black text-[11px]"
                    >
                      Cambiar código
                    </button>

                    {cloudStatus && (
                      <p className="text-[10px] text-white/55 leading-relaxed">{cloudStatus}</p>
                    )}
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <button
                  onClick={saveOnline}
                  title="Guardar online"
                  className="h-8 w-8 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm"
                >
                  ↑
                </button>

                <button
                  onClick={loadOnline}
                  title="Cargar online"
                  className="h-8 w-8 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-black text-sm"
                >
                  ↓
                </button>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-1.5">
            {open ? (
              <>
                <div className="grid grid-cols-[1fr_74px] gap-1.5 mb-1.5">
                  <button
                    onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                    className="rounded-xl bg-violet-600 hover:bg-violet-700 px-2 py-2 font-black text-white text-xs"
                  >
                    {theme === "dark" ? "Modo claro" : "Modo oscuro"}
                  </button>

                  <div className="rounded-xl bg-white/10 border border-white/10 px-2 py-1.5">
                    <p className="text-[9px] text-white/45 font-black uppercase">Año</p>
                    <p className="text-lg leading-none font-black text-white">{year}</p>
                  </div>
                </div>

                <button
                  onClick={resetGame}
                  className="w-full rounded-xl bg-red-600 hover:bg-red-700 px-2 py-1.5 font-black text-white text-xs"
                >
                  Reiniciar juego
                </button>
              </>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <button
                  onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                  title="Cambiar tema"
                  className="h-8 w-8 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-black text-sm"
                >
                  ◐
                </button>

                <button
                  onClick={resetGame}
                  title="Reiniciar juego"
                  className="h-8 w-8 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black text-sm"
                >
                  ↻
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}



function AiHomeNews({
  fallbackNews,
  table,
  history,
  cupChampion,
}: {
  fallbackNews: string[];
  table: Row[];
  history: SeasonRecord[];
  cupChampion?: string | null;
}) {
  const localNews = useMemo(
    () => generateNews(table, history[history.length - 1]?.champion?.team, cupChampion),
    [
      table.map((row) => `${row.team}-${row.pts}-${row.gf}-${row.gc}-${row.dg}`).join("|"),
      history.length,
      cupChampion,
    ]
  );

  const [items, setItems] = useState<string[]>(localNews);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    setItems(localNews);

    async function run() {
      try {
        setLoading(true);

        const res = await fetch("/api/ai-news", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
          body: JSON.stringify({
            table: table.slice(0, 8),
            bottom: table.slice(-4),
            lastChampion: history[history.length - 1]?.champion?.team ?? null,
            cupChampion: cupChampion ?? null,
            yearCount: history.length,
          }),
        });

        if (!res.ok) throw new Error("AI news failed");

        const data = await res.json();

        if (!cancelled && Array.isArray(data.news) && data.news.length) {
          const aiItems = data.news
            .filter((item: unknown) => typeof item === "string")
            .map((item: string) => item.trim())
            .filter((item: string) => item.length > 12);

          const filteredAi = aiItems.filter((item: string) => {
            const lower = item.toLowerCase();
            return !lower.includes("polémica") && !lower.includes("calentarse") && !lower.includes("mirando de reojo");
          });

          const merged = [...localNews, ...filteredAi]
            .filter((item, index, arr) => arr.findIndex((other) => other.toLowerCase() === item.toLowerCase()) === index)
            .slice(0, 3);

          setItems(merged.length >= 3 ? merged : localNews);
        }
      } catch {
        if (!cancelled) setItems(localNews);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();

    return () => {
      cancelled = true;
    };
  }, [
    localNews.join("|"),
    table.map((row) => `${row.team}-${row.pts}-${row.gf}-${row.gc}-${row.dg}`).join("|"),
    history.length,
    cupChampion,
  ]);

  return (
    <div className="space-y-1 mt-2">
      {items.map((item, index) => (
        <p key={`${item}-${index}`} className="text-sm text-white/85">
          📰 {item}
        </p>
      ))}

      {loading && <p className="text-xs text-white/45">Redacción IA preparando titulares...</p>}
    </div>
  );
}

function hashText(value: string) {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function pickOne<T>(items: T[], seed: number) {
  return items[Math.abs(seed) % items.length];
}


function getClubPowerScore(club: ClubStats) {
  return (
    club.titles * 120 +
    club.cupTitles * 62 +
    club.historicalPoints * 0.32 +
    club.seasons * 6 +
    club.promotions * 6 -
    club.relegations * 30
  );
}

type ClubStatsCollection = Record<string, ClubStats> | ClubStats[];

function getClubStatsList(stats?: ClubStatsCollection) {
  if (!stats) return [];
  return Array.isArray(stats) ? stats : Object.values(stats);
}

function findClubStats(team: string, stats?: ClubStatsCollection) {
  if (!stats) return undefined;
  if (Array.isArray(stats)) return stats.find((club) => club.team === team);
  return stats[team];
}

function getClubSizeBadge(club: ClubStats) {
  const score = getClubPowerScore(club);

  if (club.titles >= 5 || club.titles + club.cupTitles >= 7 || score >= 620) return "GIGANTE";
  if (club.titles >= 3 || club.titles + club.cupTitles >= 4 || score >= 410) return "GRANDE";
  if (club.titles >= 1 || club.cupTitles >= 1 || club.historicalPoints >= 115 || club.seasons >= 6 || score >= 150) return "MEDIO";
  if (club.historicalPoints >= 45 || club.seasons >= 3 || club.promotions >= 1) return "CHICO";
  return "MUY CHICO";
}

function getStrictClubSizeBadge(team: string, stats?: ClubStatsCollection) {
  const club = findClubStats(team, stats);

  if (!club) return "CHICO";

  const ranked = getClubStatsList(stats)
    .filter((item) => item.seasons > 0 || item.titles > 0 || item.cupTitles > 0 || item.historicalPoints > 0)
    .sort((a, b) => getClubPowerScore(b) - getClubPowerScore(a) || b.titles - a.titles || b.cupTitles - a.cupTitles || b.historicalPoints - a.historicalPoints);

  const index = ranked.findIndex((item) => item.team === team);

  // Cupos estrictos: 3 gigantes y 4 grandes como máximo.
  if (index >= 0 && index < 3) return "GIGANTE";
  if (index >= 3 && index < 7) return "GRANDE";

  const score = getClubPowerScore(club);

  if (club.titles >= 1 || club.cupTitles >= 1 || club.historicalPoints >= 115 || club.seasons >= 6 || score >= 150) return "MEDIO";
  if (club.historicalPoints >= 45 || club.seasons >= 3 || club.promotions >= 1) return "CHICO";
  return "MUY CHICO";
}

function getClubSizeBadgeClass(size: string) {
  if (size === "GIGANTE") return "bg-yellow-300 text-black border-yellow-200";
  if (size === "GRANDE") return "bg-blue-500 text-white border-blue-300";
  if (size === "MEDIO") return "bg-emerald-500 text-white border-emerald-300";
  if (size === "CHICO") return "bg-white/10 text-white border-white/20";
  return "bg-zinc-700 text-zinc-100 border-zinc-500";
}

function getTeamSizeLabel(team?: string | null, stats?: ClubStatsCollection) {
  if (!team) return "MEDIO";
  const club = findClubStats(team, stats);
  if (club) return getStrictClubSizeBadge(team, stats);

  const giants = ["Boca Jrs", "River", "Independiente"];
  const grandes = ["Racing", "San Lorenzo", "Velez", "Estudiantes"];
  const medios = [
    "Talleres",
    "Huracan",
    "Lanus",
    "Rosario Central",
    "Newels",
    "Union",
    "Banfield",
    "Argentinos Jrs",
    "Colon",
    "Gimnasia LP",
    "Belgrano",
    "Atl. Tucuman",
  ];

  if (giants.includes(team)) return "GIGANTE";
  if (grandes.includes(team)) return "GRANDE";
  if (medios.includes(team)) return "MEDIO";
  return "CHICO";
}

function getTeamSizePhrase(team?: string | null, stats?: ClubStatsCollection) {
  const size = getTeamSizeLabel(team, stats);
  if (size === "GIGANTE") return "un gigante";
  if (size === "GRANDE") return "un grande";
  if (size === "MEDIO") return "un club medio";
  if (size === "CHICO") return "un chico";
  return "un muy chico";
}

function buildSizeContextLine({
  winner,
  loser,
  leader,
  table,
  stats,
}: {
  winner?: string | null;
  loser?: string | null;
  leader?: Row;
  table: Row[];
  stats?: ClubStatsCollection;
}) {
  const winnerSize = getTeamSizeLabel(winner, stats);
  const loserSize = getTeamSizeLabel(loser, stats);
  const leaderSize = getTeamSizeLabel(leader?.team, stats);
  const winnerRow = winner ? table.find((row) => row.team === winner) : undefined;
  const loserRow = loser ? table.find((row) => row.team === loser) : undefined;
  const winnerPos = winnerRow ? table.findIndex((row) => row.team === winnerRow.team) + 1 : null;
  const loserPos = loserRow ? table.findIndex((row) => row.team === loserRow.team) + 1 : null;

  if (winner && winnerSize === "CHICO" && winnerPos && winnerPos <= 6) {
    return `${winner} aparece como chico solo en la etiqueta: está ${winnerPos}° y su campaña ya obliga a hablarlo con otro respeto.`;
  }

  if (winner && winnerSize === "CHICO" && loser && (loserSize === "GIGANTE" || loserSize === "GRANDE")) {
    return `${winner} pegó como chico atrevido ante ${loser}, ${getTeamSizePhrase(loser, stats)} que no puede regalar este tipo de partidos sin pagar ruido interno.`;
  }

  if (loser && (loserSize === "GIGANTE" || loserSize === "GRANDE") && loserPos && loserPos >= 10) {
    return `${loser} carga nombre pesado, pero la tabla no perdona historia: está ${loserPos}° y necesita reaccionar antes de que la temporada se le vuelva cuesta arriba.`;
  }

  if (winner && (winnerSize === "GIGANTE" || winnerSize === "GRANDE") && winnerPos && winnerPos <= 4) {
    return `${winner} hizo lo que se le exige a ${getTeamSizePhrase(winner, stats)}: ganar, sostener presencia arriba y no dejar que los perseguidores se ilusionen gratis.`;
  }

  if (leader && leaderSize === "CHICO") {
    return `${leader.team} lidera siendo chico en estructura, pero gigante en presente: cada fecha que pasa transforma la sorpresa en candidatura real.`;
  }

  if (leader && leaderSize === "MEDIO") {
    return `${leader.team} está construyendo una temporada grande desde una etiqueta media: regularidad, puntos y una tabla que empieza a mirarlo distinto.`;
  }

  if (leader && (leaderSize === "GIGANTE" || leaderSize === "GRANDE")) {
    return `${leader.team} lidera con peso propio: cuando ${getTeamSizePhrase(leader.team, stats)} toma la punta, el resto sabe que no alcanza con esperar que se caiga.`;
  }

  return `La fecha dejó otra capa de lectura: el tamaño histórico pesa, pero el presente manda cada vez que la pelota empieza a rodar.`;
}

function buildLocalClubProfile(club: ClubStats, history: SeasonRecord[]): AiClubProfile {
  const seed = hashText(`${club.team}-${club.titles}-${club.cupTitles}-${club.relegations}-${club.promotions}-${club.historicalPoints}-${history.length}`);
  const recentRows = history.slice(-6).map((season) => {
    const primeraIndex = season.primera.findIndex((row) => row.team === club.team);
    const bIndex = season.b.findIndex((row) => row.team === club.team);
    const primeraRow = season.primera[primeraIndex];
    const bRow = season.b[bIndex];

    if (primeraRow) {
      return {
        year: season.year,
        category: "Primera",
        position: primeraIndex + 1,
        pts: primeraRow.pts,
        note:
          season.champion.team === club.team
            ? "campeón"
            : season.relegated.some((row) => row.team === club.team)
              ? "descendido"
              : season.cupChampion === club.team
                ? "campeón de Copa"
                : primeraIndex <= 3
                  ? "podio"
                  : primeraIndex >= season.primera.length - 4
                    ? "sufrió abajo"
                    : "campaña media",
      };
    }

    if (bRow) {
      return {
        year: season.year,
        category: "B Nacional",
        position: bIndex + 1,
        pts: bRow.pts,
        note: season.promoted.some((row) => row.team === club.team) ? "ascendido" : bIndex <= 3 ? "peleó arriba" : "en reconstrucción",
      };
    }

    return null;
  }).filter(Boolean) as { year: number; category: string; position: number; pts: number; note: string }[];

  const last = recentRows[recentRows.length - 1];
  const bestRecent = [...recentRows].sort((a, b) => a.position - b.position)[0];
  const worstRecent = [...recentRows].sort((a, b) => b.position - a.position)[0];

  const archetype =
    club.titles >= 3
      ? "dominador"
      : club.titles > 0 && club.cupTitles > 0
        ? "mixto"
        : club.cupTitles >= 2
          ? "copero"
          : club.cupTitles > 0
            ? "mata mata"
            : club.relegations >= 2
              ? "sufrido"
              : club.promotions >= 2
                ? "ascensor"
                : club.historicalPoints >= 220
                  ? "regular"
                  : club.seasons <= 2
                    ? "nuevo"
                    : "irregular";

  const titleOptions: Record<string, string[]> = {
    dominador: [
      `${club.team}, dueño de la marquesina`,
      `${club.team}, la chapa pesa`,
      `${club.team}, candidato aunque no quiera`,
    ],
    mixto: [
      `${club.team}, completo y peligroso`,
      `${club.team}, festeja por todos lados`,
      `${club.team}, oficio de campeón`,
    ],
    copero: [
      `${club.team}, experto en noches bravas`,
      `${club.team}, copero de ley`,
      `${club.team}, donde hay eliminación se agranda`,
    ],
    "mata mata": [
      `${club.team}, peligro de copa`,
      `${club.team}, especialista en golpes`,
      `${club.team}, sonrisa de mata-mata`,
    ],
    sufrido: [
      `${club.team}, vivir con la calculadora`,
      `${club.team}, drama y resistencia`,
      `${club.team}, cicatrices de descenso`,
    ],
    ascensor: [
      `${club.team}, cae y vuelve`,
      `${club.team}, carácter de ascenso`,
      `${club.team}, especialista en levantarse`,
    ],
    regular: [
      `${club.team}, el incómodo de siempre`,
      `${club.team}, suma y molesta`,
      `${club.team}, regularidad sin coronita`,
    ],
    nuevo: [
      `${club.team}, recién entra en escena`,
      `${club.team}, primeros capítulos`,
      `${club.team}, buscando nombre propio`,
    ],
    irregular: [
      `${club.team}, una montaña rusa`,
      `${club.team}, promesa con ruido`,
      `${club.team}, entre ilusión y dudas`,
    ],
  };

  const openings: Record<string, string[]> = {
    dominador: [
      `${club.team} ya no juega solo contra rivales: juega contra su propia exigencia. Cada temporada arranca con la pregunta de siempre, si podrá sostener la chapa y bancarse que todos le quieran ganar.`,
      `${club.team} se ganó un lugar incómodo para los demás: el de candidato permanente. No siempre brilla, pero cuando la tabla aprieta suele aparecer con esa autoridad que se compra con vueltas olímpicas.`,
    ],
    mixto: [
      `${club.team} encontró una fórmula completa: puede competir en liga y también hacerse fuerte en las copas. No depende de un solo camino para hacer ruido, y eso lo vuelve más peligroso.`,
      `${club.team} se acostumbró a festejar en terrenos distintos. Liga, Copa, campañas largas o mano a mano: el equipo ya demostró que sabe adaptarse al clima del torneo.`,
    ],
    copero: [
      `${club.team} tiene esa cara de equipo que nadie quiere cruzarse en eliminación directa. En la liga puede regular, pero cuando aparece la Copa cambia el gesto y empieza a jugar con otra malicia.`,
      `${club.team} hizo de la Copa su territorio favorito. Tal vez no siempre domine la tabla larga, pero en partidos de vida o muerte se siente cómodo y suele arruinar planes ajenos.`,
    ],
    "mata mata": [
      `${club.team} todavía no construyó una dinastía, pero ya dejó una marca copera. En este save aprendió que no hace falta mandar todo el año para levantar una copa si sabés golpear en la noche justa.`,
      `${club.team} no siempre pide la tapa, pero cuando aparece un cruce directo se vuelve un rival incómodo. Tiene menos cartel que otros, aunque bastante más colmillo del que parece.`,
    ],
    sufrido: [
      `${club.team} vive con la tabla en una mano y la calculadora en la otra. Cada campaña parece traer una nueva prueba de carácter, y aun así el club sigue encontrando maneras de volver a respirar.`,
      `${club.team} ya conoce el barro del torneo. Los descensos le dejaron marcas, pero también una identidad: sufrir, levantarse, volver a competir y no regalar nada aunque la situación venga torcida.`,
    ],
    ascensor: [
      `${club.team} tiene espíritu de revancha. Puede caerse, pero rara vez se queda quieto: vuelve a pelear, vuelve a subir y transforma cada golpe en combustible para la temporada siguiente.`,
      `${club.team} es de esos clubes que convierten el ascenso en una forma de carácter. No siempre tiene estabilidad, pero sí una capacidad notable para reconstruirse cuando todo parece cuesta arriba.`,
    ],
    regular: [
      `${club.team} quizás no sea el más marketinero, pero sus números lo transformaron en un rival incómodo. Suma, compite y suele estar en esa zona donde nadie lo mira hasta que empieza a molestar de verdad.`,
      `${club.team} se volvió especialista en hacer campañas serias. Le falta una gran consagración para cambiar de categoría histórica, pero ya dejó claro que no es relleno del fixture.`,
    ],
    nuevo: [
      `${club.team} todavía está escribiendo sus primeras páginas importantes. No carga tanta historia como otros, pero justamente por eso cada campaña puede cambiarle la reputación de golpe.`,
      `${club.team} está en etapa de construcción. El save todavía no le dio una identidad definitiva, pero los próximos años pueden convertirlo en sorpresa, candidato o drama permanente.`,
    ],
    irregular: [
      `${club.team} es una montaña rusa: puede ilusionar, caerse, volver a levantarse y dejar a todos sin saber bien qué esperar. Esa irregularidad lo hace frustrante, pero también bastante entretenido.`,
      `${club.team} todavía busca una versión confiable de sí mismo. Tiene momentos buenos, campañas flojas y una sensación constante de que está a una temporada de cambiar su historia.`,
    ],
  };

  const statSentence = `En ${club.seasons} temporadas de Primera acumula ${club.historicalPoints} puntos, con ${club.titles} ligas, ${club.cupTitles} Copas Argentina, ${club.promotions} ascensos y ${club.relegations} descensos.`;

  const recentSentence = recentRows.length
    ? `Su tramo reciente cuenta bastante: ${recentRows
        .map((row) => `Año ${row.year}, ${row.position}° en ${row.category} (${row.note})`)
        .join("; ")}.`
    : "Todavía no tiene un recorrido reciente fuerte dentro del historial, así que cada temporada nueva pesa el doble.";

  const trend =
    bestRecent && worstRecent && bestRecent.year !== worstRecent.year
      ? bestRecent.position <= 3
        ? `Lo mejor apareció en el Año ${bestRecent.year}, cuando terminó ${bestRecent.position}° y se metió en conversación grande.`
        : worstRecent.position >= 15
          ? `El Año ${worstRecent.year} dejó una alarma: terminó ${worstRecent.position}° y tuvo que mirar más abajo que arriba.`
          : `Su curva todavía no es lineal: alterna buenos pasajes con campañas de supervivencia.`
      : `Su historia todavía pide más capítulos para saber si será candidato, copero o simple dolor de cabeza.`;

  const closing = pickOne(
    [
      `En la tribuna ya saben que con ${club.team} rara vez hay calma total: siempre hay una ilusión, un susto o una cuenta pendiente dando vueltas.`,
      `Por eso su perfil no se resume en una tabla: es una mezcla de memoria, golpes, orgullo y expectativas que cambian año a año.`,
      `Si logra transformar esos números en continuidad, puede dejar de ser una historia curiosa para convertirse en protagonista estable.`,
      `La próxima temporada dirá si esto era una base sólida o apenas otro capítulo de esa novela futbolera que nunca termina.`,
    ],
    seed + 99
  );

  const description = `${pickOne(openings[archetype], seed)}

${statSentence} ${recentSentence} ${trend}

${closing}`;

  const shortTag =
    archetype === "dominador"
      ? "Chapa pesada"
      : archetype === "copero" || archetype === "mata mata"
        ? "ADN copero"
        : archetype === "sufrido"
          ? "Calculadora y aguante"
          : archetype === "ascensor"
            ? "Revancha permanente"
            : archetype === "regular"
              ? "Rival incómodo"
              : "Identidad en obra";

  return {
    title: pickOne(titleOptions[archetype], seed),
    description,
    shortTag,
  };
}

function AiClubDescription({
  club,
  history,
  fallback,
  allClubStats,
  teamPower,
}: {
  club: ClubStats;
  history: SeasonRecord[];
  fallback: string;
  allClubStats?: ClubStatsCollection;
  teamPower?: Record<string, number>;
}) {
  const localProfile = useMemo(() => buildLocalClubProfile(club, history), [club, history]);
  const clubSize = getStrictClubSizeBadge(club.team, allClubStats);
  const [profile, setProfile] = useState<AiClubProfile>(localProfile);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    setProfile(localProfile);

    async function run() {
      try {
        setLoading(true);

        const recent = history.slice(-8).map((season) => ({
          year: season.year,
          primeraPosition: season.primera.findIndex((row) => row.team === club.team) + 1 || null,
          primeraPoints: season.primera.find((row) => row.team === club.team)?.pts ?? null,
          bPosition: season.b.findIndex((row) => row.team === club.team) + 1 || null,
          bPoints: season.b.find((row) => row.team === club.team)?.pts ?? null,
          champion: season.champion.team,
          cupChampion: season.cupChampion,
          relegated: season.relegated.map((row) => row.team),
          promoted: season.promoted.map((row) => row.team),
        }));

        const res = await fetch("/api/ai-club", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
          body: JSON.stringify({
            club,
            recent,
            fallback,
            localProfile,
            allTime: {
              seasonsPlayed: club.seasons,
              totalTitles: club.titles + club.cupTitles,
              leagueTitles: club.titles,
              cupTitles: club.cupTitles,
              promotions: club.promotions,
              relegations: club.relegations,
              historicalPoints: club.historicalPoints,
              yearsInSave: history.length,
            },
            instruction:
              "Devolvé JSON. La descripción debe tener 100 a 150 palabras, mínimo 3 renglones visuales, tono argentino y datos concretos.",
          }),
        });

        if (!res.ok) throw new Error("AI club failed");

        const data = (await res.json()) as AiClubProfile;

        if (!cancelled && data?.description && data.description.length > 120) {
          setProfile(data);
        }
      } catch {
        if (!cancelled) setProfile(localProfile);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();

    return () => {
      cancelled = true;
    };
  }, [club.team, history.length, club.titles, club.cupTitles, club.relegations, club.promotions, club.historicalPoints, localProfile, fallback]);

  return (
    <div className="rounded-3xl border border-white/10 bg-black/35 p-6 md:p-7 overflow-hidden relative min-h-[330px]">
      <div className="absolute inset-0 opacity-15 bg-[radial-gradient(circle_at_top_right,#60a5fa,transparent_42%)]" />

      <div className="relative space-y-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="rounded-2xl bg-white/90 p-2">
              <TeamLogo team={club.team} size="xl" />
            </div>

            <div>
              <p className="text-xs uppercase tracking-[0.32em] text-blue-300 font-black">Crónica del club</p>
              <div className="flex flex-wrap items-center gap-3 mt-1">
                <h3 className="text-3xl md:text-4xl font-black text-white">{profile.title}</h3>
                <span className={`rounded-full border px-3 py-1 text-xs font-black tracking-[0.16em] ${getClubSizeBadgeClass(clubSize)}`}>
                  {clubSize}
                </span>
                <span className="rounded-full border border-cyan-400/30 bg-cyan-500/15 px-3 py-1 text-xs font-black tracking-[0.16em] text-cyan-200">
                  FUERZA {getTeamPower(club.team, teamPower)}
                </span>
              </div>
              <p className="text-white/55 text-sm mt-1">Perfil narrativo generado con estadísticas del save</p>
            </div>
          </div>

          <span className="rounded-full bg-blue-500/15 border border-blue-400/25 px-3 py-1 text-xs font-black text-blue-200">
            {loading ? "IA actualizando..." : "Perfil vivo"}
          </span>
        </div>

        <p className="text-white/82 leading-8 text-base md:text-lg max-w-5xl whitespace-pre-line">
          {profile.description}
        </p>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          <div className="rounded-xl bg-white/[0.06] border border-white/10 p-3">
            <p className="text-[10px] uppercase text-white/45 font-black">Ligas</p>
            <p className="text-xl font-black text-white">{club.titles}</p>
          </div>

          <div className="rounded-xl bg-white/[0.06] border border-white/10 p-3">
            <p className="text-[10px] uppercase text-white/45 font-black">Copas</p>
            <p className="text-xl font-black text-white">{club.cupTitles}</p>
          </div>

          <div className="rounded-xl bg-white/[0.06] border border-white/10 p-3">
            <p className="text-[10px] uppercase text-white/45 font-black">Temporadas</p>
            <p className="text-xl font-black text-white">{club.seasons}</p>
          </div>

          <div className="rounded-xl bg-white/[0.06] border border-white/10 p-3">
            <p className="text-[10px] uppercase text-white/45 font-black">Ascensos</p>
            <p className="text-xl font-black text-white">{club.promotions}</p>
          </div>

          <div className="rounded-xl bg-white/[0.06] border border-white/10 p-3">
            <p className="text-[10px] uppercase text-white/45 font-black">Descensos</p>
            <p className="text-xl font-black text-white">{club.relegations}</p>
          </div>
        </div>

        <p className="text-xs uppercase tracking-[0.22em] text-blue-300 font-black">{profile.shortTag}</p>
      </div>
    </div>
  );
}


function buildSeasonLocalText(
  summary: SeasonRecord,
  facts: {
    bestAttack?: Row;
    bestDefense?: Row;
    surprise?: Row;
    bChampion?: Row;
    bThird?: Row;
  },
  history: SeasonRecord[]
): AiSeasonText {
  const seed = hashText(`${summary.year}-${summary.champion.team}-${summary.champion.pts}-${summary.cupChampion}-${facts.bestAttack?.team}-${facts.bestDefense?.team}`);
  const top2 = summary.top3[1];
  const top3 = summary.top3[2];
  const previousChampion = history.slice(0, -1).at(-1)?.champion.team;
  const repeatChampion = previousChampion === summary.champion.team;
  const tight = top2 ? summary.champion.pts - top2.pts <= 3 : false;
  const goleador = facts.bestAttack;
  const defensa = facts.bestDefense;
  const revelation = facts.surprise;

  const headlinePool = [
    repeatChampion ? `${summary.champion.team} no se baja del trono` : `${summary.champion.team} gritó y cambió el mapa`,
    tight ? `Campeón con el corazón en la boca` : `${summary.champion.team}, campeón con autoridad`,
    `${summary.champion.team} puso la firma del Año ${summary.year}`,
    `La vuelta fue de ${summary.champion.team}`,
    `${summary.champion.team} ganó la pulseada grande`,
    `El año de ${summary.champion.team}: golpe, tabla y festejo`,
  ];

  const mainOpeners = [
    `No fue una temporada cualquiera: ${summary.champion.team} terminó arriba con ${summary.champion.pts} puntos y convirtió la regularidad en una vuelta olímpica.`,
    `${summary.champion.team} se quedó con la Liga Profesional después de una campaña que mezcló oficio, nervio y resultados de esos que al final explican un campeonato.`,
    `El Año ${summary.year} dejó campeón a ${summary.champion.team}, un equipo que encontró respuestas cuando el torneo empezó a pedir algo más que nombres.`,
    `La Liga Profesional tuvo dueño: ${summary.champion.team}. No ganó por casualidad ni por decorado; ganó porque sostuvo la presión mejor que el resto.`,
    `En una liga donde cada tropiezo se paga caro, ${summary.champion.team} encontró el camino más difícil y el más valioso: sumar cuando todos miraban.`,
  ];

  const mainMiddles = [
    top2 && top3
      ? `Atrás quedaron ${top2.team} y ${top3.team}, que empujaron hasta donde pudieron pero se quedaron sin la foto principal.`
      : `El resto corrió desde atrás y nunca terminó de quitarle la tapa.`,
    tight && top2
      ? `${top2.team} lo tuvo cerca, tan cerca que cada punto perdido vuelve como fantasma en la sobremesa.`
      : `La diferencia no siempre fue escandalosa, pero sí suficiente para marcar quién mandó en los momentos calientes.`,
    goleador
      ? `${goleador.team} fue el equipo más picante arriba, con ${goleador.gf} goles, aunque no necesariamente eso alcanzó para quedarse con todo.`
      : `El ataque pesó, pero la cabeza pesó más.`,
    defensa
      ? `${defensa.team} defendió mejor que nadie, apenas ${defensa.gc} goles recibidos, una estadística que también cuenta historias.`
      : `La defensa, como casi siempre, terminó siendo parte del guion.`,
  ];

  const editorialPool = [
    `El cierre deja una liga con memoria: los campeones ya no son solo nombres, son antecedentes. Algunos clubes empiezan a cargar chapa, otros viven a los tumbos y varios descubrieron que la calculadora no aparece en diciembre, aparece mucho antes.`,
    `La temporada confirma algo que este save repite con malicia: nadie gana para siempre y nadie sufre sin dejar marcas. El próximo año tendrá candidatos con presión, ascendidos con hambre y equipos que ya miran el promedio como si fuera una película de terror.`,
    `Más que una tabla final, el Año ${summary.year} dejó reputaciones. ${summary.champion.team} suma gloria, los de abajo suman cicatrices y la B vuelve a meter protagonistas en una liga que nunca se queda quieta.`,
    `Hay torneos que se recuerdan por el campeón y otros por todo lo que se rompió alrededor. Este tuvo un poco de las dos cosas: festejo arriba, drama abajo y la sensación de que el próximo año puede patear el tablero.`,
  ];

  const cupPool = [
    `La Copa Argentina quedó para ${summary.cupChampion ?? "un campeón sin registro"}, en un torneo que volvió a recordar que los mano a mano no respetan presupuestos ni camisetas. Ahí se juega con pulso, no con promedio.`,
    `${summary.cupChampion ?? "La Copa"} se llevó el trofeo más traicionero del calendario. En la Copa no alcanza con jugar bien seguido: hay que sobrevivir noches incómodas, penales imaginarios y partidos que se cierran con el alma.`,
    `El cuadro copero tuvo dueño: ${summary.cupChampion ?? "sin registro"}. Otra prueba de que en este universo un club puede no dominar la liga y aun así escribir una página enorme.`,
  ];

  const bPool = [
    `${facts.bChampion?.team ?? "El campeón de la B"} dominó la Primera B Nacional y se ganó el boleto grande. La categoría volvió a ser ese filtro áspero donde asciende el que aguanta viajes, presión y partidos con poco glamour.`,
    `La B dejó su propio relato: ${facts.bChampion?.team ?? "el líder"} arriba, varios persiguiendo y una certeza de siempre: subir nunca es lindo, pero es hermoso cuando se consigue.`,
    `${facts.bChampion?.team ?? "El campeón"} salió de la B con la ropa embarrada y la ilusión intacta. El ascenso no premia estética; premia resistencia.`,
  ];

  const relegationPool = [
    `Abajo no hubo poesía: ${summary.relegatedByTable?.team ?? summary.relegated[0]?.team} cayó por tabla y ${summary.relegatedByAverage?.team ?? summary.relegated[1]?.team} por promedios. Dos caminos distintos para el mismo golpe.`,
    `La zona baja volvió a ser un expediente pesado. Uno cayó por presente, otro por memoria acumulada: así trabaja el promedio, lento y cruel.`,
    `El descenso dejó nombres propios y silencios largos. ${summary.relegatedByTable?.team ?? summary.relegated[0]?.team} y ${summary.relegatedByAverage?.team ?? summary.relegated[1]?.team} pagaron una temporada que no perdonó.`,
  ];

  const promotionPool = [
    `La promoción fue un torneo aparte: ${summary.promotionTeamA?.team ?? "un equipo de Primera"} contra ${summary.promotionTeamB?.team ?? facts.bThird?.team ?? "un aspirante de la B"}. Ganó ${summary.promotionWinner ?? "sin registro"}, y con eso cambió el ánimo de dos planteles enteros.`,
    `En la promoción no se juega, se sobrevive. ${summary.promotionWinner ?? "El ganador"} salió con aire; el otro quedó con esa sensación de haber perdido mucho más que una serie.`,
    `La serie promocional tuvo clima de final barrial: pierna dura, miedo y alivio. ${summary.promotionWinner ?? "El ganador"} terminó festejando en una definición que pesa más que tres puntos.`,
  ];

  return {
    headline: pickOne(headlinePool, seed),
    mainArticle: `${pickOne(mainOpeners, seed + 1)} ${pickOne(mainMiddles, seed + 2)} ${pickOne(mainMiddles, seed + 3)} ${
      revelation ? `${revelation.team} apareció como revelación y le agregó un condimento inesperado al campeonato.` : "También hubo sorpresas, porque ningún torneo serio vive solo de favoritos."
    }`,
    cupArticle: pickOne(cupPool, seed + 4),
    bArticle: pickOne(bPool, seed + 5),
    relegationArticle: pickOne(relegationPool, seed + 6),
    promotionArticle: pickOne(promotionPool, seed + 7),
    editorial: pickOne(editorialPool, seed + 8),
    shortNews: [
      `${summary.champion.team} campeón con ${summary.champion.pts} puntos.`,
      facts.bestAttack ? `${facts.bestAttack.team} fue el equipo más goleador con ${facts.bestAttack.gf}.` : `La tabla dejó más de una lectura.`,
      summary.cupChampion ? `${summary.cupChampion} levantó la Copa Argentina.` : `La Copa también escribió su capítulo.`,
    ],
  };
}

function NewspaperModal({
  summary,
  history,
  onClose,
}: {
  summary: SeasonRecord;
  history: SeasonRecord[];
  onClose: () => void;
}) {
  const bestAttack = [...summary.primera].sort((a, b) => b.gf - a.gf || b.pts - a.pts)[0];
  const bestDefense = [...summary.primera].sort((a, b) => a.gc - b.gc || b.pts - a.pts)[0];
  const surprise = [...summary.primera].sort((a, b) => b.pts - a.pts || b.dg - a.dg)[3];
  const worst = summary.primera[summary.primera.length - 1];
  const bChampion = summary.b[0];
  const bThird = summary.promotionTeamB ?? summary.b[2];

  const localText = useMemo(
    () => buildSeasonLocalText(summary, { bestAttack, bestDefense, surprise, bChampion, bThird }, history),
    [summary.year]
  );

  const [aiText, setAiText] = useState<AiSeasonText | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        setAiLoading(true);

        const res = await fetch("/api/ai-season", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
          body: JSON.stringify({
            summary,
            historyContext: history.slice(-8).map((season) => ({
              year: season.year,
              champion: season.champion.team,
              championPoints: season.champion.pts,
              cupChampion: season.cupChampion,
              promoted: season.promoted.map((row) => row.team),
              relegated: season.relegated.map((row) => row.team),
              top3: season.top3.map((row) => ({ team: row.team, pts: row.pts })),
            })),
            facts: { bestAttack, bestDefense, surprise, bChampion, bThird },
            style: "Diario deportivo argentino, variado, con secciones distintas, datos de color y análisis.",
          }),
        });

        if (!res.ok) throw new Error("AI season failed");

        const data = (await res.json()) as AiSeasonText;
        if (!cancelled && data?.headline && data.mainArticle?.length > 80) setAiText(data);
      } catch {
        if (!cancelled) setAiText(null);
      } finally {
        if (!cancelled) setAiLoading(false);
      }
    }

    run();

    return () => {
      cancelled = true;
    };
  }, [summary.year]);

  const text = aiText ?? localText;
  const variant = summary.year % 5;
  const accent = "#b7f000";
  const editionTitle =
    variant === 0
      ? "La vuelta de la temporada"
      : variant === 1
        ? "Especial campeón"
        : variant === 2
          ? "Archivo del año"
          : variant === 3
            ? "Final caliente"
            : "Mapa del campeonato";

  const bigQuote =
    variant === 0
      ? "No ganó el que más prometió: ganó el que mejor llegó al momento incómodo."
      : variant === 1
        ? "El campeonato se gana en la tabla, pero se explica en los detalles."
        : variant === 2
          ? "Cada año deja una marca: gloria para unos, calculadora para otros."
          : variant === 3
            ? "La liga no perdona distracciones; las archiva."
            : "El próximo torneo ya empezó en la cabeza de todos.";

  return (
    <div className="fixed inset-0 bg-black/80 z-40 flex items-start justify-center p-3 md:p-5 backdrop-blur-sm overflow-y-auto">
      <div className="my-4 w-full max-w-[1540px] rounded-[28px] bg-[#f8f1df] text-black border-4 border-black shadow-2xl overflow-hidden">
        <div className="bg-black text-white px-5 md:px-8 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="rounded-full px-3 py-1 text-xs font-black uppercase text-black" style={{ background: accent }}>
              Edición especial
            </span>
            <p className="text-xs uppercase tracking-[0.28em] font-black">Año {summary.year} · Diario Liga Manager</p>
          </div>

          <button onClick={onClose} className="h-9 w-9 rounded-full font-black text-black" style={{ background: accent }}>
            ×
          </button>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[1.05fr_.95fr]">
          <section className={`border-r-4 border-black p-5 md:p-7 min-h-[780px] ${variant % 2 === 0 ? "bg-[#f8f1df]" : "bg-[#fffaf0]"}`}>
            <div className="border-b-4 border-black pb-4">
              <div className="flex items-end gap-4 flex-wrap">
                <div className="text-7xl md:text-8xl font-black italic leading-none tracking-tighter">Olé</div>
                <div className="pb-2">
                  <p className="text-xs uppercase tracking-[0.35em] font-black">Diario de Liga Manager</p>
                  <h1 className="text-3xl md:text-5xl font-black uppercase leading-none">{editionTitle}</h1>
                  <p className="text-sm font-black mt-2">Resumen completo del cierre · Diario abierto</p>
                </div>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-[auto_1fr] gap-4 items-center">
              <div className="rounded-3xl bg-white border-4 border-black p-3">
                <TeamLogo team={summary.champion.team} size="xl" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.25em] font-black" style={{ color: accent }}>{editionTitle}</p>
                <h2 className="text-5xl md:text-7xl font-black uppercase leading-[0.9] tracking-tight">{text.headline}</h2>
              </div>
            </div>

            <p className="mt-5 text-base md:text-lg leading-relaxed font-medium border-b-4 border-black pb-5">
              {text.mainArticle}
            </p>

            {aiLoading && <p className="mt-3 text-xs font-black uppercase" style={{ color: accent }}>La redacción IA prepara otra bajada...</p>}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-5">
              {summary.top3.map((row, index) => (
                <article key={row.team} className="border-2 border-black bg-white p-4">
                  <p className="text-xs uppercase font-black inline-block px-2 py-1 text-black" style={{ background: accent }}>
                    Puesto {index + 1}
                  </p>
                  <div className="mt-3 flex items-center gap-2">
                    <TeamLogo team={row.team} size="md" />
                    <h3 className="font-black text-xl leading-tight">{row.team}</h3>
                  </div>
                  <p className="text-sm mt-2 font-bold">{row.pts} pts · DG {row.dg}</p>
                </article>
              ))}
            </div>

            <div className="mt-5 bg-black text-white p-5">
              <p className="text-xs uppercase tracking-[0.25em] font-black" style={{ color: accent }}>Frase del año</p>
              <h3 className="text-2xl md:text-4xl font-black uppercase mt-2 leading-tight">“{bigQuote}”</h3>
            </div>

            <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
              <article className="border-2 border-black bg-white p-4">
                <p className="text-xs uppercase tracking-[0.2em] font-black" style={{ color: accent }}>Radiografía</p>
                <h3 className="text-2xl font-black uppercase mt-1">{summary.champion.team} en números</h3>
                <p className="mt-2 text-sm leading-relaxed">
                  {summary.champion.pg} triunfos, {summary.champion.pe} empates, {summary.champion.pp} derrotas, {summary.champion.gf} goles a favor y {summary.champion.gc} en contra.
                </p>
              </article>

              <article className="border-2 border-black bg-white p-4">
                <p className="text-xs uppercase tracking-[0.2em] font-black" style={{ color: accent }}>El perseguidor</p>
                <h3 className="text-2xl font-black uppercase mt-1">{summary.top3[1]?.team ?? "-"}</h3>
                <p className="mt-2 text-sm leading-relaxed">
                  Quedó a {summary.top3[1] ? summary.champion.pts - summary.top3[1].pts : 0} puntos. Cerca o lejos depende de cómo se cuenten los domingos perdidos.
                </p>
              </article>
            </div>
          </section>

          <section className={`p-5 md:p-7 min-h-[780px] ${variant % 2 === 0 ? "bg-[#fffaf0]" : "bg-[#f8f1df]"}`}>
            <div className="flex items-center gap-3 border-b-4 border-black pb-3 mb-5">
              <span className="bg-black text-white px-3 py-2 text-xs uppercase tracking-[0.25em] font-black">Página 2</span>
              <h2 className="text-4xl md:text-5xl font-black uppercase leading-none">
                {variant === 0 ? "El mapa del año" : variant === 1 ? "Los nombres propios" : variant === 2 ? "Gloria, barro y copa" : variant === 3 ? "Lo que dejó la liga" : "El archivo caliente"}
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <article className="border-2 border-black bg-white p-4">
                <p className="text-xs uppercase tracking-[0.2em] font-black" style={{ color: accent }}>Copa Argentina</p>
                <h3 className="text-2xl font-black uppercase mt-1">{summary.cupChampion ?? "Sin campeón"}</h3>
                <p className="mt-2 text-sm leading-relaxed">{text.cupArticle}</p>
              </article>

              <article className="border-2 border-black bg-white p-4">
                <p className="text-xs uppercase tracking-[0.2em] font-black" style={{ color: accent }}>Primera B Nacional</p>
                <h3 className="text-2xl font-black uppercase mt-1">{bChampion?.team ?? "-"}</h3>
                <p className="mt-2 text-sm leading-relaxed">{text.bArticle}</p>
              </article>

              <article className="border-2 border-black bg-white p-4">
                <p className="text-xs uppercase tracking-[0.2em] font-black" style={{ color: accent }}>Descenso</p>
                <h3 className="text-2xl font-black uppercase mt-1">{worst?.team ?? "Drama"}</h3>
                <p className="mt-2 text-sm leading-relaxed">{text.relegationArticle}</p>
              </article>

              <article className="border-2 border-black bg-white p-4">
                <p className="text-xs uppercase tracking-[0.2em] font-black" style={{ color: accent }}>Promoción</p>
                <h3 className="text-2xl font-black uppercase mt-1">{summary.promotionWinner ?? "Final abierta"}</h3>
                <p className="mt-2 text-sm leading-relaxed">{text.promotionArticle}</p>
              </article>

              <article className="border-2 border-black bg-[#111] text-white p-4">
                <p className="text-xs uppercase tracking-[0.2em] font-black" style={{ color: accent }}>Dato de color</p>
                <h3 className="text-2xl font-black uppercase mt-1">{bestAttack?.team ?? "-"} y {bestDefense?.team ?? "-"}</h3>
                <p className="mt-2 text-sm leading-relaxed">
                  Uno fue el ataque más bravo con {bestAttack?.gf ?? 0} goles; el otro cerró mejor la persiana con {bestDefense?.gc ?? 0} recibidos.
                </p>
              </article>

              <article className="border-2 border-black p-4" style={{ background: accent }}>
                <p className="text-xs uppercase tracking-[0.2em] font-black">Editorial</p>
                <h3 className="text-2xl font-black uppercase mt-1">La liga ya tiene memoria</h3>
                <p className="mt-2 text-sm leading-relaxed font-bold">{text.editorial}</p>
              </article>
            </div>

            <button onClick={onClose} className="mt-6 w-full rounded-2xl bg-black px-5 py-4 font-black text-lg text-white">
              Continuar al próximo año
            </button>
          </section>
        </div>
      </div>
    </div>
  );
}function RoundReportModal({
  report,
  onClose,
}: {
  report: RoundReport;
  onClose: () => void;
}) {
  const featured = report.featured;
  const themeIndex = report.round % 3;
  const theme =
    themeIndex === 0
      ? {
          name: "LA NACIÓN",
          accent: "#1d4ed8",
          soft: "#eff6ff",
          paper: "#f8fafc",
          dark: "#0f172a",
          label: "Análisis deportivo",
          title: "La fecha bajo la lupa",
        }
      : themeIndex === 1
        ? {
            name: "CLARÍN",
            accent: "#dc2626",
            soft: "#fff1f2",
            paper: "#fff7ed",
            dark: "#111827",
            label: "Suplemento deportivo",
            title: "La fecha caliente",
          }
        : {
            name: "INFOBAE",
            accent: "#f97316",
            soft: "#fff7ed",
            paper: "#fffbeb",
            dark: "#1f2937",
            label: "Especial de la jornada",
            title: "Lo que dejó la fecha",
          };

  const variant = report.round % 6;
  const results = report.results ?? [];
  const topResults = results.slice(0, 8);
  const firstLine = report.lines[0] ?? "La fecha dejó mucha tela para cortar.";
  const secondLine = report.lines[1] ?? "Hubo resultados que pueden pesar en la tabla.";
  const thirdLine = report.lines[2] ?? "La jornada dejó señales para los candidatos.";
  const fourthLine = report.lines[3] ?? "La próxima fecha dirá si fue tendencia o accidente.";
  const fifthLine = report.lines[4] ?? "El dato de color quedó en los detalles.";
  const sixthLine = report.lines[5] ?? "Nadie se fue del todo tranquilo.";

  const notePool = [
    {
      tag: "La clave",
      title: featured?.winner ? `${featured.winner} eligió el momento` : "Detalles mínimos",
      body: thirdLine,
    },
    {
      tag: "Dato de color",
      title: "La letra chica",
      body: fifthLine,
    },
    {
      tag: "Termómetro",
      title: featured?.winner ? `${featured.winner} sube presión` : "Fecha abierta",
      body: sixthLine,
    },
    {
      tag: "Vestuario",
      title: "Semana larga",
      body: fourthLine,
    },
    {
      tag: "Estadística",
      title: report.statLine?.split("·")[0] ?? "Números calientes",
      body: report.statLine ?? "La fecha dejó números para mirar dos veces.",
    },
    {
      tag: "Mirada de tabla",
      title: "Nadie duerme",
      body: report.lines[6] ?? "Arriba se mide cada punto; abajo, cada error empieza a pesar como una final.",
    },
    {
      tag: "Contratapa",
      title: featured?.winner ? `${featured.winner} se lleva los flashes` : "Expediente abierto",
      body: results[6]
        ? `También hubo ruido en ${results.slice(6, 8).map((match) => `${match.home} ${match.hg}-${match.ag} ${match.away}`).join(" y ")}.`
        : "La próxima jornada dirá si esto fue tendencia o apenas un sacudón pasajero.",
    },
    {
      tag: "El detalle",
      title: "Partidos cerrados",
      body: "Los partidos de margen fino son los que más vuelven cuando el torneo entra en zona de definición.",
    },
  ];

  const rotatedNotes = [
    ...notePool.slice(variant),
    ...notePool.slice(0, variant),
  ];

  const featuredTitle =
    variant === 0
      ? "El partido que explica la fecha"
      : variant === 1
        ? "La lupa del resultado"
        : variant === 2
          ? "El golpe de la jornada"
          : variant === 3
            ? "La postal principal"
            : variant === 4
              ? "La noche que movió la tabla"
              : "El resultado que queda";

  return (
    <div className="fixed inset-0 bg-black/80 z-40 flex items-start justify-center p-3 md:p-5 backdrop-blur-sm overflow-y-auto">
      <div className="my-4 w-full max-w-[1540px] rounded-[24px] text-black border border-black/40 shadow-2xl overflow-hidden ring-1 ring-white/20" style={{ background: `linear-gradient(135deg, ${theme.paper}, ${theme.soft})` }}>
        <div className="px-5 md:px-7 py-4 flex items-center justify-between border-b-4" style={{ borderColor: theme.accent }}>
          <div className="flex items-end gap-4 flex-wrap">
            <h1 className="text-5xl md:text-7xl font-black tracking-[-0.08em]" style={{ color: theme.accent }}>
              {theme.name}
            </h1>

            <div className="pb-2">
              <p className="text-xs uppercase tracking-[0.32em] font-black" style={{ color: theme.accent }}>{theme.label}</p>
              <p className="text-sm font-black">
                {report.league === "primera" ? "Liga Profesional" : "Primera B Nacional"} · Año {report.year} · Fecha {report.round}
              </p>
            </div>
          </div>

          <button onClick={onClose} className="h-10 w-10 rounded-full text-white font-black" style={{ background: theme.dark }}>
            ×
          </button>
        </div>

        {variant === 0 || variant === 3 ? (
          <div className="grid grid-cols-1 xl:grid-cols-[1.12fr_.88fr]">
            <section className="border-r-4 border-black p-5 md:p-7 min-h-[760px]">
              <p className="text-xs uppercase tracking-[0.28em] font-black" style={{ color: theme.accent }}>{theme.title}</p>
              <h2 className="text-4xl md:text-6xl font-black leading-[0.95] tracking-tight mt-2">
                {report.headline ?? report.title}
              </h2>
              <p className="mt-3 text-base md:text-lg font-semibold leading-relaxed border-b-2 border-black pb-4">{report.subtitle}</p>

              {featured && (
                <div className="my-5 border-2 border-black bg-white p-4 shadow-[6px_6px_0_rgba(0,0,0,.10)]">
                  <p className="text-xs uppercase tracking-[0.22em] font-black mb-3" style={{ color: theme.accent }}>{featuredTitle}</p>

                  <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                    <div className="flex items-center justify-end gap-2 text-right">
                      <h3 className="text-xl md:text-3xl font-black leading-none">{featured.home}</h3>
                      <TeamLogo team={featured.home} size="lg" />
                    </div>

                    <div className="px-3 py-2 text-4xl md:text-6xl font-black text-white" style={{ background: theme.dark }}>
                      {featured.hg}-{featured.ag}
                    </div>

                    <div className="flex items-center gap-2">
                      <TeamLogo team={featured.away} size="lg" />
                      <h3 className="text-xl md:text-3xl font-black leading-none">{featured.away}</h3>
                    </div>
                  </div>
                </div>
              )}

              <article className="columns-1 md:columns-2 gap-7">
                <p className="text-xl md:text-2xl font-black leading-tight mb-3">{firstLine}</p>
                <p className="text-sm md:text-base leading-relaxed mb-3">{secondLine}</p>
                <p className="text-sm md:text-base leading-relaxed mb-3">{thirdLine}</p>
                <p className="text-sm md:text-base leading-relaxed">{fourthLine}</p>
              </article>

              <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-3">
                {rotatedNotes.slice(0, 3).map((note, index) => (
                  <div
                    key={`${note.tag}-${index}`}
                    className={`${index === 2 ? "text-white" : "bg-white"} border-2 border-black p-3`}
                    style={index === 2 ? { background: theme.dark } : {}}
                  >
                    <p className="text-[10px] uppercase tracking-[0.2em] font-black" style={{ color: theme.accent }}>{note.tag}</p>
                    <h3 className="text-lg font-black mt-1">{note.title}</h3>
                    <p className="mt-2 text-xs font-semibold leading-relaxed">{note.body}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="p-5 md:p-7 min-h-[760px]" style={{ background: theme.soft }}>
              <article className="border-2 border-black bg-white p-4 shadow-[6px_6px_0_rgba(0,0,0,.10)]">
                <p className="text-xs uppercase tracking-[0.24em] font-black" style={{ color: theme.accent }}>Resultados destacados</p>

                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2">
                  {topResults.slice(0, 6).map((match, index) => (
                    <div key={`${match.home}-${match.away}-${index}`} className="border border-black/25 px-3 py-2 grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-xs" style={{ background: theme.paper }}>
                      <div className="flex items-center gap-2 justify-end text-right">
                        <span className="font-black truncate">{match.home}</span>
                        <TeamLogo team={match.home} size="xs" />
                      </div>
                      <span className="font-black text-base">{match.hg}-{match.ag}</span>
                      <div className="flex items-center gap-2">
                        <TeamLogo team={match.away} size="xs" />
                        <span className="font-black truncate">{match.away}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </article>

              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                {rotatedNotes.slice(3, 7).map((note, index) => (
                  <article
                    key={`${note.tag}-side-${index}`}
                    className={`${index === 1 ? "text-white" : "bg-white"} border-2 border-black p-4 shadow-[4px_4px_0_rgba(0,0,0,.10)]`}
                    style={index === 1 ? { background: theme.dark } : index === 3 ? { background: theme.accent } : {}}
                  >
                    <p className="text-xs uppercase tracking-[0.2em] font-black" style={{ color: index === 1 ? theme.accent : index === 3 ? "#000" : theme.accent }}>{note.tag}</p>
                    <h3 className="text-2xl font-black mt-1">{note.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed font-semibold">{note.body}</p>
                  </article>
                ))}
              </div>

              <button onClick={onClose} className="mt-5 w-full rounded-xl px-5 py-3 text-white font-black" style={{ background: theme.dark }}>
                Volver al juego
              </button>
            </section>
          </div>
        ) : variant === 1 || variant === 4 ? (
          <div className="grid grid-cols-1 xl:grid-cols-[.92fr_1.08fr]">
            <section className="border-r-4 border-black p-5 md:p-7 min-h-[760px]" style={{ background: theme.soft }}>
              <p className="text-xs uppercase tracking-[0.28em] font-black" style={{ color: theme.accent }}>Marcador central</p>

              {featured && (
                <div className="mt-4 bg-white border-4 border-black p-5 text-center shadow-[8px_8px_0_rgba(0,0,0,.12)]">
                  <div className="flex items-center justify-center gap-5">
                    <TeamLogo team={featured.home} size="xl" />
                    <div className="text-6xl md:text-8xl font-black tracking-tight" style={{ color: theme.accent }}>{featured.hg}-{featured.ag}</div>
                    <TeamLogo team={featured.away} size="xl" />
                  </div>

                  <h2 className="mt-3 text-3xl md:text-5xl font-black leading-none">{featured.home} vs {featured.away}</h2>
                </div>
              )}

              <h3 className="mt-5 text-4xl md:text-6xl font-black leading-[0.92]">{report.headline}</h3>
              <p className="mt-3 text-base md:text-lg font-bold">{report.subtitle}</p>

              <div className="mt-5 grid grid-cols-1 gap-3">
                {rotatedNotes.slice(0, 4).map((note, index) => (
                  <article key={`${note.tag}-left-${index}`} className={`${index === 0 ? "text-white" : "bg-white"} border-2 border-black p-4 shadow-[4px_4px_0_rgba(0,0,0,.10)]`} style={index === 0 ? { background: theme.dark } : {}}>
                    <p className="text-xs uppercase tracking-[0.2em] font-black" style={{ color: theme.accent }}>{note.tag}</p>
                    <h4 className="text-xl font-black mt-1">{note.title}</h4>
                    <p className="text-sm mt-2 leading-relaxed">{note.body}</p>
                  </article>
                ))}
              </div>
            </section>

            <section className="p-5 md:p-7 min-h-[760px]">
              <h2 className="text-4xl md:text-6xl font-black leading-none border-b-4 border-black pb-4">{theme.title}</h2>

              <div className="mt-5 grid grid-cols-1 md:grid-cols-[1fr_.78fr] gap-5">
                <article>
                  <p className="text-2xl font-black leading-tight">{firstLine}</p>
                  <p className="mt-3 text-base leading-relaxed">{secondLine}</p>
                  <p className="mt-3 text-base leading-relaxed">{thirdLine}</p>
                  <p className="mt-3 text-base leading-relaxed">{fourthLine}</p>
                </article>

                <article className="border-2 border-black p-4 shadow-[4px_4px_0_rgba(0,0,0,.10)] bg-white">
                  <p className="text-xs uppercase tracking-[0.22em] font-black" style={{ color: theme.accent }}>La síntesis</p>
                  <h3 className="text-3xl font-black mt-1">{report.statLine?.split("·")[0] ?? "Fecha caliente"}</h3>
                  <p className="mt-3 text-sm font-semibold leading-relaxed">{report.statLine}</p>
                </article>
              </div>

              <article className="mt-5 border-2 border-black bg-white p-4 shadow-[6px_6px_0_rgba(0,0,0,.10)]">
                <p className="text-xs uppercase tracking-[0.24em] font-black" style={{ color: theme.accent }}>Todos los resultados importantes</p>

                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2">
                  {topResults.map((match, index) => (
                    <div key={`${match.home}-${match.away}-b-${index}`} className="border border-black/25 px-3 py-2 grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-xs" style={{ background: theme.paper }}>
                      <div className="flex items-center gap-2 justify-end text-right">
                        <span className="font-black truncate">{match.home}</span>
                        <TeamLogo team={match.home} size="xs" />
                      </div>
                      <span className="font-black text-base">{match.hg}-{match.ag}</span>
                      <div className="flex items-center gap-2">
                        <TeamLogo team={match.away} size="xs" />
                        <span className="font-black truncate">{match.away}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </article>

              <button onClick={onClose} className="mt-5 w-full rounded-xl px-5 py-3 text-white font-black" style={{ background: theme.dark }}>
                Volver al juego
              </button>
            </section>
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-[1fr_1fr]">
            <section className="border-r-4 border-black p-5 md:p-7 min-h-[760px]">
              <p className="text-xs uppercase tracking-[0.28em] font-black" style={{ color: theme.accent }}>Crónica principal</p>
              <h2 className="mt-2 text-5xl md:text-7xl font-black leading-[0.88]">{report.headline}</h2>
              <p className="mt-4 text-lg font-bold">{report.subtitle}</p>

              <div className="mt-5 border-y-4 border-black py-4">
                <p className="text-xl font-black">{firstLine}</p>
                <p className="mt-3 text-sm leading-relaxed">{secondLine}</p>
              </div>

              <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                {rotatedNotes.slice(0, 4).map((note, index) => (
                  <article key={`${note.tag}-grid-${index}`} className={`${index === 2 ? "text-white" : "bg-white"} border-2 border-black p-4 shadow-[4px_4px_0_rgba(0,0,0,.10)]`} style={index === 2 ? { background: theme.dark } : index === 3 ? { background: theme.accent } : {}}>
                    <p className="text-xs uppercase tracking-[0.2em] font-black" style={{ color: index === 2 ? theme.accent : "#111" }}>{note.tag}</p>
                    <h3 className="text-2xl font-black mt-1">{note.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed font-semibold">{note.body}</p>
                  </article>
                ))}
              </div>
            </section>

            <section className="p-5 md:p-7 min-h-[760px]" style={{ background: theme.soft }}>
              {featured && (
                <article className="border-4 border-black bg-white p-4">
                  <p className="text-xs uppercase tracking-[0.22em] font-black" style={{ color: theme.accent }}>Partido elegido</p>
                  <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                    <div className="text-right">
                      <TeamLogo team={featured.home} size="lg" />
                      <p className="font-black mt-1">{featured.home}</p>
                    </div>
                    <div className="text-5xl font-black">{featured.hg}-{featured.ag}</div>
                    <div>
                      <TeamLogo team={featured.away} size="lg" />
                      <p className="font-black mt-1">{featured.away}</p>
                    </div>
                  </div>
                </article>
              )}

              <article className="mt-4 border-2 border-black bg-white p-4 shadow-[6px_6px_0_rgba(0,0,0,.10)]">
                <p className="text-xs uppercase tracking-[0.24em] font-black" style={{ color: theme.accent }}>Marcadores</p>
                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2">
                  {topResults.slice(0, 8).map((match, index) => (
                    <div key={`${match.home}-${match.away}-c-${index}`} className="border border-black/25 px-3 py-2 grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-xs" style={{ background: theme.paper }}>
                      <div className="flex items-center gap-2 justify-end text-right">
                        <span className="font-black truncate">{match.home}</span>
                        <TeamLogo team={match.home} size="xs" />
                      </div>
                      <span className="font-black text-base">{match.hg}-{match.ag}</span>
                      <div className="flex items-center gap-2">
                        <TeamLogo team={match.away} size="xs" />
                        <span className="font-black truncate">{match.away}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </article>

              <article className="mt-4 border-2 border-black p-4 shadow-[4px_4px_0_rgba(0,0,0,.10)]" style={{ background: theme.accent }}>
                <p className="text-xs uppercase tracking-[0.2em] font-black">Cierre</p>
                <h3 className="text-3xl font-black mt-1">La fecha dejó ruido</h3>
                <p className="mt-2 text-sm leading-relaxed font-bold">{fifthLine}</p>
              </article>

              <button onClick={onClose} className="mt-5 w-full rounded-xl px-5 py-3 text-white font-black" style={{ background: theme.dark }}>
                Volver al juego
              </button>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}

function InfoModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/80 p-3 md:p-6 backdrop-blur-sm">
      <div className="my-4 w-full max-w-4xl rounded-3xl border border-white/15 bg-[#071118] text-white shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between gap-4 border-b border-white/10 bg-white/[0.04] px-5 py-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-sky-300 font-black">Información</p>
            <h2 className="text-2xl md:text-3xl font-black">Qué es Liga Manager</h2>
          </div>
          <button
            onClick={onClose}
            className="h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 border border-white/10 font-black"
          >
            ×
          </button>
        </div>

        <div className="space-y-5 px-5 py-5 leading-relaxed text-white/82">
          <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <h3 className="text-xl font-black text-white mb-2">Un simulador argentino vivo</h3>
            <p>
              Liga Manager es un simulador de fútbol argentino donde las temporadas avanzan año a año,
              los clubes construyen historia y cada save termina teniendo su propio universo: campeones,
              descensos, ascensos, rachas, sorpresas, crisis y nuevos protagonistas. Podés jugar a tu ritmo:
              partido a partido, fecha a fecha o simulando una temporada completa.
            </p>
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <h3 className="text-xl font-black text-white mb-2">Tres competencias</h3>
            <p>
              El juego tiene <b>Liga Profesional Argentina</b>, <b>Primera B Nacional</b> y <b>Copa Argentina</b>.
              La Liga y la B se juegan por tabla; la Copa Argentina funciona como torneo de eliminación directa.
              Al terminar cada temporada se actualizan campeones, ascensos, descensos, promociones e historial.
            </p>
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <h3 className="text-xl font-black text-white mb-2">Tablas, promedios e historial</h3>
            <p>
              Podés seguir la tabla en vivo, revisar fixture, tabla histórica, campeonatos ganados,
              descensos, ascensos y promedios. Cada temporada terminada queda archivada para consultar
              cómo salió cada equipo y cómo fue cambiando el mapa del fútbol argentino.
            </p>
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <h3 className="text-xl font-black text-white mb-2">Diarios y crónicas</h3>
            <p>
              El simulador genera noticias, diarios de fecha y resúmenes de temporada. También cada club tiene
              una crónica propia que cambia según lo que le pasa en el save: títulos, campañas, descensos,
              ascensos, regularidad, decepciones o crecimiento histórico.
            </p>
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <h3 className="text-xl font-black text-white mb-2">Grandeza y fuerzas</h3>
            <p>
              Los clubes tienen una etiqueta de grandeza como <b>GIGANTE</b>, <b>GRANDE</b>, <b>MEDIO</b> o <b>CHICO</b>,
              calculada con su historia dentro del save. Además muestran <b>fuerza inicial</b> y <b>fuerza actual</b>:
              la inicial es el punto de partida, y la actual evoluciona con el rendimiento temporada tras temporada.
            </p>
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <h3 className="text-xl font-black text-white mb-2">Guardado online</h3>
            <p>
              El código de guardado permite continuar la misma partida en otro dispositivo. Podés guardar,
              copiar el código y cargar el save desde celular, PC u otro navegador sin perder el progreso.
            </p>
          </section>

          <button
            onClick={onClose}
            className="w-full rounded-2xl bg-blue-600 hover:bg-blue-700 px-5 py-3 font-black text-white"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const [mounted, setMounted] = useState(false);

  const [tab, setTab] = useState<TabKey>("inicio");
  const [activeLeague, setActiveLeague] = useState<LeagueKey>("primera");
  const [activeCompetition, setActiveCompetition] = useState<CompetitionKey>("primera");
  const [theme, setTheme] = useState<ThemeMode>("dark");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const [year, setYear] = useState(1);
  const [teamPower, setTeamPower] = useState<Record<string, number>>(createInitialTeamPower);

  const [primeraTeams, setPrimeraTeams] = useState(initialPrimera);
  const [bTeams, setBTeams] = useState(initialB);

  const [fixtureA, setFixtureA] = useState<Round[]>([]);
  const [fixtureB, setFixtureB] = useState<Round[]>([]);

  const [roundIndexA, setRoundIndexA] = useState(0);
  const [roundIndexB, setRoundIndexB] = useState(0);

  const [history, setHistory] = useState<SeasonRecord[]>([]);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [summary, setSummary] = useState<SeasonRecord | null>(null);

  const [cup, setCup] = useState<CupTournament>(() => generateCup(initialPrimera, initialB));
  const [selectedClub, setSelectedClub] = useState<string | null>(null);

  const [saveCode, setSaveCode] = useState("");
  const [cloudStatus, setCloudStatus] = useState("");
  const [roundReports, setRoundReports] = useState<RoundReport[]>([]);
  const [selectedRoundReport, setSelectedRoundReport] = useState<RoundReport | null>(null);
  const [showInfoModal, setShowInfoModal] = useState(false);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      const oldSaved = window.localStorage.getItem("liga-manager-save-v3") ?? window.localStorage.getItem("liga-manager-save-v2");

      const raw = saved ?? oldSaved;

      if (raw) {
        const data = JSON.parse(raw) as SavedGame;

        setYear(data.year ?? 1);
        setPrimeraTeams(data.primeraTeams ?? initialPrimera);
        setBTeams(data.bTeams ?? initialB);
        setFixtureA(data.fixtureA?.length ? data.fixtureA : generateFixture(initialPrimera));
        setFixtureB(data.fixtureB?.length ? data.fixtureB : generateFixture(initialB));
        setRoundIndexA(data.roundIndexA ?? 0);
        setRoundIndexB(data.roundIndexB ?? 0);
        setHistory(data.history ?? []);
        setSelectedYear(data.selectedYear ?? null);
        setActiveLeague(data.activeLeague ?? "primera");
        setActiveCompetition(data.activeCompetition ?? data.activeLeague ?? "primera");
        setTab(((data.tab as unknown as string) === "copa" ? "inicio" : data.tab) ?? "inicio");
        setTheme(data.theme ?? "dark");
        setCup(data.cup ?? generateCup(data.primeraTeams ?? initialPrimera, data.bTeams ?? initialB));
        setSaveCode(data.saveCode ?? createRandomSaveCode());
        setSidebarOpen(data.sidebarOpen ?? true);
        setTeamPower(data.teamPower ?? buildTeamPowerFromHistory(data.history ?? []));
      } else {
        setFixtureA(generateFixture(initialPrimera));
        setFixtureB(generateFixture(initialB));
        setCup(generateCup(initialPrimera, initialB));
        setSaveCode(createRandomSaveCode());
      }
    } catch {
      setFixtureA(generateFixture(initialPrimera));
      setFixtureB(generateFixture(initialB));
      setCup(generateCup(initialPrimera, initialB));
      setSaveCode(createRandomSaveCode());
    } finally {
      setMounted(true);
    }
  }, []);

  const saveData: SavedGame = {
    year,
    primeraTeams,
    bTeams,
    fixtureA,
    fixtureB,
    roundIndexA,
    roundIndexB,
    history,
    selectedYear,
    activeLeague,
    activeCompetition,
    tab,
    theme,
    cup,
    saveCode,
    sidebarOpen,
    teamPower,
  };

  useEffect(() => {
    if (!mounted || fixtureA.length === 0 || fixtureB.length === 0) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(saveData));
  }, [
    mounted,
    year,
    primeraTeams,
    bTeams,
    fixtureA,
    fixtureB,
    roundIndexA,
    roundIndexB,
    history,
    selectedYear,
    activeLeague,
    activeCompetition,
    tab,
    theme,
    cup,
    saveCode,
    sidebarOpen,
    teamPower,
  ]);

  useEffect(() => {
    activeTeamPower = teamPower;
  }, [teamPower]);

  const tableA = useMemo(() => buildTable(primeraTeams, fixtureA), [primeraTeams, fixtureA]);
  const tableB = useMemo(() => buildTable(bTeams, fixtureB), [bTeams, fixtureB]);

  const finished =
    fixtureA.length > 0 &&
    fixtureB.length > 0 &&
    isSeasonFinished(fixtureA) &&
    isSeasonFinished(fixtureB);

  const lastChampion = history[history.length - 1]?.champion;

  const maxWinner = useMemo(() => {
    const titles: Record<string, number> = {};

    history.forEach((season) => {
      titles[season.champion.team] = (titles[season.champion.team] ?? 0) + 1;
    });

    return Object.entries(titles).sort((a, b) => b[1] - a[1])[0];
  }, [history]);

  const allTeamsEver = useMemo(() => {
    const set = new Set([...initialPrimera, ...initialB, ...primeraTeams, ...bTeams]);

    history.forEach((season) => {
      season.primera.forEach((r) => set.add(r.team));
      season.b.forEach((r) => set.add(r.team));
    });

    return Array.from(set).sort();
  }, [history, primeraTeams, bTeams]);

  const news = useMemo(
    () => generateNews(tableA, history[history.length - 1]?.champion.team, cup.champion),
    [tableA, history, cup]
  );

  const clubStats = useMemo(() => {
    const stats: Record<string, ClubStats> = {};

    [...initialPrimera, ...initialB, ...primeraTeams, ...bTeams].forEach((team) => {
      stats[team] = {
        team,
        titles: 0,
        cupTitles: 0,
        seasons: 0,
        relegations: 0,
        promotions: 0,
        historicalPoints: 0,
      };
    });

    history.forEach((season) => {
      season.primera.forEach((row) => {
        if (!stats[row.team]) {
          stats[row.team] = {
            team: row.team,
            titles: 0,
            cupTitles: 0,
            seasons: 0,
            relegations: 0,
            promotions: 0,
            historicalPoints: 0,
          };
        }

        stats[row.team].historicalPoints += row.pts;
        stats[row.team].seasons += 1;
      });

      if (!stats[season.champion.team]) {
        stats[season.champion.team] = {
          team: season.champion.team,
          titles: 0,
          cupTitles: 0,
          seasons: 0,
          relegations: 0,
          promotions: 0,
          historicalPoints: 0,
        };
      }

      stats[season.champion.team].titles += 1;

      if (season.cupChampion) {
        if (!stats[season.cupChampion]) {
          stats[season.cupChampion] = {
            team: season.cupChampion,
            titles: 0,
            cupTitles: 0,
            seasons: 0,
            relegations: 0,
            promotions: 0,
            historicalPoints: 0,
          };
        }

        stats[season.cupChampion].cupTitles += 1;
      }

      season.relegated.forEach((row) => {
        if (stats[row.team]) stats[row.team].relegations += 1;
      });

      season.promoted.forEach((row) => {
        if (stats[row.team]) stats[row.team].promotions += 1;
      });

      if (
        season.promotionWinner &&
        season.promotionWinner === season.promotionTeamB?.team &&
        stats[season.promotionTeamB.team]
      ) {
        stats[season.promotionTeamB.team].promotions += 1;
      }

      if (
        season.promotionWinner &&
        season.promotionWinner === season.promotionTeamB?.team &&
        season.promotionTeamA &&
        stats[season.promotionTeamA.team]
      ) {
        stats[season.promotionTeamA.team].relegations += 1;
      }
    });

    if (cup.champion && stats[cup.champion]) {
      stats[cup.champion].cupTitles += 1;
    }

    return Object.values(stats).sort(
      (a, b) =>
        b.historicalPoints - a.historicalPoints ||
        b.titles - a.titles ||
        b.cupTitles - a.cupTitles ||
        a.team.localeCompare(b.team)
    );
  }, [history, cup, primeraTeams, bTeams]);

  const historicalTable = useMemo(() => {
    const total: Record<string, Row> = {};

    history.forEach((season) => {
      season.primera.forEach((row) => {
        if (!total[row.team]) {
          total[row.team] = {
            team: row.team,
            pts: 0,
            pj: 0,
            pg: 0,
            pe: 0,
            pp: 0,
            gf: 0,
            gc: 0,
            dg: 0,
          };
        }

        total[row.team].pts += row.pts;
        total[row.team].pj += row.pj;
        total[row.team].pg += row.pg;
        total[row.team].pe += row.pe;
        total[row.team].pp += row.pp;
        total[row.team].gf += row.gf;
        total[row.team].gc += row.gc;
      });
    });

    return Object.values(total)
      .map((row) => ({ ...row, dg: row.gf - row.gc }))
      .sort((a, b) => b.pts - a.pts || b.dg - a.dg || b.gf - a.gf);
  }, [history]);

  const currentCupRound = cup.rounds[cup.currentRoundIndex] ?? cup.rounds[0];
  const isLight = theme === "light";

  async function saveOnline() {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      window.alert("Para guardado online configurá NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY.");
      return;
    }

    setCloudStatus("Guardando online...");
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/liga_saves`, {
        method: "POST",
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          "Content-Type": "application/json",
          Prefer: "resolution=merge-duplicates",
        },
        body: JSON.stringify({
          id: saveCode,
          data: saveData,
          updated_at: new Date().toISOString(),
        }),
      });

      if (!res.ok) throw new Error(await res.text());
      setCloudStatus("Guardado online listo.");
    } catch {
      setCloudStatus("No se pudo guardar online.");
    }
  }

  async function loadOnline() {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      window.alert("Para cargar online configurá NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY.");
      return;
    }

    const code = window.prompt("Pegá tu código de guardado online:", saveCode);
    if (!code) return;

    setCloudStatus("Cargando online...");

    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/liga_saves?id=eq.${encodeURIComponent(code)}&select=data`,
        {
          headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          },
        }
      );

      if (!res.ok) throw new Error(await res.text());

      const rows = await res.json();

      if (!rows?.[0]?.data) {
        setCloudStatus("No existe ese guardado.");
        return;
      }

      const data = rows[0].data as SavedGame;

      setYear(data.year ?? 1);
      setPrimeraTeams(data.primeraTeams ?? initialPrimera);
      setBTeams(data.bTeams ?? initialB);
      setFixtureA(data.fixtureA?.length ? data.fixtureA : generateFixture(initialPrimera));
      setFixtureB(data.fixtureB?.length ? data.fixtureB : generateFixture(initialB));
      setRoundIndexA(data.roundIndexA ?? 0);
      setRoundIndexB(data.roundIndexB ?? 0);
      setHistory(data.history ?? []);
      setSelectedYear(data.selectedYear ?? null);
      setActiveLeague(data.activeLeague ?? "primera");
      setActiveCompetition(data.activeCompetition ?? data.activeLeague ?? "primera");
      setTab(((data.tab as unknown as string) === "copa" ? "inicio" : data.tab) ?? "inicio");
      setTheme(data.theme ?? "dark");
      setCup(data.cup ?? generateCup(data.primeraTeams ?? initialPrimera, data.bTeams ?? initialB));
      setSaveCode(data.saveCode ?? code);
      setSidebarOpen(data.sidebarOpen ?? true);
      setTeamPower(data.teamPower ?? buildTeamPowerFromHistory(data.history ?? []));

      setCloudStatus("Guardado online cargado.");
    } catch {
      setCloudStatus("No se pudo cargar online.");
    }
  }

  function closeSeason(nextFixtureA = fixtureA, nextFixtureB = fixtureB, nextCup = cup) {
    const finalCup = nextCup.champion ? nextCup : simulateWholeCup(nextCup);

    const finalTableA = buildTable(primeraTeams, nextFixtureA);
    const finalTableB = buildTable(bTeams, nextFixtureB);

    const top3 = finalTableA.slice(0, 3);
    const { byTable, byAverage, promotionTeamA, relegated } = getRelegations(history, finalTableA);

    const promoted = finalTableB.slice(0, 2);
    const promotionTeamB = finalTableB[2];
    const promotionWinner = playPromotionMatch(promotionTeamA, promotionTeamB);

    const record: SeasonRecord = {
      year,
      primera: finalTableA,
      b: finalTableB,
      fixtureA: nextFixtureA,
      fixtureB: nextFixtureB,
      top3,
      relegated,
      relegatedByTable: byTable,
      relegatedByAverage: byAverage,
      promotionTeamA,
      promotionTeamB,
      promotionWinner,
      promoted,
      champion: finalTableA[0],
      cupChampion: finalCup.champion,
      cupRounds: finalCup.rounds,
    };

    setHistory((old) => [...old, record]);
    setTeamPower((old) =>
      updateSeasonTeamPower({
        currentPower: old,
        record,
      })
    );
    setSummary(record);
    playSound("season");

    const promotionBPromotes = promotionWinner === promotionTeamB?.team;

    const nextPrimera = [
      ...primeraTeams.filter(
        (team) =>
          !relegated.some((r) => r.team === team) &&
          !(promotionBPromotes && team === promotionTeamA?.team)
      ),
      ...promoted.map((p) => p.team),
      ...(promotionBPromotes && promotionTeamB ? [promotionTeamB.team] : []),
    ];

    const nextB = [
      ...bTeams.filter(
        (team) =>
          !promoted.some((p) => p.team === team) &&
          !(promotionBPromotes && team === promotionTeamB?.team)
      ),
      ...relegated.map((r) => r.team),
      ...(promotionBPromotes && promotionTeamA ? [promotionTeamA.team] : []),
    ];

    setPrimeraTeams(nextPrimera);
    setBTeams(nextB);
    setFixtureA(generateFixture(nextPrimera));
    setFixtureB(generateFixture(nextB));
    setRoundIndexA(0);
    setRoundIndexB(0);
    setYear((old) => old + 1);
    setActiveLeague("primera");
    setActiveCompetition("primera");
    setCup(generateCup(nextPrimera, nextB));
    setTheme("dark");
  }

  function nextSeason() {
    if (!finished) return;
    playSound("season");
    closeSeason();
  }

  function simulateFullSeason() {
    const ok = window.confirm("¿Simular todos los partidos restantes de ambas categorías y Copa?");
    if (!ok) return;

    playSound("click");

    const fullA = simulateRemainingFixture(fixtureA, "primera");
    const fullB = simulateRemainingFixture(fixtureB, "b");
    const fullCup = simulateWholeCup(cup);

    setFixtureA(fullA);
    setFixtureB(fullB);
    setCup(fullCup);
    setRoundIndexA(fullA.length - 1);
    setRoundIndexB(fullB.length - 1);
  }

  function simulateAndAdvance() {
    const ok = window.confirm("¿Simular toda la temporada restante y pasar al siguiente año automáticamente?");
    if (!ok) return;

    playSound("champion");

    const fullA = simulateRemainingFixture(fixtureA, "primera");
    const fullB = simulateRemainingFixture(fixtureB, "b");
    const fullCup = simulateWholeCup(cup);

    closeSeason(fullA, fullB, fullCup);
  }

  function resetGame() {
    const ok = window.confirm("¿Seguro que querés reiniciar todo el juego? Se borrará el historial y el autoguardado.");
    if (!ok) return;

    playSound("click");
    window.localStorage.removeItem(STORAGE_KEY);

    setYear(1);
    setTeamPower(createInitialTeamPower());
    setPrimeraTeams(initialPrimera);
    setBTeams(initialB);
    setFixtureA(generateFixture(initialPrimera));
    setFixtureB(generateFixture(initialB));
    setRoundIndexA(0);
    setRoundIndexB(0);
    setHistory([]);
    setSelectedYear(null);
    setSummary(null);
    setTab("inicio");
    setActiveLeague("primera");
    setActiveCompetition("primera");
    setCup(generateCup(initialPrimera, initialB));
    setSaveCode(createRandomSaveCode());
  }

  function updateCupMatch(matchIndex: number, hg: number | null, ag: number | null) {
    setCup((old) => {
      const next: CupTournament = {
        ...old,
        rounds: old.rounds.map((round) => ({
          ...round,
          matches: round.matches.map((match) => ({ ...match })),
        })),
      };

      const match = next.rounds[next.currentRoundIndex]?.matches[matchIndex];

      if (!match) return old;

      match.hg = hg;
      match.ag = ag;
      match.winner =
        hg === null || ag === null
          ? null
          : hg === ag
          ? match.winner ?? (Math.random() > 0.5 ? match.home : match.away)
          : hg > ag
          ? match.home
          : match.away;

      return next;
    });
  }

  function simulateCupMatch(matchIndex: number) {
    const currentMatch = cup.rounds[cup.currentRoundIndex]?.matches[matchIndex];

    if (currentMatch?.hg !== null && currentMatch?.ag !== null) {
      const ok = window.confirm("Este partido ya fue simulado. ¿Querés volver a simularlo?");
      if (!ok) return;
    }

    playSound("match");

    setCup((old) => {
      const next: CupTournament = {
        ...old,
        rounds: old.rounds.map((round) => ({
          ...round,
          matches: round.matches.map((match) => ({ ...match })),
        })),
      };

      const match = next.rounds[next.currentRoundIndex]?.matches[matchIndex];
      if (!match) return old;

      Object.assign(match, simulateCupResult(match.home, match.away));
      return next;
    });
  }

  function simulateCupRound() {
    const alreadyPlayed = currentCupRound.matches.some((match) => match.hg !== null && match.ag !== null);

    if (alreadyPlayed) {
      const ok = window.confirm(
        "Algunos partidos de esta instancia ya fueron simulados. Solo se simularán los que faltan. ¿Continuar?"
      );

      if (!ok) return;
    }

    playSound("match");

    setCup((old) => {
      const next: CupTournament = {
        ...old,
        rounds: old.rounds.map((round) => ({
          ...round,
          matches: round.matches.map((match) => ({ ...match })),
        })),
      };

      const round = next.rounds[next.currentRoundIndex];

      if (!round) return old;

      round.matches = round.matches.map((match) => {
        if (match.hg !== null && match.ag !== null) return match;
        return { ...match, ...simulateCupResult(match.home, match.away) };
      });

      return next;
    });
  }

  function advanceCupManually() {
    playSound("click");

    setCup((old) => {
      const advanced = advanceCup(old);
      if (advanced.champion) playSound("champion");
      return advanced;
    });
  }

  function resetCup() {
    const ok = window.confirm("¿Reiniciar solo la Copa Argentina?");
    if (!ok) return;

    playSound("click");
    setCup(generateCup(primeraTeams, bTeams));
  }

  function selectCompetition(competition: CompetitionKey) {
    playSound("click");
    setActiveCompetition(competition);

    if (competition === "primera") setActiveLeague("primera");
    if (competition === "b") setActiveLeague("b");
  }

  if (!mounted || fixtureA.length === 0 || fixtureB.length === 0) {
    return (
      <main className="min-h-screen bg-[#071015] text-white flex items-center justify-center">
        <p className="text-xl font-bold">Cargando simulador...</p>
      </main>
    );
  }

  return (
    <main
      className={`${
        isLight ? "theme-light bg-slate-100 text-slate-950" : "theme-dark bg-[#071015] text-white"
      } min-h-screen relative overflow-hidden transition-all duration-300 ${sidebarOpen ? "pl-[290px]" : "pl-[86px]"}`}
    >
      <style jsx global>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(6px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes rain {
          0% {
            transform: translate3d(0, -100%, 0);
          }
          100% {
            transform: translate3d(-18px, 100%, 0);
          }
        }

        body {
          background: ${isLight ? "#f1f5f9" : "#071015"};
        }

        .theme-light {
          color: #0f172a;
        }
        .theme-light aside,
        .theme-light aside * {
          color: white !important;
        }

        .theme-light aside .bg-white\/90 {
          background: rgba(255, 255, 255, 0.92) !important;
        }

        .theme-light aside .text-white\/55,
        .theme-light aside .text-white\/65,
        .theme-light aside .text-white\/75 {
          color: rgba(255, 255, 255, 0.70) !important;
        }

        .theme-light aside button.bg-blue-600,
        .theme-light aside button.bg-emerald-600,
        .theme-light aside button.bg-sky-600,
        .theme-light aside button.bg-violet-600,
        .theme-light aside button.bg-red-600 {
          color: white !important;
        }


        .theme-light .glass-card {
          background: rgba(255, 255, 255, 0.94) !important;
          border-color: rgba(15, 23, 42, 0.12) !important;
          box-shadow: 0 18px 48px rgba(15, 23, 42, 0.12) !important;
        }

        .theme-light .glass-card h1,
        .theme-light .glass-card h2,
        .theme-light .glass-card h3,
        .theme-light .glass-card p,
        .theme-light .glass-card span,
        .theme-light .glass-card td,
        .theme-light .glass-card th,
        .theme-light .glass-card label,
        .theme-light .glass-card summary {
          color: #0f172a !important;
        }

        .theme-light .glass-card p[class*="text-white/"],
        .theme-light .glass-card span[class*="text-white/"] {
          color: rgba(15, 23, 42, 0.68) !important;
        }

        .theme-light .glass-card .text-white,
        .theme-light .glass-card .text-white\/75,
        .theme-light .glass-card .text-white\/70,
        .theme-light .glass-card .text-white\/65,
        .theme-light .glass-card .text-white\/60,
        .theme-light .glass-card .text-white\/55,
        .theme-light .glass-card .text-white\/50 {
          color: #0f172a !important;
        }

        .theme-light .glass-card .text-blue-200,
        .theme-light .glass-card .text-blue-300,
        .theme-light .glass-card .text-blue-400,
        .theme-light .glass-card .text-sky-200,
        .theme-light .glass-card .text-sky-300,
        .theme-light .glass-card .text-sky-400 {
          color: #2563eb !important;
        }

        .theme-light .glass-card .text-emerald-300,
        .theme-light .glass-card .text-emerald-400 {
          color: #047857 !important;
        }

        .theme-light .glass-card .text-red-300,
        .theme-light .glass-card .text-red-400 {
          color: #dc2626 !important;
        }

        .theme-light .glass-card .text-yellow-300,
        .theme-light .glass-card .text-yellow-400 {
          color: #b45309 !important;
        }

        .theme-light .glass-card .bg-black\/20,
        .theme-light .glass-card .bg-black\/25,
        .theme-light .glass-card .bg-black\/35,
        .theme-light .glass-card .bg-black\/45,
        .theme-light .glass-card .bg-black\/55,
        .theme-light .glass-card .bg-black\/70,
        .theme-light .glass-card .bg-black\/75,
        .theme-light .glass-card .bg-black\/80 {
          background: rgba(248, 250, 252, 0.92) !important;
        }

        .theme-light .glass-card .bg-white\/5,
        .theme-light .glass-card .bg-white\/8,
        .theme-light .glass-card .bg-white\/10,
        .theme-light .glass-card .bg-white\/15,
        .theme-light .glass-card .bg-white\/\[0\.03\],
        .theme-light .glass-card .bg-white\/\[0\.04\],
        .theme-light .glass-card .bg-white\/\[0\.05\],
        .theme-light .glass-card .bg-white\/\[0\.06\],
        .theme-light .glass-card .bg-white\/\[0\.07\],
        .theme-light .glass-card .bg-white\/\[0\.08\] {
          background: rgba(241, 245, 249, 0.88) !important;
        }

        .theme-light .glass-card .border-white\/10,
        .theme-light .glass-card .border-white\/15 {
          border-color: rgba(15, 23, 42, 0.12) !important;
        }

        .theme-light .glass-card button:not(.bg-blue-600):not(.bg-sky-600):not(.bg-emerald-600):not(.bg-violet-600):not(.bg-red-600):not([class*="bg-gradient"]) {
          background: rgba(255, 255, 255, 0.82) !important;
          color: #0f172a !important;
          border-color: rgba(15, 23, 42, 0.14) !important;
          box-shadow: 0 8px 18px rgba(15, 23, 42, 0.08);
        }

        .theme-light .glass-card button:hover:not(.bg-blue-600):not(.bg-sky-600):not(.bg-emerald-600):not(.bg-violet-600):not(.bg-red-600):not([class*="bg-gradient"]) {
          background: #ffffff !important;
        }

        .theme-light .glass-card button.bg-blue-600,
        .theme-light .glass-card button.bg-sky-600,
        .theme-light .glass-card button.bg-emerald-600,
        .theme-light .glass-card button.bg-violet-600,
        .theme-light .glass-card button.bg-red-600,
        .theme-light .glass-card button[class*="bg-gradient"] {
          color: white !important;
        }

        .theme-light table {
          background: rgba(255, 255, 255, 0.92) !important;
        }

        .theme-light table thead {
          background: #0f172a !important;
        }

        .theme-light table thead * {
          color: white !important;
        }

        .theme-light table tbody tr {
          border-color: rgba(15, 23, 42, 0.10) !important;
        }

        .theme-light table tbody tr:hover {
          background: rgba(37, 99, 235, 0.08) !important;
        }

        .theme-light input,
        .theme-light select {
          color: #0f172a !important;
          background: white !important;
          border-color: rgba(15, 23, 42, 0.2) !important;
        }

        .theme-light input::placeholder {
          color: rgba(15, 23, 42, 0.45) !important;
        }

        .theme-light .glass-card .bg-\[\#061016\],
        .theme-light aside .bg-\[\#061016\] {
          background: #061016 !important;
        }

        .theme-light .glass-card .bg-\[\#061016\] *,
        .theme-light aside .bg-\[\#061016\] * {
          color: white !important;
        }

        .theme-light .glass-card .text-white[class*="tracking"],
        .theme-light .glass-card h2.text-white {
          color: #0f172a !important;
        }

        .theme-light .glass-card .bg-emerald-500\/15,
        .theme-light .glass-card .bg-emerald-500\/18 {
          background: rgba(16, 185, 129, 0.16) !important;
        }

        .theme-light .glass-card .bg-sky-500\/14,
        .theme-light .glass-card .bg-sky-500\/15 {
          background: rgba(14, 165, 233, 0.14) !important;
        }

        .theme-light .glass-card .bg-violet-500\/14,
        .theme-light .glass-card .bg-violet-500\/15 {
          background: rgba(139, 92, 246, 0.14) !important;
        }

        .theme-light .glass-card .bg-yellow-500\/15,
        .theme-light .glass-card .bg-yellow-500\/22,
        .theme-light .glass-card .bg-yellow-500\/25 {
          background: rgba(245, 158, 11, 0.20) !important;
        }

        .theme-light .glass-card .bg-red-500\/15,
        .theme-light .glass-card .bg-red-500\/18,
        .theme-light .glass-card .bg-red-500\/25 {
          background: rgba(239, 68, 68, 0.17) !important;
        }

        .theme-light .glass-card [class*="from-slate-950"],
        .theme-light .glass-card [class*="to-blue-950"] {
          background: linear-gradient(90deg, #1d4ed8, #0f172a) !important;
          color: white !important;
        }

        .theme-light .glass-card input {
          box-shadow: 0 1px 0 rgba(15, 23, 42, 0.06);
        }

        .theme-light .glass-card .shadow-inner {
          box-shadow: inset 0 1px 12px rgba(15, 23, 42, 0.08) !important;
        }

        .theme-light .glass-card .bg-white\/90 img,
        .theme-light .glass-card img {
          color: initial !important;
        }

        .theme-light h1,
        .theme-light h2,
        .theme-light h3,
        .theme-light p,
        .theme-light span,
        .theme-light li,
        .theme-light ol,
        .theme-light div {
          color: #0f172a;
        }

        .theme-light .relative > section h1,
        .theme-light .relative > section h2,
        .theme-light .relative > section p {
          color: #0f172a !important;
          text-shadow: 0 1px 0 rgba(255,255,255,.35);
        }

        .theme-light .grid .glass-card,
        .theme-light section > .glass-card {
          background: rgba(255,255,255,.96) !important;
        }

        .theme-light .glass-card table tbody td,
        .theme-light .glass-card table tbody td span,
        .theme-light .glass-card table tbody td div {
          color: #0f172a !important;
        }

        .theme-light .glass-card table tbody tr.bg-emerald-500\/18,
        .theme-light .glass-card table tbody tr.bg-emerald-500\/15 {
          background: rgba(16,185,129,.18) !important;
        }

        .theme-light .glass-card table tbody tr.bg-sky-500\/14 {
          background: rgba(14,165,233,.16) !important;
        }

        .theme-light .glass-card table tbody tr.bg-violet-500\/14 {
          background: rgba(139,92,246,.15) !important;
        }

        .theme-light .glass-card table tbody tr.bg-red-500\/25,
        .theme-light .glass-card table tbody tr.bg-red-500\/18 {
          background: rgba(239,68,68,.18) !important;
        }

        .theme-light .glass-card tr.bg-white\/\[0\.025\],
        .theme-light .glass-card tr.bg-white\/\[0\.03\] {
          background: rgba(255,255,255,.72) !important;
        }

        .theme-light .glass-card .rounded-xl.bg-white\/\[0\.07\],
        .theme-light .glass-card .rounded-xl.bg-white\/\[0\.08\],
        .theme-light .glass-card .rounded-xl.bg-white\/10 {
          background: rgba(255,255,255,.78) !important;
          border-color: rgba(15,23,42,.12) !important;
        }

        .theme-light .glass-card .text-white\/85,
        .theme-light .glass-card .text-white\/75,
        .theme-light .glass-card .text-white\/65,
        .theme-light .glass-card .text-white\/55 {
          color: rgba(15,23,42,.72) !important;
        }

        .theme-light .glass-card button.bg-blue-600,
        .theme-light .glass-card button.bg-sky-600,
        .theme-light .glass-card button.bg-emerald-600,
        .theme-light .glass-card button.bg-violet-600,
        .theme-light .glass-card button.bg-red-600 {
          color: white !important;
        }

        .theme-light .glass-card .bg-blue-600,
        .theme-light .glass-card .bg-sky-600,
        .theme-light .glass-card .bg-emerald-600,
        .theme-light .glass-card .bg-violet-600,
        .theme-light .glass-card .bg-red-600 {
          color: white !important;
        }

        .theme-light .glass-card .bg-blue-600 *,
        .theme-light .glass-card .bg-sky-600 *,
        .theme-light .glass-card .bg-emerald-600 *,
        .theme-light .glass-card .bg-violet-600 *,
        .theme-light .glass-card .bg-red-600 * {
          color: white !important;
        }

        .theme-light aside,
        .theme-light aside * {
          color: white !important;
        }

        .theme-light aside img {
          color: initial !important;
        }

        /* ===== MODO CLARO FINAL: solo afecta theme-light ===== */
        .theme-light {
          background: #dbe4ee !important;
          color: #0f172a !important;
        }

        .theme-light .fixed.inset-0[class*="bg-cover"] {
          filter: saturate(.75) contrast(.92) brightness(1.08);
        }

        .theme-light .glass-card {
          background: rgba(255, 255, 255, 0.96) !important;
          border-color: rgba(15, 23, 42, 0.14) !important;
          box-shadow: 0 18px 44px rgba(15, 23, 42, 0.14) !important;
        }

        .theme-light :not(aside):not(aside *) {
          color: #0f172a;
        }

        .theme-light .text-white,
        .theme-light .text-white\/85,
        .theme-light .text-white\/80,
        .theme-light .text-white\/75,
        .theme-light .text-white\/70,
        .theme-light .text-white\/65,
        .theme-light .text-white\/60,
        .theme-light .text-white\/55,
        .theme-light .text-white\/50,
        .theme-light .text-white\/45 {
          color: #0f172a !important;
        }

        .theme-light p.text-white\/85,
        .theme-light p.text-white\/75,
        .theme-light p.text-white\/65,
        .theme-light p.text-white\/60,
        .theme-light p.text-white\/55 {
          color: rgba(15, 23, 42, 0.72) !important;
        }

        .theme-light .text-blue-200,
        .theme-light .text-blue-300,
        .theme-light .text-blue-400,
        .theme-light .text-sky-200,
        .theme-light .text-sky-300,
        .theme-light .text-sky-400 {
          color: #2563eb !important;
        }

        .theme-light .text-emerald-300,
        .theme-light .text-emerald-400 {
          color: #047857 !important;
        }

        .theme-light .text-red-300,
        .theme-light .text-red-400 {
          color: #dc2626 !important;
        }

        .theme-light .text-yellow-300,
        .theme-light .text-yellow-400 {
          color: #b45309 !important;
        }

        .theme-light .bg-black\/20,
        .theme-light .bg-black\/25,
        .theme-light .bg-black\/35,
        .theme-light .bg-black\/45,
        .theme-light .bg-black\/55,
        .theme-light .bg-black\/70,
        .theme-light .bg-black\/75,
        .theme-light .bg-black\/80 {
          background: rgba(248, 250, 252, 0.94) !important;
        }

        .theme-light .bg-white\/5,
        .theme-light .bg-white\/8,
        .theme-light .bg-white\/10,
        .theme-light .bg-white\/15,
        .theme-light .bg-white\/\[0\.025\],
        .theme-light .bg-white\/\[0\.03\],
        .theme-light .bg-white\/\[0\.04\],
        .theme-light .bg-white\/\[0\.05\],
        .theme-light .bg-white\/\[0\.06\],
        .theme-light .bg-white\/\[0\.07\],
        .theme-light .bg-white\/\[0\.08\] {
          background: rgba(241, 245, 249, 0.90) !important;
        }

        .theme-light .border-white\/10,
        .theme-light .border-white\/15,
        .theme-light .border-white\/20 {
          border-color: rgba(15, 23, 42, 0.14) !important;
        }

        .theme-light table {
          background: rgba(255, 255, 255, 0.96) !important;
        }

        .theme-light table thead {
          background: #0f172a !important;
        }

        .theme-light table thead,
        .theme-light table thead * {
          color: white !important;
        }

        .theme-light table tbody td,
        .theme-light table tbody td *,
        .theme-light table tbody th,
        .theme-light table tbody th * {
          color: #0f172a !important;
        }

        .theme-light tr.bg-emerald-500\/18,
        .theme-light tr.bg-emerald-500\/15,
        .theme-light .bg-emerald-500\/18,
        .theme-light .bg-emerald-500\/15 {
          background: rgba(16, 185, 129, .18) !important;
        }

        .theme-light tr.bg-sky-500\/14,
        .theme-light .bg-sky-500\/14,
        .theme-light .bg-sky-500\/15 {
          background: rgba(14, 165, 233, .16) !important;
        }

        .theme-light tr.bg-violet-500\/14,
        .theme-light .bg-violet-500\/14,
        .theme-light .bg-violet-500\/15 {
          background: rgba(139, 92, 246, .16) !important;
        }

        .theme-light tr.bg-red-500\/25,
        .theme-light tr.bg-red-500\/18,
        .theme-light .bg-red-500\/25,
        .theme-light .bg-red-500\/18,
        .theme-light .bg-red-500\/15 {
          background: rgba(239, 68, 68, .18) !important;
        }

        .theme-light tr.bg-yellow-500\/25,
        .theme-light tr.bg-yellow-500\/22,
        .theme-light .bg-yellow-500\/25,
        .theme-light .bg-yellow-500\/22,
        .theme-light .bg-yellow-500\/15 {
          background: rgba(245, 158, 11, .20) !important;
        }

        .theme-light button.bg-blue-600,
        .theme-light button.bg-sky-600,
        .theme-light button.bg-emerald-600,
        .theme-light button.bg-violet-600,
        .theme-light button.bg-red-600,
        .theme-light .bg-blue-600,
        .theme-light .bg-sky-600,
        .theme-light .bg-emerald-600,
        .theme-light .bg-violet-600,
        .theme-light .bg-red-600,
        .theme-light [class*="bg-gradient"] {
          color: white !important;
        }

        .theme-light button.bg-blue-600 *,
        .theme-light button.bg-sky-600 *,
        .theme-light button.bg-emerald-600 *,
        .theme-light button.bg-violet-600 *,
        .theme-light button.bg-red-600 *,
        .theme-light .bg-blue-600 *,
        .theme-light .bg-sky-600 *,
        .theme-light .bg-emerald-600 *,
        .theme-light .bg-violet-600 *,
        .theme-light .bg-red-600 *,
        .theme-light [class*="bg-gradient"] * {
          color: white !important;
        }

        .theme-light button:not(.bg-blue-600):not(.bg-sky-600):not(.bg-emerald-600):not(.bg-violet-600):not(.bg-red-600) {
          color: #0f172a !important;
        }

        .theme-light input,
        .theme-light select {
          color: #0f172a !important;
          background: white !important;
          border-color: rgba(15, 23, 42, 0.24) !important;
        }

        .theme-light aside,
        .theme-light aside * {
          color: white !important;
        }

        .theme-light aside .text-white\/55,
        .theme-light aside .text-white\/65,
        .theme-light aside .text-white\/75 {
          color: rgba(255,255,255,.70) !important;
        }

        .theme-light aside .bg-white\/90 {
          background: rgba(255,255,255,.92) !important;
        }

      `}</style>

      <Sidebar
        open={sidebarOpen}
        setOpen={setSidebarOpen}
        tab={tab}
        setTab={setTab}
        theme={theme}
        setTheme={setTheme}
        year={year}
        saveCode={saveCode}
        cloudStatus={cloudStatus}
        saveOnline={saveOnline}
        loadOnline={loadOnline}
        setSaveCode={setSaveCode}
        resetGame={resetGame}
      />

      <div
        className="fixed inset-0 bg-cover bg-[center_top_-140px] bg-no-repeat"
        style={{ backgroundImage: "url('/backgrounds/stadium.png')" }}
      />

      <div
        className={`fixed inset-0 ${
          isLight ? "bg-slate-200/35 backdrop-blur-[1px]" : "bg-black/55 backdrop-blur-[2px]"
        }`}
      />

      <div
        className={`fixed inset-0 ${
          isLight
            ? "bg-[linear-gradient(180deg,rgba(241,245,249,.45)_0%,rgba(226,232,240,.42)_44%,rgba(203,213,225,.64)_100%)]"
            : "bg-[linear-gradient(180deg,rgba(0,0,0,.35)_0%,rgba(0,0,0,.45)_40%,rgba(0,0,0,.72)_100%)]"
        }`}
      />

      <div className="fixed inset-0 pointer-events-none opacity-10 bg-[repeating-linear-gradient(110deg,rgba(255,255,255,.22)_0px,rgba(255,255,255,.22)_1px,transparent_1px,transparent_30px)] animate-[rain_4s_linear_infinite]" />

      <div className="relative w-full max-w-[1500px] mx-auto px-6 py-4 space-y-4">
        {tab === "inicio" && (
        <GlassCard className="p-4 text-white max-w-[1360px] mx-auto">
          <div className="grid grid-cols-1 xl:grid-cols-[1fr_1fr_auto] gap-4 items-start">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-blue-300 font-black">Noticias</p>
              <AiHomeNews fallbackNews={news} table={tableA} history={history} cupChampion={cup.champion} />
            </div>

            <div className="rounded-xl bg-white/[0.05] border border-white/10 px-4 py-3 min-w-[360px]">
              <div className="flex items-center justify-between gap-3 mb-2">
                <p className="text-xs uppercase tracking-[0.25em] text-yellow-300 font-black">Diario de fecha</p>
                <span className="text-[10px] text-white/45">{roundReports.length ? `${roundReports.length} ediciones` : "Sin ediciones"}</span>
              </div>

              {roundReports.length ? (
                <div className="space-y-2 max-h-[130px] overflow-y-auto pr-1">
                  {roundReports.slice(0, 3).map((report, index) => (
                    <button
                      key={`${report.league}-${report.round}-${index}`}
                      onClick={() => setSelectedRoundReport(report)}
                      className="w-full rounded-lg bg-black/25 hover:bg-black/40 border border-white/10 px-3 py-2 text-left transition-all"
                    >
                      <p className="text-xs font-black text-white">{report.title}</p>
                      <p className="text-xs text-white/65 mt-1 line-clamp-2">{report.lines[0]}</p>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-white/55">Cuando simules una fecha completa, la crónica aparece acá sin interrumpir el juego.</p>
              )}
            </div>

            <button
              onClick={() => setShowInfoModal(true)}
              className="rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 px-4 py-3 text-center transition-all min-w-[150px]"
              title="Cómo funciona Liga Manager"
            >
              <div className="flex items-center justify-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-sky-500/20 border border-sky-300/30 text-xl font-black text-sky-200">
                  i
                </span>

                <div className="text-left">
                  <p className="text-xs uppercase text-white/55 font-black">Ayuda</p>
                  <p className="text-lg font-black">Info</p>
                </div>
              </div>
            </button>
          </div>
        </GlassCard>

        )}

        {summary && <NewspaperModal summary={summary} history={history} onClose={() => setSummary(null)} />}

        {selectedRoundReport && (
          <RoundReportModal report={selectedRoundReport} onClose={() => setSelectedRoundReport(null)} />
        )}

        {showInfoModal && <InfoModal onClose={() => setShowInfoModal(false)} />}

        {tab === "inicio" && (
          <>
            <GlassCard className="p-5 space-y-4 max-w-[1360px] mx-auto">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.35em] text-blue-400 font-black">Simulador argentino</p>

                  <h1 className="text-3xl md:text-4xl font-black tracking-tight text-white">Liga Manager</h1>

                  <p className="text-white/75 mt-1">
                    Partidos, tablas, ascensos, descensos, promoción, campeonatos, promedios, Copa Argentina e historia acumulada.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={simulateFullSeason}
                    className="px-5 py-3 rounded-xl font-black shadow-lg bg-black/55 hover:bg-black/75 border border-white/10 text-white"
                  >
                    Simular temporada completa
                  </button>

                  <button
                    onClick={nextSeason}
                    disabled={!finished}
                    className={`px-5 py-3 rounded-xl font-black shadow-lg ${
                      finished
                        ? "bg-blue-600 hover:bg-blue-700 text-white"
                        : "bg-white/15 text-white/55 cursor-not-allowed"
                    }`}
                  >
                    Pasar a siguiente temporada
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <StatCard label="Año actual" value={year} sub="Temporada en curso" />

                <StatCard
                  label="Último campeón"
                  value={lastChampion ? <TeamName team={lastChampion.team} small /> : "-"}
                  sub={lastChampion ? `${lastChampion.pts} puntos` : "Sin temporadas terminadas"}
                />

                <StatCard
                  label="Máximo ganador"
                  value={maxWinner ? <TeamName team={maxWinner[0]} small /> : "-"}
                  sub={maxWinner ? `${maxWinner[1]} campeonatos` : "Sin títulos todavía"}
                />

                <StatCard
                  label="Estado"
                  value={finished ? "Finalizada" : "En juego"}
                  sub={`${playedMatches(fixtureA) + playedMatches(fixtureB)}/${totalMatches(fixtureA) + totalMatches(fixtureB)} partidos`}
                />
              </div>
            </GlassCard>

            <div className="flex gap-3 flex-wrap max-w-[1360px] mx-auto">
              <button
                onClick={() => selectCompetition("primera")}
                className={`px-4 py-3 rounded-lg font-black shadow-sm border ${
                  activeCompetition === "primera"
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-black/55 text-white border-white/10"
                }`}
              >
                Liga Profesional Argentina
              </button>

              <button
                onClick={() => selectCompetition("b")}
                className={`px-4 py-3 rounded-lg font-black shadow-sm border ${
                  activeCompetition === "b"
                    ? "bg-amber-500 text-white border-amber-500"
                    : "bg-black/55 text-white border-white/10"
                }`}
              >
                Primera B Nacional
              </button>

              <button
                onClick={() => selectCompetition("copa")}
                className={`px-4 py-3 rounded-lg font-black shadow-sm border ${
                  activeCompetition === "copa"
                    ? "bg-sky-600 text-white border-sky-600"
                    : "bg-black/55 text-white border-white/10"
                }`}
              >
                Copa Argentina
              </button>
            </div>

            {activeCompetition === "primera" && (
              <>
                <Zone
                  name="Liga Profesional Argentina"
                  type="primera"
                  teams={primeraTeams}
                  fixture={fixtureA}
                  setFixture={setFixtureA}
                  roundIndex={roundIndexA}
                  setRoundIndex={setRoundIndexA}
                  clubStats={clubStats}
                  teamPower={teamPower}
                  onRoundReport={(report) =>
                    setRoundReports((old) => [
                      { ...report, year },
                      ...old.filter((item) => !(item.league === report.league && item.round === report.round && item.year === year)),
                    ].slice(0, 8))
                  }
                />

                <div className="grid grid-cols-1 xl:grid-cols-[minmax(760px,1.12fr)_minmax(560px,.88fr)] gap-4 items-start max-w-[1360px] mx-auto -mt-1">
                  <AverageTable history={history} currentTable={tableA} />
                  <RelegationPreview history={history} table={tableA} bTable={tableB} />
                </div>
              </>
            )}

            {activeCompetition === "b" && (
              <Zone
                name="Primera B Nacional"
                type="b"
                teams={bTeams}
                fixture={fixtureB}
                setFixture={setFixtureB}
                roundIndex={roundIndexB}
                setRoundIndex={setRoundIndexB}
                clubStats={clubStats}
                teamPower={teamPower}
                onRoundReport={(report) =>
                  setRoundReports((old) => [
                    { ...report, year },
                    ...old.filter((item) => !(item.league === report.league && item.round === report.round && item.year === year)),
                  ].slice(0, 8))
                }
              />
            )}

            {activeCompetition === "copa" && (
              <CupPanel
                cup={cup}
                currentCupRound={currentCupRound}
                simulateCupRound={simulateCupRound}
                advanceCupManually={advanceCupManually}
                resetCup={resetCup}
                simulateCupMatch={simulateCupMatch}
                updateCupMatch={updateCupMatch}
              />
            )}
          </>
        )}

        {tab === "fixture" && (
          <section className="space-y-5">
            <SecondaryHeader
              title="Fixture completo"
              subtitle="Todas las fechas y partidos de cada competición."
            />
            <div className="flex gap-3 flex-wrap">
              <button
                onClick={() => selectCompetition("primera")}
                className={`px-4 py-3 rounded-lg font-black shadow-sm border ${
                  activeCompetition === "primera"
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-black/55 text-white border-white/10"
                }`}
              >
                Liga Profesional Argentina
              </button>

              <button
                onClick={() => selectCompetition("b")}
                className={`px-4 py-3 rounded-lg font-black shadow-sm border ${
                  activeCompetition === "b"
                    ? "bg-amber-500 text-white border-amber-500"
                    : "bg-black/55 text-white border-white/10"
                }`}
              >
                Primera B Nacional
              </button>

              <button
                onClick={() => selectCompetition("copa")}
                className={`px-4 py-3 rounded-lg font-black shadow-sm border ${
                  activeCompetition === "copa"
                    ? "bg-sky-600 text-white border-sky-600"
                    : "bg-black/55 text-white border-white/10"
                }`}
              >
                Copa Argentina
              </button>
            </div>

            {activeCompetition === "primera" && (
              <FixtureFullView title="Liga Profesional Argentina" fixture={fixtureA} league="primera" />
            )}

            {activeCompetition === "b" && (
              <FixtureFullView title="Primera B Nacional" fixture={fixtureB} league="b" />
            )}

            {activeCompetition === "copa" && (
              <CupPanel
                cup={cup}
                currentCupRound={currentCupRound}
                simulateCupRound={simulateCupRound}
                advanceCupManually={advanceCupManually}
                resetCup={resetCup}
                simulateCupMatch={simulateCupMatch}
                updateCupMatch={updateCupMatch}
              />
            )}
          </section>
        )}

        {tab === "historica" && (
          <section className="space-y-5">
            <SecondaryHeader
              title="Tabla histórica"
              subtitle="Puntos acumulados y rendimiento histórico en Primera División."
            />
            <BestWorstStats history={history} />

            {historicalTable.length === 0 ? (
              <p className="text-white/70">Todavía no terminaste ninguna temporada.</p>
            ) : (
              <HistoricTable rows={historicalTable} />
            )}
          </section>
        )}

        {tab === "campeonatos" && (
          <section className="space-y-5">
            <SecondaryHeader
              title="Estadísticas e historial"
              subtitle="Palmarés, copas, ligas, descensos y registros históricos."
            />
            <ChampionshipsTable history={history} teams={allTeamsEver} />
          </section>
        )}

        {tab === "promedios" && (
          <section className="space-y-5">
            <SecondaryHeader
              title="Promedios"
              subtitle="Sistema de descensos y rendimiento acumulado de las últimas temporadas."
            />
            <AverageTable history={history} currentTable={tableA} />
          </section>
        )}

        {tab === "movimientos" && (
          <section className="space-y-5">
            <SecondaryHeader
              title="Ascensos y descensos"
              subtitle="Historial completo de movimientos entre categorías."
            />
            <MovementsTable history={history} />
          </section>
        )}

        {tab === "clubes" && (
          <section className="space-y-5">
            <SecondaryHeader
              title="Clubes"
              subtitle="Historia, rivalidades y estadísticas de cada equipo."
            />
            <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4">
              <GlassCard className="p-4 max-h-[600px] overflow-y-auto">
                <div className="space-y-2">
                  {clubStats.map((club) => (
                    <button
                      key={club.team}
                      onClick={() => setSelectedClub(club.team)}
                      className={`w-full rounded-lg px-3 py-2 text-left transition-all ${
                        selectedClub === club.team
                          ? "bg-blue-600 text-white"
                          : "bg-white/5 hover:bg-white/10 text-white"
                      }`}
                    >
                      <TeamName team={club.team} small />
                    </button>
                  ))}
                </div>
              </GlassCard>

              <GlassCard className="p-5 text-white overflow-hidden relative">
                {selectedClub ? (
                  (() => {
                    const club = clubStats.find((c) => c.team === selectedClub);

                    if (!club) return null;

                    const h2h = getHeadToHead(club.team, allTeamsEver, history);

                    return (
                      <div className="relative overflow-hidden rounded-2xl p-1">
                        {logos[club.team] && (
                          <img
                            src={logos[club.team]}
                            alt={club.team}
                            className="absolute right-4 top-4 h-80 w-80 object-contain opacity-10 blur-sm pointer-events-none"
                          />
                        )}

                        <div className="relative space-y-5">
                          <div className="flex items-center gap-4">
                            <TeamLogo team={club.team} size="xl" />

                            <div>
                              <h2 className="text-4xl font-black">{club.team}</h2>
                              <p className="text-white/60">Ficha histórica del club</p>
                            </div>
                          </div>

                          <AiClubDescription club={club} history={history} fallback={generateClubText(club)} allClubStats={clubStats} teamPower={teamPower} />

                          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                            <StatCard label="Títulos liga" value={club.titles} />
                            <StatCard label="Copas Argentina" value={club.cupTitles} />
                            <StatCard label="Temporadas en Primera" value={club.seasons} />
                            <StatCard label="Descensos" value={club.relegations} />
                            <StatCard label="Ascensos" value={club.promotions} />
                            <StatCard label="Puntos históricos" value={club.historicalPoints} />
                            <StatCard
                              label="Fuerza inicial"
                              value={strengths[club.team] ?? 60}
                              sub="Base del save"
                            />
                            <StatCard
                              label="Fuerza actual"
                              value={getTeamPower(club.team, teamPower)}
                              sub={`Inicial ${strengths[club.team] ?? 60}`}
                            />
                          </div>

                          <div>
                            <h3 className="text-2xl font-black mb-3">Historial contra clubes</h3>

                            {h2h.length === 0 ? (
                              <p className="text-white/65">Todavía no hay partidos históricos suficientes para este club.</p>
                            ) : (
                              <div className="overflow-auto rounded-xl border border-white/10 bg-black/35 max-h-[360px]">
                                <table className="w-full text-sm">
                                  <thead className="bg-black/70">
                                    <tr>
                                      <th className="p-3 text-left">Rival</th>
                                      <th>PJ</th>
                                      <th>G</th>
                                      <th>E</th>
                                      <th>P</th>
                                      <th>GF</th>
                                      <th>GC</th>
                                    </tr>
                                  </thead>

                                  <tbody>
                                    {h2h.map((row) => (
                                      <tr key={row.rival} className="border-t border-white/10 hover:bg-white/10">
                                        <td className="p-3 font-semibold">
                                          <TeamName team={row.rival} small />
                                        </td>

                                        <td className="text-center">{row.pj}</td>
                                        <td className="text-center text-emerald-300 font-bold">{row.wins}</td>
                                        <td className="text-center">{row.draws}</td>
                                        <td className="text-center text-red-300 font-bold">{row.losses}</td>
                                        <td className="text-center">{row.gf}</td>
                                        <td className="text-center">{row.gc}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })()
                ) : (
                  <div className="h-full flex items-center justify-center text-white/60">Seleccioná un club.</div>
                )}
              </GlassCard>
            </div>
          </section>
        )}

        {tab === "anios" && (
          <section className="space-y-5">
            <SecondaryHeader
              title="Temporadas"
              subtitle="Consultá cómo terminó cada año del simulador."
            />
            {history.length === 0 ? (
              <p className="text-white/70">Todavía no hay temporadas guardadas.</p>
            ) : (
              <>
                <select
                  className="border border-white/10 rounded-xl p-3 bg-black/70 text-white font-bold"
                  value={selectedYear ?? ""}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                >
                  <option value="">Elegí una temporada</option>

                  {history.map((season) => (
                    <option key={season.year} value={season.year}>
                      Año {season.year}
                    </option>
                  ))}
                </select>

                {selectedYear && (
                  <div className="space-y-6">
                    <h2 className="text-2xl font-black text-white">Año {selectedYear} - Liga Profesional Argentina</h2>

                    <HistoricTable rows={history.find((s) => s.year === selectedYear)?.primera ?? []} />

                    <h2 className="text-2xl font-black text-white">Año {selectedYear} - Primera B Nacional</h2>

                    <HistoricTable rows={history.find((s) => s.year === selectedYear)?.b ?? []} />

                    <GlassCard className="p-5 text-white">
                      <div className="flex items-center gap-4">
                        <CupLogo size="lg" />

                        <div>
                          <h2 className="text-2xl font-black text-white">Copa Argentina Año {selectedYear}</h2>

                          <p className="text-white/65">
                            Campeón: {history.find((s) => s.year === selectedYear)?.cupChampion ?? "Sin registro"}
                          </p>
                        </div>
                      </div>
                    </GlassCard>

                    <GlassCard className="p-5 text-white">
                      <h2 className="text-2xl font-black mb-3">Promoción</h2>

                      {(() => {
                        const season = history.find((s) => s.year === selectedYear);

                        if (!season) return null;

                        return (
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="rounded-xl bg-yellow-500/15 border border-yellow-400/20 p-4">
                              <p className="font-black mb-2">Primera</p>
                              <TeamName team={season.promotionTeamA?.team ?? "-"} />
                            </div>

                            <div className="rounded-xl bg-yellow-500/15 border border-yellow-400/20 p-4">
                              <p className="font-black mb-2">B Nacional</p>
                              <TeamName team={season.promotionTeamB?.team ?? "-"} />
                            </div>

                            <div className="rounded-xl bg-emerald-500/15 border border-emerald-400/20 p-4">
                              <p className="font-black mb-2">Ganador</p>
                              <TeamName team={season.promotionWinner ?? "-"} />
                            </div>
                          </div>
                        );
                      })()}
                    </GlassCard>
                  </div>
                )}
              </>
            )}
          </section>
        )}
      </div>
    </main>
  );
}
