-- Seed data mirroring src/mocks/db.ts so the real backend starts with the
-- same dummy content the frontend was built against. Idempotent via ON CONFLICT.

INSERT INTO users (id, name, email, class_label, streak) VALUES
  ('u_1', 'Kate Malone', 'kate@evonotes.app', 'Grade 11 · Science', 0)
ON CONFLICT (id) DO NOTHING;

INSERT INTO workspaces (id, name, color, privacy, created_at, last_accessed_at) VALUES
  ('ws_bio',  'Biology 101',        'green',  'private', now()-interval '40 day', now()-interval '3 hour'),
  ('ws_calc', 'Calculus II',        'purple', 'private', now()-interval '30 day', now()-interval '1 day'),
  ('ws_hist', 'World History',      'amber',  'link',    now()-interval '22 day', now()-interval '2 day'),
  ('ws_chem', 'Organic Chemistry',  'blue',   'private', now()-interval '12 day', now()-interval '5 day'),
  ('ws_eng',  'English Literature', 'coral',  'public',  now()-interval '8 day',  now()-interval '20 hour')
ON CONFLICT (id) DO NOTHING;

-- Workspace tags are seeded in 0007 (catalog + entity_tags). They intentionally
-- live there, not here, because 0007 drops the legacy tags.entity_id column this
-- block used to target — keeping the insert here would break re-runs.

INSERT INTO chapters (id, workspace_id, name, position) VALUES
  ('ch_1',  'ws_bio',  'Cell structure',           0),
  ('ch_2',  'ws_bio',  'Membranes & transport',    1),
  ('ch_3',  'ws_bio',  'Genetics',                 2),
  ('ch_c1', 'ws_calc', 'Techniques of integration',0),
  ('ch_c2', 'ws_calc', 'Sequences & series',       1)
ON CONFLICT (id) DO NOTHING;

