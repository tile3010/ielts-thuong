# Adaptive lessons and homework

The dashboard/progress view offers **Tạo giáo án + homework hôm nay**. It makes one paid AI call and stores the plan by date and skill in the learner's state. Open the daily lesson again after generation to use it. Existing plans remain available when generation fails; static starter lessons are the fallback until a personalized plan is generated.

Monthly internal scores update the level separately for each skill: begin at 1, add one level for a monthly score >=4/5, keep level for 2.5–3.99, subtract one for <2.5. Levels are capped at 1–4 and are not official IELTS bands. The score history is processed in month order; new results affect newly generated plans, not completed ones.

| Level | Listening/Reading main tasks | Homework tasks | Writing/Speaking main products | Homework products |
| --- | --- | --- | --- | --- |
| 1 | 12 | 24 | 3 | 6 |
| 2 | 16 | 32 | 4 | 8 |
| 3 | 20 | 40 | 5 | 10 |
| 4 | 24 | 48 | 6 | 12 |

Open tasks are mini-responses, revisions or paragraphs, not necessarily full essays. Generation instructions increase language complexity and material length while maintaining the 60-minute core lesson. Homework is separate, approximately 90–120 minutes, and can be split over multiple sessions. The system validates task counts and material references; AI difficulty and realistic completion times still need review by the learner.

Homework answers stay hidden in the UI until the homework is submitted and AI review succeeds. They are part of the client-side plan and are not secure against source inspection. Audio is device text-to-speech with separate two-play limits per material; transcripts appear at the final lesson step or after homework submission. Subjective answers are assessed against examples and rubric, not exact text matching. Pronunciation is not evaluated from text.

Plans, homework drafts and reports are included when **Lưu lên cloud** is pressed. Reports also inform the errors supplied for the next generated plan. An AI generation and a homework review each consume one daily AI request. Larger plans use more tokens than the previous static lessons. Main and homework completion times are estimates; the timer records visible-page study time and does not prove learning.

The Vercel function timeout is 180 seconds to allow longer plan generation. Live generation, phone playback and homework grading must be verified with the configured API account. A syntax check or rules test does not establish that those external calls work.
