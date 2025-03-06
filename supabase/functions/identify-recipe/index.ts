
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

    console.log("Analyzing image with Google Cloud Vision API using key:", GOOGLE_CLOUD_VISION_API_KEY.substring(0, 5) + "...");

    // Call Google Cloud Vision API for image analysis with more specific features
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
                maxResults: 15
              },
              {
                type: 'WEB_DETECTION',
                maxResults: 15
              },
              {
                type: 'OBJECT_LOCALIZATION',
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
    const webLabels = visionData.responses[0]?.webDetection?.bestGuessLabels || [];
    const localizedObjects = visionData.responses[0]?.localizedObjectAnnotations || [];
    
    console.log("Web best guess labels:", JSON.stringify(webLabels));
    
    // First, check if we have any direct food detection from localized objects
    const foodObjects = localizedObjects.filter(obj => 
      obj.name.toLowerCase().includes('food') || 
      obj.name.toLowerCase().includes('dish') ||
      obj.name.toLowerCase().includes('meal')
    );
    
    // Filter for food-related labels with higher threshold
    const foodLabels = labels.filter(label => {
      const description = label.description.toLowerCase();
      return (label.score > 0.7) && (
        description.includes('food') || 
        description.includes('dish') || 
        description.includes('cuisine') ||
        description.includes('meal') ||
        description.includes('recipe') ||
        description.includes('dessert') ||
        description.includes('breakfast') ||
        description.includes('lunch') ||
        description.includes('dinner')
      );
    });

    // Find the best dish name
    let dishName = "";
    let confidence = 0;
    let cuisine = "International";
    
    // Best guesses from web detection are often the most accurate for food dishes
    if (webLabels && webLabels.length > 0) {
      dishName = webLabels[0].label;
      confidence = 0.9; // Web best guesses are usually high confidence
    } 
    // Next, try specific food objects if detected
    else if (foodObjects.length > 0) {
      dishName = foodObjects[0].name;
      confidence = foodObjects[0].score;
    }
    // Next try to get dish name from high-confidence web entities
    else if (webEntities.length > 0) {
      const foodEntity = webEntities.find(entity => entity.score > 0.8);
      if (foodEntity) {
        dishName = foodEntity.description;
        confidence = foodEntity.score;
      } else if (webEntities[0].score > 0.7) {
        dishName = webEntities[0].description;
        confidence = webEntities[0].score;
      }
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

    // Try to determine cuisine from the labels and web entities
    const cuisineKeywords = {
      "Italian": ["italian", "pasta", "pizza", "risotto", "lasagna", "spaghetti", "carbonara"],
      "Mexican": ["mexican", "taco", "burrito", "enchilada", "quesadilla", "guacamole", "tortilla"],
      "Chinese": ["chinese", "stir fry", "dumpling", "noodle", "wonton", "kung pao", "fried rice"],
      "Japanese": ["japanese", "sushi", "ramen", "tempura", "miso", "sashimi", "teriyaki"],
      "Indian": ["indian", "curry", "masala", "naan", "tikka", "biryani", "paneer"],
      "French": ["french", "croissant", "baguette", "ratatouille", "coq au vin", "quiche", "souffle"],
      "Thai": ["thai", "pad thai", "curry", "tom yum", "satay", "spring roll"],
      "Mediterranean": ["mediterranean", "hummus", "falafel", "kebab", "pita", "tzatziki", "olive"],
      "American": ["american", "burger", "hot dog", "mac and cheese", "barbecue", "fried chicken"],
      "Korean": ["korean", "kimchi", "bibimbap", "bulgogi", "gochujang", "kimbap"],
      "Vietnamese": ["vietnamese", "pho", "banh mi", "spring roll", "fish sauce"],
      "Spanish": ["spanish", "paella", "tapas", "sangria", "gazpacho"],
      "Greek": ["greek", "gyro", "souvlaki", "moussaka", "tzatziki", "feta"]
    };

    // Check all labels, web entities and best guess labels for cuisine matches
    const allDescriptions = [
      ...labels.map(l => l.description.toLowerCase()),
      ...webEntities.map(e => e.description.toLowerCase()),
      ...(webLabels ? webLabels.map(l => l.label.toLowerCase()) : [])
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
    const allFoodItems = [...foodLabels, ...webEntities.filter(e => e.score > 0.6)].slice(1, 6);
    
    for (const item of allFoodItems) {
      if (item.description && 
          item.description.toLowerCase() !== dishName.toLowerCase() && 
          !alternatives.includes(item.description)) {
        alternatives.push(item.description);
      }
      if (alternatives.length >= 3) break;
    }

    // If we couldn't find enough alternatives, add some generic ones based on the cuisine
    while (alternatives.length < 3) {
      const cuisineOptions = {
        "Italian": ["Pasta Carbonara", "Margherita Pizza", "Risotto", "Lasagna"],
        "Mexican": ["Beef Tacos", "Chicken Quesadilla", "Guacamole", "Enchiladas"],
        "Chinese": ["Kung Pao Chicken", "Fried Rice", "Dumplings", "Chow Mein"],
        "Japanese": ["Sushi Rolls", "Ramen", "Tempura", "Miso Soup"],
        "Indian": ["Butter Chicken", "Vegetable Curry", "Naan Bread", "Tikka Masala"],
        "Thai": ["Pad Thai", "Green Curry", "Tom Yum Soup", "Spring Rolls"],
        "American": ["Cheeseburger", "BBQ Ribs", "Mac and Cheese", "Fried Chicken"]
      };
      
      const options = cuisineOptions[cuisine] || [
        "Pasta Carbonara", "Chicken Curry", "Beef Stir Fry", 
        "Vegetable Soup", "Caesar Salad", "Mushroom Risotto"
      ];
      
      const randomOption = options[Math.floor(Math.random() * options.length)];
      if (!alternatives.includes(randomOption) && randomOption.toLowerCase() !== dishName.toLowerCase()) {
        alternatives.push(randomOption);
      }
    }

    // Enhance the dish name if it's too generic
    if (dishName.toLowerCase() === "food" || dishName.toLowerCase() === "dish" || dishName.toLowerCase() === "meal") {
      // Use the first alternative or a cuisine-based default
      dishName = alternatives[0] || `${cuisine} Dish`;
    }

    return new Response(
      JSON.stringify({
        dishName,
        cuisine,
        confidence,
        alternatives,
        // Include extra data that might be useful for debugging
        visionDetails: {
          topLabels: labels.slice(0, 5).map(l => ({ description: l.description, score: l.score })),
          topWebEntities: webEntities.slice(0, 5).map(e => ({ description: e.description, score: e.score })),
          webBestGuess: webLabels ? webLabels.map(l => l.label) : [],
          topObjects: localizedObjects.slice(0, 5).map(o => ({ name: o.name, score: o.score }))
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
