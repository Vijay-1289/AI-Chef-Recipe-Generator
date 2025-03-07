
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, X, Search, CookingPot, Carrot, Apple } from "lucide-react";
import { toast } from "sonner";

interface IngredientSearchProps {
  onSearch: (ingredients: string[]) => void;
  isSearching: boolean;
}

const IngredientSearch: React.FC<IngredientSearchProps> = ({ onSearch, isSearching }) => {
  const [ingredients, setIngredients] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState("");

  const handleAddIngredient = () => {
    if (!inputValue.trim()) return;
    
    // Check if ingredient already exists
    if (ingredients.includes(inputValue.trim().toLowerCase())) {
      toast.error("Ingredient already added");
      return;
    }
    
    setIngredients([...ingredients, inputValue.trim().toLowerCase()]);
    setInputValue("");
  };

  const handleRemoveIngredient = (index: number) => {
    setIngredients(ingredients.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddIngredient();
    }
  };

  const handleSearch = () => {
    if (ingredients.length === 0) {
      toast.error("Please add at least one ingredient");
      return;
    }
    
    onSearch(ingredients);
  };

  // Predefined common ingredients for quick selection
  const commonIngredients = [
    "chicken", "beef", "pork", "rice", "pasta", "potatoes", "tomatoes", "onions", "garlic", "eggs"
  ];

  const handleQuickAdd = (ingredient: string) => {
    if (ingredients.includes(ingredient)) {
      toast.error("Ingredient already added");
      return;
    }
    setIngredients([...ingredients, ingredient]);
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-6 border rounded-xl bg-gradient-to-br from-background to-secondary/20 space-y-6">
      <div className="space-y-2">
        <h3 className="text-2xl font-serif font-semibold tracking-tight flex items-center gap-2">
          <CookingPot className="h-6 w-6 text-primary" />
          Find Recipes By Ingredients
        </h3>
        <p className="text-muted-foreground">
          Add ingredients you have on hand and we'll suggest recipes you can make
        </p>
      </div>
      
      <div className="flex gap-2">
        <Input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Enter an ingredient"
          className="flex-1"
        />
        <Button onClick={handleAddIngredient} size="icon" variant="outline">
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      
      {/* Quick add common ingredients */}
      <div className="flex flex-wrap gap-2">
        {commonIngredients.slice(0, 7).map((ingredient) => (
          <button
            key={ingredient}
            onClick={() => handleQuickAdd(ingredient)}
            className={`px-2 py-1 text-xs rounded-full border transition-colors 
              ${ingredients.includes(ingredient) 
                ? 'bg-primary/10 border-primary/30 text-primary/70 cursor-not-allowed' 
                : 'bg-secondary hover:bg-primary/10 hover:border-primary/30 hover:text-primary'}`}
            disabled={ingredients.includes(ingredient)}
          >
            + {ingredient}
          </button>
        ))}
      </div>
      
      {ingredients.length > 0 && (
        <div className="p-3 bg-background rounded-lg border">
          <div className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-1">
            <Carrot className="h-4 w-4" />
            Your ingredients:
          </div>
          <div className="flex flex-wrap gap-2">
            {ingredients.map((ingredient, index) => (
              <div
                key={index}
                className="flex items-center gap-1 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm"
              >
                <span>{ingredient}</span>
                <button
                  onClick={() => handleRemoveIngredient(index)}
                  className="text-primary/70 hover:text-primary transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
      
      <Button 
        onClick={handleSearch}
        className="w-full gap-2 bg-primary/90 hover:bg-primary"
        size="lg"
        disabled={ingredients.length === 0 || isSearching}
      >
        {isSearching ? (
          <>
            <Search className="h-4 w-4 animate-pulse" />
            Searching...
          </>
        ) : (
          <>
            <Search className="h-4 w-4" />
            Find Recipes
          </>
        )}
      </Button>
    </div>
  );
};

export default IngredientSearch;
