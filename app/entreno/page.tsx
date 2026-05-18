"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type Vista = "inicio" | "rutinas" | "resumen" | "registro" | "objetivos";
type Tipo = "fuerza" | "running" | "tiempo" | "otro";

type Entry = {
  id: string;
  fecha: string;
  tipo: Tipo;
  ejercicio: string;
  valor: number;
  unidad: string;
  nota: string;
};

type Routine = {
  id: string;
  name: string;
  days_per_week: number;
  color: string;
  active: boolean;
};

type RoutineExercise = {
  id: string;
  routine_id: string;
  nombre: string;
  unidad: string;
  tipo: Tipo;
  series: number;
  orden: number;
};

type ScheduleItem = {
  id: string;
  fecha: string;
  routine_id: string;
};

type Completion = {
  id: string;
  fecha: string;
  routine: string;
};

type Goal = {
  id: string;
  ejercicio: string;
  objetivo: number;
  unidad: string;
  nota: string;
};

const colores = [
  "from-emerald-500 to-green-700",
  "from-lime-500 to-emerald-700",
  "from-teal-500 to-green-800",
  "from-cyan-500 to-emerald-700",
];

const meses = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

function hoyLocal() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}

function fechaBonita(fecha = hoyLocal()) {
  const [anio, mes, dia] = fecha.split("-").map(Number);
  const nombreMes = meses[mes - 1];
  return `${dia} de ${nombreMes.charAt(0).toUpperCase() + nombreMes.slice(1)} ${anio}`;
}

const hoy = hoyLocal();
const mesActual = hoy.slice(0, 7);

