
import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ChefHat, ArrowLeft } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-6 py-24 text-center">
      <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center animate-float mb-8">
        <ChefHat className="w-10 h-10 text-primary/80" />
      </div>
      
      <h1 className="text-5xl font-serif font-semibold tracking-tight mb-4 animate-fade-in-down">
        404
      </h1>
      
      <p className="text-xl text-muted-foreground mb-8 max-w-md animate-fade-in">
        Oops! This recipe doesn't exist. Let's find something else to cook.
      </p>
      
      <Link to="/">
        <Button className="gap-2 animate-fade-in">
          <ArrowLeft className="w-4 h-4" />
          Back to Kitchen
        </Button>
      </Link>
    </div>
  );
};

export default NotFound;
