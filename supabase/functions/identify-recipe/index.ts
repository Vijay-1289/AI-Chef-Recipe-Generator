
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GOOGLE_CLOUD_VISION_API_KEY = Deno.env.get('GOOGLE_CLOUD_VISION_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') || '';

// Create Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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
              { type: 'LABEL_DETECTION', maxResults: 15 },
              { type: 'WEB_DETECTION', maxResults: 15 },
              { type: 'TEXT_DETECTION' }
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
    
    // Get all possible dish-related terms from Vision API
    const allPossibleTerms: string[] = [
      ...(webLabels || []).map((label: any) => label.label?.toLowerCase() || ''),
      ...(labels || []).map((label: any) => label.description?.toLowerCase() || ''), 
      ...(webEntities || []).map((entity: any) => entity.description?.toLowerCase() || '')
    ];
    
    // Extracted food-specific keywords for database queries
    const foodKeywords = allPossibleTerms.filter(term => 
      term.length > 2 && 
      !term.match(/^(food|meal|dish|recipe|cuisine|restaurant|menu|picture|image|photo)$/)
    );
    
    console.log("Food keywords extracted for database search:", foodKeywords);
    
    // Query the food_dishes database to find matching dishes
    const { data: matchingDishes, error: dbError } = await supabase
      .from('food_dishes')
      .select('*');
    
    if (dbError) {
      console.error("Database query error:", dbError);
    }
    
    console.log(`Found ${matchingDishes?.length || 0} dishes in database`);
    
    // Score each dish based on how well it matches our detected keywords
    const scoredDishes = matchingDishes ? matchingDishes.map(dish => {
      let score = 0;
      const dishName = dish.name.toLowerCase();
      const dishCuisine = dish.cuisine.toLowerCase();
      const dishKeywords = dish.keywords ? dish.keywords.map((k: string) => k.toLowerCase()) : [];
      
      // Check for exact dish name matches (highest score)
      if (allPossibleTerms.some(term => term.includes(dishName) || dishName.includes(term))) {
        score += 20;
      }
      
      // Check for cuisine matches
      if (allPossibleTerms.some(term => term.includes(dishCuisine) || dishCuisine.includes(term))) {
        score += 10;
      }
      
      // Check keywords matches
      for (const keyword of dishKeywords) {
        if (foodKeywords.some(term => term.includes(keyword) || keyword.includes(term))) {
          score += 5;
        }
      }
      
      return { dish, score };
    }) : [];
    
    // Sort dishes by score
    scoredDishes.sort((a, b) => b.score - a.score);
    console.log("Top matching dishes:", scoredDishes.slice(0, 3).map(d => `${d.dish.name} (score: ${d.score})`));
    
    // Determine dish name, cuisine and alternatives using both Vision API and database
    let dishName = '';
    let cuisine = '';
    let confidence = 0;
    let alternatives: string[] = [];
    
    // Use the top database match if it has a good score
    if (scoredDishes.length > 0 && scoredDishes[0].score >= 10) {
      const topMatch = scoredDishes[0].dish;
      dishName = topMatch.name;
      cuisine = topMatch.cuisine;
      confidence = Math.min(0.9, scoredDishes[0].score / 30); // Convert score to confidence value
      
      // Use other high-scoring dishes as alternatives
      alternatives = scoredDishes
        .slice(1, 4)
        .filter(d => d.score >= 5)
        .map(d => d.dish.name);
      
      console.log(`Using database match: ${dishName} (${cuisine}) with confidence ${confidence}`);
    } 
    // Fall back to Vision API logic if no good database matches
    else {
      // Original Vision API logic for dish identification
      if (webLabels && webLabels.length > 0) {
        dishName = webLabels[0].label.replace(/\bfood\b/i, '')
                                .replace(/\brecipe\b/i, '')
                                .replace(/\bdish\b/i, '')
                                .replace(/\bmeal\b/i, '')
                                .trim();
        confidence = 0.7;
        
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
      // Check text annotations if no web labels
      else if (textAnnotations.length > 1) {
        const textLines = textAnnotations[0].description.split('\n');
        const potentialDishNames = textLines.filter(line => 
          line.length > 3 && 
          !line.match(/^(menu|price|restaurant|cafe|ingredients|nutrition|calories)$/i) &&
          line.length < 40
        );
        
        if (potentialDishNames.length > 0) {
          dishName = potentialDishNames[0];
          confidence = 0.7;
          
          for (let i = 1; i < Math.min(potentialDishNames.length, 4); i++) {
            alternatives.push(potentialDishNames[i]);
          }
        }
      }
      // Use top label as a last resort
      else if (labels.length > 0) {
        const foodRelatedLabels = labels.filter((label: any) => 
          !label.description.match(/^(food|recipe|dish|meal|cuisine|restaurant)$/i) &&
          label.score >= 0.6
        );
        
        if (foodRelatedLabels.length > 0) {
          dishName = foodRelatedLabels[0].description;
          confidence = foodRelatedLabels[0].score;
          
          for (let i = 1; i < Math.min(foodRelatedLabels.length, 4); i++) {
            alternatives.push(foodRelatedLabels[i].description);
          }
        }
      }
      
      // Try to identify cuisine from labels or database
      const cuisineMatches = allPossibleTerms.filter(term => {
        return [
          'Italian', 'French', 'Chinese', 'Japanese', 'Indian', 'Thai', 
          'Mexican', 'Greek', 'Spanish', 'Lebanese', 'Turkish', 'Korean', 
          'Vietnamese', 'American', 'British', 'German', 'Brazilian', 
          'Peruvian', 'Moroccan', 'Ethiopian', 'Russian', 'Caribbean'
        ].some(c => term.includes(c.toLowerCase()));
      });
      
      if (cuisineMatches.length > 0) {
        // Extract the cuisine name from the matched term
        const cuisineTerm = cuisineMatches[0];
        const availableCuisines = [
          'Italian', 'French', 'Chinese', 'Japanese', 'Indian', 'Thai', 
          'Mexican', 'Greek', 'Spanish', 'Lebanese', 'Turkish', 'Korean', 
          'Vietnamese', 'American', 'British', 'German', 'Brazilian', 
          'Peruvian', 'Moroccan', 'Ethiopian', 'Russian', 'Caribbean'
        ];
        
        for (const c of availableCuisines) {
          if (cuisineTerm.includes(c.toLowerCase())) {
            cuisine = c;
            break;
          }
        }
      }
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
    
    // Default cuisine if none was identified
    if (!cuisine) {
      cuisine = "International";
    }
    
    console.log("Final result:", { dishName, cuisine, confidence, alternatives });
    
    // Return the results
    return new Response(
      JSON.stringify({
        dishName,
        cuisine,
        confidence,
        alternatives,
        databaseMatch: scoredDishes.length > 0 && scoredDishes[0].score >= 10,
        matchScore: scoredDishes.length > 0 ? scoredDishes[0].score : 0,
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
