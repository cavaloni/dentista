import { NextRequest, NextResponse } from "next/server";

type AIMapRequest = {
  headers: string[];
  sampleRows: string[][]; // First 2-3 rows of data
};

type AIMapResponse = {
  mappings: Record<string, "full_name" | "address" | "channel" | "priority" | "notes" | null>;
  reasoning: string;
};

export async function POST(request: NextRequest) {
  try {
    const { headers, sampleRows } = await request.json() as AIMapRequest;
    
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "OpenRouter API key not configured" },
        { status: 500 }
      );
    }
    
    // Build prompt for AI
    const prompt = `You are a CSV column mapping assistant. Given CSV headers and sample data, map each column to the correct field.

Available fields:
- full_name: Patient's full name
- address: Contact address (phone number, email, or WhatsApp number)
- channel: Communication channel (whatsapp, sms, or email)
- priority: Priority level (number, higher = more urgent)
- notes: Additional notes or comments

CSV Headers: ${headers.join(", ")}

Sample Data (first ${sampleRows.length} rows):
${sampleRows.map((row, i) => `Row ${i + 1}: ${row.join(" | ")}`).join("\n")}

Instructions:
1. Map each CSV header to ONE of the available fields, or null if it doesn't match any field
2. Be smart about variations (e.g., "Phone" → address, "Name" → full_name)
3. If a column contains phone numbers, map to "address"
4. If a column contains email addresses, map to "address"
5. Provide brief reasoning for your mappings

Respond in JSON format:
{
  "mappings": {
    "CSV_HEADER_1": "mapped_field_or_null",
    "CSV_HEADER_2": "mapped_field_or_null"
  },
  "reasoning": "Brief explanation of mapping decisions"
}`;

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
        "X-Title": "WhatsCal CSV Mapper",
      },
      body: JSON.stringify({
        model: "openai/gpt-4o-mini", // Fast and cheap model
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        response_format: { type: "json_object" },
        temperature: 0.1, // Low temperature for consistent results
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("OpenRouter API error:", error);
      return NextResponse.json(
        { error: "Failed to get AI mapping suggestions" },
        { status: response.status }
      );
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;
    
    if (!content) {
      return NextResponse.json(
        { error: "No response from AI" },
        { status: 500 }
      );
    }

    const aiResponse: AIMapResponse = JSON.parse(content);
    
    return NextResponse.json(aiResponse);
  } catch (error) {
    console.error("Error in AI column mapping:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