INSERT INTO files (id, workspace_id, chapter_id, name, kind, size_kb, added_at, status, url, content) VALUES
  ('f_1', 'ws_bio',  'ch_1', 'Cell structure.pdf',       'pdf',   2480, now()-interval '20 day', 'ready', 'https://raw.githubusercontent.com/mozilla/pdf.js/master/web/compressed.tracemonkey-pldi-09.pdf', NULL),
  ('f_2', 'ws_bio',  'ch_1', 'Organelles cheatsheet.md', 'md',      14, now()-interval '19 day', 'ready', NULL, '# Organelles

- **Nucleus** — stores DNA, controls the cell.
- **Mitochondria** — the powerhouse; ATP via respiration.
- **Ribosomes** — protein synthesis.
- **Golgi apparatus** — packaging & shipping.

The cell membrane is a *phospholipid bilayer* that controls what enters and leaves.'),
  ('f_3', 'ws_bio',  'ch_2', 'Osmosis notes.txt',        'txt',      6, now()-interval '18 day', 'ready', NULL, 'Osmosis is the diffusion of water across a semi-permeable membrane from low to high solute concentration.'),
  ('f_4', 'ws_bio',  'ch_3', 'Mendelian genetics.pdf',   'pdf',   1890, now()-interval '15 day', 'ready', 'https://raw.githubusercontent.com/mozilla/pdf.js/master/web/compressed.tracemonkey-pldi-09.pdf', NULL),
  ('f_5', 'ws_bio',  NULL,   'Punnett squares.png',      'image',  420, now()-interval '14 day', 'ready', NULL, NULL),
  ('f_6', 'ws_calc', 'ch_c1','Integration by parts.pdf', 'pdf',    980, now()-interval '10 day', 'ready', 'https://raw.githubusercontent.com/mozilla/pdf.js/master/web/compressed.tracemonkey-pldi-09.pdf', NULL),
  ('f_7', 'ws_calc', 'ch_c2','Taylor series.md',         'md',      11, now()-interval '9 day',  'ready', NULL, '# Taylor series

A function f(x) near a point a:

f(x) = Σ fⁿ(a)/n! · (x − a)ⁿ')
ON CONFLICT (id) DO NOTHING;

INSERT INTO quizzes (id, name, workspace_id, workspace_name, chapters, questions, created_at, privacy) VALUES
  ('qz_1', 'Cell biology basics', 'ws_bio', 'Biology 101', '{"Cell structure","Membranes & transport"}',
    '[
      {"id":"q1","type":"mcq","level":"recall","prompt":"Which organelle is the powerhouse of the cell?","options":[{"value":"Nucleus","explanation":"The nucleus stores DNA; it does not generate the cell''s ATP."},{"value":"Mitochondria","explanation":"Correct — mitochondria produce ATP through cellular respiration."},{"value":"Ribosome","explanation":"Ribosomes synthesize proteins, not energy."},{"value":"Golgi apparatus","explanation":"The Golgi packages and ships proteins; it is not an energy source."}],"correct":[1],"explanation":"Mitochondria produce ATP through cellular respiration."},
      {"id":"q2","type":"boolean","level":"recall","prompt":"The cell membrane is a phospholipid bilayer.","correct":true,"explanation":"The membrane is two layers of phospholipids with hydrophilic heads out and hydrophobic tails in."},
      {"id":"q3","type":"multi","level":"application","prompt":"Select all that are membrane-bound organelles.","options":[{"value":"Ribosome","explanation":"Ribosomes are ribonucleoprotein particles, not membrane-bound."},{"value":"Nucleus","explanation":"Correct — enclosed by a double-membrane nuclear envelope."},{"value":"Mitochondria","explanation":"Correct — bounded by an outer and inner membrane."},{"value":"Cytosol","explanation":"The cytosol is the fluid itself, not a membrane-bound compartment."}],"correct":[1,2]},
      {"id":"q4","type":"fill","level":"application","prompt":"The diffusion of water across a membrane is called ____.","accepted":[{"value":"osmosis"}]},
      {"id":"q5","type":"ordering","level":"analysis","prompt":"Order the path of protein secretion.","items":[{"value":"Ribosome"},{"value":"Rough ER"},{"value":"Golgi apparatus"},{"value":"Vesicle"},{"value":"Cell membrane"}]},
      {"id":"q6","type":"matching","level":"application","prompt":"Match the organelle to its function.","pairs":[{"left":"Nucleus","right":"Stores DNA"},{"left":"Mitochondria","right":"Makes ATP"},{"left":"Ribosome","right":"Builds proteins"}]}
    ]'::jsonb, now()-interval '4 day', 'private'),
  ('qz_2', 'Genetics check-in', 'ws_bio', 'Biology 101', '{"Genetics"}',
    '[
      {"id":"q7","type":"mcq","level":"application","prompt":"A cross between Aa × Aa gives what genotype ratio?","options":[{"value":"1:2:1","explanation":"Correct — the genotype ratio is 1 AA : 2 Aa : 1 aa."},{"value":"3:1","explanation":"That is the phenotype ratio, not the genotype ratio."},{"value":"1:1","explanation":"A 1:1 ratio comes from a test cross (Aa × aa)."},{"value":"9:3:3:1","explanation":"That is a dihybrid (two-gene) ratio, not a monohybrid one."}],"correct":[0]},
      {"id":"q8","type":"short","level":"analysis","prompt":"Define a dominant allele in one sentence.","accepted":[{"value":"an allele expressed in the phenotype even when only one copy is present"}]}
    ]'::jsonb, now()-interval '2 day', 'private'),
  ('qz_3', 'Integration techniques', 'ws_calc', 'Calculus II', '{"Techniques of integration"}',
    '[
      {"id":"q9","type":"mcq","level":"application","prompt":"∫ x·eˣ dx is best solved by…","options":[{"value":"Substitution","explanation":"No single inner function''s derivative appears, so u-substitution stalls."},{"value":"Integration by parts","explanation":"Correct — a polynomial times an exponential is the classic parts case."},{"value":"Partial fractions","explanation":"Partial fractions apply to rational functions, not this product."},{"value":"Trig substitution","explanation":"Trig substitution targets radical forms like √(a²−x²)."}],"correct":[1]},
      {"id":"q10","type":"boolean","level":"recall","prompt":"∫ 1/x dx = ln|x| + C","correct":true,"explanation":"The antiderivative of 1/x is ln|x|; the absolute value covers negative x."}
    ]'::jsonb, now()-interval '6 day', 'public')
ON CONFLICT (id) DO NOTHING;

INSERT INTO attempts (id, quiz_id, quiz_name, workspace_name, chapters, correct, total, pct, taken_at) VALUES
  ('at_1', 'qz_1', 'Cell biology basics',   'Biology 101', '{"Cell structure"}',            8, 10, 80, now()-interval '2 day'),
  ('at_2', 'qz_3', 'Integration techniques','Calculus II', '{"Techniques of integration"}', 6, 10, 60, now()-interval '3 day'),
  ('at_3', 'qz_2', 'Genetics check-in',     'Biology 101', '{"Genetics"}',                  4, 10, 40, now()-interval '5 day')
ON CONFLICT (id) DO NOTHING;

INSERT INTO decks (id, name, workspace_id, workspace_name, color, card_count, known_pct) VALUES
  ('dk_1', 'Cell organelles',  'ws_bio',  'Biology 101',   'green',  32, 80),
  ('dk_2', 'Integration rules','ws_calc', 'Calculus II',   'purple', 24, 55),
  ('dk_3', 'History dates',    'ws_hist', 'World History', 'amber',  40, 30)
ON CONFLICT (id) DO NOTHING;

INSERT INTO cards (id, deck_id, front, back, known) VALUES
  ('c_1', 'dk_1', 'Mitochondria',    'Powerhouse of the cell — produces ATP.', true),
  ('c_2', 'dk_1', 'Nucleus',         'Stores DNA and controls cell activity.', true),
  ('c_3', 'dk_1', 'Ribosome',        'Site of protein synthesis.',             false),
  ('c_4', 'dk_1', 'Golgi apparatus', 'Packages and ships proteins.',           false),
  ('c_5', 'dk_2', '∫ eˣ dx',         'eˣ + C',                                 true),
  ('c_6', 'dk_2', '∫ 1/x dx',        'ln|x| + C',                              false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO labels (id, user_id, name, color) VALUES
  ('lb_bio',   'u_1', 'Biology',     'green'),
  ('lb_calc',  'u_1', 'Calculus',    'purple'),
  ('lb_hist',  'u_1', 'History',     'amber'),
  ('lb_exam',  'u_1', 'Exam',        'coral'),
  ('lb_study', 'u_1', 'Study group', 'blue')
ON CONFLICT (id) DO NOTHING;

-- Events anchored to "today" so the calendar always has same-day content.
INSERT INTO events (id, title, start_at, end_at, label_ids, location) VALUES
  ('ev_1', 'Biology lecture',   date_trunc('day', now())+interval '8 hour',  date_trunc('day', now())+interval '9 hour',  '{lb_bio}',          'Room B2 · 158'),
  ('ev_2', 'Calculus tutorial', date_trunc('day', now())+interval '11 hour', date_trunc('day', now())+interval '12 hour 30 minute', '{lb_calc,lb_study}', 'Room 124'),
  ('ev_3', 'History essay due',  date_trunc('day', now())+interval '15 hour', date_trunc('day', now())+interval '16 hour', '{lb_hist,lb_exam}', NULL),
  ('ev_4', 'Study group',        date_trunc('day', now())+interval '1 day 13 hour', date_trunc('day', now())+interval '1 day 15 hour', '{lb_study}', 'Library'),
  ('ev_5', 'Chem midterm',       date_trunc('day', now())+interval '2 day 9 hour',  date_trunc('day', now())+interval '2 day 11 hour', '{lb_exam}', 'Hall A'),
  ('ev_6', 'Past revision',      date_trunc('day', now())-interval '30 day'+interval '10 hour', date_trunc('day', now())-interval '30 day'+interval '11 hour', '{lb_bio}', NULL)
ON CONFLICT (id) DO NOTHING;

INSERT INTO tasks (id, title, meta, done, due_date) VALUES
  ('tk_1', 'Read Chapter 3 — Genetics',      'Biology 101',              false, date_trunc('day', now())+interval '23 hour'),
  ('tk_2', 'Finish integration worksheet',   'Calculus II · 12 problems',false, date_trunc('day', now())+interval '23 hour'),
  ('tk_3', 'Review flashcards',              'Cell organelles',          true,  date_trunc('day', now())+interval '23 hour'),
  ('tk_4', 'Outline history essay',          'World History',            false, date_trunc('day', now())+interval '1 day 23 hour')
ON CONFLICT (id) DO NOTHING;

INSERT INTO notifications (id, kind, title, body, at, read) VALUES
  ('nt_1', 'event',  'Calculus tutorial soon', 'Starts at 11:00 in Room 124.',        now()-interval '1 hour', false),
  ('nt_2', 'quiz',   'New attempt graded',     'Cell biology basics — 8/10.',         now()-interval '5 hour', false),
  ('nt_3', 'system', 'Welcome to Evo Notes',   'Upload your first source to get started.', now()-interval '1 day', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO canvases (id, name, updated_at) VALUES
  ('cv_1', 'Bio mind map',     now()-interval '4 hour'),
  ('cv_2', 'Essay brainstorm', now()-interval '2 day')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public_workspaces (id, name, color, privacy, tags, chapter_count, file_count, created_at, last_accessed_at, author, clones) VALUES
  ('pub_ws_1', 'AP Biology — full course', 'green', 'public', '{Cells,Genetics}',     6, 24, now()-interval '40 day', now()-interval '3 hour', 'mrslee',     1240),
  ('pub_ws_2', 'Modern World History',     'amber', 'public', '{Modern,Essays}',      5, 18, now()-interval '22 day', now()-interval '2 day',  'historyhub', 860)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public_quizzes (id, name, workspace_id, workspace_name, chapters, questions, created_at, privacy, author, clones) VALUES
  ('pub_qz_1', 'Cell biology — 50 questions', 'ws_bio', 'Biology 101',
    '{"Cell structure","Membranes & transport"}',
    (SELECT questions FROM quizzes WHERE id='qz_1'), now()-interval '4 day', 'public', 'mrslee', 540),
  ('pub_qz_2', 'Calculus II mega quiz', 'ws_calc', 'Calculus II',
    '{"Techniques of integration"}',
    (SELECT questions FROM quizzes WHERE id='qz_3'), now()-interval '6 day', 'public', 'mathpro', 410)
ON CONFLICT (id) DO NOTHING;
