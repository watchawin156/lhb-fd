import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function calculateGrade(score: number): string {
  if (score >= 80) return "4";
  if (score >= 75) return "3.5";
  if (score >= 70) return "3";
  if (score >= 65) return "2.5";
  if (score >= 60) return "2";
  if (score >= 55) return "1.5";
  if (score >= 50) return "1";
  return "0";
}

export function getGradeColor(grade: string): string {
  switch (grade) {
    case "4": return "text-emerald-600 font-bold";
    case "3.5":
    case "3": return "text-blue-600 font-semibold";
    case "2.5":
    case "2": return "text-amber-600";
    case "1.5":
    case "1": return "text-orange-600";
    case "0": return "text-red-600 font-bold";
    default: return "text-slate-600";
  }
}
