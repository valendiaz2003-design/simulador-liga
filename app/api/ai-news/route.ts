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
      max_output_tokens: 300,
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
Generá 3 titulares cortos para un simulador de fútbol argentino.

Tono:
- argentino
- divertido
- picante
- estilo Olé

Datos:
${JSON.stringify(body, null, 2)}
`;

    const text = await askOpenAI(prompt);

    if (!text) {
      return NextResponse.json({
        news: [
          "La fecha dejó polémica.",
          "La tabla empieza a calentarse.",
          "Hay técnicos mirando de reojo."
        ]
      });
    }

    return NextResponse.json({
      news: text.split("\n").filter(Boolean).slice(0, 3)
    });
  } catch {
    return NextResponse.json(
      { error: "Error IA noticias" },
      { status: 500 }
    );
  }
}