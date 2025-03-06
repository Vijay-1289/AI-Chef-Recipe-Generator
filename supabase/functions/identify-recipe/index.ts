
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

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
    const formData = await req.formData();
    const imageFile = formData.get("image") as File;

    if (!imageFile) {
      return new Response(
        JSON.stringify({ error: "No image provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const buffer = await imageFile.arrayBuffer();
    const base64Image = btoa(String.fromCharCode(...new Uint8Array(buffer)));

    // In a real implementation, we would call an AI service like OpenAI or Google Vision API
    // For this demo, we'll enhance the mock implementation with more realistic data
    
    // Simulate AI processing time
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Generate more realistic dish recognition response
    const dishes = [
      { name: "Pasta Carbonara", confidence: 0.92, cuisine: "Italian" },
      { name: "Chocolate Lava Cake", confidence: 0.89, cuisine: "Dessert" },
      { name: "Chicken Tikka Masala", confidence: 0.87, cuisine: "Indian" },
      { name: "Beef Burger", confidence: 0.84, cuisine: "American" },
      { name: "Vegetable Stir Fry", confidence: 0.81, cuisine: "Asian" },
      { name: "Caesar Salad", confidence: 0.78, cuisine: "International" },
      { name: "Sushi Roll", confidence: 0.75, cuisine: "Japanese" },
      { name: "Mushroom Risotto", confidence: 0.72, cuisine: "Italian" }
    ];
    
    // Randomly select one dish as the primary detection
    const randomIndex = Math.floor(Math.random() * 3); // Higher probability for the first few dishes
    const primaryDish = dishes[randomIndex];
    
    // Select alternatives (different from the primary dish)
    const alternatives = dishes
      .filter((dish, index) => index !== randomIndex)
      .slice(0, 3)
      .map(dish => dish.name);

    return new Response(
      JSON.stringify({
        dishName: primaryDish.name,
        cuisine: primaryDish.cuisine,
        confidence: primaryDish.confidence,
        alternatives
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error processing image:", error);
    return new Response(
      JSON.stringify({ error: "Failed to process image" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
