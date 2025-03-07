
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
              { type: 'LABEL_DETECTION', maxResults: 15 }, // Increased from 10 to 15
              { type: 'WEB_DETECTION', maxResults: 15 }, // Increased from 10 to 15
              { type: 'TEXT_DETECTION' } // Added text detection to identify food labels or menu items
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
    
    // Extract labels, web entities, and text
    const labels = response.labelAnnotations || [];
    const webEntities = response.webDetection?.webEntities || [];
    const webLabels = response.webDetection?.bestGuessLabels || [];
    const textAnnotations = response.textAnnotations || [];
    
    console.log("Top labels:", labels.slice(0, 5).map((l: any) => l.description));
    console.log("Web entities:", webEntities.slice(0, 5).map((e: any) => e.description));
    console.log("Web labels:", webLabels.map((l: any) => l.label));
    console.log("Text detected:", textAnnotations[0]?.description.slice(0, 100));
    
    // Look for food-related labels
    const foodLabels = labels.filter((label: any) => {
      const description = label.description.toLowerCase();
      return description.includes('food') || 
             description.includes('dish') || 
             description.includes('cuisine') ||
             description.includes('meal') ||
             description.includes('recipe') ||
             description.includes('menu') ||
             description.includes('restaurant') ||
             description.includes('cooking') ||
             description.includes('baking') ||
             description.includes('dessert') ||
             description.includes('breakfast') ||
             description.includes('lunch') ||
             description.includes('dinner');
    });
    
    // Expanded list of cuisine keywords
    const cuisineKeywords = [
      // Western cuisines
      'Italian', 'French', 'Spanish', 'Mediterranean', 'Greek', 'American', 'British', 'German', 
      'Belgian', 'Russian', 'Portuguese', 'Scandinavian', 'Nordic', 'Irish', 'Scottish', 'Welsh',
      'Austrian', 'Swiss', 'Dutch', 'Polish', 'Hungarian', 'Czech', 'Balkan',
      
      // Asian cuisines
      'Chinese', 'Japanese', 'Thai', 'Korean', 'Vietnamese', 'Indian', 'Pakistani', 'Nepalese', 
      'Indonesian', 'Malaysian', 'Singaporean', 'Filipino', 'Cambodian', 'Burmese', 'Laotian', 
      'Mongolian', 'Tibetan', 'Sri Lankan', 'Bangladeshi', 'Central Asian', 'Uyghur',
      
      // Middle Eastern and African cuisines
      'Turkish', 'Lebanese', 'Syrian', 'Persian', 'Iraqi', 'Israeli', 'Moroccan', 'Egyptian', 
      'Ethiopian', 'Tunisian', 'Algerian', 'Libyan', 'West African', 'East African', 
      'South African', 'Nigerian', 'Ghanaian', 'Kenyan', 'Somali', 'Sudanese',
      
      // Latin American cuisines
      'Mexican', 'Brazilian', 'Peruvian', 'Argentinian', 'Colombian', 'Chilean', 'Venezuelan', 
      'Cuban', 'Puerto Rican', 'Dominican', 'Jamaican', 'Caribbean', 'Haitian', 'Trinidadian', 
      'Ecuadorian', 'Uruguayan', 'Paraguayan', 'Bolivian', 'Central American', 'Guatemalan',
      
      // Regional American cuisines
      'Cajun', 'Creole', 'Southern', 'Tex-Mex', 'New England', 'Midwestern', 'Hawaiian', 
      'Californian', 'Southwestern', 'Pacific Northwest', 'Alaskan', 'Soul Food', 'Barbecue',
      
      // Cooking styles and dietary patterns
      'Vegan', 'Vegetarian', 'Pescatarian', 'Kosher', 'Halal', 'Gluten-free', 'Paleo', 
      'Keto', 'Low-carb', 'Plant-based', 'Raw', 'Fusion', 'Slow-cooked', 'Smoked', 
      'Grilled', 'Baked', 'Fried', 'Roasted', 'Steamed', 'Stir-fried', 'Fermented'
    ];
    
    // Check for cuisine mentions in entities, labels and text
    let cuisine = '';
    
    // First check if any text directly mentions a cuisine
    if (textAnnotations.length > 0) {
      const detectedText = textAnnotations[0].description.toLowerCase();
      for (const keyword of cuisineKeywords) {
        if (detectedText.includes(keyword.toLowerCase())) {
          cuisine = keyword;
          break;
        }
      }
    }
    
    // If no cuisine found in text, check other sources
    if (!cuisine) {
      for (const entity of [...labels, ...webEntities]) {
        const entityName = (entity.description || '').toLowerCase();
        for (const keyword of cuisineKeywords) {
          if (entityName.includes(keyword.toLowerCase())) {
            cuisine = keyword;
            break;
          }
        }
        if (cuisine) break;
      }
    }
    
    // Additional food types recognition (beyond just names of dishes)
    const foodCategories = [
      'Pasta', 'Noodles', 'Rice', 'Soup', 'Salad', 'Sandwich', 'Burger', 'Pizza', 'Stew', 
      'Curry', 'Stir-fry', 'Roast', 'Grill', 'Barbeque', 'BBQ', 'Seafood', 'Fish', 'Sushi', 
      'Dumpling', 'Bread', 'Pastry', 'Cake', 'Pie', 'Dessert', 'Ice cream', 'Gelato', 
      'Breakfast', 'Brunch', 'Lunch', 'Dinner', 'Appetizer', 'Entree', 'Main course', 
      'Side dish', 'Snack', 'Beverage', 'Drink', 'Cocktail', 'Smoothie', 'Juice'
    ];
    
    let foodCategory = '';
    for (const entity of [...labels, ...webEntities]) {
      const entityName = (entity.description || '').toLowerCase();
      for (const category of foodCategories) {
        if (entityName.includes(category.toLowerCase())) {
          foodCategory = category;
          break;
        }
      }
      if (foodCategory) break;
    }
    
    // Identify dish name with improved logic
    let dishName = '';
    let confidence = 0;
    let alternatives: string[] = [];
    
    // First check web labels (usually most accurate for named dishes)
    if (webLabels && webLabels.length > 0) {
      dishName = webLabels[0].label.replace(/\bfood\b/i, '')
                              .replace(/\brecipe\b/i, '')
                              .replace(/\bdish\b/i, '')
                              .replace(/\bmeal\b/i, '')
                              .trim();
      confidence = 0.9;
      
      // Add alternatives based on top web entities
      const filteredEntities = webEntities
        .filter((entity: any) => entity.description && 
                               entity.description !== dishName && 
                               entity.score >= 0.5)
        .slice(0, 5);
      
      for (const entity of filteredEntities) {
        if (entity.description && entity.description.length > 3 && 
            !entity.description.match(/^(food|recipe|dish|meal)$/i)) {
          alternatives.push(entity.description);
          if (alternatives.length >= 3) break;
        }
      }
    } 
    // If no web labels, check text annotations for dish names
    else if (textAnnotations.length > 1) {
      // Look for potential food names in detected text
      const textLines = textAnnotations[0].description.split('\n');
      const potentialDishNames = textLines.filter(line => 
        line.length > 3 && 
        !line.match(/^(menu|price|restaurant|cafe|ingredients|nutrition|calories)$/i) &&
        line.length < 40 // Not too long to be a dish name
      );
      
      if (potentialDishNames.length > 0) {
        dishName = potentialDishNames[0];
        confidence = 0.7;
        
        // Add other text lines as alternatives
        for (let i = 1; i < Math.min(potentialDishNames.length, 4); i++) {
          alternatives.push(potentialDishNames[i]);
        }
      }
    }
    // If still no dish name, use top label
    else if (labels.length > 0) {
      const foodRelatedLabels = labels.filter(label => 
        !label.description.match(/^(food|recipe|dish|meal|cuisine|restaurant)$/i) &&
        label.score >= 0.6
      );
      
      if (foodRelatedLabels.length > 0) {
        dishName = foodRelatedLabels[0].description;
        confidence = foodRelatedLabels[0].score;
        
        // Add alternatives based on other top labels
        for (let i = 1; i < Math.min(foodRelatedLabels.length, 4); i++) {
          alternatives.push(foodRelatedLabels[i].description);
        }
      }
    }
    
    // If dishName still contains just food, recipe, or dish without other information
    if (!dishName || dishName.match(/^(food|recipe|dish|meal)$/i)) {
      // Use the first web entity with good score instead
      for (const entity of webEntities) {
        if (entity.score >= 0.5 && !entity.description.match(/^(food|recipe|dish|meal)$/i)) {
          dishName = entity.description;
          confidence = entity.score;
          break;
        }
      }
    }
    
    // If still no good dish name, try combining food category with cuisine
    if (!dishName || dishName.length < 3) {
      if (cuisine && foodCategory) {
        dishName = `${cuisine} ${foodCategory}`;
        confidence = 0.6;
      } else if (foodCategory) {
        dishName = foodCategory;
        confidence = 0.5;
      } else if (cuisine) {
        dishName = `${cuisine} Dish`;
        confidence = 0.5;
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
        cuisine: cuisine || "International",
        confidence,
        alternatives,
        foodCategory: foodCategory || undefined,
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
