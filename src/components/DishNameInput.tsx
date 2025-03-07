
import React, { useState } from "react";
import { ChefHat, CookingPot, UtensilsCrossed, Coffee, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface DishNameInputProps {
  onDishNameSubmit: (dishName: string) => void;
  isProcessing: boolean;
}

const DishNameInput: React.FC<DishNameInputProps> = ({ onDishNameSubmit, isProcessing }) => {
  const [dishName, setDishName] = useState("");
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (dishName.trim()) {
      onDishNameSubmit(dishName.trim());
    } else {
      toast.error("Please enter a dish name");
    }
  };

  const popularDishes = [
    "Chocolate Cake", 
    "Beef Stroganoff", 
    "Pasta Carbonara", 
    "Chicken Tikka Masala", 
    "Vegetable Stir Fry",
    "Sushi Rolls",
    "Paella",
    "Tiramisu"
  ];

  const handleQuickSelect = (dish: string) => {
    setDishName(dish);
    onDishNameSubmit(dish);
  };

  return (
    <div 
      className={`w-full max-w-2xl mx-auto transition-all duration-300 ease-in-out ${isProcessing ? 'opacity-50 pointer-events-none' : ''}`}
    >
      <div 
        className="flex flex-col items-center justify-center p-10 border-2 border-dashed rounded-xl
          border-border hover:border-primary/70 hover:bg-secondary/30 transition-all duration-300
          bg-gradient-to-br from-background to-secondary/20"
      >
        <div className="flex flex-col items-center gap-6 text-center">
          <div className="relative">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center animate-pulse">
              <ChefHat className="w-10 h-10 text-primary" />
            </div>
            <div className="absolute -top-3 -right-3 w-10 h-10 rounded-full bg-secondary flex items-center justify-center animate-bounce">
              <UtensilsCrossed className="w-5 h-5 text-primary/80" />
            </div>
            <div className="absolute -bottom-2 -left-3 w-8 h-8 rounded-full bg-secondary flex items-center justify-center animate-pulse">
              <Coffee className="w-4 h-4 text-primary/80" />
            </div>
          </div>
          
          <div className="space-y-2">
            <h3 className="text-2xl font-serif font-semibold tracking-tight">
              What would you like to cook today?
            </h3>
            <p className="text-muted-foreground max-w-md">
              Enter any dish name, and our AI chef will create a perfect recipe and cooking tutorial for you!
            </p>
          </div>
          
          <form onSubmit={handleSubmit} className="w-full max-w-md space-y-4">
            <Input
              value={dishName}
              onChange={(e) => setDishName(e.target.value)}
              placeholder="Enter dish name (e.g., Spaghetti Carbonara)"
              className="w-full text-center h-12 text-lg"
              autoFocus
            />
            <Button 
              type="submit" 
              className="w-full relative overflow-hidden group bg-primary/90 hover:bg-primary"
              size="lg"
              disabled={isProcessing || !dishName.trim()}
            >
              <span className="relative z-10 flex items-center gap-2">
                <ChefHat className="w-5 h-5" />
                Create Recipe & Video
              </span>
              <span className="absolute inset-0 bg-primary/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></span>
            </Button>
          </form>
          
          <div className="space-y-3 w-full max-w-md">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Sparkles className="w-4 h-4" />
              <span>Popular dishes:</span>
            </div>
            <div className="flex flex-wrap gap-2 justify-center">
              {popularDishes.map((dish) => (
                <button
                  key={dish}
                  onClick={() => handleQuickSelect(dish)}
                  className="px-3 py-1 bg-secondary/80 hover:bg-primary/10 rounded-full text-sm transition-colors"
                  disabled={isProcessing}
                >
                  {dish}
                </button>
              ))}
            </div>
          </div>
          
          {isProcessing && (
            <div className="flex items-center gap-2 mt-2 text-primary/80 animate-pulse">
              <CookingPot className="w-4 h-4 animate-spin" />
              Creating your delicious recipe...
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DishNameInput;
