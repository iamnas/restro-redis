import express, { type Request } from "express";
import { validate } from "../middleware/validate";
import {
  RestaurantSchema,
  Restaurent,
  RestaurentDetails,
} from "../schemas/restaurant";
import { initilizeRedisClient } from "../utils/client";
import { nanoid } from "nanoid";
import {
  cuisineKey,
  cuisinesKey,
  restaurantCuisinesKeyById,
  restaurantDetailsKeyById,
  restaurantKeyById,
  restaurantsByRatingKey,
  reviewDetailsKeysById,
  reviewKeyById,
  weatherKeyById,
} from "../utils/keys";
import { errorResponse, successResponse } from "../utils/responses";
import { checkRestaurantExists } from "../middleware/checkRestaurantId";
import { Review, ReviewSchema } from "../schemas/review";

const router = express.Router();

router.get("/", async (req: Request<{ id: string }>, res, next) => {
  const { page = 1, limit = 10 } = req.query;

  const start = (Number(page) - 1) * Number(limit);
  const end = start + Number(limit) - 1;

  try {
    const client = await initilizeRedisClient();
    const restIds = await client.zRange(restaurantsByRatingKey, start, end, {
      REV: true,
    });
    const rests = await Promise.all(
      restIds.map((id) => client.hGetAll(restaurantKeyById(id)))
    );
    successResponse(res, rests);
  } catch (error) {
    next(error);
  }
});

router.post("/", validate(RestaurantSchema), async (req, res, next) => {
  const data = req.body as Restaurent;
  try {
    const client = await initilizeRedisClient();

    const id = nanoid();
    const restaurantKey = restaurantKeyById(id);
    const hashData = { id, name: data.name, location: data.location };
    const addResult = await Promise.all([
      ...data.cuisines.map((c) =>
        Promise.all([
          client.sAdd(cuisinesKey, c),
          client.sAdd(cuisineKey(c), id),
          client.sAdd(restaurantCuisinesKeyById(id), c),
        ])
      ),
      client.hSet(restaurantKey, hashData),
      client.zAdd(restaurantsByRatingKey, {
        score: 0,
        value: id,
      }),
    ]);
    console.log(`Added ${addResult} fields`);

    successResponse(res, hashData, "Added new restaurant");
  } catch (error) {
    next(error);
  }
});

router.post(
  "/:restaurantId/details",
  checkRestaurantExists,
  validate(RestaurantSchema),
  async (req: Request<{ restaurantId: string }>, res, next) => {
    const { restaurantId } = req.params;
    const data = req.body as RestaurentDetails;

    try {
      const client = await initilizeRedisClient();
      const restaurantDetailsKey = restaurantDetailsKeyById(restaurantId);
      await client.json.set(restaurantDetailsKey, ".", data);
      successResponse(res, {}, "Restaurant Details added");
      // return ;
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  "/:restaurantId/details",
  checkRestaurantExists,
  async (req: Request<{ restaurantId: string }>, res, next) => {
    const { restaurantId } = req.params;
    const data = req.body as RestaurentDetails;

    try {
      const client = await initilizeRedisClient();
      const restaurantDetailsKey = restaurantDetailsKeyById(restaurantId);
      const details = await client.json.get(restaurantDetailsKey);
      successResponse(res, details);
      // return ;
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  "/:id/weather",
  checkRestaurantExists,
  async (req: Request<{ id: string }>, res, next) => {
    const { id } = req.params;

    try {
      const client = await initilizeRedisClient();
      const weatherKey = weatherKeyById(id);
      const cachedWeather = await client.get(weatherKey);
      if (cachedWeather) {
        console.log("Cache Hit");
        successResponse(res, JSON.parse(cachedWeather));
      }
      const restaurantKey = restaurantKeyById(id);
      const coords = await client.hGet(restaurantKey, "location");
      if (!coords) {
        errorResponse(res, 404, "Coordinates not found");
        return;
      }
      const [lng, lat] = coords.split(",");
      const apiResponse = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?units=imperial&lat=${lat}&lon=${lng}&appid=${process.env.WEATHER_API_KEY}`
      );
      if (apiResponse.status === 200) {
        const json = await apiResponse.json();
        await client.set(weatherKey, JSON.stringify(json), {
          EX: 60 * 60,
        });
        successResponse(res, json);
        return;
      }
      errorResponse(res, 500, "Couldnt fetch weather info");
      return;
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  "/:id/reviews",
  checkRestaurantExists,
  validate(ReviewSchema),
  async (req: Request<{ id: string }>, res, next) => {
    const { id } = req.params;
    const data = req.body as Review;

    try {
      const client = await initilizeRedisClient();
      const reviewId = nanoid();
      const reviewKey = reviewKeyById(id);
      const reviewDetailsKeys = reviewDetailsKeysById(reviewId);
      const restaurantKey = restaurantKeyById(id);

      const reviewData = {
        id: reviewId,
        ...data,
        timeStamp: Date.now(),
        restaurantId: id,
      };

      const [reviewCount, setResult, totalStarts] = await Promise.all([
        client.lPush(reviewKey, reviewId),
        client.hSet(reviewDetailsKeys, reviewData),
        client.hIncrByFloat(restaurantKey, "totalStarts", data.rating),
      ]);

      const averageRating = Number((totalStarts / reviewCount).toFixed(1));

      await Promise.all([
        client.zAdd(restaurantsByRatingKey, {
          score: averageRating,
          value: id,
        }),
        client.hSet(restaurantKey, "avgStars", averageRating),
      ]);
      successResponse(res, reviewData, "Review Added");
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  "/:id/reviews",
  checkRestaurantExists,
  async (req: Request<{ id: string }>, res, next) => {
    const id = req.params.id;
    const { page = 1, limit = 10 } = req.query;

    const start = (Number(page) - 1) * Number(limit);
    const end = start + Number(limit) - 1;

    try {
      const client = await initilizeRedisClient();
      const reviewKey = reviewKeyById(id);
      const reviewIds = await client.lRange(reviewKey, start, end);
      const reviews = await Promise.all(
        reviewIds.map((id) => client.hGetAll(reviewDetailsKeysById(id)))
      );
      successResponse(res, reviews);
    } catch (error) {
      next(error);
    }
  }
);

router.delete(
  "/:id/reviews/:reviewId",
  checkRestaurantExists,
  async (req: Request<{ id: string; reviewId: string }>, res, next) => {
    const { id, reviewId } = req.params;

    try {
      const client = await initilizeRedisClient();
      const reviewKey = reviewKeyById(id);
      const reviewDetailsKeys = reviewDetailsKeysById(reviewId);
      const [removeResult, deleteResult] = await Promise.all([
        client.lRem(reviewKey, 0, reviewId),
        client.del(reviewDetailsKeys),
      ]);

      if (removeResult === 0 && deleteResult === 0) {
        errorResponse(res, 404, "Review not found");
        return;
      }
      successResponse(res, reviewId, "Review Deleted");
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  "/:id",
  checkRestaurantExists,
  async (req: Request<{ id: string }>, res, next) => {
    const id = req.params.id;

    try {
      const client = await initilizeRedisClient();
      const restaurantKey = restaurantKeyById(id);
      const [viewCount, restaurant, cuisines] = await Promise.all([
        client.hIncrBy(restaurantKey, "viewCount", 1),
        client.hGetAll(restaurantKey),
        client.sMembers(restaurantCuisinesKeyById(id)),
      ]);
      successResponse(res, { ...restaurant, cuisines });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
