
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

  // Handle the image upload
  const handleImageUpload = async (file: File, previewUrl: string) => {
    setUploadedImage(previewUrl);
    setOriginalFile(file);
    setProcessing(true);
    setProcessingStage('analyzing');
    setProgress(0);
    setRecipe(null);
    setVideoUrl(null);

    try {
      // Simulate progress for dish recognition
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 300);

      // Analyze the image
      const analysis = await analyzeImage(file);
      clearInterval(progressInterval);
      setProgress(100);

      // Show detailed toast about the detected dish
      toast.success(`Identified: ${analysis.dishName}`, {
        description: `Confidence: ${(analysis.confidence * 100).toFixed(0)}% • Cuisine: ${analysis.cuisine}`,
        duration: 5000
      });
      
      // Start recipe generation
      setProcessingStage('generating');
      setProgress(0);
      
      // Simulate progress for recipe generation
      const recipeProgressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) {
            clearInterval(recipeProgressInterval);
            return 90;
          }
          return prev + 5;
        });
      }, 300);

      // Generate the recipe using the identified cuisine
      const generatedRecipe = await generateRecipe(analysis.dishName, analysis.cuisine);
      clearInterval(recipeProgressInterval);
      setProgress(100);
      
      // Show the recipe
      setRecipe(generatedRecipe);
      
      // Automatically start generating the video if the recipe was successfully generated
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

  // Handle AI chef video generation
  const handleGenerateVideo = async (recipeToUse?: Recipe) => {
    const recipeForVideo = recipeToUse || recipe;
    if (!recipeForVideo) return;
    
    setProcessing(true);
    setProcessingStage('creating-video');
    setProgress(0);
    
    try {
      // Simulate progress for video generation
      const videoProgressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) {
            clearInterval(videoProgressInterval);
            return 90;
          }
          return prev + 3;
        });
      }, 300);

      // Generate the AI chef video
      const videoUrl = await generateVideo(recipeForVideo);
      clearInterval(videoProgressInterval);
      setProgress(100);
      
      // Show the video
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

  // Handle ingredient-based recipe search
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

  // Select a recipe from the ingredients search results
  const handleSelectRecipe = (selectedRecipe: Recipe) => {
    setRecipe(selectedRecipe);
    setVideoUrl(null);
    
    // Automatically generate a video for the selected recipe
    handleGenerateVideo(selectedRecipe);
  };

  // Reset the state when switching tabs
  const handleTabChange = (value: string) => {
    if (value === 'image') {
      setSearchMode('image');
    } else if (value === 'ingredients') {
      setSearchMode('ingredients');
      // Only reset if we're actually showing a recipe
      if (recipe && !processing) {
        setRecipe(null);
        setVideoUrl(null);
        setUploadedImage(null);
      }
    }
  };

  return (
    <main className="min-h-screen bg-background">
      {/* Header */}
      <header className="w-full py-8 px-6 text-center">
        <div className="max-w-4xl mx-auto space-y-2">
          <h1 className="text-4xl md:text-5xl font-serif font-semibold tracking-tight animate-fade-in-down">
            COOK-KEY
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto animate-fade-in">
            Your AI Culinary Assistant: Get Recipes from Photos or Ingredients!
          </p>
        </div>
      </header>

      {/* Main Content */}
      <div className="container px-6 py-4">
        {!recipe && !processing && (
          <Tabs 
            defaultValue="image" 
            onValueChange={handleTabChange}
            className="w-full max-w-4xl mx-auto"
          >
            <TabsList className="grid grid-cols-2 w-full max-w-md mx-auto mb-8">
              <TabsTrigger value="image">Photo to Recipe</TabsTrigger>
              <TabsTrigger value="ingredients">Ingredients to Recipe</TabsTrigger>
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

      {/* Footer */}
      <footer className="w-full py-6 px-6 text-center text-muted-foreground text-sm">
        <p>COOK-KEY - Your AI-Powered Culinary Assistant</p>
      </footer>
    </main>
  );
};

export default Index;
