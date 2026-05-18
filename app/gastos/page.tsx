"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type Tipo = "gasto" | "ingreso";
type Vista = "inicio" | "resumen" | "movimientos" | "plan" | "config";

type Movimiento = {
  id: string;
  fecha: string;
  tipo: Tipo;
  categoria: string;
  detalle: string;
  monto: number;
};

const categoriasBase = [
  "Comida",
  "Casa",
  "Transporte",
  "Salidas",
  "Tecnología",
  "Ropa",
  "Alquiler",
  "Salud",
  "Viajes",
  "Otros",
];

function hoyLocal() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}

const hoy = hoyLocal();
const mesActual = hoy.slice(0, 7);
const anioActual = hoy.slice(0, 4);

function dinero(n: number) {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
  }).format(n || 0);
}

export default function GastosPage() {
  const [vista, setVista] = useState<Vista>("inicio");
  const [menu, setMenu] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [estadoOnline, setEstadoOnline] = useState("Sincronizando...");

  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [categorias, setCategorias] = useState<string[]>(categoriasBase);
  const [presupuestos, setPresupuestos] = useState<Record<string, number>>({});
  const [limites, setLimites] = useState<Record<string, Record<string, number>>>({});

  const [mes, setMes] = useState(mesActual);
  const [anio, setAnio] = useState(anioActual);
  const [editando, setEditando] = useState<string | null>(null);
  const [nuevaCategoria, setNuevaCategoria] = useState("");

  const [form, setForm] = useState({
    fecha: hoy,
    tipo: "gasto" as Tipo,
    categoria: "Comida",
    monto: "",
    detalle: "",
  });

  useEffect(() => {
    cargarDatos();
  }, []);

  async function cargarDatos() {
    setCargando(true);
    setEstadoOnline("Sincronizando...");

    const { data: movs, error: movError } = await supabase
      .from("movements")
      .select("*")
      .order("fecha", { ascending: false });

    const { data: cats } = await supabase.from("categories").select("*");
    const { data: buds } = await supabase.from("budgets").select("*");
    const { data: lims } = await supabase.from("category_limits").select("*");

    if (movError) {
      setEstadoOnline("Error online");
      alert("Error cargando datos online: " + movError.message);
      setCargando(false);
      return;
    }

    if (movs) {
      setMovimientos(
        movs.map((m) => ({
          id: m.id,
          fecha: m.fecha,
          tipo: m.tipo as Tipo,
          categoria: m.categoria,
          detalle: m.detalle || "",
          monto: Number(m.monto),
        }))
      );
    }

    if (cats && cats.length > 0) {
      setCategorias(cats.map((c) => c.name));
    }

    if (buds) {
      const map: Record<string, number> = {};
      buds.forEach((b) => {
        map[b.month] = Number(b.amount);
      });
      setPresupuestos(map);
    }

    if (lims) {
      const map: Record<string, Record<string, number>> = {};
      lims.forEach((l) => {
        if (!map[l.month]) map[l.month] = {};
        map[l.month][l.category] = Number(l.amount);
      });
      setLimites(map);
    }

    setEstadoOnline("Guardado online");
    setCargando(false);
  }

  const ordenados = useMemo(
    () => [...movimientos].sort((a, b) => a.fecha.localeCompare(b.fecha)),
    [movimientos]
  );

  const movimientosMes = ordenados.filter((m) => m.fecha.startsWith(mes));
  const movimientosAnio = ordenados.filter((m) => m.fecha.startsWith(anio));

  const saldoAntesMes = calcularSaldoHasta(ordenados, mes + "-01");
  const ingresosMes = sumar(movimientosMes, "ingreso");
  const gastosMes = sumar(movimientosMes, "gasto");
  const balanceMes = ingresosMes - gastosMes;
  const saldoFinalMes = saldoAntesMes + balanceMes;
  const saldoActual = calcularSaldoHasta(ordenados, "9999-12-31");

  const presupuestoMes = presupuestos[mes] || 0;
  const restantePresupuesto = presupuestoMes - gastosMes;

  const hoyStr = hoyLocal();
  const diasRestantesIncluyendoHoy = calcularDiasRestantesIncluyendoHoy(mes);

  const gastosAntesDeHoy = movimientosMes
    .filter((m) => m.tipo === "gasto" && m.fecha < hoyStr)
    .reduce((acc, m) => acc + m.monto, 0);

  const gastosHoy = movimientosMes
    .filter((m) => m.tipo === "gasto" && m.fecha === hoyStr)
    .reduce((acc, m) => acc + m.monto, 0);

  const presupuestoRestanteAntesDeHoy = presupuestoMes - gastosAntesDeHoy;

  const permitidoHoy =
    diasRestantesIncluyendoHoy > 0
      ? presupuestoRestanteAntesDeHoy / diasRestantesIncluyendoHoy
      : presupuestoRestanteAntesDeHoy;

  const disponibleHoy = permitidoHoy - gastosHoy;

  const ingresosAnio = sumar(movimientosAnio, "ingreso");
  const gastosAnio = sumar(movimientosAnio, "gasto");
  const balanceAnio = ingresosAnio - gastosAnio;

  const categoriasMes = resumenCategorias(movimientosMes);
  const diasMes = resumenDias(movimientosMes);
  const mesesDelAnio = resumenMeses(ordenados, anio);
  const evolucion = evolucionSaldo(ordenados, anio);

  async function guardar(e: React.FormEvent) {
    e.preventDefault();

    if (!form.monto || Number(form.monto) <= 0) return;

    const nuevo: Movimiento = {
      id: editando || crypto.randomUUID(),
      fecha: form.fecha,
      tipo: form.tipo,
      categoria: form.categoria,
      detalle: form.detalle.trim(),
      monto: Number(form.monto),
    };

    setMovimientos(
      editando
        ? movimientos.map((m) => (m.id === editando ? nuevo : m))
        : [nuevo, ...movimientos]
    );

    setEstadoOnline("Guardando...");

    const { error } = await supabase.from("movements").upsert({
      id: nuevo.id,
      fecha: nuevo.fecha,
      tipo: nuevo.tipo,
      categoria: nuevo.categoria,
      detalle: nuevo.detalle,
      monto: nuevo.monto,
    });

    if (error) {
      setEstadoOnline("Error online");
      alert("No se pudo guardar online: " + error.message);
      return;
    }

    setEstadoOnline("Guardado online");
    setEditando(null);
    setForm({
      fecha: hoyLocal(),
      tipo: "gasto",
      categoria: categorias[0] || "Comida",
      monto: "",
      detalle: "",
    });
  }

  function editar(m: Movimiento) {
    setForm({
      fecha: m.fecha,
      tipo: m.tipo,
      categoria: m.categoria,
      monto: String(m.monto),
      detalle: m.detalle,
    });
    setEditando(m.id);
    setVista("inicio");
  }

  async function borrar(id: string) {
    if (!confirm("¿Borrar movimiento?")) return;

    setMovimientos(movimientos.filter((m) => m.id !== id));
    setEstadoOnline("Guardando...");

    const { error } = await supabase.from("movements").delete().eq("id", id);

    if (error) {
      setEstadoOnline("Error online");
      alert("No se pudo borrar online: " + error.message);
      return;
    }

    setEstadoOnline("Guardado online");
  }

  async function guardarPresupuesto(amount: number) {
    setPresupuestos({
      ...presupuestos,
      [mes]: amount,
    });

    setEstadoOnline("Guardando...");

    const { error } = await supabase.from("budgets").upsert({
      month: mes,
      amount,
    });

    setEstadoOnline(error ? "Error online" : "Guardado online");
    if (error) alert("No se pudo guardar presupuesto: " + error.message);
  }

  async function guardarLimite(cat: string, amount: number) {
    setLimites({
      ...limites,
      [mes]: {
        ...(limites[mes] || {}),
        [cat]: amount,
      },
    });

    setEstadoOnline("Guardando...");

    const { error } = await supabase.from("category_limits").upsert({
      month: mes,
      category: cat,
      amount,
    });

    setEstadoOnline(error ? "Error online" : "Guardado online");
    if (error) alert("No se pudo guardar límite: " + error.message);
  }

  async function agregarCategoria(e: React.FormEvent) {
    e.preventDefault();

    const c = nuevaCategoria.trim();
    if (!c || categorias.includes(c)) return;

    setCategorias([...categorias, c]);
    setNuevaCategoria("");
    setEstadoOnline("Guardando...");

    const { error } = await supabase.from("categories").upsert({
      name: c,
    });

    setEstadoOnline(error ? "Error online" : "Guardado online");
    if (error) alert("No se pudo guardar categoría: " + error.message);
  }

  function exportarCSV() {
    const filas = [
      ["Fecha", "Tipo", "Categoria", "Detalle", "Monto"],
      ...movimientosMes.map((m) => [m.fecha, m.tipo, m.categoria, m.detalle, String(m.monto)]),
    ];

    const blob = new Blob([filas.map((f) => f.join(";")).join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `finanzas-${mes}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="min-h-screen bg-[#eef1f5] text-slate-950">
      <div className="mx-auto max-w-7xl px-4 py-5">
        <header className="mb-5 rounded-[32px] border border-white bg-white/90 p-5 shadow-[0_18px_60px_rgba(15,23,42,0.08)] backdrop-blur">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-slate-400">
                Finanzas personales
              </p>
              <h1 className="mt-1 text-3xl font-black tracking-tight md:text-4xl">
                Panel financiero
              </h1>
              <p className="mt-1 text-sm font-semibold text-slate-500">
                {cargando ? "Cargando datos..." : estadoOnline}
              </p>
            </div>

            <div className="flex gap-2">
              <input className="control" type="month" value={mes} onChange={(e) => setMes(e.target.value)} />
              <input className="control w-28" type="number" value={anio} onChange={(e) => setAnio(e.target.value)} />
            </div>
          </div>
        </header>

        <nav className="sticky top-3 z-30 mb-5 flex gap-2 rounded-[24px] border border-white bg-white/90 p-2 shadow-[0_14px_45px_rgba(15,23,42,0.08)] backdrop-blur">
          <Nav activo={vista === "inicio"} onClick={() => setVista("inicio")}>Inicio</Nav>
          <Nav activo={vista === "resumen"} onClick={() => setVista("resumen")}>Resumen</Nav>

          <div className="relative flex-1">
            <button onClick={() => setMenu(!menu)} className="w-full rounded-2xl px-4 py-3 font-black text-slate-500">
              Más
            </button>

            {menu && (
              <div className="absolute right-0 top-14 w-56 rounded-3xl border border-slate-100 bg-white p-2 shadow-xl">
                <Drop onClick={() => { setVista("movimientos"); setMenu(false); }}>Movimientos</Drop>
                <Drop onClick={() => { setVista("plan"); setMenu(false); }}>Presupuesto</Drop>
                <Drop onClick={() => { setVista("config"); setMenu(false); }}>Configuración</Drop>
              </div>
            )}
          </div>
        </nav>

        {vista === "inicio" && (
          <section className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
            <Panel>
              <h2 className="text-2xl font-black">{editando ? "Editar movimiento" : "Carga rápida"}</h2>
              <p className="mb-5 mt-1 text-sm text-slate-500">Diseñado para cargar desde el celular en segundos.</p>

              <form onSubmit={guardar} className="space-y-5">
                <Field label="Fecha">
                  <input className="input" type="date" value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} />
                </Field>

                <Field label="Tipo">
                  <div className="grid grid-cols-2 gap-2">
                    <Option active={form.tipo === "gasto"} onClick={() => setForm({ ...form, tipo: "gasto" })}>Gasto</Option>
                    <Option active={form.tipo === "ingreso"} onClick={() => setForm({ ...form, tipo: "ingreso" })}>Ingreso</Option>
                  </div>
                </Field>

                <Field label="Categoría">
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {categorias.map((c) => (
                      <Option key={c} active={form.categoria === c} onClick={() => setForm({ ...form, categoria: c })}>{c}</Option>
                    ))}
                  </div>
                </Field>

                <Field label="Monto">
                  <input className="input text-4xl font-black" autoFocus type="number" step="0.01" placeholder="0,00" value={form.monto} onChange={(e) => setForm({ ...form, monto: e.target.value })} />
                </Field>

                <Field label="Detalle">
                  <input className="input" placeholder="Ej: supermercado, sueldo, café..." value={form.detalle} onChange={(e) => setForm({ ...form, detalle: e.target.value })} />
                </Field>

                <button className="w-full rounded-2xl bg-slate-950 py-4 font-black text-white shadow-[0_12px_30px_rgba(15,23,42,0.22)]">
                  {editando ? "Guardar cambios" : "Guardar movimiento"}
                </button>
              </form>
            </Panel>

            <section className="space-y-4">
              <div className="rounded-[34px] bg-slate-950 p-6 text-white shadow-[0_18px_60px_rgba(15,23,42,0.20)]">
                <p className="text-sm font-semibold text-white/60">Saldo total acumulado</p>
                <h2 className="mt-2 text-5xl font-black">{dinero(saldoActual)}</h2>
                <p className="mt-3 text-sm text-white/60">
                  Plata real acumulada, incluyendo lo que sobró de meses anteriores.
                </p>
              </div>

              <div className="rounded-[34px] border border-white bg-white p-6 shadow-[0_18px_60px_rgba(15,23,42,0.08)]">
                <p className="text-sm font-semibold text-slate-500">Disponible para hoy según presupuesto</p>
                <h2 className={disponibleHoy < 0 ? "mt-2 text-4xl font-black text-red-600" : "mt-2 text-4xl font-black text-slate-950"}>
                  {dinero(disponibleHoy)}
                </h2>

                <p className="mt-2 text-sm text-slate-500">
                  Hoy podías gastar <b>{dinero(permitidoHoy)}</b> · Gastaste hoy{" "}
                  <b>{dinero(gastosHoy)}</b>.
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  Presupuesto: <b>{dinero(presupuestoMes)}</b> · Gastado antes de hoy:{" "}
                  <b>{dinero(gastosAntesDeHoy)}</b> · Quedan <b>{diasRestantesIncluyendoHoy}</b> días contando hoy.
                </p>

                <Progress value={presupuestoMes ? (gastosMes / presupuestoMes) * 100 : 0} />
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <Mini title="Arrastre del mes" value={dinero(saldoAntesMes)} />
                <Mini title="Balance mes" value={dinero(balanceMes)} />
                <Mini title="Saldo fin de mes" value={dinero(saldoFinalMes)} />
              </div>
            </section>
          </section>
        )}

        {vista === "resumen" && (
          <section className="space-y-5">
            <div className="grid gap-3 md:grid-cols-4">
              <Big title="Ingresos mes" value={dinero(ingresosMes)} />
              <Big title="Gastos mes" value={dinero(gastosMes)} />
              <Big title="Resta presupuesto" value={dinero(restantePresupuesto)} />
              <Big title="Saldo total" value={dinero(saldoActual)} dark />
            </div>

            <div className="grid gap-5 xl:grid-cols-2">
              <Panel title="Flujo financiero del mes">
                <FlowChart inicial={saldoAntesMes} ingresos={ingresosMes} gastos={gastosMes} final={saldoFinalMes} />
              </Panel>

              <Panel title="Gastos por categoría">
                <CategoryChart data={categoriasMes} limites={limites[mes] || {}} />
              </Panel>
            </div>

            <Panel title="Gastos por día">
              <DailyList data={diasMes} />
            </Panel>

            <Panel title="Evolución anual del saldo acumulado">
              <LineBars data={evolucion} />
            </Panel>

            <Panel title="Resumen anual">
              <div className="mb-4 grid gap-3 md:grid-cols-3">
                <Mini title="Ingresos año" value={dinero(ingresosAnio)} />
                <Mini title="Gastos año" value={dinero(gastosAnio)} />
                <Mini title="Balance año" value={dinero(balanceAnio)} />
              </div>

              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {mesesDelAnio.map((m) => (
                  <div key={m.mes} className="rounded-3xl bg-slate-50 p-4">
                    <div className="flex justify-between">
                      <b>{m.mes}</b>
                      <b>{dinero(m.saldoFinal)}</b>
                    </div>
                    <p className="mt-2 text-sm text-slate-500">
                      Ingresos {dinero(m.ingresos)} · Gastos {dinero(m.gastos)}
                    </p>
                    <Progress value={(m.gastos / Math.max(...mesesDelAnio.map((x) => x.gastos), 1)) * 100} />
                  </div>
                ))}
              </div>
            </Panel>
          </section>
        )}

        {vista === "movimientos" && (
          <Panel title="Movimientos del mes">
            <button onClick={exportarCSV} className="mb-4 rounded-2xl bg-slate-950 px-5 py-3 font-black text-white">
              Descargar CSV
            </button>

            <div className="space-y-3">
              {movimientosMes.map((m) => (
                <div key={m.id} className="rounded-3xl border border-slate-100 bg-white p-4">
                  <div className="flex justify-between gap-4">
                    <div>
                      <p className="text-lg font-black">{m.detalle || m.categoria}</p>
                      <p className="text-sm text-slate-500">{m.fecha} · {m.categoria} · {m.tipo}</p>
                    </div>
                    <p className={m.tipo === "gasto" ? "text-xl font-black text-red-600" : "text-xl font-black text-green-600"}>
                      {m.tipo === "gasto" ? "-" : "+"}{dinero(m.monto)}
                    </p>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <button onClick={() => editar(m)} className="rounded-2xl bg-slate-100 py-3 font-black">Editar</button>
                    <button onClick={() => borrar(m.id)} className="rounded-2xl bg-red-50 py-3 font-black text-red-600">Borrar</button>
                  </div>
                </div>
              ))}

              {!movimientosMes.length && <Empty>No hay movimientos este mes.</Empty>}
            </div>
          </Panel>
        )}

        {vista === "plan" && (
          <section className="space-y-5">
            <Panel title="Presupuesto mensual">
              <p className="mb-4 text-sm text-slate-500">
                Define cuánto querés gastar este mes. El inicio calcula el disponible de hoy con este presupuesto.
              </p>

              <input
                className="input"
                type="number"
                step="0.01"
                placeholder="Ej: 300"
                value={presupuestoMes || ""}
                onChange={(e) => guardarPresupuesto(Number(e.target.value))}
              />

              <div className="mt-4 grid gap-3 md:grid-cols-4">
                <Mini title="Presupuesto" value={dinero(presupuestoMes)} />
                <Mini title="Gastado mes" value={dinero(gastosMes)} />
                <Mini title="Resta total" value={dinero(restantePresupuesto)} />
                <Mini title="Permitido hoy" value={dinero(permitidoHoy)} />
              </div>

              <Progress value={presupuestoMes ? (gastosMes / presupuestoMes) * 100 : 0} />
            </Panel>

            <Panel title="Límites por categoría">
              <div className="space-y-3">
                {categorias.map((cat) => {
                  const gastado = categoriasMes.find(([c]) => c === cat)?.[1] || 0;
                  const limite = limites[mes]?.[cat] || 0;

                  return (
                    <div key={cat} className="rounded-3xl bg-slate-50 p-4">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <div>
                          <b>{cat}</b>
                          <p className="text-sm text-slate-500">Gastado {dinero(gastado)}</p>
                        </div>
                        <input
                          className="control w-36"
                          type="number"
                          step="0.01"
                          placeholder="Límite"
                          value={limite || ""}
                          onChange={(e) => guardarLimite(cat, Number(e.target.value))}
                        />
                      </div>
                      <Progress value={limite ? (gastado / limite) * 100 : 0} />
                    </div>
                  );
                })}
              </div>
            </Panel>
          </section>
        )}

        {vista === "config" && (
          <Panel title="Configuración">
            <form className="flex gap-2" onSubmit={agregarCategoria}>
              <input className="input" placeholder="Nueva categoría" value={nuevaCategoria} onChange={(e) => setNuevaCategoria(e.target.value)} />
              <button className="rounded-2xl bg-slate-950 px-5 font-black text-white">Agregar</button>
            </form>

            <div className="mt-5 flex flex-wrap gap-2">
              {categorias.map((c) => (
                <span key={c} className="rounded-full bg-slate-100 px-4 py-2 text-sm font-black">{c}</span>
              ))}
            </div>
          </Panel>
        )}
      </div>

      <style jsx global>{`
        .input, .control {
          border: 1px solid #e5e7eb;
          border-radius: 18px;
          background: white;
          padding: 13px 15px;
          outline: none;
        }
        .input {
          width: 100%;
        }
        .input:focus, .control:focus {
          border-color: #0f172a;
          box-shadow: 0 0 0 4px rgba(15,23,42,.08);
        }
      `}</style>
    </main>
  );
}

function sumar(data: Movimiento[], tipo: Tipo) {
  return data.filter((m) => m.tipo === tipo).reduce((a, b) => a + b.monto, 0);
}

function calcularSaldoHasta(data: Movimiento[], fechaLimite: string) {
  return data
    .filter((m) => m.fecha < fechaLimite)
    .reduce((acc, m) => acc + (m.tipo === "ingreso" ? m.monto : -m.monto), 0);
}

function calcularDiasRestantesIncluyendoHoy(mes: string) {
  const actual = hoyLocal().slice(0, 7);
  const [y, m] = mes.split("-").map(Number);
  const ultimo = new Date(y, m, 0).getDate();

  if (mes < actual) return 0;
  if (mes > actual) return ultimo;

  const dia = Number(hoyLocal().slice(8, 10));
  return Math.max(ultimo - dia + 1, 1);
}

function resumenCategorias(data: Movimiento[]) {
  const map: Record<string, number> = {};
  data.filter((m) => m.tipo === "gasto").forEach((m) => {
    map[m.categoria] = (map[m.categoria] || 0) + m.monto;
  });
  return Object.entries(map).sort((a, b) => b[1] - a[1]);
}

function resumenDias(data: Movimiento[]) {
  const map: Record<string, number> = {};
  data.filter((m) => m.tipo === "gasto").forEach((m) => {
    map[m.fecha] = (map[m.fecha] || 0) + m.monto;
  });
  return Object.entries(map).sort((a, b) => b[0].localeCompare(a[0]));
}

function resumenMeses(data: Movimiento[], anio: string) {
  return Array.from({ length: 12 }, (_, i) => {
    const mes = `${anio}-${String(i + 1).padStart(2, "0")}`;
    const movs = data.filter((m) => m.fecha.startsWith(mes));
    const ingresos = sumar(movs, "ingreso");
    const gastos = sumar(movs, "gasto");
    const saldoInicial = calcularSaldoHasta(data, mes + "-01");
    return { mes, ingresos, gastos, saldoFinal: saldoInicial + ingresos - gastos };
  });
}

function evolucionSaldo(data: Movimiento[], anio: string) {
  return resumenMeses(data, anio).map((m) => ({
    label: m.mes.slice(5),
    value: m.saldoFinal,
  }));
}

function Nav({ activo, children, onClick }: { activo: boolean; children: React.ReactNode; onClick: () => void }) {
  return (
    <button onClick={onClick} className={activo ? "flex-1 rounded-2xl bg-slate-950 px-4 py-3 font-black text-white" : "flex-1 rounded-2xl px-4 py-3 font-black text-slate-500"}>
      {children}
    </button>
  );
}

function Drop({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return <button onClick={onClick} className="w-full rounded-2xl px-4 py-3 text-left font-black hover:bg-slate-50">{children}</button>;
}

function Panel({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[34px] border border-white bg-white p-5 shadow-[0_18px_60px_rgba(15,23,42,0.08)]">
      {title && <h2 className="mb-4 text-2xl font-black">{title}</h2>}
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-sm font-black text-slate-600">{label}</p>
      {children}
    </div>
  );
}

function Option({ active, children, onClick }: { active: boolean; children: React.ReactNode; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={active ? "rounded-2xl bg-slate-950 px-4 py-3 font-black text-white" : "rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-black text-slate-700"}>
      {children}
    </button>
  );
}

function Mini({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-[26px] border border-white bg-white p-4 shadow-[0_12px_35px_rgba(15,23,42,0.06)]">
      <p className="text-sm font-semibold text-slate-500">{title}</p>
      <p className="mt-1 text-xl font-black">{value}</p>
    </div>
  );
}

function Big({ title, value, dark }: { title: string; value: string; dark?: boolean }) {
  return (
    <div className={dark ? "rounded-[30px] bg-slate-950 p-5 text-white shadow-[0_18px_50px_rgba(15,23,42,0.18)]" : "rounded-[30px] border border-white bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.07)]"}>
      <p className={dark ? "text-sm font-semibold text-white/60" : "text-sm font-semibold text-slate-500"}>{title}</p>
      <p className="mt-2 text-2xl font-black">{value}</p>
    </div>
  );
}

function Progress({ value }: { value: number }) {
  const v = Math.min(Math.max(value, 0), 100);
  return (
    <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-200">
      <div className={value > 100 ? "h-full rounded-full bg-red-500" : "h-full rounded-full bg-slate-950"} style={{ width: `${v}%` }} />
    </div>
  );
}

function FlowChart({ inicial, ingresos, gastos, final }: { inicial: number; ingresos: number; gastos: number; final: number }) {
  const items = [
    ["Saldo inicial", inicial],
    ["Ingresos", ingresos],
    ["Gastos", -gastos],
    ["Saldo final", final],
  ] as const;

  const max = Math.max(...items.map((i) => Math.abs(i[1])), 1);

  return (
    <div className="space-y-4">
      {items.map(([label, value]) => (
        <div key={label}>
          <div className="mb-1 flex justify-between text-sm">
            <b>{label}</b>
            <b>{dinero(value)}</b>
          </div>
          <div className="h-4 overflow-hidden rounded-full bg-slate-100">
            <div className={value < 0 ? "h-full rounded-full bg-red-500" : "h-full rounded-full bg-slate-950"} style={{ width: `${Math.abs(value) / max * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function CategoryChart({ data, limites }: { data: [string, number][]; limites: Record<string, number> }) {
  if (!data.length) return <Empty>Sin gastos este mes.</Empty>;
  const max = Math.max(...data.map((x) => x[1]), 1);

  return (
    <div className="space-y-3">
      {data.map(([cat, total]) => {
        const limite = limites[cat] || 0;
        const value = limite ? (total / limite) * 100 : (total / max) * 100;

        return (
          <div key={cat} className="rounded-2xl bg-slate-50 p-4">
            <div className="flex justify-between">
              <div>
                <b>{cat}</b>
                {limite > 0 && <p className="text-xs text-slate-500">Límite {dinero(limite)}</p>}
              </div>
              <b>{dinero(total)}</b>
            </div>
            <Progress value={value} />
          </div>
        );
      })}
    </div>
  );
}

function DailyList({ data }: { data: [string, number][] }) {
  if (!data.length) return <Empty>Sin gastos diarios.</Empty>;

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {data.map(([fecha, total]) => (
        <div key={fecha} className="rounded-2xl bg-slate-50 p-4">
          <p className="text-sm font-semibold text-slate-500">{fecha}</p>
          <p className="mt-1 text-xl font-black">{dinero(total)}</p>
        </div>
      ))}
    </div>
  );
}

function LineBars({ data }: { data: { label: string; value: number }[] }) {
  const max = Math.max(...data.map((d) => Math.abs(d.value)), 1);

  return (
    <div className="flex h-72 items-end gap-2 rounded-3xl bg-slate-50 p-4">
      {data.map((d) => (
        <div key={d.label} className="flex flex-1 flex-col items-center gap-2">
          <div className="flex h-56 w-full items-end justify-center">
            <div
              title={`${d.label}: ${dinero(d.value)}`}
              className={d.value < 0 ? "w-full rounded-t-xl bg-red-500" : "w-full rounded-t-xl bg-slate-950"}
              style={{ height: `${Math.max(Math.abs(d.value) / max * 100, 3)}%` }}
            />
          </div>
          <span className="text-xs font-bold text-slate-500">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="rounded-2xl bg-slate-50 p-5 text-center text-slate-500">{children}</p>;
}