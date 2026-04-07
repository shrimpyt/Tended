import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ── OpenFoodFacts barcode lookup ───────────────────────────────────────────

interface OFFProduct {
  product_name_en?: string;
  product_name?: string;
  abbreviated_product_name?: string;
  categories?: string;
}

function mapOFFCategory(categoriesStr: string | undefined): string {
  if (!categoriesStr) return 'Pantry';
  const cats = categoriesStr.toLowerCase();

  if (
    cats.includes('cleaning') ||
    cats.includes('household') ||
    cats.includes('detergent') ||
    cats.includes('dishwash') ||
    cats.includes('laundry') ||
    cats.includes('trash') ||
    cats.includes('paper towel') ||
    cats.includes('toilet paper')
  ) return 'Cleaning';

  if (
    cats.includes('cosmetics') ||
    cats.includes('bathroom') ||
    cats.includes('toilet') ||
    cats.includes('soap') ||
    cats.includes('shampoo') ||
    cats.includes('hygiene') ||
    cats.includes('dental') ||
    cats.includes('toothpaste')
  ) return 'Bathroom';

  if (
    cats.includes('beverages') ||
    cats.includes('drinks') ||
    cats.includes('dairy') ||
    cats.includes('milk') ||
    cats.includes('cheese') ||
    cats.includes('yogurt') ||
    cats.includes('juice') ||
    cats.includes('refrigerated')
  ) return 'Fridge';

  return 'Pantry'; // default
}

async function lookupBarcode(barcode: string): Promise<{ name: string; category: string } | null> {
  try {
    const url = `https://world.openfoodfacts.org/api/v0/product/${encodeURIComponent(barcode)}.json`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'TendedWebApp/1.0 (contact@tended.app)' },
    });

    if (!res.ok) {
      console.warn(`[analyze-image] OpenFoodFacts returned HTTP ${res.status} for barcode ${barcode}`);
      return null;
    }

    const json = await res.json();

    // OFF returns status=1 when found
    if (json.status !== 1 || !json.product) {
      console.log(`[analyze-image] OpenFoodFacts: No match for barcode ${barcode}`);
      return null;
    }

    const p: OFFProduct = json.product;
    const name =
      p.product_name_en?.trim() ||
      p.product_name?.trim() ||
      p.abbreviated_product_name?.trim() ||
      '';

    if (!name) {
      console.log(`[analyze-image] OpenFoodFacts: Product found but name is empty for ${barcode}`);
      return null;
    }

    const category = mapOFFCategory(p.categories);
    console.log(`[analyze-image] OpenFoodFacts match: "${name}" (${category})`);
    return { name, category };
  } catch (err) {
    console.error(`[analyze-image] OpenFoodFacts fetch failed:`, err);
    return null;
  }
}

