-- Relative weight of a habit within its area's Bloom (default 1 = equal share
-- with the area's other tend habits). Normalised at compute time.

alter table habits
  add column if not exists weight real;
