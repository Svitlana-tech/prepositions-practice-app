import { z } from "zod";

export const vocabWordAnswersSchema = z.array(z.string().trim().min(1)).min(1).max(2);

export const vocabWordInputSchema = z.object({
  ukrainian: z.string().trim().min(1),
  answers: vocabWordAnswersSchema,
});
export type VocabWordInput = z.infer<typeof vocabWordInputSchema>;
