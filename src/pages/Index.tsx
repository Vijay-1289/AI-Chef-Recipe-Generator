
import React, { useState } from "react";
import { toast } from "sonner";
import DishNameInput from "@/components/DishNameInput";
import ProcessingState from "@/components/ProcessingState";
import RecipeDisplay from "@/components/RecipeDisplay";
import { Recipe } from "@/types/recipe";
import { generateRecipe, generateVideo } from "@/services/recipeService";
import { ChefHat, Utensils, Sparkles } from "lucide-react";

const Index = () => {
  const [processing, setProcessing] = useState(false);
  const [processingStage, setProcessingStage] = useState<'analyzing' | 'generating' | 'creating-video'>('generating');
  const [progress, setProgress] = useState(0);
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  const handleDishNameSubmit = async (dishName: string) => {
    setProcessing(true);
    setProcessingStage('generating');
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
          return prev + 5;
        });
      }, 300);

      // Default cuisine to "Any" when manually entering dish name
      const generatedRecipe = await generateRecipe(dishName, "Any");
      clearInterval(progressInterval);
      setProgress(100);

      if (generatedRecipe) {
        setRecipe(generatedRecipe);
        handleGenerateVideo(generatedRecipe);
      } else {
        throw new Error("Failed to generate recipe");
      }
    } catch (error) {
      console.error("Error generating recipe:", error);
      toast.error("Failed to generate recipe", {
        description: "There was a problem creating a recipe for this dish. Please try again."
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
            Your AI Culinary Assistant: Get Perfect Recipes with AI Chef Video Tutorials!
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
          <DishNameInput 
            onDishNameSubmit={handleDishNameSubmit}
            isProcessing={processing}
          />
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
            imageUrl={recipe.imageUrl || ''}
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
