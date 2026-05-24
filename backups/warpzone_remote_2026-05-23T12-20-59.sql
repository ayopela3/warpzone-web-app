PRAGMA defer_foreign_keys=TRUE;
CREATE TABLE d1_migrations(
		id         INTEGER PRIMARY KEY AUTOINCREMENT,
		name       TEXT UNIQUE,
		applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
INSERT INTO "users" ("id","email","password_hash","created_at") VALUES('9127bd51-d8d9-449c-a7eb-b85e0631a497','admin@warpzone.com','$2b$10$KLHFfzC3GZuYAVSBqzRasOvaSPl927YbeuXoXDLELWo33sFAkd7N6','2026-05-05 13:11:41');
INSERT INTO "users" ("id","email","password_hash","created_at") VALUES('56f6605c-1631-415a-af04-560cd69445d2','seller@warpzone.com','$2b$10$xG6foB.k4av1prpSgaIGWeIeM89LKM5qJhrC0CRpCggwFG.tiwGVe','2026-05-05 13:11:41');
INSERT INTO "users" ("id","email","password_hash","created_at") VALUES('4e38ab99-5c7e-46cd-9a1c-3089a9704e99','test@warpzone.com','$2b$10$2o0BEwxgWGLRxmrbjJESSuWb/39VDxDUMpTnX5.5ct5ZzOqvn2F.u','2026-05-06 14:54:58');
INSERT INTO "users" ("id","email","password_hash","created_at") VALUES('4eafc2e9-17cc-4e23-8b7d-22e298208136','warpzone_ph@proton.me','$2b$10$/Wx19bFbyMPVCIYKttc8muEDZ7q7oVttDItbOh3ktxubfVohVOOW2','2026-05-18 12:12:15');
CREATE TABLE profiles (
  id TEXT PRIMARY KEY,
  user_id TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  street TEXT NOT NULL,
  city TEXT NOT NULL,
  province TEXT NOT NULL,
  country TEXT NOT NULL,
  zip_code TEXT NOT NULL,
  phone_number TEXT,
  role TEXT NOT NULL DEFAULT 'regular-user',
  profile_picture TEXT,
  business_name TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')), payment_qr_url TEXT, is_banned INTEGER NOT NULL DEFAULT 0, ban_reason TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
INSERT INTO "profiles" ("id","user_id","full_name","street","city","province","country","zip_code","phone_number","role","profile_picture","business_name","created_at","updated_at","payment_qr_url","is_banned","ban_reason") VALUES('a1b2c3d4-e5f6-7890-abcd-ef1234567890','9127bd51-d8d9-449c-a7eb-b85e0631a497','Warpzone Admin','123 Admin Street','Metro Manila','NCR','Philippines','1234','+639123456789','admin',NULL,'Warpzone','2026-05-05 13:11:41','2026-05-05 13:11:41',NULL,0,NULL);
INSERT INTO "profiles" ("id","user_id","full_name","street","city","province","country","zip_code","phone_number","role","profile_picture","business_name","created_at","updated_at","payment_qr_url","is_banned","ban_reason") VALUES('b2c3d4e5-f6a7-8901-bcde-f12345678901','56f6605c-1631-415a-af04-560cd69445d2','Warpzone','Viosils Arcade, 3rd floor Warpzone, Brgy Taal, Molo Iloilo','Iloilo','Iloilo','Philippines','5000','+639954561345','seller',NULL,'The Warpzone','2026-05-05 13:11:41','2026-05-09 04:20:54','https://warpzone.shop/api/images/508e131b-ea3c-4a14-9225-51fb82b2a952.jpeg',0,NULL);
INSERT INTO "profiles" ("id","user_id","full_name","street","city","province","country","zip_code","phone_number","role","profile_picture","business_name","created_at","updated_at","payment_qr_url","is_banned","ban_reason") VALUES('93f42240-c1f2-4696-be19-36cd33ee00f2','4e38ab99-5c7e-46cd-9a1c-3089a9704e99','Nav Ayopela','Brgy Taal, 3rd floor Viosils Arcade, Molo','Iloilo City','Iloilo','Philippines','5000','+639954561345','regular-user',NULL,NULL,'2026-05-06 14:54:58','2026-05-09 04:33:18',NULL,0,NULL);
INSERT INTO "profiles" ("id","user_id","full_name","street","city","province","country","zip_code","phone_number","role","profile_picture","business_name","created_at","updated_at","payment_qr_url","is_banned","ban_reason") VALUES('0a845d0e-4336-401b-aac5-62861e01fc63','4eafc2e9-17cc-4e23-8b7d-22e298208136','Ivan Anthony Ayopela','Viosils Arcade 3rd Floor, Brgy Taal, Molo Iloilo City','Iloilo City','Iloilo','Philippines','5000','+639954561345','seller',NULL,'The Warpzone','2026-05-18 12:12:15','2026-05-18 13:23:19','https://warpzone.shop/api/images/7cfbc9a3-b423-4e47-b639-899b0d04173a.png',0,NULL);
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
INSERT INTO "sessions" ("id","user_id","expires_at","created_at") VALUES('9e75255c-7ff1-47ac-a27f-c56535139658','9127bd51-d8d9-449c-a7eb-b85e0631a497','2026-05-12T16:05:19.260Z','2026-05-05 16:05:19');
INSERT INTO "sessions" ("id","user_id","expires_at","created_at") VALUES('6df56a0a-e184-4289-82e2-b292e2de0840','56f6605c-1631-415a-af04-560cd69445d2','2026-05-12T16:05:52.345Z','2026-05-05 16:05:52');
INSERT INTO "sessions" ("id","user_id","expires_at","created_at") VALUES('f04b80e1-3fab-46ca-8e8f-db43b1bad944','56f6605c-1631-415a-af04-560cd69445d2','2026-05-12T20:51:11.392Z','2026-05-05 20:51:11');
INSERT INTO "sessions" ("id","user_id","expires_at","created_at") VALUES('a4a8c8d4-0b55-4a21-bd2b-145e79bb31be','56f6605c-1631-415a-af04-560cd69445d2','2026-05-12T20:52:45.062Z','2026-05-05 20:52:45');
INSERT INTO "sessions" ("id","user_id","expires_at","created_at") VALUES('bc26e606-62b7-4107-b5e3-81ba466e8018','9127bd51-d8d9-449c-a7eb-b85e0631a497','2026-05-12T23:48:52.903Z','2026-05-05 23:48:53');
INSERT INTO "sessions" ("id","user_id","expires_at","created_at") VALUES('d561bffe-820d-4786-9074-4d02396ba32e','9127bd51-d8d9-449c-a7eb-b85e0631a497','2026-05-12T23:56:33.323Z','2026-05-05 23:56:33');
INSERT INTO "sessions" ("id","user_id","expires_at","created_at") VALUES('36006155-67da-4825-8569-9a8834129915','56f6605c-1631-415a-af04-560cd69445d2','2026-05-13T00:17:18.841Z','2026-05-06 00:17:18');
INSERT INTO "sessions" ("id","user_id","expires_at","created_at") VALUES('46646989-81c8-4bf9-8193-e21144167d85','9127bd51-d8d9-449c-a7eb-b85e0631a497','2026-05-13T00:24:18.143Z','2026-05-06 00:24:18');
INSERT INTO "sessions" ("id","user_id","expires_at","created_at") VALUES('c9516469-8e73-4daa-ad9e-b103a27cf9b7','9127bd51-d8d9-449c-a7eb-b85e0631a497','2026-05-13T00:28:59.935Z','2026-05-06 00:29:00');
INSERT INTO "sessions" ("id","user_id","expires_at","created_at") VALUES('c7af60c5-7d5e-4122-8075-5d759eec8678','9127bd51-d8d9-449c-a7eb-b85e0631a497','2026-05-13T00:57:15.179Z','2026-05-06 00:57:15');
INSERT INTO "sessions" ("id","user_id","expires_at","created_at") VALUES('2c964692-1879-430d-9fba-4440fbeeff1d','56f6605c-1631-415a-af04-560cd69445d2','2026-05-13T00:59:20.337Z','2026-05-06 00:59:20');
INSERT INTO "sessions" ("id","user_id","expires_at","created_at") VALUES('9f1248ea-ef0e-4218-b5f3-4c93c9c7c4bb','56f6605c-1631-415a-af04-560cd69445d2','2026-05-13T01:39:24.626Z','2026-05-06 01:39:24');
INSERT INTO "sessions" ("id","user_id","expires_at","created_at") VALUES('4b97a8cd-3c78-4c31-a229-06a6240003ec','9127bd51-d8d9-449c-a7eb-b85e0631a497','2026-05-13T02:01:42.240Z','2026-05-06 02:01:42');
INSERT INTO "sessions" ("id","user_id","expires_at","created_at") VALUES('1ad2c42a-cf1e-4d23-a8c7-aca11d67757c','9127bd51-d8d9-449c-a7eb-b85e0631a497','2026-05-13T02:58:05.956Z','2026-05-06 02:58:06');
INSERT INTO "sessions" ("id","user_id","expires_at","created_at") VALUES('c77783b8-c10b-4725-97a2-f57ef8fdace6','9127bd51-d8d9-449c-a7eb-b85e0631a497','2026-05-13T12:54:47.511Z','2026-05-06 12:54:47');
INSERT INTO "sessions" ("id","user_id","expires_at","created_at") VALUES('a0ae1ced-3e1b-4de6-9412-427f1fa01232','9127bd51-d8d9-449c-a7eb-b85e0631a497','2026-05-13T13:12:36.611Z','2026-05-06 13:12:36');
INSERT INTO "sessions" ("id","user_id","expires_at","created_at") VALUES('381d01ff-ed8d-4675-90ae-20de796968c6','9127bd51-d8d9-449c-a7eb-b85e0631a497','2026-05-13T13:12:44.378Z','2026-05-06 13:12:44');
INSERT INTO "sessions" ("id","user_id","expires_at","created_at") VALUES('18c85fcc-cf2a-4e44-b808-298e9059f343','56f6605c-1631-415a-af04-560cd69445d2','2026-05-13T14:36:43.586Z','2026-05-06 14:36:43');
INSERT INTO "sessions" ("id","user_id","expires_at","created_at") VALUES('31d95f01-610b-4ccf-a749-05e70ed13086','9127bd51-d8d9-449c-a7eb-b85e0631a497','2026-05-13T14:43:21.128Z','2026-05-06 14:43:21');
INSERT INTO "sessions" ("id","user_id","expires_at","created_at") VALUES('efd34391-7872-4775-9006-16fe25e44f89','56f6605c-1631-415a-af04-560cd69445d2','2026-05-16T04:09:55.901Z','2026-05-09 04:09:56');
INSERT INTO "sessions" ("id","user_id","expires_at","created_at") VALUES('7f2ecaec-fd8f-4066-959f-348729db832e','4e38ab99-5c7e-46cd-9a1c-3089a9704e99','2026-05-16T05:14:10.925Z','2026-05-09 05:14:11');
INSERT INTO "sessions" ("id","user_id","expires_at","created_at") VALUES('5ebcc3ff-b03c-491c-b326-f49ecebfe83b','4e38ab99-5c7e-46cd-9a1c-3089a9704e99','2026-05-20T05:11:51.950Z','2026-05-13 05:11:52');
INSERT INTO "sessions" ("id","user_id","expires_at","created_at") VALUES('00cc79a7-3586-43f6-a6d1-200946798e1f','4e38ab99-5c7e-46cd-9a1c-3089a9704e99','2026-05-23T13:34:41.325Z','2026-05-16 13:34:41');
INSERT INTO "sessions" ("id","user_id","expires_at","created_at") VALUES('9a5344e1-b3ae-4612-a296-68076932cd8a','4e38ab99-5c7e-46cd-9a1c-3089a9704e99','2026-05-23T14:58:39.688Z','2026-05-16 14:58:39');
INSERT INTO "sessions" ("id","user_id","expires_at","created_at") VALUES('6d4a9dc3-00eb-4dd5-a629-43669a9aa972','56f6605c-1631-415a-af04-560cd69445d2','2026-05-23T23:28:44.733Z','2026-05-16 23:28:44');
INSERT INTO "sessions" ("id","user_id","expires_at","created_at") VALUES('8bd8b59b-34b6-4ef6-b4bd-7cc622a86561','9127bd51-d8d9-449c-a7eb-b85e0631a497','2026-05-25T13:36:08.236Z','2026-05-18 13:36:08');
INSERT INTO "sessions" ("id","user_id","expires_at","created_at") VALUES('ec221bf1-3e79-4915-8da4-008e659fce32','4e38ab99-5c7e-46cd-9a1c-3089a9704e99','2026-05-25T13:51:41.782Z','2026-05-18 13:51:41');
CREATE TABLE products (
  id TEXT PRIMARY KEY,
  sku TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  set_name TEXT,
  rarity TEXT,
  description TEXT,
  image_url TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
, approval_status TEXT NOT NULL DEFAULT 'pending', created_by TEXT, featured INTEGER NOT NULL DEFAULT 0, is_active INTEGER NOT NULL DEFAULT 1, quantity INTEGER NOT NULL DEFAULT 1, price INTEGER NOT NULL DEFAULT 0, condition TEXT);
INSERT INTO "products" ("id","sku","name","category","set_name","rarity","description","image_url","created_at","updated_at","approval_status","created_by","featured","is_active","quantity","price","condition") VALUES('515f5bde-96b0-49f3-a153-4c6c6d3ab7bb','pkmn-m4-booster-box-jp','Pokemon Ninja spinner JP Booster Box','Pokémon','','',replace('Pokemon Ninja Spinner Booster Box\n\nBox contains 30 packs\nPack contains 5 cards\nLanguage: Japanese\n','\n',char(10)),'https://warpzone.shop/api/images/ade3c2f2-d10e-4728-afb4-4710bae65936.jpg','2026-05-18 12:33:05','2026-05-18 12:55:37','approved','4eafc2e9-17cc-4e23-8b7d-22e298208136',0,1,1,8500,'NEW');
INSERT INTO "products" ("id","sku","name","category","set_name","rarity","description","image_url","created_at","updated_at","approval_status","created_by","featured","is_active","quantity","price","condition") VALUES('d6dc5b12-6c6f-4963-a88e-6474448abf91','GNDM-ST01','Gundam Assemble - Heroic Beginnings','Gundam Card Game','','',replace('Contents\n\nx3 GUNDAM ASSEMBLE (Gunpla Miniatures)\nTP-001 Gundam\nTP-002 Guncannon\nTP-003 Guntank\nx1 Ready-to-play 50-card deck\nx10 Resource Cards\nx8 Token Cards\nx1 Paper Damage Counter\nx2 Rule/Playsheet\nx1 Bonus Pack\nRarity\nx2 Legend Rare\nx14 Common','\n',char(10)),'https://warpzone.shop/api/images/719f35a7-6cbc-4bdf-afeb-083a4c2724fb.webp','2026-05-18 12:37:28','2026-05-18 12:55:36','approved','4eafc2e9-17cc-4e23-8b7d-22e298208136',0,1,1,2750,'NEW');
INSERT INTO "products" ("id","sku","name","category","set_name","rarity","description","image_url","created_at","updated_at","approval_status","created_by","featured","is_active","quantity","price","condition") VALUES('b9f72b73-422a-4b11-a00c-097b6f0df997','GNDM-ST03','Gundam Assemble - Zeon''s Rush','Gundam Card Game','','',replace('Contains\n\nx3 GUNDAM ASSEMBLE (Gunpla Miniatures)\nTP-001 Gundam\nTP-002 Guncannon\nTP-003 Guntank\nx1 Ready-to-play 50-card deck\nx10 Resource Cards\nx8 Token Cards\nx1 Paper Damage Counter\nx2 Rule/Playsheet\nx1 Bonus Pack\n\nRarity\n\nx2 Legend Rare\nx14 Common','\n',char(10)),'https://warpzone.shop/api/images/8236f940-1dd6-4459-ad6a-cf2a924af253.webp','2026-05-18 12:39:27','2026-05-18 12:55:36','approved','4eafc2e9-17cc-4e23-8b7d-22e298208136',0,1,1,2750,'NEW');
INSERT INTO "products" ("id","sku","name","category","set_name","rarity","description","image_url","created_at","updated_at","approval_status","created_by","featured","is_active","quantity","price","condition") VALUES('930b8151-5a74-4aa9-ba2c-21719d476d3d','GNDM-MM-MSV','Gundam Marker MSV','Others','','','The GSI Creos GMS127 Gundam Marker MSV Set is a collection of six markers specifically designed for coloring and detailing Gundam models. The set includes metallic silver, metallic blue, metallic red, metallic green, metallic yellow, and metallic pink colors. These markers have a fine tip for precise application and are alcohol-based, allowing for quick drying and easy blending. The set is ideal for hobbyists and enthusiasts who want to add a touch of metallic shine to their Gundam models.','https://warpzone.shop/api/images/2c1d2a43-52cb-4fa9-b36a-82020a0ae015.jpg','2026-05-18 12:42:09','2026-05-18 12:55:35','approved','4eafc2e9-17cc-4e23-8b7d-22e298208136',0,1,2,1800,'NEW');
INSERT INTO "products" ("id","sku","name","category","set_name","rarity","description","image_url","created_at","updated_at","approval_status","created_by","featured","is_active","quantity","price","condition") VALUES('e38dae3e-b8a9-446f-a423-6a5081c19407','PKMN-RS-61','Mega Rayquaza EX #61','Pokémon','','',replace('M Rayquaza EX\nPokemon Roaring Skies 61/108\n','\n',char(10)),'https://warpzone.shop/api/images/148a8846-31c7-463d-a723-37670a1e3620.jpg','2026-05-18 12:47:24','2026-05-18 12:55:51','approved','4eafc2e9-17cc-4e23-8b7d-22e298208136',1,1,1,5000,'GOOD');
INSERT INTO "products" ("id","sku","name","category","set_name","rarity","description","image_url","created_at","updated_at","approval_status","created_by","featured","is_active","quantity","price","condition") VALUES('c966caec-b782-4b6f-9ffe-cd33d9550b1e','MTG-SCD-TT','Starter Commander Deck - Token Triumph','Magic: The Gathering','','','Magic: The Gathering Starter Commander Deck - Token Triumph','https://warpzone.shop/api/images/9332f4ec-cf93-4ec0-a7d3-d8b70e192a0e.png','2026-05-18 12:49:52','2026-05-18 12:55:33','approved','4eafc2e9-17cc-4e23-8b7d-22e298208136',0,1,1,1500,'NEW');
INSERT INTO "products" ("id","sku","name","category","set_name","rarity","description","image_url","created_at","updated_at","approval_status","created_by","featured","is_active","quantity","price","condition") VALUES('9d75e678-ffd2-42d1-b978-cade5d7698a9','MTG-SCD-DD','Starter Commander Deck - Draconic Destruction','Magic: The Gathering','','','Magic: The Gathering Starter Commander Deck - Draconic Destruction','https://warpzone.shop/api/images/a7390332-efd4-41d7-a54a-c3fa979f4b2a.png','2026-05-18 12:51:58','2026-05-18 12:55:33','approved','4eafc2e9-17cc-4e23-8b7d-22e298208136',0,1,1,1500,'NEW');
INSERT INTO "products" ("id","sku","name","category","set_name","rarity","description","image_url","created_at","updated_at","approval_status","created_by","featured","is_active","quantity","price","condition") VALUES('f77af677-5659-4d68-b95e-188ebbece922','MTG-SCD-GD','Starter Commander Deck - Grave Danger','Magic: The Gathering','','','Magic: The Gathering Starter Commander Deck - Grave Danger','https://warpzone.shop/api/images/ae63c9cb-8d29-42ca-a8d0-bf36fb2900f3.png','2026-05-18 12:53:06','2026-05-23 11:43:09','approved','4eafc2e9-17cc-4e23-8b7d-22e298208136',0,1,0,1500,'NEW');
INSERT INTO "products" ("id","sku","name","category","set_name","rarity","description","image_url","created_at","updated_at","approval_status","created_by","featured","is_active","quantity","price","condition") VALUES('38303917-cdfd-4672-aa79-eb45b7ed037b','MTG-SCD-CI','Starter Commander Deck - Chaos Incarnate','Magic: The Gathering','','','Magic: The Gathering Starter Commander Deck - Chaos Incarnate','https://warpzone.shop/api/images/7c998d7f-f8b7-43e8-9dc2-0c6e91378881.png','2026-05-18 12:54:07','2026-05-18 12:55:31','approved','4eafc2e9-17cc-4e23-8b7d-22e298208136',0,1,1,1500,'NEW');
INSERT INTO "products" ("id","sku","name","category","set_name","rarity","description","image_url","created_at","updated_at","approval_status","created_by","featured","is_active","quantity","price","condition") VALUES('cdaf5128-10d3-4c6a-b39d-3091a135847c','MTG-SCD-FF','Starter Commander Deck - First Flight','Magic: The Gathering','','','Magic: The Gathering Starter Commander Deck - First Flight','https://warpzone.shop/api/images/91da2b7d-8aab-4aba-8dd0-739e7afee303.png','2026-05-18 12:55:17','2026-05-18 12:55:30','approved','4eafc2e9-17cc-4e23-8b7d-22e298208136',0,1,1,1500,'NEW');
INSERT INTO "products" ("id","sku","name","category","set_name","rarity","description","image_url","created_at","updated_at","approval_status","created_by","featured","is_active","quantity","price","condition") VALUES('c2fda291-21fe-43fe-8545-8c8575a1f658','RIFTBOUND-ORIGINS','League of Legends: Riftbound Origins','League of Legends: Rift Bound','','LIMITED SUPPLY',replace('LEAGUE OF LEGENDS RIFTBOUND ORIGINS\n\nOrigins, the debut set of Riftbound: League of Legends TCG, brings Champions to the battlefield like never before. Powering up your deck with 14-card booster packs that pull from a pool of nearly 300 cards, this set features a wide variety of art from legendary League of Legends artists.','\n',char(10)),'https://warpzone.shop/api/images/ec77a477-df7c-476a-8bab-43049f995447.webp','2026-05-23 11:55:55','2026-05-23 11:56:18','approved','4eafc2e9-17cc-4e23-8b7d-22e298208136',1,1,24,485,'NEW');
INSERT INTO "products" ("id","sku","name","category","set_name","rarity","description","image_url","created_at","updated_at","approval_status","created_by","featured","is_active","quantity","price","condition") VALUES('a4376e8b-f23b-4094-8b57-5c1e61dc12a2','PKM-MEG-CR-ETB','Pokemon Mega Evolutions: Chaos Rising ETB','Pokémon','','',replace('Pokemon Mega Evolutions Elite Trainer Box\n\nPokémon TCG: Mega Evolution—Chaos Rising Elite Trainer Box\nLaunch: May 22, 2026\nThe Pokémon TCG: Mega Evolution—Chaos Rising expansion captures the hustle and bustle of Lumiose City and the many fierce Pokémon that call it home. In this expansion, Mega Floette ex blossoms into an agent of chaos, unleashing havoc in Lumiose City. Powerful Mega Evolution Pokémon ex answer the call for help, among them Mega Greninja ex, Mega Pyroar ex, and Mega Dragalge ex. As these Pokémon battle for the fate of the city, will chaos reign?\nWith the Pokémon TCG: Mega Evolution—Chaos Rising Elite Trainer Box, you can dive right into the heart of the chaos. Discover and unleash your own Mega Evolution Pokémon ex with a little help from 9 booster packs. Get to know the full expansion with a player’s guide that will help you tame or incite the powerful Pokémon you encounter, according to your whims. With damage-counter dice, condition markers, and a collector’s box to help keep the chaos at bay, you have everything you need to thrive.\n\nThe Pokémon TCG: Mega Evolution—Chaos Rising Elite Trainer Box includes:\n\n9 Pokémon TCG: Mega Evolution—Chaos Rising booster packs\n1 full-art foil promo card featuring Fennekin\n65 card sleeves\n40 Pokémon TCG Energy cards\nA player’s guide to the Mega Evolution—Chaos Rising expansion\n6 damage-counter dice\n1 competition-legal coin-flip die\n1 plastic coin\nA collector’s box to hold everything, with 6 dividers to keep it organized\nA code card for Pokémon Trading Card Game Live','\n',char(10)),'https://warpzone.shop/api/images/f7039d15-cf4d-480a-96a5-4c4300eca413.png','2026-05-23 12:04:08','2026-05-23 12:05:00','approved','4eafc2e9-17cc-4e23-8b7d-22e298208136',0,1,0,8000,'NEW');
INSERT INTO "products" ("id","sku","name","category","set_name","rarity","description","image_url","created_at","updated_at","approval_status","created_by","featured","is_active","quantity","price","condition") VALUES('0dd1ba80-308d-4183-b455-0cb1ce267ed2','pkmn-m4-booster-pack-jp','Pokemon Ninja Spinner JP Pack','Pokémon','','',replace('Pokémon TCG: Mega Evolution Ninja Spinner JP\n\nLanguage: Japanese\nContains: 5 cards','\n',char(10)),'https://warpzone.shop/api/images/40573fba-5dc9-4df3-ab55-234e2165972f.jpg','2026-05-23 12:08:31','2026-05-23 12:08:49','approved','4eafc2e9-17cc-4e23-8b7d-22e298208136',0,1,30,250,'NEW');
CREATE TABLE product_listings (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  seller_id TEXT NOT NULL,
  condition TEXT NOT NULL,
  price REAL NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  in_stock BOOLEAN NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  FOREIGN KEY (seller_id) REFERENCES profiles(id) ON DELETE CASCADE
);
CREATE TABLE orders (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  total REAL NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')), seller_id TEXT REFERENCES profiles(id), fulfillment_type TEXT NOT NULL DEFAULT 'pickup', notes TEXT, payment_proof_url TEXT, points_awarded INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE TABLE settings (id TEXT PRIMARY KEY, key TEXT UNIQUE NOT NULL, value TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now')));
INSERT INTO "settings" ("id","key","value","created_at","updated_at") VALUES('e97f4550-1843-471f-9174-73b6d0520311','fiat_symbol','PHP','2026-05-06 13:10:16','2026-05-06 13:10:16');
INSERT INTO "settings" ("id","key","value","created_at","updated_at") VALUES('sf_pre_order_fee','pre_order_service_fee_rate','0.05','2026-05-10 14:34:29','2026-05-10 14:34:29');
INSERT INTO "settings" ("id","key","value","created_at","updated_at") VALUES('sf_auction_fee','auction_service_fee_rate','0.10','2026-05-10 14:34:29','2026-05-10 14:34:29');
INSERT INTO "settings" ("id","key","value","created_at","updated_at") VALUES('lp_earn_rate','points_earn_rate','100','2026-05-12 13:24:59','2026-05-12 13:24:59');
INSERT INTO "settings" ("id","key","value","created_at","updated_at") VALUES('68919e2a-de53-4524-9737-b04c34207617','platform_payment_qr_url','https://warpzone.shop/api/images/140c9265-b358-4743-bf34-a2ac2d68f3e2.png','2026-05-16 14:56:31','2026-05-18 12:58:07');
CREATE TABLE auction_participants (id TEXT PRIMARY KEY, auction_id TEXT NOT NULL, user_id TEXT NOT NULL, joined_at TEXT NOT NULL DEFAULT (datetime('now')), created_at TEXT NOT NULL DEFAULT (datetime('now')), FOREIGN KEY (auction_id) REFERENCES auctions(id) ON DELETE CASCADE, FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE, UNIQUE(auction_id, user_id));
CREATE TABLE tournaments (id TEXT PRIMARY KEY, name TEXT NOT NULL, player_size INTEGER NOT NULL, description TEXT NOT NULL, preregistration_fee REAL NOT NULL DEFAULT 0, tournament_date TEXT NOT NULL, location TEXT, format TEXT, prize_pool TEXT, status TEXT NOT NULL DEFAULT 'upcoming', registered_players INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now')));
CREATE TABLE tournament_registrations (id TEXT PRIMARY KEY, tournament_id TEXT NOT NULL, user_id TEXT NOT NULL, registered_at TEXT NOT NULL DEFAULT (datetime('now')), created_at TEXT NOT NULL DEFAULT (datetime('now')), FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE, FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE, UNIQUE(tournament_id, user_id));
CREATE TABLE IF NOT EXISTS "auctions" (
  id TEXT PRIMARY KEY,
  seller_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT '',
  condition TEXT NOT NULL DEFAULT 'NEW',
  rarity TEXT,
  image_url TEXT,
  starting_price REAL NOT NULL,
  current_bid REAL NOT NULL DEFAULT 0,
  min_bid_increment REAL NOT NULL DEFAULT 1,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'upcoming',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')), fee_recorded INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (seller_id) REFERENCES profiles(id) ON DELETE CASCADE
);
INSERT INTO "auctions" ("id","seller_id","title","description","category","condition","rarity","image_url","starting_price","current_bid","min_bid_increment","start_time","end_time","status","created_at","updated_at","fee_recorded") VALUES('049e8d3a-9496-4b60-aa1f-3f742b23552d','0a845d0e-4336-401b-aac5-62861e01fc63','25th Anniversary Celebrations Charizard',replace('Charizard  4/102\n\n25th Anniversary Celebrations Charizard.\ncomes with a magnetic case.\n','\n',char(10)),'Pokémon','LIKE NEW',NULL,'https://warpzone.shop/api/images/b81735a4-84c1-4ef8-b191-c74270741753.png',10000,10000,10,'2026-05-23T12:12:00.000Z','2026-06-06T12:12:00.000Z','upcoming','2026-05-23 12:13:32','2026-05-23 12:13:32',0);
CREATE TABLE auction_bids (
  id TEXT PRIMARY KEY,
  auction_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  bid_amount REAL NOT NULL,
  bid_time TEXT NOT NULL DEFAULT (datetime('now')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (auction_id) REFERENCES auctions(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE TABLE pre_orders (
  id               TEXT    PRIMARY KEY,
  title            TEXT    NOT NULL,
  description      TEXT,
  game             TEXT    NOT NULL DEFAULT 'Other',   -- Pokemon | MTG | Yu-Gi-Oh! | etc.
  image_url        TEXT,
  price            REAL    NOT NULL DEFAULT 0,
  release_date     TEXT    NOT NULL,                   -- ISO 8601 date string
  status           TEXT    NOT NULL DEFAULT 'active',  -- active | closed
  approval_status  TEXT    NOT NULL DEFAULT 'approved',-- pending | approved | rejected
  seller_id        TEXT    REFERENCES profiles(id) ON DELETE CASCADE,
  max_slots        INTEGER,                            -- NULL = unlimited
  created_at       TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at       TEXT    NOT NULL DEFAULT (datetime('now'))
, downpayment_amount REAL, full_price REAL NOT NULL DEFAULT 0, downpayment_pct REAL DEFAULT NULL, cutoff_date TEXT DEFAULT NULL);
INSERT INTO "pre_orders" ("id","title","description","game","image_url","price","release_date","status","approval_status","seller_id","max_slots","created_at","updated_at","downpayment_amount","full_price","downpayment_pct","cutoff_date") VALUES('c6475ee3-9095-4409-9fe9-1725166d77af','Yu-Gi-Oh! (Japanese) Deck Build Pack Glorious Victors',replace('Pre-Order Yu-Gi-Oh! (Japanese) Deck Build Pack Glorious Victors [CG2138A]\nLanguage: Japanese\nWhat''s inside: 5 Cards per Pack | 15 Packs per Display Box\nEstimated Release Date: September 5, 2026\nTotal Price: 1,600 PHP per Display Box\nDown Payment: 30% deposit required to secure your order.\nCut-off Date: June 12, 2026 (or until slots are fully booked)','\n',char(10)),'Yu-Gi-Oh!','https://warpzone.shop/api/images/d3b833b9-0dc5-4f13-9a2f-368ad6e834a6.jpg',480,'2026-09-30','active','approved','0a845d0e-4336-401b-aac5-62861e01fc63',NULL,'2026-05-18 13:35:44','2026-05-18 13:36:14',480,1600,0.3,'2026-06-12');
INSERT INTO "pre_orders" ("id","title","description","game","image_url","price","release_date","status","approval_status","seller_id","max_slots","created_at","updated_at","downpayment_amount","full_price","downpayment_pct","cutoff_date") VALUES('97b7647d-4c57-4cf7-a274-f8bd5714df02','Yu-Gi-Oh! (Asian English) Legendary Arc-V Decks',replace('This box brings you three ready-to-play decks packed with powerful, iconic cards.\nAllocation is limited don''t wait until it''s too late to secure yours!\n\nProduct Details\nLanguage: Asian English\nContents: 168 Cards Total per Box (Featuring 3 distinct decks)\nEstimated Release: September 2026','\n',char(10)),'Yu-Gi-Oh!','https://warpzone.shop/api/images/5f2f2ccf-0537-486d-8416-5efc7462cf5f.jpg',960,'2026-09-30','active','approved','0a845d0e-4336-401b-aac5-62861e01fc63',NULL,'2026-05-18 13:40:12','2026-05-18 13:50:15',960,3200,0.3,'2026-05-28');
INSERT INTO "pre_orders" ("id","title","description","game","image_url","price","release_date","status","approval_status","seller_id","max_slots","created_at","updated_at","downpayment_amount","full_price","downpayment_pct","cutoff_date") VALUES('e6e54358-4b2d-49df-b8a1-8ce47e018669','Shadowverse: Evolve Combined Set Eightfold Retribution & Omens and Heirs [SVEE-BP1920]',replace('Pre-Order Shadowverse: Evolve Combined Set Eightfold Retribution & Omens and Heirs [SVEE-BP1920]\nContains\nPack: 8 Cards\nBox: 12 Packs\nCase: 20 Boxes\nLanguage: English\nEstimated Release Date: September 25, 2026\nTotal Price: 3100 PHP per Display Box\nDown Payment: 30% deposit required to secure your order.\nCut-off Date: June 10, 2026 (or until slots are fully booked)','\n',char(10)),'Others','https://warpzone.shop/api/images/3911189f-6160-44a4-9914-52ba6df1a928.jpg',930,'2026-09-25','active','approved','0a845d0e-4336-401b-aac5-62861e01fc63',NULL,'2026-05-23 11:47:41','2026-05-23 11:50:20',930,3100,0.3,'2026-06-10');
INSERT INTO "pre_orders" ("id","title","description","game","image_url","price","release_date","status","approval_status","seller_id","max_slots","created_at","updated_at","downpayment_amount","full_price","downpayment_pct","cutoff_date") VALUES('700fef27-0619-48db-9a62-70b1cda95544','Weiss Schwarz Booster Pack - Goddess of Victory: NIKKE Vol.2',replace('Weiss Schwarz Booster Pack — GODDESS OF VICTORY: NIKKE Vol. 2\n​Commanders, get ready to upgrade your deck! The battle continues with the highly anticipated second volume of GODDESS OF VICTORY: NIKKE.\n​\nProduct Details\n ​Language: English\n Pack: 8 Cards per Pack\n ​Box: 10 Packs per Box\n Estimated release date: Sept 2026\n ​Total Price: 2,600 PHP per box\n ​Secure Your Slot: Only 30% downpayment required now!\n ​Remaining Balance: Settle the final 70% upon release.\nPre-order window is only until May 25, 2026','\n',char(10)),'Others','https://warpzone.shop/api/images/3e6232f2-1c86-40f1-b93f-14fee6182cb6.jpg',780,'2026-09-30','active','approved','0a845d0e-4336-401b-aac5-62861e01fc63',NULL,'2026-05-23 11:49:51','2026-05-23 11:50:21',780,2600,0.3,'2026-05-25');
CREATE TABLE pre_order_reservations (
  id              TEXT    PRIMARY KEY,
  pre_order_id    TEXT    NOT NULL REFERENCES pre_orders(id) ON DELETE CASCADE,
  user_id         TEXT    NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  quantity        INTEGER NOT NULL DEFAULT 1,
  reserved_at     TEXT    NOT NULL DEFAULT (datetime('now')), paid INTEGER NOT NULL DEFAULT 0, is_paid INTEGER NOT NULL DEFAULT 0, fee_recorded INTEGER NOT NULL DEFAULT 0, downpayment_paid INTEGER DEFAULT 0, downpayment_amount REAL DEFAULT 0, total_paid REAL DEFAULT 0, remaining_balance REAL DEFAULT 0, allocation_status TEXT DEFAULT 'pending',
  UNIQUE(pre_order_id, user_id)
);
INSERT INTO "pre_order_reservations" ("id","pre_order_id","user_id","quantity","reserved_at","paid","is_paid","fee_recorded","downpayment_paid","downpayment_amount","total_paid","remaining_balance","allocation_status") VALUES('33ca03d4-6167-41f7-ab2a-b13511db8411','c6475ee3-9095-4409-9fe9-1725166d77af','4e38ab99-5c7e-46cd-9a1c-3089a9704e99',6,'2026-05-18 13:51:47',0,0,0,0,480,0,1120,'pending');
CREATE TABLE user_reports (
  id              TEXT    PRIMARY KEY,
  reporter_id     TEXT    NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reported_user_id TEXT   NOT NULL REFERENCES users(id)   ON DELETE CASCADE,
  reason          TEXT    NOT NULL,  -- e.g. "joy_bidding" | "non_payment" | "other"
  details         TEXT,              -- free-text from seller
  reference_type  TEXT,              -- "order" | "pre_order" | "auction"
  reference_id    TEXT,              -- id of the offending order/auction
  status          TEXT    NOT NULL DEFAULT 'pending',  -- pending | dismissed | banned
  admin_note      TEXT,
  created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
  resolved_at     TEXT
);
CREATE TABLE categories (
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
INSERT INTO "categories" ("id","slug","label","emoji","image_url","color","sort_order","is_active","created_at","updated_at") VALUES('cat_pokemon','pokemon','Pokémon','🔴','/images/pokemon-logo.png','bg-red-50 border-red-200 hover:border-red-400 hover:bg-red-100',1,1,'2026-05-10 13:39:38','2026-05-10 13:39:38');
INSERT INTO "categories" ("id","slug","label","emoji","image_url","color","sort_order","is_active","created_at","updated_at") VALUES('cat_mtg','mtg','Magic: The Gathering','🟤','/images/Magic-The-Gathering-Logo.jpg','bg-amber-50 border-amber-200 hover:border-amber-400 hover:bg-amber-100',2,1,'2026-05-10 13:39:38','2026-05-10 13:39:38');
INSERT INTO "categories" ("id","slug","label","emoji","image_url","color","sort_order","is_active","created_at","updated_at") VALUES('cat_yugioh','yugioh','Yu-Gi-Oh!','🟣','/images/Yugioh-logo.png','bg-purple-50 border-purple-200 hover:border-purple-400 hover:bg-purple-100',3,1,'2026-05-10 13:39:38','2026-05-10 13:39:38');
INSERT INTO "categories" ("id","slug","label","emoji","image_url","color","sort_order","is_active","created_at","updated_at") VALUES('cat_86dd3fa9e9bd','conan','Detective Conan','🔎','https://warpzone.shop/api/images/3110bc6b-5e02-43c1-918a-546a6dcd5893.jpg','bg-gray-50 border-gray-200 hover:border-gray-400 hover:bg-gray-100',4,1,'2026-05-10 13:45:05','2026-05-23 11:59:02');
INSERT INTO "categories" ("id","slug","label","emoji","image_url","color","sort_order","is_active","created_at","updated_at") VALUES('cat_243778a64daa','rift-bound','League of Legends: Rift Bound','💎','https://warpzone.shop/api/images/dbd01268-03f1-4d9f-9be5-a4b9ee3d1922.jpg','bg-blue-50 border-blue-200 hover:border-blue-400 hover:bg-blue-100',5,1,'2026-05-10 13:45:58','2026-05-23 11:59:19');
INSERT INTO "categories" ("id","slug","label","emoji","image_url","color","sort_order","is_active","created_at","updated_at") VALUES('cat_76a650baccde','cookie-run','Cookie Run: Brave Verse','🍪','https://warpzone.shop/api/images/27b4cdcb-00d6-4c50-ac91-83a0840db8f9.png','bg-amber-50 border-amber-200 hover:border-amber-400 hover:bg-amber-100',6,1,'2026-05-10 13:46:46','2026-05-23 11:59:34');
INSERT INTO "categories" ("id","slug","label","emoji","image_url","color","sort_order","is_active","created_at","updated_at") VALUES('cat_1c970d142b88','gundam-tcg','Gundam Card Game','🤖','https://warpzone.shop/api/images/a7acdc2b-75d4-4d94-a294-8fb1e526f943.png','bg-red-50 border-red-200 hover:border-red-400 hover:bg-red-100',7,1,'2026-05-10 13:47:20','2026-05-10 13:47:20');
INSERT INTO "categories" ("id","slug","label","emoji","image_url","color","sort_order","is_active","created_at","updated_at") VALUES('cat_faa1dd25582a','others','Others','🔥',NULL,'bg-amber-50 border-amber-200 hover:border-amber-400 hover:bg-amber-100',8,1,'2026-05-10 13:47:53','2026-05-10 13:47:53');
CREATE TABLE service_fees (
  id            TEXT    PRIMARY KEY,
  seller_id     TEXT    NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  source_type   TEXT    NOT NULL,            -- 'pre_order' | 'auction'
  source_id     TEXT    NOT NULL,            -- pre_order.id or auction.id
  description   TEXT    NOT NULL DEFAULT '',
  gross_amount  REAL    NOT NULL DEFAULT 0,  -- total buyer paid (price * qty)
  fee_rate      REAL    NOT NULL DEFAULT 0,  -- e.g. 0.05 = 5 %
  fee_amount    REAL    NOT NULL DEFAULT 0,  -- gross_amount * fee_rate
  status        TEXT    NOT NULL DEFAULT 'unpaid',
  paid_at       TEXT,
  created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE points_ledger (
  id           TEXT    PRIMARY KEY,
  user_id      TEXT    NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type         TEXT    NOT NULL DEFAULT 'earn',   -- earn | redeem | adjust
  points       INTEGER NOT NULL DEFAULT 0,        -- positive = gain, negative = spend
  source_type  TEXT,                              -- 'order' | 'redemption' | 'manual'
  source_id    TEXT,                              -- order.id or redemption.id
  note         TEXT,
  created_at   TEXT    NOT NULL DEFAULT (datetime('now'))
);
INSERT INTO "points_ledger" ("id","user_id","type","points","source_type","source_id","note","created_at") VALUES('902712272dbd664d585fbf7000d48a30','4e38ab99-5c7e-46cd-9a1c-3089a9704e99','earn',6,'order','270fb8ef-6479-4ae9-a5e2-ade89366cacf','Earned from order #270fb8ef — ₱620.0','2026-05-16 23:14:05');
INSERT INTO "points_ledger" ("id","user_id","type","points","source_type","source_id","note","created_at") VALUES('f2dba630-d833-4494-806c-9ea8f9be135c','4e38ab99-5c7e-46cd-9a1c-3089a9704e99','earn',45,'order','0e5a80eb-ec6b-4c60-918d-6f4301d72299','Earned from order #0E5A80EB — ₱4,500','2026-05-18 10:17:36');
INSERT INTO "points_ledger" ("id","user_id","type","points","source_type","source_id","note","created_at") VALUES('ef9bca30-e53c-4663-b07e-c0f6d84a60cc','4e38ab99-5c7e-46cd-9a1c-3089a9704e99','earn',150,'order','2771e2b4-f512-4f48-b3af-c88f4f6d510d','Earned from order #2771E2B4 — ₱15,000','2026-05-18 11:07:30');
CREATE TABLE reward_items (
  id           TEXT    PRIMARY KEY,
  name         TEXT    NOT NULL,
  description  TEXT,
  image_url    TEXT,
  points_cost  INTEGER NOT NULL DEFAULT 0,  -- points needed to claim
  stock        INTEGER,                     -- NULL = unlimited
  is_active    INTEGER NOT NULL DEFAULT 1,
  sort_order   INTEGER NOT NULL DEFAULT 0,
  created_at   TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE reward_redemptions (
  id             TEXT    PRIMARY KEY,
  user_id        TEXT    NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reward_item_id TEXT    NOT NULL REFERENCES reward_items(id) ON DELETE CASCADE,
  points_spent   INTEGER NOT NULL DEFAULT 0,
  status         TEXT    NOT NULL DEFAULT 'pending',
  note           TEXT,                             -- admin note on fulfilment
  created_at     TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at     TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS "order_items" (
  id           TEXT    PRIMARY KEY,
  order_id     TEXT    NOT NULL,
  product_id   TEXT,                   -- NULL for pre-order items
  listing_id   TEXT,                   -- NULL for pre-order items
  seller_id    TEXT    NOT NULL,
  quantity     INTEGER NOT NULL,
  price        REAL    NOT NULL,
  pre_order_id TEXT,                   -- Set for pre-order items
  created_at   TEXT    NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (order_id)     REFERENCES orders(id)            ON DELETE CASCADE,
  FOREIGN KEY (product_id)   REFERENCES products(id)          ON DELETE CASCADE,
  FOREIGN KEY (listing_id)   REFERENCES product_listings(id)  ON DELETE CASCADE,
  FOREIGN KEY (seller_id)    REFERENCES profiles(id)          ON DELETE CASCADE,
  FOREIGN KEY (pre_order_id) REFERENCES pre_orders(id)        ON DELETE SET NULL
);
CREATE TABLE cashout_requests (
  id              TEXT    PRIMARY KEY,
  seller_id       TEXT    NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount          REAL    NOT NULL DEFAULT 0,   -- net amount owed to the seller
  notes           TEXT,                          -- optional seller note (e.g. GCash number)
  status          TEXT    NOT NULL DEFAULT 'pending',
  settled_at      TEXT,
  settled_by      TEXT    REFERENCES profiles(id),
  admin_note      TEXT,                          -- optional admin note on settlement
  created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE wallet_credits (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id),
  amount     REAL NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE wallet_transactions (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id),
  type        TEXT NOT NULL CHECK(type IN ('credit','debit','refund_request','refunded')),
  amount      REAL NOT NULL,
  source_type TEXT,   -- 'pre_order_refund' | 'checkout_use'
  source_id   TEXT,   -- reservation_id or order_id
  seller_id   TEXT,   -- seller who owes the refund (for refund_request rows)
  note        TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
DELETE FROM sqlite_sequence;
CREATE INDEX idx_sessions_id ON sessions(id);
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_profiles_user_id ON profiles(user_id);
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_product_listings_product_id ON product_listings(product_id);
CREATE INDEX idx_product_listings_seller_id ON product_listings(seller_id);
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_auctions_seller_id ON auctions(seller_id);
CREATE INDEX idx_auctions_status ON auctions(status);
CREATE INDEX idx_auction_bids_auction_id ON auction_bids(auction_id);
CREATE INDEX idx_orders_seller_id ON orders(seller_id);
CREATE INDEX idx_orders_status    ON orders(status);
CREATE INDEX idx_pre_orders_status          ON pre_orders(status);
CREATE INDEX idx_pre_orders_approval_status ON pre_orders(approval_status);
CREATE INDEX idx_pre_orders_seller_id       ON pre_orders(seller_id);
CREATE INDEX idx_pre_order_reservations_pre_order_id ON pre_order_reservations(pre_order_id);
CREATE INDEX idx_pre_order_reservations_user_id      ON pre_order_reservations(user_id);
CREATE INDEX idx_service_fees_seller_id ON service_fees(seller_id);
CREATE INDEX idx_service_fees_status    ON service_fees(status);
CREATE INDEX idx_service_fees_source    ON service_fees(source_type, source_id);
CREATE INDEX idx_points_ledger_user_id ON points_ledger(user_id);
CREATE INDEX idx_points_ledger_source  ON points_ledger(source_type, source_id);
CREATE INDEX idx_reward_redemptions_user_id ON reward_redemptions(user_id);
CREATE INDEX idx_reward_redemptions_status  ON reward_redemptions(status);
CREATE INDEX idx_order_items_order_id    ON order_items(order_id);
CREATE INDEX idx_order_items_product_id  ON order_items(product_id);
CREATE INDEX idx_order_items_pre_order_id ON order_items(pre_order_id);
CREATE INDEX idx_cashout_seller_id ON cashout_requests(seller_id);
CREATE INDEX idx_cashout_status    ON cashout_requests(status);
CREATE UNIQUE INDEX idx_wallet_credits_user ON wallet_credits(user_id);
CREATE INDEX idx_wallet_tx_user   ON wallet_transactions(user_id);
CREATE INDEX idx_wallet_tx_seller ON wallet_transactions(seller_id);
