import { NextRequest, NextResponse } from "next/server";

function extractJSON(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {}
  const codeBlock = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlock) {
    try {
      return JSON.parse(codeBlock[1].trim());
    } catch {}
  }
  const arr = text.match(/\[[\s\S]*\]/);
  if (arr) {
    try {
      return JSON.parse(arr[0]);
    } catch {}
  }
  return null;
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const apiKey = process.env.GROK_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "GROK_API_KEY not configured. Add it to .env.local" },
      { status: 500 }
    );
  }

  try {
    if (body.action === "fetch_tweets") {
      const topic = body.topic || "trending";
      const prompt = `Return 8 of the most popular/trending tweets on X (Twitter) right now${
        topic !== "trending" ? ` about "${topic}"` : ""
      }. Return ONLY a valid JSON array with no markdown formatting. Each object must have exactly these fields: "name" (string, display name), "handle" (string, without @), "content" (string, full tweet text), "time" (string, relative like "2h" or "45m"), "likes" (number), "retweets" (number), "replies" (number), "views" (number), "verified" (boolean). Return ONLY the raw JSON array, nothing else.`;

      const res = await fetch("https://api.x.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "grok-3",
          messages: [
            {
              role: "system",
              content:
                "You are a data API. Return only valid JSON arrays. Never use markdown. Never include explanatory text. Only output raw JSON.",
            },
            { role: "user", content: prompt },
          ],
          temperature: 0.7,
        }),
      });

      if (!res.ok) {
        return NextResponse.json(
          { error: `Grok API error: ${res.status}` },
          { status: res.status }
        );
      }

      const data = await res.json();
      const text = data.choices?.[0]?.message?.content || "";
      const tweets = extractJSON(text);

      if (Array.isArray(tweets) && tweets.length > 0) {
        return NextResponse.json({
          tweets: tweets.map((t: Record<string, unknown>, i: number) => ({
            ...t,
            id: String(i + 1),
          })),
        });
      }

      return NextResponse.json(
        { error: "Could not parse tweet data from Grok" },
        { status: 500 }
      );
    }

    // Chat mode
    const res = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "grok-3",
        messages: [
          {
            role: "system",
            content:
              "You are Grok, made by xAI. You have access to real-time X data. Be concise, helpful, and slightly witty.",
          },
          ...body.messages,
        ],
      }),
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Grok API error: ${res.status}` },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json({
      content: data.choices[0].message.content,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to reach Grok API" },
      { status: 502 }
    );
  }
}
