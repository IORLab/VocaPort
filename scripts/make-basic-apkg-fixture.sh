#!/usr/bin/env bash
set -euo pipefail

root_dir="$(cd "$(dirname "$0")/.." && pwd)"
mkdir -p "${root_dir}/fixtures/anki"
tmp_dir="$(mktemp -d)"

sqlite3 "${tmp_dir}/collection.anki2" <<'SQL'
CREATE TABLE col (
  id integer primary key,
  crt integer,
  mod integer,
  scm integer,
  ver integer,
  dty integer,
  usn integer,
  ls integer,
  conf text,
  models text,
  decks text,
  dconf text,
  tags text
);
CREATE TABLE notes (
  id integer primary key,
  guid text,
  mid integer,
  mod integer,
  usn integer,
  tags text,
  flds text,
  sfld integer,
  csum integer,
  flags integer,
  data text
);
INSERT INTO col VALUES (
  1, 0, 0, 0, 11, 0, 0, 0,
  '{}',
  '{"1":{"name":"Basic","flds":[{"name":"Front"},{"name":"Back"},{"name":"Example"}]}}',
  '{"1":{"name":"Basic Vocab"}}',
  '{}',
  ''
);
INSERT INTO notes VALUES (
  1, 'guid-1', 1, 0, 0, '', 'apple苹果I eat an apple.', 0, 0, 0, ''
);
SQL

printf '{}' > "${tmp_dir}/media"
(cd "${tmp_dir}" && zip -q "${root_dir}/fixtures/anki/basic-vocab.apkg" collection.anki2 media)
rm -rf "${tmp_dir}"
