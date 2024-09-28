import express from "express";
import { validate } from "../middleware/validate";
import { RestaurantSchema, Restaurent } from "../schemas/restaurant";

const router = express.Router();

router.get("/", (req, res) => {
  res.status(200).json({
    message: "Success",
  });
});

router.post("/", validate(RestaurantSchema), async (req, res) => {
  const data = req.body as Restaurent;

  res.status(200).json({
    message: "Success",
  });
});

export default router;
