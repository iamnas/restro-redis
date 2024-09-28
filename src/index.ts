import express from 'express';
import restaurantsRouter from "./routes/restaurants";
import cuisinesRouter from "./routes/cuisines"
import { errorHandler } from './middleware/errorHandler';


const PORT = process.env.PORT || 3000;
const app = express();
app.use(express.json());


app.use("/api/v1/restaurants",restaurantsRouter);
app.use("/api/v1/cuisines",cuisinesRouter);



app.use(errorHandler);
app
  .listen(PORT, () => {
    console.log(`Application listening on ${PORT}`);
  })
  .on("error", (err) => {
    throw new Error(err.message);
  });
