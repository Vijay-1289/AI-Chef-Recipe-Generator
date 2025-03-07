import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const RECIPE_GENERATION_API_KEY = Deno.env.get('RECIPE_GENERATION_API_KEY');
const DATABASE_URL = Deno.env.get('SUPABASE_URL');
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

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
    
    // First, check if we have a matching recipe in our database
    if (DATABASE_URL && SERVICE_ROLE_KEY) {
      const supabase = createClient(DATABASE_URL, SERVICE_ROLE_KEY);
      
      // Query our food_dishes table for a matching recipe
      const { data: foodDishes, error: dbError } = await supabase
        .from('food_dishes')
        .select('*')
        .or(`name.ilike.%${dishName}%,keywords.cs.{${dishName.toLowerCase()}}`)
        .order('created_at', { ascending: false })
        .limit(1);
      
      if (!dbError && foodDishes && foodDishes.length > 0) {
        console.log(`Found matching dish in database: ${foodDishes[0].name}`);
        // Use the database dish information for more accurate recipe generation
      }
    }
    
    // Call the Spoonacular API with additional parameters for better results
    console.log("Using Spoonacular API key:", RECIPE_GENERATION_API_KEY?.substring(0, 5) + "...");

    let searchURL = `https://api.spoonacular.com/recipes/complexSearch?apiKey=${RECIPE_GENERATION_API_KEY}&query=${encodeURIComponent(dishName)}&instructionsRequired=true&fillIngredients=true&addRecipeInformation=true&number=5`;
    
    // Add cuisine if provided
    if (cuisine && cuisine !== "Any") {
      searchURL += `&cuisine=${encodeURIComponent(cuisine)}`;
    }
    
    // Add additional parameters for better results
    searchURL += "&sort=popularity&sortDirection=desc";
    
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
      
      // Try a broader search if specific search fails
      const generalSearchURL = `https://api.spoonacular.com/recipes/complexSearch?apiKey=${RECIPE_GENERATION_API_KEY}&query=food&instructionsRequired=true&fillIngredients=true&addRecipeInformation=true&number=3`;
      
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
        ? recipeData.summary.replace(/<[^>]*>/g, '').split('.').slice(0, 2).join('.') + '.' 
        : `A delicious ${dishName} recipe.`,
      cuisine: recipeData.cuisines && recipeData.cuisines.length > 0 
        ? recipeData.cuisines[0] 
        : (cuisine || "International"),
      difficulty: getDifficultyLevel(recipeData),
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
            tip: getStepTip(step.step)
          }))
        : generateDefaultSteps(dishName),
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
    
    // If API call fails, provide a high-quality fallback recipe
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

// Helper function to determine recipe difficulty
function getDifficultyLevel(recipe) {
  // If we have preparation minutes, use that as a factor
  if (recipe.preparationMinutes && recipe.preparationMinutes > 0) {
    if (recipe.preparationMinutes < 15) return "Easy";
    if (recipe.preparationMinutes < 30) return "Medium";
    return "Hard";
  }
  
  // If we have cooking minutes, use that as a factor
  if (recipe.cookingMinutes && recipe.cookingMinutes > 0) {
    if (recipe.cookingMinutes < 20) return "Easy";
    if (recipe.cookingMinutes < 45) return "Medium";
    return "Hard";
  }
  
  // If we have the number of ingredients, use that
  if (recipe.extendedIngredients) {
    if (recipe.extendedIngredients.length < 6) return "Easy";
    if (recipe.extendedIngredients.length < 10) return "Medium";
    return "Hard";
  }
  
  // Default to medium if we can't determine
  return "Medium";
}

