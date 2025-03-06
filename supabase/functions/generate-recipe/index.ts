
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
    console.log("Using Spoonacular API key:", RECIPE_GENERATION_API_KEY.substring(0, 5) + "...");

    // Call the Spoonacular API to search for recipes
    const searchURL = `https://api.spoonacular.com/recipes/complexSearch?apiKey=${RECIPE_GENERATION_API_KEY}&query=${encodeURIComponent(dishName)}&cuisine=${encodeURIComponent(cuisine || '')}&instructionsRequired=true&fillIngredients=true&addRecipeInformation=true&number=3`;
    
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
    
    if (!searchData.results || searchData.results.length === 0) {
      console.log("No recipes found for this dish, trying a more general search");
      
      // Try a more general search if specific search fails
      const generalSearchURL = `https://api.spoonacular.com/recipes/complexSearch?apiKey=${RECIPE_GENERATION_API_KEY}&query=food&cuisine=${encodeURIComponent(cuisine || '')}&instructionsRequired=true&fillIngredients=true&addRecipeInformation=true&number=1`;
      
      const generalSearchResponse = await fetch(generalSearchURL, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      const generalSearchData = await generalSearchResponse.json();
      
      if (!generalSearchData.results || generalSearchData.results.length === 0) {
        throw new Error("No recipes found even with general search");
      }
      
      searchData.results = generalSearchData.results;
    }
    
    // Choose the most relevant recipe from results
    const recipeId = searchData.results[0].id;
    
    console.log(`Recipe found with ID: ${recipeId}. Getting details...`);
    
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
    
    console.log(`Recipe details retrieved successfully for: ${recipeData.title}`);
    
    // Format the recipe data to match our application's structure
    const formattedRecipe = {
      name: recipeData.title,
      description: recipeData.summary 
        ? recipeData.summary.replace(/<[^>]*>/g, '').split('.')[0] + '.' 
        : `A delicious ${dishName} recipe.`,
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
      steps: recipeData.analyzedInstructions.length > 0 && recipeData.analyzedInstructions[0].steps.length > 0
        ? recipeData.analyzedInstructions[0].steps.map(step => ({
            instruction: step.step,
            tip: step.step.length > 100 ? "Take your time with this step for best results." : undefined
          }))
        : [{ instruction: "Combine all ingredients according to your preference." },
           { instruction: "Cook until done to your liking." },
           { instruction: "Serve and enjoy your meal!" }],
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
        recipe: await fallbackRecipe,
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
    let recipe = {
      name: dishName || "Delicious Meal",
      description: `A delicious ${dishName} recipe prepared with fresh ingredients.`,
      cuisine: cuisine || "International",
      difficulty: "Medium",
      cookingTime: 30,
      servings: 4,
      ingredients: [],
      steps: []
    };
    
    // More detailed mock recipes for common dish types
    if (dishName.toLowerCase().includes("pasta") || dishName.toLowerCase().includes("spaghetti")) {
      recipe = {
        name: "Classic Pasta Dish",
        description: "A delicious pasta dish with rich sauce and savory flavors.",
        cuisine: "Italian",
        difficulty: "Easy",
        cookingTime: 25,
        servings: 4,
        ingredients: [
          { name: "pasta", amount: "400g", notes: "Any shape works well" },
          { name: "olive oil", amount: "3 tbsp" },
          { name: "garlic", amount: "3 cloves", notes: "Minced" },
          { name: "onion", amount: "1 medium", notes: "Diced" },
          { name: "tomatoes", amount: "400g", notes: "Canned, crushed" },
          { name: "basil", amount: "1 handful", notes: "Fresh, torn" },
          { name: "parmesan cheese", amount: "50g", notes: "Grated" },
          { name: "salt and pepper", amount: "to taste" }
        ],
        steps: [
          { instruction: "Bring a large pot of salted water to boil and cook pasta according to package directions." },
          { instruction: "While pasta cooks, heat olive oil in a pan over medium heat. Add onions and cook until translucent, about 5 minutes." },
          { instruction: "Add garlic and cook for another minute until fragrant." },
          { instruction: "Add crushed tomatoes, reduce heat to low, and simmer for 10 minutes.", tip: "For a smoother sauce, blend the tomatoes before adding." },
          { instruction: "Drain pasta, reserving 1/4 cup of pasta water." },
          { instruction: "Add pasta to the sauce along with a splash of pasta water. Toss to combine." },
          { instruction: "Remove from heat, add torn basil leaves and toss again." },
          { instruction: "Serve hot with grated parmesan on top." }
        ]
      };
    } else if (dishName.toLowerCase().includes("chicken")) {
      recipe = {
        name: "Savory Chicken Dish",
        description: "Tender chicken with delicious seasonings and sides.",
        cuisine: cuisine || "International",
        difficulty: "Medium",
        cookingTime: 35,
        servings: 4,
        ingredients: [
          { name: "chicken breasts", amount: "4", notes: "Boneless, skinless" },
          { name: "olive oil", amount: "2 tbsp" },
          { name: "garlic powder", amount: "1 tsp" },
          { name: "paprika", amount: "1 tsp" },
          { name: "salt", amount: "1 tsp" },
          { name: "black pepper", amount: "1/2 tsp" },
          { name: "lemon", amount: "1", notes: "Juiced" },
          { name: "fresh herbs", amount: "2 tbsp", notes: "Chopped (parsley, thyme, or rosemary)" }
        ],
        steps: [
          { instruction: "Preheat oven to 375°F (190°C)." },
          { instruction: "Mix garlic powder, paprika, salt, and pepper in a small bowl." },
          { instruction: "Brush chicken breasts with olive oil and season with the spice mixture on both sides." },
          { instruction: "Place chicken in a baking dish and drizzle with lemon juice.", tip: "For extra flavor, add lemon slices on top of the chicken." },
          { instruction: "Bake for 25-30 minutes, or until chicken reaches an internal temperature of 165°F (74°C)." },
          { instruction: "Let rest for 5 minutes before serving." },
          { instruction: "Sprinkle with fresh herbs and serve with your favorite sides." }
        ]
      };
    } else if (dishName.toLowerCase().includes("salad")) {
      recipe = {
        name: "Fresh Garden Salad",
        description: "A crisp, refreshing salad with vibrant vegetables and tangy dressing.",
        cuisine: "International",
        difficulty: "Easy",
        cookingTime: 15,
        servings: 4,
        ingredients: [
          { name: "mixed greens", amount: "8 cups" },
          { name: "cherry tomatoes", amount: "1 cup", notes: "Halved" },
          { name: "cucumber", amount: "1", notes: "Diced" },
          { name: "red onion", amount: "1/2", notes: "Thinly sliced" },
          { name: "bell pepper", amount: "1", notes: "Diced" },
          { name: "olive oil", amount: "3 tbsp" },
          { name: "vinegar", amount: "2 tbsp", notes: "Balsamic or red wine" },
          { name: "honey", amount: "1 tsp" },
          { name: "dijon mustard", amount: "1 tsp" },
          { name: "salt and pepper", amount: "to taste" }
        ],
        steps: [
          { instruction: "Wash and dry all vegetables thoroughly." },
          { instruction: "Combine mixed greens, cherry tomatoes, cucumber, red onion, and bell pepper in a large bowl." },
          { instruction: "In a small bowl, whisk together olive oil, vinegar, honey, and dijon mustard to make the dressing.", tip: "Add a minced garlic clove for extra flavor." },
          { instruction: "Season the dressing with salt and pepper to taste." },
          { instruction: "Drizzle the dressing over the salad just before serving and toss gently to combine." },
          { instruction: "Serve immediately for maximum freshness." }
        ]
      };
    } else {
      // Generic recipe with more detailed steps
      recipe.ingredients = [
        { name: "main ingredient", amount: "500g" },
        { name: "olive oil", amount: "2 tbsp" },
        { name: "garlic", amount: "2 cloves", notes: "Minced" },
        { name: "onion", amount: "1 medium", notes: "Diced" },
        { name: "seasoning", amount: "2 tsp", notes: "Your choice of herbs and spices" },
        { name: "salt and pepper", amount: "to taste" },
        { name: "liquid", amount: "1 cup", notes: "Stock, water, or wine" }
      ];
      
      recipe.steps = [
        { instruction: "Prepare all ingredients as specified in the ingredients list." },
        { instruction: "Heat olive oil in a pan over medium heat. Add onions and cook until translucent, about 5 minutes." },
        { instruction: "Add garlic and cook for another minute until fragrant." },
        { instruction: "Add the main ingredient and cook according to its type.", tip: "Cooking times vary: meat typically needs 7-10 minutes, vegetables 5-7 minutes." },
        { instruction: "Add seasoning and liquid. Bring to a simmer." },
        { instruction: "Reduce heat and cook until the main ingredient is tender and fully cooked." },
        { instruction: "Season with salt and pepper to taste." },
        { instruction: "Serve hot and enjoy your meal!" }
      ];
    }
    
    return recipe;
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
        { name: "ingredient 2", amount: "as needed" },
        { name: "salt and pepper", amount: "to taste" }
      ],
      steps: [
        { instruction: "Combine all ingredients in a bowl." },
        { instruction: "Cook according to your preference." },
        { instruction: "Serve and enjoy!" }
      ]
    };
  }
}
