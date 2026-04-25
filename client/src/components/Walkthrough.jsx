import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, 
  Link as LinkIcon, 
  Cpu, 
  Smartphone, 
  ChevronRight, 
  X 
} from 'lucide-react';

const steps = [
  {
    title: "Capture anything",
    description: "Paste an Instagram Reel or YouTube link. Sortd will handle the rest.",
    icon: <LinkIcon className="w-8 h-8 text-blue-500" />,
    color: "blue"
  },
  {
    title: "AI Analysis",
    description: "Google Gemini automatically summarizes and categorizes your content into lists.",
    icon: <Cpu className="w-8 h-8 text-purple-500" />,
    color: "purple"
  },
  {
    title: "Install as App",
    description: "Add Sortd to your home screen to use the Share Target feature on mobile.",
    icon: <Smartphone className="w-8 h-8 text-emerald-500" />,
    color: "emerald"
  }
];

export default function Walkthrough({ onComplete }) {
  const [currentStep, setCurrentStep] = useState(0);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-white/60 backdrop-blur-xl"
      />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative w-full max-w-md bg-white border border-black/5 rounded-[40px] neo-shadow overflow-hidden"
      >
        <button 
          onClick={onComplete}
          className="absolute top-6 right-6 p-2 rounded-full bg-[#f5f7f9] text-black/20 hover:text-black transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-10 text-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="flex flex-col items-center"
            >
              <div className="w-16 h-16 rounded-[24px] bg-[#f5f7f9] flex items-center justify-center mb-8">
                {steps[currentStep].icon}
              </div>
              <h2 className="text-[26px] font-black mb-3 tracking-tight text-[#1a1d1f]">
                {steps[currentStep].title}
              </h2>
              <p className="text-black/40 text-[16px] font-medium leading-relaxed mb-10 max-w-[280px]">
                {steps[currentStep].description}
              </p>
            </motion.div>
          </AnimatePresence>

          <div className="flex flex-col gap-3">
            <button
              onClick={handleNext}
              className="w-full py-4 bg-[#33b1ff] text-white font-extrabold rounded-2xl flex items-center justify-center gap-2 transition-all hover:bg-[#1a9fe8] active:scale-95 shadow-lg shadow-blue-500/20"
            >
              {currentStep === steps.length - 1 ? "Get Started" : "Next Step"}
              <ChevronRight className="w-5 h-5" />
            </button>
            
            <button 
              onClick={onComplete}
              className="py-2 text-[13px] font-bold text-black/20 hover:text-black/40 transition-colors"
            >
              Skip
            </button>
          </div>

          {/* Progress indicators */}
          <div className="flex justify-center gap-2 mt-10">
            {steps.map((_, i) => (
              <div 
                key={i}
                className={`h-1 rounded-full transition-all duration-300 ${i === currentStep ? 'w-6 bg-[#33b1ff]' : 'w-2 bg-black/5'}`}
              />
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
