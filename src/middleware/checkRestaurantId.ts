import type { Request,Response,NextFunction } from "express";
import { initilizeRedisClient } from "../utils/client";
import { restaurantKeyById } from "../utils/keys";
import { errorResponse } from "../utils/responses";

export const checkRestaurantExists = async (req: Request, res: Response,next: NextFunction) => {
    const {id} = req.params;

    if(!id){
        errorResponse(res, 404,"Restaurant Id not found");
        return;
    }

    const client = await initilizeRedisClient();
    const restaurantKey = restaurantKeyById(id);
    const exist = await client.exists(restaurantKey);
    if (!exist) {
        errorResponse(res, 404,"Restaurant not found");
        return;
    }

    next();
}