// ── Main handler ───────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    let body;
    try {
      body = await req.json();
    } catch (parseError) {
      console.error("[analyze-image] Error parsing request JSON:", parseError);
      return new Response(
        JSON.stringify({ error: "Failed to parse request data. Image might be too large or malformed." }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const { action, image, barcode } = body;
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');

    console.log(`[analyze-image] Processing action: ${action}`);

    if (!openaiApiKey) {
      console.error("[analyze-image] Error: OPENAI_API_KEY is not set in environment variables.");
      return new Response(
        JSON.stringify({ error: "OpenAI API key missing on server. Please set it in Supabase secrets." }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // ── BARCODE ACTION: OpenFoodFacts first, GPT-4o fallback ──────────────
    if (action === 'barcode') {
      if (!barcode) {
        return new Response(
          JSON.stringify({ error: "No barcode provided." }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }

      // 1. Try OpenFoodFacts (deterministic, free, no AI tokens)
      const offResult = await lookupBarcode(barcode);
      if (offResult) {
        return new Response(
          JSON.stringify(offResult),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // 2. Fallback: Ask GPT-4o for a best guess based on common barcode formats
      console.log(`[analyze-image] OpenFoodFacts miss — falling back to GPT-4o for barcode ${barcode}`);
      const systemMessage = `You are a product database expert. A user scanned a barcode that was not found in OpenFoodFacts. Given the barcode number, provide your best guess at the product name and category based on any knowledge you have of product codes, UPC patterns, or common household goods. Respond ONLY in JSON strictly matching this schema: {"name": "Product Name", "category": "Pantry"}. Valid categories: Pantry, Cleaning, Fridge, Bathroom, Other. Barcode: ${barcode}`;

      const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${openaiApiKey}`
        },
        body: JSON.stringify({
          model: "gpt-4o",
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: systemMessage },
            { role: "user", content: `Identify this barcode: ${barcode}` }
          ],
          max_tokens: 200
        })
      });

      if (!openaiRes.ok) {
        const errText = await openaiRes.text();
        console.error("[analyze-image] GPT-4o fallback error:", errText);
        // Return a no-match signal to the client
        return new Response(
          JSON.stringify({ name: null, category: null, noMatch: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const openaiData = await openaiRes.json();
      let result = openaiData.choices?.[0]?.message?.content ?? '';
      result = result.trim().replace(/^```(json)?/, '').replace(/```$/, '').trim();

      console.log(`[analyze-image] GPT-4o barcode fallback result: ${result}`);
      return new Response(result, { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ── VISUAL ANALYSIS ACTIONS: receipt / inventory / room ───────────────
    let systemMessage = "";
    let userContent: any[] = [];

    const formattedImageUrl = image
      ? (image.startsWith('data:image/') ? image : `data:image/jpeg;base64,${image.replace(/[\n\r]/g, '')}`)
      : '';

    if (action === 'receipt') {
      systemMessage = `You are an expert receipt parser. Extract all purchased items. Respond ONLY in JSON strictly matching this schema: {"items": [{"item": "Milk", "amount": "4.99", "category": "Groceries"}]}. Valid categories: Groceries, Cleaning, Pantry, Personal care. Do NOT include currency symbols like $. The amount must be a string containing only numbers and a decimal.`;
      userContent = [
        { type: "text", text: "Please process this receipt image." },
        { type: "image_url", image_url: { url: formattedImageUrl, detail: "high" } }
      ];
    } else if (action === 'inventory' || action === 'room') {
      systemMessage = `You are an expert home inventory assistant. Identify clearly visible household items in this image. Respond ONLY in JSON strictly matching this schema: {"items": [{"name": "Dish Soap", "category": "Cleaning", "stock_level": 50}]}. Valid categories: Kitchen, Cleaning, Pantry, Bathroom. For stock_level, visually estimate how full the container/package is as an integer from 10 (nearly empty) to 100 (completely full). Use 50 if you cannot clearly tell.`;
      userContent = [
        { type: "text", text: "Please process this pantry/shelf image." },
        { type: "image_url", image_url: { url: formattedImageUrl, detail: "high" } }
      ];
    } else {
      throw new Error("Invalid action type");
    }

    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${openaiApiKey}`
      },
      body: JSON.stringify({
        model: "gpt-4o",
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
      console.error("[analyze-image] OpenAI error:", err);
      throw new Error(`OpenAI API request failed: ${err}`);
    }

    const openaiData = await openaiRes.json();
    let result = openaiData.choices?.[0]?.message?.content;

    if (!result) {
      console.error("[analyze-image] OpenAI returned unexpected format:", openaiData);
      throw new Error("OpenAI API returned an unexpected response format");
    }

    result = result.trim();
    if (result.startsWith('```')) {
      result = result.replace(/^```(json)?/, '').replace(/```$/, '').trim();
    }

    console.log(`[analyze-image] Success! Result: ${result}`);
    return new Response(result, { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error: any) {
    console.error("[analyze-image] Fatal Error:", error);
    return new Response(JSON.stringify({ error: error.message || "An unknown error occurred" }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
