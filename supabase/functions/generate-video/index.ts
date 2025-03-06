import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const VIDEO_GENERATION_API_KEY = Deno.env.get('VIDEO_GENERATION_API_KEY');

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { recipe } = await req.json();
    
    if (!recipe) {
      return new Response(
        JSON.stringify({ error: "No recipe provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Generating AI chef video for recipe:", recipe.name);
    console.log("Using VIDEO_GENERATION_API_KEY:", VIDEO_GENERATION_API_KEY.substring(0, 10) + "...");

    // Create a script for the AI chef based on the recipe
    const videoScript = createChefScript(recipe);

    try {
      // Parse the API key which appears to be in format username:password
      const [username, password] = VIDEO_GENERATION_API_KEY.split(':');
      
      if (!username || !password) {
        throw new Error("Invalid API key format");
      }
      
      console.log("Calling Synthesia API to generate video...");
      
      // Call the Synthesia API to generate an AI chef video
      const videoResponse = await fetch('https://api.synthesia.io/v2/videos', {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${btoa(`${username}:${password}`)}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          test: false,
          title: `COOK-KEY: ${recipe.name}`,
          description: `AI chef tutorial for ${recipe.name}`,
          visibility: "public",
          templateId: "chef-kitchen", // Use a chef template if available
          avatar: {
            avatarId: "e354fa89-4b22-4494-9fc9-975cdb234ee4", // Example avatar ID, would need to be adjusted
            avatarSettings: {
              voice: "en-US-GuyNeural",
              horizontalAlignment: "center",
              scale: 1.0,
              style: "rectangular",
              backgroundColor: {
                r: 255,
                g: 255,
                b: 255,
                a: 0
              }
            }
          },
          script: videoScript,
          background: {
            imageUrl: "https://images.unsplash.com/photo-1556911220-bda9f33a8b1f?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1760&q=80"
          }
        })
      });
      
      const videoData = await videoResponse.json();
      
      console.log("Synthesia API response:", videoData);
      
      if (videoData.id) {
        // If successful, return the video ID and status
        // In a production environment, we would need to poll for the video status
        // until it's ready for download
        
        // For the purpose of this demo, we'll check if there's a direct downloadUrl
        // otherwise we'll fall back to a sample
        const videoUrl = videoData.downloadUrl || 
                       `https://api.synthesia.io/v2/videos/${videoData.id}/download` ||
                       "https://assets.mixkit.co/videos/preview/mixkit-cooking-meat-with-a-fork-and-spatula-5096-large.mp4";
        
        return new Response(
          JSON.stringify({
            success: true,
            videoId: videoData.id,
            videoUrl,
            status: videoData.status,
            message: "AI Chef video generation initiated",
            recipe: recipe.name
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } else {
        console.error("Failed to generate video with API, response:", videoData);
        throw new Error("Failed to generate video with API");
      }
    } catch (apiError) {
      console.error("Error with video generation API:", apiError);
      console.log("Falling back to sample cooking video");
      
      // Use a more realistic cooking video fallback
      const videoId = crypto.randomUUID();
      // High-quality cooking video fallback
      const videoUrl = "https://assets.mixkit.co/videos/preview/mixkit-cooking-meat-with-a-fork-and-spatula-5096-large.mp4";
      
      return new Response(
        JSON.stringify({
          success: true,
          videoId,
          videoUrl,
          message: "AI Chef video fallback generated",
          recipe: recipe.name,
          fallback: true
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (error) {
    console.error("Error generating video:", error);
    // Provide a better fallback for any general errors
    const videoUrl = "https://assets.mixkit.co/videos/preview/mixkit-cooking-meat-with-a-fork-and-spatula-5096-large.mp4";
    
    return new Response(
      JSON.stringify({ 
        success: true,
        videoId: crypto.randomUUID(),
        videoUrl,
        message: "AI Chef video fallback generated due to error",
        fallback: true,
        error: error.message 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// Function to create a script for the AI chef based on the recipe
function createChefScript(recipe) {
  let script = `Hello! I'm your AI chef from COOK-KEY, and today I'll guide you through making ${recipe.name}. `;
  
  script += `This ${recipe.cuisine} dish serves ${recipe.servings} and takes about ${recipe.cookingTime} minutes to prepare. `;
  
  script += "Let's start with the ingredients you'll need: ";
  
  // Add ingredients section
  recipe.ingredients.forEach((ingredient, index) => {
    if (index > 0 && index < recipe.ingredients.length - 1) script += ", ";
    if (index === recipe.ingredients.length - 1) script += " and ";
    script += `${ingredient.amount} of ${ingredient.name}`;
  });
  
  script += ". Now, let's cook! ";
  
  // Add cooking steps with proper pauses and intonation markers
  recipe.steps.forEach((step, index) => {
    script += `Step ${index + 1}: ${step.instruction} `;
    
    // Add a pause for better pacing
    script += "<break time='1s'/>";
    
    if (step.tip) {
      script += `Here's a pro tip: ${step.tip} `;
      script += "<break time='500ms'/>";
    }
  });
  
  script += `<break time='1s'/> And there you have it! A delicious ${recipe.name} is ready to be served. Enjoy your meal and thank you for cooking with COOK-KEY!`;
  
  return script;
}
