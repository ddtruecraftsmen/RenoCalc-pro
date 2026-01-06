import { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { 
  Calculator, 
  Hammer, 
  Layers, 
  PaintBucket, 
  Grid3X3, 
  ArrowRight,
  Ruler,
  Info,
  DollarSign,
  Download,
  Share2,
  Loader2,
  Printer
} from "lucide-react";
import blueprintBg from "@assets/generated_images/subtle_architectural_grid_background.png";
import { motion } from "framer-motion";

import { Checkbox } from "@/components/ui/checkbox";

const formSchema = z.object({
  length: z.coerce.number().min(1, "Length must be at least 1 ft"),
  width: z.coerce.number().min(1, "Width must be at least 1 ft"),
  height: z.coerce.number().min(6, "Height must be at least 6 ft").default(8),
  waste: z.coerce.number().min(0, "Waste must be positive").max(100, "Max 100%").default(10),
});

type FormValues = z.infer<typeof formSchema>;

interface CalculationResults {
  perimeter: number;
  wallArea: number;
  floorArea: number;
  studs: number;
  plates: number;
  wallDrywallSheets: number;
  ceilingDrywallSheets: number;
  flooringSqFt: number;
  paintGallons: number;
  insulationRolls: number;
  insulationBatts: number;
  baseboardFeet: number;
}

type MaterialPrice = {
  studs: number;
  plates: number;
  wallDrywallSheets: number;
  ceilingDrywallSheets: number;
  insulationRolls: number;
  insulationBatts: number;
  flooringSqFt: number;
  baseboardFeet: number;
  paintGallons: number;
  primerGallons: number;
};

function HomeCalculatorIcon({ className }: { className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      {/* Square Root */}
      <path d="M7 15l3 3l5 -7h4" />
    </svg>
  )
}

export default function Home() {
  const [results, setResults] = useState<CalculationResults | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [enabledItems, setEnabledItems] = useState<Record<keyof MaterialPrice, boolean>>({
    studs: true,
    plates: true,
    wallDrywallSheets: true,
    ceilingDrywallSheets: true,
    insulationRolls: true,
    insulationBatts: true,
    flooringSqFt: true,
    baseboardFeet: true,
    paintGallons: true,
    primerGallons: true,
  });
  const [prices, setPrices] = useState<MaterialPrice>({
    studs: 4.50,
    plates: 6.00, // Estimated 2x4x10
    wallDrywallSheets: 13.00,
    ceilingDrywallSheets: 13.00,
    insulationRolls: 25.00, // Est R13 Roll
    insulationBatts: 55.00, // Est R13 Bag
    flooringSqFt: 3.50, // Mid-range laminate/vinyl per sq ft
    baseboardFeet: 1.50, // Primed MDF/Pine per ft
    paintGallons: 45.00,
    primerGallons: 30.00,
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      length: 20,
      width: 15,
      height: 8,
      waste: 10,
    },
  });

  function calculate(values: FormValues) {
    setIsCalculating(true);
    setResults(null);
    // Reset enabled items to true on new calculation? Or keep user preference?
    // Let's keep preference if keys match, but maybe safer to reset to ensure they see everything first.
    // Actually, let's reset to true so they don't miss new items.
    setEnabledItems({
      studs: true,
      plates: true,
      wallDrywallSheets: true,
      ceilingDrywallSheets: true,
      insulationRolls: true,
      insulationBatts: true,
      flooringSqFt: true,
      baseboardFeet: true,
      paintGallons: true,
      primerGallons: true,
    });

    // Simulate "crunching numbers" delay for polish
    setTimeout(() => {
      const wasteFactor = 1 + (values.waste / 100);
      
      const perimeter = (values.length + values.width) * 2;
      const wallArea = perimeter * values.height;
      const floorArea = values.length * values.width;

      // Framing: 16" OC spacing (1.33 ft) + corners. 
      // Note: Using perimeter for studs, not area. 
      // Waste factor for studs is usually lower (cuts are reusable), so we use half the general waste factor.
      const baseStuds = (perimeter / 1.333) + 4;
      const studWasteFactor = 1 + ((values.waste / 100) / 2);
      const studCount = Math.ceil(baseStuds * studWasteFactor);

      // Plates: 3 rows (2 top, 1 bottom)
      const plateLinearFeet = perimeter * 3;
      const plateCount = Math.ceil((plateLinearFeet / 10) * wasteFactor); // 10ft boards

      // Drywall: 4x8 sheets (32 sq ft)
      const wallDrywallSheets = Math.ceil((wallArea / 32) * wasteFactor);
      const ceilingDrywallSheets = Math.ceil((floorArea / 32) * wasteFactor);

      // Flooring: Sq Ft + waste
      const flooringSqFt = Math.ceil(floorArea * wasteFactor);

      // Paint: 350 sq ft per gallon (1 coat). 
      // Paint waste is low, using 1/4 of general waste factor
      const paintWasteFactor = 1 + ((values.waste / 100) / 4);
      const paintGallons = Math.ceil((wallArea / 350) * 2 * paintWasteFactor); // 2 coats + small waste 

      // Insulation
      const insulationRolls = Math.ceil((wallArea / 40) * wasteFactor);
      const insulationBatts = Math.ceil((wallArea / 40) * wasteFactor);

      // Baseboard: Perimeter + waste
      const baseboardFeet = Math.ceil(perimeter * wasteFactor);

      setResults({
        perimeter,
        wallArea,
        floorArea,
        studs: studCount,
        plates: plateCount,
        wallDrywallSheets,
        ceilingDrywallSheets,
        flooringSqFt,
        paintGallons,
        insulationRolls,
        insulationBatts,
        baseboardFeet
      });
      setIsCalculating(false);
    }, 600);
  }

  const updatePrice = (key: keyof MaterialPrice, value: string) => {
    const numValue = parseFloat(value) || 0;
    setPrices(prev => ({ ...prev, [key]: numValue }));
  };

  const toggleItem = (key: keyof MaterialPrice) => {
    setEnabledItems(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const totalCost = useMemo(() => {
    if (!results) return 0;
    let total = 0;
    
    if (enabledItems.studs) total += results.studs * prices.studs;
    if (enabledItems.plates) total += results.plates * prices.plates;
    if (enabledItems.wallDrywallSheets) total += results.wallDrywallSheets * prices.wallDrywallSheets;
    if (enabledItems.ceilingDrywallSheets) total += results.ceilingDrywallSheets * prices.ceilingDrywallSheets;
    if (enabledItems.insulationRolls) total += results.insulationRolls * prices.insulationRolls;
    if (enabledItems.insulationBatts) total += results.insulationBatts * prices.insulationBatts;
    if (enabledItems.flooringSqFt) total += results.flooringSqFt * prices.flooringSqFt;
    if (enabledItems.baseboardFeet) total += results.baseboardFeet * prices.baseboardFeet;
    if (enabledItems.paintGallons) total += results.paintGallons * prices.paintGallons;
    if (enabledItems.primerGallons) total += Math.ceil(results.paintGallons / 2) * prices.primerGallons;

    return total;
  }, [results, prices, enabledItems]);

  const handlePrint = () => {
    window.print();
  };

  const shareResults = async () => {
    if (!results) return;
    
    const text = `RenoCalc Pro: ${results.studs} studs + full list for ${form.getValues().length}x${form.getValues().width} basement = ~$${Math.round(totalCost)}. Free tool from D&D True Craftsmen!`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'RenoCalc Pro Results',
          text: text,
          url: window.location.href,
        });
      } catch (err) {
        console.error('Share failed:', err);
      }
    } else {
      navigator.clipboard.writeText(text + ' ' + window.location.href)
        .then(() => alert('Link copied—fire it off!'));
    }
  };

  const downloadCSV = () => {
    if (!results) return;

    const primerGallons = Math.ceil(results.paintGallons / 2);

    const data = [
      ["Material", "Quantity", "Unit", "Unit Price", "Total Cost", "Included"],
      ["2x4 Studs (8ft)", results.studs, "pcs", prices.studs, results.studs * prices.studs, enabledItems.studs ? "Yes" : "No"],
      ["2x4 Plates (10ft)", results.plates, "pcs", prices.plates, results.plates * prices.plates, enabledItems.plates ? "Yes" : "No"],
      ["4x8 Drywall Sheets (Walls)", results.wallDrywallSheets, "sheets", prices.wallDrywallSheets, results.wallDrywallSheets * prices.wallDrywallSheets, enabledItems.wallDrywallSheets ? "Yes" : "No"],
      ["4x8 Drywall Sheets (Ceiling)", results.ceilingDrywallSheets, "sheets", prices.ceilingDrywallSheets, results.ceilingDrywallSheets * prices.ceilingDrywallSheets, enabledItems.ceilingDrywallSheets ? "Yes" : "No"],
      ["Insulation (Rolls)", results.insulationRolls, "rolls", prices.insulationRolls, results.insulationRolls * prices.insulationRolls, enabledItems.insulationRolls ? "Yes" : "No"],
      ["Insulation (Batts)", results.insulationBatts, "bags", prices.insulationBatts, results.insulationBatts * prices.insulationBatts, enabledItems.insulationBatts ? "Yes" : "No"],
      ["Flooring", results.flooringSqFt, "sq ft", prices.flooringSqFt, results.flooringSqFt * prices.flooringSqFt, enabledItems.flooringSqFt ? "Yes" : "No"],
      ["Baseboard", results.baseboardFeet, "ft", prices.baseboardFeet, results.baseboardFeet * prices.baseboardFeet, enabledItems.baseboardFeet ? "Yes" : "No"],
      ["Paint (2 coats)", results.paintGallons, "gallons", prices.paintGallons, results.paintGallons * prices.paintGallons, enabledItems.paintGallons ? "Yes" : "No"],
      ["Primer", primerGallons, "gallons", prices.primerGallons, primerGallons * prices.primerGallons, enabledItems.primerGallons ? "Yes" : "No"],
      ["", "", "", "TOTAL ESTIMATE", totalCost, ""]
    ];

    const csvContent = "data:text/csv;charset=utf-8," 
      + data.map(e => e.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "renovation_estimate.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-background font-sans text-foreground relative overflow-hidden flex flex-col">
      {/* Background Pattern - Removed for cleaner look */}
      <div className="absolute inset-0 bg-background z-0" />
      
      {/* Header */}
      <header className="relative z-10 border-b bg-card shadow-sm sticky top-0 no-print">
        <div className="container mx-auto px-4 py-6 flex items-center justify-between">
          <div className="flex flex-col items-center mx-auto sm:mx-0 sm:items-start sm:flex-row sm:gap-4">
            <div className="bg-primary p-2 rounded-md mb-2 sm:mb-0">
              <HomeCalculatorIcon className="h-6 w-6 text-primary-foreground" />
            </div>
            <div className="text-center sm:text-left">
              <h1 className="text-2xl font-bold tracking-tight text-primary">RenoCalc Pro</h1>
              <p className="text-xs text-muted-foreground tracking-wider uppercase">Basement Renovation Material Estimator</p>
            </div>
          </div>
          <div className="hidden sm:block text-right">
             <div className="text-xs text-muted-foreground font-mono">V1.0.0</div>
          </div>
        </div>
      </header>

      <main className="relative z-10 container mx-auto px-4 py-8 md:py-12 flex-grow">
        <div className="grid lg:grid-cols-12 gap-8 items-start">
          
          {/* Input Section */}
          <div className="lg:col-span-4 space-y-6 no-print">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Card className="border shadow-md">
                <CardHeader className="bg-muted/30 border-b pb-4">
                  <CardTitle className="flex items-center gap-2 text-lg text-primary">
                    <Ruler className="h-5 w-5" />
                    Room Dimensions
                  </CardTitle>
                  <CardDescription>Enter the finished measurements of your basement room.</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(calculate)} className="space-y-6">
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="length"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-bold text-foreground">Length (ft)</FormLabel>
                              <FormControl>
                                <Input type="number" {...field} className="text-lg bg-background" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="width"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-bold text-foreground">Width (ft)</FormLabel>
                              <FormControl>
                                <Input type="number" {...field} className="text-lg bg-background" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="height"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-bold text-foreground">Height (ft)</FormLabel>
                              <FormControl>
                                <Input type="number" step="0.5" {...field} className="text-lg bg-background" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="waste"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-bold text-foreground">Waste Factor (%)</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Input type="number" {...field} className="text-lg bg-background pr-8" />
                                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <Button type="submit" size="lg" className="w-full font-bold text-md h-12 shadow-sm hover:shadow-md transition-all" disabled={isCalculating}>
                        {isCalculating ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Calculating...
                          </>
                        ) : (
                          <>
                            Calculate Materials
                          </>
                        )}
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="bg-card border p-4 text-sm text-muted-foreground"
            >
              <h4 className="font-bold text-foreground mb-2 flex items-center gap-2">
                <Info className="h-4 w-4" /> Estimation Logic
              </h4>
              <ul className="list-disc pl-4 space-y-1 text-xs mb-4">
                <li>Studs calculated at 16" on-center + corners.</li>
                <li>Drywall & Flooring include waste factor.</li>
                <li>Paint assumes 2 coats on fresh drywall.</li>
              </ul>
              
              <div className="bg-primary/10 border-l-4 border-primary p-3 rounded-r text-xs">
                <span className="font-bold text-primary block mb-1">Pro Tip:</span>
                This covers walls & floors only—add 10-15% extra for doors/windows/cuts. Built by <a href="https://www.ddtruecraftsmen.com" target="_blank" rel="noopener noreferrer" className="font-semibold underline decoration-primary/50 hover:decoration-primary transition-colors">D&D True Craftsmen</a> (15+ years in basements).
              </div>
            </motion.div>
          </div>

          {/* Results Section */}
          <div className="lg:col-span-8">
            {isCalculating ? (
               <div className="h-full min-h-[400px] flex flex-col items-center justify-center text-center p-12">
                 <Loader2 className="h-12 w-12 text-primary animate-spin mb-4" />
                 <h3 className="text-xl font-bold">Crunching numbers...</h3>
                 <p className="text-muted-foreground">Generating your material list</p>
               </div>
            ) : results ? (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4 }}
                className="space-y-6"
              >
                {/* Stats Bar */}
                <div className="grid grid-cols-3 gap-4 mb-8">
                  <div className="bg-card border p-4 flex flex-col items-center justify-center text-center shadow-sm">
                    <span className="text-xs text-muted-foreground uppercase font-mono mb-1">Total Perimeter</span>
                    <span className="text-2xl font-bold font-mono">{results.perimeter} <span className="text-sm font-normal text-muted-foreground">ft</span></span>
                  </div>
                  <div className="bg-card border p-4 flex flex-col items-center justify-center text-center shadow-sm">
                    <span className="text-xs text-muted-foreground uppercase font-mono mb-1">Wall Area</span>
                    <span className="text-2xl font-bold font-mono">{results.wallArea} <span className="text-sm font-normal text-muted-foreground">sq ft</span></span>
                  </div>
                  <div className="bg-card border p-4 flex flex-col items-center justify-center text-center shadow-sm">
                    <span className="text-xs text-muted-foreground uppercase font-mono mb-1">Floor Area</span>
                    <span className="text-2xl font-bold font-mono">{results.floorArea} <span className="text-sm font-normal text-muted-foreground">sq ft</span></span>
                  </div>
                </div>

                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold tracking-tight text-primary">Material Requirements & Cost</h2>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 px-3 py-1 rounded-full no-print">
                    <DollarSign className="h-4 w-4" />
                    <span>Enter unit prices to calculate total</span>
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  {/* Framing */}
                  <MaterialCard 
                    icon={Hammer}
                    title="Framing Lumber"
                    color="text-primary"
                    items={[
                      { 
                        label: "2x4 Studs (8ft)", 
                        value: results.studs, 
                        unit: "pcs", 
                        priceKey: "studs" 
                      },
                      { 
                        label: "2x4 Plates (10ft)", 
                        value: results.plates, 
                        unit: "pcs", 
                        priceKey: "plates" 
                      },
                    ]}
                    prices={prices}
                    onPriceChange={updatePrice}
                    enabledItems={enabledItems}
                    onToggle={toggleItem}
                  />

                  {/* Drywall */}
                  <MaterialCard 
                    icon={Layers}
                    title="Drywall & Insulation"
                    color="text-primary"
                    items={[
                      { label: "Wall Drywall (4x8)", value: results.wallDrywallSheets, unit: "sheets", priceKey: "wallDrywallSheets" },
                      { label: "Ceiling Drywall (4x8)", value: results.ceilingDrywallSheets, unit: "sheets", priceKey: "ceilingDrywallSheets" },
                      { label: "R13 Insulation Rolls", value: results.insulationRolls, unit: "rolls", priceKey: "insulationRolls" },
                      { label: "R13 Insulation Batts", value: results.insulationBatts, unit: "bags", priceKey: "insulationBatts" },
                    ]}
                    prices={prices}
                    onPriceChange={updatePrice}
                    enabledItems={enabledItems}
                    onToggle={toggleItem}
                  />

                  {/* Flooring */}
                  <MaterialCard 
                    icon={Grid3X3}
                    title="Flooring"
                    color="text-primary"
                    items={[
                      { label: "Total Coverage", value: results.flooringSqFt, unit: "sq ft", priceKey: "flooringSqFt" },
                    ]}
                    prices={prices}
                    onPriceChange={updatePrice}
                    enabledItems={enabledItems}
                    onToggle={toggleItem}
                  />

                  {/* Paint & Finish */}
                  <MaterialCard 
                    icon={PaintBucket}
                    title="Finishing"
                    color="text-primary"
                    items={[
                      { label: "Baseboard Trim", value: results.baseboardFeet, unit: "ft", priceKey: "baseboardFeet" },
                      { label: "Wall Paint (2 coats)", value: results.paintGallons, unit: "gallons", priceKey: "paintGallons" },
                      { label: "Primer (1 coat)", value: Math.ceil(results.paintGallons / 2), unit: "gallons", priceKey: "primerGallons" },
                    ]}
                    prices={prices}
                    onPriceChange={updatePrice}
                    enabledItems={enabledItems}
                    onToggle={toggleItem}
                  />
                </div>

                {/* Total Cost Section */}
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-primary/5 border border-primary/20 rounded-lg p-6 mt-8"
                >
                  <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-bold flex items-center gap-2">
                        <DollarSign className="h-5 w-5 text-primary" />
                        Estimated Project Cost
                      </h3>
                      <p className="text-sm text-muted-foreground">Based on provided unit prices</p>
                    </div>
                    <div className="text-4xl font-mono font-bold text-primary">
                      ${Math.round(totalCost)}
                    </div>
                  </div>
                  
                  <Separator className="my-4 bg-primary/10" />
                  
                  <div className="flex flex-col sm:flex-row gap-3 no-print">
                    <Button 
                      onClick={downloadCSV} 
                      className="flex-1 flex items-center gap-2" 
                      variant="outline"
                    >
                      <Download className="h-4 w-4" />
                      Download CSV
                    </Button>
                    <Button 
                      onClick={handlePrint} 
                      className="flex-1 flex items-center gap-2" 
                      variant="outline"
                    >
                      <Printer className="h-4 w-4" />
                      Print / PDF
                    </Button>
                    <Button 
                      onClick={shareResults} 
                      className="flex-1 flex items-center gap-2" 
                      variant="outline"
                    >
                      <Share2 className="h-4 w-4" />
                      Share List
                    </Button>
                  </div>
                </motion.div>

              </motion.div>
            ) : (
              <div className="h-full min-h-[400px] flex flex-col items-center justify-center text-center p-12 border-2 border-dashed rounded-lg bg-muted/20">
                <div className="bg-muted p-4 rounded-full mb-4">
                  <Calculator className="h-12 w-12 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-bold mb-2">Ready to Calculate</h3>
                <p className="text-muted-foreground max-w-md">
                  Enter your room dimensions on the left to generate a comprehensive material list for your renovation project.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
      
      <footer className="relative z-10 border-t bg-card/50 py-6 text-center text-sm text-muted-foreground no-print">
        <p>Built by pros for pros. Questions? Hit us up at <a href="https://www.ddtruecraftsmen.com" target="_blank" rel="noopener noreferrer" className="font-semibold text-foreground hover:underline hover:text-primary transition-colors">D&D True Craftsmen</a>.</p>
      </footer>
    </div>
  );
}

