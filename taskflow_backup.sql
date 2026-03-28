-- MySQL dump 10.13  Distrib 9.3.0, for macos15.2 (arm64)
--
-- Host: localhost    Database: todo_list
-- ------------------------------------------------------
-- Server version	9.3.0

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `note_folders`
--

DROP TABLE IF EXISTS `note_folders`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `note_folders` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `name` varchar(100) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `parent_id` int DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `color` varchar(32) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_user_folder` (`user_id`,`name`),
  KEY `fk_note_folders_parent` (`parent_id`),
  CONSTRAINT `fk_note_folders_parent` FOREIGN KEY (`parent_id`) REFERENCES `note_folders` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_note_folders_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=57 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `note_folders`
--

LOCK TABLES `note_folders` WRITE;
/*!40000 ALTER TABLE `note_folders` DISABLE KEYS */;
INSERT INTO `note_folders` VALUES (31,11,'Workout/fitness','2026-01-01 18:00:07',NULL,NULL,NULL),(38,11,'TaskFlow Notes / Journal — UX Breakdown','2026-01-02 19:21:06',NULL,NULL,NULL),(48,14,'Test','2026-01-08 15:42:10',NULL,NULL,NULL),(55,11,'Test1','2026-02-02 23:10:18',NULL,NULL,NULL),(56,11,'Releasing process','2026-02-16 22:47:35',NULL,'2026-02-16 22:47:56',NULL);
/*!40000 ALTER TABLE `note_folders` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `notes`
--

DROP TABLE IF EXISTS `notes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `notes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `folder_id` int DEFAULT NULL,
  `title` varchar(255) DEFAULT NULL,
  `content` longtext,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` datetime DEFAULT NULL,
  `last_opened_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `folder_id` (`folder_id`),
  CONSTRAINT `notes_ibfk_1` FOREIGN KEY (`folder_id`) REFERENCES `note_folders` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=241 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `notes`
--

LOCK TABLES `notes` WRITE;
/*!40000 ALTER TABLE `notes` DISABLE KEYS */;
INSERT INTO `notes` VALUES (32,11,31,'Fitness Stats','<b>Bench </b>- 205 Ib&nbsp;<div><b>Squat</b> - 165 Ib&nbsp;</div><div><b>Deadlift</b> - 305 Ib&nbsp;</div><div><b>Pull-ups </b>- 10 reps&nbsp;</div><div><b>push-ups</b> - 70 reps&nbsp;</div><div><b>plank </b>- 3 minutes&nbsp;</div><div><b style=\"background-color: transparent;\">Dead-hang</b><span style=\"background-color: transparent;\"> - 2 minutes</span></div><div><span data-font-size=\"42\" style=\"font-size: 42px;\"></span></div>','2026-01-01 12:00:18','2026-01-28 11:53:07',NULL,'2026-01-28 11:53:07'),(78,11,38,'1️⃣ BASIC / MANDATORY FEATURES (NON-NEGOTIABLE)','These are required.\nIf any of these are missing, the app will feel broken, slow, or mentally exhausting.&nbsp;<div>Set reminders to email on task and habits&nbsp;</div><div>Add arrow to show that theres setting that you can open for the users&nbsp;</div><div><br></div><div>&nbsp;1. Sidebar Folder System ✅&nbsp;</div><div>&nbsp;What\n	•	Left sidebar with folders\n	•	Support:\n	•	Create\n	•	Rename\n	•	Delete\n	•	Collapse / expand\n	•	“All Notes” and “Recently Deleted” are always visible\n\nWhy mandatory\n	•	Users already think in folders\n	•	This matches Apple Notes / Finder mental models\n\nUX benefit\n	•	Zero learning curve\n	•	Users immediately know where things live\n	•	Reduces anxiety around organization\n\n⸻\n\n2. Notes List (Middle Column) ✅\n\nWhat\n	•	Shows notes inside selected folder\n	•	Each note row displays:\n	•	Title (or first line)\n	•	Short preview (1 line max)\n	•	Timestamp (last edited)\n\nWhy mandatory\n	•	Users need quick visual scanning\n	•	Helps recognize notes without opening them\n\nUX benefit\n	•	Faster recall\n	•	Less clicking\n	•	Strong spatial memory\n\n⸻\n\n3. One-Action Note Creation ✅\n\nWhat\n	•	“+ New Note” button\n	•	Keyboard shortcut (Cmd/Ctrl + N)\n	•	Immediately opens editor\n	•	Cursor auto-focused\n\nWhy mandatory\n	•	Notes are often created impulsively\n\nUX benefit\n	•	No friction\n	•	Captures ideas before they disappear\n	•	Feels fast and responsive\n\n⸻\n\n4. Auto-Save (No Save Button) ✅\n\nWhat\n	•	Changes save instantly\n	•	No manual save state\n\nWhy mandatory\n	•	Save buttons are mental friction\n	•	Users expect modern apps to “just save”\n\nUX benefit\n	•	Peace of mind\n	•	No interruption in thinking\n	•	Matches Apple Notes / Bear expectations\n\n⸻\n\n5. Clear Selection States ✅\n\nWhat\n	•	Selected folder is visually highlighted\n	•	Selected note is visually highlighted\n	•	Editor clearly shows which note is open\n\nWhy mandatory\n	•	Prevents “Where am I?” confusion\n\nUX benefit\n	•	Users always know context\n	•	Prevents accidental edits\n	•	Reduces cognitive load\n\n⸻\n\n6. Editor With Basic Formatting\n\nWhat\n	•	Support:\n	•	Bold / Italic\n	•	Headings (H1 / H2 optional)\n	•	Bullet lists\n	•	Checklists\n	•	Minimal toolbar or keyboard shortcuts\n\nWhy mandatory\n	•	Plain text alone is limiting\n\nUX benefit\n	•	Structure without complexity\n	•	Notes are easier to read later\n	•	Supports journaling + planning\n\n⸻\n\n7. Media Support (Baseline)\n\nWhat\n	•	Drag &amp; drop images\n	•	Paste images\n	•	Files attach inline (or preview)\n\nWhy mandatory\n	•	Modern notes are not text-only\n\nUX benefit\n	•	Visual memory\n	•	Better journaling\n	•	Supports real-world use cases\n\n⸻\n\n8. Instant Search\n\nWhat\n	•	Search input filters notes as you type\n	•	Searches:\n	•	Title\n	•	Body text\n\nWhy mandatory\n	•	Folders alone don’t scale\n\nUX benefit\n	•	Fast retrieval\n	•	No “lost notes”\n	•	Encourages writing more\n\n⸻\n\n9. Keyboard Navigation\n\nWhat\n	•	Arrow keys navigate note list\n	•	Enter opens note\n	•	Delete sends note to trash\n	•	Cmd/Ctrl + F = search\n\nWhy mandatory\n	•	Power users expect it\n\nUX benefit\n	•	Faster workflows\n	•	Feels professional\n	•	Reduces mouse dependency\n\n⸻\n\n10. Empty States That Teach\n\nWhat\n	•	When no note selected:\n	•	“Select or create a note”\n	•	When folder is empty:\n	•	“No notes yet — create one”\n\nWhy mandatory\n	•	Blank screens cause hesitation\n\nUX benefit\n	•	Guides first-time users\n	•	Removes confusion\n	•	Feels thoughtful\n\n⸻\n\n11. Safe Deletion (Trash) ✅\n\nWhat\n	•	Deleted notes go to “Recently Deleted”\n	•	Restore or permanently delete\n\nWhy mandatory\n	•	Accidental deletion happens\n\nUX benefit\n	•	User trust\n	•	Fear-free cleanup\n	•	Matches system apps behavior\n\n⸻\n\n12. Performance &amp; Reliability\n\nWhat\n	•	Instant note switching\n	•	No loading spinners\n	•	Handles hundreds of notes\n\nWhy mandatory\n	•	Lag kills habit-forming apps\n\nUX benefit\n	•	Feels native\n	•	Encourages daily use\n	•	Users stop thinking about the app&nbsp;</div><div>Hi&nbsp;</div>','2026-01-02 13:21:30','2026-01-28 11:53:12',NULL,'2026-01-28 11:53:12'),(79,11,38,'2️⃣ UX / FLOW IMPROVEMENTS (HIGH-IMPACT UPGRADES)','These are not required for MVP, but they separate TaskFlow from basic note apps.\n\n⸻\n\n1. Daily Journal Button\n\nFeature\n	•	“New Daily Note”\n	•	Auto-titles with date\n	•	Opens instantly\n\nPrinciple\n	•	Reduce friction → build habits\n\nWhen\n	•	Default for journal users\n\nMVP?\n	•	✅ MVP-safe if simple\n\n⸻\n\n2. Note Templates\n\nFeature\n	•	Reusable layouts:\n	•	Daily reflection\n	•	Meeting notes\n	•	Brain dump\n\nPrinciple\n	•	Blank page avoidance\n\nWhen\n	•	After core flow is stable\n\nMVP?\n	•	❌ Post-MVP\n\n⸻\n\n3. Focus Mode (Distraction-Free)\n\nFeature\n	•	Hide sidebar + notes list\n	•	Full-width editor\n\nPrinciple\n	•	Deep work / flow state\n\nWhen\n	•	Optional toggle\n\nMVP?\n	•	⚠️ Nice-to-have\n\n⸻\n\n4. Bi-Directional Links (Advanced)\n\nFeature\n	•	Link notes together\n	•	Show backlinks\n\nPrinciple\n	•	Associative thinking\n\nWhen\n	•	Power users\n\nMVP?\n	•	❌ Post-MVP\n\n⸻\n\n5. Tags &amp; Smart Views\n\nFeature\n	•	Tags across folders\n	•	Saved filters (Today, Ideas, etc.)\n\nPrinciple\n	•	Multi-dimensional organization\n\nWhen\n	•	Large note libraries\n\nMVP?\n	•	❌ Post-MVP\n\n⸻\n\n6. TaskFlow Integration\n\nFeature\n	•	Link notes ↔ tasks\n	•	Reference projects inside notes\n\nPrinciple\n	•	Context unification\n\nWhen\n	•	After Tasks are stable\n\nMVP?\n	•	⚠️ Partial MVP possible\n\n⸻\n\n7. Polished Micro-Interactions\n\nFeature\n	•	Smooth transitions\n	•	Undo snackbars\n	•	Subtle animations\n\nPrinciple\n	•	Perceived quality\n\nWhen\n	•	Always improving\n\nMVP?\n	•	⚠️ Incremental\n\n⸻\n\n🧩 Final Truth (Designer to Builder)\n\nIf TaskFlow Notes does only Section 1:\n	•	It will feel clean\n	•	It will feel fast\n	•	It will feel trustworthy\n\nIf you layer Section 2 slowly:\n	•	It will feel intentional<span style=\"font-size: 42px; background-color: transparent;\"></span>','2026-01-02 13:40:49','2026-01-24 09:01:44',NULL,'2026-01-24 09:01:44'),(81,11,31,'Fitness Goals','<div><b>Bench:&nbsp;&nbsp;</b><span style=\"background-color: transparent;\">225Ib</span></div><div><b>Deadlift: </b>405Ib</div><div><b>Overhead Press: </b>155Ib</div><div><b>Pull-Ups: </b>20 Reps</div><div><b>Push-Ups: </b>100 Reps</div><div><b>Dead-Hangs: </b>3 Minutes</div><div><b>Planks: </b>4 Minutes&nbsp;</div><div><strike><br></strike></div><div><br></div>','2026-01-02 13:42:25','2026-01-24 09:39:13',NULL,'2026-01-24 09:39:13'),(140,11,NULL,'TaskFlow Styling','<span data-font-size=\"11\" style=\"font-size: 11px;\">Background color - #1c1c1c&nbsp;</span><div><br></div>','2026-01-03 08:20:05','2026-01-24 14:46:02',NULL,'2026-01-24 14:46:02'),(179,14,48,'D','Donald','2026-01-08 09:42:11','2026-01-08 09:42:14',NULL,NULL),(196,11,NULL,NULL,'','2026-01-10 09:16:29','2026-01-10 09:16:29',NULL,NULL),(197,11,31,NULL,'','2026-01-10 09:16:36','2026-01-10 09:16:44',NULL,NULL),(198,11,38,NULL,'','2026-01-10 09:27:42','2026-01-10 09:27:42',NULL,NULL),(199,11,NULL,NULL,'','2026-01-10 09:43:10','2026-01-10 09:43:10',NULL,NULL),(200,11,31,NULL,'','2026-01-10 09:55:49','2026-01-10 09:55:49',NULL,NULL),(201,11,31,NULL,'','2026-01-10 09:55:55','2026-01-10 09:55:59',NULL,NULL),(210,11,NULL,NULL,'','2026-01-10 13:07:06','2026-01-10 13:07:06',NULL,'2026-01-10 13:07:06'),(211,11,38,NULL,'','2026-01-10 13:09:08','2026-01-10 13:09:08',NULL,'2026-01-10 13:09:08'),(212,11,38,NULL,'','2026-01-10 13:14:11','2026-01-10 13:14:11',NULL,'2026-01-10 13:14:11'),(213,11,38,NULL,'','2026-01-10 15:37:14','2026-01-10 15:37:14',NULL,'2026-01-10 15:37:14'),(214,11,38,NULL,'','2026-01-10 15:37:20','2026-01-10 15:37:20',NULL,'2026-01-10 15:37:20'),(215,11,38,NULL,'','2026-01-10 15:46:46','2026-01-10 15:46:46',NULL,'2026-01-10 15:46:46'),(218,11,38,NULL,'','2026-01-11 13:52:15','2026-01-11 13:52:15',NULL,'2026-01-11 13:52:15'),(223,11,NULL,NULL,'','2026-01-24 08:41:01','2026-01-24 08:41:01',NULL,'2026-01-24 08:41:01'),(224,11,38,NULL,'','2026-01-24 08:41:21','2026-01-24 08:41:22',NULL,'2026-01-24 08:41:22'),(225,11,31,NULL,'','2026-01-24 08:41:50','2026-01-24 08:41:50',NULL,'2026-01-24 08:41:50'),(226,11,31,NULL,'','2026-01-24 09:18:26','2026-01-24 09:18:26',NULL,'2026-01-24 09:18:26'),(227,11,31,NULL,'','2026-01-24 09:30:37','2026-01-24 09:30:37',NULL,'2026-01-24 09:30:37'),(228,11,31,NULL,'','2026-01-24 09:39:09','2026-01-24 09:39:09',NULL,'2026-01-24 09:39:09'),(229,11,31,NULL,'','2026-01-24 09:39:19','2026-01-24 09:39:19',NULL,'2026-01-24 09:39:19'),(230,11,31,NULL,'','2026-01-24 09:39:26','2026-01-24 09:43:40',NULL,'2026-01-24 09:43:40'),(231,11,31,NULL,'','2026-01-24 09:40:00','2026-01-24 09:40:00',NULL,'2026-01-24 09:40:00'),(232,11,31,NULL,'','2026-01-24 09:43:46','2026-01-24 09:43:46',NULL,'2026-01-24 09:43:46'),(233,11,31,'Back and Biceps','Back workout','2026-01-24 09:43:53','2026-01-24 09:51:26','2026-01-24 09:51:26','2026-01-24 09:51:18'),(234,11,31,NULL,'','2026-01-24 09:44:47','2026-01-24 09:44:47',NULL,'2026-01-24 09:44:47'),(235,11,31,NULL,'','2026-01-24 10:38:07','2026-01-24 10:38:07',NULL,'2026-01-24 10:38:07'),(236,11,NULL,'Walmart personal needs','Lotion<div>Antistain deodorant&nbsp;</div><div>Shampoo &amp; Conditioner&nbsp;</div><div>Body wash&nbsp;</div><div>Toothbrush&nbsp;</div><div>Two set of sponges&nbsp;</div><div><br></div>','2026-01-24 14:46:14','2026-01-25 08:51:01',NULL,'2026-01-25 08:51:01'),(237,11,NULL,NULL,'','2026-01-24 15:42:57','2026-01-24 15:42:57',NULL,'2026-01-24 15:42:57'),(238,11,55,'Blessed','How are you&nbsp;','2026-02-02 17:10:21','2026-02-16 16:42:48',NULL,'2026-02-16 16:42:48'),(239,11,56,NULL,'','2026-02-16 16:47:37','2026-02-16 16:47:37',NULL,'2026-02-16 16:47:37'),(240,11,NULL,'Releasing website on search engine','Step 1: Host you website online (put it on the internet)<div><div>\n\n\n\n\n\n\n\n<p class=\"p1\"><span class=\"s1\"></span></p><ul><li>\n<p class=\"p1\">Hosting platform (where your site lives)</p>\n</li><li>\n<p class=\"p1\">Domain name (example: taskflow.com)</p>\n</li><li><p class=\"p1\"><br></p></li></ul><p></p><div>Vercel for frontend</div><div>Render for Backend</div></div></div><div><br></div><div>Step 2. Connect a Domain Name</div><div>Instead of a random one like taskflow.vercel.app</div><div>You\'ll want taskflow.com</div><div>Recommended&nbsp;</div><div>- Namecheap</div><div><br></div>','2026-02-16 16:47:59','2026-03-20 13:23:51',NULL,'2026-03-20 13:23:51');
/*!40000 ALTER TABLE `notes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `task_lists`
--

