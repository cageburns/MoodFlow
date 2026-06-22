import { Router } from "express";

export function createMoodsRouter(moodService, summaryService) {
  const router = Router();

  router.post("/", (req, res, next) => {
    try {
      const entry = moodService.createMoodEntry(req.body, req.userId);
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
      const entries = moodService.listMoodEntries({
        userId: req.userId,
        limit,
        from: req.query.from,
        to: req.query.to
      });
      res.status(200).json({ entries });
    } catch (error) {
      next(error);
    }
  });

  router.get("/summary", (req, res, next) => {
    try {
      const summary = summaryService.getMoodSummary({
        userId: req.userId,
        mode: req.query.mode,
        from: req.query.from,
        to: req.query.to,
        timeZone: req.query.timeZone
      });
      res.status(200).json(summary);
    } catch (error) {
      next(error);
    }
  });

  return router;
}
