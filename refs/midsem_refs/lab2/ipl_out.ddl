DROP TABLE IF EXISTS player CASCADE;
DROP TABLE IF EXISTS owner CASCADE;
DROP TABLE IF EXISTS player_match CASCADE;
DROP TABLE IF EXISTS ball_by_ball CASCADE;
DROP TABLE IF EXISTS umpire_match CASCADE;
DROP TABLE IF EXISTS team CASCADE;
DROP TABLE IF EXISTS umpire CASCADE;
DROP TABLE IF EXISTS match CASCADE;
DROP TABLE IF EXISTS venue CASCADE;
CREATE TABLE player (	
	player_id INT, 
	player_name TEXT, 
	dob DATE, 
	batting_hand TEXT, 
	bowling_skill TEXT, 
	country_name TEXT, 
	PRIMARY KEY(player_id)
);

CREATE TABLE team (	
	team_id INT, 
	team_name TEXT, 
	PRIMARY KEY(team_id)
);

CREATE TABLE umpire (	
	umpire_id INT, 
	umpire_name TEXT, 
	country_name TEXT, 
	PRIMARY KEY(umpire_id)
);

CREATE TABLE venue (	
	venue_id INT, 
	venue_name TEXT, 
	city_name TEXT, 
	country_name TEXT, 
	capacity INT, 
	PRIMARY KEY(venue_id)
);

CREATE TABLE owner (	
	owner_id INT, 
	owner_name TEXT, 
	owner_type TEXT, 
	team_id INT, 
	stake INT, 
	PRIMARY KEY(owner_id),
	FOREIGN KEY(team_id) REFERENCES team
);

CREATE TABLE match (	
	match_id INT, 
	season_year INT, 
	team1__team_key INT, 
	team2__team_key INT, 
	venue_id INT, 
	toss_winner__team_key INT, 
	match_winner__team_key INT, 
	toss_name TEXT, 
	win_type TEXT, 
	man_of_match__player_key INT, 
	win_margin INT, 
	attendance INT, 
	PRIMARY KEY(match_id),
	FOREIGN KEY(team1__team_key) REFERENCES team,
	FOREIGN KEY(team2__team_key) REFERENCES team,
	FOREIGN KEY(venue_id) REFERENCES venue,
	FOREIGN KEY(toss_winner__team_key) REFERENCES team,
	FOREIGN KEY(match_winner__team_key) REFERENCES team,
	FOREIGN KEY(man_of_match__player_key) REFERENCES player
);

CREATE TABLE player_match (	
	player_match_id INT, 
	match_id INT, 
	player_id INT, 
	role_desc TEXT, 
	team_id INT, 
	PRIMARY KEY(player_match_id),
	FOREIGN KEY(match_id) REFERENCES match,
	FOREIGN KEY(player_id) REFERENCES player,
	FOREIGN KEY(team_id) REFERENCES team
);

CREATE TABLE ball_by_ball (	
	match_id INT, 
	innings_no_id INT, 
	over_id INT, 
	ball_id INT, 
	runs_scored INT, 
	extra_runs INT, 
	out_type TEXT, 
	striker__player_key INT, 
	non_striker__player_key INT, 
	bowler__player_key INT, 
	PRIMARY KEY(match_id,innings_no_id,over_id,ball_id),
	FOREIGN KEY(match_id) REFERENCES match,
	FOREIGN KEY(striker__player_key) REFERENCES player,
	FOREIGN KEY(non_striker__player_key) REFERENCES player,
	FOREIGN KEY(bowler__player_key) REFERENCES player
);

CREATE TABLE umpire_match (	
	umpire_match_id INT, 
	match_id INT, 
	umpire_id INT, 
	role_desc TEXT, 
	PRIMARY KEY(umpire_match_id),
	FOREIGN KEY(match_id) REFERENCES match,
	FOREIGN KEY(umpire_id) REFERENCES umpire
);
