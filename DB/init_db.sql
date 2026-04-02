CREATE TABLE players (
    id SERIAL PRIMARY KEY,
    license TEXT NOT NULL,
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
    slot_id TEXT,
    availability BOOLEAN,
    );
    
    availability TEXT CHECK (availability IN ('dimanche', 'samedi', 'indisponible')),

    CONSTRAINT fk_player
        FOREIGN KEY (player_id)
        REFERENCES players(id),

    CONSTRAINT fk_match_day
        FOREIGN KEY (match_day_id)
        REFERENCES match_days(id),

    CONSTRAINT unique_player_slot_day
    UNIQUE (player_id, slot_id, match_day_id)
    
);


CREATE TABLE selections (
    id SERIAL PRIMARY KEY,
    match_day_id INTEGER REFERENCES match_days(id),
    player_id INTEGER REFERENCES players(id),
    team TEXT
);