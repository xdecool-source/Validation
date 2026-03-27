CREATE TABLE players (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    ranking INTEGER,
    team TEXT,
    email TEXT
);

CREATE TABLE match_days (
    id SERIAL PRIMARY KEY,
    code TEXT,
    date DATE,
    is_home BOOLEAN,
    day_type TEXT CHECK (day_type IN ('dimanche', 'samedi'))
);

CREATE TABLE availabilities (
    id SERIAL PRIMARY KEY,
    player_id INTEGER REFERENCES players(id),
    match_day_id INTEGER REFERENCES match_days(id),
    availability TEXT CHECK (availability IN ('dimanche', 'samedi', 'indisponible'))
);

CREATE TABLE selections (
    id SERIAL PRIMARY KEY,
    match_day_id INTEGER REFERENCES match_days(id),
    player_id INTEGER REFERENCES players(id),
    team TEXT
);