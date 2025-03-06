
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GOOGLE_CLOUD_VISION_API_KEY = Deno.env.get('GOOGLE_CLOUD_VISION_API_KEY');

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("identify-recipe function called");
    
    // Parse the FormData from the request
    const formData = await req.formData();
    const imageFile = formData.get('image');
    
    if (!imageFile || !(imageFile instanceof File)) {
      return new Response(
        JSON.stringify({ error: "No image file provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    console.log("Image file received:", imageFile.name, imageFile.type, `${(imageFile.size / 1024).toFixed(2)} KB`);
    
    // Convert the image to base64
    const arrayBuffer = await imageFile.arrayBuffer();
    const base64Image = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
    
    console.log("Image converted to base64, length:", base64Image.length);
    
    // Call Google Cloud Vision API to analyze the image
    const visionApiEndpoint = `https://vision.googleapis.com/v1/images:annotate?key=${GOOGLE_CLOUD_VISION_API_KEY}`;
    
    console.log("Calling Google Cloud Vision API");
    
    const visionResponse = await fetch(visionApiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        requests: [
          {
            features: [
              { type: 'LABEL_DETECTION', maxResults: 10 },
              { type: 'WEB_DETECTION', maxResults: 10 }
            ],
            image: {
              content: base64Image
            }
          }
        ]
      })
    });
    
    const visionData = await visionResponse.json();
    
    console.log("Google Cloud Vision API response status:", visionResponse.status);
    
    if (!visionData.responses || visionData.responses.length === 0) {
      console.error("Error in Google Cloud Vision API response:", visionData);
      throw new Error("Failed to analyze image with Google Cloud Vision API");
    }
    
    // Process results from Vision API
    const response = visionData.responses[0];
    
    // Extract labels
    const labels = response.labelAnnotations || [];
    const webEntities = response.webDetection?.webEntities || [];
    const webLabels = response.webDetection?.bestGuessLabels || [];
    
    console.log("Top labels:", labels.slice(0, 3).map((l: any) => l.description));
    console.log("Web entities:", webEntities.slice(0, 3).map((e: any) => e.description));
    console.log("Web labels:", webLabels.map((l: any) => l.label));
    
    // Look for food-related labels
    const foodLabels = labels.filter((label: any) => {
      const description = label.description.toLowerCase();
      return description.includes('food') || 
             description.includes('dish') || 
             description.includes('cuisine') ||
             description.includes('meal') ||
             description.includes('recipe');
    });
    
    // Find cuisine mentions
    const cuisineKeywords = [
      'Italian', 'Chinese', 'Indian', 'Mexican', 'Japanese', 'Thai', 
      'French', 'Greek', 'Spanish', 'Mediterranean', 'American', 'Korean',
      'Vietnamese', 'Turkish', 'Lebanese', 'Moroccan', 'Brazilian'
    ];
    
    let cuisine = '';
    for (const entity of [...labels, ...webEntities]) {
      const entityName = entity.description || '';
      for (const keyword of cuisineKeywords) {
        if (entityName.includes(keyword)) {
          cuisine = keyword;
          break;
        }
      }
      if (cuisine) break;
    }
    
    // Identify dish name
    let dishName = '';
    let confidence = 0;
    let alternatives: string[] = [];
    
    // First check web labels (usually most accurate for named dishes)
    if (webLabels && webLabels.length > 0) {
      dishName = webLabels[0].label.replace('food', '').replace('recipe', '').replace('dish', '').trim();
      confidence = 0.9;
      
      // Add alternatives based on top web entities
      const filteredEntities = webEntities
        .filter((entity: any) => entity.description && entity.description !== dishName)
        .slice(0, 5);
      
      for (const entity of filteredEntities) {
        if (entity.description && entity.description.length > 3) {
          alternatives.push(entity.description);
          if (alternatives.length >= 3) break;
        }
      }
    } 
    // If no web labels, use top label
    else if (labels.length > 0) {
      dishName = labels[0].description;
      confidence = labels[0].score;
      
      // Add alternatives based on other top labels
      for (let i = 1; i < Math.min(labels.length, 4); i++) {
        alternatives.push(labels[i].description);
      }
    }
    
    // If dishName contains food, recipe, or dish without other information
    if (dishName.match(/^(food|recipe|dish)$/i)) {
      // Use the first web entity with good score instead
      for (const entity of webEntities) {
        if (entity.score >= 0.5 && !entity.description.match(/^(food|recipe|dish)$/i)) {
          dishName = entity.description;
          confidence = entity.score;
          break;
        }
      }
    }
    
    // If still no good dish name, try combining labels
    if (!dishName || dishName.length < 3) {
      const relevantLabels = labels
        .filter((label: any) => !label.description.match(/^(food|recipe|dish|meal|cuisine)$/i))
        .slice(0, 2);
      
      if (relevantLabels.length > 0) {
        dishName = relevantLabels.map((label: any) => label.description).join(" ");
        confidence = relevantLabels[0].score;
      }
    }
    
    // Default if all else fails
    if (!dishName || dishName.length < 3) {
      dishName = "Food Dish";
      confidence = 0.5;
    }
    
    // Clean up dish name
    dishName = dishName
      .replace(/^photo of /i, '')
      .replace(/^picture of /i, '')
      .replace(/^image of /i, '')
      .replace(/^a /i, '')
      .replace(/^an /i, '')
      .replace(/^the /i, '')
      .trim();
    
    // Capitalize first letter of each word in dish name
    dishName = dishName.split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
    
    console.log("Final result:", { dishName, cuisine, confidence, alternatives });
    
    // Return the results
    return new Response(
      JSON.stringify({
        dishName,
        cuisine,
        confidence,
        alternatives,
        visionDetails: {
          topLabels: labels.slice(0, 5).map((l: any) => l.description),
          topWebEntities: webEntities.slice(0, 5).map((e: any) => e.description)
        }
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in identify-recipe function:", error);
    
    return new Response(
      JSON.stringify({ 
        error: "Failed to analyze image", 
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
