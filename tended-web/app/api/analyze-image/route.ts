import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    let body;
    try {
      body = await req.json();
    } catch (parseError) {
      console.error("[analyze-image-api] Error parsing request JSON:", parseError);
      return NextResponse.json(
        { error: "Failed to parse request data. Image might be too large or malformed." },
        { status: 400 }
      );
    }

    const { action, image, barcode } = body;
    const openaiApiKey = process.env.OPENAI_API_KEY;

    console.log(`[analyze-image-api] Processing action: ${action}`);

    if (!openaiApiKey) {
      console.error("[analyze-image-api] Error: OPENAI_API_KEY is not set in environment variables.");
      return NextResponse.json(
        { error: "OpenAI API key missing on server. Please set it in your environment variables (.env.local)." },
        { status: 500 }
      );
    }

    let systemMessage = "";
    let userContent: any[] = [];

    // Determine image format (ensure it includes data URI prefix for OpenAI)
    const formattedImageUrl = image ? (image.startsWith('data:image/') ? image : `data:image/jpeg;base64,${image.replace(/[\n\r]/g, '')}`) : '';

    if (action === 'receipt') {
      systemMessage = `You are an expert receipt parser. Extract all purchased items. Respond ONLY in JSON strictly matching this schema: {"items": [{"item": "Milk", "amount": "4.99", "category": "Groceries", "unit": "gal"}]}. Valid categories: Groceries, Cleaning, Pantry, Personal care. For "unit", guess the most accurate standard unit for the item (e.g., "oz", "fl oz", "gal", "lb", "g", "L", "pc", "box", "roll"). Do not default to "pc" unless it is genuinely a single discrete item like an apple or a sponge. Do NOT include currency symbols like $. The amount must be a string containing only numbers and a decimal.`;
      userContent = [
        { type: "text", text: "Please process this receipt image." },
        { type: "image_url", image_url: { url: formattedImageUrl, detail: "high" } }
      ];
    } else if (action === 'inventory' || action === 'room') {
      systemMessage = `You are an expert home inventory assistant. Identify clearly visible household items in this image. Respond ONLY in JSON strictly matching this schema: {"items": [{"name": "Dish Soap", "category": "Cleaning", "stock_level": 50, "unit": "fl oz"}]}. Valid categories: Kitchen, Cleaning, Pantry, Bathroom. For stock_level, visually estimate how full the container/package is as an integer from 10 (nearly empty) to 100 (completely full). Use 50 if you cannot clearly tell. For "unit", guess the most accurate standard unit for the item (e.g., "oz", "fl oz", "lb", "g", "L", "pc", "box", "roll"). Do not default to "pc" unless it is a single discrete item.`;
      userContent = [
        { type: "text", text: "Please process this pantry/shelf image." },
        { type: "image_url", image_url: { url: formattedImageUrl, detail: "high" } }
      ];
    } else if (action === 'barcode') {
      systemMessage = `You are a product database expert. Given a barcode number, identify the product name, its category, and its standard unit. Respond ONLY in JSON strictly matching this schema: {"name": "Product Name", "category": "Pantry", "unit": "oz"}. Valid categories: Pantry, Cleaning, Fridge, Bathroom, Other. For "unit", guess the most accurate standard unit (e.g., "oz", "fl oz", "lb", "g", "L", "pc", "box", "roll"). Barcode: ${barcode}`;
      userContent = [{ type: "text", text: `Identify this barcode: ${barcode}` }];
    } else {
      return NextResponse.json({ error: "Invalid action type" }, { status: 400 });
    }

    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${openaiApiKey}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemMessage },
          { role: "user", content: userContent }
        ],
        max_tokens: 1000
      })
    });

    if (!openaiRes.ok) {
      const err = await openaiRes.text();
      console.error("[analyze-image-api] OpenAI error:", err);
      return NextResponse.json({ error: `OpenAI API request failed: ${err}` }, { status: 502 });
    }

    const openaiData = await openaiRes.json();
    let result = openaiData.choices?.[0]?.message?.content;

    if (!result) {
      console.error("[analyze-image-api] OpenAI returned unexpected format:", openaiData);
      return NextResponse.json({ error: "OpenAI API returned an unexpected response format" }, { status: 502 });
    }

    // Clean up markdown blocks if the model wrapped the JSON
    result = result.trim();
    if (result.startsWith('```')) {
      result = result.replace(/^```(json)?/, '').replace(/```$/, '').trim();
    }

    console.log(`[analyze-image-api] Success! Result: ${result}`);

    // Attempt to parse the JSON before returning to ensure it's valid,
    // and to match the return signature expected by the client.
    try {
      const parsedResult = JSON.parse(result);
      return NextResponse.json(parsedResult);
    } catch (e) {
      return NextResponse.json({ error: "Failed to parse OpenAI response as JSON", raw: result }, { status: 500 });
    }

  } catch (error: any) {
    console.error("[analyze-image-api] Fatal Error:", error);
    return NextResponse.json(
      { error: error.message || "An unknown error occurred" },
      { status: 500 }
    );
  }
}
