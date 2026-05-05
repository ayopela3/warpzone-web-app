export function onRequest(context: any) {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  }

  if (context.request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders })
  }

  context.data.corsHeaders = corsHeaders
  return context.next()
}
