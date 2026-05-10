-- Categories table: admin-managed shop/home category tags
CREATE TABLE IF NOT EXISTS categories (
  id          TEXT PRIMARY KEY,
  slug        TEXT NOT NULL UNIQUE,        -- used in URL params & product matching
  label       TEXT NOT NULL,               -- display name, e.g. "Pokémon"
  emoji       TEXT,                        -- emoji fallback, e.g. "🔴"
  image_url   TEXT,                        -- uploaded image URL (takes priority over emoji)
  color       TEXT NOT NULL DEFAULT 'bg-gray-50 border-gray-200 hover:border-gray-400 hover:bg-gray-100',
  sort_order  INTEGER NOT NULL DEFAULT 0,  -- display order
  is_active   INTEGER NOT NULL DEFAULT 1,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Seed default categories
INSERT OR IGNORE INTO categories (id, slug, label, emoji, image_url, color, sort_order) VALUES
  ('cat_pokemon',  'pokemon',      'Pokémon',              '🔴', '/images/pokemon-logo.png',             'bg-red-50 border-red-200 hover:border-red-400 hover:bg-red-100',       1),
  ('cat_mtg',      'mtg',          'Magic: The Gathering',  '🟤', '/images/Magic-The-Gathering-Logo.jpg', 'bg-amber-50 border-amber-200 hover:border-amber-400 hover:bg-amber-100', 2),
  ('cat_yugioh',   'yugioh',       'Yu-Gi-Oh!',            '🟣', '/images/Yugioh-logo.png',              'bg-purple-50 border-purple-200 hover:border-purple-400 hover:bg-purple-100', 3),
  ('cat_sealed',   'sealed',       'Sealed Products',       '📦', NULL,                                  'bg-blue-50 border-blue-200 hover:border-blue-400 hover:bg-blue-100',    4),
  ('cat_plushies', 'Plushies',     'Plushies',              '🧸', NULL,                                  'bg-pink-50 border-pink-200 hover:border-pink-400 hover:bg-pink-100',    5),
  ('cat_access',   'Accessories',  'Accessories',           '🎴', NULL,                                  'bg-green-50 border-green-200 hover:border-green-400 hover:bg-green-100', 6),
  ('cat_others',   'others',       'Others',                '🃏', NULL,                                  'bg-gray-50 border-gray-200 hover:border-gray-400 hover:bg-gray-100',   7);