// Helper function to generate cooking tips based on the step
function getStepTip(stepText) {
  if (!stepText) return undefined;
  
  // Only add tips to certain steps to avoid overwhelming the user
  if (Math.random() < 0.3) {
    if (stepText.includes("heat")) {
      return "Monitor the heat carefully to prevent burning.";
    } else if (stepText.includes("mix") || stepText.includes("stir")) {
      return "Use a gentle folding motion for more delicate ingredients.";
    } else if (stepText.includes("season")) {
      return "It's easier to add more seasoning later than to fix an over-seasoned dish.";
    } else if (stepText.includes("simmer") || stepText.includes("boil")) {
      return "Keep the lid on to maintain temperature and reduce cooking time.";
    } else if (stepText.includes("bake")) {
      return "Rotating the pan halfway through ensures even baking.";
    } else if (stepText.length > 100) {
      return "Take your time with this step for best results.";
    }
  }
  
  return undefined;
}

// Helper function to generate default cooking steps
function generateDefaultSteps(dishName) {
  return [
    { 
      instruction: `Prepare all ingredients for your ${dishName} according to the ingredients list.`,
      tip: "Organizing your ingredients before starting makes cooking much smoother."
    },
    { 
      instruction: "Combine the ingredients in the appropriate order as described below.",
      tip: "Read through all steps first to understand the cooking process."
    },
    { 
      instruction: "Cook according to the specified times and temperatures for optimal results.",
      tip: "Use a timer to avoid overcooking."
    },
    { 
      instruction: `Serve your ${dishName} hot and enjoy!`,
      tip: "Presentation matters - consider garnishing with fresh herbs for extra appeal."
    }
  ];
}

// Fallback function to generate a basic recipe when the API fails
async function generateFallbackRecipe(req) {
  try {
    const { dishName, cuisine } = await req.json();
    
    // Create a detailed fallback recipe based on the dish name
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
    } else if (dishName.toLowerCase().includes("cake") || dishName.toLowerCase().includes("chocolate")) {
      recipe = {
        name: "Decadent Chocolate Cake",
        description: "A rich, moist chocolate cake with a silky ganache frosting.",
        cuisine: "Dessert",
        difficulty: "Medium",
        cookingTime: 60,
        servings: 8,
        ingredients: [
          { name: "all-purpose flour", amount: "2 cups" },
          { name: "granulated sugar", amount: "2 cups" },
          { name: "unsweetened cocoa powder", amount: "3/4 cup" },
          { name: "baking powder", amount: "2 tsp" },
          { name: "baking soda", amount: "1 1/2 tsp" },
          { name: "salt", amount: "1 tsp" },
          { name: "eggs", amount: "2 large" },
          { name: "milk", amount: "1 cup" },
          { name: "vegetable oil", amount: "1/2 cup" },
          { name: "vanilla extract", amount: "2 tsp" },
          { name: "boiling water", amount: "1 cup" },
          { name: "heavy cream", amount: "1 cup", notes: "For ganache" },
          { name: "semi-sweet chocolate chips", amount: "1 1/2 cups", notes: "For ganache" }
        ],
        steps: [
          { 
            instruction: "Preheat oven to 350°F (175°C). Grease and flour two 9-inch round cake pans." 
          },
          { 
            instruction: "In a large bowl, whisk together flour, sugar, cocoa powder, baking powder, baking soda, and salt." 
          },
          { 
            instruction: "Add eggs, milk, oil, and vanilla to the dry ingredients and mix with an electric mixer on medium speed for about 2 minutes.",
            tip: "The batter will be quite thick at this stage."
          },
          { 
            instruction: "Stir in boiling water. The batter will become thin, which is normal." 
          },
          { 
            instruction: "Pour batter evenly into the prepared pans and bake for 30-35 minutes, or until a toothpick inserted in the center comes out clean." 
          },
          { 
            instruction: "Allow cakes to cool in the pans for 10 minutes, then remove from pans and cool completely on wire racks." 
          },
          { 
            instruction: "For the ganache, heat heavy cream until it just begins to simmer (don't let it boil). Pour over chocolate chips in a bowl and let sit for 5 minutes, then stir until smooth." 
          },
          { 
            instruction: "Once the cakes are completely cool, spread ganache over one layer, stack the second layer on top, and cover the entire cake with the remaining ganache." 
          }
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
