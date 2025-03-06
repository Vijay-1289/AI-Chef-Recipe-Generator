
import { Recipe } from "@/types/recipe";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const analyzeImage = async (file: File): Promise<{ 
  dishName: string;
  cuisine: string;
  confidence: number;
  alternatives: string[];
}> => {
  try {
    const formData = new FormData();
    formData.append("image", file);

    // Call our Supabase Edge Function
    const { data, error } = await supabase.functions.invoke("identify-recipe", {
      body: formData,
    });

    if (error) {
      console.error("Error analyzing image:", error);
      throw new Error(error.message);
    }

    // If using the edge function is successful, return its response
    return {
      dishName: data.dishName,
      cuisine: data.cuisine || "International",
      confidence: data.confidence,
      alternatives: data.alternatives
    };
  } catch (error) {
    console.error("Error in analyzeImage:", error);
    
    // Fallback to mock data if the edge function fails
    const dishes = [
      "Chocolate Cake",
      "Pasta Carbonara",
      "Chicken Tikka Masala",
      "Vegetable Stir Fry",
      "Beef Burger",
      "Caesar Salad",
      "Mushroom Risotto",
      "Sushi Roll"
    ];
    
    const randomIndex = Math.floor(Math.random() * dishes.length);
    const dishName = dishes[randomIndex];
    
    // Generate some alternatives
    const alternatives = [];
    for (let i = 0; i < 3; i++) {
      let altIndex;
      do {
        altIndex = Math.floor(Math.random() * dishes.length);
      } while (altIndex === randomIndex || alternatives.includes(dishes[altIndex]));
      
      alternatives.push(dishes[altIndex]);
    }
    
    return {
      dishName,
      cuisine: "International",
      confidence: 0.7 + Math.random() * 0.25, // Random confidence between 70% and 95%
      alternatives
    };
  }
};

