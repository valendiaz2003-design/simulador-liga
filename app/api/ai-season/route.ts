import { NextResponse } from "next/server";

function extractText(data: any) {
  if (typeof data?.output_text === "string") return data.output_text;

  const pieces: string[] = [];

  for (const item of data?.output ?? []) {
    for (const content of item?.content ?? []) {
      if (typeof content?.text === "string") pieces.push(content.text);
    }
  }

  return pieces.join("\n").trim();
}

function safeJson(text: string) {
  const match = text.match(/\{[\s\S]*\}/);

  const cleaned = (match ? match[0] : text)
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();

  return JSON.parse(cleaned);
}

async function askOpenAI(prompt: string, maxOutputTokens = 1100) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey || apiKey.includes("tu_api_key")) {
    return null;
  }

  const model = process.env.OPENAI_MODEL || "gpt-4.1-mini";

  const res = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      input: prompt,
      temperature: 0.9,
      max_output_tokens: maxOutputTokens,
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

    const summary = body.summary;
    const facts = body.facts;
    const historyContext = body.historyContext ?? [];

    const prompt = `
Sos redactor de un diario deportivo argentino ficticio dentro de un simulador de fútbol.

Tono:
- argentino
- realista
- futbolero
- picante
- divertido
- estilo Olé/TyC

NO uses frases genéricas.

NO inventes jugadores.

Usá:
- historia del save
- campeones anteriores
- descensos
- promociones
- narrativa

Datos:
${JSON.stringify({ summary, facts, historyContext }, null, 2)}

Respondé SOLO JSON:

{
  "headline": "",
  "mainArticle": "",
  "cupArticle": "",
  "bArticle": "",
  "relegationArticle": "",
  "promotionArticle": "",
  "editorial": "",
  "shortNews": ["", "", ""]
}
`;

    const text = await askOpenAI(prompt, 1400);

    if (!text) {
      return NextResponse.json({
        headline: `${summary.champion.team} tocó la gloria`,
        mainArticle: `${summary.champion.team} salió campeón.`,
        cupArticle: `La Copa Argentina quedó para ${summary.cupChampion}.`,
        bArticle: `${summary.b?.[0]?.team} dominó la Primera B.`,
        relegationArticle: `La pelea abajo fue feroz.`,
        promotionArticle: `La promoción fue dramática.`,
        editorial: `Otra temporada cargada de emociones.`,
        shortNews: [
          "El campeón festeja.",
          "La tabla arde.",
          "La próxima temporada promete."
        ]
      });
    }

    return NextResponse.json(safeJson(text));
  } catch (error) {
    return NextResponse.json(
      { error: "No se pudo generar diario IA" },
      { status: 500 }
    );
  }
}