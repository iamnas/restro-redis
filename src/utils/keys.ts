// bites:restaurants:data

export function getKeyName(...args: string[]) {
  return `restro:${args.join(":")}`;
}

export const restaurantKeyById = (id: string) => getKeyName("restaurants", id);

export const reviewKeyById = (id: string) => getKeyName("reviews", id);

export const reviewDetailsKeysById = (id: string) =>
  getKeyName("review_details", id);

export const cuisinesKey = getKeyName("cuisines");
export const cuisineKey = (name: string) => getKeyName("cuisines", name);
export const restaurantCuisinesKeyById = (id: string) =>
  getKeyName("restaurant_cuisines", id);
