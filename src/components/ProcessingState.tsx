
import React from "react";
import { Loader2Icon, SparklesIcon, CameraIcon } from "lucide-react";

interface ProcessingStateProps {
  stage: 'analyzing' | 'generating' | 'creating-video';
  progress?: number;
}

const ProcessingState: React.FC<ProcessingStateProps> = ({ stage, progress = 0 }) => {
  const getStageInfo = () => {
    switch (stage) {
      case 'analyzing':
        return {
          title: "Analyzing your image",
          description: "Our AI is identifying the dish and ingredients...",
          icon: <CameraIcon className="w-6 h-6 animate-pulse" />,
        };
      case 'generating':
        return {
          title: "Crafting the perfect recipe",
          description: "Creating a detailed recipe with precise ingredients and steps...",
          icon: <SparklesIcon className="w-6 h-6 animate-pulse-subtle" />,
        };
      case 'creating-video':
        return {
          title: "Creating your AI chef video",
          description: "Our AI chef is preparing a personalized video tutorial for you...",
          icon: <Loader2Icon className="w-6 h-6 animate-spin" />,
        };
      default:
        return {
          title: "Processing",
          description: "Please wait...",
          icon: <Loader2Icon className="w-6 h-6 animate-spin" />,
        };
    }
  };

  const stageInfo = getStageInfo();

  return (
    <div className="w-full max-w-md mx-auto py-12">
      <div className="glass-panel p-8 rounded-xl flex flex-col items-center text-center space-y-6">
        <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center">
          {stageInfo.icon}
        </div>
        
        <div className="space-y-2">
          <h3 className="text-xl font-serif font-semibold tracking-tight">
            {stageInfo.title}
          </h3>
          <p className="text-muted-foreground">
            {stageInfo.description}
          </p>
        </div>
        
        <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
          <div 
            className="bg-primary h-full transition-all duration-300 ease-out" 
            style={{ width: `${progress}%` }}
          ></div>
        </div>
        
        <div className="text-sm text-muted-foreground animate-pulse-subtle">
          This may take a moment, please don't close this page
        </div>
      </div>
    </div>
  );
};

export default ProcessingState;
