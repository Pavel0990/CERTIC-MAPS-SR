import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  return `${(meters / 1000).toFixed(1)} km`;
}

export function formatDifficulty(difficulty: string): { label: string; color: string } {
  switch (difficulty) {
    case "EASY":
      return { label: "Fácil", color: "text-territory-nature bg-emerald-50 border-emerald-200" };
    case "MEDIUM":
    case "MODERATE":
      return { label: "Media", color: "text-territory-mission bg-amber-50 border-amber-200" };
    case "HARD":
      return { label: "Difícil", color: "text-orange-600 bg-orange-50 border-orange-200" };
    case "SPECIAL":
    case "EXPERT":
      return { label: "Especial", color: "text-purple-600 bg-purple-50 border-purple-200" };
    default:
      return { label: difficulty, color: "text-gray-600 bg-gray-50 border-gray-200" };
  }
}
