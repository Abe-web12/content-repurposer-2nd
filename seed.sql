-- SEED DATA FOR REPURPOSEAI
-- Run this AFTER creating your first user account via the signup page.
-- Replace 'YOUR_USER_ID_HERE' with your actual UUID from Supabase Auth -> Users

-- ============================================
-- DEMO VOICE PROFILE
-- ============================================
INSERT INTO public.voice_profiles (id, user_id, name, description, tone, example_posts, is_default)
VALUES (
  gen_random_uuid(),
  'YOUR_USER_ID_HERE',
  'Professional Founder',
  'I write like a seasoned B2B founder sharing hard-won lessons. Direct, slightly opinionated, always actionable. Short paragraphs, no fluff.',
  'authoritative',
  ARRAY[
    'Most founders fail at pricing because they anchor to costs instead of value. Your customer does not care what it cost you to build. They care what it costs them NOT to use it. Price on the gap between their current pain and your solution.',
    'Hired our first marketer today. Took 6 months longer than it should have. The lesson: founders who think "I will just do the marketing myself" are optimizing for saving money while burning the one thing they cannot get back. Time compounds. Hire before you are ready.',
    'Shipped v2 of our onboarding last week. Activation rate went from 23% to 41%. The only change: we removed 4 steps and added 1 "quick win" moment in the first 60 seconds. People do not want a tour. They want proof it works.'
  ],
  true
);

INSERT INTO public.voice_profiles (id, user_id, name, description, tone, example_posts, is_default)
VALUES (
  gen_random_uuid(),
  'YOUR_USER_ID_HERE',
  'Casual Marketer',
  'Relaxed, conversational, occasionally funny. Like texting a smart friend about marketing.',
  'casual',
  ARRAY[
    'hot take: your content calendar is probably too complicated. I post when I have something worth saying, not because Tuesday is "LinkedIn day." consistency matters but forced consistency produces mid content.',
    'tried that new AI writing tool everyone is hyping. verdict: great for first drafts, terrible for anything you want to sound like a human wrote it. still faster than staring at a blank screen for 20 minutes though.'
  ],
  false
);

-- ============================================
-- DEMO GENERATIONS
-- ============================================
INSERT INTO public.generations (user_id, input_type, input_content, extracted_content, output_format, output_content, model_used, is_favorite)
VALUES (
  'YOUR_USER_ID_HERE',
  'blog_url',
  'https://example.com/blog/saas-pricing-strategies',
  'Article about SaaS pricing strategies covering value-based pricing, tiered models, and common founder mistakes.',
  'linkedin_post',
  'I changed our pricing 4 times in 18 months.

Each time, I was terrified we would lose customers.

Each time, we grew faster.

Here is what nobody tells you about SaaS pricing:

Your first price is always wrong. Not because you are bad at math, but because you do not have enough data yet to know what customers actually value.

The fix is not "research more before launching." It is: launch fast, watch behavior, adjust quarterly.

Three signals that you are underpriced:
-> Close rate above 80%
-> Zero pushback on pricing calls
-> Customers say "this is a no-brainer"

If everyone says yes immediately, you are leaving money on the table.

What is one pricing change you made that surprised you?',
  'gemini-1.5-flash',
  true
);

INSERT INTO public.generations (user_id, input_type, input_content, extracted_content, output_format, output_content, model_used, is_favorite)
VALUES (
  'YOUR_USER_ID_HERE',
  'youtube_url',
  'https://youtube.com/watch?v=example123',
  'Video about building in public as a solo founder.',
  'twitter_thread',
  '1/ Building in public made me $40K in revenue before I had a product.

Here is the playbook nobody talks about:

2/ I did not share metrics to "be transparent." I shared them to create accountability loops that forced me to ship faster. Public commitment is the best productivity hack.

3/ The content pyramid that worked:
-> Daily: what I built today (30 sec to write)
-> Weekly: lessons + metrics (10 min)
-> Monthly: deep dive essay (2 hours)

4/ 90% of my engagement came from daily posts. But 90% of my REVENUE came from monthly essays. Different content serves different goals. Know which is which.

5/ Mistake I made early: treating followers as customers. They are not. Followers are your distribution channel. Your EMAIL list is your customer pipeline.

6/ The conversion path: Tweet -> Profile -> Link in bio -> Email signup -> Product launch email -> Customer. Every step has a different job.

7/ If you are starting today: pick ONE platform, post daily for 30 days, share real numbers. You will know by day 30 if this channel works for you.

8/ Building in public is not a strategy. It is a forcing function for consistency. And consistency is the only growth hack that actually works.',
  'gemini-1.5-flash',
  false
);
