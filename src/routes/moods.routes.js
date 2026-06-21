import { Router } from "express";

export function createMoodsRouter(moodService) {
  const router = Router();

  router.post("/", (req, res, next) => {
    try {
      const entry = moodService.createMoodEntry(req.body);
      res.status(201).json({ entry });
    } catch (error) {
      next(error);
    }
  });

  router.get("/", (req, res, next) => {
    try {
      const limit = req.query.limit === undefined
        ? undefined
        : Number(req.query.limit);
      const entries = moodService.listRecentMoodEntries(limit);
      res.status(200).json({ entries });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
