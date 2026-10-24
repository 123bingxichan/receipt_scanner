import { ItemCategory, NecessityLevel } from "@/lib/types";

const CATEGORY_KEYWORDS: Array<{ category: ItemCategory; keywords: string[] }> = [
  { category: "produce", keywords: ["onion", "garlic", "tomato", "lettuce", "spinach", "apple", "banana"] },
  { category: "pantry", keywords: ["rice", "flour", "soy sauce", "oil", "beans", "pasta", "salt", "sugar"] },
  { category: "junk_food", keywords: ["chips", "doritos", "poptart", "candy", "soda", "cookie"] },
  { category: "household", keywords: ["soap", "wipes", "detergent", "toilet paper", "paper towel"] },
  { category: "protein", keywords: ["chicken", "beef", "tofu", "fish", "egg", "eggs"] },
  { category: "dairy", keywords: ["milk", "yogurt", "cheese", "butter"] },
  { category: "beverage", keywords: ["coffee", "tea", "juice", "water", "sake"] }
];

const NECESSARY_KEYWORDS = [
  "milk",
  "egg",
  "eggs",
  "onion",
  "garlic",
  "rice",
  "beans",
  "tomato",
  "lettuce",
  "chicken",
  "tofu",
  "soap",
  "wipes"
];

export function inferCategory(name: string): ItemCategory {
  const normalized = name.toLowerCase();
  const hit = CATEGORY_KEYWORDS.find(({ keywords }) =>
    keywords.some((keyword) => normalized.includes(keyword))
  );
  return hit?.category ?? "other";
}

export function inferNecessity(name: string): NecessityLevel {
  const normalized = name.toLowerCase();
  if (NECESSARY_KEYWORDS.some((keyword) => normalized.includes(keyword))) {
    return "necessary";
  }
  if (["chips", "doritos", "candy", "poptart", "cookie", "soda"].some((keyword) => normalized.includes(keyword))) {
    return "non_necessary";
  }
  return "unknown";
}
