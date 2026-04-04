const { FunctionsHttpError } = require('@supabase/supabase-js');

async function test() {
  const response = new Response("", { status: 500, statusText: "Internal Server Error" });
  let errorBody = await response.text();
  let error;
  try {
    const parsed = JSON.parse(errorBody);
    error = parsed.error || parsed.message || parsed;
  } catch {
    error = errorBody;
  }
  const httpError = new FunctionsHttpError(error || 'Edge Function returned a non-2xx status code');
  console.log("Error message:", httpError.message);
}

test();
