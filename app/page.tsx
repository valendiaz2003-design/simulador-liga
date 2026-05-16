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
  top3: Row[];
  relegated: Row[];
  relegatedByTable?: Row;
  relegatedByAverage?: Row;
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

type LeagueKey = "primera" | "b";
type ThemeMode = "dark" | "light";
type TabKey = "inicio" | "fixture" | "historica" | "campeonatos" | "promedios" | "movimientos" | "copa" | "clubes" | "anios";

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
  tab: TabKey;
  theme: ThemeMode;
  cup?: CupTournament;
};

const STORAGE_KEY = "liga-manager-save-v2";

const initialPrimera = [
  "River", "Boca Jrs", "Racing", "Independiente", "San Lorenzo",
  "Estudiantes", "Velez", "Rosario Central", "Lanus", "Newels",
  "Talleres", "Argentinos Jrs", "Huracan", "Belgrano", "Platense",
  "Banfield", "Tigre", "Union", "Instituto", "Barracas",
];

const initialB = [
  "Defenza & Justicia", "Atl. Tucuman", "Central Cordoba", "Sarmiento", "Riestra",
  "Aldosivi", "Gimnacia LP", "Ind Rivadavia", "Gimnacia Mendoza", "Est Rio Cuarto",
  "Chacarita", "Quilmes", "Ferro", "Chicago", "Colon",
  "Godoy Cruz", "Arsenal", "Patronato", "Temperley", "Moron",
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
      matches.push({ id: `${round}-${i}-${home}-${away}`, round, home, away, hg: null, ag: null });
    }
    rounds.push({ round, matches });
    const last = rotation.pop();
    if (last) rotation.splice(1, 0, last);
  }

  return rounds;
}

function simulateGoals(team: string, rival: string) {
  const diff = (strengths[team] ?? 60) - (strengths[rival] ?? 60);
  const bonus = diff / 650;
  const r = Math.random() + bonus;

  if (r < 0.26) return 0;
  if (r < 0.53) return 1;
  if (r < 0.76) return 2;
  if (r < 0.9) return 3;
  if (r < 0.97) return 4;
  if (r < 0.995) return 5;
  return 6;
}

function simulateOne(match: Match): Match {
  return {
    ...match,
    hg: simulateGoals(match.home, match.away),
    ag: simulateGoals(match.away, match.home),
  };
}

function simulateRemainingFixture(fixture: Round[]) {
  return fixture.map((round) => ({
    ...round,
    matches: round.matches.map((match) => (match.hg === null || match.ag === null ? simulateOne(match) : match)),
  }));
}

