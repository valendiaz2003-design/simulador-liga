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

type SeasonRecord = {
  year: number;
  primera: Row[];
  b: Row[];
  top3: Row[];
  relegated: Row[];
  promoted: Row[];
  champion: Row;
};

type ThemeMode = "dark" | "light";

type LeagueKey = "primera" | "b";

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

function TeamLogo({ team, size = "md" }: { team: string; size?: "xs" | "sm" | "md" | "lg" | "xl" }) {
  const logo = logos[team];
  const sizeClass = {
    xs: "h-4 w-4",
    sm: "h-5 w-5",
    md: "h-7 w-7",
    lg: "h-10 w-10",
    xl: "h-14 w-14",
  }[size];

  if (!logo) {
    return (
      <div className={`${sizeClass} rounded-full bg-slate-300/60 dark:bg-white/10 border border-white/20 shrink-0 grid place-items-center text-[10px] font-black text-slate-600 dark:text-white/70`}>
        {team.slice(0, 1)}
      </div>
    );
  }

  return (
    <img
      src={logo}
      alt={team}
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
      className="h-12 w-12 object-contain hidden sm:block"
      onError={(event) => {
        event.currentTarget.style.display = "none";
      }}
    />
  );
}

function TeamName({ team, align = "left", small = false }: { team: string; align?: "left" | "right"; small?: boolean }) {
  return (
    <div className={`flex items-center gap-2 min-w-0 ${align === "right" ? "justify-end text-right" : "justify-start text-left"}`}>
      {align === "right" ? (
        <>
          <span className="truncate">{team}</span>
          <TeamLogo team={team} size={small ? "sm" : "md"} />
        </>
      ) : (
        <>
          <TeamLogo team={team} size={small ? "sm" : "md"} />
          <span className="truncate">{team}</span>
        </>
      )}
    </div>
  );
}

function StatCard({ label, value, sub }: { label: string; value: React.ReactNode; sub?: string }) {
  return (
    <div className="rounded-2xl bg-white/80 dark:bg-white/10 border border-black/5 dark:border-white/10 shadow-sm px-4 py-3 backdrop-blur">
      <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-white/55 font-bold">{label}</p>
      <div className="text-xl font-black text-slate-950 dark:text-white truncate">{value}</div>
      {sub && <p className="text-xs text-slate-500 dark:text-white/55 truncate">{sub}</p>}
    </div>
  );
}