function MaterialCard({ icon: Icon, title, color, items, prices, onPriceChange, enabledItems, onToggle }: { 
  icon: any, 
  title: string, 
  color: string, 
  items: { label: string, value: number, unit: string, priceKey: keyof MaterialPrice }[],
  prices: MaterialPrice,
  onPriceChange: (key: keyof MaterialPrice, value: string) => void,
  enabledItems: Record<keyof MaterialPrice, boolean>,
  onToggle: (key: keyof MaterialPrice) => void
}) {
  return (
    <Card className="overflow-hidden transition-all hover:shadow-md border-l-4" style={{ borderLeftColor: 'var(--primary)' }}>
      <CardHeader className="bg-muted/30 pb-3">
        <CardTitle className="flex items-center gap-2 text-md text-primary">
          <Icon className={`h-5 w-5`} />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="space-y-4">
          {items.map((item, i) => (
            <div key={i} className={`space-y-2 border-b border-dashed last:border-0 pb-3 last:pb-0 transition-opacity ${!enabledItems[item.priceKey] ? 'opacity-50 grayscale' : ''}`}>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Checkbox 
                    id={`check-${item.priceKey}`}
                    checked={enabledItems[item.priceKey]}
                    onCheckedChange={() => onToggle(item.priceKey)}
                    className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                  />
                  <label 
                    htmlFor={`check-${item.priceKey}`}
                    className="text-sm text-foreground font-bold cursor-pointer select-none"
                  >
                    {item.label}
                  </label>
                </div>
                <span className="font-mono font-bold text-lg text-primary">
                  {item.value} <span className="text-xs font-normal text-muted-foreground">{item.unit}</span>
                </span>
              </div>
              <div className="flex items-center gap-2 pl-6">
                <div className="relative flex-1">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
                  <Input 
                    type="number" 
                    placeholder="0.00" 
                    className="h-8 pl-5 text-xs font-mono bg-white"
                    min="0"
                    step="0.01"
                    value={prices[item.priceKey] || ''}
                    onChange={(e) => onPriceChange(item.priceKey, e.target.value)}
                    disabled={!enabledItems[item.priceKey]}
                  />
                </div>
                <div className="text-xs font-mono text-muted-foreground w-16 text-right font-bold">
                  {enabledItems[item.priceKey] ? `$${Math.round((prices[item.priceKey] || 0) * item.value)}` : '$0'}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
