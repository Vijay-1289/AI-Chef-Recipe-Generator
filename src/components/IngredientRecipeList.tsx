
import React from "react";
import { Recipe } from "@/types/recipe";
import { Clock, Users, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface IngredientRecipeListProps {
  recipes: Recipe[];
  onSelectRecipe: (recipe: Recipe) => void;
  isLoading: boolean;
}

const IngredientRecipeList: React.FC<IngredientRecipeListProps> = ({ 
  recipes, 
  onSelectRecipe,
  isLoading
}) => {
  if (isLoading) {
    return (
      <div className="w-full max-w-4xl mx-auto py-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="border rounded-xl p-5 space-y-4 animate-pulse">
              <div className="h-48 bg-secondary rounded-lg"></div>
              <div className="h-6 bg-secondary rounded w-3/4"></div>
              <div className="h-4 bg-secondary rounded w-1/2"></div>
              <div className="flex justify-between">
                <div className="h-4 bg-secondary rounded w-1/4"></div>
                <div className="h-4 bg-secondary rounded w-1/4"></div>
              </div>
              <div className="h-10 bg-secondary rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (recipes.length === 0) {
    return (
      <div className="w-full max-w-2xl mx-auto py-8 text-center">
        <h3 className="text-xl font-medium">No recipes found</h3>
        <p className="text-muted-foreground mt-2">
          Try with different ingredients or fewer restrictions
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto py-8">
      <h2 className="text-2xl font-serif font-semibold mb-6">Recipes Found</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {recipes.map((recipe, index) => (
          <div key={index} className="border rounded-xl overflow-hidden bg-card hover:shadow-md transition-shadow">
            <div className="h-48 overflow-hidden">
              {recipe.imageUrl ? (
                <img 
                  src={recipe.imageUrl} 
                  alt={recipe.name} 
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-secondary flex items-center justify-center text-muted-foreground">
                  No image available
                </div>
              )}
            </div>
            <div className="p-5 space-y-4">
              <h3 className="font-serif font-semibold text-lg line-clamp-2">{recipe.name}</h3>
              <p className="text-muted-foreground text-sm line-clamp-2">{recipe.description}</p>
              
              <div className="flex justify-between text-sm">
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  <span>{recipe.cookingTime} min</span>
                </div>
                <div className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  <span>{recipe.servings} servings</span>
                </div>
              </div>
              
              <Button 
                onClick={() => onSelectRecipe(recipe)} 
                className="w-full gap-2"
              >
                View Recipe
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default IngredientRecipeList;
