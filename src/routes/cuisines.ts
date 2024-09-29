import express, { type Request } from "express";
import { initilizeRedisClient } from "../utils/client";
import { cuisineKey, cuisinesKey, restaurantKeyById } from "../utils/keys";
import { successResponse } from "../utils/responses";
const router = express.Router();

router.get("/", async (req, res, next) => {
  try {
    const client = await initilizeRedisClient();
    const cuisines = await client.sMembers(cuisinesKey);

    successResponse(res, cuisines);
    return;
  } catch (error) {
    next(error);
  }
});

router.get(
  "/:cuisine",
  async (req: Request<{ cuisine: string }>, res, next) => {
    try {
      const { cuisine } = req.params;

      const client = await initilizeRedisClient();
      const restaurantIds = await client.sMembers(cuisineKey(cuisine));
      const restaurants = await Promise.all(
        restaurantIds.map((id) => client.hGet(restaurantKeyById(id), "name"))
      );
      successResponse(res, restaurants);
      return;
    } catch (error) {
      next(error);
    }
  }
);

export default router;