DROP TABLE IF EXISTS `task_lists`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `task_lists` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `name` varchar(120) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `position` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `task_lists_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=48 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `task_lists`
--

LOCK TABLES `task_lists` WRITE;
/*!40000 ALTER TABLE `task_lists` DISABLE KEYS */;
INSERT INTO `task_lists` VALUES (37,12,'Inbox','2025-12-29 19:23:44',0),(39,11,'Inbox','2025-12-31 00:29:01',0),(41,14,'Inbox','2026-01-08 15:41:34',0),(47,29,'Inbox','2026-01-19 23:25:56',0);
/*!40000 ALTER TABLE `task_lists` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tasks`
--

DROP TABLE IF EXISTS `tasks`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tasks` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `list_id` int NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` text,
  `completed` tinyint(1) DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_tasks_user` (`user_id`),
  KEY `idx_tasks_list` (`list_id`),
  CONSTRAINT `fk_tasks_list` FOREIGN KEY (`list_id`) REFERENCES `task_lists` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_tasks_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `tasks_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=76 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tasks`
--

LOCK TABLES `tasks` WRITE;
/*!40000 ALTER TABLE `tasks` DISABLE KEYS */;
/*!40000 ALTER TABLE `tasks` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tasks_backup`
--

DROP TABLE IF EXISTS `tasks_backup`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tasks_backup` (
  `id` int NOT NULL DEFAULT '0',
  `user_id` int NOT NULL,
  `content` varchar(255) NOT NULL,
  `completed` tinyint(1) DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tasks_backup`
