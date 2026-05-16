import { NextResponse } from "next/server";

function extractText(data: any) {
  if (typeof data?.output_text === "string") return data.output_text;

  const pieces: string[] = [];

  for (const item of data?.output ?? []) {
    for (const content of item?.content ?? []) {
      if (typeof content?.text === "string") {
        pieces.push(content.text);
      }
    }
  }

  return pieces.join("\n").trim();
}

async function askOpenAI(prompt: string) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) return null;

  const res = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4.1-mini",
      input: prompt,
      temperature: 0.95,
      max_output_tokens: 700,
    }),
  });

  if (!res.ok) {
    throw new Error(await res.text());
  }

  return extractText(await res.json());
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const prompt = `
Sos periodista deportivo argentino.

Escribí un perfil futbolero de club para un simulador.

Tono:
- argentino
- realista
- picante
- divertido
- estilo periodístico

MÍNIMO:
- 3 renglones
- bastante personalidad

Usá:
- títulos
- campañas
- copas
- ascensos
- descensos
- historia

Datos:
${JSON.stringify(body, null, 2)}
`;

    const text = await askOpenAI(prompt);

    return NextResponse.json({
      title: body.club.team,
      description:
        text ??
        `${body.club.team} sigue construyendo su historia.`,
      shortTag: "Perfil IA"
    });
  } catch {
    return NextResponse.json(
      { error: "Error IA club" },
      { status: 500 }
    );
  }
}