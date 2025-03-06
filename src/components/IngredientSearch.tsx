
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, X, Search } from "lucide-react";
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

  return (
    <div className="w-full max-w-2xl mx-auto p-6 border rounded-xl bg-secondary/10 space-y-6">
      <div className="space-y-2">
        <h3 className="text-xl font-serif font-semibold tracking-tight">
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
      
      {ingredients.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {ingredients.map((ingredient, index) => (
            <div
              key={index}
              className="flex items-center gap-1 px-3 py-1 rounded-full bg-secondary text-sm"
            >
              <span>{ingredient}</span>
              <button
                onClick={() => handleRemoveIngredient(index)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
      
      <Button 
        onClick={handleSearch}
        className="w-full gap-2"
        disabled={ingredients.length === 0 || isSearching}
      >
        <Search className="h-4 w-4" />
        {isSearching ? "Searching..." : "Find Recipes"}
      </Button>
    </div>
  );
};

export default IngredientSearch;