--

LOCK TABLES `tasks_backup` WRITE;
/*!40000 ALTER TABLE `tasks_backup` DISABLE KEYS */;
INSERT INTO `tasks_backup` VALUES (2,11,'Bread',0,'2025-12-19 15:13:44'),(5,11,'Stew',0,'2025-12-19 15:13:52'),(6,11,'Eggs',0,'2025-12-19 15:13:54'),(7,12,'Mercedez',0,'2025-12-19 15:15:13'),(8,12,'Tesla',0,'2025-12-19 15:15:16');
/*!40000 ALTER TABLE `tasks_backup` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ToDoLists`
--

DROP TABLE IF EXISTS `ToDoLists`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ToDoLists` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `title` varchar(100) DEFAULT NULL,
  `description` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `todolists_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `Users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ToDoLists`
--

LOCK TABLES `ToDoLists` WRITE;
/*!40000 ALTER TABLE `ToDoLists` DISABLE KEYS */;
/*!40000 ALTER TABLE `ToDoLists` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(50) DEFAULT NULL,
  `username` varchar(50) NOT NULL,
  `email` varchar(100) DEFAULT NULL,
  `password_hash` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `profile_image` varchar(255) NOT NULL DEFAULT 'default.png',
  `auth_provider` varchar(20) DEFAULT NULL,
  `provider_id` varchar(255) DEFAULT NULL,
  `is_verified` tinyint(1) NOT NULL DEFAULT '0',
  `email_verify_token` varchar(255) DEFAULT NULL,
  `email_verify_sent_at` datetime DEFAULT NULL,
  `email_verified_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=30 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (11,'Donald Fabuluje','donnyfab_','donnyfabrocks@gmail.com','scrypt:32768:8:1$d8vF2MfPRqvEpoV2$ec3ae8919a06a8ec303dacfc0ea57c26bfe16a7d1de8516d9f5938c0ee3fa50efda7e00a7d3dd6d9216cbef5df9c9c83c16b0ef3601f33fa0dd21373b76cfe58','2025-12-15 03:06:48','user_11_1768948440.jpeg',NULL,NULL,1,NULL,'2026-01-19 19:51:58','2026-01-19 19:53:09'),(12,'Donny Fabuluje','dbeats08','donnybeats09@gmail.com','scrypt:32768:8:1$CpGRnTSh0qw84jlt$b762f335fa13cd898ea47f4750da7f1e5b5cdf4858841725b4b40d2c84ab6191b5238464d8678e78832e832a68e1a62e24f4843183e06451294c7d7a637ced93','2025-12-15 03:10:55','user_12_1767027374.jpeg',NULL,NULL,0,NULL,NULL,NULL),(14,'Peyton W','peyton67','Peytonwilczynski@gmail.com','scrypt:32768:8:1$5BJ6MGpB61hcVnQz$4c218834500c6980f594fef754a3eb91073c1674bc94a8e91c7d75709d15ea0b80d24e8a99db6840d8c7766cab03fc92baf9fb410a0d0a509ac5cb71f4309dd7','2025-12-15 17:39:26','default.png',NULL,NULL,0,NULL,NULL,NULL),(29,'Abby Fabuluje','ddfabrocks','ddfabrocks@gmail.com','scrypt:32768:8:1$Lstxp0ysWayF70J7$fae211f58cdd9725dafc62f402ff436d64e0d914fe0015ee97463c905674ab3a3ce4216066fb0390aee6bfce366ff3223851de1439958c6cce4a022a277ae772','2026-01-19 23:25:52','default.png',NULL,NULL,1,NULL,'2026-01-19 23:26:09','2026-01-19 23:26:36');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-03-28 10:55:37
