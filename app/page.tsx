"use client";

import React, { useEffect, useMemo, useState } from "react";

type Match = { id: string; round: number; home: string; away: string; hg: number | null; ag: number | null };
type Round = { round: number; matches: Match[] };
type Row = { team: string; pts: number; pj: number; pg: number; pe: number; pp: number; gf: number; gc: number; dg: number };
type SeasonRecord = { year: number; primera: Row[]; b: Row[]; top3: Row[]; relegated: Row[]; promoted: Row[]; champion: Row };

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
  River: 86, "Boca Jrs": 85, Racing: 80, Independiente: 79, "San Lorenzo": 78,
  Estudiantes: 78, Velez: 76, "Rosario Central": 74, Lanus: 73, Newels: 72,
  Talleres: 72, "Argentinos Jrs": 71, "Defenza & Justicia": 70, "Godoy Cruz": 70,
  Union: 68, Huracan: 68, "Atl. Tucuman": 67, Belgrano: 67, Banfield: 66,
  Tigre: 66, Platense: 65, "Gimnacia LP": 65, Colon: 64, "Ind Rivadavia": 63,
  Instituto: 63, Sarmiento: 62, "Central Cordoba": 62, Aldosivi: 60, Riestra: 60,
  Chacarita: 59, Quilmes: 59, Ferro: 58, Chicago: 58, "Gimnacia Mendoza": 57,
  Arsenal: 57, Patronato: 57, "Est Rio Cuarto": 56, Barracas: 56, Temperley: 56, Moron: 56,
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

function TeamName({ team, align = "left", small = false }: { team: string; align?: "left" | "right"; small?: boolean }) {
  const logo = logos[team];
  const content = (
    <>
      {logo && (
        <img
          src={logo}
          alt={team}
          className={`${small ? "h-5 w-5" : "h-6 w-6"} object-contain shrink-0`}
          onError={(event) => {
            event.currentTarget.style.display = "none";
          }}
        />
      )}
      <span className="truncate">{team}</span>
    </>
  );

  return (
    <div className={`flex items-center gap-2 min-w-0 ${align === "right" ? "justify-end text-right" : "justify-start text-left"}`}>
      {align === "right" ? (
        <>
          <span className="truncate">{team}</span>
          {logo && (
            <img
              src={logo}
              alt={team}
              className={`${small ? "h-5 w-5" : "h-6 w-6"} object-contain shrink-0`}
              onError={(event) => {
                event.currentTarget.style.display = "none";
              }}
            />
          )}
        </>
      ) : content}
    </div>
  );
}

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
  teams.forEach((team) => { table[team] = { team, pts: 0, pj: 0, pg: 0, pe: 0, pp: 0, gf: 0, gc: 0, dg: 0 }; });

  fixture.forEach((round) => {
    round.matches.forEach((match) => {
      if (match.hg === null || match.ag === null) return;
      const home = table[match.home];
      const away = table[match.away];
      home.pj++; away.pj++;
      home.gf += match.hg; home.gc += match.ag;
      away.gf += match.ag; away.gc += match.hg;

      if (match.hg > match.ag) { home.pg++; away.pp++; home.pts += 3; }
      else if (match.hg < match.ag) { away.pg++; home.pp++; away.pts += 3; }
      else { home.pe++; away.pe++; home.pts++; away.pts++; }
    });
  });

  return Object.values(table)
    .map((row) => ({ ...row, dg: row.gf - row.gc }))
    .sort((a, b) => b.pts - a.pts || b.dg - a.dg || b.gf - a.gf || a.team.localeCompare(b.team));
}

function isSeasonFinished(fixture: Round[]) {
  return fixture.every((round) => round.matches.every((match) => match.hg !== null && match.ag !== null));
}