export const generateRecipe = async (dishName: string, cuisine?: string): Promise<Recipe> => {
  // This is a mock implementation - in a real app, you'd call an AI service or API
  return new Promise((resolve) => {
    // Simulate processing time
    setTimeout(() => {
      // Generate a mock recipe based on the dish name
      let recipe: Recipe;
      
      if (dishName.includes("Pasta") || dishName.includes("Carbonara")) {
        recipe = {
          name: "Creamy Pasta Carbonara",
          description: "A rich and creamy Italian pasta dish with pancetta, eggs, and Parmesan cheese.",
          cuisine: cuisine || "Italian",
          difficulty: "Medium",
          cookingTime: 25,
          servings: 4,
          ingredients: [
            { name: "spaghetti", amount: "400g" },
            { name: "pancetta or guanciale", amount: "150g", notes: "Diced into small cubes" },
            { name: "egg yolks", amount: "6" },
            { name: "Parmesan cheese", amount: "50g", notes: "Freshly grated, plus extra for serving" },
            { name: "black pepper", amount: "1 tsp", notes: "Freshly ground" },
            { name: "salt", amount: "to taste" },
            { name: "garlic", amount: "2 cloves", notes: "Minced (optional)" }
          ],
          steps: [
            { 
              instruction: "Bring a large pot of salted water to a boil and cook the spaghetti according to package instructions until al dente." 
            },
            { 
              instruction: "While the pasta is cooking, heat a large skillet over medium heat. Add the pancetta and cook until crispy, about 5-7 minutes.",
              tip: "The fat rendered from the pancetta will be used to coat the pasta, so don't drain it."
            },
            { 
              instruction: "If using garlic, add it to the pancetta and cook for about 30 seconds until fragrant. Remove from heat." 
            },
            { 
              instruction: "In a bowl, whisk together the egg yolks, grated Parmesan, and a generous amount of black pepper." 
            },
            { 
              instruction: "When the pasta is done, reserve about 1/2 cup of the pasta water, then drain the pasta." 
            },
            { 
              instruction: "Working quickly, add the hot pasta to the skillet with the pancetta. Toss to coat the pasta in the rendered fat.",
              tip: "The pasta needs to be hot to partially cook the egg mixture without scrambling it."
            },
            { 
              instruction: "Remove the skillet from the heat completely and pour in the egg and cheese mixture, tossing constantly to create a creamy sauce. Add a splash of the reserved pasta water if needed to loosen the sauce." 
            },
            { 
              instruction: "Serve immediately with extra grated Parmesan and freshly ground black pepper." 
            }
          ]
        };
      } else if (dishName.includes("Cake") || dishName.includes("Chocolate")) {
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
      } else if (dishName.includes("Chicken") || dishName.includes("Tikka")) {
        recipe = {
          name: "Authentic Chicken Tikka Masala",
          description: "Tender pieces of chicken in a rich, spiced tomato cream sauce.",
          cuisine: "Indian",
          difficulty: "Medium",
          cookingTime: 45,
          servings: 4,
          ingredients: [
            { name: "boneless chicken breasts", amount: "800g", notes: "Cut into bite-sized pieces" },
            { name: "plain yogurt", amount: "1 cup", notes: "For marinade" },
            { name: "lemon juice", amount: "2 tbsp", notes: "For marinade" },
            { name: "ginger", amount: "1 tbsp", notes: "Grated, for marinade" },
            { name: "garlic", amount: "3 cloves", notes: "Minced, for marinade" },
            { name: "garam masala", amount: "2 tsp", notes: "For marinade" },
            { name: "ground cumin", amount: "1 tsp", notes: "For marinade" },
            { name: "ground turmeric", amount: "1/2 tsp", notes: "For marinade" },
            { name: "vegetable oil", amount: "2 tbsp" },
            { name: "onion", amount: "1 large", notes: "Finely diced" },
            { name: "garlic", amount: "3 cloves", notes: "Minced, for sauce" },
            { name: "ginger", amount: "1 tbsp", notes: "Grated, for sauce" },
            { name: "ground coriander", amount: "1 tsp" },
            { name: "ground cumin", amount: "1 tsp" },
            { name: "paprika", amount: "1 tsp" },
            { name: "garam masala", amount: "1 tsp" },
            { name: "crushed tomatoes", amount: "400g can" },
            { name: "tomato paste", amount: "2 tbsp" },
            { name: "heavy cream", amount: "1 cup" },
            { name: "salt", amount: "to taste" },
            { name: "fresh cilantro", amount: "handful", notes: "Chopped, for garnish" }
          ],
          steps: [
            { 
              instruction: "In a bowl, mix yogurt, lemon juice, ginger, garlic, garam masala, cumin, and turmeric. Add chicken and marinate for at least 1 hour, preferably overnight in the refrigerator.",
              tip: "The longer you marinate, the more flavorful the chicken will be."
            },
            { 
              instruction: "Preheat oven to 450°F (230°C). Thread chicken onto skewers and place on a baking sheet. Bake for 15 minutes, or until the chicken is cooked through." 
            },
            { 
              instruction: "Meanwhile, heat oil in a large pan over medium heat. Add onion and cook until softened, about 5 minutes." 
            },
            { 
              instruction: "Add garlic and ginger to the pan and cook for 1 minute. Add ground coriander, cumin, paprika, and garam masala. Cook for another minute to toast the spices." 
            },
            { 
              instruction: "Add crushed tomatoes and tomato paste. Simmer for 15 minutes, stirring occasionally." 
            },
            { 
              instruction: "Stir in heavy cream and simmer until the sauce thickens, about 5 minutes." 
            },
            { 
              instruction: "Add the baked chicken pieces to the sauce and simmer for 5 more minutes.",
              tip: "If the sauce is too thick, add a little water or chicken stock to reach your desired consistency."
            },
            { 
              instruction: "Season with salt to taste. Garnish with fresh chopped cilantro and serve with naan bread or rice." 
            }
          ]
        };
      } else {
        // Default recipe for other dishes with enhanced customization based on cuisine
        recipe = {
          name: dishName,
          description: `A delicious ${dishName.toLowerCase()} prepared with fresh ingredients.`,
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
            { 
              instruction: "Prepare all ingredients as specified in the ingredients list." 
            },
            { 
              instruction: "Heat olive oil in a pan over medium heat. Add onions and cook until translucent." 
            },
            { 
              instruction: "Add garlic and cook for another minute until fragrant." 
            },
            { 
              instruction: "Add the main ingredient and cook according to its type.",
              tip: "Cooking times vary depending on the ingredient. Make sure it's cooked through properly."
            },
            { 
              instruction: "Season with salt and pepper to taste." 
            },
            { 
              instruction: "Serve hot and enjoy your meal!" 
            }
          ]
        };
      }
      
      resolve(recipe);
    }, 2000);
  });
};

export const generateVideo = async (recipe: Recipe): Promise<string> => {
  try {
    toast.info("AI Chef video generation started", {
      description: "Our virtual chef is preparing your video tutorial"
    });
    
    // Call our Supabase Edge Function for video generation
    const { data, error } = await supabase.functions.invoke("generate-video", {
      body: { recipe },
    });

    if (error) {
      console.error("Error generating video:", error);
      throw new Error(error.message);
    }

    // Return the video URL from the edge function
    return data.videoUrl;
  } catch (error) {
    console.error("Error in generateVideo:", error);
    toast.error("Video generation error", {
      description: "There was a problem creating your video. Please try again."
    });
    
    // Fallback to a sample video if the edge function fails
    return "https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";
  }
};
