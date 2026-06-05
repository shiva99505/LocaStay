import React, { useState, useEffect } from 'react';
import { Mic, X, Sparkles, Volume2, Search, ArrowRight } from 'lucide-react';

const DIALECTS = [
  { id: 'hi', name: 'Hindi (हिंदी)', sample: 'Panchayat Bhavan ke paas 3500 ke andar kamra chahiye...', query: 'Room near Panchayat Bhavan under ₹3,500' },
  { id: 'bho', name: 'Bhojpuri (भोजपुरी)', sample: 'सरकारी स्कूल के लगे सस्ता मकान चाहीं किराया प...', query: 'Affordable room near Government School' },
  { id: 'mr', name: 'Marathi (मराठी)', sample: 'प्राथमिक आरोग्य केंद्राजवळ भाड्याने खोली पाहिजे...', query: 'Room near Primary Health Center' },
  { id: 'ta', name: 'Tamil (தமிழ்)', sample: 'பள்ளிக்கு அருகில் வாடகைக்கு வீடு வேண்டும்...', query: 'Room near High School' },
  { id: 'bn', name: 'Bengali (বাংলা)', sample: 'বাজারের কাছে ৪০০০ টাকার মধ্যে সুন্দর ঘর চাই...', query: 'Room near local bazaar under ₹4,000' }
];

export default function VoiceSearchModal({ isOpen, onClose, onVoiceSearchResult }) {
  const [activeDialect, setActiveDialect] = useState(DIALECTS[0]);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setIsListening(false);
      setTranscript('');
      setShowResults(false);
    } else {
      startSimulatedListening(DIALECTS[0]);
    }
  }, [isOpen]);

  const startSimulatedListening = (dialect) => {
    setActiveDialect(dialect);
    setIsListening(true);
    setTranscript('');
    setShowResults(false);

    // Simulated Speech-to-Text typewriter effect
    let fullText = `"${dialect.sample}"`;
    let currentText = '';
    let index = 0;

    const timer = setInterval(() => {
      if (index < fullText.length) {
        currentText += fullText[index];
        setTranscript(currentText);
        index++;
      } else {
        clearInterval(timer);
        setIsListening(false);
        setTimeout(() => {
          setShowResults(true);
        }, 800);
      }
    }, 50);

    return () => clearInterval(timer);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-rurban-blue-950/80 backdrop-blur-md">
      <div className="w-full max-w-2xl overflow-hidden bg-white border border-rurban-green-100 rounded-3xl shadow-2xl transition-all animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-rurban-gray-100 bg-rurban-blue-900 text-white">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-rurban-green-500 rounded-xl">
              <Mic className="w-5 h-5 text-white animate-pulse" />
            </div>
            <div>
              <h3 className="font-bold text-lg">AI Local Dialect Voice Search</h3>
              <p className="text-xs text-rurban-green-100">Bolo apni bhaasha mein, pao apna Awas</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 md:p-8 flex flex-col md:flex-row gap-6">
          {/* Left Panel: Dialect Selector */}
          <div className="w-full md:w-2/5 flex flex-col gap-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-rurban-gray-500">
              Select Regional Dialect
            </span>
            <div className="flex flex-col gap-2">
              {DIALECTS.map((dialect) => {
                const isSelected = activeDialect.id === dialect.id;
                return (
                  <button
                    key={dialect.id}
                    onClick={() => startSimulatedListening(dialect)}
                    className={`flex items-center justify-between p-3.5 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'border-rurban-green-500 bg-rurban-green-50/50 text-rurban-blue-900 font-medium shadow-sm'
                        : 'border-rurban-gray-100 hover:border-rurban-green-200 hover:bg-rurban-gray-50 text-rurban-gray-700'
                    }`}
                  >
                    <div className="flex flex-col">
                      <span className="text-sm">{dialect.name}</span>
                    </div>
                    {isSelected && (
                      <span className="w-2 h-2 rounded-full bg-rurban-green-500 animate-ping" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Panel: Listening & Transcription Wave */}
          <div className="flex-1 flex flex-col justify-between p-6 border border-rurban-gray-100 bg-rurban-gray-50 rounded-2xl min-h-[300px]">
            
            {/* Pulsing Mic visualizer */}
            <div className="flex flex-col items-center justify-center flex-1 py-4">
              <div className="relative flex items-center justify-center mb-6">
                {isListening && (
                  <>
                    <div className="absolute w-24 h-24 rounded-full bg-rurban-green-500/20 voice-ripple" />
                    <div className="absolute w-20 h-20 rounded-full bg-rurban-green-500/30 voice-ripple" style={{ animationDelay: '0.6s' }} />
                  </>
                )}
                <div className={`z-10 p-5 rounded-full shadow-lg ${isListening ? 'bg-rurban-green-500 text-white' : 'bg-rurban-blue-900 text-white'}`}>
                  <Mic className={`w-8 h-8 ${isListening ? 'animate-bounce' : ''}`} />
                </div>
              </div>

              {/* Transcription Status */}
              <div className="text-center w-full px-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-rurban-green-600 mb-2">
                  {isListening ? 'Listening & Transcribing...' : 'Speech Synthesized'}
                </p>
                <div className="bg-white/80 backdrop-blur-sm border border-rurban-gray-200 rounded-xl p-4 min-h-[70px] flex items-center justify-center shadow-inner">
                  <p className="text-sm md:text-base font-medium text-rurban-blue-900 italic text-center">
                    {transcript || 'Select a dialect to speak...'}
                  </p>
                </div>
              </div>
            </div>

            {/* Results redirect button */}
            {showResults && (
              <div className="mt-4 p-4 bg-rurban-green-100/50 border border-rurban-green-200 rounded-xl flex items-center justify-between animate-in slide-in-from-bottom-4 duration-300">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-rurban-green-500 rounded-lg text-white">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-rurban-blue-900">Translation Verified</h4>
                    <p className="text-xs text-rurban-gray-600">Mapped to: "{activeDialect.query}"</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    onVoiceSearchResult(activeDialect.query);
                    onClose();
                  }}
                  className="flex items-center gap-1.5 px-3 py-2 bg-rurban-blue-900 hover:bg-rurban-blue-800 text-white text-xs font-bold rounded-lg shadow-sm transition-all"
                >
                  View Listings
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-rurban-gray-50 border-t border-rurban-gray-100 flex items-center justify-between text-xs text-rurban-gray-500">
          <div className="flex items-center gap-2">
            <Volume2 className="w-4 h-4 text-rurban-green-500" />
            <span>AI powered regional speech-to-text modeling (Offline-Ready)</span>
          </div>
          <span className="hidden sm:inline">GramAwas Core AI v1.2</span>
        </div>

      </div>
    </div>
  );
}