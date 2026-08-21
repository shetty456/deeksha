-- Seed: sample PM interview questions (20 questions across all 7 categories)
-- Run after the initial schema migration.

insert into questions (question, category, difficulty, question_type) values

-- Product Sense
('How would you improve Google Maps?',                                              'product_sense', 'medium', 'improve'),
('Design a product for elderly users who want to stay connected with family.',       'product_sense', 'medium', 'design'),
('How would you prioritize the next feature for Spotify?',                          'product_sense', 'hard',   'prioritize'),
('How would you improve LinkedIn''s feed algorithm?',                               'product_sense', 'hard',   'improve'),
('Design a feature to help users discover new content on YouTube.',                 'product_sense', 'medium', 'design'),

-- Product Strategy
('Should Airbnb expand into long-term rentals?',                                    'product_strategy', 'hard', 'strategy'),
('How would you increase retention for a B2B SaaS product?',                       'product_strategy', 'hard', 'strategy'),

-- Execution
('A key feature your team shipped is not being used. What do you do?',             'execution', 'medium', 'execution'),
('How do you decide when a product is ready to ship?',                              'execution', 'easy',   'execution'),
('Walk me through how you would launch a product in a market you know nothing about.', 'execution', 'hard', 'execution'),

-- Metrics
('What metrics would you use to measure the success of Instagram Stories?',         'metrics', 'medium', 'metrics'),
('You notice DAU dropped 10% last week. How do you diagnose this?',                 'metrics', 'hard',   'diagnosis'),
('Define success metrics for a new onboarding flow.',                               'metrics', 'easy',   'metrics'),

-- Estimation
('Estimate the number of Uber rides taken in NYC on a weekday.',                    'estimation', 'medium', 'estimation'),
('How many piano tuners are in Chicago?',                                           'estimation', 'easy',   'estimation'),
('What is the market size for food delivery in India?',                             'estimation', 'hard',   'estimation'),

-- Behavioral
('Tell me about a time you had to make a decision without enough data.',            'behavioral', 'medium', 'behavioral'),
('Describe a conflict you had with an engineer and how you resolved it.',           'behavioral', 'medium', 'behavioral'),

-- Growth
('How would you grow WhatsApp in a market where it already has 80% penetration?',  'growth', 'hard',   'growth'),
('What would you do if your growth metric is up but engagement is down?',           'growth', 'medium', 'growth')

on conflict do nothing;
