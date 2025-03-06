
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
    const { dishName, cuisine } = await req.json();
    
    if (!dishName) {
      return new Response(
        JSON.stringify({ error: "No dish name provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Generating recipe for ${dishName} (${cuisine || 'International'} cuisine)`);

    // Call the Recipe Generation API (Spoonacular API in this example)
    const searchResponse = await fetch(
      `https://api.spoonacular.com/recipes/complexSearch?apiKey=${RECIPE_GENERATION_API_KEY}&query=${encodeURIComponent(dishName)}&cuisine=${encodeURIComponent(cuisine || '')}&instructionsRequired=true&fillIngredients=true&addRecipeInformation=true&number=1`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    const searchData = await searchResponse.json();
    
    if (!searchData.results || searchData.results.length === 0) {
      throw new Error("No recipes found for this dish");
    }
    
    const recipeId = searchData.results[0].id;
    
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
      throw new Error("Failed to get recipe details");
    }
    
    // Format the recipe data to match our application's structure
    const formattedRecipe = {
      name: recipeData.title,
      description: recipeData.summary.replace(/<[^>]*>/g, '').split('.')[0] + '.',
      cuisine: recipeData.cuisines && recipeData.cuisines.length > 0 
        ? recipeData.cuisines[0] 
        : (cuisine || "International"),
      difficulty: recipeData.veryPopular ? "Easy" : (recipeData.veryHealthy ? "Medium" : "Hard"),
      cookingTime: recipeData.readyInMinutes || 30,
      servings: recipeData.servings || 4,
      ingredients: recipeData.extendedIngredients.map(ingredient => ({
        name: ingredient.name,
        amount: `${ingredient.amount} ${ingredient.unit}`,
        notes: ingredient.original
      })),
      steps: recipeData.analyzedInstructions.length > 0 
        ? recipeData.analyzedInstructions[0].steps.map(step => ({
            instruction: step.step,
            tip: step.length > 100 ? "Take your time with this step for best results." : undefined
          }))
        : [{ instruction: "No detailed steps available for this recipe." }],
      imageUrl: recipeData.image
    };

    return new Response(
      JSON.stringify({
        success: true,
        recipe: formattedRecipe
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error generating recipe:", error);
    
    // If API call fails, provide a basic fallback recipe
    const fallbackRecipe = generateFallbackRecipe(req);
    
    return new Response(
      JSON.stringify({ 
        success: true,
        recipe: fallbackRecipe,
        note: "Using fallback recipe due to API error"
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// Fallback function to generate a basic recipe when the API fails
async function generateFallbackRecipe(req) {
  try {
    const { dishName, cuisine } = await req.json();
    
    // Create a mock recipe based on the dish name
    return {
      name: dishName || "Delicious Meal",
      description: `A delicious ${dishName} recipe prepared with fresh ingredients.`,
      cuisine: cuisine || "International",
      difficulty: "Medium",
      cookingTime: 30,
      servings: 4,
      ingredients: [
        { name: "main ingredient", amount: "500g" },
        { name: "olive oil", amount: "2 tbsp" },
        { name: "garlic", amount: "2 cloves", notes: "Minced" },
        { name: "onion", amount: "1 medium", notes: "Diced" },
        { name: "salt and pepper", amount: "to taste" }
      ],
      steps: [
        { instruction: "Prepare all ingredients." },
        { instruction: "Heat olive oil in a pan over medium heat. Add onions and cook until translucent." },
        { instruction: "Add garlic and cook for another minute until fragrant." },
        { instruction: "Add the main ingredient and cook according to its type.", tip: "Cooking times vary depending on the ingredient." },
        { instruction: "Season with salt and pepper to taste." },
        { instruction: "Serve hot and enjoy your meal!" }
      ]
    };
  } catch (error) {
    console.error("Error generating fallback recipe:", error);
    
    // Absolute fallback if everything fails
    return {
      name: "Simple Dish",
      description: "A simple and delicious meal.",
      cuisine: "International",
      difficulty: "Easy",
      cookingTime: 20,
      servings: 2,
      ingredients: [
        { name: "ingredient 1", amount: "as needed" },
        { name: "ingredient 2", amount: "as needed" }
      ],
      steps: [
        { instruction: "Combine all ingredients and cook until done." }
      ]
    };
  }
}
