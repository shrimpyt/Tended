import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();
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

    let systemMessage = "";
    let userContent: any[] = [];

    if (action === 'receipt') {
      systemMessage = `You are an expert receipt parser. Extract all purchased items. Respond ONLY in JSON strictly matching this schema: {"items": [{"item": "Milk", "amount": "4.99", "category": "Groceries"}]}. Valid categories: Groceries, Cleaning, Pantry, Personal care. Do NOT include currency symbols like $. The amount must be a string containing only numbers and a decimal.`;
      userContent = [
        { type: "text", text: "Please process this receipt image." },
        { type: "image_url", image_url: { url: `data:image/jpeg;base64,${image}`, detail: "high" } }
      ];
    } else if (action === 'inventory' || action === 'room') {
      systemMessage = `You are an expert home inventory assistant. Identify clearly visible household items in this image. Respond ONLY in JSON strictly matching this schema: {"items": [{"name": "Dish Soap", "category": "Cleaning", "stock_level": 50}]}. Valid categories: Kitchen, Cleaning, Pantry, Bathroom. For stock_level, visually estimate how full the container/package is as an integer from 10 (nearly empty) to 100 (completely full). Use 50 if you cannot clearly tell.`;
      userContent = [
        { type: "text", text: "Please process this pantry/shelf image." },
        { type: "image_url", image_url: { url: `data:image/jpeg;base64,${image}`, detail: "high" } }
      ];
    } else if (action === 'barcode') {
      systemMessage = `You are a product database expert. Given a barcode number, identify the product name and its category. Respond ONLY in JSON strictly matching this schema: {"name": "Product Name", "category": "Pantry"}. Valid categories: Pantry, Cleaning, Fridge, Bathroom, Other. If you are unsure, provide a best guess based on common product codes. Barcode: ${barcode}`;
      userContent = [{ type: "text", text: `Identify this barcode: ${barcode}` }];
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
      console.error("[analyze-image] OpenAI error:", err);
      throw new Error(`OpenAI API request failed: ${err}`);
    }

    const openaiData = await openaiRes.json();
    const result = openaiData.choices[0].message.content;

    console.log(`[analyze-image] Success! Result: ${result}`);
    return new Response(result, { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error("[analyze-image] Fatal Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
