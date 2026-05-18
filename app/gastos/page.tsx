"use client";

import Image from "next/image";
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

const categoriasGastoBase = [
  "Comida",
  "Casa",
  "Transporte",
  "Salidas",
  "Tecnología",
  "Ropa",
  "Alquiler",
  "Salud",
  "Viajes",
  "Préstamos",
  "Otros",
];

const categoriasIngresoBase = [
  "Sueldo",
  "Devolución de préstamo",
  "Interés",
  "Propina",
  "Venta",
  "Regalo",
  "Otro ingreso",
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

function capitalizar(txt: string) {
  return txt.charAt(0).toUpperCase() + txt.slice(1);
}

function fechaBonita(fechaISO = hoyLocal()) {
  const [anio, mes, dia] = fechaISO.split("-").map(Number);
  return `${dia} de ${capitalizar(meses[mes - 1])} ${anio}`;
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
  const [estadoOnline, setEstadoOnline] = useState("Sincronizado");

  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [categoriasGasto, setCategoriasGasto] = useState<string[]>(categoriasGastoBase);
  const [categoriasIngreso, setCategoriasIngreso] = useState<string[]>(categoriasIngresoBase);
  const [presupuestos, setPresupuestos] = useState<Record<string, number>>({});
  const [limites, setLimites] = useState<Record<string, Record<string, number>>>({});

  const [mes, setMes] = useState(mesActual);
  const [anio, setAnio] = useState(anioActual);
  const [editando, setEditando] = useState<string | null>(null);
  const [nuevaCategoria, setNuevaCategoria] = useState("");
  const [tipoNuevaCategoria, setTipoNuevaCategoria] = useState<Tipo>("gasto");

  const [form, setForm] = useState({
    fecha: hoy,
    tipo: "gasto" as Tipo,
    categoria: "Comida",
    monto: "",
    detalle: "",
  });

  useEffect(() => {
    document.title = "FinanC+";

    const existingIcons = document.querySelectorAll(
      "link[rel*='icon']"
    );

    existingIcons.forEach((i) => i.remove());

    const icon = document.createElement("link");
    icon.rel = "icon";
    icon.type = "image/png";
    icon.href = "/images/financ-logo.png";
    document.head.appendChild(icon);

    cargarDatos();
  }, []);

  async function cargarDatos() {
    const { data: movs } = await supabase
      .from("movements")
      .select("*")
      .order("fecha", { ascending: false });

    const { data: buds } = await supabase
      .from("budgets")
      .select("*");

    if (movs) {
      setMovimientos(
        movs.map((m) => ({
          id: m.id,
          fecha: m.fecha,
          tipo: m.tipo,
          categoria: m.categoria,
          detalle: m.detalle || "",
          monto: Number(m.monto),
        }))
      );
    }

    if (buds) {
      const map: Record<string, number> = {};

      buds.forEach((b) => {
        map[b.month] = Number(b.amount);
      });

      setPresupuestos(map);
    }

    setCargando(false);
  }

  const categoriasActuales =
    form.tipo === "gasto"
      ? categoriasGasto
      : categoriasIngreso;

  const ordenados = useMemo(
    () => [...movimientos].sort((a, b) => a.fecha.localeCompare(b.fecha)),
    [movimientos]
  );

  const movimientosMes = ordenados.filter((m) =>
    m.fecha.startsWith(mes)
  );

  const saldoActual = calcularSaldoHasta(
    ordenados,
    "9999-12-31"
  );

  const ingresosMes = sumar(movimientosMes, "ingreso");
  const gastosMes = sumar(movimientosMes, "gasto");

  const presupuestoMes = presupuestos[mes] || 0;

  const gastosHoy = movimientosMes
    .filter(
      (m) =>
        m.tipo === "gasto" &&
        m.fecha === hoyLocal()
    )
    .reduce((a, b) => a + b.monto, 0);

  const gastosAntesDeHoy = movimientosMes
    .filter(
      (m) =>
        m.tipo === "gasto" &&
        m.fecha < hoyLocal()
    )
    .reduce((a, b) => a + b.monto, 0);

  const diasRestantes =
    calcularDiasRestantesIncluyendoHoy(mes);

  const permitidoHoy =
    diasRestantes > 0
      ? (presupuestoMes - gastosAntesDeHoy) /
        diasRestantes
      : 0;

  const disponibleHoy =
    permitidoHoy - gastosHoy;

  async function guardar(e: React.FormEvent) {
    e.preventDefault();

    if (!form.monto) return;

    const nuevo: Movimiento = {
      id: crypto.randomUUID(),
      fecha: form.fecha,
      tipo: form.tipo,
      categoria: form.categoria,
      detalle: form.detalle,
      monto: Number(form.monto),
    };

    setMovimientos([nuevo, ...movimientos]);

    await supabase
      .from("movements")
      .insert(nuevo);

    setForm({
      fecha: hoyLocal(),
      tipo: "gasto",
      categoria: "Comida",
      monto: "",
      detalle: "",
    });
  }

  return (
    <main className="min-h-screen bg-[#f2f8fc] text-[#08244a]">
      <div className="mx-auto max-w-7xl px-4 py-5">
        <header className="mb-5 rounded-[32px] border border-[#d6ebf7] bg-white/90 p-5 shadow-[0_18px_60px_rgba(6,67,120,0.10)]">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="relative h-14 w-14 overflow-hidden rounded-2xl bg-[#e9f7ff]">
                <Image
                  src="/images/financ-logo.png"
                  alt="FinanC+"
                  fill
                  className="object-contain p-1"
                />
              </div>

              <div>
                <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#68b8df]">
                  Finanzas personales
                </p>

                <h1 className="mt-1 text-3xl font-black tracking-tight text-[#07559d] md:text-4xl">
                  FinanC+
                </h1>

                <p className="mt-1 text-sm font-semibold text-[#55708e]">
                  {cargando
                    ? "Cargando..."
                    : estadoOnline}
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-[#d7e9f5] bg-[#f7fbff] px-5 py-3 text-right">
              <p className="font-black text-[#07559d]">
                {fechaBonita()}
              </p>
            </div>
          </div>
        </header>

        <nav className="sticky top-3 z-30 mb-5 flex gap-2 rounded-[24px] border border-[#d6ebf7] bg-white/90 p-2 shadow-[0_14px_45px_rgba(6,67,120,0.08)]">
          <Nav
            activo={vista === "inicio"}
            onClick={() => setVista("inicio")}
          >
            Inicio
          </Nav>

          <Nav
            activo={vista === "resumen"}
            onClick={() => setVista("resumen")}
          >
            Resumen
          </Nav>

          <div className="relative flex-1">
            <button
              onClick={() => setMenu(!menu)}
              className="w-full rounded-2xl px-4 py-3 font-black text-[#5a7190]"
            >
              Más
            </button>

            {menu && (
              <div className="absolute right-0 top-14 w-56 rounded-3xl border border-[#d6ebf7] bg-white p-2 shadow-xl">
                <Drop
                  onClick={() => {
                    setVista("movimientos");
                    setMenu(false);
                  }}
                >
                  Movimientos
                </Drop>

                <Drop
                  onClick={() => {
                    setVista("plan");
                    setMenu(false);
                  }}
                >
                  Presupuesto
                </Drop>

                <Drop
                  onClick={() => {
                    setVista("config");
                    setMenu(false);
                  }}
                >
                  Configuración
                </Drop>
              </div>
            )}
          </div>
        </nav>

        <section className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          <Panel>
            <h2 className="text-2xl font-black">
              Carga rápida
            </h2>

            <p className="mb-5 mt-1 text-sm text-[#55708e]">
              Diseñado para cargar desde el celular en segundos.
            </p>

            <form
              onSubmit={guardar}
              className="space-y-5"
            >
              <Field label="Fecha">
                <input
                  className="input"
                  type="date"
                  value={form.fecha}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      fecha: e.target.value,
                    })
                  }
                />
              </Field>

              <Field label="Tipo">
                <div className="grid grid-cols-2 gap-2">
                  <Option
                    active={form.tipo === "gasto"}
                    onClick={() =>
                      setForm({
                        ...form,
                        tipo: "gasto",
                        categoria:
                          categoriasGasto[0],
                      })
                    }
                  >
                    Gasto
                  </Option>

                  <Option
                    active={
                      form.tipo === "ingreso"
                    }
                    onClick={() =>
                      setForm({
                        ...form,
                        tipo: "ingreso",
                        categoria:
                          categoriasIngreso[0],
                      })
                    }
                  >
                    Ingreso
                  </Option>
                </div>
              </Field>

              <Field
                label={
                  form.tipo === "gasto"
                    ? "Categoría de gasto"
                    : "Categoría de ingreso"
                }
              >
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {categoriasActuales.map((c) => (
                    <Option
                      key={c}
                      active={
                        form.categoria === c
                      }
                      onClick={() =>
                        setForm({
                          ...form,
                          categoria: c,
                        })
                      }
                    >
                      {c}
                    </Option>
                  ))}
                </div>
              </Field>

              <Field label="Monto">
                <input
                  className="input text-4xl font-black"
                  type="number"
                  step="0.01"
                  placeholder="0,00"
                  value={form.monto}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      monto: e.target.value,
                    })
                  }
                />
              </Field>

              <Field label="Detalle">
                <input
                  className="input"
                  placeholder="Ej: supermercado..."
                  value={form.detalle}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      detalle: e.target.value,
                    })
                  }
                />
              </Field>

              <button className="w-full rounded-2xl bg-gradient-to-r from-[#008bd2] to-[#075db5] py-4 font-black text-white">
                Guardar movimiento
              </button>
            </form>
          </Panel>

          <section className="space-y-4">
            <div className="rounded-[34px] bg-gradient-to-br from-[#075db5] via-[#0769bd] to-[#05356f] p-6 text-white">
              <p className="text-sm font-semibold text-white/70">
                Saldo total acumulado
              </p>

              <h2 className="mt-2 text-5xl font-black">
                {dinero(saldoActual)}
              </h2>

              <p className="mt-3 text-sm text-white/70">
                Plata real acumulada,
                incluyendo lo que sobró de
                meses anteriores.
              </p>
            </div>

            <div className="rounded-[34px] border border-[#d6ebf7] bg-white p-6">
              <p className="text-sm font-semibold text-[#55708e]">
                Disponible para hoy según
                presupuesto
              </p>

              <h2
                className={
                  disponibleHoy < 0
                    ? "mt-2 text-4xl font-black text-red-600"
                    : "mt-2 text-4xl font-black text-[#07559d]"
                }
              >
                {dinero(disponibleHoy)}
              </h2>

              <p className="mt-2 text-sm text-[#55708e]">
                Hoy podías gastar{" "}
                <b>
                  {dinero(permitidoHoy)}
                </b>{" "}
                · Gastaste hoy{" "}
                <b>{dinero(gastosHoy)}</b>.
              </p>

              <p className="mt-1 text-sm text-[#55708e]">
                Presupuesto:{" "}
                <b>
                  {dinero(presupuestoMes)}
                </b>{" "}
                · Gastado antes de hoy:{" "}
                <b>
                  {dinero(
                    gastosAntesDeHoy
                  )}
                </b>
              </p>

              <Progress
                value={
                  presupuestoMes
                    ? (gastosMes /
                        presupuestoMes) *
                      100
                    : 0
                }
              />
            </div>
          </section>
        </section>
      </div>

      <style jsx global>{`
        .input,
        .control {
          border: 1px solid #cfe6f4;
          border-radius: 18px;
          background: white;
          padding: 13px 15px;
          outline: none;
          color: #08244a;
        }

        .input {
          width: 100%;
        }
      `}</style>
    </main>
  );
}

