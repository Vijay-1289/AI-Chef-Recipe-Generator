
import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import ImageUploader from "@/components/ImageUploader";
import ProcessingState from "@/components/ProcessingState";
import RecipeDisplay from "@/components/RecipeDisplay";
import { Recipe } from "@/types/recipe";
import { analyzeImage, generateRecipe, generateVideo } from "@/services/recipeService";

const Index = () => {
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [processingStage, setProcessingStage] = useState<'analyzing' | 'generating' | 'creating-video'>('analyzing');
  const [progress, setProgress] = useState(0);
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

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

  return (
    <main className="min-h-screen bg-background">
      {/* Header */}
      <header className="w-full py-8 px-6 text-center">
        <div className="max-w-4xl mx-auto space-y-2">
          <h1 className="text-4xl md:text-5xl font-serif font-semibold tracking-tight animate-fade-in-down">
            COOK-KEY
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto animate-fade-in">
            Your AI Culinary Assistant: Just Snap a Photo and Get a Recipe!
          </p>
        </div>
      </header>

      {/* Main Content */}
      <div className="container px-6 py-8">
        {!recipe && !processing && (
          <ImageUploader 
            onImageUpload={handleImageUpload} 
            isProcessing={processing}
          />
        )}

        {processing && (
          <ProcessingState 
            stage={processingStage} 
            progress={progress}
          />
        )}

        {recipe && !processing && uploadedImage && (
          <RecipeDisplay 
            recipe={recipe} 
            imageUrl={uploadedImage}
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
