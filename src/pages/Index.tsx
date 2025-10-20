import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Sparkles, Zap, Rocket, ArrowRight } from "lucide-react";

const Index = () => {
  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Animated Gradient Mesh Background */}
      <div className="fixed inset-0 -z-10" style={{ background: 'var(--gradient-mesh)' }} />
      
      {/* Floating Blobs */}
      <div className="fixed top-20 left-20 w-72 h-72 bg-primary/20 rounded-full blur-3xl animate-float" />
      <div className="fixed bottom-20 right-20 w-96 h-96 bg-secondary/20 rounded-full blur-3xl animate-float-slow" />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-accent/10 rounded-full blur-3xl animate-blob" />

      {/* Main Content */}
      <div className="relative z-10 container mx-auto px-4 py-20">
        {/* Hero Section */}
        <div className="text-center max-w-4xl mx-auto mb-20">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 backdrop-blur-sm border border-primary/20 mb-8 animate-float">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-foreground">Modern Liquid Design</span>
          </div>
          
          <h1 className="text-6xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent leading-tight">
            Welcome to the Future
          </h1>
          
          <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
            Experience the next generation of web design with fluid animations, glassmorphic elements, and stunning visual effects.
          </p>

          <div className="flex gap-4 justify-center flex-wrap">
            <Button 
              size="lg" 
              className="gap-2 group bg-gradient-to-r from-primary to-primary-glow hover:shadow-[0_0_40px_hsl(var(--primary)/0.5)] transition-all duration-300"
            >
              Get Started
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              className="gap-2 backdrop-blur-sm bg-background/50 border-primary/20 hover:bg-primary/10"
            >
              Learn More
            </Button>
          </div>
        </div>

        {/* Feature Cards */}
        <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {[
            {
              icon: Zap,
              title: "Lightning Fast",
              description: "Optimized performance with smooth 60fps animations and instant loading times.",
              gradient: "from-primary to-primary-glow"
            },
            {
              icon: Sparkles,
              title: "Beautiful Design",
              description: "Modern glassmorphic UI with liquid animations and stunning visual effects.",
              gradient: "from-secondary to-secondary-glow"
            },
            {
              icon: Rocket,
              title: "Next Generation",
              description: "Built with cutting-edge technology for the future of web experiences.",
              gradient: "from-accent to-accent-glow"
            }
          ].map((feature, index) => (
            <Card 
              key={index}
              className="p-8 backdrop-blur-xl bg-card/50 border-border/50 hover:border-primary/50 transition-all duration-300 hover:shadow-[0_0_30px_hsl(var(--primary)/0.2)] hover:-translate-y-2 group"
            >
              <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${feature.gradient} p-3 mb-6 group-hover:scale-110 transition-transform duration-300`}>
                <feature.icon className="w-full h-full text-white" />
              </div>
              
              <h3 className="text-xl font-semibold mb-3 text-foreground">
                {feature.title}
              </h3>
              
              <p className="text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
            </Card>
          ))}
        </div>

        {/* CTA Section */}
        <div className="mt-32 max-w-4xl mx-auto">
          <Card className="p-12 backdrop-blur-xl bg-gradient-to-br from-primary/10 via-secondary/10 to-accent/10 border-border/50 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-secondary/20 to-accent/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            
            <div className="relative z-10 text-center">
              <h2 className="text-4xl font-bold mb-4 bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
                Ready to Build Something Amazing?
              </h2>
              
              <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
                Start creating stunning web experiences with modern design principles and cutting-edge technology.
              </p>
              
              <Button 
                size="lg"
                className="gap-2 bg-gradient-to-r from-primary via-secondary to-accent hover:shadow-[0_0_50px_hsl(var(--primary)/0.6)] transition-all duration-300"
              >
                Start Building Now
                <Sparkles className="w-4 h-4" />
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Index;
