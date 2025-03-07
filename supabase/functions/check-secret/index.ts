
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { secretName } = await req.json();
    
    if (!secretName) {
      return new Response(
        JSON.stringify({ error: "No secret name provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if the environment variable exists
    const secretValue = Deno.env.get(secretName);
    const exists = !!secretValue;
    
    // Don't return the actual value, just whether it exists
    return new Response(
      JSON.stringify({
        exists,
        message: exists ? `${secretName} is configured` : `${secretName} is not configured`
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error checking secret:", error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        exists: false
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