function unicos(arr: string[]) {
  return Array.from(new Set(arr));
}

function sumar(data: Movimiento[], tipo: Tipo) {
  return data
    .filter((m) => m.tipo === tipo)
    .reduce((a, b) => a + b.monto, 0);
}

function calcularSaldoHasta(
  data: Movimiento[],
  fechaLimite: string
) {
  return data
    .filter((m) => m.fecha < fechaLimite)
    .reduce(
      (acc, m) =>
        acc +
        (m.tipo === "ingreso"
          ? m.monto
          : -m.monto),
      0
    );
}

function calcularDiasRestantesIncluyendoHoy(
  mes: string
) {
  const actual = hoyLocal().slice(0, 7);

  const [y, m] = mes
    .split("-")
    .map(Number);

  const ultimo = new Date(
    y,
    m,
    0
  ).getDate();

  if (mes < actual) return 0;
  if (mes > actual) return ultimo;

  const dia = Number(
    hoyLocal().slice(8, 10)
  );

  return Math.max(
    ultimo - dia + 1,
    1
  );
}

function resumenCategorias(
  data: Movimiento[]
) {
  const map: Record<string, number> =
    {};

  data
    .filter((m) => m.tipo === "gasto")
    .forEach((m) => {
      map[m.categoria] =
        (map[m.categoria] || 0) +
        m.monto;
    });

  return Object.entries(map).sort(
    (a, b) => b[1] - a[1]
  );
}

