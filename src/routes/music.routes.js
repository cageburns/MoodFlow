import { Router } from "express";

export function createMusicRouter(musicSearchService) {
  const router = Router();

  router.post("/suggestions", async (req, res, next) => {
    try {
      const result = await musicSearchService.suggestForMoodEntry(req.body?.moodEntryId, req.userId);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  });

  return router;
}