function StandingsTable({ rows, type }: { rows: Row[]; type?: "primera" | "b" }) {
  function rowClass(index: number, total: number) {
    if (type === "primera") {
      if (index === 0 || index === 1) return "bg-green-100";
      if (index === 2) return "bg-sky-100";
      if (index === 3) return "bg-violet-100";
      if (index >= total - 2) return "bg-red-100";
      return "";
    }
    if (type === "b") {
      if (index <= 1) return "bg-green-100";
      if (index >= total - 2) return "bg-red-100";
      return "";
    }
    return "";
  }

  return (
    <div className="overflow-auto border rounded-xl bg-white h-fit">
      <table className="w-full text-xs">
        <thead className="bg-gray-100 sticky top-0">
          <tr>
            <th className="p-2">#</th><th className="p-2 text-left">Equipo</th><th>Pts</th><th>PJ</th><th>PG</th><th>PE</th><th>PP</th><th>GF</th><th>GC</th><th>DG</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={row.team} className={`border-t ${rowClass(index, rows.length)}`}>
              <td className="text-center p-2">{index + 1}</td>
              <td className="p-2 font-medium whitespace-nowrap min-w-[170px]"><TeamName team={row.team} small /></td>
              <td className="text-center font-bold">{row.pts}</td>
              <td className="text-center">{row.pj}</td>
              <td className="text-center">{row.pg}</td>
              <td className="text-center">{row.pe}</td>
              <td className="text-center">{row.pp}</td>
              <td className="text-center">{row.gf}</td>
              <td className="text-center">{row.gc}</td>
              <td className="text-center">{row.dg}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Zone({
  name, type, teams, fixture, setFixture,
}: {
  name: string;
  type: "primera" | "b";
  teams: string[];
  fixture: Round[];
  setFixture: React.Dispatch<React.SetStateAction<Round[]>>;
}) {
  const [roundIndex, setRoundIndex] = useState(0);
  useEffect(() => {
  setRoundIndex(0);
}, [name]);
  const table = useMemo(() => buildTable(teams, fixture), [teams, fixture]);
  const currentRound = fixture[roundIndex];

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
    <section className="space-y-4">
      <div>
        <h2 className="text-3xl font-black">{name}</h2>
        <p className="text-gray-600">Partidos a la izquierda, tabla en vivo a la derecha.</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(520px,1fr)_minmax(520px,1fr)] gap-5 items-start">
        <div className="bg-white rounded-2xl shadow p-4 space-y-4">
          <div className="flex items-center gap-3">
            <button onClick={() => setRoundIndex(Math.max(0, roundIndex - 1))} className="border px-3 py-1 rounded-lg">Anterior</button>
            <strong>Fecha {currentRound.round}</strong>
            <button onClick={() => setRoundIndex(Math.min(fixture.length - 1, roundIndex + 1))} className="border px-3 py-1 rounded-lg">Siguiente</button>
          </div>

          <div className="space-y-2 max-h-[62vh] overflow-auto pr-1">
            {currentRound.matches.map((match) => (
              <div key={match.id} className="grid grid-cols-[1fr_44px_44px_1fr_70px] gap-2 items-center border rounded-xl p-2 text-sm">
                <TeamName team={match.home} align="right" small />
                <input className="border rounded text-center p-1" value={match.hg ?? ""} onChange={(e) => updateMatch(match.id, e.target.value === "" ? null : Number(e.target.value), match.ag)} />
                <input className="border rounded text-center p-1" value={match.ag ?? ""} onChange={(e) => updateMatch(match.id, match.hg, e.target.value === "" ? null : Number(e.target.value))} />
                <TeamName team={match.away} small />
                <button onClick={() => simulateMatch(match)} className="bg-gray-100 hover:bg-gray-200 rounded-lg py-1">Tirar</button>
              </div>
            ))}
          </div>

          <button onClick={simulateRound} className="w-full bg-black text-white px-4 py-3 rounded-xl font-bold">
            Simular fecha completa
          </button>
        </div>

        <div className="bg-white rounded-2xl shadow p-4 h-fit flex flex-col">
          <h3 className="text-xl font-black mb-3">Tabla</h3>
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
    <div className="overflow-auto border rounded-xl bg-white">
      <table className="w-full text-sm">
        <thead className="bg-gray-100"><tr><th className="p-2">#</th><th className="p-2 text-left">Equipo</th><th>Campeonatos</th></tr></thead>
        <tbody>
          {rows.map(([team, titles], index) => (
            <tr key={team} className="border-t">
              <td className="text-center p-2">{index + 1}</td>
              <td className="p-2 font-medium"><TeamName team={team} small /></td>
              <td className="text-center font-bold">{titles}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function Home() {
  const [tab, setTab] = useState<"inicio" | "historica" | "campeonatos" | "anios">("inicio");
  const [activeLeague, setActiveLeague] = useState<"primera" | "b">("primera");
  const [year, setYear] = useState(1);
  const [primeraTeams, setPrimeraTeams] = useState(initialPrimera);
  const [bTeams, setBTeams] = useState(initialB);
  const [fixtureA, setFixtureA] = useState<Round[]>([]);
  const [fixtureB, setFixtureB] = useState<Round[]>([]);
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

    const nextPrimera = [...primeraTeams.filter((team) => !relegated.some((r) => r.team === team)), ...promoted.map((p) => p.team)];
    const nextB = [...bTeams.filter((team) => !promoted.some((p) => p.team === team)), ...relegated.map((r) => r.team)];

    setPrimeraTeams(nextPrimera);
    setBTeams(nextB);
    setFixtureA(generateFixture(nextPrimera));
    setFixtureB(generateFixture(nextB));
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
    setHistory([]);
    setSelectedYear(null);
    setSummary(null);
    setTab("inicio");
    setActiveLeague("primera");
  }

  return (
    <main className="min-h-screen bg-slate-100">
      <nav className="sticky top-0 z-10 bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 flex-wrap">
            <button onClick={() => setTab("inicio")} className={`font-bold ${tab === "inicio" ? "text-blue-600" : ""}`}>Inicio</button>
            <button onClick={() => setTab("historica")} className={`font-bold ${tab === "historica" ? "text-blue-600" : ""}`}>Tabla histórica</button>
            <button onClick={() => setTab("campeonatos")} className={`font-bold ${tab === "campeonatos" ? "text-blue-600" : ""}`}>Campeonatos</button>
            <button onClick={() => setTab("anios")} className={`font-bold ${tab === "anios" ? "text-blue-600" : ""}`}>Años</button>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xl font-black">AÑO {year}</span>
            <button onClick={resetGame} className="bg-red-600 text-white px-4 py-2 rounded-xl font-bold">Reiniciar juego</button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {summary && (
          <div className="fixed inset-0 bg-black/40 z-20 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-xl w-full p-6 space-y-4">
              <h2 className="text-2xl font-black">Resumen Año {summary.year}</h2>
              <div><h3 className="font-bold">Top 3 Liga Profesional Argentina</h3><ol className="list-decimal ml-6">{summary.top3.map((team) => <li key={team.team}>{team.team} - {team.pts} pts</li>)}</ol></div>
              <div><h3 className="font-bold text-red-700">Descendidos</h3><ul className="list-disc ml-6">{summary.relegated.map((team) => <li key={team.team}>{team.team}</li>)}</ul></div>
              <div><h3 className="font-bold text-green-700">Ascendidos</h3><ul className="list-disc ml-6">{summary.promoted.map((team) => <li key={team.team}>{team.team}</li>)}</ul></div>
              <button onClick={() => setSummary(null)} className="bg-black text-white px-5 py-2 rounded-xl font-bold">Continuar</button>
            </div>
          </div>
        )}

        {tab === "inicio" && (
          <>
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div><h1 className="text-4xl font-black">Simulador Liga Argentina</h1><p className="text-gray-600">Simulá partido por partido, fecha por fecha, con ascensos, descensos e historial.</p></div>
              <button onClick={nextSeason} disabled={!finished} className={`px-5 py-3 rounded-2xl font-bold ${finished ? "bg-blue-600 text-white" : "bg-gray-300 text-gray-600 cursor-not-allowed"}`}>Pasar a siguiente temporada</button>
            </header>

            {!finished && <p className="text-sm text-gray-600">Para pasar de temporada tenés que simular todos los partidos de ambas categorías.</p>}

            <div className="flex gap-3 flex-wrap">
              <button onClick={() => setActiveLeague("primera")} className={`px-4 py-2 rounded-xl font-bold ${activeLeague === "primera" ? "bg-blue-600 text-white" : "bg-white border"}`}>Liga Profesional Argentina</button>
              <button onClick={() => setActiveLeague("b")} className={`px-4 py-2 rounded-xl font-bold ${activeLeague === "b" ? "bg-blue-600 text-white" : "bg-white border"}`}>Primera B Nacional</button>
            </div>

            {activeLeague === "primera" ? <Zone name="Liga Profesional Argentina" type="primera" teams={primeraTeams} fixture={fixtureA} setFixture={setFixtureA} /> : <Zone name="Primera B Nacional" type="b" teams={bTeams} fixture={fixtureB} setFixture={setFixtureB} />}
          </>
        )}

        {tab === "historica" && <section className="space-y-4"><h1 className="text-3xl font-black">Tabla histórica de Primera División</h1>{historicalTable.length === 0 ? <p>Todavía no terminaste ninguna temporada.</p> : <HistoricTable rows={historicalTable} />}</section>}

        {tab === "campeonatos" && <section className="space-y-4"><h1 className="text-3xl font-black">Campeonatos ganados</h1><ChampionshipsTable history={history} teams={allTeamsEver} /></section>}

        {tab === "anios" && (
          <section className="space-y-4">
            <h1 className="text-3xl font-black">Años</h1>
            {history.length === 0 ? <p>Todavía no hay temporadas guardadas.</p> : (
              <>
                <select className="border rounded-xl p-3 bg-white" value={selectedYear ?? ""} onChange={(e) => setSelectedYear(Number(e.target.value))}>
                  <option value="">Elegí una temporada</option>
                  {history.map((season) => <option key={season.year} value={season.year}>Año {season.year}</option>)}
                </select>
                {selectedYear && <div className="space-y-6"><h2 className="text-2xl font-bold">Año {selectedYear} - Liga Profesional Argentina</h2><HistoricTable rows={history.find((s) => s.year === selectedYear)?.primera ?? []} /><h2 className="text-2xl font-bold">Año {selectedYear} - Primera B Nacional</h2><HistoricTable rows={history.find((s) => s.year === selectedYear)?.b ?? []} /></div>}
              </>
            )}
          </section>
        )}
      </div>
    </main>
  );
}
