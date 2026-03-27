def generate_team(db, match_day_id, team_size=4):
    result = db.execute("""
        SELECT p.id, p.name, p.ranking,
               COUNT(s.id) as played
        FROM players p
        JOIN availabilities a ON p.id = a.player_id
        LEFT JOIN selections s ON p.id = s.player_id
        WHERE a.match_day_id = %s
        AND a.availability != 'indisponible'
        GROUP BY p.id
        ORDER BY played ASC, ranking DESC
    """, (match_day_id,))

    players = result.fetchall()

    selected = players[:team_size]

    for p in selected:
        db.execute("""
            INSERT INTO selections (player_id, match_day_id, team)
            VALUES (%s, %s, %s)
        """, (p.id, match_day_id, "A"))

    db.commit()

    return selected