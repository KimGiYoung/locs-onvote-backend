-- MySQL dump 10.13  Distrib 8.0.16, for Linux (x86_64)
--
-- Host: localhost    Database: onvote
-- ------------------------------------------------------
-- Server version	8.0.16

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
 SET NAMES utf8mb4 ;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `admin`
--

DROP TABLE IF EXISTS `admin`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
 SET character_set_client = utf8mb4 ;
CREATE TABLE `admin` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `username` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '유저아이디',
  `password` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '패스워드',
  `last_login` datetime DEFAULT NULL COMMENT '최근 로그인',
  `enddate` datetime DEFAULT NULL COMMENT '끝날짜',
  `noption` int(11) DEFAULT NULL COMMENT '개인정보동의확인',
  PRIMARY KEY (`id`),
  FULLTEXT KEY `username` (`username`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ballot`
--

DROP TABLE IF EXISTS `ballot`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
 SET character_set_client = utf8mb4 ;
CREATE TABLE `ballot` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `election_id` int(11) DEFAULT NULL COMMENT '선거인덱스',
  `voter_id` int(11) DEFAULT NULL COMMENT '유권자인덱스',
  `ballotdate` datetime DEFAULT NULL COMMENT '승인날짜',
  `flag` int(11) DEFAULT NULL COMMENT '승인여부',
  `code` varchar(50) DEFAULT NULL COMMENT '개표자코드',
  PRIMARY KEY (`id`),
  KEY `voter_id` (`voter_id`),
  KEY `election_id` (`election_id`),
  CONSTRAINT `ballot_ibfk_2` FOREIGN KEY (`voter_id`) REFERENCES `voter` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `ballot_ibfk_3` FOREIGN KEY (`election_id`) REFERENCES `election` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `candidate`
--

DROP TABLE IF EXISTS `candidate`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
 SET character_set_client = utf8mb4 ;
CREATE TABLE `candidate` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `election_id` int(11) DEFAULT NULL COMMENT '선거인덱스',
  `voter_id` int(11) DEFAULT NULL COMMENT '유권자인덱스',
  `symbol` varchar(50) DEFAULT NULL COMMENT '기호',
  `team` varchar(50) DEFAULT NULL COMMENT '팀명',
  `pledge` varchar(255) DEFAULT NULL COMMENT '공약',
  `pdf_path` varchar(255) DEFAULT NULL COMMENT 'pdf',
  `img_path` varchar(255) DEFAULT NULL COMMENT '이미지',
  `youtube_path` varchar(255) DEFAULT NULL COMMENT '유튜브',
  PRIMARY KEY (`id`),
  KEY `candidate_ibfk_1` (`election_id`),
  KEY `candidate_ibfk_2` (`voter_id`),
  CONSTRAINT `candidate_ibfk_1` FOREIGN KEY (`election_id`) REFERENCES `election` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `candidate_ibfk_2` FOREIGN KEY (`voter_id`) REFERENCES `voter` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=45 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `election`
--

DROP TABLE IF EXISTS `election`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
 SET character_set_client = utf8mb4 ;
CREATE TABLE `election` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `admin_id` int(11) DEFAULT NULL COMMENT '관리자인덱스',
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '내용',
  `create_dt` datetime DEFAULT CURRENT_TIMESTAMP,
  `start_dt` datetime DEFAULT NULL COMMENT '시작날짜',
  `end_dt` datetime DEFAULT NULL COMMENT '끝날짜',
  `start_preview` datetime DEFAULT NULL COMMENT '미리보기시작',
  `end_preview` datetime DEFAULT NULL COMMENT '미리보기 끝',
  `flag` int(11) DEFAULT NULL COMMENT '진행여부',
  `noption` int(11) DEFAULT NULL COMMENT '옵션(단일, 다중)',
  `extension` int(11) DEFAULT NULL COMMENT '연장여부',
  `voteflag` int(11) DEFAULT NULL COMMENT '개표여부',
  PRIMARY KEY (`id`),
  KEY `admin_id` (`admin_id`),
  CONSTRAINT `election_ibfk_1` FOREIGN KEY (`admin_id`) REFERENCES `admin` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=38 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `vote_logs`
--

DROP TABLE IF EXISTS `vote_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
 SET character_set_client = utf8mb4 ;
CREATE TABLE `vote_logs` (
  `ip` varchar(30) DEFAULT NULL,
  `admin_id` int(11) DEFAULT NULL,
  `create_date` datetime DEFAULT CURRENT_TIMESTAMP,
  `text` text
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `vote_result`
--

DROP TABLE IF EXISTS `vote_result`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
 SET character_set_client = utf8mb4 ;
CREATE TABLE `vote_result` (
  `election_id` int(11) DEFAULT NULL,
  `candidate_id` int(11) DEFAULT NULL,
  KEY `election_id` (`election_id`),
  KEY `candidate_id` (`candidate_id`),
  CONSTRAINT `vote_result_ibfk_1` FOREIGN KEY (`election_id`) REFERENCES `election` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `vote_result_ibfk_2` FOREIGN KEY (`candidate_id`) REFERENCES `candidate` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `voter`
--

DROP TABLE IF EXISTS `voter`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
 SET character_set_client = utf8mb4 ;
CREATE TABLE `voter` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `election_id` int(11) DEFAULT NULL COMMENT '선거인덱스',
  `username` varchar(50) DEFAULT NULL COMMENT '이름',
  `birthday` varchar(6) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '생년월일',
  `phone` varchar(15) DEFAULT NULL COMMENT '핸드폰',
  `gender` varchar(4) DEFAULT NULL COMMENT '성별',
  `votedate` datetime DEFAULT NULL COMMENT '선거날짜',
  `flag` int(11) DEFAULT '0' COMMENT '선거여부',
  `code` varchar(50) DEFAULT NULL COMMENT '선거코드',
  PRIMARY KEY (`id`),
  KEY `voter_ibfk_1` (`election_id`),
  FULLTEXT KEY `phone` (`phone`),
  CONSTRAINT `voter_ibfk_1` FOREIGN KEY (`election_id`) REFERENCES `election` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=30194 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2020-10-26 17:58:54