function StandingsTable({ rows, type }: { rows: Row[]; type?: LeagueKey }) {
  function rowClass(index: number, total: number) {
    if (type === "primera") {
      if (index === 0 || index === 1) return "bg-emerald-100/90 dark:bg-emerald-500/20";
      if (index === 2) return "bg-sky-100/90 dark:bg-sky-500/20";
      if (index === 3) return "bg-violet-100/90 dark:bg-violet-500/20";
      if (index >= total - 2) return "bg-red-100/90 dark:bg-red-500/20";
      return "bg-white/85 dark:bg-white/[0.03]";
    }
    if (type === "b") {
      if (index <= 1) return "bg-emerald-100/90 dark:bg-emerald-500/20";
      if (index >= total - 2) return "bg-red-100/90 dark:bg-red-500/20";
      return "bg-white/85 dark:bg-white/[0.03]";
    }
    return "bg-white/85 dark:bg-white/[0.03]";
  }

  return (
    <div className="overflow-auto rounded-2xl border border-black/10 dark:border-white/10 bg-white/80 dark:bg-slate-950/50 shadow-inner h-fit">
      <table className="w-full text-xs border-separate border-spacing-0">
        <thead className="sticky top-0 z-[1] bg-slate-950 text-white dark:bg-black/90">
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
            <tr key={row.team} className={`border-t border-black/10 dark:border-white/10 transition-all hover:brightness-95 dark:hover:bg-white/10 ${rowClass(index, rows.length)}`}>
              <td className="text-center p-2 font-bold text-slate-700 dark:text-white/80">{index + 1}</td>
              <td className="p-2 font-semibold whitespace-nowrap min-w-[180px]"><TeamName team={row.team} small /></td>
              <td className="text-center font-black">{row.pts}</td>
              <td className="text-center">{row.pj}</td>
              <td className="text-center">{row.pg}</td>
              <td className="text-center">{row.pe}</td>
              <td className="text-center">{row.pp}</td>
              <td className="text-center">{row.gf}</td>
              <td className="text-center">{row.gc}</td>
              <td className={`text-center font-bold ${row.dg > 0 ? "text-emerald-700 dark:text-emerald-300" : row.dg < 0 ? "text-red-700 dark:text-red-300" : ""}`}>{row.dg}</td>
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
    <div className="rounded-2xl border border-black/10 dark:border-white/10 bg-white/90 dark:bg-white/[0.06] shadow-sm p-3 transition-all hover:-translate-y-0.5 hover:shadow-md">
      <div className="grid grid-cols-[1fr_112px_1fr_70px] gap-3 items-center">
        <div className={`${homeWon ? "font-black" : "font-semibold"}`}>
          <TeamName team={match.home} align="right" />
        </div>

        <div className="grid grid-cols-[44px_20px_44px] items-center justify-center gap-1">
          <input
            className="h-10 rounded-xl border border-black/20 dark:border-white/20 bg-white dark:bg-slate-950 text-center font-black text-lg outline-none focus:ring-2 focus:ring-blue-500"
            value={match.hg ?? ""}
            onChange={(e) => onUpdate(match.id, e.target.value === "" ? null : Number(e.target.value), match.ag)}
          />
          <span className="text-center font-black text-slate-400">-</span>
          <input
            className="h-10 rounded-xl border border-black/20 dark:border-white/20 bg-white dark:bg-slate-950 text-center font-black text-lg outline-none focus:ring-2 focus:ring-blue-500"
            value={match.ag ?? ""}
            onChange={(e) => onUpdate(match.id, match.hg, e.target.value === "" ? null : Number(e.target.value))}
          />
        </div>

        <div className={`${awayWon ? "font-black" : "font-semibold"}`}>
          <TeamName team={match.away} />
        </div>

        <button onClick={() => onSimulate(match)} className="rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/15 px-3 py-2 text-sm font-bold transition-colors">
          Tirar
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

  function updateMatch(id: string, hg: number | null, ag: number | null) {
    setFixture((old) => old.map((round) => ({
      ...round,
      matches: round.matches.map((match) => match.id === id ? { ...match, hg, ag } : match),
    })));
  }

  function simulateMatch(match: Match) {
    updateMatch(match.id, simulateGoals(match.home, match.away), simulateGoals(match.away, match.home));
  }

  function simulateRound() {
    currentRound.matches.forEach((match) => simulateMatch(match));
  }

  return (
    <section className="space-y-5 animate-[fadeIn_.25s_ease-out]">
      <div className="rounded-3xl bg-gradient-to-r from-slate-950 via-blue-950 to-slate-900 text-white border border-white/10 shadow-xl p-5 overflow-hidden relative">
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_top_right,_#60a5fa,_transparent_35%),radial-gradient(circle_at_bottom_left,_#22c55e,_transparent_30%)]" />
        <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <TournamentLogo league={type} />
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-blue-200 font-black">Temporada actual</p>
              <h2 className="text-3xl md:text-4xl font-black tracking-tight">{name}</h2>
              <p className="text-sm text-white/65">Fecha {currentRound.round} · {playedInRound}/{currentRound.matches.length} partidos jugados</p>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 min-w-[320px]">
            <div className="rounded-2xl bg-white/10 border border-white/10 p-3">
              <p className="text-xs text-white/55 font-bold uppercase">Líder</p>
              <div className="mt-1"><TeamName team={leader?.team ?? "-"} small /></div>
            </div>
            <div className="rounded-2xl bg-white/10 border border-white/10 p-3">
              <p className="text-xs text-white/55 font-bold uppercase">Puntos líder</p>
              <p className="text-2xl font-black">{leader?.pts ?? 0}</p>
            </div>
            <div className="rounded-2xl bg-white/10 border border-white/10 p-3 col-span-2 md:col-span-1">
              <p className="text-xs text-white/55 font-bold uppercase">Equipos</p>
              <p className="text-2xl font-black">{teams.length}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(560px,1fr)_minmax(540px,1fr)] gap-5 items-start">
        <div className="rounded-3xl bg-white/85 dark:bg-slate-950/70 border border-black/10 dark:border-white/10 shadow-xl p-4 space-y-4 backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button onClick={() => setRoundIndex(Math.max(0, roundIndex - 1))} className="border border-black/10 dark:border-white/15 px-3 py-2 rounded-xl font-bold hover:bg-slate-100 dark:hover:bg-white/10">Anterior</button>
              <div className="rounded-xl bg-blue-600 text-white px-4 py-2 font-black shadow">Fecha {currentRound.round}</div>
              <button onClick={() => setRoundIndex(Math.min(fixture.length - 1, roundIndex + 1))} className="border border-black/10 dark:border-white/15 px-3 py-2 rounded-xl font-bold hover:bg-slate-100 dark:hover:bg-white/10">Siguiente</button>
            </div>
            <p className="text-sm text-slate-500 dark:text-white/55 font-semibold">Fixture</p>
          </div>

          <div className="space-y-2 max-h-[62vh] overflow-auto pr-1">
            {currentRound.matches.map((match) => (
              <MatchCard key={match.id} match={match} onUpdate={updateMatch} onSimulate={simulateMatch} />
            ))}
          </div>

          <button onClick={simulateRound} className="w-full bg-gradient-to-r from-slate-950 to-blue-950 hover:brightness-110 text-white px-4 py-3 rounded-2xl font-black shadow-lg transition-all">
            Simular fecha completa
          </button>
        </div>

        <div className="rounded-3xl bg-white/85 dark:bg-slate-950/70 border border-black/10 dark:border-white/10 shadow-xl p-4 h-fit backdrop-blur">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-2xl font-black">Tabla</h3>
            <span className="text-xs uppercase tracking-wider font-black text-slate-500 dark:text-white/55">En vivo</span>
          </div>
          <StandingsTable rows={table} type={type} />
        </div>
      </div>
    </section>
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
    <div className="overflow-auto rounded-2xl border border-black/10 dark:border-white/10 bg-white/85 dark:bg-slate-950/70 shadow-xl">
      <table className="w-full text-sm">
        <thead className="bg-slate-950 text-white">
          <tr><th className="p-3">#</th><th className="p-3 text-left">Equipo</th><th>Campeonatos</th></tr>
        </thead>
        <tbody>
          {rows.map(([team, titles], index) => (
            <tr key={team} className="border-t border-black/10 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10">
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
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <StatCard label="Mejor campaña" value={stats.best ? `${stats.best.team} · ${stats.best.pts}` : "-"} sub={stats.best ? `Año ${stats.best.year}` : undefined} />
      <StatCard label="Peor campaña" value={stats.worst ? `${stats.worst.team} · ${stats.worst.pts}` : "-"} sub={stats.worst ? `Año ${stats.worst.year}` : undefined} />
      <StatCard label="Más goleador" value={stats.mostGoals ? `${stats.mostGoals.team} · ${stats.mostGoals.gf}` : "-"} sub={stats.mostGoals ? `Año ${stats.mostGoals.year}` : undefined} />
      <StatCard label="Mejor defensa" value={stats.bestDefense ? `${stats.bestDefense.team} · ${stats.bestDefense.gc}` : "-"} sub={stats.bestDefense ? `Año ${stats.bestDefense.year}` : undefined} />
    </div>
  );
}

export default function Home() {
  const [tab, setTab] = useState<"inicio" | "historica" | "campeonatos" | "anios">("inicio");
  const [activeLeague, setActiveLeague] = useState<LeagueKey>("primera");
  const [theme, setTheme] = useState<ThemeMode>("light");
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

  useEffect(() => {
    setFixtureA(generateFixture(initialPrimera));
    setFixtureB(generateFixture(initialB));
  }, []);

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

  if (fixtureA.length === 0 || fixtureB.length === 0) {
    return <main className="min-h-screen bg-slate-100 flex items-center justify-center"><p className="text-xl font-bold">Cargando simulador...</p></main>;
  }

  function nextSeason() {
    if (!finished) return;

    const top3 = tableA.slice(0, 3);
    const relegated = tableA.slice(-2);
    const promoted = tableB.slice(0, 2);
    const record: SeasonRecord = { year, primera: tableA, b: tableB, top3, relegated, promoted, champion: tableA[0] };

    setHistory((old) => [...old, record]);
    setSummary(record);

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
  }

  function resetGame() {
    const ok = window.confirm("¿Seguro que querés reiniciar todo el juego? Se borrará el historial.");
    if (!ok) return;
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
  }

  const dark = theme === "dark";

  return (
    <main className={`${dark ? "dark bg-slate-950 text-white" : "bg-slate-100 text-slate-950"} min-h-screen transition-colors`}>
      <style jsx global>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        body { background: ${dark ? "#020617" : "#f1f5f9"}; }
      `}</style>

      <div className="fixed inset-0 pointer-events-none opacity-60 dark:opacity-80 bg-[radial-gradient(circle_at_top_left,_rgba(37,99,235,.30),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(16,185,129,.18),_transparent_25%),linear-gradient(135deg,_rgba(15,23,42,.15),_transparent)]" />

      <nav className="sticky top-0 z-10 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl border-b border-black/10 dark:border-white/10 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 flex-wrap">
            <button onClick={() => setTab("inicio")} className={`font-black ${tab === "inicio" ? "text-blue-600 dark:text-blue-400" : "text-slate-700 dark:text-white/80"}`}>Inicio</button>
            <button onClick={() => setTab("historica")} className={`font-black ${tab === "historica" ? "text-blue-600 dark:text-blue-400" : "text-slate-700 dark:text-white/80"}`}>Tabla histórica</button>
            <button onClick={() => setTab("campeonatos")} className={`font-black ${tab === "campeonatos" ? "text-blue-600 dark:text-blue-400" : "text-slate-700 dark:text-white/80"}`}>Campeonatos</button>
            <button onClick={() => setTab("anios")} className={`font-black ${tab === "anios" ? "text-blue-600 dark:text-blue-400" : "text-slate-700 dark:text-white/80"}`}>Años</button>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setTheme(dark ? "light" : "dark")} className="rounded-xl border border-black/10 dark:border-white/10 px-3 py-2 font-bold bg-white/70 dark:bg-white/10">
              {dark ? "Modo claro" : "Modo oscuro"}
            </button>
            <span className="text-xl font-black">AÑO {year}</span>
            <button onClick={resetGame} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl font-black shadow">Reiniciar juego</button>
          </div>
        </div>
      </nav>

      <div className="relative max-w-7xl mx-auto p-6 space-y-6">
        {summary && (
          <div className="fixed inset-0 bg-black/60 z-20 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-950 text-slate-950 dark:text-white rounded-3xl shadow-2xl max-w-xl w-full p-6 space-y-5 border border-black/10 dark:border-white/10 animate-[fadeIn_.2s_ease-out]">
              <h2 className="text-3xl font-black">Resumen Año {summary.year}</h2>
              <div className="rounded-2xl bg-yellow-100 dark:bg-yellow-500/15 p-4 border border-yellow-300/60 dark:border-yellow-400/20">
                <h3 className="font-black">Campeón</h3>
                <div className="mt-2"><TeamName team={summary.champion.team} /></div>
              </div>
              <div><h3 className="font-bold">Top 3 Liga Profesional Argentina</h3><ol className="list-decimal ml-6 mt-1 space-y-1">{summary.top3.map((team) => <li key={team.team}>{team.team} - {team.pts} pts</li>)}</ol></div>
              <div><h3 className="font-bold text-red-700 dark:text-red-300">Descendidos</h3><ul className="list-disc ml-6 mt-1">{summary.relegated.map((team) => <li key={team.team}>{team.team}</li>)}</ul></div>
              <div><h3 className="font-bold text-green-700 dark:text-green-300">Ascendidos</h3><ul className="list-disc ml-6 mt-1">{summary.promoted.map((team) => <li key={team.team}>{team.team}</li>)}</ul></div>
              <button onClick={() => setSummary(null)} className="bg-black dark:bg-white text-white dark:text-slate-950 px-5 py-3 rounded-2xl font-black">Continuar</button>
            </div>
          </div>
        )}

        {tab === "inicio" && (
          <>
            <header className="rounded-3xl p-6 bg-white/80 dark:bg-white/[0.06] border border-black/10 dark:border-white/10 shadow-xl backdrop-blur space-y-5">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.35em] text-blue-600 dark:text-blue-300 font-black">Simulador argentino</p>
                  <h1 className="text-4xl md:text-5xl font-black tracking-tight">Liga Manager</h1>
                  <p className="text-slate-600 dark:text-white/65 mt-1">Partidos, tablas, ascensos, descensos, campeonatos e historia acumulada.</p>
                </div>
                <button onClick={nextSeason} disabled={!finished} className={`px-5 py-3 rounded-2xl font-black shadow-lg ${finished ? "bg-blue-600 hover:bg-blue-700 text-white" : "bg-gray-300/80 dark:bg-white/10 text-gray-600 dark:text-white/45 cursor-not-allowed"}`}>Pasar a siguiente temporada</button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <StatCard label="Año actual" value={year} sub="Temporada en curso" />
                <StatCard label="Último campeón" value={lastChampion ? <TeamName team={lastChampion.team} small /> : "-"} sub={lastChampion ? `${lastChampion.pts} puntos` : "Sin temporadas terminadas"} />
                <StatCard label="Máximo ganador" value={maxWinner ? <TeamName team={maxWinner[0]} small /> : "-"} sub={maxWinner ? `${maxWinner[1]} campeonatos` : "Sin títulos todavía"} />
                <StatCard label="Estado" value={finished ? "Finalizada" : "En juego"} sub={finished ? "Podés avanzar" : "Faltan partidos"} />
              </div>
            </header>

            <div className="flex gap-3 flex-wrap">
              <button onClick={() => setActiveLeague("primera")} className={`px-4 py-3 rounded-2xl font-black shadow-sm border ${activeLeague === "primera" ? "bg-blue-600 text-white border-blue-600" : "bg-white/80 dark:bg-white/10 border-black/10 dark:border-white/10"}`}>Liga Profesional Argentina</button>
              <button onClick={() => setActiveLeague("b")} className={`px-4 py-3 rounded-2xl font-black shadow-sm border ${activeLeague === "b" ? "bg-blue-600 text-white border-blue-600" : "bg-white/80 dark:bg-white/10 border-black/10 dark:border-white/10"}`}>Primera B Nacional</button>
            </div>

            {activeLeague === "primera" ? (
              <Zone name="Liga Profesional Argentina" type="primera" teams={primeraTeams} fixture={fixtureA} setFixture={setFixtureA} roundIndex={roundIndexA} setRoundIndex={setRoundIndexA} />
            ) : (
              <Zone name="Primera B Nacional" type="b" teams={bTeams} fixture={fixtureB} setFixture={setFixtureB} roundIndex={roundIndexB} setRoundIndex={setRoundIndexB} />
            )}
          </>
        )}

        {tab === "historica" && (
          <section className="space-y-5">
            <div>
              <h1 className="text-4xl font-black">Tabla histórica de Primera División</h1>
              <p className="text-slate-600 dark:text-white/60">Acumula solamente las campañas jugadas en Primera.</p>
            </div>
            <BestWorstStats history={history} />
            {historicalTable.length === 0 ? <p>Todavía no terminaste ninguna temporada.</p> : <HistoricTable rows={historicalTable} />}
          </section>
        )}

        {tab === "campeonatos" && (
          <section className="space-y-5">
            <div>
              <h1 className="text-4xl font-black">Campeonatos ganados</h1>
              <p className="text-slate-600 dark:text-white/60">Ranking histórico de campeones de Primera.</p>
            </div>
            <ChampionshipsTable history={history} teams={allTeamsEver} />
          </section>
        )}

        {tab === "anios" && (
          <section className="space-y-5">
            <div>
              <h1 className="text-4xl font-black">Años</h1>
              <p className="text-slate-600 dark:text-white/60">Consultá cómo terminó cada temporada.</p>
            </div>
            {history.length === 0 ? <p>Todavía no hay temporadas guardadas.</p> : (
              <>
                <select className="border border-black/10 dark:border-white/10 rounded-2xl p-3 bg-white dark:bg-slate-950 font-bold" value={selectedYear ?? ""} onChange={(e) => setSelectedYear(Number(e.target.value))}>
                  <option value="">Elegí una temporada</option>
                  {history.map((season) => <option key={season.year} value={season.year}>Año {season.year}</option>)}
                </select>
                {selectedYear && (
                  <div className="space-y-6">
                    <h2 className="text-2xl font-black">Año {selectedYear} - Liga Profesional Argentina</h2>
                    <HistoricTable rows={history.find((s) => s.year === selectedYear)?.primera ?? []} />
                    <h2 className="text-2xl font-black">Año {selectedYear} - Primera B Nacional</h2>
                    <HistoricTable rows={history.find((s) => s.year === selectedYear)?.b ?? []} />
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
