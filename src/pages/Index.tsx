import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ImageUploader from "@/components/ImageUploader";
import ProcessingState from "@/components/ProcessingState";
import RecipeDisplay from "@/components/RecipeDisplay";
import IngredientSearch from "@/components/IngredientSearch";
import IngredientRecipeList from "@/components/IngredientRecipeList";
import { Recipe } from "@/types/recipe";
import { analyzeImage, generateRecipe, generateVideo, findRecipesByIngredients } from "@/services/recipeService";
import { ChefHat, Utensils, Sparkles } from "lucide-react";

const Index = () => {
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [processingStage, setProcessingStage] = useState<'analyzing' | 'generating' | 'creating-video'>('analyzing');
  const [progress, setProgress] = useState(0);
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [searchMode, setSearchMode] = useState<'image' | 'ingredients'>('image');
  const [ingredientRecipes, setIngredientRecipes] = useState<Recipe[]>([]);
  const [searchingIngredients, setSearchingIngredients] = useState(false);

  const handleImageUpload = async (file: File, previewUrl: string) => {
    setUploadedImage(previewUrl);
    setOriginalFile(file);
    setProcessing(true);
    setProcessingStage('analyzing');
    setProgress(0);
    setRecipe(null);
    setVideoUrl(null);

    try {
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 300);

      const analysis = await analyzeImage(file);
      clearInterval(progressInterval);
      setProgress(100);

      toast.success(`Identified: ${analysis.dishName}`, {
        description: `Confidence: ${(analysis.confidence * 100).toFixed(0)}% • Cuisine: ${analysis.cuisine}`,
        duration: 5000
      });

      setProcessingStage('generating');
      setProgress(0);

      const recipeProgressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) {
            clearInterval(recipeProgressInterval);
            return 90;
          }
          return prev + 5;
        });
      }, 300);

      const generatedRecipe = await generateRecipe(analysis.dishName, analysis.cuisine);
      clearInterval(recipeProgressInterval);
      setProgress(100);

      setRecipe(generatedRecipe);

      if (generatedRecipe) {
        handleGenerateVideo(generatedRecipe);
      } else {
        setProcessing(false);
      }
    } catch (error) {
      console.error("Error processing image:", error);
      toast.error("Failed to process image", {
        description: "There was a problem analyzing your image. Please try again."
      });
      setProcessing(false);
    }
  };

  const handleGenerateVideo = async (recipeToUse?: Recipe) => {
    const recipeForVideo = recipeToUse || recipe;
    if (!recipeForVideo) return;
    
    setProcessing(true);
    setProcessingStage('creating-video');
    setProgress(0);
    
    try {
      const videoProgressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) {
            clearInterval(videoProgressInterval);
            return 90;
          }
          return prev + 3;
        });
      }, 300);

      const videoUrl = await generateVideo(recipeForVideo);
      clearInterval(videoProgressInterval);
      setProgress(100);
      
      setVideoUrl(videoUrl);
      toast.success("AI Chef video created", {
        description: "Your personalized cooking tutorial is ready to watch!",
        duration: 5000
      });
      
    } catch (error) {
      console.error("Error generating video:", error);
      toast.error("Failed to generate video", {
        description: "There was a problem creating your AI chef video. Please try again."
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleIngredientSearch = async (ingredients: string[]) => {
    setSearchingIngredients(true);
    setIngredientRecipes([]);
    
    try {
      const recipes = await findRecipesByIngredients(ingredients);
      setIngredientRecipes(recipes);
      
      if (recipes.length > 0) {
        toast.success(`Found ${recipes.length} recipes`, {
          description: `Recipes using ${ingredients.slice(0, 2).join(', ')}${ingredients.length > 2 ? ', and more' : ''}`,
        });
      } else {
        toast.info("No recipes found", {
          description: "Try different ingredients or fewer restrictions",
        });
      }
    } catch (error) {
      console.error("Error searching recipes by ingredients:", error);
      toast.error("Recipe search failed", {
        description: "There was a problem finding recipes with your ingredients."
      });
    } finally {
      setSearchingIngredients(false);
    }
  };

  const handleSelectRecipe = (selectedRecipe: Recipe) => {
    setRecipe(selectedRecipe);
    setVideoUrl(null);
    
    handleGenerateVideo(selectedRecipe);
  };

  const handleTabChange = (value: string) => {
    if (value === 'image') {
      setSearchMode('image');
    } else if (value === 'ingredients') {
      setSearchMode('ingredients');
      if (recipe && !processing) {
        setRecipe(null);
        setVideoUrl(null);
        setUploadedImage(null);
      }
    }
  };

  return (
    <main className="min-h-screen bg-background bg-gradient-to-b from-background via-background to-secondary/10">
      <header className="w-full py-10 px-6 text-center bg-gradient-to-b from-primary/5 to-background">
        <div className="max-w-4xl mx-auto space-y-4">
          <div className="flex items-center justify-center gap-3">
            <ChefHat className="h-10 w-10 text-primary animate-bounce" />
            <h1 className="text-5xl md:text-6xl font-serif font-semibold tracking-tight animate-fade-in-down bg-gradient-to-r from-primary/90 to-primary bg-clip-text text-transparent">
              COOK-KEY
            </h1>
            <Utensils className="h-8 w-8 text-primary/80 animate-pulse" />
          </div>
          <p className="text-muted-foreground max-w-2xl mx-auto animate-fade-in text-lg">
            Your AI Culinary Assistant: Get Recipes from Photos or Ingredients!
          </p>
          <div className="flex justify-center">
            <span className="inline-flex items-center px-3 py-1 text-xs rounded-full bg-primary/10 text-primary gap-1">
              <Sparkles className="h-3 w-3" />
              Powered by Advanced AI
            </span>
          </div>
        </div>
      </header>

      <div className="container px-6 py-8">
        {!recipe && !processing && (
          <Tabs 
            defaultValue="image" 
            onValueChange={handleTabChange}
            className="w-full max-w-4xl mx-auto"
          >
            <TabsList className="grid grid-cols-2 w-full max-w-md mx-auto mb-8 bg-secondary/40 p-1">
              <TabsTrigger value="image" className="data-[state=active]:bg-primary/90 data-[state=active]:text-white">
                Photo to Recipe
              </TabsTrigger>
              <TabsTrigger value="ingredients" className="data-[state=active]:bg-primary/90 data-[state=active]:text-white">
                Ingredients to Recipe
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="image" className="mt-0">
              <ImageUploader 
                onImageUpload={handleImageUpload} 
                isProcessing={processing}
              />
            </TabsContent>
            
            <TabsContent value="ingredients" className="mt-0">
              <IngredientSearch 
                onSearch={handleIngredientSearch}
                isSearching={searchingIngredients}
              />
              
              {!searchingIngredients && ingredientRecipes.length > 0 && !recipe && (
                <IngredientRecipeList 
                  recipes={ingredientRecipes}
                  onSelectRecipe={handleSelectRecipe}
                  isLoading={searchingIngredients}
                />
              )}
            </TabsContent>
          </Tabs>
        )}

        {processing && (
          <ProcessingState 
            stage={processingStage} 
            progress={progress}
          />
        )}

        {recipe && !processing && (
          <RecipeDisplay 
            recipe={recipe} 
            imageUrl={uploadedImage || (recipe.imageUrl || '')}
            onGenerateVideo={() => handleGenerateVideo()}
            videoUrl={videoUrl || undefined}
          />
        )}
      </div>

      <footer className="w-full py-8 px-6 text-center text-muted-foreground">
        <div className="max-w-4xl mx-auto border-t pt-6">
          <p className="flex items-center justify-center gap-2">
            <ChefHat className="h-4 w-4 text-primary/70" />
            COOK-KEY - Your AI-Powered Culinary Assistant
          </p>
        </div>
      </footer>
    </main>
  );
};

export default Index;
