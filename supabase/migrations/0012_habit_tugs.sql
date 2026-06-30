-- "Tugs": habits you want to ease off. polarity defaults to 'tend' (a normal
-- habit); 'ease' habits are logged manually and eat into the Bloom. tug_weight
-- is how much one logged tug counts (in equivalent missed sessions).

alter table habits
  add column if not exists polarity text not null default 'tend',
  add column if not exists tug_weight real;
