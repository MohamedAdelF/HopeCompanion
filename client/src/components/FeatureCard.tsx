import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, LucideIcon } from "lucide-react";
import { Link } from "wouter";
import { motion } from "framer-motion";

interface FeatureCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  href?: string;
}

export function FeatureCard({ icon: Icon, title, description, href }: FeatureCardProps) {
  return (
    <motion.div
      whileHover={{ y: -8, scale: 1.02 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className="h-full"
    >
      <Card 
        className="h-full shadow-md hover:shadow-2xl transition-all duration-300 border-2 hover:border-primary/30 bg-gradient-to-br from-background via-background to-primary/5 group overflow-hidden" 
        data-testid={`card-feature-${title}`}
      >
        {/* Decorative Gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/0 via-primary/0 to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        
        <CardHeader className="relative z-0 pb-4">
          <motion.div
            className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center mb-4 group-hover:from-primary/30 group-hover:to-primary/20 transition-all duration-300"
            whileHover={{ scale: 1.1, rotate: 5 }}
          >
            <Icon className="h-7 w-7 text-primary group-hover:scale-110 transition-transform duration-300" />
          </motion.div>
          <CardTitle className="text-xl font-bold mb-2 group-hover:text-primary transition-colors">
            {title}
          </CardTitle>
          <CardDescription className="font-body text-base leading-relaxed text-foreground/80">
          {description}
        </CardDescription>
      </CardHeader>
      {href && (
          <CardContent className="relative z-0 pt-0">
            <Link href={href}>
              <motion.div whileHover={{ x: -4 }}>
                <Button 
                  variant="ghost" 
                  className="text-primary p-0 hover:text-primary/80 font-semibold group/btn" 
                  data-testid={`button-feature-${title}`}
                >
            اعرف المزيد
                  <ArrowLeft className="mr-2 h-4 w-4 group-hover/btn:translate-x-[-4px] transition-transform" />
          </Button>
              </motion.div>
            </Link>
        </CardContent>
      )}
        
        {/* Bottom Accent Line */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
    </Card>
    </motion.div>
  );
}
