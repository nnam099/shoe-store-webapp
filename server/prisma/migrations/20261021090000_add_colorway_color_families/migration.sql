-- Persist the storefront color families that were previously maintained in
-- application configuration. This migration is additive and preserves every
-- existing catalog and transactional row.
ALTER TABLE "colorways"
ADD COLUMN "color_families" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

UPDATE "colorways"
SET "color_families" = CASE "slug"
  WHEN 'beige' THEN ARRAY['brown-beige', 'white']
  WHEN 'black' THEN ARRAY['black']
  WHEN 'black-grey' THEN ARRAY['black', 'grey']
  WHEN 'black-white' THEN ARRAY['black', 'white']
  WHEN 'blue' THEN ARRAY['blue']
  WHEN 'brown' THEN ARRAY['brown-beige']
  WHEN 'brown-cream' THEN ARRAY['brown-beige', 'white']
  WHEN 'cream-black' THEN ARRAY['white', 'black']
  WHEN 'dark-olive' THEN ARRAY['green']
  WHEN 'dark-olivine' THEN ARRAY['green']
  WHEN 'egret' THEN ARRAY['white']
  WHEN 'green' THEN ARRAY['green']
  WHEN 'green-tan' THEN ARRAY['green', 'brown-beige']
  WHEN 'grey' THEN ARRAY['grey']
  WHEN 'grey-pink' THEN ARRAY['grey', 'pink-purple']
  WHEN 'grey-white' THEN ARRAY['grey', 'white']
  WHEN 'ivory-black' THEN ARRAY['white', 'black']
  WHEN 'navy' THEN ARRAY['blue']
  WHEN 'obsidian-blue' THEN ARRAY['blue']
  WHEN 'orange' THEN ARRAY['orange-yellow']
  WHEN 'pink' THEN ARRAY['pink-purple']
  WHEN 'red' THEN ARRAY['red']
  WHEN 'sail' THEN ARRAY['white']
  WHEN 'silver' THEN ARRAY['grey']
  WHEN 'taupe' THEN ARRAY['brown-beige', 'grey']
  WHEN 'violet' THEN ARRAY['pink-purple']
  WHEN 'white' THEN ARRAY['white']
  WHEN 'white-black' THEN ARRAY['white', 'black']
  WHEN 'white-blue' THEN ARRAY['white', 'blue']
  WHEN 'white-green' THEN ARRAY['white', 'green']
  WHEN 'white-grey' THEN ARRAY['white', 'grey']
  WHEN 'white-multicolor' THEN ARRAY['white']
  WHEN 'white-red' THEN ARRAY['white', 'red']
  WHEN 'white-silver' THEN ARRAY['white', 'grey']
  WHEN 'yellow' THEN ARRAY['orange-yellow']
  ELSE ARRAY[]::TEXT[]
END;