function resumenDias(data: Movimiento[]) {
  const map: Record<string, number> =
    {};

  data
    .filter((m) => m.tipo === "gasto")
    .forEach((m) => {
      map[m.fecha] =
        (map[m.fecha] || 0) +
        m.monto;
    });

  return Object.entries(map).sort(
    (a, b) => b[0].localeCompare(a[0])
  );
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
          ? "flex-1 rounded-2xl bg-gradient-to-r from-[#008bd2] to-[#075db5] px-4 py-3 font-black text-white"
          : "flex-1 rounded-2xl px-4 py-3 font-black text-[#5a7190]"
      }
    >
      {children}
    </button>
  );
}

function Drop({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full rounded-2xl px-4 py-3 text-left font-black text-[#08244a] hover:bg-[#f4fbff]"
    >
      {children}
    </button>
  );
}

function Panel({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[34px] border border-[#d6ebf7] bg-white p-5 shadow-[0_18px_60px_rgba(6,67,120,0.08)]">
      {children}
    </section>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="mb-2 text-sm font-black text-[#355577]">
        {label}
      </p>
      {children}
    </div>
  );
}

function Option({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? "rounded-2xl bg-gradient-to-r from-[#008bd2] to-[#075db5] px-4 py-3 font-black text-white"
          : "rounded-2xl border border-[#d6ebf7] bg-[#f7fbff] px-4 py-3 font-black text-[#08244a]"
      }
    >
      {children}
    </button>
  );
}

function Mini({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <div className="rounded-[26px] border border-[#d6ebf7] bg-white p-4">
      <p className="text-sm font-semibold text-[#55708e]">
        {title}
      </p>

      <p className="mt-1 text-xl font-black text-[#08244a]">
        {value}
      </p>
    </div>
  );
}

function Progress({
  value,
}: {
  value: number;
}) {
  const v = Math.min(
    Math.max(value, 0),
    100
  );

  return (
    <div className="mt-3 h-3 overflow-hidden rounded-full bg-[#dcecf6]">
      <div
        className={
          value > 100
            ? "h-full rounded-full bg-red-500"
            : "h-full rounded-full bg-gradient-to-r from-[#00aeea] to-[#075db5]"
        }
        style={{
          width: `${v}%`,
        }}
      />
    </div>
  );
}