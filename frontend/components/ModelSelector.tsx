"use client";
/**
 * ModelSelector - Dropdown component for selecting LLM models
 * Displays available Ollama models with current selection indicator
 */

import * as React from "react";
import { useEffect, useState } from "react";
import { ChevronDown, Cpu, Check, AlertCircle, Loader2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { fetchAvailableModels, type ModelInfo } from "@/hooks/useChat";

interface ModelSelectorProps {
  selectedModel: string | null;
  onModelChange: (model: string) => void;
  disabled?: boolean;
}

interface CategorizedModels {
  llm: ModelInfo[];
  vlm: ModelInfo[];
  embedding: ModelInfo[];
}

export function ModelSelector({
  selectedModel,
  onModelChange,
  disabled = false,
}: ModelSelectorProps) {
  const [models, setModels] = useState<CategorizedModels>({ llm: [], vlm: [], embedding: [] });
  const [configuredModel, setConfiguredModel] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'llm' | 'vlm'>('llm');

  useEffect(() => {
    async function loadModels() {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchAvailableModels();
        setModels(data.available);
        setConfiguredModel(data.configured?.llm?.configured || "");

        // If no model selected yet, use the configured default
        if (!selectedModel && data.configured?.llm?.configured) {
          onModelChange(data.configured.llm.configured);
        }
      } catch (err) {
        setError("Failed to load models");
        console.error("Failed to fetch models:", err);
      } finally {
        setLoading(false);
      }
    }
    loadModels();
  }, []);

  // Format model size for display
  const formatSize = (bytes: number): string => {
    if (bytes === 0) return "";
    const gb = bytes / (1024 * 1024 * 1024);
    return `${gb.toFixed(1)}GB`;
  };

  // Get display name (truncate if too long)
  const getDisplayName = (name: string): string => {
    if (name.length > 20) {
      return name.substring(0, 17) + "...";
    }
    return name;
  };

  const currentModel = selectedModel || configuredModel || "Select model";



  const currentModels = activeTab === 'llm' ? models.llm : models.vlm;
  const hasModels = currentModels.length > 0;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          disabled={disabled}
          className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground gap-1 font-normal"
        >
          <Cpu className="h-3 w-3" />
          <span className="max-w-[100px] truncate">{getDisplayName(currentModel)}</span>
          <ChevronDown className="h-3 w-3 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64 max-h-[80vh] overflow-y-auto p-0">
        <div className="flex items-center p-2 gap-2 sticky top-0 bg-popover z-10 border-b">
          <button
            onClick={(e) => {
              e.preventDefault();
              setActiveTab('llm');
            }}
            className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              activeTab === 'llm'
                ? 'bg-accent text-accent-foreground shadow-sm'
                : 'hover:bg-muted text-muted-foreground'
            }`}
          >
            Text Models (LLMs)
          </button>
          <button
            onClick={(e) => {
              e.preventDefault();
              setActiveTab('vlm');
            }}
            className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              activeTab === 'vlm'
                ? 'bg-accent text-accent-foreground shadow-sm'
                : 'hover:bg-muted text-muted-foreground'
            }`}
          >
            Vision Models (VLMs)
          </button>
        </div>

        <div className="p-1">
          {loading ? (
             <div className="flex items-center justify-center py-4 text-muted-foreground gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-xs">Loading models...</span>
             </div>
          ) : error ? (
             <div className="px-2 py-4 text-center text-xs text-destructive">
                {error}
             </div>
          ) : !hasModels ? (
            <div className="px-2 py-4 text-center text-xs text-muted-foreground">
              No {activeTab === 'llm' ? 'text' : 'vision'} models available
            </div>
          ) : null}

          {!loading && !error && hasModels && (
            <DropdownMenuGroup>
              {currentModels.map((model) => (
                <DropdownMenuItem
                  key={model.name}
                  onClick={() => onModelChange(model.name)}
                  className="flex items-center justify-between cursor-pointer"
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="font-medium text-sm">{model.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatSize(model.size)}
                    </span>
                  </div>
                  {(selectedModel === model.name || (!selectedModel && configuredModel === model.name && activeTab === 'llm')) && (
                    <Check className="h-4 w-4 text-primary" />
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
          )}
        </div>

        {configuredModel && (
          <>
            <DropdownMenuSeparator />
            <div className="px-3 py-2 text-xs text-muted-foreground bg-muted/30">
              Default: {configuredModel}
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
