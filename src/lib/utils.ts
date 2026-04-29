import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}


export function generateAccountId(): string {
   const number = Math.floor(100000 + Math.random() * 900000);
  return `ACC-${number}`;
}


export function formatDate(date: Date | string): string {
  const d = new Date(date);
  const day   = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year  = d.getFullYear();
  return `${day}/${month}/${year}`;  // always DD/MM/YYYY — same on server and client
}