import { describe, expect, it } from "vitest";
import { inferCategory, inferNecessity } from "@/lib/categorize";

describe("inferCategory", () => {
  it.each([
    ["Yellow Onion", "produce"],
    ["Jasmine Rice", "pantry"],
    ["Soy Sauce", "pantry"],
    ["Doritos Nacho", "junk_food"],
    ["Dish Soap", "household"],
    ["Eggs", "protein"],
    ["Whole Milk", "dairy"],
    ["Sake", "beverage"]
  ])("puts %s in %s", (name, category) => {
    expect(inferCategory(name)).toBe(category);
  });

  it("is case-insensitive", () => {
    expect(inferCategory("MILK")).toBe("dairy");
  });

  it("falls back to other", () => {
    expect(inferCategory("Mystery Item")).toBe("other");
  });

  // Matching is by substring, so these currently misclassify ("steak" contains "tea",
  // "eggplant" contains "egg"). Un-todo them when matching moves to whole words.
  it.todo("does not label steak as a beverage");
  it.todo("does not label eggplant as protein");
});

describe("inferNecessity", () => {
  it("marks staples as necessary", () => {
    expect(inferNecessity("Whole Milk")).toBe("necessary");
    expect(inferNecessity("Jasmine Rice")).toBe("necessary");
  });

  it("marks snacks as non-necessary", () => {
    expect(inferNecessity("Doritos Nacho")).toBe("non_necessary");
    expect(inferNecessity("Cookies")).toBe("non_necessary");
  });

  it("is unknown otherwise", () => {
    expect(inferNecessity("Sake")).toBe("unknown");
  });
});