function buildTable(teams: string[], fixture: Round[]): Row[] {
  const table: Record<string, Row> = {};
  teams.forEach((team) => {
    table[team] = { team, pts: 0, pj: 0, pg: 0, pe: 0, pp: 0, gf: 0, gc: 0, dg: 0 };
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
  return fixture.reduce((acc, round) => acc + round.matches.filter((match) => match.hg !== null && match.ag !== null).length, 0);
}

function totalMatches(fixture: Round[]) {
  return fixture.reduce((acc, round) => acc + round.matches.length, 0);
}

function getAverageRows(history: SeasonRecord[], currentTable: Row[]): AverageRow[] {
  return currentTable
    .map((teamRow) => {
      const pastRows = history
        .slice(-2)
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

function generateCup(teams: string[]): CupTournament {
  const shuffled = shuffle(teams).slice(0, 32);
  const names = ["16avos", "Octavos", "Cuartos", "Semifinal", "Final"];
  const rounds: CupRound[] = names.map((name) => ({ name, matches: [] }));

  rounds[0].matches = [];
  for (let i = 0; i < shuffled.length; i += 2) {
    rounds[0].matches.push({ home: shuffled[i], away: shuffled[i + 1], hg: null, ag: null, winner: null });
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
    rounds: cup.rounds.map((round) => ({ ...round, matches: round.matches.map((match) => ({ ...match })) })),
  };

  const current = nextCup.rounds[nextCup.currentRoundIndex];
  if (!current || current.matches.length === 0) return nextCup;

  const winners = current.matches.map(cupMatchWinner);
  if (winners.some((winner) => !winner)) return nextCup;

  if (nextCup.currentRoundIndex === nextCup.rounds.length - 1) {
    nextCup.champion = winners[0] ?? null;
    return nextCup;
  }

  const nextRound = nextCup.rounds[nextCup.currentRoundIndex + 1];
  if (nextRound.matches.length === 0) {
    for (let i = 0; i < winners.length; i += 2) {
      nextRound.matches.push({ home: winners[i]!, away: winners[i + 1]!, hg: null, ag: null, winner: null });
    }
  }

  nextCup.currentRoundIndex += 1;
  return nextCup;
}

function simulateCupResult(home: string, away: string): Pick<CupMatch, "hg" | "ag" | "winner"> {
  const hg = simulateGoals(home, away);
  const ag = simulateGoals(away, home);
  const winner = hg > ag ? home : ag > hg ? away : Math.random() > 0.5 ? home : away;

  return { hg, ag, winner };
}

function simulateWholeCup(cup: CupTournament): CupTournament {
  let nextCup: CupTournament = {
    ...cup,
    rounds: cup.rounds.map((round) => ({ ...round, matches: round.matches.map((match) => ({ ...match })) })),
  };

  while (!nextCup.champion) {
    const round = nextCup.rounds[nextCup.currentRoundIndex];
    if (!round) break;

    round.matches = round.matches.map((match) => {
      if (match.hg !== null && match.ag !== null && match.winner) return match;
      return { ...match, ...simulateCupResult(match.home, match.away) };
    });

    const advanced = advanceCup(nextCup);
    if (advanced === nextCup && !advanced.champion) break;
    nextCup = advanced;
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
  const news: string[] = [];

  if (table[0]) news.push(`${table[0].team} lidera el campeonato.`);
  if (table[table.length - 1]) news.push(`${table[table.length - 1].team} está último en la tabla.`);
  if (champion) news.push(`${champion} salió campeón de la Liga Profesional.`);
  if (cupChampion) news.push(`${cupChampion} ganó la Copa Argentina.`);

  return shuffle(news).slice(0, 3);
}

function getRelegations(history: SeasonRecord[], finalTable: Row[]) {
  const byTable = finalTable[finalTable.length - 1];
  const averageRows = getAverageRows(history, finalTable);
  const lowestAverage = [...averageRows].reverse().find((row) => row.team !== byTable.team);
  const byAverage = finalTable.find((row) => row.team === lowestAverage?.team) ?? finalTable[finalTable.length - 2];
  return { byTable, byAverage, relegated: [byTable, byAverage] };
}

function TeamLogo({ team, size = "md" }: { team?: string; size?: "xs" | "sm" | "md" | "lg" | "xl" }) {
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
      <div className={`${sizeClass} rounded-full bg-slate-600/60 border border-white/15 shrink-0 grid place-items-center text-[10px] font-black text-white/75`}>
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
  const sizeClass = size === "lg" ? "h-14 w-14" : size === "sm" ? "h-8 w-8" : "h-12 w-12";

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

function TeamName({ team, align = "left", small = false }: { team?: string; align?: "left" | "right"; small?: boolean }) {
  const safeTeam = team ?? "-";
  return (
    <div className={`flex items-center gap-2 min-w-0 ${align === "right" ? "justify-end text-right" : "justify-start text-left"}`}>
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

function StatCard({ label, value, sub }: { label: string; value: React.ReactNode; sub?: string }) {
  return (
    <div className="rounded-xl bg-white/[0.08] border border-white/10 shadow-sm px-4 py-3 backdrop-blur text-white">
      <p className="text-xs uppercase tracking-wide text-white/55 font-bold">{label}</p>
      <div className="text-xl font-black truncate">{value}</div>
      {sub && <p className="text-xs text-white/55 truncate">{sub}</p>}
    </div>
  );
}

function GlassCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`glass-card rounded-2xl bg-[#071118]/82 border border-white/10 shadow-2xl backdrop-blur-xl ${className}`}>
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
      if (index >= total - 2) return "bg-red-500/18";
      return "bg-white/[0.025]";
    }
    if (type === "b") {
      if (index <= 1) return "bg-emerald-500/18";
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
            <tr key={row.team} className={`border-t border-white/10 transition-all hover:bg-white/10 ${rowClass(index, rows.length)}`}>
              <td className="text-center p-2 font-bold text-white/80">{index + 1}</td>
              <td className="p-2 font-semibold whitespace-nowrap min-w-[180px]"><TeamName team={row.team} small /></td>
              <td className="text-center font-black">{row.pts}</td>
              <td className="text-center">{row.pj}</td>
              <td className="text-center">{row.pg}</td>
              <td className="text-center">{row.pe}</td>
              <td className="text-center">{row.pp}</td>
              <td className="text-center">{row.gf}</td>
              <td className="text-center">{row.gc}</td>
              <td className={`text-center font-bold ${row.dg > 0 ? "text-emerald-300" : row.dg < 0 ? "text-red-300" : ""}`}>{row.dg}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MatchCard({ match, onUpdate, onSimulate }: { match: Match; onUpdate: (id: string, hg: number | null, ag: number | null) => void; onSimulate: (match: Match) => void }) {
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
            onChange={(e) => onUpdate(match.id, e.target.value === "" ? null : Number(e.target.value), match.ag)}
          />
          <span className="text-center font-black text-white/70">-</span>
          <input
            className="h-8 rounded-lg border border-white/10 bg-white/[0.08] text-white text-center font-black text-sm outline-none focus:ring-2 focus:ring-blue-500"
            value={match.ag ?? ""}
            onChange={(e) => onUpdate(match.id, match.hg, e.target.value === "" ? null : Number(e.target.value))}
          />
        </div>

        <div className={`${awayWon ? "font-black" : "font-semibold"}`}>
          <TeamName team={match.away} small />
        </div>

        <button onClick={() => onSimulate(match)} className="rounded-lg bg-white/8 hover:bg-white/15 text-white px-3 py-1.5 text-xs font-bold transition-colors">
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
}: {
  name: string;
  type: LeagueKey;
  teams: string[];
  fixture: Round[];
  setFixture: React.Dispatch<React.SetStateAction<Round[]>>;
  roundIndex: number;
  setRoundIndex: React.Dispatch<React.SetStateAction<number>>;
}) {
  const table = useMemo(() => buildTable(teams, fixture), [teams, fixture]);
  const currentRound = fixture[roundIndex] ?? fixture[0];
  const leader = table[0];
  const playedInRound = currentRound.matches.filter((m) => m.hg !== null && m.ag !== null).length;
  const isB = type === "b";

  function updateMatch(id: string, hg: number | null, ag: number | null) {
    setFixture((old) => old.map((round) => ({
      ...round,
      matches: round.matches.map((match) => match.id === id ? { ...match, hg, ag } : match),
    })));
  }

  function simulateMatch(match: Match) {
    playSound("match");
    updateMatch(match.id, simulateGoals(match.home, match.away), simulateGoals(match.away, match.home));
  }

  function simulateRound() {
    playSound("match");
    setFixture((old) => old.map((round) => round.round === currentRound.round ? { ...round, matches: round.matches.map((match) => simulateOne(match)) } : round));
  }

  return (
    <section className="space-y-4 animate-[fadeIn_.25s_ease-out] max-w-[1360px] mx-auto">
      <GlassCard className={`p-4 overflow-hidden relative ${isB ? "border-amber-300/20" : "border-blue-300/20"}`}>
        <div className={`absolute inset-0 opacity-25 ${isB ? "bg-[radial-gradient(circle_at_top_right,#f59e0b,transparent_34%)]" : "bg-[radial-gradient(circle_at_top_right,#2563eb,transparent_34%)]"}`} />
        <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <TournamentLogo league={type} />
            <div>
              <p className={`text-xs uppercase tracking-[0.35em] font-black ${isB ? "text-amber-200" : "text-blue-200"}`}>Temporada actual</p>
              <h2 className="text-3xl md:text-4xl font-black tracking-tight text-white">{name}</h2>
              <p className="text-sm text-white/65">Fecha {currentRound.round} · {playedInRound}/{currentRound.matches.length} partidos jugados</p>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 min-w-[320px]">
            <div className="rounded-xl bg-white/[0.07] border border-white/10 p-3">
              <p className="text-xs text-white/55 font-bold uppercase">Líder</p>
              <div className="mt-1 text-white"><TeamName team={leader?.team ?? "-"} small /></div>
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
              <button onClick={() => setRoundIndex(Math.max(0, roundIndex - 1))} className="border border-white/10 bg-white/8 px-3 py-2 rounded-lg font-bold hover:bg-white/15 text-white">Anterior</button>
              <div className={`${isB ? "bg-amber-500" : "bg-blue-600"} rounded-lg text-white px-4 py-2 font-black shadow`}>Fecha {currentRound.round}</div>
              <button onClick={() => setRoundIndex(Math.min(fixture.length - 1, roundIndex + 1))} className="border border-white/10 bg-white/8 px-3 py-2 rounded-lg font-bold hover:bg-white/15 text-white">Siguiente</button>
            </div>
            <button className="text-sm text-white/70 underline" type="button">Fixture completo</button>
          </div>

          <div className="rounded-xl border border-white/10 bg-black/20 overflow-hidden max-h-[560px] overflow-y-auto">
            {currentRound.matches.map((match) => (
              <MatchCard key={match.id} match={match} onUpdate={updateMatch} onSimulate={simulateMatch} />
            ))}
          </div>

          <button onClick={simulateRound} className="mt-3 w-full bg-gradient-to-r from-slate-950 to-blue-950 hover:brightness-110 text-white px-4 py-3 rounded-xl font-black shadow-lg transition-all">
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

function FixtureFullView({ title, fixture, league }: { title: string; fixture: Round[]; league: LeagueKey }) {
  return (
    <GlassCard className="p-5 space-y-4 text-white">
      <div className="flex items-center gap-3">
        <TournamentLogo league={league} />
        <h2 className="text-2xl font-black">{title}</h2>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {fixture.map((round) => (
          <details key={`${league}-${round.round}`} className="rounded-xl border border-white/10 bg-white/[0.04] p-4" open={round.round === 1}>
            <summary className="cursor-pointer font-black text-lg">Fecha {round.round}</summary>
            <div className="mt-3 space-y-2">
              {round.matches.map((match) => (
                <div key={match.id} className="grid grid-cols-[1fr_68px_1fr] gap-3 items-center rounded-lg bg-black/25 px-3 py-2 text-sm">
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
  const rows = useMemo(() => {
    const titles: Record<string, number> = {};
    teams.forEach((team) => { titles[team] = 0; });
    history.forEach((season) => { titles[season.champion.team] = (titles[season.champion.team] ?? 0) + 1; });
    return Object.entries(titles).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  }, [history, teams]);

  return (
    <div className="overflow-auto rounded-xl border border-white/10 bg-black/35 backdrop-blur-xl shadow-xl text-white">
      <table className="w-full text-sm">
        <thead className="bg-black/75 text-white">
          <tr><th className="p-3">#</th><th className="p-3 text-left">Equipo</th><th>Campeonatos</th></tr>
        </thead>
        <tbody>
          {rows.map(([team, titles], index) => (
            <tr key={team} className="border-t border-white/10 hover:bg-white/10">
              <td className="text-center p-3 font-bold">{index + 1}</td>
              <td className="p-3 font-semibold"><TeamName team={team} small /></td>
              <td className="text-center font-black text-lg">{titles}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function BestWorstStats({ history }: { history: SeasonRecord[] }) {
  const stats = useMemo(() => {
    const allPrimera = history.flatMap((season) => season.primera.map((row) => ({ ...row, year: season.year })));
    const best = [...allPrimera].sort((a, b) => b.pts - a.pts || b.dg - a.dg)[0];
    const worst = [...allPrimera].sort((a, b) => a.pts - b.pts || a.dg - b.dg)[0];
    const mostGoals = [...allPrimera].sort((a, b) => b.gf - a.gf)[0];
    const bestDefense = [...allPrimera].sort((a, b) => a.gc - b.gc)[0];
    return { best, worst, mostGoals, bestDefense };
  }, [history]);

  if (!history.length) return null;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <StatCard label="Mejor campaña" value={stats.best ? `${stats.best.team} · ${stats.best.pts}` : "-"} sub={stats.best ? `Año ${stats.best.year}` : undefined} />
      <StatCard label="Peor campaña" value={stats.worst ? `${stats.worst.team} · ${stats.worst.pts}` : "-"} sub={stats.worst ? `Año ${stats.worst.year}` : undefined} />
      <StatCard label="Más goleador" value={stats.mostGoals ? `${stats.mostGoals.team} · ${stats.mostGoals.gf}` : "-"} sub={stats.mostGoals ? `Año ${stats.mostGoals.year}` : undefined} />
      <StatCard label="Mejor defensa" value={stats.bestDefense ? `${stats.bestDefense.team} · ${stats.bestDefense.gc}` : "-"} sub={stats.bestDefense ? `Año ${stats.bestDefense.year}` : undefined} />
    </div>
  );
}

function AverageTable({ history, currentTable }: { history: SeasonRecord[]; currentTable: Row[] }) {
  const rows = useMemo(() => getAverageRows(history, currentTable), [history, currentTable]);
  const dangerTeams = new Set(rows.slice(-2).map((row) => row.team));

  return (
    <div className="overflow-auto rounded-xl border border-white/10 bg-black/35 backdrop-blur-xl shadow-xl text-white">
      <table className="w-full text-sm">
        <thead className="bg-black/70 text-white">
          <tr><th className="p-3">#</th><th className="p-3 text-left">Equipo</th><th>Pts</th><th>PJ</th><th>Temp.</th><th>Promedio</th></tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={row.team} className={`border-t border-white/10 ${dangerTeams.has(row.team) ? "bg-red-500/25" : index < 4 ? "bg-emerald-500/15" : "bg-white/[0.03]"}`}>
              <td className="text-center p-3 font-bold text-white">{index + 1}</td>
              <td className="p-3 font-semibold"><TeamName team={row.team} small /></td>
              <td className="text-center font-bold">{row.pts}</td>
              <td className="text-center">{row.pj}</td>
              <td className="text-center">{row.temporadas}</td>
              <td className="text-center font-black">{row.promedio.toFixed(3)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="p-3 text-xs text-white/60">* El promedio se calcula con los años disponibles. Si un equipo tiene menos de 3 temporadas, divide solo por sus partidos disponibles.</p>
    </div>
  );
}

function MovementsTable({ history }: { history: SeasonRecord[] }) {
  if (!history.length) return <p className="text-white/70">Todavía no hay ascensos ni descensos registrados.</p>;
  return (
    <div className="space-y-4">
      {history.map((season) => (
        <GlassCard key={season.year} className="p-5 text-white">
          <h2 className="text-2xl font-black mb-3">Año {season.year}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-xl bg-yellow-500/15 border border-yellow-400/20 p-4">
              <p className="font-black mb-2">Campeón</p>
              <TeamName team={season.champion.team} />
            </div>
            <div className="rounded-xl bg-red-500/15 border border-red-400/20 p-4">
              <p className="font-black mb-2">Descendidos</p>
              <div className="space-y-2">
                <div><span className="text-xs text-white/60">Tabla general</span><TeamName team={season.relegatedByTable?.team ?? season.relegated[0]?.team} small /></div>
                <div><span className="text-xs text-white/60">Promedios</span><TeamName team={season.relegatedByAverage?.team ?? season.relegated[1]?.team} small /></div>
              </div>
            </div>
            <div className="rounded-xl bg-emerald-500/15 border border-emerald-400/20 p-4">
              <p className="font-black mb-2">Ascendidos</p>
              <div className="space-y-2">{season.promoted.map((row) => <TeamName key={row.team} team={row.team} small />)}</div>
            </div>
          </div>
        </GlassCard>
      ))}
    </div>
  );
}

function RelegationPreview({ history, table }: { history: SeasonRecord[]; table: Row[] }) {
  const { byTable, byAverage } = getRelegations(history, table);
  return (
    <GlassCard className="p-5 text-white h-fit">
      <h2 className="text-2xl font-black mb-4">Descensos</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="rounded-xl bg-white/[0.06] border border-white/10 p-4 text-center">
          <p className="font-bold">Por tabla general</p>
          <p className="text-xs text-white/55 mb-3">Último desciende a Primera B</p>
          <div className="flex justify-center"><TeamName team={byTable?.team ?? "-"} small /></div>
        </div>
        <div className="rounded-xl bg-white/[0.06] border border-white/10 p-4 text-center">
          <p className="font-bold">Por promedios</p>
          <p className="text-xs text-white/55 mb-3">Peor promedio desciende</p>
          <div className="flex justify-center"><TeamName team={byAverage?.team ?? "-"} small /></div>
        </div>
      </div>
      <p className="mt-4 text-xs text-white/55">* Descienden 2: uno por tabla general y uno por promedios.</p>
    </GlassCard>
  );
}

function playSound(type: "click" | "champion" | "match" | "season" = "click") {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const audio = new AudioContextClass();
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();

    oscillator.type = type === "champion" || type === "season" ? "triangle" : type === "match" ? "square" : "sine";
    oscillator.frequency.value = type === "season" ? 523 : type === "champion" ? 660 : type === "match" ? 260 : 420;
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
    // Sound is optional. Some browsers block audio in specific contexts.
  }
}

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [tab, setTab] = useState<TabKey>("inicio");
  const [activeLeague, setActiveLeague] = useState<LeagueKey>("primera");
  const [theme, setTheme] = useState<ThemeMode>("dark");
  const [year, setYear] = useState(1);
  const [primeraTeams, setPrimeraTeams] = useState(initialPrimera);
  const [bTeams, setBTeams] = useState(initialB);
  const [fixtureA, setFixtureA] = useState<Round[]>([]);
  const [fixtureB, setFixtureB] = useState<Round[]>([]);
  const [roundIndexA, setRoundIndexA] = useState(0);
  const [roundIndexB, setRoundIndexB] = useState(0);
  const [history, setHistory] = useState<SeasonRecord[]>([]);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [summary, setSummary] = useState<SeasonRecord | null>(null);
  const [cup, setCup] = useState<CupTournament>(() => generateCup([...initialPrimera, ...initialB]));
  const [selectedClub, setSelectedClub] = useState<string | null>(null);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const data = JSON.parse(saved) as SavedGame;
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
        setTab(data.tab ?? "inicio");
        setTheme(data.theme ?? "dark");
        setCup(data.cup ?? generateCup([...(data.primeraTeams ?? initialPrimera), ...(data.bTeams ?? initialB)]));
      } else {
        setFixtureA(generateFixture(initialPrimera));
        setFixtureB(generateFixture(initialB));
      }
    } catch {
      setFixtureA(generateFixture(initialPrimera));
      setFixtureB(generateFixture(initialB));
    } finally {
      setMounted(true);
    }
  }, []);

  useEffect(() => {
    if (!mounted || fixtureA.length === 0 || fixtureB.length === 0) return;
    const data: SavedGame = { year, primeraTeams, bTeams, fixtureA, fixtureB, roundIndexA, roundIndexB, history, selectedYear, activeLeague, tab, theme, cup };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [mounted, year, primeraTeams, bTeams, fixtureA, fixtureB, roundIndexA, roundIndexB, history, selectedYear, activeLeague, tab, theme, cup]);

  const tableA = useMemo(() => buildTable(primeraTeams, fixtureA), [primeraTeams, fixtureA]);
  const tableB = useMemo(() => buildTable(bTeams, fixtureB), [bTeams, fixtureB]);
  const finished = fixtureA.length > 0 && fixtureB.length > 0 && isSeasonFinished(fixtureA) && isSeasonFinished(fixtureB);

  const lastChampion = history[history.length - 1]?.champion;
  const maxWinner = useMemo(() => {
    const titles: Record<string, number> = {};
    history.forEach((season) => { titles[season.champion.team] = (titles[season.champion.team] ?? 0) + 1; });
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

  const news = useMemo(() => generateNews(tableA, history[history.length - 1]?.champion.team, cup.champion), [tableA, history, cup]);

  const clubStats = useMemo(() => {
    const stats: Record<string, ClubStats> = {};

    [...initialPrimera, ...initialB].forEach((team) => {
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
        if (!stats[row.team]) return;
        stats[row.team].historicalPoints += row.pts;
        stats[row.team].seasons += 1;
      });

      stats[season.champion.team].titles += 1;
      if (season.cupChampion && stats[season.cupChampion]) stats[season.cupChampion].cupTitles += 1;

      season.relegated.forEach((r) => {
        if (stats[r.team]) stats[r.team].relegations += 1;
      });

      season.promoted.forEach((p) => {
        if (stats[p.team]) stats[p.team].promotions += 1;
      });
    });

    if (cup.champion && stats[cup.champion]) {
      stats[cup.champion].cupTitles += 1;
    }

    return Object.values(stats).sort((a, b) => b.historicalPoints - a.historicalPoints);
  }, [history, cup]);

  const historicalTable = useMemo(() => {
    const total: Record<string, Row> = {};
    history.forEach((season) => {
      season.primera.forEach((row) => {
        if (!total[row.team]) total[row.team] = { team: row.team, pts: 0, pj: 0, pg: 0, pe: 0, pp: 0, gf: 0, gc: 0, dg: 0 };
        total[row.team].pts += row.pts;
        total[row.team].pj += row.pj;
        total[row.team].pg += row.pg;
        total[row.team].pe += row.pe;
        total[row.team].pp += row.pp;
        total[row.team].gf += row.gf;
        total[row.team].gc += row.gc;
      });
    });
    return Object.values(total).map((row) => ({ ...row, dg: row.gf - row.gc })).sort((a, b) => b.pts - a.pts || b.dg - a.dg || b.gf - a.gf);
  }, [history]);

  if (!mounted || fixtureA.length === 0 || fixtureB.length === 0) {
    return <main className="min-h-screen bg-[#071015] text-white flex items-center justify-center"><p className="text-xl font-bold">Cargando simulador...</p></main>;
  }

  function closeSeason(nextFixtureA = fixtureA, nextFixtureB = fixtureB, nextCup = cup) {
    const finalCup = nextCup.champion ? nextCup : simulateWholeCup(nextCup);
    const finalTableA = buildTable(primeraTeams, nextFixtureA);
    const finalTableB = buildTable(bTeams, nextFixtureB);
    const top3 = finalTableA.slice(0, 3);
    const { byTable, byAverage, relegated } = getRelegations(history, finalTableA);
    const promoted = finalTableB.slice(0, 2);
    const record: SeasonRecord = {
      year,
      primera: finalTableA,
      b: finalTableB,
      top3,
      relegated,
      relegatedByTable: byTable,
      relegatedByAverage: byAverage,
      promoted,
      champion: finalTableA[0],
      cupChampion: finalCup.champion,
      cupRounds: finalCup.rounds,
    };

    setHistory((old) => [...old, record]);
    setSummary(record);
    playSound("season");

    const nextPrimera = [
      ...primeraTeams.filter((team) => !relegated.some((r) => r.team === team)),
      ...promoted.map((p) => p.team),
    ];
    const nextB = [
      ...bTeams.filter((team) => !promoted.some((p) => p.team === team)),
      ...relegated.map((r) => r.team),
    ];

    setPrimeraTeams(nextPrimera);
    setBTeams(nextB);
    setFixtureA(generateFixture(nextPrimera));
    setFixtureB(generateFixture(nextB));
    setRoundIndexA(0);
    setRoundIndexB(0);
    setYear((old) => old + 1);
    setActiveLeague("primera");
    setCup(generateCup([...nextPrimera, ...nextB]));
    setTheme("dark");
  }

  function nextSeason() {
    if (!finished) return;
    playSound("season");
    closeSeason();
  }

  function simulateFullSeason() {
    const ok = window.confirm("¿Simular todos los partidos restantes de ambas categorías?");
    if (!ok) return;
    playSound("click");
    const fullA = simulateRemainingFixture(fixtureA);
    const fullB = simulateRemainingFixture(fixtureB);
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
    const fullA = simulateRemainingFixture(fixtureA);
    const fullB = simulateRemainingFixture(fixtureB);
    const fullCup = simulateWholeCup(cup);
    closeSeason(fullA, fullB, fullCup);
  }

  function resetGame() {
    const ok = window.confirm("¿Seguro que querés reiniciar todo el juego? Se borrará el historial y el autoguardado.");
    if (!ok) return;
    playSound("click");
    window.localStorage.removeItem(STORAGE_KEY);
    setYear(1);
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
    setCup(generateCup([...initialPrimera, ...initialB]));
  }

  const currentCupRound = cup.rounds[cup.currentRoundIndex] ?? cup.rounds[0];

  function updateCupMatch(matchIndex: number, hg: number | null, ag: number | null) {
    setCup((old) => {
      const next: CupTournament = {
        ...old,
        rounds: old.rounds.map((round) => ({ ...round, matches: round.matches.map((match) => ({ ...match })) })),
      };

      const match = next.rounds[next.currentRoundIndex]?.matches[matchIndex];
      if (!match) return old;

      match.hg = hg;
      match.ag = ag;
      match.winner = hg === null || ag === null ? null : hg === ag ? match.winner ?? (Math.random() > 0.5 ? match.home : match.away) : hg > ag ? match.home : match.away;
      return advanceCup(next);
    });
  }

  function simulateCupMatch(matchIndex: number) {
    playSound("match");
    setCup((old) => {
      const next: CupTournament = {
        ...old,
        rounds: old.rounds.map((round) => ({ ...round, matches: round.matches.map((match) => ({ ...match })) })),
      };

      const match = next.rounds[next.currentRoundIndex]?.matches[matchIndex];
      if (!match) return old;

      Object.assign(match, simulateCupResult(match.home, match.away));
      const advanced = advanceCup(next);
      if (advanced.champion) playSound("champion");
      return advanced;
    });
  }

  function simulateCupRound() {
    playSound("match");
    setCup((old) => {
      const next: CupTournament = {
        ...old,
        rounds: old.rounds.map((round) => ({ ...round, matches: round.matches.map((match) => ({ ...match })) })),
      };
      const round = next.rounds[next.currentRoundIndex];
      if (!round) return old;

      round.matches = round.matches.map((match) => {
        if (match.hg !== null && match.ag !== null) return match;
        return { ...match, ...simulateCupResult(match.home, match.away) };
      });

      const advanced = advanceCup(next);
      if (advanced.champion) playSound("champion");
      return advanced;
    });
  }

  function resetCup() {
    const ok = window.confirm("¿Reiniciar solo la Copa Argentina?");
    if (!ok) return;
    playSound("click");
    setCup(generateCup([...primeraTeams, ...bTeams]));
  }

  const isLight = theme === "light";

  return (
    <main className={`${isLight ? "theme-light bg-slate-100 text-slate-950" : "theme-dark bg-[#071015] text-white"} min-h-screen relative overflow-hidden`}>
      <style jsx global>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes rain { 0% { transform: translate3d(0,-100%,0); } 100% { transform: translate3d(-18px,100%,0); } }
        @keyframes floatParticle { 0%, 100% { transform: translateY(0); opacity: .25; } 50% { transform: translateY(-18px); opacity: .7; } }
        body { background: ${isLight ? "#f1f5f9" : "#071015"}; }
        .theme-light nav { background: rgba(255,255,255,.86) !important; border-color: rgba(15,23,42,.10) !important; }
        .theme-light nav button, .theme-light nav div { color: #0f172a; }
        .theme-light .light-keep-white, .theme-light .light-keep-white * { color: white !important; }
        .theme-light .glass-card { background: rgba(255,255,255,.90) !important; border-color: rgba(15,23,42,.12) !important; box-shadow: 0 18px 45px rgba(15,23,42,.14) !important; }
        .theme-light .glass-card h1,
        .theme-light .glass-card h2,
        .theme-light .glass-card h3,
        .theme-light .glass-card p,
        .theme-light .glass-card span,
        .theme-light .glass-card td,
        .theme-light .glass-card th,
        .theme-light .glass-card button { color: #0f172a; }
        .theme-light table thead { background: #0f172a !important; }
        .theme-light table thead * { color: white !important; }
        .theme-light input { color: #0f172a !important; background: white !important; border-color: rgba(15,23,42,.20) !important; }
        .theme-light .light-keep-blue { color: #2563eb !important; }
      `}</style>

      <div
        className="fixed inset-0 bg-cover bg-[center_top_-140px] bg-no-repeat"
        style={{
          backgroundImage: "url('/backgrounds/stadium.png')",
        }}
      />

      <div className={`fixed inset-0 ${isLight ? "bg-white/62 backdrop-blur-[1px]" : "bg-black/55 backdrop-blur-[2px]"}`} />

      <div className={`fixed inset-0 ${isLight ? "bg-[linear-gradient(180deg,rgba(255,255,255,.76)_0%,rgba(241,245,249,.70)_42%,rgba(226,232,240,.88)_100%)]" : "bg-[linear-gradient(180deg,rgba(0,0,0,.35)_0%,rgba(0,0,0,.45)_40%,rgba(0,0,0,.72)_100%)]"}`} />

      <div className="fixed inset-0 pointer-events-none opacity-10 bg-[repeating-linear-gradient(110deg,rgba(255,255,255,.22)_0px,rgba(255,255,255,.22)_1px,transparent_1px,transparent_30px)] animate-[rain_4s_linear_infinite]" />

      <div className="fixed inset-0 pointer-events-none opacity-20 bg-[radial-gradient(circle_at_top,rgba(255,255,255,.18),transparent_45%)]" />


      <nav className="sticky top-0 z-10 bg-[#061016]/90 backdrop-blur-xl border-b border-white/10 shadow-sm">
        <div className="max-w-[1500px] mx-auto px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-wrap text-sm">
            <button onClick={() => { playSound("click"); setTab("inicio"); }} className={`font-black ${tab === "inicio" ? "text-blue-400" : "text-white/80"}`}>Inicio</button>
            <button onClick={() => { playSound("click"); setTab("fixture"); }} className={`font-black ${tab === "fixture" ? "text-blue-400" : "text-white/80"}`}>Fixture</button>
            <button onClick={() => { playSound("click"); setTab("historica"); }} className={`font-black ${tab === "historica" ? "text-blue-400" : "text-white/80"}`}>Tabla histórica</button>
            <button onClick={() => { playSound("click"); setTab("campeonatos"); }} className={`font-black ${tab === "campeonatos" ? "text-blue-400" : "text-white/80"}`}>Campeonatos</button>
            <button onClick={() => { playSound("click"); setTab("promedios"); }} className={`font-black ${tab === "promedios" ? "text-blue-400" : "text-white/80"}`}>Promedios</button>
            <button onClick={() => { playSound("click"); setTab("movimientos"); }} className={`font-black ${tab === "movimientos" ? "text-blue-400" : "text-white/80"}`}>Ascensos/Descensos</button>
            <button onClick={() => { playSound("click"); setTab("copa"); }} className={`font-black ${tab === "copa" ? "text-blue-400" : "text-white/80"}`}>Copa Argentina</button>
            <button onClick={() => { playSound("click"); setTab("clubes"); }} className={`font-black ${tab === "clubes" ? "text-blue-400" : "text-white/80"}`}>Clubes</button>
            <button onClick={() => { playSound("click"); setTab("anios"); }} className={`font-black ${tab === "anios" ? "text-blue-400" : "text-white/80"}`}>Años</button>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="rounded-lg bg-white/10 border border-white/10 px-4 py-2 font-black hover:bg-white/15"
            >
              {theme === "dark" ? "Modo claro" : "Modo oscuro"}
            </button>
            <div className="rounded-lg bg-emerald-500/10 border border-emerald-400/25 px-3 py-2 leading-tight text-left">
              <span className="block text-xs text-emerald-300 font-black">✓ Guardado</span>
              <span className="block text-xs text-emerald-200/75">automáticamente</span>
            </div>
            <div className="rounded-lg bg-white/10 border border-white/10 px-4 py-2 font-black text-xl">AÑO {year}</div>
            <button onClick={resetGame} className="light-keep-white bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-black shadow">Reiniciar juego</button>
          </div>
        </div>
      </nav>

      <div className="relative w-full max-w-[1500px] mx-auto px-6 py-4 space-y-4">
        <GlassCard className="p-4 text-white max-w-[1360px] mx-auto">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-blue-300 font-black">Noticias</p>
              <div className="space-y-1 mt-2">
                {news.map((item, index) => (
                  <p key={index} className="text-sm text-white/85">📰 {item}</p>
                ))}
              </div>
            </div>
            <div className="rounded-xl bg-white/10 border border-white/10 px-4 py-3 text-center">
              <div className="flex items-center justify-center gap-3">
                <CupLogo size="sm" />
                <div>
                  <p className="text-xs uppercase text-white/55 font-black">Copa Argentina</p>
                  <div className="flex items-center gap-2 justify-center mt-1">
                    <TeamLogo team={cup.champion ?? "-"} size="sm" />
                    <p className="text-lg font-black">{cup.champion}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </GlassCard>
        {summary && (
          <div className="fixed inset-0 bg-black/70 z-20 flex items-center justify-center p-4 backdrop-blur-sm overflow-hidden">
            <div className="absolute left-8 top-1/4 h-2 w-2 rounded-full bg-yellow-300 animate-ping" />
            <div className="absolute left-20 top-1/2 h-3 w-3 rounded-full bg-sky-300 animate-ping" />
            <div className="absolute left-12 bottom-1/4 h-2 w-2 rounded-full bg-red-300 animate-ping" />
            <div className="absolute right-8 top-1/3 h-2 w-2 rounded-full bg-emerald-300 animate-ping" />
            <div className="absolute right-24 top-1/2 h-3 w-3 rounded-full bg-violet-300 animate-ping" />
            <div className="absolute right-12 bottom-1/4 h-2 w-2 rounded-full bg-yellow-300 animate-ping" />
            <GlassCard className="max-w-xl w-full p-6 space-y-5 text-white animate-[fadeIn_.2s_ease-out]">
              <h2 className="text-3xl font-black">Resumen Año {summary.year}</h2>
              <div className="rounded-xl bg-yellow-500/15 p-4 border border-yellow-400/20">
                <h3 className="font-black">Campeón</h3>
                <div className="mt-2"><TeamName team={summary.champion.team} /></div>
              </div>
              <div><h3 className="font-bold">Top 3 Liga Profesional Argentina</h3><ol className="list-decimal ml-6 mt-1 space-y-1">{summary.top3.map((team) => <li key={team.team}>{team.team} - {team.pts} pts</li>)}</ol></div>
              <div className="rounded-xl bg-sky-500/15 p-4 border border-sky-400/20">
                <h3 className="font-black">Copa Argentina</h3>
                <div className="mt-2 flex items-center gap-3"><TeamLogo team={summary.cupChampion ?? "-"} size="sm" /><span>{summary.cupChampion ?? "Sin campeón"}</span></div>
              </div>
              <div>
                <h3 className="font-bold text-red-300">Descendidos</h3>
                <ul className="list-disc ml-6 mt-1">
                  <li>{summary.relegatedByTable?.team ?? summary.relegated[0]?.team} - tabla general</li>
                  <li>{summary.relegatedByAverage?.team ?? summary.relegated[1]?.team} - promedios</li>
                </ul>
              </div>
              <div><h3 className="font-bold text-green-300">Ascendidos</h3><ul className="list-disc ml-6 mt-1">{summary.promoted.map((team) => <li key={team.team}>{team.team}</li>)}</ul></div>
              <button onClick={() => setSummary(null)} className="bg-white text-slate-950 px-5 py-3 rounded-xl font-black">Continuar</button>
            </GlassCard>
          </div>
        )}

        {tab === "inicio" && (
          <>
            <GlassCard className="p-5 space-y-4 max-w-[1360px] mx-auto">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.35em] text-blue-400 font-black">Simulador argentino</p>
                  <h1 className="text-3xl md:text-4xl font-black tracking-tight text-white">Liga Manager</h1>
                  <p className="text-white/75 mt-1">Partidos, tablas, ascensos, descensos, campeonatos, promedios e historia acumulada.</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <button onClick={simulateFullSeason} className="px-5 py-3 rounded-xl font-black shadow-lg bg-black/55 hover:bg-black/75 border border-white/10 text-white">Simular temporada completa</button>
                  <button onClick={simulateAndAdvance} className="px-5 py-3 rounded-xl font-black shadow-lg bg-violet-600 hover:bg-violet-700 text-white">Simular y avanzar</button>
                  <button onClick={nextSeason} disabled={!finished} className={`px-5 py-3 rounded-xl font-black shadow-lg ${finished ? "bg-blue-600 hover:bg-blue-700 text-white" : "bg-white/15 text-white/55 cursor-not-allowed"}`}>Pasar a siguiente temporada</button>
                </div>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <StatCard label="Año actual" value={year} sub="Temporada en curso" />
                <StatCard label="Último campeón" value={lastChampion ? <TeamName team={lastChampion.team} small /> : "-"} sub={lastChampion ? `${lastChampion.pts} puntos` : "Sin temporadas terminadas"} />
                <StatCard label="Máximo ganador" value={maxWinner ? <TeamName team={maxWinner[0]} small /> : "-"} sub={maxWinner ? `${maxWinner[1]} campeonatos` : "Sin títulos todavía"} />
                <StatCard label="Estado" value={finished ? "Finalizada" : "En juego"} sub={`${playedMatches(fixtureA) + playedMatches(fixtureB)}/${totalMatches(fixtureA) + totalMatches(fixtureB)} partidos`} />
              </div>
            </GlassCard>

            <div className="flex gap-3 flex-wrap max-w-[1360px] mx-auto">
              <button onClick={() => { playSound("click"); setActiveLeague("primera"); }} className={`px-4 py-3 rounded-lg font-black shadow-sm border ${activeLeague === "primera" ? "bg-blue-600 text-white border-blue-600" : "bg-black/55 text-white border-white/10"}`}>Liga Profesional Argentina</button>
              <button onClick={() => { playSound("click"); setActiveLeague("b"); }} className={`px-4 py-3 rounded-lg font-black shadow-sm border ${activeLeague === "b" ? "bg-amber-500 text-white border-amber-500" : "bg-black/55 text-white border-white/10"}`}>Primera B Nacional</button>
              <button onClick={() => { playSound("click"); setTab("copa"); }} className={`px-4 py-3 rounded-lg font-black shadow-sm border ${String(tab) === "copa" ? "bg-sky-600 text-white border-sky-600" : "bg-black/55 text-white border-white/10"}`}>Copa Argentina</button>
            </div>

            {activeLeague === "primera" ? (
              <>
                <Zone name="Liga Profesional Argentina" type="primera" teams={primeraTeams} fixture={fixtureA} setFixture={setFixtureA} roundIndex={roundIndexA} setRoundIndex={setRoundIndexA} />
                <div className="grid grid-cols-1 xl:grid-cols-[minmax(760px,1.12fr)_minmax(560px,.88fr)] gap-4 items-start max-w-[1360px] mx-auto -mt-1">
                  <AverageTable history={history} currentTable={tableA} />
                  <RelegationPreview history={history} table={tableA} />
                </div>
              </>
            ) : (
              <Zone name="Primera B Nacional" type="b" teams={bTeams} fixture={fixtureB} setFixture={setFixtureB} roundIndex={roundIndexB} setRoundIndex={setRoundIndexB} />
            )}
          </>
        )}

        {tab === "fixture" && (
          <section className="space-y-5">
            <div>
              <h1 className="text-4xl font-black text-white">Fixture completo</h1>
              <p className="text-white/65">Todas las fechas de cada categoría. Se actualiza con los resultados cargados.</p>
            </div>
            <div className="flex gap-3 flex-wrap">
              <button onClick={() => setActiveLeague("primera")} className={`px-4 py-3 rounded-lg font-black shadow-sm border ${activeLeague === "primera" ? "bg-blue-600 text-white border-blue-600" : "bg-black/55 text-white border-white/10"}`}>Liga Profesional Argentina</button>
              <button onClick={() => setActiveLeague("b")} className={`px-4 py-3 rounded-lg font-black shadow-sm border ${activeLeague === "b" ? "bg-amber-500 text-white border-amber-500" : "bg-black/55 text-white border-white/10"}`}>Primera B Nacional</button>
              <button onClick={() => { playSound("click"); setTab("copa"); }} className={`px-4 py-3 rounded-lg font-black shadow-sm border ${String(tab) === "copa" ? "bg-sky-600 text-white border-sky-600" : "bg-black/55 text-white border-white/10"}`}>Copa Argentina</button>
            </div>
            {activeLeague === "primera" ? <FixtureFullView title="Liga Profesional Argentina" fixture={fixtureA} league="primera" /> : <FixtureFullView title="Primera B Nacional" fixture={fixtureB} league="b" />}
          </section>
        )}

        {tab === "historica" && (
          <section className="space-y-5">
            <div>
              <h1 className="text-4xl font-black text-white">Tabla histórica de Primera División</h1>
              <p className="text-white/65">Acumula solamente las campañas jugadas en Primera.</p>
            </div>
            <BestWorstStats history={history} />
            {historicalTable.length === 0 ? <p className="text-white/70">Todavía no terminaste ninguna temporada.</p> : <HistoricTable rows={historicalTable} />}
          </section>
        )}

        {tab === "campeonatos" && (
          <section className="space-y-5">
            <div>
              <h1 className="text-4xl font-black text-white">Campeonatos ganados</h1>
              <p className="text-white/65">Ranking histórico de campeones de Primera.</p>
            </div>
            <ChampionshipsTable history={history} teams={allTeamsEver} />
          </section>
        )}

        {tab === "promedios" && (
          <section className="space-y-5">
            <div>
              <h1 className="text-4xl font-black text-white">Promedios</h1>
              <p className="text-white/65">Promedio de los equipos de Primera usando las últimas 3 campañas disponibles, incluida la actual.</p>
            </div>
            <AverageTable history={history} currentTable={tableA} />
          </section>
        )}

        {tab === "movimientos" && (
          <section className="space-y-5">
            <div>
              <h1 className="text-4xl font-black text-white">Historial de ascensos y descensos</h1>
              <p className="text-white/65">Registro completo por año.</p>
            </div>
            <MovementsTable history={history} />
          </section>
        )}

        {tab === "copa" && (
          <section className="space-y-5 max-w-[1360px] mx-auto">
            <GlassCard className="p-5 text-white border-sky-400/25 overflow-hidden relative">
              <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_top_right,#38bdf8,transparent_40%)]" />
              <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <CupLogo size="lg" />
                  <div>
                    <p className="text-xs uppercase tracking-[0.35em] text-sky-300 font-black">Copa Argentina</p>
                    <h1 className="text-4xl font-black text-white">{cup.champion ? "Copa finalizada" : cupStageName(currentCupRound)}</h1>
                    <p className="text-white/65">
                      {cup.champion ? `Campeón: ${cup.champion}` : "Jugá la instancia actual para avanzar el cuadro."}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <button onClick={simulateCupRound} disabled={!!cup.champion} className={`px-5 py-3 rounded-xl font-black shadow-lg ${cup.champion ? "bg-white/15 text-white/45 cursor-not-allowed" : "bg-sky-600 hover:bg-sky-700 text-white"}`}>
                    Simular instancia
                  </button>
                  <button onClick={resetCup} className="px-5 py-3 rounded-xl font-black shadow-lg bg-black/55 hover:bg-black/75 border border-white/10 text-white">
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
                  <div className="flex justify-center"><TeamLogo team={cup.champion ?? "-"} size="xl" /></div>
                  <h3 className="mt-4 text-4xl font-black text-white">{cup.champion}</h3>
                  <p className="text-white/65">Campeón de la Copa Argentina</p>
                </div>
              ) : (
                <div className="relative grid grid-cols-1 lg:grid-cols-2 gap-3">
                  {(currentCupRound?.matches ?? []).map((match, index) => (
                    <div key={`${currentCupRound?.name}-${index}`} className="rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 px-4 py-3 transition-all">
                      <div className="grid grid-cols-[1fr_92px_1fr_72px] gap-3 items-center text-sm">
                        <TeamName team={match.home} align="right" small />

                        <div className="grid grid-cols-[34px_18px_34px] items-center justify-center gap-1">
                          <input
                            className="h-8 rounded-lg border border-white/10 bg-white/[0.08] text-white text-center font-black text-sm outline-none focus:ring-2 focus:ring-sky-500"
                            value={match.hg ?? ""}
                            onChange={(e) => updateCupMatch(index, e.target.value === "" ? null : Number(e.target.value), match.ag)}
                          />
                          <span className="text-center font-black text-white/70">-</span>
                          <input
                            className="h-8 rounded-lg border border-white/10 bg-white/[0.08] text-white text-center font-black text-sm outline-none focus:ring-2 focus:ring-sky-500"
                            value={match.ag ?? ""}
                            onChange={(e) => updateCupMatch(index, match.hg, e.target.value === "" ? null : Number(e.target.value))}
                          />
                        </div>

                        <TeamName team={match.away} small />

                        <button onClick={() => simulateCupMatch(index)} className="rounded-lg bg-sky-600/90 hover:bg-sky-500 text-white px-3 py-1.5 text-xs font-bold transition-colors">
                          Jugar
                        </button>
                      </div>

                      {match.winner && (
                        <div className="mt-2 text-center text-xs text-sky-200 font-bold">
                          Clasifica: {match.winner}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </GlassCard>

            <GlassCard className="p-4 text-white">
              <h2 className="text-2xl font-black mb-3">Cuadro de Copa</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-3">
                {cup.rounds.map((round, index) => (
                  <div key={`${round.name}-${index}`} className={`rounded-xl border p-3 ${index === cup.currentRoundIndex && !cup.champion ? "bg-sky-500/15 border-sky-400/35" : "bg-white/5 border-white/10"}`}>
                    <p className="font-black mb-2">{cupStageName(round)}</p>
                    <p className="text-xs text-white/55">{round.matches.length ? `${round.matches.length} partidos` : "Pendiente"}</p>
                  </div>
                ))}
              </div>
            </GlassCard>
          </section>
        )}

        {tab === "clubes" && (
          <section className="space-y-5">
            <div>
              <h1 className="text-4xl font-black text-white">Clubes</h1>
              <p className="text-white/65">Estadísticas históricas de cada equipo.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4">
              <GlassCard className="p-4 max-h-[600px] overflow-y-auto">
                <div className="space-y-2">
                  {clubStats.map((club) => (
                    <button
                      key={club.team}
                      onClick={() => setSelectedClub(club.team)}
                      className={`w-full rounded-lg px-3 py-2 text-left transition-all ${selectedClub === club.team ? "bg-blue-600 text-white" : "bg-white/5 hover:bg-white/10 text-white"}`}
                    >
                      <TeamName team={club.team} small />
                    </button>
                  ))}
                </div>
              </GlassCard>

              <GlassCard className="p-5 text-white">
                {selectedClub ? (
                  (() => {
                    const club = clubStats.find((c) => c.team === selectedClub);
                    if (!club) return null;

                    return (
                      <div className="space-y-5">
                        <div className="flex items-center gap-4">
                          <TeamLogo team={club.team} size="xl" />
                          <div>
                            <h2 className="text-4xl font-black">{club.team}</h2>
                            <p className="text-white/60">Ficha histórica del club</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                          <StatCard label="Títulos liga" value={club.titles} />
                          <StatCard label="Copas Argentina" value={club.cupTitles} />
                          <StatCard label="Temporadas" value={club.seasons} />
                          <StatCard label="Descensos" value={club.relegations} />
                          <StatCard label="Ascensos" value={club.promotions} />
                          <StatCard label="Puntos históricos" value={club.historicalPoints} />
                        </div>
                      </div>
                    );
                  })()
                ) : (
                  <div className="h-full flex items-center justify-center text-white/60">
                    Seleccioná un club.
                  </div>
                )}
              </GlassCard>
            </div>
          </section>
        )}

        {tab === "anios" && (
          <section className="space-y-5">
            <div>
              <h1 className="text-4xl font-black text-white">Años</h1>
              <p className="text-white/65">Consultá cómo terminó cada temporada.</p>
            </div>
            {history.length === 0 ? <p className="text-white/70">Todavía no hay temporadas guardadas.</p> : (
              <>
                <select className="border border-white/10 rounded-xl p-3 bg-black/70 text-white font-bold" value={selectedYear ?? ""} onChange={(e) => setSelectedYear(Number(e.target.value))}>
                  <option value="">Elegí una temporada</option>
                  {history.map((season) => <option key={season.year} value={season.year}>Año {season.year}</option>)}
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
                          <p className="text-white/65">Campeón: {history.find((s) => s.year === selectedYear)?.cupChampion ?? "Sin registro"}</p>
                        </div>
                      </div>
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
