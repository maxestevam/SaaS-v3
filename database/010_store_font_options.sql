CREATE TABLE IF NOT EXISTS ld_store_font_options (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  label VARCHAR(80) NOT NULL,
  description VARCHAR(160) NOT NULL,
  css_family VARCHAR(255) NOT NULL,
  active TINYINT(1) NOT NULL DEFAULT 1,
  sort_order INT NOT NULL DEFAULT 0,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,
  INDEX idx_store_font_options_active_order (active, sort_order)
);

INSERT INTO ld_store_font_options (id, label, description, css_family, active, sort_order, created_at, updated_at) VALUES
  ('inter', 'Inter', 'Contemporânea e direta', 'Inter, sans-serif', 1, 10, 0, 0),
  ('manrope', 'Manrope', 'Sofisticada e geométrica', 'Manrope, sans-serif', 1, 20, 0, 0),
  ('lora', 'Lora', 'Editorial e acolhedora', 'Lora, serif', 1, 30, 0, 0),
  ('playfair_display', 'Playfair Display', 'Clássica e expressiva', '''Playfair Display'', serif', 1, 40, 0, 0),
  ('dm_sans', 'DM Sans', 'Leve e contemporânea', '''DM Sans'', sans-serif', 1, 50, 0, 0),
  ('montserrat', 'Montserrat', 'Marcante e versátil', 'Montserrat, sans-serif', 1, 60, 0, 0),
  ('nunito_sans', 'Nunito Sans', 'Amigável e clara', '''Nunito Sans'', sans-serif', 1, 70, 0, 0),
  ('poppins', 'Poppins', 'Moderna e geométrica', 'Poppins, sans-serif', 1, 80, 0, 0)
ON DUPLICATE KEY UPDATE
  label = VALUES(label),
  description = VALUES(description),
  css_family = VALUES(css_family),
  active = VALUES(active),
  sort_order = VALUES(sort_order),
  updated_at = VALUES(updated_at);
