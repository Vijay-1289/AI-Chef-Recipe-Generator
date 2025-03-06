
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

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
    const formData = await req.formData();
    const imageFile = formData.get("image") as File;

    if (!imageFile) {
      return new Response(
        JSON.stringify({ error: "No image provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Convert image to base64
    const buffer = await imageFile.arrayBuffer();
    const base64Image = btoa(String.fromCharCode(...new Uint8Array(buffer)));

    console.log("Analyzing image with Google Cloud Vision API");

    // Call Google Cloud Vision API for image analysis
    const visionResponse = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${GOOGLE_CLOUD_VISION_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requests: [
          {
            image: {
              content: base64Image
            },
            features: [
              {
                type: 'LABEL_DETECTION',
                maxResults: 10
              },
              {
                type: 'WEB_DETECTION',
                maxResults: 10
              }
            ]
          }
        ]
      })
    });

    const visionData = await visionResponse.json();
    
    if (!visionData || visionData.error) {
      console.error("Google Vision API error:", visionData.error);
      throw new Error("Failed to analyze image with Google Vision API");
    }

    console.log("Google Vision API response received");

    // Process the labels to identify food items
    const labels = visionData.responses[0]?.labelAnnotations || [];
    const webEntities = visionData.responses[0]?.webDetection?.webEntities || [];
    
    // Filter for food-related labels
    const foodLabels = labels.filter(label => {
      const description = label.description.toLowerCase();
      return description.includes('food') || 
             description.includes('dish') || 
             description.includes('cuisine') ||
             description.includes('meal') ||
             description.includes('recipe');
    });

    // Find the best dish name from web entities or labels
    let dishName = "";
    let confidence = 0;
    let cuisine = "International";

    // First try to get dish name from web entities as they're often more specific
    const foodWebEntities = webEntities.filter(entity => entity.score > 0.7);
    if (foodWebEntities.length > 0) {
      dishName = foodWebEntities[0].description;
      confidence = foodWebEntities[0].score;
    } 
    // Fall back to labels if no good web entities
    else if (foodLabels.length > 0) {
      dishName = foodLabels[0].description;
      confidence = foodLabels[0].score;
    } 
    // If no food specific labels, use the top label
    else if (labels.length > 0) {
      dishName = labels[0].description;
      confidence = labels[0].score;
    }

    // Try to determine cuisine from the labels
    const cuisineKeywords = {
      "Italian": ["italian", "pasta", "pizza", "risotto", "lasagna"],
      "Mexican": ["mexican", "taco", "burrito", "enchilada", "quesadilla"],
      "Chinese": ["chinese", "stir fry", "dumpling", "noodle", "wonton"],
      "Japanese": ["japanese", "sushi", "ramen", "tempura", "miso"],
      "Indian": ["indian", "curry", "masala", "naan", "tikka"],
      "French": ["french", "croissant", "baguette", "ratatouille", "coq au vin"],
      "Thai": ["thai", "pad thai", "curry", "tom yum", "satay"],
      "Mediterranean": ["mediterranean", "hummus", "falafel", "kebab", "pita"],
      "American": ["american", "burger", "hot dog", "mac and cheese", "barbecue"]
    };

    // Check all labels and web entities for cuisine matches
    const allDescriptions = [
      ...labels.map(l => l.description.toLowerCase()),
      ...webEntities.map(e => e.description.toLowerCase())
    ];

    for (const [cuisineName, keywords] of Object.entries(cuisineKeywords)) {
      for (const keyword of keywords) {
        if (allDescriptions.some(desc => desc.includes(keyword))) {
          cuisine = cuisineName;
          break;
        }
      }
      if (cuisine !== "International") break;
    }

    // Generate alternative dishes based on similar labels/entities
    const alternatives = [];
    const allFoodItems = [...foodLabels, ...foodWebEntities].slice(1, 5);
    
    for (const item of allFoodItems) {
      if (item.description.toLowerCase() !== dishName.toLowerCase() && 
          !alternatives.includes(item.description)) {
        alternatives.push(item.description);
      }
      if (alternatives.length >= 3) break;
    }

    // If we couldn't find enough alternatives, add some generic ones
    while (alternatives.length < 3) {
      const genericOptions = [
        "Pasta Carbonara", "Chicken Curry", "Beef Stir Fry", 
        "Vegetable Soup", "Caesar Salad", "Mushroom Risotto"
      ];
      
      const randomOption = genericOptions[Math.floor(Math.random() * genericOptions.length)];
      if (!alternatives.includes(randomOption) && randomOption.toLowerCase() !== dishName.toLowerCase()) {
        alternatives.push(randomOption);
      }
    }

    return new Response(
      JSON.stringify({
        dishName,
        cuisine,
        confidence,
        alternatives,
        // Include extra data that might be useful for the frontend
        visionDetails: {
          topLabels: labels.slice(0, 5).map(l => l.description),
          topWebEntities: webEntities.slice(0, 5).map(e => e.description)
        }
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error processing image:", error);
    return new Response(
      JSON.stringify({ error: "Failed to process image", details: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
