def add_availability(db, avail):
    db.execute(
        """
        INSERT INTO availabilities (player_id, match_day_id, availability)
        VALUES (%s, %s, %s)
        """,
        (avail.player_id, avail.match_day_id, avail.availability)
    )
    db.commit()