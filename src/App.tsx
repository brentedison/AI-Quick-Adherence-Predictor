import React, { useState } from 'react';
import { Brain, Pill as Pills, AlertCircle, CheckCircle2, Eye, EyeOff, Key } from 'lucide-react';
import { ChatOpenAI } from "@langchain/openai";
import { PromptTemplate } from "@langchain/core/prompts";

interface PredictionFactors {
  medications: string;
  history: string;
  barriers: string[];
}

function App() {
  const [factors, setFactors] = useState<PredictionFactors>({
    medications: '1-2',
    history: 'good',
    barriers: []
  });

  const [prediction, setPrediction] = useState<{
    score: number;
    aiScore: number;
    risk: string;
    recommendations: string[];
  } | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [apiKeyError, setApiKeyError] = useState('');

  const barriers = [
    'Cost concerns',
    'Memory issues',
    'Transportation',
    'Complex schedule'
  ];

  const getAIValidation = async (clinicalScore: number, factors: PredictionFactors) => {
    if (!apiKey) {
      return clinicalScore; // Return clinical score if no API key
    }

    try {
      const chat = new ChatOpenAI({
        modelName: "gpt-3.5-turbo",
        temperature: 0.3,
        openAIApiKey: apiKey
      });

      const prompt = PromptTemplate.fromTemplate(`
        As a medication adherence expert, validate this adherence risk assessment:
        - Number of medications: {medications}
        - Adherence history: {history}
        - Barriers: {barriers}
        - Clinical risk score: {score}

        Based on these factors, provide a single number between 0-100 representing your assessment of the patient's likelihood to adhere to medications. Higher numbers indicate better adherence.
        
        Return only the number, no other text.
      `);

      const chain = prompt.pipe(chat);
      const response = await chain.invoke({
        medications: factors.medications,
        history: factors.history,
        barriers: factors.barriers.join(", ") || "none",
        score: clinicalScore
      });

      setApiKeyError(''); // Clear any previous errors
      const aiScore = parseInt(response.content.match(/\d+/)[0]);
      return Math.min(100, Math.max(0, aiScore)); // Ensure between 0-100
    } catch (error) {
      console.error("Error with AI validation:", error);
      setApiKeyError('Invalid API key or API error. Please check your OpenAI API key.');
      return clinicalScore; // Fallback to clinical score
    }
  };

  const calculateRisk = async () => {
    setIsLoading(true);
    let score = 100;
    
    // Number of medications (highest impact)
    if (factors.medications === '6+') score -= 30;
    else if (factors.medications === '3-5') score -= 15;
    
    // Adherence history (second highest impact)
    if (factors.history === 'poor') score -= 30;
    else if (factors.history === 'fair') score -= 15;
    
    // Barriers (each barrier has significant impact)
    score -= factors.barriers.length * 10;
    
    // Ensure score stays within 0-100 range
    score = Math.max(0, Math.min(100, score));
    
    // Get AI validation
    const aiScore = await getAIValidation(score, factors);
    
    const risk = score < 60 ? 'High' : score < 80 ? 'Medium' : 'Low';
    
    setPrediction({
      score,
      aiScore,
      risk,
      recommendations: generateRecommendations(factors, risk)
    });
    setIsLoading(false);
  };

  const generateRecommendations = (factors: PredictionFactors, risk: string) => {
    const recs: string[] = [];
    
    if (factors.barriers.includes('Cost concerns')) {
      recs.push('Consider medication assistance programs');
    }
    if (factors.barriers.includes('Memory issues')) {
      recs.push('Set up medication reminders');
    }
    if (factors.barriers.includes('Transportation')) {
      recs.push('Arrange medication delivery service');
    }
    if (factors.barriers.includes('Complex schedule')) {
      recs.push('Simplify medication schedule');
    }
    if (risk === 'High') {
      recs.push('Schedule follow-up within 2 weeks');
    }

    return recs;
  };

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      const barrier = barriers[index];
      const isSelected = factors.barriers.includes(barrier);
      setFactors({
        ...factors,
        barriers: isSelected
          ? factors.barriers.filter(b => b !== barrier)
          : [...factors.barriers, barrier]
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-4">
          <div className="flex items-center gap-2 mb-4">
            <Pills className="w-6 h-6 text-indigo-600" />
            <h1 className="text-xl font-bold text-gray-800">
              Quick Adherence Check
            </h1>
          </div>

          <div className="space-y-4">
            {/* API Key Input */}
            <div className="relative">
              <label htmlFor="apiKey" className="block text-sm font-medium text-gray-700 mb-1">
                OpenAI API Key (optional)
              </label>
              <div className="relative">
                <input
                  id="apiKey"
                  type={showApiKey ? "text" : "password"}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Enter OpenAI API key for AI validation"
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-500"
                >
                  {showApiKey ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {apiKeyError && (
                <p className="mt-1 text-sm text-red-600">{apiKeyError}</p>
              )}
              {!apiKey && (
                <p className="mt-1 text-sm text-gray-500">
                  Without an API key, only clinical scoring will be used
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="medications" className="block text-sm font-medium text-gray-700 mb-1">
                  Number of Medications
                </label>
                <select
                  id="medications"
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  value={factors.medications}
                  onChange={(e) => setFactors({...factors, medications: e.target.value})}
                >
                  <option value="1-2">1-2 medications</option>
                  <option value="3-5">3-5 medications</option>
                  <option value="6+">6+ medications</option>
                </select>
              </div>

              <div>
                <label htmlFor="history" className="block text-sm font-medium text-gray-700 mb-1">
                  Previous Adherence History
                </label>
                <select
                  id="history"
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  value={factors.history}
                  onChange={(e) => setFactors({...factors, history: e.target.value})}
                >
                  <option value="good">Good (≥80% adherent)</option>
                  <option value="fair">Fair (50-79% adherent)</option>
                  <option value="poor">Poor (≤49% adherent)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Identified Barriers (Tab to navigate, Space to select)
              </label>
              <div className="flex flex-wrap gap-2">
                {barriers.map((barrier, index) => (
                  <button
                    key={barrier}
                    tabIndex={0}
                    onClick={() => {
                      const isSelected = factors.barriers.includes(barrier);
                      setFactors({
                        ...factors,
                        barriers: isSelected
                          ? factors.barriers.filter(b => b !== barrier)
                          : [...factors.barriers, barrier]
                      });
                    }}
                    onKeyDown={(e) => handleKeyDown(e, index)}
                    className={`px-3 py-1 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${
                      factors.barriers.includes(barrier)
                        ? 'bg-indigo-100 text-indigo-700 border-2 border-indigo-500'
                        : 'bg-gray-100 text-gray-700 border-2 border-transparent'
                    }`}
                  >
                    {barrier}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={calculateRisk}
              disabled={isLoading}
              className="w-full bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Analyzing...' : 'Check Risk'}
            </button>
          </div>
        </div>

        {prediction && (
          <div className="bg-white rounded-xl shadow-lg p-4 mt-4">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                {prediction.risk === 'High' ? (
                  <AlertCircle className="w-6 h-6 text-red-500" />
                ) : prediction.risk === 'Medium' ? (
                  <AlertCircle className="w-6 h-6 text-yellow-500" />
                ) : (
                  <CheckCircle2 className="w-6 h-6 text-green-500" />
                )}
                <span className={`text-lg font-bold ${
                  prediction.risk === 'High' ? 'text-red-500' :
                  prediction.risk === 'Medium' ? 'text-yellow-500' :
                  'text-green-500'
                }`}>
                  {prediction.risk} Risk
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-gray-600">Clinical Score</div>
                  <div className="text-2xl font-bold text-indigo-600">
                    {prediction.score}%
                  </div>
                </div>
                <div>
                  <div className="text-gray-600">
                    {apiKey ? 'AI Validation' : 'AI Validation (API key required)'}
                  </div>
                  <div className="text-2xl font-bold text-indigo-600">
                    {prediction.aiScore}%
                  </div>
                </div>
              </div>

              {prediction.recommendations.length > 0 && (
                <div>
                  <div className="font-medium text-gray-700">Recommended Actions:</div>
                  <ul className="mt-1 space-y-1">
                    {prediction.recommendations.map((rec, index) => (
                      <li key={index} className="text-sm text-gray-600">
                        • {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;