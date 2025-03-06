
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const RECIPE_GENERATION_API_KEY = Deno.env.get('RECIPE_GENERATION_API_KEY');

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { ingredients } = await req.json();
    
    if (!ingredients || !Array.isArray(ingredients) || ingredients.length === 0) {
      return new Response(
        JSON.stringify({ error: "No ingredients provided or invalid format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Searching for recipes with ingredients: ${ingredients.join(', ')}`);
    
    // Call the Spoonacular API to search for recipes by ingredients
    const searchURL = `https://api.spoonacular.com/recipes/findByIngredients?apiKey=${RECIPE_GENERATION_API_KEY}&ingredients=${ingredients.join(',+')}&number=5&ranking=1`;
    
    console.log("Calling Spoonacular API:", searchURL);
    
    const searchResponse = await fetch(searchURL, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const searchData = await searchResponse.json();
    
    console.log("Spoonacular search response status:", searchResponse.status);
    
    if (searchResponse.status !== 200) {
      console.error("Spoonacular API error:", searchData);
      throw new Error(`Spoonacular API error: ${JSON.stringify(searchData)}`);
    }
    
    if (!searchData || searchData.length === 0) {
      console.log("No recipes found for these ingredients, using fallback");
      throw new Error("No recipes found for these ingredients");
    }
    
    // Fetch full recipe information for each recipe found
    const recipePromises = searchData.slice(0, 3).map(async (recipeInfo: any) => {
      const recipeId = recipeInfo.id;
      
      console.log(`Fetching details for recipe ID: ${recipeId}`);
      
      // Get detailed recipe information
      const recipeResponse = await fetch(
        `https://api.spoonacular.com/recipes/${recipeId}/information?apiKey=${RECIPE_GENERATION_API_KEY}&includeNutrition=false`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
      
      const recipeData = await recipeResponse.json();
      
      if (!recipeData) {
        console.error(`Failed to get recipe details for ID: ${recipeId}`);
        return null;
      }
      
      console.log(`Recipe details retrieved successfully for: ${recipeData.title}`);
      
      // Format the recipe data to match our application's structure
      return {
        name: recipeData.title,
        description: recipeData.summary 
          ? recipeData.summary.replace(/<[^>]*>/g, '').split('.')[0] + '.' 
          : `A delicious recipe using ${ingredients[0]}.`,
        cuisine: recipeData.cuisines && recipeData.cuisines.length > 0 
          ? recipeData.cuisines[0] 
          : "International",
        difficulty: recipeData.veryPopular ? "Easy" : (recipeData.veryHealthy ? "Medium" : "Hard"),
        cookingTime: recipeData.readyInMinutes || 30,
        servings: recipeData.servings || 4,
        ingredients: recipeData.extendedIngredients.map((ingredient: any) => ({
          name: ingredient.name,
          amount: `${ingredient.amount} ${ingredient.unit}`,
          notes: ingredient.original
        })),
        steps: recipeData.analyzedInstructions.length > 0 && recipeData.analyzedInstructions[0].steps.length > 0
          ? recipeData.analyzedInstructions[0].steps.map((step: any) => ({
              instruction: step.step,
              tip: step.step.length > 100 ? "Take your time with this step for best results." : undefined
            }))
          : [{ instruction: "Combine all ingredients according to your preference." },
             { instruction: "Cook until done to your liking." },
             { instruction: "Serve and enjoy your meal!" }],
        imageUrl: recipeData.image
      };
    });
    
    // Wait for all recipe details to be fetched
    const recipes = (await Promise.all(recipePromises)).filter(recipe => recipe !== null);
    
    if (recipes.length === 0) {
      throw new Error("Failed to retrieve recipe details");
    }

    return new Response(
      JSON.stringify({
        success: true,
        recipes: recipes
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error finding recipes by ingredients:", error);
    
    // Return empty array with error message
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message,
        recipes: []
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
