
import React, { useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Clock, Users, ChefHat, PlayCircle, Download, Share2 } from "lucide-react";
import { Recipe } from "@/types/recipe";

interface RecipeDisplayProps {
  recipe: Recipe;
  imageUrl: string;
  onGenerateVideo: () => void;
  videoUrl?: string;
}

const RecipeDisplay: React.FC<RecipeDisplayProps> = ({ 
  recipe, 
  imageUrl, 
  onGenerateVideo,
  videoUrl
}) => {
  const [activeTab, setActiveTab] = useState("ingredients");

  return (
    <div className="w-full max-w-5xl mx-auto py-8 animate-fade-in">
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* Image and Basic Info */}
        <div className="lg:col-span-2 space-y-6">
          <div className="relative rounded-xl overflow-hidden h-[280px] shadow-lg">
            <img 
              src={imageUrl} 
              alt={recipe.name} 
              className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
            <div className="absolute bottom-0 left-0 p-4 w-full">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 bg-white/90 rounded-full text-xs font-medium">
                  {recipe.cuisine}
                </span>
                <span className="px-3 py-1 bg-white/90 rounded-full text-xs font-medium">
                  {recipe.difficulty}
                </span>
              </div>
            </div>
          </div>

          <div>
            <h1 className="text-3xl font-serif font-semibold tracking-tight">
              {recipe.name}
            </h1>
            <p className="mt-2 text-muted-foreground">
              {recipe.description}
            </p>
          </div>

          <div className="flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span>{recipe.cookingTime} min</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-muted-foreground" />
              <span>{recipe.servings} servings</span>
            </div>
          </div>

          {/* Enhanced Video section with AI avatar explanation */}
          <div className="space-y-4">
            <div className="relative">
              {videoUrl ? (
                <div className="rounded-lg overflow-hidden bg-black">
                  <div className="relative pt-[56.25%]">
                    <video 
                      src={videoUrl} 
                      controls 
                      poster={imageUrl}
                      className="absolute top-0 left-0 w-full h-full"
                    ></video>
                  </div>
                  <div className="p-4 bg-secondary/30">
                    <h3 className="font-medium text-base">AI Chef Explanation</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Watch as our AI chef walks you through each step of preparing {recipe.name}.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-6 border rounded-lg bg-secondary/30">
                  <div className="flex flex-col items-center gap-3 text-center">
                    <ChefHat className="w-8 h-8 text-primary/80" />
                    <h3 className="font-medium">AI Chef Video</h3>
                    <p className="text-sm text-muted-foreground">
                      Generate a video with our AI chef explaining how to prepare this dish step-by-step
                    </p>
                    <Button 
                      onClick={onGenerateVideo}
                      className="mt-2 gap-2"
                    >
                      <PlayCircle className="w-4 h-4" />
                      Generate Chef Video
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="outline" className="flex-1 gap-2">
              <Download className="w-4 h-4" />
              Save Recipe
            </Button>
            <Button variant="outline" className="flex-1 gap-2">
              <Share2 className="w-4 h-4" />
              Share
            </Button>
          </div>
        </div>

        {/* Recipe Details */}
        <div className="lg:col-span-3">
          <div className="glass-panel rounded-xl shadow-sm overflow-hidden">
            <Tabs 
              defaultValue="ingredients" 
              value={activeTab} 
              onValueChange={setActiveTab}
              className="w-full"
            >
              <TabsList className="w-full grid grid-cols-2">
                <TabsTrigger value="ingredients" className="text-base">Ingredients</TabsTrigger>
                <TabsTrigger value="instructions" className="text-base">Instructions</TabsTrigger>
              </TabsList>
              
              <div className="p-6">
                <TabsContent value="ingredients" className="mt-0 space-y-4">
                  <ScrollArea className="h-[450px] pr-4">
                    <ul className="space-y-2">
                      {recipe.ingredients.map((ingredient, index) => (
                        <li key={index} className="pb-2 border-b last:border-0">
                          <div className="flex items-start">
                            <div className="w-4 h-4 rounded-full border-2 border-primary/70 mt-1 mr-3"></div>
                            <div>
                              <span className="font-medium">{ingredient.amount} </span>
                              <span>{ingredient.name}</span>
                              {ingredient.notes && (
                                <p className="text-sm text-muted-foreground mt-1">{ingredient.notes}</p>
                              )}
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </ScrollArea>
                </TabsContent>
                
                <TabsContent value="instructions" className="mt-0">
                  <ScrollArea className="h-[450px] pr-4">
                    <ol className="space-y-6">
                      {recipe.steps.map((step, index) => (
                        <li key={index} className="pb-4 border-b last:border-0">
                          <div className="flex gap-4">
                            <div className="flex-shrink-0">
                              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
                                {index + 1}
                              </div>
                            </div>
                            <div className="space-y-2">
                              <p>{step.instruction}</p>
                              {step.tip && (
                                <div className="p-3 bg-secondary/50 rounded-md text-sm text-muted-foreground">
                                  <span className="font-medium">Tip: </span>
                                  {step.tip}
                                </div>
                              )}
                            </div>
                          </div>
                        </li>
                      ))}
                    </ol>
                  </ScrollArea>
                </TabsContent>
              </div>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecipeDisplay;