export default function EntrenoPage() {
  const [vista, setVista] = useState<Vista>("inicio");
  const [estado, setEstado] = useState("Sincronizando...");

  const [entries, setEntries] = useState<Entry[]>([]);
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [routineExercises, setRoutineExercises] = useState<RoutineExercise[]>([]);
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [completions, setCompletions] = useState<Completion[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [monthlyTargets, setMonthlyTargets] = useState<Record<string, number>>({});

  const [mes, setMes] = useState(mesActual);
  const [fechaSeleccionada, setFechaSeleccionada] = useState(hoy);
  const [editando, setEditando] = useState<string | null>(null);

  const [quickValues, setQuickValues] = useState<Record<string, string>>({});
  const [rutinaAbierta, setRutinaAbierta] = useState(false);
  const [ejerciciosAbiertos, setEjerciciosAbiertos] = useState<Record<string, boolean>>({});

  const [nuevaRutina, setNuevaRutina] = useState({
    name: "",
    days_per_week: "1",
  });

  const [editRoutine, setEditRoutine] = useState<
    Record<string, { name: string; days_per_week: string }>
  >({});

  const [nuevoEjercicio, setNuevoEjercicio] = useState({
    routine_id: "",
    nombre: "",
    unidad: "reps",
    tipo: "fuerza" as Tipo,
    series: "1",
  });

  const [form, setForm] = useState({
    fecha: hoy,
    tipo: "fuerza" as Tipo,
    ejercicio: "",
    valor: "",
    unidad: "reps",
    nota: "",
  });

  const [goalForm, setGoalForm] = useState({
    ejercicio: "",
    objetivo: "",
    unidad: "reps",
    nota: "",
  });

  useEffect(() => {
    const applyBranding = () => {
      document.title = "TrainC+";

      document
        .querySelectorAll(
          "link[rel='icon'], link[rel='shortcut icon'], link[rel='apple-touch-icon']"
        )
        .forEach((el) => el.remove());

      const icon = document.createElement("link");
      icon.rel = "icon";
      icon.type = "image/png";
      icon.href = "/images/entreno-logo.png?v=trainc11";
      document.head.appendChild(icon);

      const shortcut = document.createElement("link");
      shortcut.rel = "shortcut icon";
      shortcut.href = "/images/entreno-logo.png?v=trainc11";
      document.head.appendChild(shortcut);

      const apple = document.createElement("link");
      apple.rel = "apple-touch-icon";
      apple.href = "/images/entreno-logo.png?v=trainc11";
      document.head.appendChild(apple);
    };

    applyBranding();
    const interval = setInterval(applyBranding, 1000);
    cargarDatos();

    return () => clearInterval(interval);
  }, []);

  async function cargarDatos() {
    setEstado("Sincronizando...");

    const { data: e } = await supabase
      .from("workout_entries")
      .select("*")
      .order("fecha", { ascending: false });

    const { data: r } = await supabase
      .from("workout_routines")
      .select("*")
      .order("created_at", { ascending: true });

    const { data: ex } = await supabase
      .from("workout_routine_exercises")
      .select("*")
      .order("orden", { ascending: true });

    const { data: s } = await supabase
      .from("workout_schedule")
      .select("*")
      .order("fecha", { ascending: true });

    const { data: c } = await supabase
      .from("workout_routine_completions")
      .select("*")
      .order("fecha", { ascending: false });

    const { data: g } = await supabase
      .from("workout_goals")
      .select("*")
      .order("created_at", { ascending: false });

    const { data: mt } = await supabase
      .from("workout_monthly_targets")
      .select("*");

    if (e) {
      setEntries(
        e.map((x) => ({
          id: x.id,
          fecha: x.fecha,
          tipo: x.tipo,
          ejercicio: x.ejercicio,
          valor: Number(x.valor),
          unidad: x.unidad,
          nota: x.nota || "",
        }))
      );
    }

    if (r) {
      const mapped = r.map((x) => ({
        id: x.id,
        name: x.name,
        days_per_week: Number(x.days_per_week),
        color: x.color || colores[0],
        active: x.active ?? true,
      }));

      setRoutines(mapped);

      const editMap: Record<string, { name: string; days_per_week: string }> = {};
      mapped.forEach((item) => {
        editMap[item.id] = {
          name: item.name,
          days_per_week: String(item.days_per_week),
        };
      });
      setEditRoutine(editMap);
    }

    if (ex) {
      setRoutineExercises(
        ex.map((x) => ({
          id: x.id,
          routine_id: x.routine_id,
          nombre: x.nombre,
          unidad: x.unidad,
          tipo: x.tipo,
          series: Number(x.series || 1),
          orden: Number(x.orden || 0),
        }))
      );
    }

    if (s) {
      setSchedule(
        s.map((x) => ({
          id: x.id,
          fecha: x.fecha,
          routine_id: x.routine_id,
        }))
      );
    }

    if (c) {
      setCompletions(
        c.map((x) => ({
          id: x.id,
          fecha: x.fecha,
          routine: x.routine,
        }))
      );
    }

    if (g) {
      setGoals(
        g.map((x) => ({
          id: x.id,
          ejercicio: x.ejercicio,
          objetivo: Number(x.objetivo),
          unidad: x.unidad,
          nota: x.nota || "",
        }))
      );
    }

    if (mt) {
      const map: Record<string, number> = {};
      mt.forEach((x) => {
        map[x.month] = Number(x.target);
      });
      setMonthlyTargets(map);
    }

    setEstado("Sincronizado");
  }

  const ordenados = useMemo(
    () => [...entries].sort((a, b) => b.fecha.localeCompare(a.fecha)),
    [entries]
  );

  const entriesMes = ordenados.filter((e) => e.fecha.startsWith(mes));
  const semana = getSemanaActual();
  const diasSemana = getDiasSemana();

  const rutinaDelDia = schedule.find((s) => s.fecha === fechaSeleccionada);
  const rutinaActiva =
    routines.find((r) => r.id === rutinaDelDia?.routine_id) || null;

  const ejerciciosRutina = rutinaActiva
    ? routineExercises
        .filter((e) => e.routine_id === rutinaActiva.id)
        .sort((a, b) => a.orden - b.orden)
    : [];

  const totalKmMes = entriesMes
    .filter((e) => e.unidad === "km")
    .reduce((a, b) => a + b.valor, 0);

  const diasEntrenadosMes = new Set(entriesMes.map((e) => e.fecha)).size;
  const ejerciciosMes = resumenPorEjercicio(entriesMes);
  const semanasComparadas = compararSemanas(ordenados);
  const mejorMarca = obtenerMejorMarca(ordenados);

  const completionsMes = completions.filter((c) => c.fecha.startsWith(mes));
  const rutinasCompletadasMes = completionsMes.length;
  const rutinasObjetivoMes = monthlyTargets[mes] || 0;
  const porcentajeRutinasMes =
    rutinasObjetivoMes > 0 ? (rutinasCompletadasMes / rutinasObjetivoMes) * 100 : 0;

  const rutinaCompletaHoy =
    rutinaActiva &&
    completions.some(
      (c) => c.routine === rutinaActiva.name && c.fecha === fechaSeleccionada
    );

  const completadasSemana = routines.map((r) => ({
    routine: r,
    done: completions.some(
      (c) => c.routine === r.name && c.fecha >= semana.inicio && c.fecha <= semana.fin
    ),
  }));

  async function crearRutina(e: React.FormEvent) {
    e.preventDefault();

    const name = nuevaRutina.name.trim();
    if (!name) return;

    const nueva: Routine = {
      id: crypto.randomUUID(),
      name,
      days_per_week: Number(nuevaRutina.days_per_week) || 1,
      color: colores[routines.length % colores.length],
      active: true,
    };

    setRoutines([...routines, nueva]);
    setEditRoutine({
      ...editRoutine,
      [nueva.id]: {
        name: nueva.name,
        days_per_week: String(nueva.days_per_week),
      },
    });

    setNuevaRutina({ name: "", days_per_week: "1" });
    setEstado("Guardando...");

    const { error } = await supabase.from("workout_routines").upsert({
      id: nueva.id,
      name: nueva.name,
      days_per_week: nueva.days_per_week,
      color: nueva.color,
      active: nueva.active,
    });

    setEstado(error ? "Error online" : "Sincronizado");
    if (error) alert(error.message);
  }

  async function actualizarRutina(routine: Routine) {
    const data = editRoutine[routine.id];
    if (!data?.name.trim()) return;

    const oldName = routine.name;
    const updated: Routine = {
      ...routine,
      name: data.name.trim(),
      days_per_week: Number(data.days_per_week) || 1,
    };

    setRoutines(routines.map((r) => (r.id === routine.id ? updated : r)));
    setCompletions(
      completions.map((c) =>
        c.routine === oldName ? { ...c, routine: updated.name } : c
      )
    );
    setEstado("Guardando...");

    const { error } = await supabase.from("workout_routines").upsert({
      id: updated.id,
      name: updated.name,
      days_per_week: updated.days_per_week,
      color: updated.color,
      active: updated.active,
    });

    if (!error && oldName !== updated.name) {
      const affected = completions.filter((c) => c.routine === oldName);
      for (const c of affected) {
        await supabase
          .from("workout_routine_completions")
          .upsert({ ...c, routine: updated.name });
      }
    }

    setEstado(error ? "Error online" : "Sincronizado");
    if (error) alert(error.message);
  }

  async function actualizarEjercicio(updated: RoutineExercise) {
    setRoutineExercises(
      routineExercises.map((x) => (x.id === updated.id ? updated : x))
    );

    const { error } = await supabase.from("workout_routine_exercises").upsert({
      id: updated.id,
      routine_id: updated.routine_id,
      nombre: updated.nombre,
      unidad: updated.unidad,
      tipo: updated.tipo,
      series: updated.series,
      orden: updated.orden,
    });

    if (error) alert(error.message);
  }

  async function guardarObjetivoMensual(target: number) {
    setMonthlyTargets({
      ...monthlyTargets,
      [mes]: target,
    });

    setEstado("Guardando...");

    const { error } = await supabase.from("workout_monthly_targets").upsert({
      month: mes,
      target,
    });

    setEstado(error ? "Error online" : "Sincronizado");
    if (error) alert(error.message);
  }

  async function agregarEjercicio(e: React.FormEvent) {
    e.preventDefault();

    if (!nuevoEjercicio.routine_id || !nuevoEjercicio.nombre.trim()) return;

    const cantidad = routineExercises.filter(
      (x) => x.routine_id === nuevoEjercicio.routine_id
    ).length;

    const nuevo: RoutineExercise = {
      id: crypto.randomUUID(),
      routine_id: nuevoEjercicio.routine_id,
      nombre: nuevoEjercicio.nombre.trim(),
      unidad: nuevoEjercicio.unidad,
      tipo: nuevoEjercicio.tipo,
      series: Number(nuevoEjercicio.series) || 1,
      orden: cantidad + 1,
    };

    setRoutineExercises([...routineExercises, nuevo]);
    setNuevoEjercicio({ ...nuevoEjercicio, nombre: "", series: "1" });
    setEstado("Guardando...");

    const { error } = await supabase.from("workout_routine_exercises").upsert(nuevo);

    setEstado(error ? "Error online" : "Sincronizado");
    if (error) alert(error.message);
  }

  async function borrarEjercicio(id: string) {
    if (!confirm("¿Borrar ejercicio?")) return;

    setRoutineExercises(routineExercises.filter((e) => e.id !== id));
    await supabase.from("workout_routine_exercises").delete().eq("id", id);
  }

  async function borrarRutina(id: string) {
    if (!confirm("¿Borrar rutina y sus ejercicios?")) return;

    setRoutines(routines.filter((r) => r.id !== id));
    setRoutineExercises(routineExercises.filter((e) => e.routine_id !== id));
    setSchedule(schedule.filter((s) => s.routine_id !== id));

    await supabase.from("workout_routine_exercises").delete().eq("routine_id", id);
    await supabase.from("workout_schedule").delete().eq("routine_id", id);
    await supabase.from("workout_routines").delete().eq("id", id);
  }

  async function asignarRutina(fecha: string, routine_id: string) {
    const existente = schedule.find((s) => s.fecha === fecha);

    setRutinaAbierta(false);
    setEjerciciosAbiertos({});

    if (!routine_id) {
      if (existente) {
        setSchedule(schedule.filter((s) => s.id !== existente.id));
        await supabase.from("workout_schedule").delete().eq("id", existente.id);
      }
      return;
    }

    const nuevo: ScheduleItem = {
      id: existente?.id || crypto.randomUUID(),
      fecha,
      routine_id,
    };

    setSchedule(
      existente
        ? schedule.map((s) => (s.id === existente.id ? nuevo : s))
        : [...schedule, nuevo]
    );

    await supabase.from("workout_schedule").upsert(nuevo);
  }

  async function moverRutina(fechaOrigen: string, fechaDestino: string) {
    const item = schedule.find((s) => s.fecha === fechaOrigen);
    if (!item) return;

    await asignarRutina(fechaDestino, item.routine_id);
    await asignarRutina(fechaOrigen, "");
    setFechaSeleccionada(fechaDestino);
  }

  async function guardarEntry(data: {
    fecha: string;
    tipo: Tipo;
    ejercicio: string;
    valor: number;
    unidad: string;
    nota: string;
    id?: string;
  }) {
    const nuevo: Entry = {
      id: data.id || crypto.randomUUID(),
      fecha: data.fecha,
      tipo: data.tipo,
      ejercicio: data.ejercicio.trim(),
      valor: data.valor,
      unidad: data.unidad,
      nota: data.nota.trim(),
    };

    setEntries(data.id ? entries.map((x) => (x.id === data.id ? nuevo : x)) : [nuevo, ...entries]);
    setEstado("Guardando...");

    const { error } = await supabase.from("workout_entries").upsert({
      id: nuevo.id,
      fecha: nuevo.fecha,
      tipo: nuevo.tipo,
      ejercicio: nuevo.ejercicio,
      valor: nuevo.valor,
      unidad: nuevo.unidad,
      nota: nuevo.nota,
    });

    if (error) {
      setEstado("Error online");
      alert("No se pudo guardar online: " + error.message);
      return;
    }

    setEstado("Sincronizado");
  }

  async function guardarSerie(ej: RoutineExercise, serie: number) {
    const key = `${ej.id}-${serie}`;
    const raw = quickValues[key];
    if (!raw || Number(raw) <= 0) return;

    await guardarEntry({
      fecha: fechaSeleccionada,
      tipo: ej.tipo,
      ejercicio: ej.nombre,
      valor: Number(raw),
      unidad: ej.unidad,
      nota: `Serie ${serie}`,
    });

    setQuickValues({ ...quickValues, [key]: "" });
  }

  async function guardarManual(e: React.FormEvent) {
    e.preventDefault();

    if (!form.valor || Number(form.valor) <= 0) return;

    await guardarEntry({
      id: editando || undefined,
      fecha: form.fecha,
      tipo: form.tipo,
      ejercicio: form.ejercicio,
      valor: Number(form.valor),
      unidad: form.unidad,
      nota: form.nota,
    });

    setEditando(null);
    setForm({
      fecha: hoyLocal(),
      tipo: "fuerza",
      ejercicio: form.ejercicio,
      valor: "",
      unidad: form.unidad,
      nota: "",
    });
  }

  function editarEntry(e: Entry) {
    setForm({
      fecha: e.fecha,
      tipo: e.tipo,
      ejercicio: e.ejercicio,
      valor: String(e.valor),
      unidad: e.unidad,
      nota: e.nota,
    });

    setEditando(e.id);
    setVista("registro");
  }

  async function borrarEntry(id: string) {
    if (!confirm("¿Borrar registro?")) return;

    setEntries(entries.filter((e) => e.id !== id));
    await supabase.from("workout_entries").delete().eq("id", id);
  }

  async function completarRutina(routine: Routine) {
    const existente = completions.find(
      (c) => c.routine === routine.name && c.fecha === fechaSeleccionada
    );

    if (existente) {
      setCompletions(completions.filter((c) => c.id !== existente.id));
      await supabase.from("workout_routine_completions").delete().eq("id", existente.id);
      return;
    }

    const nuevo = {
      id: crypto.randomUUID(),
      fecha: fechaSeleccionada,
      routine: routine.name,
    };

    setCompletions([nuevo, ...completions]);
    await supabase.from("workout_routine_completions").upsert(nuevo);
  }

  async function guardarObjetivo(e: React.FormEvent) {
    e.preventDefault();

    if (!goalForm.objetivo || Number(goalForm.objetivo) <= 0) return;

    const nuevo: Goal = {
      id: crypto.randomUUID(),
      ejercicio: goalForm.ejercicio.trim(),
      objetivo: Number(goalForm.objetivo),
      unidad: goalForm.unidad,
      nota: goalForm.nota.trim(),
    };

    setGoals([nuevo, ...goals]);
    await supabase.from("workout_goals").upsert(nuevo);

    setGoalForm({
      ejercicio: nuevo.ejercicio,
      objetivo: "",
      unidad: nuevo.unidad,
      nota: "",
    });
  }

  async function borrarObjetivo(id: string) {
    if (!confirm("¿Borrar objetivo?")) return;

    setGoals(goals.filter((g) => g.id !== id));
    await supabase.from("workout_goals").delete().eq("id", id);
  }

  function exportarCSV() {
    const filas = [
      ["Fecha", "Tipo", "Ejercicio", "Valor", "Unidad", "Nota"],
      ...ordenados.map((e) => [e.fecha, e.tipo, e.ejercicio, String(e.valor), e.unidad, e.nota]),
    ];

    descargar("trainc-registro.csv", filas.map((f) => f.join(";")).join("\n"), "text/csv");
  }

  function exportarBackup() {
    descargar(
      `trainc-backup-${hoyLocal()}.json`,
      JSON.stringify(
        { entries, goals, completions, routines, routineExercises, schedule, monthlyTargets },
        null,
        2
      ),
      "application/json"
    );
  }
    return (
    <main className="min-h-screen bg-[#f4fbf7] text-[#0b3024]">
      <div className="mx-auto max-w-7xl px-4 py-5">
        <header className="mb-5 rounded-[32px] border border-[#d8f0e5] bg-white/90 p-5 shadow-[0_18px_60px_rgba(11,48,36,0.08)]">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <div className="relative h-14 w-14 overflow-hidden rounded-2xl bg-[#e6f8ef]">
                <Image
                  src="/images/entreno-logo.png"
                  alt="TrainC+"
                  fill
                  className="object-contain p-1"
                  priority
                />
              </div>

              <div>
                <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#65b894]">
                  Entrenamiento personal
                </p>
                <h1 className="mt-1 text-3xl font-black tracking-tight text-[#0f7a4f] md:text-4xl">
                  TrainC+
                </h1>
                <p className="mt-1 text-sm font-semibold text-[#5f7f70]">
                  {estado}
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-[#d8f0e5] bg-[#f6fffa] px-5 py-3 text-right">
              <p className="font-black text-[#0f7a4f]">
                {fechaBonita(fechaSeleccionada)}
              </p>
            </div>
          </div>
        </header>

        <nav className="sticky top-3 z-30 mb-5 flex gap-2 overflow-x-auto rounded-[24px] border border-[#d8f0e5] bg-white/90 p-2 shadow-[0_14px_45px_rgba(11,48,36,0.08)]">
          <Nav activo={vista === "inicio"} onClick={() => setVista("inicio")}>
            Inicio
          </Nav>
          <Nav activo={vista === "rutinas"} onClick={() => setVista("rutinas")}>
            Rutinas
          </Nav>
          <Nav activo={vista === "resumen"} onClick={() => setVista("resumen")}>
            Resumen
          </Nav>
          <Nav activo={vista === "registro"} onClick={() => setVista("registro")}>
            Registro
          </Nav>
          <Nav activo={vista === "objetivos"} onClick={() => setVista("objetivos")}>
            Objetivos
          </Nav>
        </nav>

        {vista === "inicio" && (
          <section className="space-y-5">
            <Panel title="Semana">
              <div className="grid gap-3 md:grid-cols-7">
                {diasSemana.map((d) => {
                  const item = schedule.find((s) => s.fecha === d.fecha);
                  const routine = routines.find((r) => r.id === item?.routine_id);
                  const done =
                    routine &&
                    completions.some(
                      (c) => c.routine === routine.name && c.fecha === d.fecha
                    );

                  return (
                    <button
                      key={d.fecha}
                      onClick={() => {
                        setFechaSeleccionada(d.fecha);
                        setRutinaAbierta(false);
                        setEjerciciosAbiertos({});
                      }}
                      className={
                        fechaSeleccionada === d.fecha
                          ? "rounded-3xl bg-[#0f7a4f] p-4 text-white"
                          : done
                          ? "rounded-3xl bg-emerald-100 p-4 text-emerald-800"
                          : routine
                          ? "rounded-3xl bg-red-100 p-4 text-red-800"
                          : "rounded-3xl bg-[#f4fbf7] p-4 text-[#5f7f70]"
                      }
                    >
                      <p className="text-xs font-black">{d.label}</p>
                      <p className="mt-1 text-xl font-black">{d.dia}</p>
                      <p className="mt-1 text-xs font-bold">
                        {routine ? routine.name : "Libre"}
                      </p>
                    </button>
                  );
                })}
              </div>
            </Panel>

            <Panel title="Rutina del día">
              <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
                <input
                  className="input"
                  type="date"
                  value={fechaSeleccionada}
                  onChange={(e) => {
                    setFechaSeleccionada(e.target.value);
                    setRutinaAbierta(false);
                    setEjerciciosAbiertos({});
                  }}
                />

                <select
                  className="input"
                  value={rutinaDelDia?.routine_id || ""}
                  onChange={(e) => asignarRutina(fechaSeleccionada, e.target.value)}
                >
                  <option value="">Día libre / sin rutina</option>
                  {routines.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>

                <select
                  className="input"
                  defaultValue=""
                  onChange={(e) => {
                    if (e.target.value) moverRutina(fechaSeleccionada, e.target.value);
                    e.target.value = "";
                  }}
                >
                  <option value="">Mover a...</option>
                  {diasSemana.map((d) => (
                    <option key={d.fecha} value={d.fecha}>
                      {d.label} {d.dia}
                    </option>
                  ))}
                </select>
              </div>
            </Panel>

            {!rutinaActiva && (
              <Panel>
                <Empty>
                  No tenés rutina asignada para este día. Elegí una arriba o creá rutinas en “Rutinas”.
                </Empty>
              </Panel>
            )}

            {rutinaActiva && (
              <div className="grid items-start gap-5 lg:grid-cols-[1.1fr_0.9fr]">
                <section className="rounded-[34px] border border-[#d8f0e5] bg-white p-5 shadow-[0_18px_60px_rgba(11,48,36,0.08)]">
                  <button
                    type="button"
                    onClick={() => {
                      setRutinaAbierta(!rutinaAbierta);
                      if (rutinaAbierta) setEjerciciosAbiertos({});
                    }}
                    className="w-full rounded-[26px] bg-gradient-to-br from-[#11a36b] to-[#064d35] p-5 text-left text-white shadow-[0_16px_35px_rgba(15,122,79,0.22)]"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-bold uppercase tracking-[0.18em] text-white/70">
                          Rutina asignada
                        </p>
                        <h2 className="mt-1 text-3xl font-black">
                          {rutinaActiva.name}
                        </h2>
                        <p className="mt-2 text-sm text-white/75">
                          {fechaBonita(fechaSeleccionada)} · {ejerciciosRutina.length} ejercicios
                        </p>
                      </div>

                      <span className="rounded-full bg-white px-5 py-3 text-sm font-black text-[#0f7a4f]">
                        {rutinaAbierta ? "Cerrar" : "Abrir"}
                      </span>
                    </div>
                  </button>

                  {rutinaAbierta && (
                    <div className="mt-4 space-y-3">
                      {ejerciciosRutina.map((ej) => {
                        const abierto = ejerciciosAbiertos[ej.id] || false;
                        const ultima = ultimaMarca(ordenados, ej.nombre, ej.unidad);
                        const delDia = ordenados.filter(
                          (e) =>
                            e.fecha === fechaSeleccionada &&
                            e.ejercicio === ej.nombre
                        );

                        return (
                          <div
                            key={ej.id}
                            className="overflow-hidden rounded-3xl border border-[#d8f0e5] bg-[#f6fffa]"
                          >
                            <button
                              type="button"
                              onClick={() =>
                                setEjerciciosAbiertos({
                                  ...ejerciciosAbiertos,
                                  [ej.id]: !abierto,
                                })
                              }
                              className="w-full p-4 text-left"
                            >
                              <div className="flex items-center justify-between gap-3">
                                <div>
                                  <h3 className="text-xl font-black">{ej.nombre}</h3>
                                  <p className="text-sm text-[#5f7f70]">
                                    {ej.series} series · Última:{" "}
                                    <b>
                                      {ultima
                                        ? `${ultima.valor} ${ultima.unidad}`
                                        : "sin datos"}
                                    </b>
                                  </p>
                                  <p className="text-sm text-[#5f7f70]">
                                    Hoy:{" "}
                                    <b>
                                      {delDia.length
                                        ? delDia
                                            .map((x) => `${x.nota}: ${x.valor}`)
                                            .join(" · ")
                                        : "sin cargar"}
                                    </b>
                                  </p>
                                </div>

                                <span className="rounded-full bg-white px-4 py-2 text-sm font-black text-[#0f7a4f]">
                                  {abierto ? "Cerrar" : "Cargar"}
                                </span>
                              </div>
                            </button>

                            {abierto && (
                              <div className="border-t border-[#d8f0e5] p-4 pt-3">
                                <div className="space-y-2">
                                  {Array.from(
                                    { length: Math.max(ej.series, 1) },
                                    (_, i) => i + 1
                                  ).map((serie) => {
                                    const key = `${ej.id}-${serie}`;

                                    return (
                                      <div
                                        key={key}
                                        className="grid grid-cols-[86px_1fr_auto] gap-2"
                                      >
                                        <div className="rounded-2xl bg-white px-4 py-3 font-black text-[#0f7a4f]">
                                          Serie {serie}
                                        </div>

                                        <input
                                          className="input"
                                          type="number"
                                          step="0.01"
                                          placeholder={ej.unidad}
                                          value={quickValues[key] || ""}
                                          onChange={(e) =>
                                            setQuickValues({
                                              ...quickValues,
                                              [key]: e.target.value,
                                            })
                                          }
                                        />

                                        <button
                                          onClick={() => guardarSerie(ej, serie)}
                                          className="btn-primary"
                                        >
                                          Guardar
                                        </button>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}

                      {!ejerciciosRutina.length && (
                        <Empty>Esta rutina todavía no tiene ejercicios.</Empty>
                      )}

                      <button
                        onClick={() => completarRutina(rutinaActiva)}
                        className={
                          rutinaCompletaHoy
                            ? "w-full rounded-2xl bg-emerald-100 py-4 font-black text-emerald-800"
                            : "w-full rounded-2xl bg-gradient-to-r from-[#11a36b] to-[#0f7a4f] py-4 font-black text-white"
                        }
                      >
                        {rutinaCompletaHoy
                          ? "Rutina completada"
                          : "Marcar rutina como completa"}
                      </button>
                    </div>
                  )}
                </section>

                <section className="space-y-4">
                  <div className="rounded-[34px] bg-gradient-to-br from-[#11a36b] via-[#0f8a5d] to-[#064d35] p-6 text-white shadow-[0_16px_40px_rgba(15,122,79,0.2)]">
                    <p className="text-sm font-semibold text-white/70">
                      Rutinas del mes
                    </p>
                    <h2 className="mt-2 text-5xl font-black">
                      {rutinasCompletadasMes}/{rutinasObjetivoMes || "-"}
                    </h2>
                    <p className="mt-3 text-sm text-white/70">
                      completadas sobre tu objetivo mensual.
                    </p>
                    <Progress value={porcentajeRutinasMes} light />
                  </div>

                  <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-1">
                    <Mini
                      title="Rutinas semana"
                      value={`${completadasSemana.filter((x) => x.done).length}/${routines.length}`}
                    />
                    <Mini title="Km mes" value={`${totalKmMes.toFixed(2)} km`} />
                    <Mini title="Días entrenados" value={String(diasEntrenadosMes)} />
                  </div>

                  <Panel title="Últimos registros">
                    <div className="space-y-3">
                      {ordenados.slice(0, 5).map((e) => (
                        <EntryCard
                          key={e.id}
                          e={e}
                          onEdit={editarEntry}
                          onDelete={borrarEntry}
                        />
                      ))}
                      {!ordenados.length && <Empty>Todavía no cargaste nada.</Empty>}
                    </div>
                  </Panel>
                </section>
              </div>
            )}
          </section>
        )}

        {vista === "rutinas" && (
          <section className="space-y-5">
            <Panel title="Crear rutina">
              <form
                onSubmit={crearRutina}
                className="grid gap-3 md:grid-cols-[1fr_180px_auto]"
              >
                <input
                  className="input"
                  placeholder="Nombre de rutina: Empuje, Piernas..."
                  value={nuevaRutina.name}
                  onChange={(e) =>
                    setNuevaRutina({ ...nuevaRutina, name: e.target.value })
                  }
                />
                <input
                  className="input"
                  type="number"
                  min="1"
                  max="7"
                  placeholder="Veces/semana"
                  value={nuevaRutina.days_per_week}
                  onChange={(e) =>
                    setNuevaRutina({
                      ...nuevaRutina,
                      days_per_week: e.target.value,
                    })
                  }
                />
                <button className="btn-primary">Crear</button>
              </form>
            </Panel>

            <Panel title="Agregar ejercicio a rutina">
              <form
                onSubmit={agregarEjercicio}
                className="grid gap-3 md:grid-cols-[1fr_1fr_100px_130px_130px_auto]"
              >
                <select
                  className="input"
                  value={nuevoEjercicio.routine_id}
                  onChange={(e) =>
                    setNuevoEjercicio({
                      ...nuevoEjercicio,
                      routine_id: e.target.value,
                    })
                  }
                >
                  <option value="">Elegir rutina</option>
                  {routines.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>

                <input
                  className="input"
                  placeholder="Ejercicio"
                  value={nuevoEjercicio.nombre}
                  onChange={(e) =>
                    setNuevoEjercicio({
                      ...nuevoEjercicio,
                      nombre: e.target.value,
                    })
                  }
                />

                <input
                  className="input"
                  type="number"
                  min="1"
                  placeholder="Series"
                  value={nuevoEjercicio.series}
                  onChange={(e) =>
                    setNuevoEjercicio({
                      ...nuevoEjercicio,
                      series: e.target.value,
                    })
                  }
                />

                <select
                  className="input"
                  value={nuevoEjercicio.unidad}
                  onChange={(e) =>
                    setNuevoEjercicio({
                      ...nuevoEjercicio,
                      unidad: e.target.value,
                    })
                  }
                >
                  <option value="reps">reps</option>
                  <option value="km">km</option>
                  <option value="min">min</option>
                  <option value="kg">kg</option>
                </select>

                <select
                  className="input"
                  value={nuevoEjercicio.tipo}
                  onChange={(e) =>
                    setNuevoEjercicio({
                      ...nuevoEjercicio,
                      tipo: e.target.value as Tipo,
                    })
                  }
                >
                  <option value="fuerza">fuerza</option>
                  <option value="running">running</option>
                  <option value="tiempo">tiempo</option>
                  <option value="otro">otro</option>
                </select>

                <button className="btn-primary">Agregar</button>
              </form>
            </Panel>

            <div className="grid gap-5 lg:grid-cols-2">
              {routines.map((r) => (
                <Panel key={r.id} title="Editar rutina">
                  <div className="mb-4 grid gap-3 md:grid-cols-[1fr_120px_auto]">
                    <input
                      className="input"
                      value={editRoutine[r.id]?.name || r.name}
                      onChange={(e) =>
                        setEditRoutine({
                          ...editRoutine,
                          [r.id]: {
                            ...(editRoutine[r.id] || {
                              name: r.name,
                              days_per_week: String(r.days_per_week),
                            }),
                            name: e.target.value,
                          },
                        })
                      }
                    />

                    <input
                      className="input"
                      type="number"
                      min="1"
                      max="7"
                      value={
                        editRoutine[r.id]?.days_per_week ||
                        String(r.days_per_week)
                      }
                      onChange={(e) =>
                        setEditRoutine({
                          ...editRoutine,
                          [r.id]: {
                            ...(editRoutine[r.id] || {
                              name: r.name,
                              days_per_week: String(r.days_per_week),
                            }),
                            days_per_week: e.target.value,
                          },
                        })
                      }
                    />

                    <button
                      onClick={() => actualizarRutina(r)}
                      className="btn-primary"
                    >
                      Guardar
                    </button>
                  </div>

                  <div className="space-y-2">
                    {routineExercises
                      .filter((e) => e.routine_id === r.id)
                      .map((e) => (
                        <div key={e.id} className="rounded-2xl bg-[#f4fbf7] p-4">
                          <div className="grid gap-3 md:grid-cols-[1fr_100px_120px_120px_auto]">
                            <input
                              className="input"
                              value={e.nombre}
                              onChange={(ev) =>
                                actualizarEjercicio({
                                  ...e,
                                  nombre: ev.target.value,
                                })
                              }
                            />

                            <input
                              className="input"
                              type="number"
                              min="1"
                              value={e.series}
                              onChange={(ev) =>
                                actualizarEjercicio({
                                  ...e,
                                  series: Number(ev.target.value) || 1,
                                })
                              }
                            />

                            <select
                              className="input"
                              value={e.unidad}
                              onChange={(ev) =>
                                actualizarEjercicio({
                                  ...e,
                                  unidad: ev.target.value,
                                })
                              }
                            >
                              <option value="reps">reps</option>
                              <option value="km">km</option>
                              <option value="min">min</option>
                              <option value="kg">kg</option>
                            </select>

                            <select
                              className="input"
                              value={e.tipo}
                              onChange={(ev) =>
                                actualizarEjercicio({
                                  ...e,
                                  tipo: ev.target.value as Tipo,
                                })
                              }
                            >
                              <option value="fuerza">fuerza</option>
                              <option value="running">running</option>
                              <option value="tiempo">tiempo</option>
                              <option value="otro">otro</option>
                            </select>

                            <button
                              onClick={() => borrarEjercicio(e.id)}
                              className="rounded-xl bg-red-50 px-3 py-2 font-black text-red-600"
                            >
                              Borrar
                            </button>
                          </div>
                        </div>
                      ))}

                    {!routineExercises.filter((e) => e.routine_id === r.id)
                      .length && <Empty>Sin ejercicios.</Empty>}
                  </div>

                  <button
                    onClick={() => borrarRutina(r.id)}
                    className="mt-4 w-full rounded-2xl bg-red-50 py-3 font-black text-red-600"
                  >
                    Borrar rutina
                  </button>
                </Panel>
              ))}

              {!routines.length && (
                <Panel>
                  <Empty>No hay rutinas creadas.</Empty>
                </Panel>
              )}
            </div>
          </section>
        )}

        {vista === "resumen" && (
          <section className="space-y-5">
            <div className="rounded-[28px] border border-[#d8f0e5] bg-white p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-2xl font-black">Resumen</h2>
                  <p className="text-sm text-[#5f7f70]">
                    Comparación semanal, mes y progreso.
                  </p>
                </div>

                <input
                  className="input max-w-xs"
                  type="month"
                  value={mes}
                  onChange={(e) => setMes(e.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-4">
              <Big title="Días entrenados" value={String(diasEntrenadosMes)} />
              <Big
                title="Rutinas mes"
                value={`${rutinasCompletadasMes}/${rutinasObjetivoMes || "-"}`}
              />
              <Big title="Km mes" value={`${totalKmMes.toFixed(2)} km`} />
              <Big title="Mejor marca" value={mejorMarca || "-"} dark />
            </div>

            <Panel title="Objetivo mensual de entrenamientos">
              <div className="grid gap-3 md:grid-cols-[1fr_180px]">
                <input
                  className="input"
                  type="number"
                  min="0"
                  placeholder="Ej: 14 entrenamientos este mes"
                  value={rutinasObjetivoMes || ""}
                  onChange={(e) => guardarObjetivoMensual(Number(e.target.value))}
                />
                <div className="rounded-2xl bg-[#f4fbf7] p-4 text-center">
                  <p className="text-sm font-bold text-[#5f7f70]">Progreso</p>
                  <p className="text-2xl font-black">
                    {rutinasCompletadasMes}/{rutinasObjetivoMes || "-"}
                  </p>
                </div>
              </div>
              <Progress value={porcentajeRutinasMes} />
            </Panel>

            <Panel title="Comparación de semanas">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-3xl bg-[#f4fbf7] p-5">
                  <p className="text-sm font-bold text-[#5f7f70]">
                    Semana actual
                  </p>
                  <p className="mt-2 text-3xl font-black">
                    {semanasComparadas.actual.count} registros
                  </p>
                  <p className="text-sm text-[#5f7f70]">
                    {semanasComparadas.actual.km.toFixed(2)} km ·{" "}
                    {semanasComparadas.actual.reps} reps
                  </p>
                </div>
                <div className="rounded-3xl bg-[#f4fbf7] p-5">
                  <p className="text-sm font-bold text-[#5f7f70]">
                    Semana anterior
                  </p>
                  <p className="mt-2 text-3xl font-black">
                    {semanasComparadas.anterior.count} registros
                  </p>
                  <p className="text-sm text-[#5f7f70]">
                    {semanasComparadas.anterior.km.toFixed(2)} km ·{" "}
                    {semanasComparadas.anterior.reps} reps
                  </p>
                </div>
              </div>
            </Panel>

            <Panel title="Rutinas de la semana">
              <div className="grid gap-3 md:grid-cols-4">
                {completadasSemana.map((r) => (
                  <div
                    key={r.routine.id}
                    className={
                      r.done
                        ? "rounded-3xl bg-emerald-100 p-4 text-emerald-800"
                        : "rounded-3xl bg-red-100 p-4 text-red-800"
                    }
                  >
                    <p className="font-black">{r.routine.name}</p>
                    <p className="text-sm font-semibold">
                      {r.done ? "Completada" : "Pendiente"}
                    </p>
                  </div>
                ))}
              </div>
            </Panel>

            <Panel title="Ejercicios del mes">
              <div className="space-y-3">
                {ejerciciosMes.map(([ej, total]) => (
                  <div key={ej} className="rounded-2xl bg-[#f4fbf7] p-4">
                    <div className="flex justify-between">
                      <b>{ej}</b>
                      <b>{total}</b>
                    </div>
                    <Progress
                      value={
                        (total / Math.max(...ejerciciosMes.map((x) => x[1]), 1)) *
                        100
                      }
                    />
                  </div>
                ))}
                {!ejerciciosMes.length && <Empty>Sin datos este mes.</Empty>}
              </div>
            </Panel>

            <Panel title="Exportar / Backup">
              <div className="grid gap-3 md:grid-cols-2">
                <button onClick={exportarCSV} className="btn-primary">
                  Exportar CSV
                </button>
                <button onClick={exportarBackup} className="btn-dark">
                  Backup JSON
                </button>
              </div>
            </Panel>
          </section>
        )}

        {vista === "registro" && (
          <section className="space-y-5">
            <Panel title={editando ? "Editar registro" : "Carga manual"}>
              <form
                onSubmit={guardarManual}
                className="grid gap-3 md:grid-cols-[140px_1fr_120px_120px_1fr_auto]"
              >
                <input
                  className="input"
                  type="date"
                  value={form.fecha}
                  onChange={(e) => setForm({ ...form, fecha: e.target.value })}
                />
                <input
                  className="input"
                  value={form.ejercicio}
                  onChange={(e) =>
                    setForm({ ...form, ejercicio: e.target.value })
                  }
                />
                <input
                  className="input"
                  type="number"
                  step="0.01"
                  placeholder="valor"
                  value={form.valor}
                  onChange={(e) => setForm({ ...form, valor: e.target.value })}
                />
                <select
                  className="input"
                  value={form.unidad}
                  onChange={(e) => setForm({ ...form, unidad: e.target.value })}
                >
                  <option value="reps">reps</option>
                  <option value="km">km</option>
                  <option value="min">min</option>
                  <option value="kg">kg</option>
                </select>
                <input
                  className="input"
                  placeholder="nota"
                  value={form.nota}
                  onChange={(e) => setForm({ ...form, nota: e.target.value })}
                />
                <button className="btn-primary">
                  {editando ? "Guardar" : "Agregar"}
                </button>
              </form>
            </Panel>

            <Panel title="Registro">
              <div className="mb-4">
                <input
                  className="input max-w-xs"
                  type="month"
                  value={mes}
                  onChange={(e) => setMes(e.target.value)}
                />
              </div>

              <div className="space-y-3">
                {entriesMes.map((e) => (
                  <EntryCard
                    key={e.id}
                    e={e}
                    onEdit={editarEntry}
                    onDelete={borrarEntry}
                  />
                ))}
                {!entriesMes.length && (
                  <Empty>No hay registros en este mes.</Empty>
                )}
              </div>
            </Panel>
          </section>
        )}

        {vista === "objetivos" && (
          <section className="space-y-5">
            <Panel title="Objetivo mensual de entrenamientos">
              <div className="grid gap-3 md:grid-cols-[1fr_180px]">
                <input
                  className="input"
                  type="number"
                  min="0"
                  placeholder="Ej: 14 entrenamientos este mes"
                  value={rutinasObjetivoMes || ""}
                  onChange={(e) => guardarObjetivoMensual(Number(e.target.value))}
                />
                <div className="rounded-2xl bg-[#f4fbf7] p-4 text-center">
                  <p className="text-sm font-bold text-[#5f7f70]">Progreso</p>
                  <p className="text-2xl font-black">
                    {rutinasCompletadasMes}/{rutinasObjetivoMes || "-"}
                  </p>
                </div>
              </div>
              <Progress value={porcentajeRutinasMes} />
            </Panel>

            <Panel title="Nuevo objetivo por ejercicio">
              <form
                onSubmit={guardarObjetivo}
                className="grid gap-3 md:grid-cols-[1fr_140px_120px_1fr_auto]"
              >
                <input
                  className="input"
                  placeholder="Ejercicio"
                  value={goalForm.ejercicio}
                  onChange={(e) =>
                    setGoalForm({ ...goalForm, ejercicio: e.target.value })
                  }
                />
                <input
                  className="input"
                  type="number"
                  step="0.01"
                  placeholder="Objetivo"
                  value={goalForm.objetivo}
                  onChange={(e) =>
                    setGoalForm({ ...goalForm, objetivo: e.target.value })
                  }
                />
                <select
                  className="input"
                  value={goalForm.unidad}
                  onChange={(e) =>
                    setGoalForm({ ...goalForm, unidad: e.target.value })
                  }
                >
                  <option value="reps">reps</option>
                  <option value="km">km</option>
                  <option value="min">min</option>
                  <option value="kg">kg</option>
                </select>
                <input
                  className="input"
                  placeholder="Nota"
                  value={goalForm.nota}
                  onChange={(e) =>
                    setGoalForm({ ...goalForm, nota: e.target.value })
                  }
                />
                <button className="btn-primary">Agregar</button>
              </form>
            </Panel>

            <ObjetivosPanel
              title="Objetivos por ejercicio"
              goals={goals}
              entries={entries}
              onDelete={borrarObjetivo}
            />
          </section>
        )}
      </div>

      <style jsx global>{`
        .input {
          width: 100%;
          border: 1px solid #cfe9dc;
          border-radius: 18px;
          background: white;
          padding: 13px 15px;
          outline: none;
          color: #0b3024;
        }

        .input:focus {
          border-color: #11a36b;
          box-shadow: 0 0 0 4px rgba(17, 163, 107, 0.12);
        }

        .btn-primary {
          border-radius: 18px;
          background: linear-gradient(90deg, #11a36b, #0f7a4f);
          padding: 13px 18px;
          font-weight: 900;
          color: white;
        }

        .btn-dark {
          border-radius: 18px;
          background: #0b3024;
          padding: 13px 18px;
          font-weight: 900;
          color: white;
        }
      `}</style>
    </main>
  );
}

function getSemanaActual() {
  const now = new Date();
  const day = now.getDay() || 7;
  const monday = new Date(now);
  monday.setDate(now.getDate() - day + 1);
  monday.setMinutes(monday.getMinutes() - monday.getTimezoneOffset());

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  return {
    inicio: monday.toISOString().slice(0, 10),
    fin: sunday.toISOString().slice(0, 10),
  };
}

function getDiasSemana() {
  const labels = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
  const now = new Date();
  const day = now.getDay() || 7;
  const monday = new Date(now);
  monday.setDate(now.getDate() - day + 1);

  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    const iso = d.toISOString().slice(0, 10);
    return {
      fecha: iso,
      label: labels[i],
      dia: iso.slice(8, 10),
    };
  });
}

function resumenPorEjercicio(entries: Entry[]) {
  const map: Record<string, number> = {};
  entries.forEach((e) => {
    map[e.ejercicio] = (map[e.ejercicio] || 0) + e.valor;
  });
  return Object.entries(map).sort((a, b) => b[1] - a[1]);
}

function compararSemanas(entries: Entry[]) {
  const actual = getSemanaActual();

  const startActual = new Date(actual.inicio);
  const startAnterior = new Date(startActual);
  startAnterior.setDate(startActual.getDate() - 7);

  const endAnterior = new Date(startActual);
  endAnterior.setDate(startActual.getDate() - 1);

  const anteriorInicio = startAnterior.toISOString().slice(0, 10);
  const anteriorFin = endAnterior.toISOString().slice(0, 10);

  return {
    actual: statsPeriodo(entries.filter((e) => e.fecha >= actual.inicio && e.fecha <= actual.fin)),
    anterior: statsPeriodo(entries.filter((e) => e.fecha >= anteriorInicio && e.fecha <= anteriorFin)),
  };
}

function statsPeriodo(entries: Entry[]) {
  return {
    count: entries.length,
    reps: entries.filter((e) => e.unidad === "reps").reduce((a, b) => a + b.valor, 0),
    km: entries.filter((e) => e.unidad === "km").reduce((a, b) => a + b.valor, 0),
  };
}

function ultimaMarca(entries: Entry[], ejercicio: string, unidad: string) {
  return entries.find((e) => e.ejercicio === ejercicio && e.unidad === unidad);
}

function obtenerMejorMarca(entries: Entry[]) {
  if (!entries.length) return "";
  const sorted = [...entries].sort((a, b) => b.valor - a.valor);
  const best = sorted[0];
  return `${best.ejercicio}: ${best.valor} ${best.unidad}`;
}

function mejorValor(entries: Entry[], ejercicio: string, unidad: string) {
  const values = entries
    .filter((e) => e.ejercicio.toLowerCase() === ejercicio.toLowerCase() && e.unidad === unidad)
    .map((e) => e.valor);

  return values.length ? Math.max(...values) : 0;
}

function descargar(nombre: string, contenido: string, tipo: string) {
  const blob = new Blob([contenido], { type: tipo });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nombre;
  a.click();
  URL.revokeObjectURL(url);
}

function Nav({
  activo,
  children,
  onClick,
}: {
  activo: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={
        activo
          ? "min-w-28 flex-1 rounded-2xl bg-gradient-to-r from-[#11a36b] to-[#0f7a4f] px-4 py-3 font-black text-white"
          : "min-w-28 flex-1 rounded-2xl px-4 py-3 font-black text-[#5f7f70]"
      }
    >
      {children}
    </button>
  );
}

function Panel({
  title,
  children,
}: {
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[34px] border border-[#d8f0e5] bg-white p-5 shadow-[0_18px_60px_rgba(11,48,36,0.08)]">
      {title && <h2 className="mb-4 text-2xl font-black">{title}</h2>}
      {children}
    </section>
  );
}

function Mini({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-[26px] border border-[#d8f0e5] bg-white p-4">
      <p className="text-sm font-semibold text-[#5f7f70]">{title}</p>
      <p className="mt-1 text-xl font-black">{value}</p>
    </div>
  );
}

function Big({
  title,
  value,
  dark,
}: {
  title: string;
  value: string;
  dark?: boolean;
}) {
  return (
    <div
      className={
        dark
          ? "rounded-[30px] bg-gradient-to-br from-[#11a36b] to-[#064d35] p-5 text-white"
          : "rounded-[30px] border border-[#d8f0e5] bg-white p-5"
      }
    >
      <p
        className={
          dark
            ? "text-sm font-semibold text-white/70"
            : "text-sm font-semibold text-[#5f7f70]"
        }
      >
        {title}
      </p>
      <p className="mt-2 text-2xl font-black">{value}</p>
    </div>
  );
}

function EntryCard({
  e,
  onEdit,
  onDelete,
}: {
  e: Entry;
  onEdit: (e: Entry) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="rounded-3xl border border-[#d8f0e5] bg-white p-4">
      <div className="flex justify-between gap-3">
        <div>
          <p className="text-lg font-black">{e.ejercicio}</p>
          <p className="text-sm text-[#5f7f70]">
            {e.fecha} · {e.tipo} · {e.nota || "sin nota"}
          </p>
        </div>

        <p className="text-xl font-black text-[#0f7a4f]">
          {e.valor} {e.unidad}
        </p>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          onClick={() => onEdit(e)}
          className="rounded-2xl bg-[#e6f8ef] py-3 font-black text-[#0f7a4f]"
        >
          Editar
        </button>
        <button
          onClick={() => onDelete(e.id)}
          className="rounded-2xl bg-red-50 py-3 font-black text-red-600"
        >
          Borrar
        </button>
      </div>
    </div>
  );
}

function ObjetivosPanel({
  title,
  goals,
  entries,
  onDelete,
}: {
  title: string;
  goals: Goal[];
  entries: Entry[];
  onDelete: (id: string) => void;
}) {
  return (
    <Panel title={title}>
      <div className="space-y-3">
        {goals.map((g) => {
          const mejor = mejorValor(entries, g.ejercicio, g.unidad);
          const porcentaje = g.objetivo ? (mejor / g.objetivo) * 100 : 0;

          return (
            <div key={g.id} className="rounded-3xl bg-[#f4fbf7] p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <b>{g.ejercicio}</b>
                  <p className="text-sm text-[#5f7f70]">
                    Objetivo: {g.objetivo} {g.unidad} · Mejor: {mejor} {g.unidad}
                  </p>
                  {g.nota && (
                    <p className="mt-1 text-sm text-[#5f7f70]">{g.nota}</p>
                  )}
                </div>
                <button
                  onClick={() => onDelete(g.id)}
                  className="rounded-2xl bg-red-50 px-4 py-2 font-black text-red-600"
                >
                  Borrar
                </button>
              </div>
              <Progress value={porcentaje} />
            </div>
          );
        })}
        {!goals.length && <Empty>Sin objetivos.</Empty>}
      </div>
    </Panel>
  );
}

function Progress({ value, light }: { value: number; light?: boolean }) {
  const v = Math.min(Math.max(value, 0), 100);

  return (
    <div
      className={
        light
          ? "mt-3 h-3 overflow-hidden rounded-full bg-white/30"
          : "mt-3 h-3 overflow-hidden rounded-full bg-[#d8f0e5]"
      }
    >
      <div
        className={
          light
            ? "h-full rounded-full bg-white"
            : value >= 100
            ? "h-full rounded-full bg-[#11a36b]"
            : "h-full rounded-full bg-gradient-to-r from-[#4ade80] to-[#0f7a4f]"
        }
        style={{ width: `${v}%` }}
      />
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-2xl bg-[#f4fbf7] p-5 text-center text-[#5f7f70]">
      {children}
    </p>
  );
}